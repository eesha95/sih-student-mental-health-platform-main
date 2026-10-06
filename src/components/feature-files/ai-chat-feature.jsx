import React, { useState, useRef, useEffect } from 'react';
import FeatureViewer from '../FeatureViewer';
import { useAuth } from '../../context/AuthContext';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

const AIChatFeature = () => {
  const { token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [latestNlp, setLatestNlp] = useState(null);
  const messagesEndRef = useRef(null);

  // Load chat history from backend
  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!token) {
        setMessages([
          {
            id: 1,
            sender: 'ai',
            text: "Hello! I am your 24/7 AI Mental Health Assistant. How are you feeling today? Feel free to share whatever is on your mind—I am here to support you in a safe, confidential space.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setInitialLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/chat/history`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (res.ok) {
          const history = await res.json();
          if (history && history.length > 0) {
            setMessages(history);
          } else {
            setMessages([
              {
                id: 1,
                sender: 'ai',
                text: "Hello! I am your 24/7 AI Mental Health Assistant. How are you feeling today? Feel free to share whatever is on your mind.",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]);
          }
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchChatHistory();
  }, [token]);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    
    const userText = inputMessage.trim();
    if (!userText || loading) return;

    // Clear input & reset errors
    setInputMessage('');
    setError('');

    // Add user message to UI
    const newUserMessage = {
      id: Date.now(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setLoading(true);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: userText }),
      });

      if (response.status === 401) {
        setMessages((prev) => [...prev, {
          id: Date.now() + 1,
          sender: 'ai',
          text: "Your login has expired, so this conversation can't be saved. Please log out and log in again. If you need urgent help, call Tele-MANAS at 14416.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        return;
      }
      if (!response.ok) {
        throw new Error(`Server error (${response.status})`);
      }

      const data = await response.json();
      if (data.nlp) {
        setLatestNlp(data.nlp);
      }
      
      const newAiMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        text: data.reply || "I am here for you. Could you share a bit more?",
        risk_level: data.nlp?.risk_level || 'LOW',
        timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, newAiMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      const fallbackMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: "I am here to support you. Taking a slow, deep breath, taking a short break, or speaking with a university counselor can really help ease your mind right now.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/api/chat/history`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        console.error("Clear chat error:", err);
      }
    }
    setMessages([
      {
        id: Date.now(),
        sender: 'ai',
        text: "Chat history cleared. How can I help you right now?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setLatestNlp(null);
    setError('');
  };

  const handleQuickPrompt = (promptText) => {
    setInputMessage(promptText);
  };

  return (
    <FeatureViewer title="AI Mental Health Support Chat">
      <div className="flex flex-col h-[600px] max-w-4xl mx-auto bg-gray-50 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl shadow-inner">
              🤖
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight">Serene AI Companion</h3>
              <p className="text-xs text-blue-100 flex items-center space-x-1">
                <span className="w-2 h-2 bg-green-400 rounded-full inline-block animate-pulse"></span>
                <span>Active 24/7 • Confidential & Safe</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleClearChat}
            className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors border border-white/20 flex items-center space-x-1"
            title="Clear Chat History"
          >
            <span>🗑️</span>
            <span>Clear Chat</span>
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 px-4 flex items-center justify-between text-sm text-red-700 animate-fadeIn">
            <div className="flex items-center space-x-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <button 
              onClick={() => setError('')} 
              className="text-red-500 hover:text-red-800 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-end space-x-2 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm">
                  🤖
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <span
                  className={`text-[10px] block mt-1.5 text-right ${
                    msg.sender === 'user' ? 'text-blue-200' : 'text-gray-400'
                  }`}
                >
                  {msg.timestamp}
                </span>
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm">
                  You
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-center space-x-2 justify-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                🤖
              </div>
              <div className="bg-white p-4 rounded-2xl rounded-bl-none border border-gray-100 shadow-sm flex items-center space-x-2">
                <span className="text-xs text-gray-500 font-medium">AI is thinking</span>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-white border-t border-gray-100 flex items-center space-x-2 overflow-x-auto text-xs text-gray-600">
          <span className="font-medium text-gray-400 whitespace-nowrap">Suggested:</span>
          <button
            onClick={() => handleQuickPrompt("I am feeling stressed about exams")}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1 rounded-full whitespace-nowrap transition-colors"
          >
            📚 Exam Stress
          </button>
          <button
            onClick={() => handleQuickPrompt("How can I manage daily anxiety?")}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full whitespace-nowrap transition-colors"
          >
            🌿 Daily Anxiety
          </button>
          <button
            onClick={() => handleQuickPrompt("I am having trouble sleeping peacefully")}
            className="bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-1 rounded-full whitespace-nowrap transition-colors"
          >
            🌙 Sleep Support
          </button>
        </div>

        {/* Input Area */}
        <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-white border-t border-gray-200 flex items-center space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message here..."
            disabled={loading}
            className="flex-1 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl px-4 py-3 text-sm focus:outline-none transition-all disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={loading || !inputMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium px-5 py-3 rounded-xl transition-all shadow-sm flex items-center justify-center space-x-1"
          >
            <span>Send</span>
            <span>➔</span>
          </button>
        </form>

      </div>

      {/* Safety Notice Footer */}
      <div className="mt-4 bg-blue-50/60 rounded-xl p-4 border border-blue-100 text-xs text-blue-800 space-y-1">
        <p className="font-semibold text-blue-900 flex items-center space-x-1">
          <span>🛡️ Important Note on AI Counseling Support:</span>
        </p>
        <p>
          This AI assistant provides general wellbeing guidance and emotional support. It does not replace professional therapy or medical diagnosis.
        </p>
        <p className="text-blue-700 font-medium pt-1">
          Emergency Crisis Contacts: iCall (9152987821) | AASRA (91-9820466726) | Emergency Services (112)
        </p>
      </div>
    </FeatureViewer>
  );
};

export default AIChatFeature;