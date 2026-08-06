import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Sparkles, Globe, Database, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import axios from 'axios';

import { API_BASE as API } from '../config/api';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

export default function AIChat() {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'مرحباً! أنا مساعد ScholarNest الذكي 🎓\nاسألني عن أي منحة وسأبحث لك في قاعدة بياناتنا أو في الإنترنت. يمكنني الرد بالعربية والإنجليزية.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    if (!user?.token) {
      setMessages([...messages, {
        role: 'ai',
        text: '❌ يرجى تسجيل الدخول أولاً لاستخدام المساعد الذكي.'
      }]);
      return;
    }

    const userText = input.trim();
    const newMessages: Message[] = [...messages, { role: 'user', text: userText }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const apiMessages = newMessages.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : 'user',
        content: msg.text
      }));

      const { data } = await axios.post(`${API}/ai/chat`, {
        messages: apiMessages
      }, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });

      setMessages([...newMessages, {
        role: 'ai',
        text: data.message?.content || 'عذراً، لم أتمكن من الرد الآن.'
      }]);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setMessages([...newMessages, {
          role: 'ai',
          text: '❌ انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.'
        }]);
      } else {
        setMessages([...newMessages, {
          role: 'ai',
          text: 'عذراً، حدث خطأ في الاتصال. يرجى التأكد من أن الخادم يعمل.'
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'منح ممولة بالكامل في ألمانيا',
    'Scholarships for Master in UK',
    'منح بدون IELTS',
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="mb-4 w-[360px] sm:w-[400px] h-[540px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 text-white shadow-md">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm leading-none">ScholarNest AI</h3>
                    <p className="text-red-200 text-[10px] mt-0.5">Powered by Llama 3.3</p>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth" dir="auto">
              {messages.map((msg, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'ai' && (
                    <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center mr-2 mt-1 shrink-0">
                      <Bot className="w-3.5 h-3.5 text-red-600" />
                    </div>
                  )}
                  <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-red-600 text-white rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm border border-border'
                  }`}>
                    {msg.text}
                  </div>
                </motion.div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center mr-2 shrink-0">
                    <Bot className="w-3.5 h-3.5 text-red-600" />
                  </div>
                  <div className="bg-muted border border-border px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '120ms' }} />
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '240ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick prompts (shown only when few messages) */}
            {messages.length <= 1 && !loading && (
              <div className="px-4 pb-2 flex flex-col gap-1.5">
                {quickPrompts.map(p => (
                  <button key={p} onClick={() => setInput(p)}
                    className="text-left text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 px-3 py-2 rounded-lg flex items-center justify-between group transition-colors">
                    {p}
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-3 bg-muted/40 border-t border-border">
              <form onSubmit={handleSend} className="flex gap-2">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="اسألني عن أي منحة..."
                  disabled={loading}
                  className="flex-1 bg-background border-border focus-visible:ring-red-500 rounded-xl text-sm h-9 shadow-sm"
                  dir="auto"
                />
                <Button type="submit" disabled={loading || !input.trim()}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-3 h-9 shadow-sm">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center shadow-2xl shadow-red-600/40 text-white border-2 border-white/20 relative"
      >
        <AnimatePresence mode="wait">
          {isOpen
            ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><X className="w-6 h-6" /></motion.div>
            : <motion.div key="bot" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}><Bot className="w-6 h-6" /></motion.div>
          }
        </AnimatePresence>
        {/* Pulse ring */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20" />
        )}
      </motion.button>
    </div>
  );
}
