import React, { useState, useEffect, useRef } from 'react';
import { useCaptainAuth } from '../context/CaptainAuthContext';
import api from '../services/api';
import socket from '../services/socket';
import { MessageSquare, Send, X, ShieldCheck } from 'lucide-react';

export const CaptainChatModal = ({ ride, isOpen, onClose }) => {
  const { captain } = useCaptainAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const rideId = ride?.id || ride?._id;

  // Load past messages and listen to real-time events
  useEffect(() => {
    if (!isOpen || !rideId) return;

    // Join ride room
    socket.emit('join:ride', { rideId });

    // Fetch message history
    const fetchChat = async () => {
      try {
        const res = await api.get(`/rides/${rideId}/chat`);
        if (res.success && res.messages) {
          setMessages(res.messages);
        }
      } catch (err) {
        console.warn('Failed to load chat messages:', err.message);
      }
    };
    fetchChat();

    // Listen for incoming messages
    const handleNewMessage = (msg) => {
      if (msg.rideId === rideId) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on('chat:new_message', handleNewMessage);
    socket.on('message:new', handleNewMessage);

    return () => {
      socket.off('chat:new_message', handleNewMessage);
      socket.off('message:new', handleNewMessage);
    };
  }, [isOpen, rideId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen || !ride) return null;

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const payload = {
      rideId,
      sender: captain?.name || 'Captain',
      senderType: 'CAPTAIN',
      text,
    };

    // Emit via socket for instant delivery
    socket.emit('chat:send', payload);
    setInputText('');

    // Also persist via REST
    try {
      await api.post(`/rides/${rideId}/chat`, payload);
    } catch (e) {
      // Non-blocking fallback
    }
  };

  const quickReplies = [
    "I'm arriving at your pickup location.",
    "I have arrived outside.",
    "Please share your 4-digit Ride OTP.",
    "Stuck in traffic for 2 minutes, coming!",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md h-[550px] bg-dark-800 border border-dark-600 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-4 bg-dark-900 border-b border-dark-600/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/40 flex items-center justify-center font-bold">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Chat with Customer</h4>
              <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                End-to-End Encrypted Trip Chat
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-dark-700 hover:bg-dark-600 text-slate-400 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-dark-900/40">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs space-y-1">
              <ShieldCheck className="w-8 h-8 mx-auto text-dark-500" />
              <p>No messages yet.</p>
              <p className="text-[11px]">Send a quick update to the rider below.</p>
            </div>
          ) : (
            messages.map((m, idx) => {
              const isMe = m.senderType === 'CAPTAIN';
              return (
                <div
                  key={idx}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                      isMe
                        ? 'bg-brand-500 text-dark-900 font-semibold rounded-tr-none'
                        : 'bg-dark-700 text-slate-100 rounded-tl-none border border-dark-600'
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 px-1 font-mono">
                    {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestions */}
        <div className="p-2 bg-dark-900/80 border-t border-dark-600/50 flex gap-2 overflow-x-auto no-scrollbar">
          {quickReplies.map((qr, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(qr)}
              className="text-[11px] whitespace-nowrap bg-dark-700 hover:bg-dark-600 text-slate-300 px-3 py-1.5 rounded-full border border-dark-600 transition-colors shrink-0"
            >
              {qr}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 bg-dark-900 border-t border-dark-600/70 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message to customer..."
            className="flex-1 bg-dark-800 border border-dark-600 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-10 h-10 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-900 font-bold flex items-center justify-center transition-colors disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default CaptainChatModal;
