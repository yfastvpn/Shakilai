
import React, { useState, useEffect, useRef } from 'react';
import { getGeminiStream } from './services/geminiService';
import { startLiveSession } from './services/liveService';
import { Message, UserContact } from './types';
import ChatBubble from './components/ChatBubble';
import { 
  Send, 
  Menu,
  X,
  Camera,
  Target,
  Mic,
  MicOff,
  PhoneOff,
  Trash2,
  Users,
  Phone,
  Plus,
  UserPlus,
  Search,
  CheckCheck,
  Video,
  MoreVertical,
  User,
  Download,
  FileCode
} from 'lucide-react';

const APP_ICON_URL = "https://files.oaiusercontent.com/file-m09iH6K07G5R84MofA19fE?se=2025-02-13T10%3A25%3A22Z&sp=r&sv=24.12&sr=b&rscc=max-age%3D604800%2C%20immutable%2C%20private&rscd=attachment%3B%20filename%3Da0f1352a-9f5a-45c1-925a-472ef91f6301.webp&sig=Gis2WqWj/i9VvXj9X0/V2K19/m7iLzU2iR0H7yT6k8U%3D";
const STORAGE_KEY = 'shakil_ai_chat_history_v3';
const CONTACTS_KEY = 'shakil_ai_community_contacts_v3';
const USER_PROFILE_KEY = 'shakil_ai_user_profile_pic';

const COLORS = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      } catch (e) { return []; }
    }
    return [{
      id: '1',
      role: 'assistant',
      content: "স্বাগতম! আমি শাকিল AI। আপনি চাইলে নিচের 'Install App' বাটনে ক্লিক করে এটি ফোনে সেভ করতে পারেন অথবা সোর্স কোড ডাউনলোড করতে পারেন।",
      timestamp: new Date(),
    }];
  });

  const [contacts, setContacts] = useState<UserContact[]>(() => {
    const saved = localStorage.getItem(CONTACTS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [userProfilePic, setUserProfilePic] = useState<string | null>(() => {
    return localStorage.getItem(USER_PROFILE_KEY);
  });

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState('');
  const [userLocation, setUserLocation] = useState<GeolocationCoordinates | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [callingContact, setCallingContact] = useState<UserContact | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const liveSessionRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    });
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    if (userProfilePic) {
      localStorage.setItem(USER_PROFILE_KEY, userProfilePic);
    }
  }, [userProfilePic]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isTyping, liveTranscription]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setUserLocation(position.coords),
        (error) => console.error("Location error:", error),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const downloadSourceCode = () => {
    const backupData = {
      messages,
      contacts,
      userProfilePic,
      timestamp: new Date().toISOString(),
      appName: "Shakil AI Assistant"
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shakil-ai-backup-${new Date().getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const handleProfilePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setUserProfilePic(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddContact = () => {
    if (!newContact.name || !newContact.phone) {
      alert("নাম এবং নম্বর সঠিক ভাবে দিন।");
      return;
    }
    const contact: UserContact = {
      id: Date.now().toString(),
      name: newContact.name,
      phone: newContact.phone,
    };
    setContacts(prev => [contact, ...prev]);
    setNewContact({ name: '', phone: '' });
    setShowAddContact(false);
  };

  const removeContact = (id: string) => {
    if(confirm("মুছে ফেলতে চান?")) {
      setContacts(prev => prev.filter(c => c.id !== id));
    }
  };

  const initiateCall = (contact: UserContact) => {
    setCallingContact(contact);
    setTimeout(() => {
      window.location.href = `tel:${contact.phone}`;
      setTimeout(() => setCallingContact(null), 2000);
    }, 1500);
  };

  const clearChat = () => {
    if (confirm("সব মেসেজ মুছে ফেলতে চান?")) {
      setMessages([{ id: '1', role: 'assistant', content: "চ্যাট হিস্ট্রি পরিষ্কার করা হয়েছে।", timestamp: new Date() }]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const toggleLiveChat = async () => {
    if (isLive) {
      liveSessionRef.current?.stop();
      setIsLive(false);
      setLiveTranscription('');
      return;
    }
    try {
      setIsLive(true);
      liveSessionRef.current = await startLiveSession(
        (text, role) => {
          if (role === 'user') setLiveTranscription(text);
          else setLiveTranscription('');
        },
        () => { setIsLive(false); setLiveTranscription(''); }
      );
    } catch (err) {
      setIsLive(false);
      alert("মাইক পারমিশন দিন।");
    }
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !selectedImage) || isLoading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: inputValue || "ছবি দেখুন।", image: selectedImage || undefined, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setSelectedImage(null);
    setIsLoading(true);
    setIsTyping(true);

    try {
      let assistantMsgId = (Date.now() + 1).toString();
      let started = false;
      const contactsInfo = contacts.map(c => `${c.name}: ${c.phone}`).join(', ');
      const systemContext = `\n\n[Community Members: ${contactsInfo}]`;

      const response = await getGeminiStream(
        userMsg.content + systemContext, 
        userMsg.image, 
        userLocation ? { latitude: userLocation.latitude, longitude: userLocation.longitude } : undefined, 
        (text) => {
          if (!started) {
            setIsTyping(false); started = true;
            setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: text, timestamp: new Date() }]);
          } else {
            setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: text } : m));
          }
        }
      );
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: response.text, grounding: response.sources } : m));
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "ত্রুটি হয়েছে।", timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const getAvatarColor = (name: string) => {
    const index = name.charCodeAt(0) % COLORS.length;
    return COLORS[index];
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  return (
    <div className="flex h-screen w-full bg-[#E5DDD5] overflow-hidden font-sans">
      <input type="file" ref={profileInputRef} onChange={handleProfilePicUpload} accept="image/*" className="hidden" />

      {callingContact && (
        <div className="fixed inset-0 z-[100] bg-[#075E54] flex flex-col items-center justify-between py-20 animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-4">
            <div className={`w-32 h-32 rounded-full ${getAvatarColor(callingContact.name)} flex items-center justify-center text-white text-5xl font-bold shadow-2xl animate-pulse overflow-hidden`}>
              {callingContact.name.charAt(0)}
            </div>
            <h2 className="text-white text-3xl font-bold">{callingContact.name}</h2>
            <p className="text-emerald-100 text-lg opacity-80">Calling...</p>
            <p className="text-emerald-200 text-sm">{callingContact.phone}</p>
          </div>
          <button onClick={() => setCallingContact(null)} className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white shadow-xl active:scale-95 transition-transform">
            <PhoneOff size={32} />
          </button>
        </div>
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-full sm:w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full border-r border-slate-200">
          <div className="p-4 bg-[#075E54] text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative group w-12 h-12 rounded-full bg-white p-0.5 overflow-hidden ring-2 ring-emerald-400 cursor-pointer" onClick={() => profileInputRef.current?.click()}>
                {userProfilePic ? <img src={userProfilePic} alt="User" className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center text-slate-400"><User size={24} /></div>}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera size={16} className="text-white" /></div>
              </div>
              <div><h1 className="font-bold text-lg leading-tight">Shakil Connect</h1><p className="text-[10px] text-emerald-100 opacity-80 flex items-center gap-1"><CheckCheck size={10}/> Safe & Encrypted</p></div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAddContact(!showAddContact)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><UserPlus size={20} /></button>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
            </div>
          </div>

          <div className="p-2 bg-slate-50 border-b border-slate-200">
            <div className="relative flex items-center bg-white rounded-xl px-4 py-2 border border-slate-200">
              <Search size={16} className="text-slate-400 mr-2" />
              <input type="text" placeholder="Search community..." className="bg-transparent border-none focus:ring-0 text-sm w-full font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
            {showAddContact && (
              <div className="p-4 bg-[#DCF8C6] border-b border-[#c8e6af] animate-in slide-in-from-top duration-300">
                <h3 className="text-xs font-black text-[#075E54] mb-3 uppercase tracking-widest flex items-center gap-2"><Plus size={14}/> Add New Friend</h3>
                <div className="space-y-3">
                  <input type="text" placeholder="Full Name" className="w-full bg-white border-none rounded-xl text-sm p-3 shadow-sm focus:ring-2 focus:ring-emerald-500" value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} />
                  <input type="tel" placeholder="Phone Number" className="w-full bg-white border-none rounded-xl text-sm p-3 shadow-sm focus:ring-2 focus:ring-emerald-500" value={newContact.phone} onChange={e => setNewContact({...newContact, phone: e.target.value})} />
                  <div className="flex gap-2">
                    <button onClick={handleAddContact} className="flex-1 bg-[#128C7E] text-white rounded-xl py-3 text-sm font-bold shadow-md hover:bg-[#075E54]">Save Contact</button>
                    <button onClick={() => setShowAddContact(false)} className="px-4 bg-white text-slate-500 rounded-xl py-3 text-sm font-bold border border-slate-200">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            <div className="divide-y divide-slate-50">
              {filteredContacts.map(c => (
                <div key={c.id} className="group p-4 flex items-center gap-4 hover:bg-slate-50 transition-all cursor-pointer">
                  <div className={`w-12 h-12 rounded-full ${getAvatarColor(c.name)} flex items-center justify-center text-white text-lg font-bold shadow-sm ring-2 ring-white`}>{c.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center"><p className="text-[16px] font-bold text-slate-800 truncate">{c.name}</p><span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Active</span></div>
                    <p className="text-sm text-slate-500 font-medium flex items-center gap-1"><Phone size={12} className="text-slate-300"/> {c.phone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => initiateCall(c)} className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-90" title="Voice Call"><Phone size={18}/></button>
                    <button onClick={() => removeContact(c.id)} className="w-8 h-8 rounded-full text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-2">
             {isInstallable && (
               <button 
                onClick={handleInstallClick}
                className="w-full bg-[#128C7E] text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:bg-[#075E54] transition-all"
               >
                 <Download size={16} /> Install App
               </button>
             )}
             <button 
              onClick={downloadSourceCode}
              className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:bg-blue-700 transition-all"
             >
               <FileCode size={16} /> সোর্স কোড ডাউনলোড
             </button>
             <div className="flex items-center justify-between mt-1">
               <button onClick={clearChat} className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase">
                 <Trash2 size={12}/> Clear All
               </button>
               <span className="text-[9px] font-bold text-slate-300 uppercase">V4.5 Premium</span>
             </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative" style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundSize: "repeat" }}>
        <header className="h-16 flex items-center justify-between px-4 bg-[#EDEDED] border-b border-slate-300 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 hover:bg-slate-200 rounded-full text-slate-600"><Menu size={22} /></button>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all duration-500 shadow-md ${isLive ? 'bg-red-500' : 'bg-[#075E54]'}`}>{isLive ? <Mic size={20} /> : <Target size={20} />}</div>
              <div className="flex flex-col"><span className="text-[15px] font-bold text-slate-800">Shakil AI Assistant</span><div className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{isLive ? 'Live Voice' : 'Online'}</span></div></div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={toggleLiveChat} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95 ${isLive ? 'bg-red-500 text-white' : 'bg-[#128C7E] text-white hover:bg-[#075E54]'}`}>{isLive ? <PhoneOff size={14}/> : <Mic size={14}/>}<span className="hidden sm:inline">{isLive ? "End Session" : "Live Chat"}</span></button>
             <button className="p-2 text-slate-500 hover:bg-slate-200 rounded-full"><Video size={20}/></button>
             <button className="p-2 text-slate-500 hover:bg-slate-200 rounded-full"><MoreVertical size={20}/></button>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
          <div className="max-w-2xl mx-auto pb-32">
            <div className="flex justify-center mb-6"><span className="bg-[#D1F4FF] text-[#006077] px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm">Today</span></div>
            {messages.map((msg) => (<ChatBubble key={msg.id} message={msg} userProfilePic={userProfilePic} />))}
            {liveTranscription && (<div className="flex justify-end mb-4 animate-in slide-in-from-right-4"><div className="bg-[#DCF8C6] text-slate-800 rounded-xl rounded-tr-none px-4 py-3 text-sm italic font-medium border border-[#c8e6af] shadow-md max-w-[85%]"><div className="flex items-center gap-1 mb-1 opacity-50"><Mic size={10}/> <span className="text-[9px] uppercase font-black">AI Hearing</span></div>"{liveTranscription}..."</div></div>)}
            {isTyping && (<div className="flex justify-start mb-4"><div className="bg-white border border-slate-200 rounded-xl rounded-tl-none px-4 py-3 shadow-sm flex gap-1.5 items-center"><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]"/><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"/><div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce"/></div></div>)}
          </div>
        </div>

        <footer className="p-3 bg-[#F0F0F0] border-t border-slate-300">
          <div className="max-w-3xl mx-auto flex items-center gap-2">
            <div className="flex-1 flex items-center bg-white rounded-full shadow-sm px-3 py-1 border border-slate-200 focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
              <button onClick={() => fileInputRef.current?.click()} disabled={isLive} className="p-2 text-slate-500 hover:text-emerald-600"><Camera size={24} /></button>
              <input type="file" ref={fileInputRef} onChange={e => {
                const f = e.target.files?.[0];
                if (f) {
                  const r = new FileReader();
                  r.onload = () => setSelectedImage(r.result as string);
                  r.readAsDataURL(f);
                }
              }} accept="image/*" className="hidden" />
              <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder={isLive ? "AI is listening..." : "Type a message..."} className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 py-3 px-2 text-[15px] font-medium" disabled={isLive} />
            </div>
            <button onClick={inputValue.trim() || selectedImage ? handleSendMessage : toggleLiveChat} disabled={isLoading} className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all text-white ${isLive ? 'bg-red-500 animate-pulse' : 'bg-[#128C7E] hover:bg-[#075E54]'}`}>{inputValue.trim() || selectedImage ? <Send size={22} className="ml-1" /> : (isLive ? <MicOff size={22} /> : <Mic size={22} />)}</button>
          </div>
        </footer>
      </main>
      {isSidebarOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-40 md:hidden animate-in fade-in duration-300" onClick={() => setIsSidebarOpen(false)} />}
    </div>
  );
};

export default App;
