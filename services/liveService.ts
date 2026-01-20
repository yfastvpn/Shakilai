
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

let nextStartTime = 0;
let sources = new Set<AudioBufferSourceNode>();
let inputAudioContext: AudioContext | null = null;
let outputAudioContext: AudioContext | null = null;
let scriptProcessor: ScriptProcessorNode | null = null;

function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const startLiveSession = async (onTranscription: (text: string, role: 'user' | 'model') => void, onClose: () => void) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
  outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
  const sessionPromise = ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    callbacks: {
      onopen: () => {
        const source = inputAudioContext!.createMediaStreamSource(stream);
        scriptProcessor = inputAudioContext!.createScriptProcessor(4096, 1, 1);
        scriptProcessor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          const int16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
          sessionPromise.then(s => {
            try {
              s.sendRealtimeInput({ 
                media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } 
              });
            } catch (err) {
              console.error("Error sending audio input:", err);
            }
          });
        };
        source.connect(scriptProcessor);
        scriptProcessor.connect(inputAudioContext!.destination);
      },
      onmessage: async (message: LiveServerMessage) => {
        const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (audioData) {
          nextStartTime = Math.max(nextStartTime, outputAudioContext!.currentTime);
          const buffer = await decodeAudioData(decode(audioData), outputAudioContext!, 24000, 1);
          const source = outputAudioContext!.createBufferSource();
          source.buffer = buffer;
          source.connect(outputAudioContext!.destination);
          source.start(nextStartTime);
          nextStartTime += buffer.duration;
          sources.add(source);
          source.onended = () => sources.delete(source);
        }
        
        if (message.serverContent?.interrupted) {
          sources.forEach(s => {
            try { s.stop(); } catch(e) {}
          });
          sources.clear();
          nextStartTime = 0;
        }

        if (message.serverContent?.inputTranscription) {
            onTranscription(message.serverContent.inputTranscription.text, 'user');
        }
        if (message.serverContent?.outputTranscription) {
            onTranscription(message.serverContent.outputTranscription.text, 'model');
        }
      },
      onclose: onClose,
      onerror: (e) => {
        console.error("Live session error:", e);
        onClose();
      },
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      systemInstruction: "You are Shakil AI, a friendly location expert. You can hear and speak. Provide helpful, short answers in a mix of Bengali and English. Focus on locations, maps, and helpful guidance."
    }
  });

  return {
    stop: () => {
        stream.getTracks().forEach(t => t.stop());
        if (scriptProcessor) scriptProcessor.disconnect();
        inputAudioContext?.close();
        outputAudioContext?.close();
        sessionPromise.then(s => s.close()).catch(() => {});
    }
  };
};
