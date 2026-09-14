import React, { useId } from 'react';

interface SchoolBrandMarkProps {
  schoolName?: string;
  managementName?: string;
  motto?: string;
  className?: string;
  imageUrl?: string;
}

/**
 * Scalable institutional fallback emblem. The real School Profile logo always
 * takes priority when configured; this vector is used only when no uploaded
 * official mark is available.
 */
export function SchoolBrandMark({
  schoolName = 'National High School Taloda',
  managementName = "Bharat Vividh Vidhayak Karya Samiti's",
  motto = 'رَبِّ زِدْنِي عِلْمًا',
  className = '',
  imageUrl
}: SchoolBrandMarkProps) {
  const rawId = useId().replace(/:/g, '');
  const schoolArcId = `school-logo-arc-${rawId}`;

  if (imageUrl) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <img src={imageUrl} alt={`${schoolName} logo`} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
      </div>
    );
  }

  return (
    <svg viewBox="0 0 300 360" className={className} role="img" aria-label={`${schoolName} emblem`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={`gold-${rawId}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5dc8e" />
          <stop offset="1" stopColor="#c99535" />
        </linearGradient>
        <linearGradient id={`book-${rawId}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset="1" stopColor="#e7d4aa" />
        </linearGradient>
        <path id={schoolArcId} d="M 48 176 A 105 124 0 0 1 252 176" />
        <filter id={`soft-${rawId}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.16" />
        </filter>
      </defs>

      {/* Management crest */}
      <path d="M44 58 Q150 2 256 58 L239 92 Q150 49 61 92 Z" fill={`url(#gold-${rawId})`} stroke="#183f74" strokeWidth="5" filter={`url(#soft-${rawId})`} />
      <text x="150" y="55" textAnchor="middle" fill="#183f74" fontSize="12" fontWeight="800" letterSpacing="0.35">
        {managementName.length > 38 ? 'BHARAT VIVIDH VIDHAYAK KARYA SAMITI' : managementName.toUpperCase()}
      </text>

      {/* Main oval */}
      <ellipse cx="150" cy="190" rx="118" ry="132" fill="#ffffff" stroke="#173f74" strokeWidth="6" filter={`url(#soft-${rawId})`} />
      <ellipse cx="150" cy="194" rx="91" ry="102" fill="#075a3f" stroke="#173f74" strokeWidth="3" />

      {/* Curved school name */}
      <text fill="#173f74" fontSize="20" fontWeight="900" letterSpacing="1.1">
        <textPath href={`#${schoolArcId}`} startOffset="50%" textAnchor="middle">
          {schoolName.toUpperCase()}
        </textPath>
      </text>

      {/* Open book */}
      <g transform="translate(73 164)" stroke="#8a5c17" strokeWidth="3" strokeLinejoin="round">
        <path d="M4 70 Q38 52 75 68 L75 129 Q38 112 4 128 Z" fill={`url(#book-${rawId})`} />
        <path d="M146 70 Q112 52 75 68 L75 129 Q112 112 146 128 Z" fill={`url(#book-${rawId})`} />
        <path d="M75 68 L75 129" fill="none" />
        <path d="M17 80 Q40 69 63 78 M17 92 Q40 81 63 90 M17 104 Q40 93 63 102" fill="none" stroke="#8c7a5b" strokeWidth="1.6" />
        <path d="M133 80 Q110 69 87 78 M133 92 Q110 81 87 90 M133 104 Q110 93 87 102" fill="none" stroke="#8c7a5b" strokeWidth="1.6" />
      </g>

      {/* Pen / knowledge symbol */}
      <g transform="translate(145 125) rotate(4)" filter={`url(#soft-${rawId})`}>
        <path d="M5 4 L18 28 L8 43 L-2 28 Z" fill="#d9d9d9" stroke="#374151" strokeWidth="2" />
        <circle cx="8" cy="27" r="2.7" fill="#173f74" />
        <rect x="3" y="40" width="10" height="70" rx="4" fill="#d0a14d" stroke="#374151" strokeWidth="2" />
        <path d="M3 104 L8 121 L13 104" fill="#f2d16b" stroke="#374151" strokeWidth="2" />
      </g>

      {/* Ribbon and motto */}
      <path d="M28 300 L84 292 L95 315 L205 315 L216 292 L272 300 L250 337 L207 329 L196 345 L104 345 L93 329 L50 337 Z" fill="#7b1830" stroke="#a87325" strokeWidth="4" filter={`url(#soft-${rawId})`} />
      <rect x="84" y="302" width="132" height="48" rx="8" fill="#fffaf0" stroke="#a87325" strokeWidth="3" />
      <text x="150" y="335" textAnchor="middle" fill="#946915" fontSize="23" fontWeight="700" direction="rtl">{motto}</text>
    </svg>
  );
}

interface SchoolSealMarkProps {
  schoolName?: string;
  location?: string;
  className?: string;
}

export function SchoolSealMark({ schoolName = 'National High School', location = 'Taloda, Dist. Nandurbar', className = '' }: SchoolSealMarkProps) {
  const rawId = useId().replace(/:/g, '');
  const pathId = `school-seal-${rawId}`;
  const outerText = `${schoolName.toUpperCase()}  ★  ${location.toUpperCase()}  ★  `;

  return (
    <svg viewBox="0 0 220 220" className={className} role="img" aria-label={`${schoolName} official seal`}>
      <defs><path id={pathId} d="M 110,110 m -78,0 a 78,78 0 1,1 156,0 a 78,78 0 1,1 -156,0" /></defs>
      <circle cx="110" cy="110" r="101" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="2.2 2.2" />
      <circle cx="110" cy="110" r="91" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="110" cy="110" r="59" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <text fill="currentColor" fontSize="13" fontWeight="800" letterSpacing="1.15"><textPath href={`#${pathId}`} startOffset="2%">{outerText}</textPath></text>
      <text x="110" y="91" textAnchor="middle" fill="currentColor" fontSize="13" fontWeight="900">BHARAT V.V.K.S.</text>
      <text x="110" y="112" textAnchor="middle" fill="currentColor" fontSize="15" fontWeight="900">NATIONAL</text>
      <text x="110" y="132" textAnchor="middle" fill="currentColor" fontSize="15" fontWeight="900">HIGH SCHOOL</text>
      <text x="110" y="151" textAnchor="middle" fill="currentColor" fontSize="12" fontWeight="800">TALODA</text>
    </svg>
  );
}
