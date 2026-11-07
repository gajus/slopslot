import { expect, test } from 'claude-code/testing';
import { desktopCabinet, SYMBOLS, terminalCabinet } from '../hooks/art.js';

test('all six symbols render valid colored pixel cells in small and large cabinets', () => {
  for (const symbol of SYMBOLS) {
    for (const columns of [38, 58]) {
      const raster = terminalCabinet({ reels: [symbol, symbol, symbol], spinning: false, tick: 0, stops: [20,30,40], celebration: 0 }, columns, 5);
      const bytes = Uint8Array.fromBase64(raster.cells);
      const view = new DataView(bytes.buffer);
      expect(bytes.length).toBe(raster.columns * raster.rows * 12);
      for (let offset = 0; offset < bytes.length; offset += 12) {
        expect(view.getUint32(offset, true)).toBe(0x2580);
        expect(view.getUint32(offset + 4, true) < 0x1000000).toBe(true);
        expect(view.getUint32(offset + 8, true) < 0x1000000).toBe(true);
      }
    }
  }
});

test('desktop scrolling and jackpot frames change the artwork', () => {
  const model = { reels: ['7','7','7'], spinning: true, tick: 1, stops: [20,30,40], celebration: 0, jackpot: false, score: 0, xp: 0, title: 'Spinning…' };
  expect(desktopCabinet(model)).not.toBe(desktopCabinet({ ...model, tick: 2 }));
  const won = { ...model, spinning: false, jackpot: true, celebration: 1, title: 'JACKPOT!' };
  expect(desktopCabinet(won)).toContain('<ellipse');
  expect(desktopCabinet(won)).not.toBe(desktopCabinet({ ...won, celebration: 10 }));
});
