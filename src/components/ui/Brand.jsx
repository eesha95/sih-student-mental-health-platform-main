// Brand marks and soft decorative illustrations for the MindCare look.
import React from 'react';

export const LotusLogo = ({ className = 'w-10 h-10' }) => (
  <svg viewBox="0 0 64 48" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="lotus-a" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#e9dcff" />
        <stop offset="1" stopColor="#b493f0" />
      </linearGradient>
      <linearGradient id="lotus-b" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#d9c6ff" />
        <stop offset="1" stopColor="#9572e0" />
      </linearGradient>
    </defs>
    <path d="M32 4c6 7 8 15 0 30C24 19 26 11 32 4z" fill="url(#lotus-a)" />
    <path d="M14 12c9 2 15 9 17 22-11-2-17-9-17-22z" fill="url(#lotus-b)" />
    <path d="M50 12c-9 2-15 9-17 22 11-2 17-9 17-22z" fill="url(#lotus-b)" />
    <path d="M3 24c10-1 20 3 28 11-11 3-21 0-28-11z" fill="url(#lotus-b)" opacity=".85" />
    <path d="M61 24c-10-1-20 3-28 11 11 3 21 0 28-11z" fill="url(#lotus-b)" opacity=".85" />
    <path d="M14 40c8 4 28 4 36 0" stroke="#c9b3f5" strokeWidth="2.5" fill="none" strokeLinecap="round" />
  </svg>
);

export const Brand = ({ tagline = 'Your Mental Wellness Companion', light = true }) => (
  <div className="flex flex-col items-center text-center">
    <LotusLogo className="w-12 h-10" />
    <span className={`mt-1 text-lg font-semibold tracking-wide ${light ? 'text-white' : 'text-brand-900'}`}>MindCare</span>
    <span className={`text-[11px] ${light ? 'text-brand-200' : 'text-brand-500'}`}>{tagline}</span>
  </div>
);

// Lavender sprig used on hero cards
export const LavenderSprig = ({ className = '' }) => (
  <svg viewBox="0 0 120 160" className={className} aria-hidden="true">
    <g fill="none" strokeLinecap="round">
      <path d="M60 158C58 110 52 70 40 20" stroke="#9f86d8" strokeWidth="2" />
      <path d="M62 158C66 115 76 78 92 34" stroke="#9f86d8" strokeWidth="2" />
      <path d="M58 150c-14-14-30-18-44-14 12 12 28 16 44 14z" fill="#b9a6e8" stroke="none" />
      <path d="M64 140c12-16 28-22 44-20-10 14-26 20-44 20z" fill="#c8b8ef" stroke="none" />
    </g>
    {[...Array(9)].map((_, i) => (
      <ellipse key={`l${i}`} cx={40 + i * 1.6 + (i % 2 ? 4 : -4)} cy={22 + i * 9} rx="4.2" ry="6.5" fill={i % 2 ? '#8e6fd6' : '#a68be3'} transform={`rotate(${i % 2 ? 25 : -25} ${40 + i * 1.6} ${22 + i * 9})`} />
    ))}
    {[...Array(8)].map((_, i) => (
      <ellipse key={`r${i}`} cx={92 - i * 3 + (i % 2 ? 4 : -4)} cy={36 + i * 9} rx="4" ry="6.2" fill={i % 2 ? '#9b7fe0' : '#b49cea'} transform={`rotate(${i % 2 ? 25 : -25} ${92 - i * 3} ${36 + i * 9})`} />
    ))}
  </svg>
);

// Profile of a head with a heart, for the admin hero
export const MindHeart = ({ className = '' }) => (
  <svg viewBox="0 0 200 170" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="mh-head" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#d8c8fb" />
        <stop offset="1" stopColor="#a78be3" />
      </linearGradient>
    </defs>
    <path d="M70 160V128c-14-6-24-20-24-40 0-34 26-62 62-62s58 24 58 56c0 14-6 22-10 28l10 18-14 4v14c0 8-8 12-18 10l-16-2v6z" fill="url(#mh-head)" />
    <path d="M108 66c-6-10-24-8-24 6 0 12 14 20 24 28 10-8 24-16 24-28 0-14-18-16-24-6z" fill="#7a52d6" />
    <path d="M30 168c0-30 6-52 20-70" stroke="#9f86d8" strokeWidth="2" fill="none" />
    {[...Array(5)].map((_, i) => (
      <ellipse key={i} cx={34 + i * 4} cy={150 - i * 13} rx="5" ry="9" fill="#a68be3" transform={`rotate(${-30 + i * 6} ${34 + i * 4} ${150 - i * 13})`} />
    ))}
    {[...Array(4)].map((_, i) => (
      <ellipse key={`b${i}`} cx={180 - i * 4} cy={150 - i * 12} rx="5" ry="9" fill="#b49cea" transform={`rotate(${30 - i * 6} ${180 - i * 4} ${150 - i * 12})`} />
    ))}
  </svg>
);

// Tea cup on a book, for the login panel
export const CalmCup = ({ className = '' }) => (
  <svg viewBox="0 0 240 200" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="cc-cup" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fffaf6" />
        <stop offset="1" stopColor="#efe4ea" />
      </linearGradient>
    </defs>
    <path d="M110 40c-10-12 10-18 0-32M128 44c-8-10 8-16 0-28" stroke="#ffffff" strokeOpacity=".7" strokeWidth="3" fill="none" strokeLinecap="round" />
    <rect x="34" y="150" width="172" height="20" rx="4" fill="#d9c9ee" />
    <rect x="44" y="140" width="152" height="14" rx="4" fill="#efe6fa" />
    <path d="M60 66h112v40c0 26-22 44-56 44S60 132 60 106z" fill="url(#cc-cup)" />
    <path d="M172 76c22 0 26 30 0 34" stroke="#efe4ea" strokeWidth="9" fill="none" strokeLinecap="round" />
    <ellipse cx="116" cy="66" rx="56" ry="9" fill="#e5d6e4" />
    <path d="M116 112c-4-7-16-6-16 3 0 7 9 12 16 17 7-5 16-10 16-17 0-9-12-10-16-3z" fill="#c9a6c9" />
  </svg>
);
