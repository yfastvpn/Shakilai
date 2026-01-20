
import React from 'react';
import { Message } from '../types';
import { MapPin, ExternalLink, User, Target } from 'lucide-react';

interface ChatBubbleProps {
  message: Message;
  userProfilePic?: string | null;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, userProfilePic }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full mb-6 gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in slide-in-from-bottom-2`}>
      {/* Avatar */}
      <div className="flex-shrink-0 mt-auto mb-1">
        {isUser ? (
          <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-200">
            {userProfilePic ? (
              <img src={userProfilePic} alt="Me" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white">
                <User size={16} />
              </div>
            )}
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#075E54] flex items-center justify-center text-white shadow-sm border-2 border-white ring-1 ring-slate-200">
            <Target size={16} />
          </div>
        )}
      </div>

      <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm relative ${
        isUser 
          ? 'bg-[#DCF8C6] text-slate-800 rounded-tr-none border border-[#c8e6af]' 
          : 'bg-white text-slate-800 rounded-tl-none border border-slate-200'
      }`}>
        {message.image && (
          <div className="mb-3 overflow-hidden rounded-xl border-2 border-white shadow-md">
            <img 
              src={message.image.startsWith('data:') ? message.image : `data:image/jpeg;base64,${message.image}`} 
              alt="Uploaded context" 
              className="max-h-72 w-full object-cover"
            />
          </div>
        )}
        
        <p className="text-[15px] whitespace-pre-wrap leading-relaxed font-medium">{message.content}</p>
        
        {message.grounding && message.grounding.length > 0 && (
          <div className={`mt-3 pt-3 border-t border-slate-100`}>
            <div className="flex flex-col gap-2">
              {message.grounding.map((source, idx) => (
                <a
                  key={idx}
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 p-3 rounded-xl transition-all bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-100 group"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <MapPin size={16} className="text-emerald-600" />
                    <span className="text-xs font-bold truncate">{source.title}</span>
                  </div>
                  <ExternalLink size={14} className="flex-shrink-0 opacity-40 group-hover:opacity-100" />
                </a>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-end gap-1 mt-1 opacity-40">
          <span className="text-[9px] font-bold uppercase tracking-tight">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isUser && <CheckCheck size={10} className="text-emerald-600" />}
        </div>
      </div>
    </div>
  );
};

// Simple small helper for the tick icon
const CheckCheck = ({ size, className }: { size: number, className: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 6 7 17l-5-5" />
    <path d="m22 10-7.5 7.5L13 16" />
  </svg>
);

export default ChatBubble;
