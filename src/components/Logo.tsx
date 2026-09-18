export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      role="img"
      aria-label="لوگوی فروشگاه دوستان"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="logo-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8a5a0b" />
          <stop offset="0.45" stopColor="#f9e08a" />
          <stop offset="1" stopColor="#d4a017" />
        </linearGradient>
        <radialGradient id="logo-bg" cx="0.5" cy="0.4" r="0.75">
          <stop offset="0" stopColor="#1a140a" />
          <stop offset="1" stopColor="#080604" />
        </radialGradient>
      </defs>
      <circle cx="120" cy="120" r="118" fill="url(#logo-bg)" />
      <circle cx="120" cy="120" r="112" fill="none" stroke="url(#logo-gold)" strokeWidth="6" />
      <circle cx="120" cy="120" r="104" fill="none" stroke="#f9e08a" strokeWidth="1.4" opacity="0.65" />
      <path
        d="M78 60 L86 30 L102 47 L120 22 L138 47 L154 30 L162 60 Z"
        fill="url(#logo-gold)"
        stroke="#5c3d05"
        strokeWidth="1.5"
      />
      <g stroke="url(#logo-gold)" strokeWidth="2.5" fill="#14100a">
        <rect x="82" y="72" width="76" height="40" rx="20" />
      </g>
      <g fill="url(#logo-gold)">
        <rect x="92" y="86" width="20" height="5" rx="2" />
        <rect x="99.5" y="78.5" width="5" height="20" rx="2" />
        <circle cx="140" cy="82" r="3.4" />
        <circle cx="150" cy="90" r="3.4" />
        <circle cx="130" cy="90" r="3.4" />
        <circle cx="140" cy="98" r="3.4" />
      </g>
      <text
        x="120"
        y="138"
        textAnchor="middle"
        fontFamily="Vazirmatn, sans-serif"
        fontSize="30"
        fontWeight="800"
        fill="url(#logo-gold)"
        stroke="#4d3404"
        strokeWidth="0.6"
      >
        فروشگاه دوستان
      </text>
      <rect x="72" y="148" width="96" height="22" rx="7" fill="#14100a" stroke="url(#logo-gold)" strokeWidth="1.4" />
      <text
        x="120"
        y="164"
        textAnchor="middle"
        fontFamily="Vazirmatn, sans-serif"
        fontSize="13"
        fontWeight="700"
        fill="url(#logo-gold)"
      >
        ابوالقاسمی
      </text>
      <text
        x="120"
        y="192"
        textAnchor="middle"
        fontFamily="Vazirmatn, sans-serif"
        fontSize="8.5"
        fill="#e8c96a"
      >
        خرید و فروش · تعمیرات · نصب بازی PS4 و PS5
      </text>
      <rect x="44" y="200" width="152" height="24" rx="12" fill="#14100a" stroke="url(#logo-gold)" strokeWidth="1.6" />
      <text
        x="120"
        y="217"
        textAnchor="middle"
        fontFamily="Vazirmatn, sans-serif"
        fontSize="14"
        fontWeight="800"
        fill="url(#logo-gold)"
        direction="ltr"
      >
        ☏ 0917716990
      </text>
      <text
        x="120"
        y="233"
        textAnchor="middle"
        fontFamily="Vazirmatn, sans-serif"
        fontSize="7.5"
        fill="#a8863d"
      >
        📍 شیراز، بلوار رحمت، خیابان لشکری، کوچه ۱
      </text>
    </svg>
  );
}