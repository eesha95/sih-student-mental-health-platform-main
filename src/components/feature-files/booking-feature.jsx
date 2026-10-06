// components/feature-files/booking-feature.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import FeatureViewer from '../FeatureViewer';
import { useAuth } from '../../context/AuthContext';

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-200 text-gray-600',
  completed: 'bg-blue-100 text-blue-800'
};

const URGENCY_STYLES = {
  low: 'bg-green-600 text-white border-green-600',
  normal: 'bg-blue-600 text-white border-blue-600',
  high: 'bg-red-600 text-white border-red-600'
};

const formatDate = (isoDate) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

const BookingFeature = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, apiRequest } = useAuth();

  const [counselors, setCounselors] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [loadingCounselors, setLoadingCounselors] = useState(true);
  const [selectedCounselor, setSelectedCounselor] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [allSlots, setAllSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingStep, setBookingStep] = useState('select'); // select, details, confirm
  const [bookingDetails, setBookingDetails] = useState({
    name: user?.name || '',
    phone: '',
    email: user?.email || '',
    reason: '',
    urgency: 'normal',
    sessionType: 'phone',
    notes: location.state?.selectedDoctor ? `Referred from doctor finder: ${location.state.selectedDoctor}` : ''
  });
  const [isBooking, setIsBooking] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [error, setError] = useState('');

  const loadCounselors = async () => {
    setLoadingCounselors(true);
    try {
      setCounselors(await apiRequest('/api/counselors'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingCounselors(false);
    }
  };

  const loadMyBookings = async () => {
    try {
      setMyBookings(await apiRequest('/api/bookings'));
    } catch (err) {
      console.error('Failed to load bookings:', err);
    }
  };

  useEffect(() => {
    loadCounselors();
    loadMyBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch real availability whenever the counselor or date changes
  useEffect(() => {
    if (!selectedCounselor || !selectedDate) return;
    let cancelled = false;
    setLoadingSlots(true);
    setSelectedTime('');
    apiRequest(`/api/counselors/${selectedCounselor.id}/availability?date=${selectedDate}`)
      .then((data) => {
        if (cancelled) return;
        setAllSlots(data.all_slots);
        setAvailableSlots(data.available_slots);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoadingSlots(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCounselor, selectedDate]);

  const handleCounselorSelect = (counselor) => {
    setSelectedCounselor(counselor);
    setSelectedDate(counselor.next_available?.date || '');
    setError('');
    setBookingStep('details');
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsBooking(true);
    try {
      const booking = await apiRequest('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          counselor_id: selectedCounselor.id,
          date: selectedDate,
          time_slot: selectedTime,
          session_type: bookingDetails.sessionType,
          reason: bookingDetails.reason,
          urgency: bookingDetails.urgency,
          notes: bookingDetails.notes,
          contact_name: bookingDetails.name,
          contact_phone: bookingDetails.phone,
          contact_email: bookingDetails.email
        })
      });
      setConfirmedBooking(booking);
      setBookingStep('confirm');
      loadMyBookings();
      loadCounselors();
    } catch (err) {
      setError(err.message);
      // Slot may have just been taken — refresh availability
      if (selectedCounselor && selectedDate) {
        apiRequest(`/api/counselors/${selectedCounselor.id}/availability?date=${selectedDate}`)
          .then((data) => setAvailableSlots(data.available_slots))
          .catch(() => {});
      }
    } finally {
      setIsBooking(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Cancel this session request?')) return;
    try {
      await apiRequest(`/api/bookings/${bookingId}/cancel`, { method: 'POST' });
      loadMyBookings();
      loadCounselors();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChange = (e) => {
    setBookingDetails({ ...bookingDetails, [e.target.name]: e.target.value });
  };

  const generateNextDays = (count = 8) => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < count; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      dates.push({ value, label: formatDate(value) });
    }
    return dates;
  };

  const resetBooking = () => {
    setBookingStep('select');
    setSelectedCounselor(null);
    setSelectedDate('');
    setSelectedTime('');
    setConfirmedBooking(null);
    setError('');
    setBookingDetails((prev) => ({ ...prev, reason: '', urgency: 'normal', notes: '' }));
  };

  const upcomingBookings = myBookings.filter((b) => b.status === 'pending' || b.status === 'confirmed');
  const pastBookings = myBookings.filter((b) => b.status !== 'pending' && b.status !== 'confirmed');

  if (bookingStep === 'confirm' && confirmedBooking) {
    return (
      <FeatureViewer title="Booking Confirmation">
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">✅</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Session requested!</h3>
          <p className="text-gray-600 mb-6">
            Your slot is reserved. The counselling team will call you to confirm — you'll also see the status change here and in your notifications.
          </p>

          <div className="bg-green-50 p-6 rounded-lg text-left max-w-md mx-auto">
            <h4 className="font-semibold text-green-800 mb-3">Session Details</h4>
            <div className="space-y-2 text-sm">
              <p><strong>Reference:</strong> {confirmedBooking.reference}</p>
              <p><strong>Counselor:</strong> {confirmedBooking.counselor_name}</p>
              <p><strong>Date:</strong> {formatDate(confirmedBooking.date)}</p>
              <p><strong>Time:</strong> {confirmedBooking.time_slot}</p>
              <p><strong>Contact:</strong> {confirmedBooking.contact_name} · {confirmedBooking.contact_phone}</p>
              <p><strong>Status:</strong> <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_STYLES[confirmedBooking.status]}`}>{confirmedBooking.status}</span></p>
            </div>
          </div>

          <div className="flex gap-3 justify-center mt-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Back to Dashboard
            </button>
            <button
              onClick={resetBooking}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              View My Sessions
            </button>
          </div>
        </div>
      </FeatureViewer>
    );
  }

  return (
    <FeatureViewer title="Book a Counseling Session">
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
            onClick={() => navigate('/resources')}
            className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
          >
            <span>📚</span>
            <span>Resources</span>
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            bookingStep === 'select' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}>1</div>
          <div className="w-8 h-0.5 bg-gray-300"></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            bookingStep === 'details' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}>2</div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {bookingStep === 'select' && (
        <div>
          {/* My Sessions */}
          {myBookings.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">My Sessions</h3>
              <div className="space-y-2">
                {[...upcomingBookings, ...pastBookings.slice(0, 5)].map((b) => (
                  <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 border rounded-lg p-3 bg-white">
                    <div>
                      <p className="font-medium text-gray-800">{b.counselor_name}</p>
                      <p className="text-sm text-gray-600">{formatDate(b.date)} · {b.time_slot} · {b.reference}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[b.status]}`}>{b.status}</span>
                      {(b.status === 'pending' || b.status === 'confirmed') && (
                        <button onClick={() => handleCancelBooking(b.id)} className="text-sm text-red-600 hover:text-red-800">
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h3 className="text-xl font-semibold text-gray-800 mb-4">Choose Your Counselor</h3>
          {loadingCounselors ? (
            <div className="text-center py-8 text-gray-500">Loading counselors...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {counselors.map(counselor => (
                <div
                  key={counselor.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleCounselorSelect(counselor)}
                >
                  <div className="flex items-center mb-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-2xl">{counselor.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{counselor.name}</h4>
                      <p className="text-sm text-gray-600">{counselor.specialization}</p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{counselor.bio}</p>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Experience:</span>
                      <span>{counselor.experience_years} years</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Languages:</span>
                      <span className="text-right">{counselor.languages}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Next Available:</span>
                      <span className="text-green-600">
                        {counselor.next_available
                          ? `${formatDate(counselor.next_available.date)}, ${counselor.next_available.time_slot}`
                          : 'Fully booked this week'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {bookingStep === 'details' && selectedCounselor && (
        <div className="max-w-3xl mx-auto p-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl">
          <div className="flex items-center mb-6">
            <button
              onClick={() => setBookingStep('select')}
              className="text-blue-600 hover:text-blue-700 mr-4"
            >
              ← Back
            </button>
            <div className="text-center flex-1">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                📅 Book with {selectedCounselor.name}
              </h3>
              <p className="text-gray-600">
                Pick a slot — the counselling team will call you to confirm
              </p>
            </div>
          </div>

          <form onSubmit={handleBookingSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={bookingDetails.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter your full name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={bookingDetails.phone}
                  onChange={handleChange}
                  required
                  minLength={7}
                  placeholder="+91 98XXXXXXXX"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={bookingDetails.email}
                onChange={handleChange}
                required
                placeholder="your.email@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all duration-200"
              />
            </div>

            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Date *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {generateNextDays().map(date => (
                  <button
                    key={date.value}
                    type="button"
                    onClick={() => setSelectedDate(date.value)}
                    className={`p-3 text-sm rounded-lg border transition-colors ${
                      selectedDate === date.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    {date.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Selection */}
            {selectedDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Time *
                </label>
                {loadingSlots ? (
                  <p className="text-sm text-gray-500">Checking availability...</p>
                ) : availableSlots.length === 0 ? (
                  <p className="text-sm text-gray-600">No free slots on this day — please pick another date.</p>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {allSlots.map(time => {
                      const free = availableSlots.includes(time);
                      return (
                        <button
                          key={time}
                          type="button"
                          disabled={!free}
                          onClick={() => setSelectedTime(time)}
                          className={`p-2 text-sm rounded-lg border transition-colors ${
                            selectedTime === time
                              ? 'bg-blue-600 text-white border-blue-600'
                              : free
                              ? 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                              : 'bg-gray-100 text-gray-400 border-gray-200 line-through cursor-not-allowed'
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Session Type */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="p-3 rounded-lg border bg-blue-600 text-white border-blue-600 flex items-center justify-center space-x-2">
                <span>📞</span>
                <span>Phone call to confirm</span>
              </div>
            </div>

            {/* Reason for Session */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Session *
              </label>
              <select
                name="reason"
                value={bookingDetails.reason}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm"
                required
              >
                <option value="">Select reason...</option>
                <option value="anxiety">Anxiety Management</option>
                <option value="depression">Depression Support</option>
                <option value="stress">Stress / Academic Pressure</option>
                <option value="relationship">Relationship Issues</option>
                <option value="trauma">Trauma Recovery</option>
                <option value="general">General Mental Health</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Urgency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Urgency Level
              </label>
              <div className="flex space-x-2">
                {[
                  { value: 'low', label: 'Low' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'high', label: 'High' }
                ].map(urgency => (
                  <button
                    key={urgency.value}
                    type="button"
                    onClick={() => setBookingDetails(prev => ({ ...prev, urgency: urgency.value }))}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      bookingDetails.urgency === urgency.value
                        ? URGENCY_STYLES[urgency.value]
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {urgency.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                name="notes"
                value={bookingDetails.notes}
                onChange={handleChange}
                placeholder="Any additional information you'd like to share with your counselor..."
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm"
              />
            </div>

            <button
              type="submit"
              disabled={!selectedDate || !selectedTime || !bookingDetails.reason || !bookingDetails.name || !bookingDetails.phone || !bookingDetails.email || isBooking}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isBooking ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Booking session...</span>
                </>
              ) : (
                <>
                  <span>Book Counseling Session</span>
                  <span>📞</span>
                </>
              )}
            </button>
          </form>

          {/* Feature Info */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
              <span className="mr-2">ℹ️</span>
              How counseling booking works
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Your chosen slot is held for you as soon as you book</li>
              <li>• The counselling team calls you to confirm and the status updates here</li>
              <li>• High urgency requests are shown first to the team</li>
              <li>• You can cancel any time from "My Sessions"</li>
              <li>• All personal information is kept strictly confidential</li>
            </ul>
          </div>

          {/* Quick Actions */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <a href="tel:14416" className="p-3 bg-red-50 border border-red-200 rounded-lg text-center hover:bg-red-100">
              <div className="text-red-600 font-semibold mb-1">🚨 In crisis now?</div>
              <div className="text-red-700 text-xs">Call Tele-MANAS: <strong>14416</strong> · Emergency: <strong>112</strong></div>
            </a>
            <button type="button" onClick={() => navigate('/ai-chat')} className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-center hover:bg-purple-100">
              <div className="text-purple-600 font-semibold mb-1">💬 Talk now</div>
              <div className="text-purple-700 text-xs">AI support chat, 24/7</div>
            </button>
            <button type="button" onClick={() => navigate('/peer-support')} className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-center hover:bg-teal-100">
              <div className="text-teal-600 font-semibold mb-1">👥 Support Groups</div>
              <div className="text-teal-700 text-xs">Join peer support</div>
            </button>
          </div>
        </div>
      )}

      {/* Feature Info - Only show on counselor selection step */}
      {bookingStep === 'select' && (
        <div className="mt-8 bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">About Our Counseling Services</h4>
          <p className="text-blue-800 text-sm mb-2">
            Book sessions with mental health professionals who specialize in various areas of student wellbeing.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <p><strong>🔒 Confidential:</strong> Your privacy is protected</p>
              <p><strong>📅 Real availability:</strong> Only free slots can be booked</p>
            </div>
            <div>
              <p><strong>📞 Call to confirm:</strong> The team calls you before the session</p>
              <p><strong>🗂️ Track sessions:</strong> See status and cancel from this page</p>
            </div>
          </div>
        </div>
      )}
    </FeatureViewer>
  );
};

export default BookingFeature;
