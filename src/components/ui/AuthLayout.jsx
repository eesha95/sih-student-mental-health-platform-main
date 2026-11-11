// Split-panel layout shared by the student login, signup and admin login pages.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { CalmCup, LotusLogo } from './Brand';

export const AuthLayout = ({ heading, subheading, children }) => (
  <div className="flex min-h-screen items-center justify-center bg-[#f4f1fb] px-4 py-8">
    <div className="mc-fade-up grid w-full max-w-4xl overflow-hidden rounded-[1.75rem] bg-white shadow-[0_30px_80px_-30px_rgba(58,37,102,0.35)] md:grid-cols-2">
      {/* Illustration panel */}
      <div className="relative hidden flex-col items-center overflow-hidden bg-gradient-to-b from-[#e9defc] via-[#dccbf6] to-[#cdb6ee] px-8 pt-10 pb-0 text-center md:flex">
        <Link to="/" className="flex flex-col items-center" aria-label="MindCare home">
          <LotusLogo className="h-11 w-14" />
          <span className="mt-1 text-lg font-semibold text-brand-900">MindCare</span>
        </Link>
        <h2 className="mt-10 text-3xl font-semibold leading-tight text-brand-950" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
          A Healthier Mind
          <br />A Happier You
        </h2>
        <p className="mt-3 text-sm tracking-wide text-brand-700">Talk · Track · Heal · Grow</p>
        <CalmCup className="mt-auto w-72 translate-y-2" />
        <div className="pointer-events-none absolute -left-20 top-1/3 h-56 w-56 rounded-full bg-white/30 blur-3xl" />
      </div>

      {/* Form panel */}
      <div className="px-6 py-10 sm:px-10">
        <Link to="/" className="mb-6 flex flex-col items-center md:hidden" aria-label="MindCare home">
          <LotusLogo className="h-10 w-12" />
          <span className="text-base font-semibold text-brand-900">MindCare</span>
        </Link>
        <h1 className="text-center text-2xl font-semibold text-brand-950">{heading}</h1>
        {subheading && <p className="mx-auto mt-2 max-w-xs text-center text-sm text-brand-500">{subheading}</p>}
        <div className="mt-7">{children}</div>
      </div>
    </div>
  </div>
);

export const AuthField = ({ icon: Icon, type = 'text', ...props }) => {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <label className="flex items-center gap-3 rounded-xl border border-brand-100 bg-white px-4 py-3 transition focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100">
      {Icon && <Icon className="h-4 w-4 shrink-0 text-brand-400" />}
      <input
        aria-label={props['aria-label'] || props.placeholder}
        type={isPassword && show ? 'text' : type}
        className="w-full bg-transparent text-sm text-brand-950 placeholder:text-brand-300 outline-none disabled:opacity-60"
        {...props}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="text-brand-400 hover:text-brand-600"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}
    </label>
  );
};

export const AuthError = ({ children }) =>
  children ? (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
      {children}
    </div>
  ) : null;

export const AuthButton = ({ loading, loadingText, children }) => (
  <button
    type="submit"
    disabled={loading}
    className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-900 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-900/20 transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
  >
    {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
    {loading ? loadingText : children}
  </button>
);
