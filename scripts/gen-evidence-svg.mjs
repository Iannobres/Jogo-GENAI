// Uso: node scripts/gen-evidence-svg.mjs
// Gera as ilustrações de evidência (SVG 4:3) com uma base visual comum:
// superfície escura, luz fria lateral, marcador amarelo e régua de perícia, sem texto.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../client/public/assets/case-001/evidence', import.meta.url));
mkdirSync(OUT, { recursive: true });

const W = 800, H = 600;

const defs = (extra = '') => `
<defs>
  <radialGradient id="bg" cx="38%" cy="40%" r="80%">
    <stop offset="0" stop-color="#1b2433"/><stop offset=".55" stop-color="#0d121b"/><stop offset="1" stop-color="#05070b"/>
  </radialGradient>
  <linearGradient id="light" x1="0" y1="0" x2="1" y2=".4">
    <stop offset="0" stop-color="#9cc4ff" stop-opacity=".16"/><stop offset=".5" stop-color="#9cc4ff" stop-opacity=".03"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="vig" cx="50%" cy="50%" r="70%">
    <stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/>
  </radialGradient>
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/>
    <feColorMatrix values="0 0 0 0 .6  0 0 0 0 .65  0 0 0 0 .75  0 0 0 .07 0"/>
  </filter>
  <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="10"/><feOffset dx="14" dy="16"/>
    <feComponentTransfer><feFuncA type="linear" slope=".7"/></feComponentTransfer>
    <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="blur2"><feGaussianBlur stdDeviation="2"/></filter>
  <filter id="blur4"><feGaussianBlur stdDeviation="4"/></filter>
  <filter id="blur10"><feGaussianBlur stdDeviation="10"/></filter>
  <linearGradient id="tent" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#f7c843"/><stop offset=".55" stop-color="#e2ad22"/><stop offset="1" stop-color="#9c740f"/>
  </linearGradient>
  ${extra}
</defs>`;

// Superfície, luz e textura (atrás do objeto).
const backdrop = (surface = '') => `
<rect width="${W}" height="${H}" fill="url(#bg)"/>
${surface}
<rect width="${W}" height="${H}" fill="url(#light)"/>`;

// Marcador de evidência (tenda amarela sem números) e régua em L.
const marker = (x = 92, y = 452) => `
<g transform="translate(${x} ${y})" filter="url(#shadow)">
  <path d="M0 70 L34 0 L68 70 Z" fill="url(#tent)"/>
  <path d="M34 0 L68 70 L86 64 L50 -4 Z" fill="#8a6610"/>
  <rect x="17" y="44" width="34" height="5" fill="#1a1406" opacity=".75"/>
</g>`;

const ruler = (x = 560, y = 520) => {
  let ticks = '';
  for (let i = 0; i <= 18; i++) {
    const tx = 8 + i * 10;
    ticks += `<rect x="${tx}" y="0" width="1.5" height="${i % 5 === 0 ? 12 : 7}" fill="#111"/>`;
  }
  let vticks = '';
  for (let i = 0; i <= 6; i++) vticks += `<rect x="0" y="${-8 - i * 10}" width="${i % 5 === 0 ? 12 : 7}" height="1.5" fill="#111"/>`;
  return `
<g transform="translate(${x} ${y}) rotate(-3)" opacity=".92">
  <rect x="0" y="0" width="200" height="22" fill="#e9e6dc"/>
  <rect x="0" y="-78" width="22" height="78" fill="#e9e6dc"/>
  ${[0, 2, 4, 6, 8].map((i) => `<rect x="${8 + i * 20}" y="16" width="20" height="6" fill="#111"/>`).join('')}
  ${ticks}${vticks}
</g>`;
};

const finish = () => `
<rect width="${W}" height="${H}" filter="url(#grain)"/>
<rect width="${W}" height="${H}" fill="url(#vig)"/>`;

const svg = (body, extra = '', surface = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs(extra)}${backdrop(surface)}${body}${finish()}</svg>\n`;

// Texto borrado: linhas cinza desfocadas (ilegível de propósito).
const blurLines = (x, y, w, n, gap, color = '#5b6270', h = 5, seed = 1) => {
  let out = '';
  for (let i = 0; i < n; i++) {
    const len = w * (0.55 + (((i + 1) * 37 * seed) % 45) / 100);
    out += `<rect x="${x}" y="${y + i * gap}" width="${len.toFixed(0)}" height="${h}" rx="2" fill="${color}"/>`;
  }
  return `<g filter="url(#blur2)" opacity=".85">${out}</g>`;
};

const glassTable = `
<rect x="0" y="0" width="${W}" height="${H}" fill="#0a1220" opacity=".5"/>
<path d="M-20 380 L820 300" stroke="#a9c8ff" stroke-opacity=".08" stroke-width="40" filter="url(#blur10)"/>
<path d="M-20 140 L820 60" stroke="#a9c8ff" stroke-opacity=".05" stroke-width="80" filter="url(#blur10)"/>`;

const carpet = `
<filter id="carpet"><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="3"/><feColorMatrix values="0 0 0 0 .12  0 0 0 0 .14  0 0 0 0 .2  0 0 0 .55 0"/></filter>`;

const files = {};

// 1. Copo tombado com resíduo
files['copo.svg'] = svg(`
<path d="M90 392 C130 352 220 360 268 366 C300 372 306 398 262 410 C210 424 120 420 92 406 Z" fill="#b0731f" opacity=".4" filter="url(#blur2)"/>
<path d="M118 384 C160 370 220 376 250 382" stroke="#ffd38a" stroke-opacity=".3" stroke-width="3" fill="none"/>
<g transform="translate(420 300) rotate(-12) scale(1.35)">
  <ellipse cx="30" cy="80" rx="210" ry="22" fill="#000" opacity=".55" filter="url(#blur10)"/>
  <path d="M-150 -66 L150 -62 L150 62 L-150 66 Z" fill="url(#glassBody)" stroke="#cfe2ff" stroke-opacity=".35" stroke-width="2"/>
  <ellipse cx="150" cy="0" rx="22" ry="62" fill="url(#glassBase)" stroke="#e6f0ff" stroke-opacity=".55" stroke-width="5"/>
  <ellipse cx="140" cy="10" rx="12" ry="44" fill="#eef0f2" opacity=".6" filter="url(#blur4)"/>
  <ellipse cx="132" cy="26" rx="8" ry="16" fill="#fff" opacity=".5" filter="url(#blur2)"/>
  <ellipse cx="-150" cy="0" rx="26" ry="66" fill="none" stroke="#e6f0ff" stroke-opacity=".7" stroke-width="3"/>
  <path d="M-140 -56 L140 -52" stroke="#fff" stroke-opacity=".35" stroke-width="4" filter="url(#blur2)"/>
  <path d="M-138 50 L140 48" stroke="#fff" stroke-opacity=".12" stroke-width="3"/>
</g>
${marker(70, 430)}${ruler(540, 525)}`,
`<linearGradient id="glassBody" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#d6e6ff" stop-opacity=".22"/><stop offset=".45" stop-color="#6f8db8" stop-opacity=".08"/><stop offset="1" stop-color="#d6e6ff" stop-opacity=".18"/>
</linearGradient>
<radialGradient id="glassBase"><stop offset="0" stop-color="#9fb6d6" stop-opacity=".25"/><stop offset="1" stop-color="#1c2a3d" stop-opacity=".6"/></radialGradient>`,
glassTable);

// 2. Caixa de digoxina aberta com uma única cartela
const blister = (x, y, rot, rows = 2, cols = 5, empty = []) => {
  let b = '';
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const cx = 28 + c * 34, cy = 28 + r * 40;
      b += empty.includes(i)
        ? `<ellipse cx="${cx}" cy="${cy}" rx="12" ry="12" fill="#6d7480"/><path d="M${cx - 9} ${cy - 4} l6 4 l-4 6 l8 -2" stroke="#2b3038" stroke-width="2" fill="none"/>`
        : `<circle cx="${cx}" cy="${cy}" r="13" fill="url(#bubble)"/><circle cx="${cx - 4}" cy="${cy - 5}" r="4" fill="#fff" opacity=".7"/>`;
    }
  return `<g transform="translate(${x} ${y}) rotate(${rot})"><rect width="${cols * 34 + 22}" height="${rows * 40 + 16}" rx="6" fill="url(#foil)" stroke="#e5ebf3" stroke-opacity=".5"/>${b}</g>`;
};
files['caixa-digoxina.svg'] = svg(`
<g filter="url(#shadow)">
  <path d="M230 250 L560 220 L600 400 L260 440 Z" fill="#e8ebef"/>
  <path d="M230 250 L260 440 L240 452 L208 262 Z" fill="#b9bfc8"/>
  <path d="M260 440 L600 400 L604 418 L262 460 Z" fill="#a7aeb8"/>
  <path d="M248 262 L548 234 L582 390 L274 426 Z" fill="#2a2f37"/>
  <path d="M230 250 L560 220 L540 120 L215 150 Z" fill="#f2f4f7"/>
  <path d="M215 150 L540 120" stroke="#c7ccd3" stroke-width="3"/>
  <rect x="300" y="160" width="160" height="14" rx="2" fill="#2f5fb3" opacity=".55" transform="rotate(-5 380 167)"/>
  <rect x="300" y="186" width="90" height="8" rx="2" fill="#9aa3ae" opacity=".7" transform="rotate(-5 345 190)" filter="url(#blur2)"/>
</g>
${blister(282, 262, -5)}
<path d="M290 360 L560 334 L570 380 L298 410 Z" fill="#1d2128" opacity=".9"/>
<path d="M300 372 L555 348" stroke="#3a404a" stroke-dasharray="6 8" stroke-width="2"/>
${marker(80, 440)}${ruler(560, 525)}`,
`<linearGradient id="foil" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9dee6"/><stop offset=".5" stop-color="#9aa4b2"/><stop offset="1" stop-color="#cfd6df"/></linearGradient>
<radialGradient id="bubble" cx="40%" cy="35%"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#dfe4ea"/><stop offset="1" stop-color="#9aa3ae"/></radialGradient>`);

// 3. Celular com conversa borrada
const bubbles = (() => {
  const rows = [[0, 150], [1, 120], [0, 170], [0, 90], [1, 160], [0, 130], [1, 100]];
  return rows
    .map(([right, w], i) => {
      const y = 92 + i * 52;
      const x = right ? 236 - w : 34;
      return `<rect x="${x}" y="${y}" width="${w}" height="34" rx="14" fill="${right ? '#2f6fd6' : '#2c3442'}"/>`;
    })
    .join('');
})();
files['celular.svg'] = svg(`
<g transform="translate(262 46) rotate(8 140 260)" filter="url(#shadow)">
  <rect x="0" y="0" width="270" height="520" rx="36" fill="#0b0d11" stroke="#3a414c" stroke-width="3"/>
  <rect x="12" y="14" width="246" height="492" rx="26" fill="#0f1621"/>
  <rect x="12" y="14" width="246" height="58" rx="26" fill="#18212f"/>
  <circle cx="54" cy="44" r="16" fill="#3b4656"/>
  <rect x="80" y="36" width="90" height="10" rx="4" fill="#5c6878" filter="url(#blur2)"/>
  <g filter="url(#blur4)">${bubbles}</g>
  <rect x="24" y="460" width="222" height="32" rx="16" fill="#1c2533"/>
  <rect x="105" y="22" width="60" height="10" rx="5" fill="#05070a"/>
  <path d="M12 120 L258 40" stroke="#fff" stroke-opacity=".06" stroke-width="60"/>
</g>
<ellipse cx="400" cy="300" rx="190" ry="250" fill="#3f78d8" opacity=".08" filter="url(#blur10)"/>
${marker(90, 440)}${ruler(560, 525)}`);

// 4. Contrato com anotação vermelha
files['contrato.svg'] = svg(`
<g filter="url(#shadow)">
  <rect x="215" y="95" width="360" height="440" fill="#c9c6bd" transform="rotate(-9 395 315)"/>
  <rect x="225" y="88" width="360" height="440" fill="#dad7ce" transform="rotate(-4 405 308)"/>
  <g transform="rotate(3 410 300)">
    <rect x="230" y="80" width="360" height="440" fill="#eceae3"/>
    <rect x="258" y="112" width="200" height="12" rx="3" fill="#3d4148" opacity=".8" filter="url(#blur2)"/>
    ${blurLines(258, 150, 290, 9, 22, '#7d828b', 5, 3)}
    ${blurLines(258, 360, 290, 5, 22, '#7d828b', 5, 7)}
    <path d="M262 476 c20 -18 40 10 60 -6 s30 -10 50 4" stroke="#1f2a44" stroke-width="2.5" fill="none" opacity=".8"/>
    <rect x="240" y="88" width="34" height="5" rx="1" fill="#9aa1ab" transform="rotate(-30 257 90)"/>
    <ellipse cx="520" cy="190" rx="52" ry="26" fill="none" stroke="#c4161c" stroke-width="3.5" transform="rotate(-8 520 190)"/>
    <path d="M470 250 c18 -6 40 4 70 -2 M478 262 c22 -4 36 2 58 -1" stroke="#c4161c" stroke-width="3" fill="none"/>
    <path d="M548 220 l14 26 l-6 4" stroke="#c4161c" stroke-width="3" fill="none"/>
    <path d="M560 300 q-8 30 4 60" stroke="#c4161c" stroke-width="3" fill="none"/>
  </g>
</g>
<g transform="translate(560 430) rotate(-35)" filter="url(#shadow)">
  <rect x="0" y="0" width="190" height="14" rx="7" fill="#b3191f"/><path d="M190 0 L222 7 L190 14 Z" fill="#d9c9a3"/><rect x="18" y="-3" width="56" height="5" rx="2" fill="#d0d4da"/>
</g>
${marker(70, 420)}`);

// 5. Agenda de couro aberta com caneta tinteiro
const scribble = (x, y, n, seed) => {
  let p = '';
  for (let i = 0; i < n; i++) {
    const yy = y + i * 26;
    const len = 120 + ((i * 53 * seed) % 90);
    let d = `M${x} ${yy}`;
    for (let k = 0; k < len; k += 12) d += ` q4 ${-6 - ((k + i) % 5)} 8 0 t4 ${2 + ((k * seed) % 4)}`;
    p += `<path d="${d}" stroke="#1d2a4a" stroke-width="1.8" fill="none" opacity=".8"/>`;
  }
  return p;
};
files['agenda.svg'] = svg(`
<g filter="url(#shadow)">
  <path d="M150 130 L650 110 L670 470 L140 490 Z" fill="#4a2c18"/>
  <path d="M168 146 L398 132 L404 470 L160 476 Z" fill="#ece4d2"/>
  <path d="M402 132 L632 124 L648 458 L408 470 Z" fill="#e6dcc7"/>
  <path d="M398 132 L404 470" stroke="#9c8c70" stroke-width="3"/>
  <rect x="180" y="160" width="200" height="1.5" fill="#c9b99a"/>
  ${Array.from({ length: 12 }, (_, i) => `<path d="M178 ${190 + i * 24} L392 ${186 + i * 24}" stroke="#d3c5a8" stroke-width="1"/>`).join('')}
  ${Array.from({ length: 12 }, (_, i) => `<path d="M416 ${182 + i * 24} L634 ${176 + i * 24}" stroke="#cdbe9f" stroke-width="1"/>`).join('')}
  <g transform="rotate(-2 280 300)">${scribble(196, 212, 4, 3)}</g>
  <g transform="rotate(-2 520 300)">${scribble(430, 236, 2, 5)}${scribble(430, 340, 2, 7)}</g>
  <rect x="424" y="222" width="10" height="10" fill="none" stroke="#8a1c1c" stroke-width="2"/>
  <rect x="424" y="326" width="10" height="10" fill="none" stroke="#8a1c1c" stroke-width="2"/>
  <path d="M520 120 L532 120 L532 200 L526 192 L520 200 Z" fill="#7a1616"/>
</g>
<g transform="translate(470 470) rotate(-28)" filter="url(#shadow)">
  <rect x="0" y="0" width="230" height="20" rx="10" fill="#101317"/>
  <rect x="150" y="-1" width="16" height="22" rx="3" fill="#c9a24a"/>
  <path d="M0 4 L-46 10 L0 16 Z" fill="#c9a24a"/><path d="M-30 10 L-46 10" stroke="#5a4518" stroke-width="1.5"/>
  <rect x="60" y="-6" width="80" height="5" rx="2" fill="#c9a24a"/>
</g>
${marker(60, 470)}`);

// 6. Fechadura da porta e chave no carpete
files['fechadura.svg'] = svg(`
<g>
  <rect x="140" y="-10" width="470" height="430" fill="url(#wood)"/>
  ${Array.from({ length: 14 }, (_, i) => `<path d="M${150 + i * 34} -10 C${160 + i * 34} 120 ${140 + i * 34} 260 ${156 + i * 34} 420" stroke="#1b0f08" stroke-opacity=".35" stroke-width="2" fill="none"/>`).join('')}
  <rect x="140" y="-10" width="470" height="430" fill="url(#doorLight)"/>
  <rect x="600" y="-10" width="40" height="430" fill="#0c0f14"/>
  <rect x="140" y="410" width="500" height="12" fill="#07090c"/>
</g>
<g filter="url(#shadow)">
  <rect x="420" y="120" width="70" height="200" rx="10" fill="url(#steel)"/>
  <circle cx="455" cy="170" r="30" fill="url(#steel)" stroke="#5c6672" stroke-width="2"/>
  <rect x="455" y="160" width="170" height="22" rx="11" fill="url(#steel)" transform="rotate(-4 455 170)"/>
  <circle cx="455" cy="262" r="16" fill="#2a3038"/>
  <path d="M449 262 L461 262 L458 292 L452 292 Z" fill="#05070a"/><circle cx="455" cy="262" r="6" fill="#05070a"/>
</g>
<g transform="translate(250 480) rotate(18)" filter="url(#shadow)">
  <circle cx="0" cy="0" r="30" fill="url(#brass)"/><circle cx="0" cy="0" r="10" fill="#1a1e24"/>
  <rect x="26" y="-8" width="130" height="16" fill="url(#brass)"/>
  <path d="M120 8 v14 h8 v-8 h8 v12 h8 v-18" fill="url(#brass)"/>
</g>
${marker(560, 446)}${ruler(40, 560)}`,
`<linearGradient id="wood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a2416"/><stop offset=".5" stop-color="#4c3020"/><stop offset="1" stop-color="#2e1c11"/></linearGradient>
<linearGradient id="doorLight" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9cc4ff" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></linearGradient>
<linearGradient id="steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e3e8ef"/><stop offset=".45" stop-color="#8b95a3"/><stop offset="1" stop-color="#3e4652"/></linearGradient>
<linearGradient id="brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2d58a"/><stop offset=".5" stop-color="#b98d32"/><stop offset="1" stop-color="#6e4f15"/></linearGradient>
${carpet}`,
`<rect x="0" y="400" width="${W}" height="200" fill="#121722"/><rect x="0" y="400" width="${W}" height="200" filter="url(#carpet)"/>`);

// Monitor genérico
const monitor = (inner) => `
<g filter="url(#shadow)">
  <rect x="330" y="440" width="140" height="40" fill="#14171c"/>
  <path d="M260 488 L540 488 L520 470 L280 470 Z" fill="#1c2027"/>
  <rect x="120" y="70" width="560" height="380" rx="12" fill="#0b0d11" stroke="#2c323b" stroke-width="3"/>
  <rect x="140" y="88" width="520" height="340" fill="#05080c"/>
  ${inner}
  <path d="M140 88 L660 88 L140 300 Z" fill="#fff" opacity=".04"/>
</g>`;

// 7. Gravações das câmeras: grade 3x3 de corredores
const cctv = (x, y, w, h, v) => `
<g transform="translate(${x} ${y})">
  <rect width="${w}" height="${h}" fill="#20252c"/>
  <path d="M0 0 L${w * (0.38 + v * 0.02)} ${h * 0.42} L${w * (0.62 - v * 0.02)} ${h * 0.42} L${w} 0 Z" fill="#3a414a"/>
  <path d="M0 ${h} L${w * (0.38 + v * 0.02)} ${h * 0.58} L${w * (0.62 - v * 0.02)} ${h * 0.58} L${w} ${h} Z" fill="#2b3037"/>
  <rect x="${w * (0.38 + v * 0.02)}" y="${h * 0.42}" width="${w * (0.24 - v * 0.04)}" height="${h * 0.16}" fill="#8c96a3"/>
  ${v % 3 === 1 ? `<rect x="${w * 0.47}" y="${h * 0.44}" width="${w * 0.05}" height="${h * 0.14}" rx="3" fill="#0d0f12"/><circle cx="${w * 0.495}" cy="${h * 0.44}" r="${w * 0.025}" fill="#0d0f12"/>` : ''}
  <rect x="6" y="6" width="${w * 0.3}" height="6" fill="#d0d6de" opacity=".5" filter="url(#blur2)"/>
  <circle cx="${w - 12}" cy="10" r="4" fill="#e03a3a"/>
</g>`;
let grid = '';
for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) grid += cctv(146 + c * 172, 94 + r * 112, 166, 106, r * 3 + c);
files['log-cameras.svg'] = svg(`
${monitor(`<g filter="url(#blur2)" opacity=".95">${grid}</g><rect x="140" y="88" width="520" height="340" fill="url(#scan)"/>`)}
${marker(40, 470)}${ruler(560, 540)}`,
`<pattern id="scanP" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="2" fill="#000" opacity=".25"/></pattern>
<linearGradient id="scan"><stop offset="0" stop-color="#9cc4ff" stop-opacity=".06"/><stop offset="1" stop-color="#9cc4ff" stop-opacity=".02"/></linearGradient>`);

// 8. Log de crachás: terminal de acesso + crachá
let rows = '';
for (let i = 0; i < 9; i++) {
  const y = 150 + i * 30;
  rows += `<rect x="160" y="${y}" width="70" height="10" rx="2" fill="#7f8a98"/><rect x="250" y="${y}" width="${120 + ((i * 47) % 140)}" height="10" rx="2" fill="#a9b3c0"/><rect x="560" y="${y}" width="70" height="10" rx="2" fill="${i === 4 ? '#f5c542' : '#5fbf7a'}"/>`;
}
files['log-cartoes.svg'] = svg(`
${monitor(`<rect x="140" y="88" width="520" height="40" fill="#13305f"/><rect x="160" y="102" width="160" height="12" rx="3" fill="#cfe0ff" opacity=".7" filter="url(#blur2)"/>
<rect x="150" y="${150 + 4 * 30 - 8}" width="500" height="26" fill="#f5c542" opacity=".12"/>
<g filter="url(#blur2)">${rows}</g>`)}
<g transform="translate(470 360) rotate(14)" filter="url(#shadow)">
  <rect x="0" y="0" width="190" height="124" rx="10" fill="#f1f3f6"/>
  <rect x="0" y="0" width="190" height="30" rx="10" fill="#2f5fb3"/><rect x="0" y="20" width="190" height="10" fill="#2f5fb3"/>
  <rect x="84" y="-14" width="22" height="22" rx="4" fill="none" stroke="#9aa3ae" stroke-width="4"/>
  <rect x="14" y="42" width="56" height="68" rx="4" fill="#c8ced6"/>
  <circle cx="42" cy="66" r="13" fill="#8b95a3"/><path d="M20 108 c4 -20 40 -20 44 0" fill="#8b95a3"/>
  <rect x="84" y="50" width="88" height="10" rx="3" fill="#59616c" filter="url(#blur2)"/>
  <rect x="84" y="70" width="60" height="8" rx="3" fill="#9aa3ae" filter="url(#blur2)"/>
  <rect x="84" y="94" width="92" height="14" fill="#1a1e24" opacity=".8"/>
</g>
${marker(40, 470)}`);

// 9. Log do servidor: terminal verde com alerta vermelho
let term = '';
for (let i = 0; i < 12; i++) {
  const y = 112 + i * 24;
  if (i === 7) continue;
  term += `<rect x="160" y="${y}" width="40" height="8" rx="2" fill="#2f8f4e"/><rect x="212" y="${y}" width="${160 + ((i * 71) % 260)}" height="8" rx="2" fill="#4be37a" opacity="${0.55 + ((i * 13) % 40) / 100}"/>`;
}
files['log-servidor.svg'] = svg(`
${monitor(`<rect x="140" y="88" width="520" height="340" fill="#030806"/>
<g filter="url(#blur2)">${term}</g>
<rect x="150" y="${112 + 7 * 24 - 10}" width="500" height="28" fill="#b3191f" opacity=".85"/>
<rect x="166" y="${112 + 7 * 24 - 1}" width="18" height="10" fill="#fff" opacity=".9"/>
<rect x="196" y="${112 + 7 * 24}" width="300" height="8" rx="2" fill="#ffd9d9" filter="url(#blur2)"/>
<rect x="160" y="400" width="12" height="16" fill="#4be37a"/>
<ellipse cx="400" cy="258" rx="260" ry="170" fill="#4be37a" opacity=".05" filter="url(#blur10)"/>`)}
${marker(40, 470)}${ruler(560, 540)}`);

// 10. Cartela vazia e amassada no fundo da lixeira
let crumb = '';
for (let i = 0; i < 10; i++) {
  const cx = 28 + (i % 5) * 34, cy = 28 + Math.floor(i / 5) * 40;
  crumb += `<ellipse cx="${cx}" cy="${cy}" rx="12" ry="11" fill="#5c636e"/><path d="M${cx - 10} ${cy - 3} l7 5 l-3 7 l9 -3" stroke="#2a2f36" stroke-width="2" fill="none"/>`;
}
let powder = '';
for (let i = 0; i < 70; i++) {
  const a = (i * 137.5 * Math.PI) / 180, r = 18 + ((i * 29) % 120);
  powder += `<circle cx="${(400 + Math.cos(a) * r * 1.4).toFixed(1)}" cy="${(330 + Math.sin(a) * r * 0.7).toFixed(1)}" r="${(1 + (i % 3) * 0.8).toFixed(1)}" fill="#f2f2f0" opacity=".75"/>`;
}
files['cartela.svg'] = svg(`
<ellipse cx="400" cy="300" rx="380" ry="290" fill="url(#binOuter)"/>
${Array.from({ length: 9 }, (_, i) => `<ellipse cx="400" cy="${300 + i * 4}" rx="${360 - i * 30}" ry="${270 - i * 22}" fill="none" stroke="#c6ced8" stroke-opacity="${0.18 - i * 0.012}" stroke-width="2"/>`).join('')}
<ellipse cx="400" cy="330" rx="200" ry="120" fill="url(#binFloor)"/>
<g filter="url(#blur2)" opacity=".9">${powder}</g>
<g transform="translate(300 270) rotate(-16)" filter="url(#shadow)">
  <path d="M0 6 L60 -6 L120 8 L196 0 L190 50 L198 92 L120 100 L50 88 L4 96 L10 48 Z" fill="url(#foilC)" stroke="#e5ebf3" stroke-opacity=".5"/>
  <path d="M60 -6 L52 92 M120 8 L118 100" stroke="#6b7480" stroke-width="2" opacity=".6"/>
  ${crumb}
</g>
<path d="M120 120 Q400 20 690 130" stroke="#fff" stroke-opacity=".12" stroke-width="18" fill="none" filter="url(#blur4)"/>
${marker(600, 430)}`,
`<radialGradient id="binOuter" cx="50%" cy="45%"><stop offset="0" stop-color="#1b2028"/><stop offset=".7" stop-color="#4a535f"/><stop offset=".86" stop-color="#9aa5b2"/><stop offset=".93" stop-color="#d7dee6"/><stop offset="1" stop-color="#2a3038"/></radialGradient>
<radialGradient id="binFloor"><stop offset="0" stop-color="#2a3038"/><stop offset="1" stop-color="#14181e"/></radialGradient>
<linearGradient id="foilC" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9dee6"/><stop offset=".35" stop-color="#7d8794"/><stop offset=".6" stop-color="#c3cbd5"/><stop offset="1" stop-color="#6b7480"/></linearGradient>`);

for (const [name, content] of Object.entries(files)) {
  writeFileSync(`${OUT}/${name}`, content);
  console.log('wrote', name, content.length);
}
