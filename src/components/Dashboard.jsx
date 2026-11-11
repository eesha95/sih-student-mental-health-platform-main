// components/Dashboard.jsx - MindCare student dashboard
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  ArrowRight, Heart, Smile, Bot, BookOpen, Headphones, Brain, Sprout, CirclePlay, Phone,
  Users, Siren, Flame, Quote, CalendarCheck, ClipboardCheck,
} from "lucide-react";
import AppShell from "./AppShell";
import { useAuth } from "../context/AuthContext";
import { crisisHelplines } from "../data/resources";
import { LavenderSprig } from "./ui/Brand";

const MOODS = [
  { score: 1, emoji: "😢", label: "Sad" },
  { score: 2, emoji: "😟", label: "Low" },
  { score: 3, emoji: "🙂", label: "Okay" },
  { score: 4, emoji: "😊", label: "Good" },
  { score: 5, emoji: "😄", label: "Great" },
];

const toDate = (iso) => new Date(iso.endsWith("Z") ? iso : iso + "Z");
const dayKey = (d) => d.toDateString();

// Average mood (1–5) for each of the last 7 days
const buildWeek = (records) => {
  const byDay = {};
  records.forEach((r) => {
    const key = dayKey(toDate(r.created_at));
    (byDay[key] ||= []).push(r.mood_score);
  });
  return [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const scores = byDay[dayKey(d)] || [];
    return {
      day: d.toLocaleDateString(undefined, { weekday: "short" }),
      mood: scores.length ? +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null,
    };
  });
};

// Consecutive days, ending today or yesterday, with at least one mood entry
const computeStreak = (records) => {
  const days = new Set(records.map((r) => dayKey(toDate(r.created_at))));
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(d))) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
};

const ScoreRing = ({ percent }) => {
  const r = 46;
  const c = 2 * Math.PI * r;
  const value = percent == null ? 0 : Math.max(0, Math.min(100, percent));
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 110 110" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8b6ad6" />
            <stop offset="1" stopColor="#34c3a6" />
          </linearGradient>
        </defs>
        <circle cx="55" cy="55" r={r} fill="none" stroke="#efe9fc" strokeWidth="10" />
        <circle
          cx="55" cy="55" r={r} fill="none" stroke="url(#ring)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (value / 100) * c}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-brand-950">{percent == null ? "—" : `${Math.round(percent)}%`}</span>
        <span className="text-[11px] text-brand-500">Wellness Score</span>
      </div>
    </div>
  );
};

const SectionTitle = ({ title, subtitle, action }) => (
  <div className="mb-4 flex items-start justify-between gap-3">
    <div>
      <h2 className="text-base font-semibold text-brand-950">{title}</h2>
      {subtitle && <p className="text-xs text-brand-400">{subtitle}</p>}
    </div>
    {action}
  </div>
);

const QUICK_ACCESS = [
  { label: "Mood Tracker", route: "/mood-dashboard", icon: Smile, tone: "bg-brand-100 text-brand-700" },
  { label: "AI Chat", route: "/ai-chat", icon: Bot, tone: "bg-rose-100 text-rose-600" },
  { label: "Resources", route: "/resources", icon: BookOpen, tone: "bg-emerald-100 text-emerald-600" },
  { label: "Support", route: "/booking", icon: Headphones, tone: "bg-amber-100 text-amber-600" },
];

const RESOURCE_CARDS = [
  { title: "Mental Health Articles", text: "Learn about mental wellness and self-care.", cta: "Read More", route: "/resources", icon: Brain, bg: "from-rose-50 to-rose-100", iconTone: "text-rose-400", ctaTone: "text-rose-500" },
  { title: "Self-Care Tips", text: "Simple habits for a happier you.", cta: "Read More", route: "/mood-dashboard", icon: Sprout, bg: "from-brand-50 to-brand-100", iconTone: "text-brand-500", ctaTone: "text-brand-600" },
  { title: "Guided Meditation", text: "Relax your mind with calming meditation.", cta: "Listen Now", url: "https://www.youtube.com/results?search_query=10+minute+guided+meditation+for+beginners", icon: Headphones, bg: "from-emerald-50 to-emerald-100", iconTone: "text-emerald-500", ctaTone: "text-emerald-600" },
  { title: "Wellness Videos", text: "Expert advice and positive talks.", cta: "Watch Now", url: "https://www.youtube.com/results?search_query=guided+4-7-8+breathing+exercise", icon: CirclePlay, bg: "from-orange-50 to-amber-100", iconTone: "text-orange-500", ctaTone: "text-orange-600" },
];

const Dashboard = () => {
  const { user, admin, apiRequest, getDashboardData } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [todayMood, setTodayMood] = useState(null);
  const [moodRecords, setMoodRecords] = useState([]);

  useEffect(() => {
    if (!user) return;
    getDashboardData().then((result) => {
      if (!result.success) return;
      setStats(result.data.stats);
      const latest = result.data.latest_mood;
      if (latest && dayKey(toDate(latest.created_at)) === dayKey(new Date())) {
        setTodayMood(latest.mood_score);
      }
    });
    apiRequest("/api/mood/history")
      .then((data) => setMoodRecords(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to load mood history:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const week = useMemo(() => buildWeek(moodRecords), [moodRecords]);
  const streak = useMemo(() => computeStreak(moodRecords), [moodRecords]);
  const hasWeekData = week.some((d) => d.mood != null);
  const wellnessPercent = stats?.latest_wellness_score != null ? (stats.latest_wellness_score / 5) * 100 : null;

  const person = user || admin;
  const firstName = (person?.name || person?.email?.split("@")[0] || "there").split(" ")[0];

  const pickMood = (score) => navigate("/mood-dashboard", { state: { quickMoodScore: score } });
  const openCard = (card) =>
    card.route ? navigate(card.route) : window.open(card.url, "_blank", "noopener,noreferrer");

  const helpline = crisisHelplines.find((h) => h.id === "telemanas");
  const kiran = crisisHelplines.find((h) => h.id === "kiran");

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Row 1: greeting + today's mood */}
        <div className="grid gap-5 lg:grid-cols-5">
          <section className="mc-fade-up relative overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-[#efe7ff] via-[#e6dbfb] to-[#d9c9f6] p-6 sm:p-8 lg:col-span-3">
            <div className="relative z-10 max-w-sm">
              <h1 className="text-3xl font-semibold text-brand-950">Hello, {firstName}!</h1>
              <p className="mt-2 text-sm leading-relaxed text-brand-800">
                Take a deep breath.
                <br />
                You're doing great today. <Heart className="inline h-4 w-4 fill-brand-500 text-brand-500" />
              </p>
              <button
                onClick={() => navigate("/wellness-check")}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand-900/20 transition hover:bg-brand-800"
              >
                Check How You Feel <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <LavenderSprig className="pointer-events-none absolute -bottom-4 right-2 h-52 w-40 opacity-90 sm:right-10" />
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/30 blur-2xl" />
          </section>

          <section className="mc-card mc-fade-up p-6 lg:col-span-2" style={{ animationDelay: "60ms" }}>
            <SectionTitle title="Today's Mood" subtitle="How are you feeling today?" />
            <div className="grid grid-cols-5 gap-2">
              {MOODS.map((m) => {
                const selected = todayMood === m.score;
                return (
                  <button
                    key={m.score}
                    onClick={() => pickMood(m.score)}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 transition ${
                      selected
                        ? "border-brand-400 bg-brand-50 shadow-sm"
                        : "border-transparent hover:border-brand-100 hover:bg-brand-50/60"
                    }`}
                    aria-pressed={selected}
                  >
                    <span className="text-3xl leading-none">{m.emoji}</span>
                    <span className={`text-xs ${selected ? "font-semibold text-brand-700" : "text-brand-500"}`}>{m.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-brand-400">
              {todayMood ? "Logged for today — tap a mood to add another entry." : "Tap a mood to log it in your Mood Tracker."}
            </p>
          </section>
        </div>

        {/* Row 2: wellness overview + quick access */}
        <div className="grid gap-5 lg:grid-cols-5">
          <section className="mc-card mc-fade-up p-6 lg:col-span-3" style={{ animationDelay: "120ms" }}>
            <SectionTitle
              title="Your Wellness Overview"
              subtitle="Mood over the last 7 days"
              action={<span className="rounded-full border border-brand-100 px-3 py-1 text-xs text-brand-500">Last 7 Days</span>}
            />
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <div className="flex flex-col items-center">
                <ScoreRing percent={wellnessPercent} />
                {wellnessPercent == null && (
                  <button onClick={() => navigate("/wellness-check")} className="mt-2 text-xs font-medium text-brand-600 hover:underline">
                    Take a check-in
                  </button>
                )}
              </div>
              <div className="h-40 w-full flex-1">
                {hasWeekData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={week} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
                      <defs>
                        <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0" stopColor="#8b6ad6" stopOpacity={0.3} />
                          <stop offset="1" stopColor="#8b6ad6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#8b78b8" }} axisLine={false} tickLine={false} />
                      <YAxis domain={[1, 5]} ticks={[1, 3, 5]} tick={{ fontSize: 11, fill: "#b4a6d6" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(v) => [`${v} / 5`, "Mood"]}
                        contentStyle={{ borderRadius: 12, border: "1px solid #ece6fb", fontSize: 12 }}
                      />
                      <Area type="monotone" dataKey="mood" stroke="#7352c3" strokeWidth={2.5} fill="url(#moodFill)" connectNulls dot={{ r: 3.5, fill: "#fff", stroke: "#7352c3", strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center rounded-2xl bg-brand-50/70 text-center">
                    <p className="text-sm text-brand-700">No mood entries this week yet.</p>
                    <button onClick={() => navigate("/mood-dashboard")} className="mt-1 text-xs font-medium text-brand-600 hover:underline">
                      Log your first mood
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="mc-card mc-fade-up p-6 lg:col-span-2" style={{ animationDelay: "180ms" }}>
            <SectionTitle title="Quick Access" />
            <div className="grid grid-cols-4 gap-2">
              {QUICK_ACCESS.map(({ label, route, icon, tone }) => {
                const Icon = icon;
                return (
                <button
                  key={label}
                  onClick={() => navigate(route)}
                  className="group flex flex-col items-center gap-2 rounded-2xl border border-brand-50 bg-brand-50/40 px-1 py-4 transition hover:-translate-y-0.5 hover:border-brand-100 hover:bg-white hover:shadow-md"
                >
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-center text-xs font-medium text-brand-900">{label}</span>
                </button>
                );
              })}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-amber-50 px-2 py-3">
                <div className="flex items-center justify-center gap-1 text-lg font-semibold text-amber-700">
                  <Flame className="h-4 w-4 fill-amber-400 text-amber-500" />
                  {streak}
                </div>
                <div className="text-[11px] text-amber-700/80">Day streak</div>
              </div>
              <div className="rounded-2xl bg-brand-50 px-2 py-3">
                <div className="text-lg font-semibold text-brand-800">{stats ? stats.checkins_this_week : "–"}</div>
                <div className="text-[11px] text-brand-500">Check-ins this week</div>
              </div>
              <div className="rounded-2xl bg-emerald-50 px-2 py-3">
                <div className="text-lg font-semibold text-emerald-700">{stats ? stats.days_active_30d : "–"}</div>
                <div className="text-[11px] text-emerald-700/80">Active days (30d)</div>
              </div>
            </div>
          </section>
        </div>

        {/* Row 3: additional resources */}
        <section className="mc-card mc-fade-up p-6" style={{ animationDelay: "240ms" }}>
          <SectionTitle
            title="Additional Resources"
            subtitle="Explore helpful articles, videos and self-care tips"
            action={
              <button onClick={() => navigate("/resources")} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800">
                Explore All <ArrowRight className="h-3.5 w-3.5" />
              </button>
            }
          />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-4 sm:grid-cols-2 md:col-span-2">
              {RESOURCE_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.title}
                    onClick={() => openCard(card)}
                    className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.bg} p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md`}
                  >
                    <div className="relative z-10 max-w-[65%]">
                      <h3 className="text-sm font-semibold text-brand-950">{card.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-brand-800/80">{card.text}</p>
                      <span className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold ${card.ctaTone}`}>
                        {card.cta} <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                      </span>
                    </div>
                    <Icon className={`absolute -right-2 bottom-1 h-20 w-20 ${card.iconTone} opacity-80 transition group-hover:scale-105`} strokeWidth={1.4} />
                  </button>
                );
              })}
            </div>
            <div className="relative flex min-h-56 flex-col items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-brand-50 to-brand-100 p-6 text-center">
              <Quote className="h-6 w-6 fill-brand-400 text-brand-400" />
              <p className="mt-3 text-lg font-semibold leading-snug text-brand-900">
                It's okay
                <br />
                to not be okay.
              </p>
              <p className="mt-2 text-xs text-brand-500">You are not alone.</p>
              <LavenderSprig className="pointer-events-none absolute -bottom-6 -right-4 h-32 w-24 opacity-70" />
            </div>
          </div>
        </section>

        {/* Row 4: support & helpline */}
        <section className="mc-card mc-fade-up p-6" style={{ animationDelay: "300ms" }}>
          <SectionTitle title="Support & Helpline" subtitle="Reach out whenever you need help" />
          <div className="grid gap-4 md:grid-cols-4">
            <a
              href={`tel:${helpline.phone}`}
              className="flex flex-col items-center rounded-2xl border border-brand-50 bg-brand-50/40 p-5 text-center transition hover:border-brand-100 hover:bg-white hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700"><Phone className="h-5 w-5" /></span>
              <span className="mt-3 text-sm font-semibold text-brand-950">24x7 Helpline</span>
              <span className="mt-1 text-base font-semibold text-brand-700">{helpline.phone}</span>
              <span className="text-[11px] text-brand-400">Tele-MANAS · KIRAN {kiran.phone}</span>
            </a>
            <button
              onClick={() => navigate("/booking")}
              className="flex flex-col items-center rounded-2xl border border-brand-50 bg-brand-50/40 p-5 text-center transition hover:border-brand-100 hover:bg-white hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><CalendarCheck className="h-5 w-5" /></span>
              <span className="mt-3 text-sm font-semibold text-brand-950">Counselling Support</span>
              <span className="mt-1 text-xs text-brand-500">Book a session with a campus counsellor</span>
            </button>
            <button
              onClick={() => navigate("/crisis-help")}
              className="flex flex-col items-center rounded-2xl border border-rose-100 bg-rose-50/50 p-5 text-center transition hover:bg-white hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-600"><Siren className="h-5 w-5" /></span>
              <span className="mt-3 text-sm font-semibold text-brand-950">Emergency Help</span>
              <span className="mt-1 text-xs text-brand-500">If you feel unsafe, get help immediately</span>
            </button>
            <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-brand-50 to-brand-100 p-5 text-center">
              <p className="text-base font-semibold text-brand-900">You're not alone.</p>
              <p className="mt-1 text-xs text-brand-500">We're here to support you always.</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => navigate("/peer-support")} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-medium text-brand-700 shadow-sm">
                  <Users className="h-3 w-3" /> Community
                </button>
                <button onClick={() => navigate("/wellness-check")} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-medium text-brand-700 shadow-sm">
                  <ClipboardCheck className="h-3 w-3" /> Check-in
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
};

export default Dashboard;
