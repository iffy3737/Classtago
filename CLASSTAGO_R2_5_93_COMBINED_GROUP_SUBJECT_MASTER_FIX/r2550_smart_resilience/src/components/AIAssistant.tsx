/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, AlertCircle, RefreshCw, User } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../lib/translations';
import UrduWrapper from './UrduWrapper';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIAssistantProps {
  lang: Language;
}

export default function AIAssistant({ lang }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = translations[lang];

  // Initialize with a friendly welcome message based on language
  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: t.aiWelcome
      }
    ]);
  }, [lang]);

  // Auto Scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    setError('');
    if (!textToSend) setInput('');

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(1) // omit the initial welcome message to keep payload clean
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get a response from the AI assistant.');
      }

      const data = await response.json();
      setMessages([...newMessages, { role: 'assistant', content: data.text }]);
    } catch (err: any) {
      console.error(err);
      setError(t.aiError || 'An error occurred. Check server logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggest = (prompt: string) => {
    handleSend(prompt);
  };

  const suggestions = {
    en: [
      "Tell me about National High School Taloda",
      "How to apply for admissions in 2026-27?",
      "Who are the mathematics teachers?"
    ],
    hi: [
      "नेशनल हाई स्कूल तलोदा के बारे में बताएं",
      "प्रवेश (एडमिशन) प्रक्रिया क्या है?",
      "समय सारणी (टाइम टेबल) कैसे देखें?"
    ],
    ur: [
      "نیشنل ہائی اسکول تلوادہ کے بارے میں معلومات دیں",
      "داخلہ حاصل کرنے کا کیا طریقہ ہے؟",
      "اردو میڈیم کے اساتذہ کون ہیں؟"
    ]
  };

  const activeSuggests = suggestions[lang] || suggestions.en;

  return (
    <div className="flex flex-col h-[550px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1">
              <span>{t.aiAssistant}</span>
              <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
            </h3>
            <p className="text-[10px] text-slate-500 font-sans">Powered by server-side Gemini 3.5 Flash</p>
          </div>
        </div>
        
        <button
          onClick={() => setMessages([{ role: 'assistant', content: t.aiWelcome }])}
          className="p-1.5 hover:bg-slate-200/60 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
          title="Clear Chat"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/30">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={index}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`p-1.5 rounded-lg shrink-0 ${isUser ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              {/* Message Box */}
              <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-xs shadow-sm leading-relaxed ${
                isUser 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
              }`}>
                {/* Apply Urdu RTL and fonts appropriately inside the box */}
                <UrduWrapper lang={lang} className={isUser ? 'text-white' : ''}>
                  <p className="whitespace-pre-line">{msg.content}</p>
                </UrduWrapper>
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-[10px] pl-2">
            <Bot className="w-3.5 h-3.5 animate-bounce text-blue-500" />
            <span>Assistant is typing...</span>
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-800 rounded-lg text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Setup Missing</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{error}</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Quick Chips */}
      {messages.length === 1 && (
        <div className="px-4 py-2 border-t border-slate-200 bg-slate-50/50">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Common Queries</p>
          <div className="flex flex-wrap gap-1.5">
            {activeSuggests.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleSuggest(prompt)}
                className="text-[10px] text-slate-600 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 rounded-full px-2.5 py-1 text-left cursor-pointer transition-all"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={t.aiPlaceholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
            className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 active:scale-95 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
