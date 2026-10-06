// components/ProfilePage.jsx - profile settings and preferences for students
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import FeatureViewer from './FeatureViewer';
import { useAuth } from '../context/AuthContext';

const Section = ({ id, title, description, children }) => (
  <section id={id} className="bg-white border border-gray-200 rounded-lg p-6 scroll-mt-24">
    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
    {description && <p className="text-sm text-gray-600 mb-4">{description}</p>}
    {children}
  </section>
);

const Message = ({ message }) =>
  message ? (
    <p className={`mt-3 text-sm ${message.ok ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>
  ) : null;

const ProfilePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateProfile, apiRequest, logout } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [nameMessage, setNameMessage] = useState(null);
  const [savingName, setSavingName] = useState(false);

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteMessage, setDeleteMessage] = useState(null);

  // /preferences links straight to the preferences section
  useEffect(() => {
    if (location.pathname === '/preferences') {
      document.getElementById('preferences')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.pathname]);

  const saveName = async (e) => {
    e.preventDefault();
    setSavingName(true);
    const result = await updateProfile(name.trim());
    setSavingName(false);
    setNameMessage(result.success ? { ok: true, text: 'Name updated.' } : { ok: false, text: result.error });
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwords.next !== passwords.confirm) {
      setPasswordMessage({ ok: false, text: 'New passwords do not match.' });
      return;
    }
    setSavingPassword(true);
    try {
      await apiRequest('/me/password', {
        method: 'POST',
        body: JSON.stringify({ current_password: passwords.current, new_password: passwords.next })
      });
      setPasswords({ current: '', next: '', confirm: '' });
      setPasswordMessage({ ok: true, text: 'Password changed. Use the new password next time you log in.' });
    } catch (err) {
      setPasswordMessage({ ok: false, text: err.message });
    } finally {
      setSavingPassword(false);
    }
  };

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      // storage unavailable; theme applies for this session only
    }
  };

  const resetNotifications = () => {
    try {
      localStorage.removeItem('seenNotifications');
    } catch {
      // ignore
    }
    navigate('/dashboard');
  };

  const deleteAccount = async (e) => {
    e.preventDefault();
    if (!window.confirm('Permanently delete your account and all your data? This cannot be undone.')) return;
    try {
      await apiRequest('/me', { method: 'DELETE', body: JSON.stringify({ password: deletePassword }) });
      logout();
      navigate('/signup', { replace: true });
    } catch (err) {
      setDeleteMessage({ ok: false, text: err.message });
    }
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

  return (
    <FeatureViewer title="Profile & Preferences">
      <div className="max-w-2xl mx-auto space-y-6">
        <Section id="profile" title="Profile" description="How your name appears in the app. Community posts can still be anonymous.">
          <form onSubmit={saveName} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input value={user?.email || ''} disabled className={`${inputClass} bg-gray-50 text-gray-500`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} className={inputClass} />
            </div>
            <button
              type="submit"
              disabled={savingName || !name.trim() || name.trim() === user?.name}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-2 rounded-lg font-medium"
            >
              {savingName ? 'Saving...' : 'Save name'}
            </button>
          </form>
          <Message message={nameMessage} />
        </Section>

        <Section id="password" title="Change password">
          <form onSubmit={changePassword} className="space-y-3">
            <input type="password" placeholder="Current password" value={passwords.current} required
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} className={inputClass} />
            <input type="password" placeholder="New password (min. 6 characters)" value={passwords.next} required minLength={6}
              onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} className={inputClass} />
            <input type="password" placeholder="Confirm new password" value={passwords.confirm} required minLength={6}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} className={inputClass} />
            <button type="submit" disabled={savingPassword} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-2 rounded-lg font-medium">
              {savingPassword ? 'Updating...' : 'Change password'}
            </button>
          </form>
          <Message message={passwordMessage} />
        </Section>

        <Section id="preferences" title="Preferences">
          <div className="space-y-4">
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <span className="font-medium text-gray-700">Dark mode</span>
                <p className="text-sm text-gray-500">Easier on the eyes at night</p>
              </div>
              <input type="checkbox" className="h-5 w-5" checked={isDarkMode} onChange={toggleTheme} />
            </label>
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="font-medium text-gray-700">Notifications</span>
                <p className="text-sm text-gray-500">Mark all notifications as unread again</p>
              </div>
              <button onClick={resetNotifications} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                Reset
              </button>
            </div>
          </div>
        </Section>

        <Section id="delete" title="Delete account" description="Permanently removes your account, mood entries, check-ins, bookings, chats and community posts.">
          <form onSubmit={deleteAccount} className="flex flex-col sm:flex-row gap-3">
            <input type="password" placeholder="Enter your password to confirm" value={deletePassword} required
              onChange={(e) => setDeletePassword(e.target.value)} className={inputClass} />
            <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg font-medium whitespace-nowrap">
              Delete my account
            </button>
          </form>
          <Message message={deleteMessage} />
        </Section>
      </div>
    </FeatureViewer>
  );
};

export default ProfilePage;
