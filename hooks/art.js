// Original seven-pixel sprites. One letter is one solid pixel; dots are clear.
export const SYMBOLS = ['🍒', '🍋', '🍇', '🔔', '⭐', '7'];
const SPRITES = [
  ['...gg..', '..g.g..', '.g...g.', 'rr..rr.', 'rwr.rrr', 'rrr.rrr', '.r...r.'],
  ['...gg..', '..yyyy.', '.yywyyy', 'yyyyyyy', 'yyyyyyy', '.yyyyy.', '..yy...'],
  ['...gg..', '..g....', '.pp.pp.', 'ppppppp', '.ppppp.', '..ppp..', '...p...'],
  ['...y...', '..yyy..', '.yyyyy.', '.ywyyy.', '.yyyyy.', 'yyyyyyy', '...y...'],
  ['...y...', '...y...', 'yyyyyyy', '.yyyyy.', '..yyy..', '.yy.yy.', 'yy...yy'],
  ['rrrrrrr', 'wwwwwrr', '....rr.', '...rr..', '..rr...', '..rr...', '..rr...'],
];
const COLORS = { r: 0xff4d75, g: 0x4ade80, y: 0xffd166, p: 0xb28bff, w: 0xffffff };

function escape(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
}

export function terminalCabinet({ reels, spinning, tick, stops, celebration, jackpot }, columns, rows) {
  const width = Math.min(58, columns);
  const height = rows * 2;
  const bg = 0x140d25;
  const pixels = new Uint32Array(width * height).fill(bg);
  const pixel = (x, y, color) => {
    if (x >= 0 && x < width && y >= 0 && y < height) pixels[y * width + x] = color;
  };
  const fill = (x, y, w, h, color) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) pixel(xx, yy, color);
  };
  fill(1, 0, width - 5, height, 0x36204f);
  fill(2, 1, width - 7, height - 2, 0x1d1335);
  // Chasing marquee bulbs become gold when a reward lands.
  for (let x = 2; x < width - 4; x += 2) {
    const lit = (Math.floor(x / 2) + tick + celebration) % 3 === 0;
    const color = celebration ? (lit ? 0xffffff : 0xffd166) : lit ? 0xff70cf : 0x693b87;
    pixel(x, 0, color);
    pixel(x, height - 1, color);
  }
  const reelWidth = Math.floor((width - 12) / 3);
  const windowHeight = height - 2;
  for (let i = 0; i < 3; i++) {
    const x = 4 + i * (reelWidth + 1);
    fill(x, 1, reelWidth, windowHeight, 0xede5ff);
    fill(x, 1, 1, windowHeight, 0xb7a6ce);
    fill(x + reelWidth - 1, 1, 1, windowHeight, 0xb7a6ce);
    const active = spinning && tick < stops[i];
    const scroll = active ? tick % 9 : 0;
    for (let n = active ? -1 : 0; n <= (active ? 1 : 0); n++) {
      const index = active ? (Math.floor(tick / 9) + i + n + 12) % 6 : SYMBOLS.indexOf(reels[i]);
      const sprite = SPRITES[index];
      const top = Math.floor((height - 7) / 2) + n * 9 + scroll;
      for (let sy = 0; sy < 7; sy++) for (let sx = 0; sx < 7; sx++) {
        const y = top + sy;
        if (y > 0 && y < height - 1 && COLORS[sprite[sy][sx]]) {
          pixel(x + Math.floor((reelWidth - 7) / 2) + sx, y, COLORS[sprite[sy][sx]]);
        }
      }
    }
  }
  // Cabinet lever and moving handle, independent of keyboard focus.
  const handleY = spinning ? 2 + tick % Math.max(2, height - 5) : 2;
  fill(width - 4, handleY, 1, height - handleY - 2, 0x9889ad);
  fill(width - 5, handleY, 3, 2, 0xff4d9b);
  if (celebration) {
    for (let i = 0; i < (jackpot ? 18 : 8); i++) {
      const x = (i * 13 + celebration * (i % 2 ? 1 : -1) + width * 8) % width;
      const y = (i * 7 + celebration) % height;
      pixel(x, y, i % 3 ? 0xffd166 : 0xffffff);
      if (jackpot) pixel(x + 1, y, 0xffd166);
    }
  }
  // Half blocks pair two square pixels in one terminal character cell.
  const bytes = new Uint8Array(width * rows * 12);
  const view = new DataView(bytes.buffer);
  for (let y = 0; y < rows; y++) for (let x = 0; x < width; x++) {
    const offset = (y * width + x) * 12;
    view.setUint32(offset, 0x2580, true);
    view.setUint32(offset + 4, pixels[y * 2 * width + x], true);
    view.setUint32(offset + 8, pixels[(y * 2 + 1) * width + x], true);
  }
  return { key: 'slopslot-cabinet', columns: width, rows, cells: bytes.toBase64() };
}

function icon(symbol, x, y, size = 58) {
  const start = `<g transform="translate(${x} ${y}) scale(${size / 64})">`;
  const end = '</g>';
  const shapes = {
    '🍒': '<path d="M20 33Q19 12 39 8Q33 23 46 32" fill="none" stroke="#2aaf73" stroke-width="5"/><path d="M34 12Q47 1 55 12Q42 20 34 12" fill="#58da8b"/><circle cx="18" cy="43" r="15" fill="#f94772"/><circle cx="46" cy="44" r="14" fill="#df2859"/><ellipse cx="13" cy="37" rx="4" ry="6" fill="#ffbacd"/><ellipse cx="42" cy="39" rx="3" ry="5" fill="#ff99b3"/>',
    '🍋': '<path d="M9 25Q21 5 46 16L58 18L57 30Q47 58 20 52L7 53L8 42Q2 33 9 25" fill="#ffd44c" stroke="#e8aa27" stroke-width="2"/><path d="M17 26Q26 16 40 22" fill="none" stroke="#fff7b0" stroke-width="5" stroke-linecap="round"/><path d="M41 15Q43 1 57 6Q55 17 41 15" fill="#45bf7a"/>',
    '🍇': '<path d="M31 16Q29 4 44 4" stroke="#49bd79" stroke-width="5" fill="none"/>' + [[20,24],[38,24],[12,36],[29,36],[46,36],[22,48],[38,48],[30,58]].map(([cx,cy])=>`<circle cx="${cx}" cy="${cy}" r="9" fill="#9e68f2" stroke="#7442c8" stroke-width="2"/><circle cx="${cx-2}" cy="${cy-3}" r="2" fill="#d9baff"/>`).join(''),
    '🔔': '<circle cx="32" cy="9" r="5" fill="#ffe6a0"/><path d="M10 46L17 35V26Q17 10 32 10Q47 10 47 26V35L54 46Z" fill="#ffd15c" stroke="#dca031" stroke-width="2"/><path d="M24 20Q20 27 22 34" stroke="#fff5c4" stroke-width="4" fill="none" stroke-linecap="round"/><rect x="8" y="44" width="48" height="8" rx="4" fill="#f6b943"/><path d="M25 56Q32 65 39 56" fill="#e5a128"/>',
    '⭐': '<path d="M32 3L41 22L62 25L47 40L51 61L32 51L13 61L17 40L2 25L23 22Z" fill="#ffd35e" stroke="#e4a734" stroke-width="2"/><path d="M32 13L35 26L19 29L27 22Z" fill="#fff4b6"/>',
    '7': '<path d="M9 9H56V21L34 58H15L39 25H9Z" fill="#f64d79" stroke="#b42b58" stroke-width="3"/><path d="M14 14H49" stroke="#ffbdcf" stroke-width="4" stroke-linecap="round"/>',
  };
  return start + shapes[symbol] + end;
}

export function desktopCabinet({ reels, spinning, tick, stops, celebration, jackpot, score, xp, title }) {
  const lights = Array.from({ length: 22 }, (_, i) => {
    const lit = (i + tick + celebration) % 3 === 0;
    return `<circle cx="${22+i*24}" cy="19" r="3" fill="${lit ? '#fff1a6' : '#633b87'}"/>`;
  }).join('');
  const windows = reels.map((symbol, i) => {
    const x = 30 + i * 154;
    const active = spinning && tick < stops[i];
    const offset = active ? (tick % 8) * 11 : 0;
    const symbols = active ? [-1, 0, 1].map(n => {
      const which = (Math.floor(tick / 8) + i + n + 12) % 6;
      return icon(SYMBOLS[which], x + 38, 64 + n * 88 + offset, 64);
    }).join('') : icon(symbol, x + 38, 64, 64);
    return `<rect x="${x}" y="49" width="140" height="98" rx="13" fill="url(#reel)" stroke="${!spinning && celebration ? '#ffd166' : '#51416d'}" stroke-width="2"/>
      <g clip-path="url(#clip${i})">${symbols}<rect x="${x}" y="49" width="140" height="98" fill="url(#shade)"/></g>
      <path d="M${x+10} 57H${x+130}" stroke="#fff" opacity=".6"/>
      <circle cx="${x+126}" cy="137" r="2" fill="${active ? '#b8a7c9' : '#40d99c'}"/>`;
  }).join('');
  const coins = celebration ? Array.from({ length: jackpot ? 22 : 9 }, (_, i) => {
    const age = celebration / 24;
    const x = 280 + Math.sin(i*3.1) * age * (jackpot ? 280 : 210);
    const y = 130 - Math.sin(Math.min(1, age) * Math.PI) * (55 + i%5*20) + age * 65;
    const ry = 3 + Math.abs(Math.sin(celebration*.7+i)) * 7;
    return `<g opacity="${Math.max(0,1-age*.7)}"><ellipse cx="${x}" cy="${y}" rx="7" ry="${ry}" fill="#ffcf63" stroke="#fff1ba" stroke-width="2"/><path d="M${x} ${y-ry/2}v${ry}" stroke="#c18b25"/></g>`;
  }).join('') : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="192" viewBox="0 0 560 192" role="img">
    <title>SlopSlot — ${escape(title)}</title>
    <defs>
      <linearGradient id="body" x2="0" y2="1"><stop stop-color="#322044"/><stop offset="1" stop-color="#110c20"/></linearGradient>
      <linearGradient id="reel" x2="0" y2="1"><stop stop-color="#d8cfea"/><stop offset=".4" stop-color="#fff8ff"/><stop offset="1" stop-color="#cfc3e1"/></linearGradient>
      <linearGradient id="shade" x2="0" y2="1"><stop stop-color="#37204c" stop-opacity=".32"/><stop offset=".3" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#37204c" stop-opacity=".35"/></linearGradient>
      ${[0,1,2].map(i=>`<clipPath id="clip${i}"><rect x="${30+i*154}" y="49" width="140" height="98" rx="13"/></clipPath>`).join('')}
    </defs>
    <rect x="2" y="2" width="556" height="188" rx="22" fill="url(#body)" stroke="${celebration ? '#ffd166' : '#985bd2'}" stroke-width="2"/>
    <rect x="9" y="9" width="542" height="174" rx="17" fill="none" stroke="#c58de9" stroke-opacity=".18"/>
    ${lights}
    <text x="28" y="39" fill="#f1d5ff" font-family="monospace" font-size="13" letter-spacing="4" font-weight="bold">SLOPSLOT</text>
    <text x="492" y="38" text-anchor="end" fill="#ffdb89" font-family="monospace" font-size="13">${score} PTS</text>
    ${windows}
    <rect x="520" y="77" width="5" height="60" rx="2" fill="#84738f"/>
    <circle cx="522" cy="${spinning ? 85 + tick%6*6 : 75}" r="12" fill="#f3599d" stroke="#ffa2d0" stroke-width="2"/>
    <text x="30" y="168" fill="${celebration ? '#ffdb89' : '#baa5d1'}" font-family="monospace" font-size="11">${spinning ? 'REELS IN MOTION' : celebration ? 'A LITTLE SOMETHING FOR YOU' : 'FREE PLAY · YOUR NEXT PROMPT IS A SPIN'}</text>
    <rect x="30" y="178" width="460" height="3" rx="1" fill="#3d2b50"/>
    <rect x="30" y="178" width="${460 * (xp%100)/100}" height="3" rx="1" fill="#b48afa"/>
    ${coins}
  </svg>`;
}
