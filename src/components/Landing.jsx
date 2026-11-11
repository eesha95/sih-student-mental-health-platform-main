// components/Landing.jsx - public MindCare home page
import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Smile, Bot, ClipboardCheck, CalendarCheck, Users, BookOpen, Phone, ShieldCheck,
  Lock, EyeOff, HeartHandshake, MessageCircleHeart, ChartColumn, Sprout, Menu, X, Heart, Flame,
} from "lucide-react";
import { crisisHelplines } from "../data/resources";
import { LotusLogo, LavenderSprig, CalmCup } from "./ui/Brand";

const FEATURES = [
  { icon: Smile, title: "Mood Tracker", text: "Log how you feel in seconds and see your week at a glance.", tone: "bg-brand-100 text-brand-700" },
  { icon: Bot, title: "24/7 AI Chat", text: "Talk through what's on your mind any time, in a safe and private space.", tone: "bg-rose-100 text-rose-600" },
  { icon: ClipboardCheck, title: "Wellness Check-in", text: "A one-minute check-in with personal recommendations.", tone: "bg-emerald-100 text-emerald-600" },
  { icon: CalendarCheck, title: "Book a Counsellor", text: "Schedule a confidential session with a campus counsellor.", tone: "bg-amber-100 text-amber-600" },
  { icon: Users, title: "Peer Community", text: "Join moderated support groups with students who understand.", tone: "bg-sky-100 text-sky-600" },
  { icon: BookOpen, title: "Resource Library", text: "Trusted articles, guided meditations and videos from WHO, NHS and NIMHANS.", tone: "bg-violet-100 text-violet-600" },
];

const STEPS = [
  { icon: MessageCircleHeart, title: "Talk", text: "Share how you feel with the AI companion or a peer group, whenever you need to." },
  { icon: ChartColumn, title: "Track", text: "Log your mood and check in, and watch patterns in your sleep, stress and energy." },
  { icon: Sprout, title: "Heal & Grow", text: "Get suggestions that fit you, and book a counsellor when you want more support." },
];

const TRUST = [
  { icon: Lock, title: "Private by design", text: "Your entries belong to you. You can delete your account and data at any time." },
  { icon: EyeOff, title: "Anonymous insights", text: "Counsellors see campus-wide trends, with names and emails hidden by default." },
  { icon: ShieldCheck, title: "Safety first", text: "If a message suggests you're in crisis, helpline numbers appear right away." },
];

const NAV = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#privacy", label: "Privacy" },
  { href: "#helplines", label: "Helplines" },
];

// Small static preview of the student dashboard for the hero
const DashboardPreview = () => (
  <div className="relative mx-auto w-full max-w-md">
    <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-brand-200/60 to-rose-100/60 blur-2xl" aria-hidden="true" />
    <div className="relative rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-[0_30px_80px_-30px_rgba(58,37,102,0.45)] backdrop-blur">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#efe7ff] to-[#d9c9f6] p-5">
        <p className="text-lg font-semibold text-brand-950">Hello, Ankita!</p>
        <p className="mt-1 text-xs text-brand-800">Take a deep breath. You're doing great today.</p>
        <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-brand-900 px-3 py-1.5 text-[11px] font-medium text-white">
          Check How You Feel <ArrowRight className="h-3 w-3" />
        </span>
        <LavenderSprig className="absolute -bottom-3 right-2 h-28 w-20" />
      </div>
      <div className="mt-4 rounded-2xl border border-brand-50 p-4">
        <p className="text-xs font-semibold text-brand-950">Today's Mood</p>
        <div className="mt-2 flex justify-between">
          {["😢", "😟", "🙂", "😊", "😄"].map((e, i) => (
            <span key={e} className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${i === 3 ? "bg-brand-50 ring-2 ring-brand-300" : ""}`}>{e}</span>
          ))}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-brand-50 p-4">
          <svg viewBox="0 0 120 40" className="h-10 w-full" aria-hidden="true">
            <path d="M0 30 C15 32 20 22 35 24 S55 10 70 16 S95 6 120 4" fill="none" stroke="#7352c3" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <p className="mt-1 text-[11px] text-brand-500">Mood this week</p>
        </div>
        <div className="flex flex-col justify-center rounded-2xl bg-amber-50 p-4">
          <p className="flex items-center gap-1 text-lg font-semibold text-amber-700">
            <Flame className="h-4 w-4 fill-amber-400 text-amber-500" /> 7
          </p>
          <p className="text-[11px] text-amber-700/80">Day streak</p>
        </div>
      </div>
    </div>
  </div>
);

const Landing = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const helplines = crisisHelplines.filter((h) => ["telemanas", "kiran", "emergency"].includes(h.id));

  return (
    <div className="min-h-screen bg-[#f7f4fe] text-brand-950">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-brand-100/60 bg-[#f7f4fe]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="#top" className="flex items-center gap-2">
            <LotusLogo className="h-8 w-10" />
            <span className="text-lg font-semibold text-brand-900">MindCare</span>
          </a>
          <nav className="hidden items-center gap-7 text-sm text-brand-700 md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="transition-colors hover:text-brand-950">{n.label}</a>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <Link to="/login" className="rounded-full px-4 py-2 text-sm font-medium text-brand-800 hover:bg-white">Login</Link>
            <Link to="/signup" className="rounded-full bg-brand-900 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-brand-900/20 hover:bg-brand-800">
              Get Started
            </Link>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="rounded-xl p-2 text-brand-800 md:hidden" aria-label="Menu">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-brand-100 bg-white px-4 py-3 md:hidden">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm text-brand-800 hover:bg-brand-50">
                {n.label}
              </a>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link to="/login" className="rounded-xl border border-brand-200 py-2.5 text-center text-sm font-medium text-brand-800">Login</Link>
              <Link to="/signup" className="rounded-xl bg-brand-900 py-2.5 text-center text-sm font-medium text-white">Get Started</Link>
            </div>
          </div>
        )}
      </header>

      <main id="top">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-brand-200/50 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-rose-100/70 blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-2">
            <div className="mc-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-700">
                <Heart className="h-3.5 w-3.5 fill-brand-400 text-brand-400" /> For students in higher education
              </span>
              <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                A Healthier Mind,
                <br />
                <span className="text-brand-600">A Happier You</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-brand-800">
                MindCare is your mental wellness companion through college. Track your mood, talk to an AI companion any
                time, check in on your wellbeing and reach a counsellor when you need one. Private, free and always here.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/signup" className="inline-flex items-center gap-2 rounded-full bg-brand-900 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-brand-900/25 transition hover:bg-brand-800">
                  Get Started Free <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/login" className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-6 py-3 text-sm font-medium text-brand-800 transition hover:border-brand-300">
                  I already have an account
                </Link>
              </div>
              <p className="mt-6 text-sm tracking-wide text-brand-500">Talk · Track · Heal · Grow</p>
            </div>
            <div className="mc-fade-up" style={{ animationDelay: "120ms" }}>
              <DashboardPreview />
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">Everything in one place</p>
              <h2 className="mt-2 text-3xl font-semibold">Support for every kind of day</h2>
              <p className="mt-3 text-brand-600">From a quick mood check to a session with a professional, MindCare gives you the right tool at the right moment.</p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="rounded-[1.25rem] border border-brand-100 bg-[#fbfaff] p-6 transition hover:-translate-y-1 hover:shadow-lg">
                    <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${f.tone}`}>
                      <Icon className="h-6 w-6" />
                    </span>
                    <h3 className="mt-4 font-semibold">{f.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-brand-600">{f.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">How it works</p>
              <h2 className="mt-2 text-3xl font-semibold">Three small steps, every day</h2>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={s.title} className="mc-card relative p-7">
                    <span className="absolute right-6 top-5 text-5xl font-bold text-brand-100">{i + 1}</span>
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-900 text-white">
                      <Icon className="h-6 w-6" />
                    </span>
                    <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-brand-600">{s.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section id="privacy" className="scroll-mt-20 bg-white py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
            <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-[#e9defc] to-[#cdb6ee] px-8 pt-10 text-center">
              <HeartHandshake className="mx-auto h-10 w-10 text-brand-700" />
              <p className="mt-4 text-2xl font-semibold text-brand-950" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                It's okay to not be okay.
              </p>
              <p className="mt-2 text-sm text-brand-700">You are not alone.</p>
              <CalmCup className="mx-auto mt-6 w-64 translate-y-2" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">Your privacy</p>
              <h2 className="mt-2 text-3xl font-semibold">A safe space you can trust</h2>
              <div className="mt-8 space-y-6">
                {TRUST.map((t) => {
                  const Icon = t.icon;
                  return (
                    <div key={t.title} className="flex gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="font-semibold">{t.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-brand-600">{t.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Helplines */}
        <section id="helplines" className="scroll-mt-20 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="rounded-[1.75rem] border border-rose-100 bg-gradient-to-r from-rose-50 to-brand-50 p-8 sm:p-10">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-md">
                  <h2 className="text-2xl font-semibold">Need help right now?</h2>
                  <p className="mt-2 text-sm text-brand-700">
                    If you're struggling or feel unsafe, please call now. These lines are free and confidential, and you don't need an account.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 lg:shrink-0">
                  {helplines.map((h) => (
                    <a key={h.id} href={`tel:${h.phone.replace(/[^+\d]/g, "")}`} className="rounded-2xl bg-white px-5 py-4 shadow-sm transition hover:shadow-md">
                      <span className="flex items-center gap-2 whitespace-nowrap text-base font-semibold text-brand-900">
                        <Phone className="h-4 w-4 text-rose-500" /> {h.phone}
                      </span>
                      <span className="mt-1 block text-xs text-brand-600">{h.title.replace(" (Govt. of India)", "")}</span>
                      <span className="block text-[11px] text-brand-400">{h.availability}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="pb-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mc-sidebar relative overflow-hidden rounded-[1.75rem] px-8 py-14 text-center text-white">
              <LotusLogo className="mx-auto h-12 w-16" />
              <h2 className="mt-4 text-3xl font-semibold">Start your wellness journey today</h2>
              <p className="mx-auto mt-3 max-w-lg text-sm text-brand-100">Create a free account in under a minute. Your first check-in takes even less.</p>
              <Link to="/signup" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-900 transition hover:bg-brand-50">
                Create my account <ArrowRight className="h-4 w-4" />
              </Link>
              <LavenderSprig className="pointer-events-none absolute -bottom-6 -left-4 h-44 w-32 opacity-40" />
              <LavenderSprig className="pointer-events-none absolute -bottom-6 -right-4 h-44 w-32 -scale-x-100 opacity-40" />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-brand-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <LotusLogo className="h-7 w-9" />
            <div>
              <p className="font-semibold text-brand-900">MindCare</p>
              <p className="text-xs text-brand-500">Heal · Support · Grow</p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-brand-600">
            <Link to="/login" className="hover:text-brand-900">Student login</Link>
            <Link to="/signup" className="hover:text-brand-900">Sign up</Link>
            <Link to="/admin-login" className="hover:text-brand-900">Admin / counsellor login</Link>
            <a href="#helplines" className="hover:text-brand-900">Helplines</a>
          </nav>
        </div>
        <p className="border-t border-brand-50 py-4 text-center text-xs text-brand-400">
          MindCare is a support tool, not a replacement for professional care. In an emergency, call 112.
        </p>
      </footer>
    </div>
  );
};

export default Landing;
