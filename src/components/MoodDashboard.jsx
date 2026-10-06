import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import FeatureViewer from './FeatureViewer';
import { useAuth } from '../context/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

const MoodDashboard = () => {
  const { token } = useAuth();
  const location = useLocation();
  const [moodHistory, setMoodHistory] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [resources, setResources] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states for Mood Entry
  const [mood, setMood] = useState('Neutral');
  const [moodScore, setMoodScore] = useState(3);
  const [emotion, setEmotion] = useState('Calm');
  const [stressLevel, setStressLevel] = useState(3);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [notes, setNotes] = useState('');
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [submitError, setSubmitError] = useState('');

  const moodOptions = [
    { label: 'Very Low', score: 1, emoji: '😢' },
    { label: 'Low', score: 2, emoji: '😞' },
    { label: 'Neutral', score: 3, emoji: '😐' },
    { label: 'Good', score: 4, emoji: '🙂' },
    { label: 'Great', score: 5, emoji: '😊' }
  ];

  const emotionOptions = ['Calm', 'Anxious', 'Stressed', 'Overwhelmed', 'Happy', 'Exhausted', 'Hopeful', 'Sad'];

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [histRes, analRes, recRes, resRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/mood/history`, { headers }),
        fetch(`${API_BASE_URL}/api/mood/analysis`, { headers }),
        fetch(`${API_BASE_URL}/api/recommendations`, { headers }),
        fetch(`${API_BASE_URL}/api/support-resources`)
      ]);

      if (histRes.ok) setMoodHistory(await histRes.json());
      if (analRes.ok) setAnalysis(await analRes.json());
      if (recRes.ok) setRecommendations(await recRes.json());
      if (resRes.ok) setResources(await resRes.json());
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Arriving from the dashboard mood picker: open the entry form with that mood selected
  useEffect(() => {
    const score = location.state?.quickMoodScore;
    const option = moodOptions.find((o) => o.score === score);
    if (option) {
      setMood(option.label);
      setMoodScore(option.score);
      setShowEntryModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const handleMoodSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/api/mood`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mood,
          mood_score: moodScore,
          emotion,
          stress_level: stressLevel,
          sleep_quality: sleepQuality,
          notes
        })
      });

      if (res.ok) {
        setFeedbackMsg('Mood entry recorded successfully!');
        setShowEntryModal(false);
        setNotes('');
        await fetchData();
        setTimeout(() => setFeedbackMsg(''), 4000);
      } else {
        const data = await res.json().catch(() => ({}));
        setSubmitError(res.status === 401 ? 'Your session has expired. Please log in again.' : (typeof data.detail === 'string' ? data.detail : `Could not save your entry (error ${res.status}).`));
      }
    } catch (err) {
      console.error("Submit mood error:", err);
      setSubmitError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteRec = async (recId) => {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/api/recommendations/${recId}/complete`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        setRecommendations((prev) =>
          prev.map((r) => (r.id === recId ? { ...r, is_completed: true } : r))
        );
      }
    } catch (err) {
      console.error("Complete recommendation error:", err);
    }
  };

  return (
    <FeatureViewer title="Mood Analysis & Personalized Recommendations">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top Header & Actions */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Emotional Wellness Tracker</h2>
            <p className="text-sm text-gray-500">Track your daily mood, view AI pattern analysis, and follow tailored recommendations.</p>
          </div>
          <button
            onClick={() => setShowEntryModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center space-x-2"
          >
            <span>✏️ Log Today's Mood</span>
          </button>
        </div>

        {feedbackMsg && (
          <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl text-sm font-medium animate-fadeIn">
            ✅ {feedbackMsg}
          </div>
        )}

        {/* AI Pattern Observation Alert */}
        {analysis?.has_data && (
          <div className="bg-indigo-50/80 border border-indigo-100 rounded-2xl p-5 shadow-sm flex items-start space-x-4">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-xl flex-shrink-0">
              📊
            </div>
            <div>
              <h3 className="font-semibold text-indigo-900 text-base">AI Pattern Insight</h3>
              <p className="text-sm text-indigo-800 mt-0.5">{analysis.pattern}</p>
              <div className="flex space-x-4 text-xs font-semibold text-indigo-600 mt-2">
                <span>Avg 7-Day Mood: {analysis.avg_mood} / 5</span>
                <span>•</span>
                <span>Avg 7-Day Stress: {analysis.avg_stress} / 5</span>
              </div>
            </div>
          </div>
        )}

        {/* Charts & Stats Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Mood Trend Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
            <h3 className="font-bold text-gray-800 text-lg flex items-center justify-between">
              <span>Mood & Stress Trends Over Time</span>
              <span className="text-xs font-normal text-gray-400">Database Verified</span>
            </h3>

            {analysis?.chart_data && analysis.chart_data.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analysis.chart_data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6B7280' }} />
                    <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 12, fill: '#6B7280' }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="mood" stroke="#3B82F6" strokeWidth={3} name="Mood Score" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="stress" stroke="#EF4444" strokeWidth={2} strokeDasharray="4 4" name="Stress Level" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <span className="text-3xl mb-2">📈</span>
                <p className="text-sm">No mood entries logged yet.</p>
                <p className="text-xs text-gray-400">Click "Log Today's Mood" to start tracking!</p>
              </div>
            )}
          </div>

          {/* Quick Recent Entries */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
            <h3 className="font-bold text-gray-800 text-lg">Recent Check-ins</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {moodHistory && moodHistory.length > 0 ? (
                moodHistory.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-gray-800 block text-sm">{entry.mood} ({entry.emotion})</span>
                      <span className="text-gray-400">{new Date(entry.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">
                        Score: {entry.mood_score}/5
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400">No recent check-ins recorded.</p>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Recommendations Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-800 text-xl">Personalized Wellness Recommendations</h3>
              <p className="text-xs text-gray-500">Tailored dynamically based on your stress level, mood trends, and sleep quality.</p>
            </div>
            <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-semibold">
              Dynamic Engine Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {recommendations && recommendations.length > 0 ? (
              recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    rec.is_completed
                      ? 'bg-gray-50 border-gray-200 opacity-60'
                      : 'bg-gradient-to-br from-white to-blue-50/40 border-blue-100 hover:shadow-md'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        {rec.category}
                      </span>
                      <span className="text-xs text-gray-400">⏱️ {rec.duration_minutes} mins</span>
                    </div>
                    <h4 className="font-bold text-gray-800 text-base leading-snug">{rec.title}</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">{rec.description}</p>
                    <div className="bg-blue-50/60 p-2.5 rounded-xl text-[11px] text-blue-900 border border-blue-100">
                      💡 <strong>Why:</strong> {rec.reason}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCompleteRec(rec.id)}
                    disabled={rec.is_completed}
                    className={`mt-4 w-full py-2 px-3 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center space-x-1 ${
                      rec.is_completed
                        ? 'bg-emerald-100 text-emerald-800 cursor-default'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                    }`}
                  >
                    <span>{rec.is_completed ? '✅ Completed' : 'Mark as Complete'}</span>
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400">Generating personalized recommendations for you...</p>
            )}
          </div>
        </div>

        {/* Safety & Professional Support Guidance */}
        {resources && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-6 border border-red-100 shadow-sm space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center text-xl">
                🚨
              </div>
              <div>
                <h3 className="font-bold text-red-900 text-lg">Professional Crisis & Helpline Resources</h3>
                <p className="text-xs text-red-700">Confidential 24/7 student support lines when extra human guidance is needed.</p>
              </div>
            </div>

            <p className="text-xs text-red-800 leading-relaxed">{resources.guidance}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {resources.emergency_contacts.map((contact, idx) => (
                <div key={idx} className="bg-white p-3.5 rounded-xl border border-red-100 shadow-xs">
                  <h4 className="font-bold text-gray-800 text-xs">{contact.name}</h4>
                  <p className="text-sm font-extrabold text-red-600 mt-1">{contact.number}</p>
                  <span className="text-[10px] text-gray-400 block mt-0.5">{contact.available}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Mood Entry Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-800 text-lg">Log Your Mood Entry</h3>
              <button onClick={() => setShowEntryModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleMoodSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Overall Mood Today</label>
                <div className="grid grid-cols-5 gap-2">
                  {moodOptions.map((opt) => (
                    <button
                      key={opt.score}
                      type="button"
                      onClick={() => { setMood(opt.label); setMoodScore(opt.score); }}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        moodScore === opt.score
                          ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold ring-2 ring-blue-200'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-2xl block">{opt.emoji}</span>
                      <span className="text-[10px] block mt-1">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Primary Emotion</label>
                <div className="flex flex-wrap gap-2">
                  {emotionOptions.map((emo) => (
                    <button
                      key={emo}
                      type="button"
                      onClick={() => setEmotion(emo)}
                      className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                        emotion === emo
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {emo}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Stress Level (1-5)</label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={stressLevel}
                    onChange={(e) => setStressLevel(Number(e.target.value))}
                    className="w-full accent-red-500"
                  />
                  <span className="text-xs text-gray-500 font-semibold block text-center mt-1">Level: {stressLevel}</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Sleep Quality (1-5)</label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={sleepQuality}
                    onChange={(e) => setSleepQuality(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                  <span className="text-xs text-gray-500 font-semibold block text-center mt-1">Quality: {sleepQuality}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Optional Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What influenced your mood today? (e.g. exams, sleep, friends...)"
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-blue-200 focus:outline-none"
                />
              </div>

              {submitError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{submitError}</p>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowEntryModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
                >
                  {submitting ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </FeatureViewer>
  );
};

export default MoodDashboard;
