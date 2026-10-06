// components/feature-files/finding-nearest-doctor-feature.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FeatureViewer from '../FeatureViewer';
import { useAuth } from '../../context/AuthContext';

const FindingNearestDoctorComponent = () => {
  const navigate = useNavigate();
  const { apiRequest } = useAuth();
  const [location, setLocation] = useState("");
  const [messages, setMessages] = useState([
    { 
      sender: "bot", 
      type: "text", 
      text: "Hi! Tell me what you'd like help with (for example exam anxiety, low mood, or sleep problems) and your city or area. I'll suggest the right kind of professional and how to find one nearby." 
    }
  ]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Generate session ID without localStorage
  useEffect(() => {
    const newSessionId = "session_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
    setSessionId(newSessionId);
  }, []);

  // Function to open the existing "Call to Book Appointment" feature
  const openAppointmentBooking = (doctorName = "") => {
    navigate('/booking', { 
      state: { 
        selectedDoctor: doctorName,
        fromDoctorFinder: true 
      }
    });
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    const userMessage = input;
    setMessages((prev) => [...prev, { sender: "user", type: "text", text: userMessage }]);
    setInput("");

    try {
      const data = await apiRequest('/api/doctor-finder', {
        method: 'POST',
        body: JSON.stringify({ message: userMessage, location, session_id: sessionId })
      });
      const replies = [];
      if (data.reply) replies.push({ sender: "bot", type: "text", text: data.reply, critical: ['HIGH', 'CRITICAL'].includes(data.risk_level) });
      if (data.doctors && data.doctors.length) replies.push({ sender: "bot", type: "doctors", doctors: data.doctors });
      if (data.search_links && data.search_links.length) replies.push({ sender: "bot", type: "links", links: data.search_links });
      setMessages((prev) => [...prev, ...replies]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          type: "text",
          text: `Sorry, I couldn't search right now (${error.message}). You can still book a campus counsellor, or call Tele-MANAS free at 14416.`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Render message UI
  const renderMessage = (msg, i) => {
    if (msg.type === "doctors") {
      return (
        <div key={i} className="flex justify-start mb-4">
          <div className="max-w-3xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-sm">🏥</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Nearby Doctors Found
              </h3>
            </div>
            <div className="space-y-4">
              {msg.doctors.map((doc, idx) => (
                <div 
                  key={idx} 
                  className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-slate-600"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-1">
                        {doc.name || "Dr. Name"}
                      </h4>
                      <p className="text-blue-600 dark:text-blue-400 font-medium mb-2">
                        {doc.specialization || doc.specialty || "General Practitioner"}
                      </p>
                      
                      {/* Contact and Address Info */}
                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                        {(doc.contact || doc.phone) && (
                          <div className="flex items-center">
                            <span className="mr-2">📞</span>
                            <span>{doc.contact || doc.phone}</span>
                          </div>
                        )}
                        {doc.address && (
                          <div className="flex items-center">
                            <span className="mr-2">📍</span>
                            <span className="text-xs">{doc.address}</span>
                          </div>
                        )}
                        {doc.distance && (
                          <div className="flex items-center">
                            <span className="mr-2">🚗</span>
                            <span>{doc.distance}</span>
                          </div>
                        )}
                        {doc.availability && (
                          <div className="flex items-center">
                            <span className="mr-2">🕒</span>
                            <span>{doc.availability}</span>
                          </div>
                        )}
                        {doc.consultation_fee && (
                          <div className="flex items-center">
                            <span className="mr-2">💰</span>
                            <span className="font-medium text-green-600 dark:text-green-400">{doc.consultation_fee}</span>
                          </div>
                        )}
                        {doc.rating && (
                          <div className="flex items-center">
                            <span className="mr-2">⭐</span>
                            <span className="font-medium">{doc.rating}</span>
                          </div>
                        )}
                      </div>

                      {doc.experience && (
                        <div className="mt-2 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            <strong>Experience:</strong> {doc.experience}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-4 flex flex-col space-y-2">
                      {doc.mapsUrl && (
                        <a 
                          href={doc.mapsUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors duration-200"
                        >
                          <span className="mr-1">📍</span>
                          View on Maps
                        </a>
                      )}
                      <button
                        onClick={() => openAppointmentBooking(doc.name)}
                        className="inline-flex items-center px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors duration-200"
                      >
                        <span className="mr-1">📅</span>
                        Book Appointment
                      </button>
                      {(doc.contact || doc.phone) && (
                        <button
                          onClick={() => window.open(`tel:${doc.contact || doc.phone}`, '_blank')}
                          className="inline-flex items-center px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors duration-200"
                        >
                          <span className="mr-1">📞</span>
                          Call Now
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* General Book Appointment Button */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-600">
              <button
                onClick={() => openAppointmentBooking()}
                className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <span className="mr-2">📅</span>
                Book Appointment with Any Doctor
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (msg.type === "links") {
      return (
        <div key={i} className="flex justify-start mb-4">
          <div className="max-w-md bg-blue-50 dark:bg-slate-700 rounded-2xl p-4 shadow-md">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-2">🔎 Search verified listings near you:</p>
            <ul className="space-y-2">
              {msg.links.map((link) => (
                <li key={link.url}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-700 dark:text-blue-300 underline hover:text-blue-900">
                    {link.label} ↗
                  </a>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">Check a clinic's reviews and registration before visiting.</p>
          </div>
        </div>
      );
    }

    // Default text message
    const isBot = msg.sender === "bot";
    return (
      <div key={i} className={`flex mb-4 ${isBot ? "justify-start" : "justify-end"}`}>
        <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-md ${
          isBot 
            ? "bg-gradient-to-r from-gray-100 to-gray-50 dark:from-slate-700 dark:to-slate-600 text-gray-800 dark:text-gray-100" 
            : "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
        } ${msg.critical ? "ring-2 ring-red-400" : ""}`}>
          {isBot && (
            <div className="flex items-center mb-1">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                <span className="text-white text-xs">🤖</span>
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">AI Assistant</span>
            </div>
          )}
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-4">
              <span className="text-2xl">🏥</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Find Nearest Doctor</h2>
              <p className="text-blue-100 text-sm">Find the right mental health professional near you</p>
            </div>
          </div>
          
          {/* Quick Book Appointment Button in Header */}
          <button
            onClick={() => openAppointmentBooking()}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all duration-200 text-sm flex items-center"
          >
            <span className="mr-1">📅</span>
            Quick Book
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50 to-white dark:from-slate-800 dark:to-slate-900 min-h-96 max-h-96">
        {messages.map((msg, i) => renderMessage(msg, i))}
        
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-100 dark:bg-slate-700 rounded-2xl px-4 py-3 shadow-md">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-300">Finding the right help for you...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-900">
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="📍 Your city or area (e.g. Pune, Koramangala Bengaluru)"
          disabled={isLoading}
          className="w-full mb-3 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
        />
        <div className="flex space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What would you like help with?"
            onKeyDown={handleKeyPress}
            disabled={isLoading}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 flex items-center"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <span>➤</span>
            )}
          </button>
        </div>
        
        {/* Quick action buttons */}
        <div className="flex flex-wrap gap-2 mt-3">
          {[
            "I have exam anxiety and panic attacks",
            "I've been feeling low for weeks",
            "I can't sleep properly",
            "I think I may need medication"
          ].map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => setInput(suggestion)}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {/* Quick Navigation Buttons */}
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={() => navigate('/booking')}
            className="flex items-center space-x-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <span>📅</span>
            <span>Book Appointment</span>
          </button>
          
          <button
            onClick={() => navigate('/crisis-help')}
            className="flex items-center space-x-2 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <span>🚨</span>
            <span>Emergency Help</span>
          </button>

          <button
            onClick={() => navigate('/ai-chat')}
            className="flex items-center space-x-2 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <span>💬</span>
            <span>AI Health Chat</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const FindingNearestDoctorFeature = () => {
  return (
    <FeatureViewer title="Find Nearest Doctor">
      <FindingNearestDoctorComponent />
    </FeatureViewer>
  );
};

export default FindingNearestDoctorFeature;