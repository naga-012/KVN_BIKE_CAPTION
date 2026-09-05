import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User } from 'lucide-react';
import { socket } from '../services/socket';

export const RideChatModal = ({ isOpen, onClose, rideId, currentUser, partnerName }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !rideId) return;

    socket.emit('join:ride', { rideId });

    const handleNewMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on('message:new', handleNewMessage);

    return () => {
      socket.off('message:new', handleNewMessage);
    };
  }, [isOpen, rideId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    socket.emit('message:send', {
      rideId,
      senderId: currentUser.id || currentUser._id,
      senderRole: currentUser.role,
      senderName: currentUser.name,
      text: text.trim(),
    });

    setText('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col h-[520px] overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-teal-600/30 border border-teal-500/40 flex items-center justify-center text-teal-400 font-bold">
              {partnerName?.[0] || 'D'}
            </div>
            <div>
              <div className="font-bold text-white text-sm leading-tight">{partnerName || 'Driver Partner'}</div>
              <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                Active Ride Chat
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Say hello! Messages are encrypted and archived after ride completion.
            </div>
          ) : (
            messages.map((m, idx) => {
              const isMe = m.senderRole === currentUser.role;
              return (
                <div
                  key={idx}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="text-[10px] text-slate-500 mb-0.5 px-1 font-medium">
                    {isMe ? 'You' : m.senderName}
                  </div>
                  <div
                    className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${
                      isMe
                        ? 'bg-teal-600 text-white rounded-br-none'
                        : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-bl-none'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-850 flex gap-2">
          <input
            type="text"
            placeholder="Type your message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center transition-all shadow-glow"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
