// Décors illustrés (SVG, pas de photo : léger, hors ligne, sans droits d'image) pour la carte « Mouvement du jour ».
// L'avatar 3D s'entraîne devant : Miami Beach au coucher du soleil ou le Golden Gate de San Francisco au crépuscule.
const palm = (x, y, s, flip = false) => `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})" fill="#1d1235">
  <path d="M0 0 C 6 -40 4 -80 14 -118 L 20 -118 C 12 -80 14 -40 8 0 Z"/>
  <path d="M17 -118 C -10 -130 -38 -118 -52 -96 C -30 -110 -8 -114 17 -112 Z"/>
  <path d="M17 -118 C 0 -142 -26 -150 -44 -146 C -22 -140 -4 -132 17 -114 Z"/>
  <path d="M17 -118 C 30 -146 56 -150 72 -140 C 52 -138 34 -132 19 -114 Z"/>
  <path d="M17 -118 C 46 -126 72 -112 82 -88 C 62 -104 42 -112 19 -112 Z"/>
  <path d="M17 -118 C 22 -134 16 -152 4 -162 C 12 -146 14 -132 15 -116 Z"/></g>`;

export const BACKDROPS = {
  miami: {
    label: 'Miami Beach',
    svg: `<svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="bd-mi-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b2a7a"/><stop offset=".45" stop-color="#e2557d"/><stop offset=".78" stop-color="#ffb26b"/><stop offset="1" stop-color="#ffd69a"/></linearGradient>
        <linearGradient id="bd-mi-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f6f9e"/><stop offset="1" stop-color="#173f6b"/></linearGradient>
        <linearGradient id="bd-mi-sand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2c79a"/><stop offset="1" stop-color="#d9a174"/></linearGradient>
      </defs>
      <rect width="400" height="220" fill="url(#bd-mi-sky)"/>
      <circle cx="268" cy="132" r="34" fill="#ffe3a3" opacity=".95"/>
      <g fill="#7a3f86" opacity=".55">
        <rect x="18" y="104" width="26" height="40"/><rect x="48" y="92" width="20" height="52"/><rect x="72" y="112" width="30" height="32"/>
        <rect x="318" y="100" width="22" height="44"/><rect x="344" y="88" width="16" height="56"/><rect x="364" y="108" width="30" height="36"/>
      </g>
      <rect y="140" width="400" height="34" fill="url(#bd-mi-sea)"/>
      <g stroke="#ffd9a0" stroke-width="2" stroke-linecap="round" opacity=".7"><path d="M236 150h64M248 158h40M256 166h24"/></g>
      <path d="M0 172 C 90 162 210 166 400 160 V220 H0 Z" fill="url(#bd-mi-sand)"/>
      ${palm(34, 210, 0.95)}${palm(372, 214, 0.8, true)}${palm(330, 214, 0.6)}
    </svg>`,
  },
  sf: {
    label: 'San Francisco',
    svg: `<svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="bd-sf-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14254a"/><stop offset=".5" stop-color="#5b4f86"/><stop offset=".82" stop-color="#f08a5d"/><stop offset="1" stop-color="#f7b77a"/></linearGradient>
        <linearGradient id="bd-sf-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b4f7c"/><stop offset="1" stop-color="#1b2747"/></linearGradient>
      </defs>
      <rect width="400" height="220" fill="url(#bd-sf-sky)"/>
      <path d="M0 150 C 50 118 96 124 140 146 C 190 120 250 126 300 146 C 340 132 372 130 400 140 V160 H0 Z" fill="#2a2850" opacity=".85"/>
      <rect y="152" width="400" height="68" fill="url(#bd-sf-sea)"/>
      <g fill="#c0392b">
        <rect x="118" y="62" width="9" height="104"/><rect x="128" y="62" width="9" height="104"/>
        <rect x="292" y="62" width="9" height="104"/><rect x="302" y="62" width="9" height="104"/>
        <rect x="114" y="78" width="27" height="5"/><rect x="114" y="104" width="27" height="5"/>
        <rect x="288" y="78" width="27" height="5"/><rect x="288" y="104" width="27" height="5"/>
        <rect x="0" y="138" width="400" height="6"/>
      </g>
      <g fill="none" stroke="#c0392b" stroke-width="3">
        <path d="M-30 128 C 40 132 90 110 127 64 C 170 128 250 128 302 64 C 340 112 380 122 430 120"/>
      </g>
      <g stroke="#c0392b" stroke-width="1.2" opacity=".85">
        <path d="M150 104v34M170 118v20M190 125v13M210 128v10M230 126v12M250 119v19M270 106v32"/>
        <path d="M60 126v12M84 116v22M104 96v42M326 100v38M350 113v25M374 119v19"/>
      </g>
      <path d="M0 172 C 80 160 150 176 230 168 C 300 160 360 170 400 166 V220 H0 Z" fill="#f4f1ea" opacity=".16"/>
      <path d="M0 190 C 120 176 260 196 400 182 V220 H0 Z" fill="#141d36"/>
    </svg>`,
  },
};
