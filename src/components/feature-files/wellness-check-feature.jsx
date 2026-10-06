// components/feature-files/wellness-check-feature.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FeatureViewer from '../FeatureViewer';
import { useAuth } from '../../context/AuthContext';
import { wellnessQuestions as questions, scoreEmoji } from '../../data/assessmentQuestions';

const WellnessCheckFeature = () => {
  const navigate = useNavigate();
  const { apiRequest } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState({});
  const [isCompleting, setIsCompleting] = useState(false);
  const [results, setResults] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [wellnessHistory, setWellnessHistory] = useState([]);
  const [error, setError] = useState('');

  // Load real check-in history from the backend
  const loadHistory = async () => {
    try {
      setWellnessHistory(await apiRequest('/api/wellness-checks?limit=10'));
    } catch (err) {
      console.error('Failed to load wellness history:', err);
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResponse = (questionId, value) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const nextQuestion = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeAssessment();
    }
  };

  const prevQuestion = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Score and recommendations are computed and saved by the backend
  const completeAssessment = async () => {
    setIsCompleting(true);
    setError('');
    try {
      const saved = await apiRequest('/api/wellness-checks', {
        method: 'POST',
        body: JSON.stringify({ responses })
      });
      setResults({
        overallScore: saved.overall_score,
        responses: saved.responses,
        recommendations: saved.recommendations,
        date: saved.created_at
      });
      loadHistory();
    } catch (err) {
      setError(err.message || 'Could not save your check-in. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  const resetAssessment = () => {
    setCurrentStep(0);
    setResponses({});
    setResults(null);
    setIsCompleting(false);
    setError('');
  };

  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  if (results) {
    return (
      <FeatureViewer title="Wellness Check Results">
        <div className="max-w-2xl mx-auto">
          {/* Results Header */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-3xl">{scoreEmoji(results.overallScore)}</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Assessment Complete</h3>
            <p className="text-gray-600">Overall Wellness Score: {results.overallScore.toFixed(1)}/5.0</p>
            <p className="text-xs text-gray-500 mt-1">Saved to your history. Stress and anxiety count in reverse — lower is better.</p>
          </div>

          {/* Score Breakdown */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-gray-800 mb-3">Score Breakdown</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {questions.map(q => (
                <div key={q.id} className="text-center">
                  <div className="text-lg mb-1">
                    {q.scale.find(s => s.value === results.responses[q.id])?.emoji}
                  </div>
                  <div className="text-xs text-gray-600 capitalize">{q.id}</div>
                  <div className="font-medium">{results.responses[q.id]}/5</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-800 mb-3">Personalized Recommendations</h4>
            <div className="space-y-3">
              {results.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-l-4 ${
                    rec.priority === 'high'
                      ? 'bg-red-50 border-red-400 text-red-800'
                      : rec.priority === 'medium'
                      ? 'bg-yellow-50 border-yellow-400 text-yellow-800'
                      : 'bg-green-50 border-green-400 text-green-800'
                  }`}
                >
                  <div className="font-medium text-sm">{rec.category}</div>
                  <div className="text-sm mt-1">{rec.suggestion}</div>
                </div>
              ))}
            </div>
          </div>

          {results.overallScore < 2.5 && (
            <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-900">
              It looks like things are hard right now. Talking to someone can really help —
              <button onClick={() => navigate('/booking')} className="underline font-medium mx-1">book a counsellor</button>
              or call Tele-MANAS free at <a href="tel:14416" className="underline font-medium">14416</a>.
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={resetAssessment}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Take Another Check
            </button>
            <button
              onClick={() => navigate('/resources')}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Explore Resources
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </FeatureViewer>
    );
  }

  return (
    <FeatureViewer title="Wellness Check-In">
      {/* Navigation */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
          >
            <span>🏠</span>
            <span>Home</span>
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
          >
            <span>📊</span>
            <span>History</span>
          </button>
        </div>
      </div>

      {/* History View */}
      {showHistory && (
        <div className="mb-6 bg-purple-50 rounded-lg p-4">
          <h4 className="font-semibold text-purple-900 mb-3">Recent Wellness Checks</h4>
          <div className="space-y-2">
            {wellnessHistory.length === 0 && (
              <p className="text-sm text-purple-700">No check-ins yet. Complete your first one below!</p>
            )}
            {wellnessHistory.map((entry) => (
              <div key={entry.id} className="flex justify-between items-center py-2 border-b border-purple-200">
                <div>
                  <span className="text-sm text-purple-800">
                    {new Date(entry.created_at + 'Z').toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                  <div className="text-xs text-purple-600">
                    Score: {entry.overall_score.toFixed(1)}/5.0
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg">{scoreEmoji(entry.overall_score)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">
            Question {currentStep + 1} of {questions.length}
          </span>
          <span className="text-sm text-gray-600">{Math.round(progress)}% complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Current Question */}
      {currentQuestion && !isCompleting && (
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {currentQuestion.question}
            </h3>
            <p className="text-gray-600">Select the option that best describes your current state</p>
          </div>

          {/* Answer Options */}
          <div className="space-y-3 mb-8">
            {currentQuestion.scale.map((option) => (
              <button
                key={option.value}
                onClick={() => handleResponse(currentQuestion.id, option.value)}
                className={`w-full p-4 rounded-lg border-2 transition-all flex items-center space-x-4 ${
                  responses[currentQuestion.id] === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">{option.emoji}</span>
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-800">{option.label}</div>
                  <div className="text-sm text-gray-600">Rating: {option.value}/5</div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 ${
                  responses[currentQuestion.id] === option.value
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-gray-300'
                }`}>
                  {responses[currentQuestion.id] === option.value && (
                    <div className="w-full h-full rounded-full bg-white scale-50"></div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <button
              onClick={prevQuestion}
              disabled={currentStep === 0}
              className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Previous
            </button>
            <button
              onClick={nextQuestion}
              disabled={!responses[currentQuestion.id]}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {currentStep === questions.length - 1 ? 'Complete Assessment' : 'Next Question'}
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isCompleting && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl">🔄</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Processing Your Assessment</h3>
          <p className="text-gray-600">Saving your responses and generating personalized recommendations...</p>
        </div>
      )}

      {/* Feature Info */}
      <div className="mt-8 bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">About Wellness Check-Ins</h4>
        <p className="text-blue-800 text-sm mb-2">
          Regular wellness check-ins help you track your mental health over time and identify patterns
          in your wellbeing. This assessment provides personalized recommendations based on your responses.
        </p>
        <div className="text-sm text-blue-700">
          <p><strong>📊 Track Progress:</strong> Monitor your wellness trends over time</p>
          <p><strong>🎯 Personalized Tips:</strong> Get recommendations tailored to your current state</p>
          <p><strong>🔒 Private & Secure:</strong> Your responses are confidential and only shown to staff as anonymous totals</p>
        </div>
      </div>
    </FeatureViewer>
  );
};

export default WellnessCheckFeature;
