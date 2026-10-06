import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import FeatureViewer from '../FeatureViewer';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

// Ordered worst → best so the palette reads red → green in every chart
const CHART_COLORS = {
  overall: ['#DC2626', '#F97316', '#EAB308', '#16A34A'],
  mood: ['#DC2626', '#EAB308', '#16A34A'],
  anxiety: ['#DC2626', '#F97316', '#16A34A'],
  stress: ['#DC2626', '#F97316', '#16A34A']
};

const BOOKING_STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-200 text-gray-600',
  completed: 'bg-blue-100 text-blue-800'
};

const RISK_STYLES = {
  CRITICAL: 'bg-red-600 text-white',
  HIGH: 'bg-orange-500 text-white',
  MODERATE: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-gray-100 text-gray-700'
};

const toDate = (value) => (value ? new Date(value.endsWith('Z') ? value : value + 'Z') : null);

const formatAgo = (value) => {
  const date = toDate(value);
  if (!date) return 'Never';
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
};

// Full class names so Tailwind can see them at build time
const TONE_CLASSES = {
  blue: ['bg-blue-50 border-blue-200', 'text-blue-600', 'text-blue-800'],
  green: ['bg-green-50 border-green-200', 'text-green-600', 'text-green-800'],
  yellow: ['bg-yellow-50 border-yellow-200', 'text-yellow-600', 'text-yellow-800'],
  red: ['bg-red-50 border-red-200', 'text-red-600', 'text-red-800'],
  purple: ['bg-purple-50 border-purple-200', 'text-purple-600', 'text-purple-800']
};

const maskEmails = (text) => (text || '').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '••••@••••');

const DistributionChart = ({ title, data, colors }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h4 className="font-semibold text-gray-800 mb-4 text-center">{title}</h4>
      {total === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-gray-500 text-center px-6">
          No check-in data yet. This fills in as students complete wellness check-ins or mood entries.
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" nameKey="name" paddingAngle={2}>
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} student${value === 1 ? '' : 's'} (${Math.round((value / total) * 100)}%)`, name]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="mt-4 space-y-2">
        {data.map((entry, index) => (
          <div key={entry.name} className="flex items-center text-sm">
            <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: colors[index % colors.length] }}></div>
            <span className="flex-1">{entry.name}</span>
            <span className="font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminDashboardFeature = () => {
  const { adminActions, getAdminDashboardData, isAdmin, apiRequest, token } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [dashboardData, setDashboardData] = useState(null);
  const [health, setHealth] = useState(null);
  const [settings, setSettings] = useState({ crisis_alerts: true, privacy_protection: true, maintenance_mode: false });
  const [safetyAlerts, setSafetyAlerts] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [bookingFilter, setBookingFilter] = useState('pending');
  const [flaggedPosts, setFlaggedPosts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activities, setActivities] = useState([]);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [activityFilter, setActivityFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('24h');
  const [exporting, setExporting] = useState(false);

  const privacy = settings.privacy_protection;

  const flash = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(''), 3500);
  };

  const safely = async (fn) => {
    try {
      return await fn();
    } catch (err) {
      setError(err.message || 'Something went wrong');
      return null;
    }
  };

  const loadOverview = async () => {
    setLoading(true);
    const result = await getAdminDashboardData();
    if (result.success) {
      setDashboardData(result.data);
    } else {
      setError(result.error || 'Failed to load dashboard data');
    }
    await safely(async () => {
      const [currentSettings, alerts] = await Promise.all([
        apiRequest('/admin/settings'),
        apiRequest('/admin/safety-alerts?days=7')
      ]);
      setSettings(currentSettings);
      setSafetyAlerts(alerts);
    });
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      setHealth(await res.json());
    } catch {
      setHealth({ status: 'unreachable' });
    }
    setLoading(false);
  };

  const loadUsers = async () => {
    const result = await adminActions.getAllUsers(sortBy, sortOrder);
    if (result.success) setUsers(result.data);
    else setError(result.error || 'Failed to load users');
  };

  const loadBookings = () => safely(async () => setBookings(await apiRequest(`/admin/bookings?status_filter=${bookingFilter}`)));
  const loadFlaggedPosts = () => safely(async () => setFlaggedPosts(await apiRequest('/admin/peer/posts')));
  const loadAnalytics = async () => {
    await safely(async () => setAnalytics(await apiRequest('/admin/analytics')));
    const result = await adminActions.getActivities(activityFilter, timeRange);
    if (result.success) setActivities(result.data);
    else setError(result.error || 'Failed to load activities');
  };

  useEffect(() => {
    if (isAdmin()) loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAdmin()) return;
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'bookings') loadBookings();
    if (activeTab === 'moderation') loadFlaggedPosts();
    if (activeTab === 'analytics') loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, sortBy, sortOrder, bookingFilter, activityFilter, timeRange]);

  // --- User management ---
  const handleActivateUser = async (userId) => {
    const result = await adminActions.activateUser(userId);
    if (result.success) loadUsers();
    else setError('Failed to activate user: ' + result.error);
  };

  const handleDeactivateUser = async (userId) => {
    if (!window.confirm('Deactivate this user? They will not be able to log in.')) return;
    const result = await adminActions.deactivateUser(userId);
    if (result.success) loadUsers();
    else setError('Failed to deactivate user: ' + result.error);
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user and ALL their data (moods, check-ins, bookings, posts)? This cannot be undone.')) return;
    const result = await adminActions.deleteUser(userId);
    if (result.success) {
      setSelectedUser(null);
      loadUsers();
      flash('User and their data were deleted.');
    } else {
      setError('Failed to delete user: ' + result.error);
    }
  };

  const handleViewUser = async (userId) => {
    const result = await adminActions.getUserDetails(userId);
    if (result.success) setSelectedUser(result.data);
    else setError(result.error);
  };

  // --- Bookings ---
  const updateBookingStatus = async (bookingId, status) => {
    const updated = await safely(() => apiRequest(`/admin/bookings/${bookingId}`, { method: 'PATCH', body: JSON.stringify({ status }) }));
    if (updated) {
      flash(`Booking ${updated.reference} marked ${status}.`);
      loadBookings();
    }
  };

  // --- Moderation ---
  const moderatePost = async (postId, action) => {
    if (action === 'delete' && !window.confirm('Permanently delete this post?')) return;
    if (await safely(() => apiRequest(`/admin/peer/posts/${postId}/${action}`, { method: 'POST' }))) {
      loadFlaggedPosts();
    }
  };

  // --- Settings ---
  const updateSetting = async (key, value) => {
    const updated = await safely(() => apiRequest('/admin/settings', { method: 'PUT', body: JSON.stringify({ [key]: value }) }));
    if (updated) {
      setSettings(updated);
      flash('Settings saved.');
    }
  };

  const exportData = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/export`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = new Blob([JSON.stringify(await res.json(), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mental-health-platform-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      flash('Export downloaded.');
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  if (!isAdmin()) {
    return (
      <FeatureViewer title="Admin Dashboard">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">You need admin privileges to access this dashboard.</p>
        </div>
      </FeatureViewer>
    );
  }

  if (loading && activeTab === 'overview') {
    return (
      <FeatureViewer title="Admin Dashboard">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </FeatureViewer>
    );
  }

  const urgentAlerts = safetyAlerts.filter((a) => a.risk_level === 'CRITICAL' || a.risk_level === 'HIGH');

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'users', name: 'Users', icon: '👥' },
    { id: 'bookings', name: 'Bookings', icon: '📅', badge: dashboardData?.pending_bookings },
    { id: 'moderation', name: 'Moderation', icon: '🛡️', badge: dashboardData?.posts_needing_review },
    { id: 'analytics', name: 'Analytics', icon: '📈' },
    { id: 'settings', name: 'Settings', icon: '⚙️' }
  ];

  return (
    <FeatureViewer title="Admin Dashboard">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage users, bookings and community safety, and see anonymous wellbeing trends</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-4 font-medium">Dismiss</button>
        </div>
      )}
      {notice && <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">{notice}</div>}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <nav className="-mb-px flex space-x-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
              {tab.badge > 0 && <span className="ml-2 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs">{tab.badge}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && dashboardData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Students', value: dashboardData.total_users, tone: 'blue' },
              { label: 'Active Students', value: dashboardData.active_users, tone: 'green' },
              { label: 'Pending Bookings', value: dashboardData.pending_bookings, tone: 'yellow', tab: 'bookings' },
              { label: 'Safety Alerts (7 days)', value: dashboardData.safety_alerts_7d, tone: 'red' },
              { label: 'Wellness Check-ins', value: dashboardData.wellness_checks, tone: 'purple', tab: 'analytics' },
              { label: 'Total Bookings', value: dashboardData.total_bookings, tone: 'blue', tab: 'bookings' },
              { label: 'Community Posts', value: dashboardData.total_posts, tone: 'green' },
              { label: 'Posts Needing Review', value: dashboardData.posts_needing_review, tone: 'yellow', tab: 'moderation' }
            ].map((stat) => (
              <button
                key={stat.label}
                onClick={() => stat.tab && setActiveTab(stat.tab)}
                className={`text-left p-5 rounded-lg border ${TONE_CLASSES[stat.tone][0]} ${stat.tab ? 'hover:shadow-md cursor-pointer' : 'cursor-default'}`}
              >
                <h3 className={`text-2xl font-bold ${TONE_CLASSES[stat.tone][1]}`}>{stat.value}</h3>
                <p className={`text-sm ${TONE_CLASSES[stat.tone][2]}`}>{stat.label}</p>
              </button>
            ))}
          </div>

          {/* Crisis alerts */}
          {settings.crisis_alerts && (
            <div className={`border rounded-lg p-6 ${urgentAlerts.length ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">🚨 Crisis Alerts (last 7 days)</h3>
              <p className="text-sm text-gray-600 mb-4">
                Messages and posts flagged as high or critical risk by the safety screen. Students were shown helpline numbers automatically.
              </p>
              {urgentAlerts.length === 0 ? (
                <p className="text-sm text-green-700">No high-risk messages in the last 7 days.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {urgentAlerts.map((alert) => (
                    <div key={alert.id} className="bg-white border border-red-200 rounded-lg p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${RISK_STYLES[alert.risk_level]}`}>{alert.risk_level}</span>
                        <span className="font-medium text-gray-800">{alert.student}</span>
                        <span className="text-gray-500">· {formatAgo(alert.created_at)}</span>
                      </div>
                      <p className="text-gray-700 italic">"{alert.message_snippet}"</p>
                      <p className="text-xs text-gray-500 mt-1">Flagged: {alert.flagged_keywords.join(', ')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* System Health */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">System Status</h3>
            <div className="flex flex-wrap items-center gap-6">
              {[
                { label: 'API', ok: health?.status === 'healthy' },
                { label: 'Database', ok: health?.status === 'healthy' },
                { label: 'Maintenance mode', ok: !settings.maintenance_mode, okText: 'Off', badText: 'On' }
              ].map((item) => (
                <div key={item.label} className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${item.ok ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className={`font-medium ${item.ok ? 'text-green-700' : 'text-red-700'}`}>
                    {item.label}: {item.ok ? item.okText || 'Online' : item.badText || 'Unavailable'}
                  </span>
                </div>
              ))}
            </div>
            <button onClick={loadOverview} className="mt-4 text-sm text-blue-600 hover:text-blue-800">↻ Refresh</button>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold text-gray-800">User Management</h3>
            <div className="flex space-x-2">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border border-gray-300 rounded px-3 py-1 text-sm">
                <option value="created_at">Sort by Created</option>
                <option value="name">Sort by Name</option>
                <option value="email">Sort by Email</option>
                <option value="last_login">Sort by Last Login</option>
              </select>
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="border border-gray-300 rounded px-3 py-1 text-sm">
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>

          {privacy && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center">
              <div className="text-blue-600 mr-3">🔒</div>
              <div>
                <h4 className="font-medium text-blue-800">Privacy Protection Enabled</h4>
                <p className="text-blue-700 text-sm">Names and email addresses are masked. Turn this off in Settings only if you need to contact a student.</p>
              </div>
            </div>
          )}

          {selectedUser && (
            <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-gray-800">
                    {privacy ? selectedUser.user.anonymous_id : `${selectedUser.user.name} · ${selectedUser.user.email}`}
                  </h4>
                  <p className="text-sm text-gray-600">Joined {formatAgo(selectedUser.user.created_at)}</p>
                </div>
                <button onClick={() => setSelectedUser(null)} className="text-sm text-gray-500 hover:text-gray-800">Close</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3 text-sm">
                {[
                  ['Mood entries', selectedUser.mood_entries],
                  ['Wellness check-ins', selectedUser.wellness_checks],
                  ['Bookings', selectedUser.bookings],
                  ['Chat messages', selectedUser.chat_messages],
                  ['Community posts', selectedUser.peer_posts]
                ].map(([label, value]) => (
                  <div key={label} className="bg-white rounded p-2 border">
                    <div className="text-lg font-bold text-gray-800">{value}</div>
                    <div className="text-xs text-gray-600">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{privacy ? 'Anonymous ID' : 'Student'}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{privacy ? user.anonymous_id : user.name}</div>
                        <div className="text-sm text-gray-500">{privacy ? user.email.replace(/(.{2}).*@/, '$1••••@') : user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatAgo(user.created_at)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatAgo(user.last_login)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                        <button onClick={() => handleViewUser(user.id)} className="text-blue-600 hover:text-blue-900">View</button>
                        {user.is_active ? (
                          <button onClick={() => handleDeactivateUser(user.id)} className="text-orange-600 hover:text-orange-900">Deactivate</button>
                        ) : (
                          <button onClick={() => handleActivateUser(user.id)} className="text-green-600 hover:text-green-900">Activate</button>
                        )}
                        <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-900">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && <div className="text-center py-8 text-gray-500">No users found</div>}
            </div>
          </div>
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div>
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Counselling Requests</h3>
              <p className="text-sm text-gray-600">Call the student to confirm, then mark the booking confirmed. High urgency requests are listed first.</p>
            </div>
            <select value={bookingFilter} onChange={(e) => setBookingFilter(e.target.value)} className="border border-gray-300 rounded px-3 py-1 text-sm">
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="all">All</option>
            </select>
          </div>
          <div className="space-y-3">
            {bookings.length === 0 && <p className="text-center text-gray-500 py-8">No {bookingFilter === 'all' ? '' : bookingFilter} bookings.</p>}
            {bookings.map((b) => (
              <div key={b.id} className={`border rounded-lg p-4 bg-white ${b.urgency === 'high' && b.status === 'pending' ? 'border-red-300' : 'border-gray-200'}`}>
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800">{b.date} · {b.time_slot}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${BOOKING_STATUS_STYLES[b.status]}`}>{b.status}</span>
                      {b.urgency === 'high' && <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800">high urgency</span>}
                      <span className="text-xs text-gray-500">{b.reference}</span>
                    </div>
                    <p className="text-sm text-gray-700">With <strong>{b.counselor_name}</strong> · Reason: {b.reason}</p>
                    <p className="text-sm text-gray-700">
                      Contact: {b.contact_name} · <a className="text-blue-600 underline" href={`tel:${b.contact_phone}`}>{b.contact_phone}</a> · {b.contact_email}
                    </p>
                    {b.notes && <p className="text-sm text-gray-600 mt-1">Notes: {b.notes}</p>}
                    <p className="text-xs text-gray-500 mt-1">Requested {formatAgo(b.created_at)}</p>
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    {b.status === 'pending' && (
                      <button onClick={() => updateBookingStatus(b.id, 'confirmed')} className="px-3 py-1.5 rounded bg-green-600 hover:bg-green-700 text-white text-sm">Confirm</button>
                    )}
                    {b.status === 'confirmed' && (
                      <button onClick={() => updateBookingStatus(b.id, 'completed')} className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm">Mark completed</button>
                    )}
                    {(b.status === 'pending' || b.status === 'confirmed') && (
                      <button onClick={() => window.confirm('Cancel this booking?') && updateBookingStatus(b.id, 'cancelled')} className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm">Cancel</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Moderation Tab */}
      {activeTab === 'moderation' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Community Moderation</h3>
          <p className="text-sm text-gray-600 mb-4">
            Posts held by the safety screen, hidden after {3} reports, or reported by students. Restoring a post clears its reports.
          </p>
          <div className="space-y-3">
            {flaggedPosts.length === 0 && <p className="text-center text-gray-500 py-8">Nothing needs review right now. 🎉</p>}
            {flaggedPosts.map((post) => (
              <div key={post.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex flex-wrap items-center gap-2 mb-2 text-sm">
                  <span className="font-medium text-gray-800">{post.author}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${RISK_STYLES[post.risk_level] || RISK_STYLES.LOW}`}>{post.risk_level}</span>
                  {post.is_hidden ? (
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-700">
                      hidden · {post.hidden_reason === 'safety_review' ? 'safety screen' : post.hidden_reason}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">visible</span>
                  )}
                  {post.reports > 0 && <span className="text-xs text-red-700">{post.reports} report{post.reports === 1 ? '' : 's'}</span>}
                  <span className="text-gray-500">· {formatAgo(post.created_at)}</span>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap mb-3">{post.content}</p>
                {post.hidden_reason === 'safety_review' && (
                  <p className="text-xs text-red-700 mb-3">This student may be at risk — consider reaching out through the counselling team.</p>
                )}
                <div className="flex gap-2">
                  {post.is_hidden ? (
                    <button onClick={() => moderatePost(post.id, 'restore')} className="px-3 py-1.5 rounded bg-green-600 hover:bg-green-700 text-white text-sm">Restore</button>
                  ) : (
                    <button onClick={() => moderatePost(post.id, 'hide')} className="px-3 py-1.5 rounded bg-orange-500 hover:bg-orange-600 text-white text-sm">Hide</button>
                  )}
                  <button onClick={() => moderatePost(post.id, 'delete')} className="px-3 py-1.5 rounded border border-red-300 text-red-700 hover:bg-red-50 text-sm">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Student Wellbeing (anonymous)</h3>
            <p className="text-sm text-gray-600">
              Based on each student's most recent self-reported check-in
              {analytics ? ` — ${analytics.respondents} student${analytics.respondents === 1 ? '' : 's'} so far` : ''}.
              These are self-reports, not clinical diagnoses.
            </p>
          </div>

          {analytics && (
            <>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Average wellness score, last 14 days</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value, name, item) => [`${value} (${item.payload.checkins} check-ins)`, 'Avg score']} />
                      <Line type="monotone" dataKey="avg_score" stroke="#2563EB" strokeWidth={2} connectNulls dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DistributionChart title="Overall Wellbeing" data={analytics.overall} colors={CHART_COLORS.overall} />
                <DistributionChart title="Mood" data={analytics.mood} colors={CHART_COLORS.mood} />
                <DistributionChart title="Anxiety (from wellness check-ins)" data={analytics.anxiety} colors={CHART_COLORS.anxiety} />
                <DistributionChart title="Stress" data={analytics.stress} colors={CHART_COLORS.stress} />
              </div>
            </>
          )}

          {/* Recent Activities */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap justify-between items-center gap-2">
              <h4 className="font-semibold text-gray-800">Recent Activity</h4>
              <div className="flex space-x-2">
                <select value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)} className="border border-gray-300 rounded px-3 py-1 text-sm">
                  <option value="all">All Activities</option>
                  <option value="login">Logins</option>
                  <option value="security">Admin & Security</option>
                  <option value="profile">Sign-ups & Profiles</option>
                </select>
                <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="border border-gray-300 rounded px-3 py-1 text-sm">
                  <option value="1h">Last Hour</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {activities.map(activity => (
                <div key={activity.id} className="px-6 py-4 border-b border-gray-100 last:border-b-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {privacy ? maskEmails(activity.description) : activity.description}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {activity.type.startsWith('admin') ? 'Admin' : privacy ? activity.anonymous_id : activity.user_name || 'System'} · {activity.type}
                        {activity.ip_address && ` · IP ${activity.ip_address.replace(/\.\d+$/, '.***')}`}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 whitespace-nowrap ml-4">{formatAgo(activity.timestamp)}</div>
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-500">No activities found for the selected filters</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-800">System Settings</h3>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-800 mb-4">System Configuration</h4>
            <div className="space-y-5">
              {[
                { key: 'crisis_alerts', label: 'Crisis Alerts', help: 'Show high-risk chat messages and posts on the Overview tab' },
                { key: 'privacy_protection', label: 'Privacy Protection', help: 'Mask student names and emails in admin views, alerts and exports' },
                { key: 'maintenance_mode', label: 'Maintenance Mode', help: 'Block student logins and sign-ups (they are shown helpline numbers instead)' }
              ].map((setting) => (
                <label key={setting.key} className="flex items-center justify-between gap-4 cursor-pointer">
                  <div>
                    <span className="font-medium text-gray-700">{setting.label}</span>
                    <p className="text-sm text-gray-500">{setting.help}</p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded text-blue-600"
                    checked={!!settings[setting.key]}
                    onChange={(e) => {
                      if (setting.key === 'maintenance_mode' && e.target.checked && !window.confirm('Students will not be able to log in. Continue?')) return;
                      updateSetting(setting.key, e.target.checked);
                    }}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2">System Information</h4>
            <div className="text-sm text-yellow-700 space-y-1">
              <p>Backend URL: {API_BASE_URL}</p>
              <p>API status: {health?.status || 'unknown'}</p>
              <p>Privacy Mode: {privacy ? 'Enabled' : 'Disabled'}</p>
              <p>Last checked: {new Date().toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-800 mb-2">Data Export</h4>
            <p className="text-red-700 text-sm mb-3">
              Downloads all platform data as JSON. Passwords and chat transcripts are never included;
              {privacy ? ' identities are pseudonymised because privacy protection is on.' : ' privacy protection is OFF, so names, emails and booking contacts are included.'}
            </p>
            <button
              onClick={exportData}
              disabled={exporting}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-4 py-2 rounded font-medium"
            >
              {exporting ? 'Exporting...' : 'Export All Data'}
            </button>
          </div>
        </div>
      )}
    </FeatureViewer>
  );
};

export default AdminDashboardFeature;
