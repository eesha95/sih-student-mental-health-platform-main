// components/AppShell.jsx - MindCare layout: purple sidebar + top bar around every signed-in page
import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Smile, Bot, ClipboardCheck, CalendarCheck, Users, BookOpen, Stethoscope,
  LifeBuoy, Settings, LogOut, Bell, Search, ChevronDown, Menu, X, ChartColumn, ShieldCheck,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { resourceCategories } from '../data/resources';
import { Brand, LotusLogo } from './ui/Brand';

const SEEN_KEY = 'seenNotifications';

const readSeen = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
  } catch {
    return new Set();
  }
};

const timeAgo = (iso) => {
  const diff = (Date.now() - new Date(iso.endsWith('Z') ? iso : iso + 'Z').getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return `${Math.floor(diff / 86400)} d ago`;
};

const STUDENT_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/mood-dashboard', label: 'Mood Tracker', icon: Smile },
  { to: '/ai-chat', label: 'AI Chat', icon: Bot },
  { to: '/wellness-check', label: 'Wellness Check', icon: ClipboardCheck },
  { to: '/booking', label: 'Book Counsellor', icon: CalendarCheck },
  { to: '/peer-support', label: 'Community', icon: Users },
  { to: '/resources', label: 'Resources', icon: BookOpen },
  { to: '/find-doctor', label: 'Find a Doctor', icon: Stethoscope },
  { to: '/crisis-help', label: 'Support & Helpline', icon: LifeBuoy },
  { to: '/profile', label: 'Settings', icon: Settings },
];

const ADMIN_NAV = [
  { to: '/admin-dashboard', tab: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin-dashboard?tab=users', tab: 'users', label: 'Users', icon: Users },
  { to: '/admin-dashboard?tab=bookings', tab: 'bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/admin-dashboard?tab=analytics', tab: 'analytics', label: 'Analytics', icon: ChartColumn },
  { to: '/admin-dashboard?tab=moderation', tab: 'moderation', label: 'Crisis & Moderation', icon: ShieldCheck },
  { to: '/admin-dashboard?tab=settings', tab: 'settings', label: 'Settings', icon: Settings },
];

// Everything the top-bar search can find: app features plus the resource library
const SEARCH_INDEX = [
  { label: 'AI Support Chat', keywords: 'ai chat talk counselor bot support', route: '/ai-chat', icon: Bot },
  { label: 'Mood Tracker & Recommendations', keywords: 'mood tracker stress sleep recommendations trends', route: '/mood-dashboard', icon: Smile },
  { label: 'Book a Counseling Session', keywords: 'book appointment counselor counsellor therapist session', route: '/booking', icon: CalendarCheck },
  { label: 'Wellness Check-in', keywords: 'wellness check in assessment score', route: '/wellness-check', icon: ClipboardCheck },
  { label: 'Peer Support Community', keywords: 'peer community groups posts sessions support', route: '/peer-support', icon: Users },
  { label: 'Crisis Help', keywords: 'crisis emergency suicide helpline urgent help', route: '/crisis-help', icon: LifeBuoy },
  { label: 'Find a Professional', keywords: 'doctor psychiatrist psychologist clinic near nearby', route: '/find-doctor', icon: Stethoscope },
  { label: 'Resource Library', keywords: 'resources articles videos tools', route: '/resources', icon: BookOpen },
  ...Object.entries(resourceCategories).flatMap(([category, items]) =>
    items.map((r) => ({
      label: r.title,
      keywords: `${r.description} ${r.category || ''} ${category}`.toLowerCase(),
      route: r.route || (category === 'crisis' ? '/crisis-help' : null),
      url: r.url,
      icon: category === 'crisis' ? LifeBuoy : BookOpen,
    }))
  ),
];

const searchItems = (query) => {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return SEARCH_INDEX
    .map((item) => {
      const label = item.label.toLowerCase();
      const haystack = `${label} ${item.keywords}`;
      const score = terms.reduce((acc, t) => acc + (haystack.includes(t) ? 1 : 0) + (label.includes(t) ? 1 : 0), 0);
      return { item, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((x) => x.item);
};

const useClickOutside = (ref, onOutside) => {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onOutside]);
};

const Sidebar = ({ items, onNavigate, onLogout, activeTab, isAdminNav }) => (
  <div className="mc-sidebar relative flex h-full flex-col overflow-hidden text-white">
    <div className="px-5 pt-7 pb-6">
      <Brand tagline={isAdminNav ? 'Heal · Support · Grow' : 'Your Mental Wellness Companion'} />
    </div>
    <nav className="mc-scroll flex-1 space-y-1 overflow-y-auto px-3">
      {items.map(({ to, tab, label, icon }) => {
        const Icon = icon;
        return (
        <NavLink
          key={to}
          to={to}
          end
          onClick={onNavigate}
          className={({ isActive }) => {
            const active = isAdminNav ? tab === activeTab : isActive;
            return `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors ${
              active
                ? 'bg-white/95 font-semibold text-brand-800 shadow-sm'
                : 'text-brand-100 hover:bg-white/10 hover:text-white'
            }`;
          }}
        >
          <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
          <span>{label}</span>
        </NavLink>
        );
      })}
    </nav>
    <div className="relative z-10 border-t border-white/10 px-3 py-4">
      <button
        onClick={onLogout}
        className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-brand-100 transition-colors hover:bg-white/10 hover:text-white"
      >
        <LogOut className="h-[18px] w-[18px]" />
        Logout
      </button>
    </div>
    {/* faint lotus watermark like the reference */}
    <LotusLogo className="pointer-events-none absolute -bottom-6 -left-6 h-36 w-44 opacity-10" />
  </div>
);

const AppShell = ({ children }) => {
  const { user, admin, logout, apiRequest } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const searchRef = useRef(null);

  const [rawNotifications, setRawNotifications] = useState([]);
  const [seenIds, setSeenIds] = useState(readSeen);
  const notifications = rawNotifications.map((n) => ({ ...n, unread: !seenIds.has(n.id) }));
  const unreadCount = notifications.filter((n) => n.unread).length;

  const isAdminNav = Boolean(admin);
  const navItems = isAdminNav ? ADMIN_NAV : STUDENT_NAV;
  const activeTab = new URLSearchParams(location.search).get('tab') || 'overview';
  const person = user || admin;
  const displayName = person?.name || person?.email?.split('@')[0] || (admin ? 'Admin' : 'Friend');

  // The redesign is light-only; clear any dark class left by the old theme toggle
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  // Notifications come from the backend; read state is remembered per browser
  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    const load = () =>
      apiRequest('/api/notifications')
        .then((data) => active && setRawNotifications(data))
        .catch((err) => console.error('Failed to load notifications:', err));
    load();
    const interval = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, location.pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  const markAllRead = () => {
    const next = new Set([...seenIds, ...rawNotifications.map((n) => n.id)]);
    setSeenIds(next);
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify([...next].slice(-200)));
    } catch {
      // storage unavailable; read state just won't persist
    }
  };

  const closeNotif = React.useCallback(() => setNotifOpen((open) => {
    if (open) markAllRead();
    return false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [rawNotifications, seenIds]);
  const closeProfile = React.useCallback(() => setProfileOpen(false), []);
  const closeSearch = React.useCallback(() => setShowResults(false), []);
  useClickOutside(notifRef, closeNotif);
  useClickOutside(profileRef, closeProfile);
  useClickOutside(searchRef, closeSearch);

  const openNotification = (n) => {
    markAllRead();
    setNotifOpen(false);
    if (n.link) navigate(n.link);
  };

  const handleLogout = () => {
    logout();
    navigate(admin ? '/admin-login' : '/login');
  };

  const updateSearch = (value) => {
    setQuery(value);
    setResults(searchItems(value));
    setShowResults(value.trim().length > 0);
  };

  const openResult = (item) => {
    if (item.route) navigate(item.route);
    else if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
    setShowResults(false);
    setQuery('');
  };

  const sidebar = (
    <Sidebar
      items={navItems}
      isAdminNav={isAdminNav}
      activeTab={activeTab}
      onNavigate={() => setMobileOpen(false)}
      onLogout={handleLogout}
    />
  );

  return (
    <div className="min-h-screen bg-[#f4f1fb]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-brand-950/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-white/80 hover:bg-white/10"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-brand-100/70 bg-[#f4f1fb]/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-xl p-2 text-brand-800 hover:bg-white lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div ref={searchRef} className="relative w-full max-w-md">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (results.length) openResult(results[0]);
                }}
                className="flex items-center gap-2 rounded-full border border-brand-100 bg-white px-4 py-2 shadow-sm focus-within:border-brand-300"
              >
                <Search className="h-4 w-4 shrink-0 text-brand-400" />
                <input
                  value={query}
                  onChange={(e) => updateSearch(e.target.value)}
                  onFocus={() => query && setShowResults(true)}
                  placeholder={isAdminNav ? 'Search users, resources...' : 'Search resources...'}
                  className="w-full bg-transparent text-sm text-brand-950 placeholder:text-brand-300 outline-none"
                />
              </form>
              {showResults && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-xl">
                  {results.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-brand-400">No matches. Try "anxiety", "sleep" or "book".</p>
                  ) : (
                    results.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => openResult(item)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-brand-950 hover:bg-brand-50"
                        >
                          <Icon className="h-4 w-4 text-brand-500" />
                          <span className="flex-1">{item.label}</span>
                          {!item.route && <ArrowUpRight className="h-3.5 w-3.5 text-brand-300" />}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              {user && (
                <div ref={notifRef} className="relative">
                  <button
                    onClick={() => (notifOpen ? closeNotif() : setNotifOpen(true))}
                    className="relative rounded-full p-2 text-brand-800 hover:bg-white"
                    aria-label="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  {notifOpen && (
                    <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-brand-100 bg-white p-4 shadow-xl">
                      <h3 className="mb-3 font-semibold text-brand-950">Notifications</h3>
                      <div className="max-h-96 space-y-2 overflow-y-auto">
                        {notifications.length === 0 && (
                          <p className="py-4 text-center text-sm text-brand-400">You're all caught up 🌱</p>
                        )}
                        {notifications.map((n) => (
                          <button
                            key={n.id}
                            onClick={() => openNotification(n)}
                            className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors ${
                              n.unread ? 'bg-brand-50 hover:bg-brand-100' : 'hover:bg-brand-50'
                            }`}
                          >
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" style={{ opacity: n.unread ? 1 : 0 }} />
                            <span className="flex-1">
                              <span className="block text-sm text-brand-950">{n.message}</span>
                              <span className="mt-0.5 block text-xs text-brand-400">{timeAgo(n.created_at)}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div ref={profileRef} className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-white"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden text-sm font-medium text-brand-950 sm:block">
                    {admin ? `Hello, ${displayName}` : displayName}
                  </span>
                  <ChevronDown className="h-4 w-4 text-brand-400" />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-12 z-50 w-60 rounded-2xl border border-brand-100 bg-white p-2 shadow-xl">
                    <div className="border-b border-brand-50 px-3 py-2.5">
                      <div className="text-sm font-semibold text-brand-950">{displayName}</div>
                      <div className="truncate text-xs text-brand-400">{person?.email}</div>
                    </div>
                    {user && (
                      <Link
                        to="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-brand-900 hover:bg-brand-50"
                      >
                        <Settings className="h-4 w-4" /> Profile & Preferences
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut className="h-4 w-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
};

export default AppShell;
