export const BADGES = [
  { id: 'first', name: 'First pull', reward: 5, goal: 'Finish a spin' },
  { id: 'pair', name: 'Double trouble', reward: 15, goal: 'Match two reels' },
  { id: 'triple', name: 'Triple threat', reward: 50, goal: 'Match all three reels' },
  { id: 'jackpot', name: 'Lucky sevens', reward: 100, goal: 'Land three sevens' },
  { id: 'streak', name: 'On fire', reward: 30, goal: 'Win three spins in a row' },
  { id: 'level', name: 'Rising star', reward: 50, goal: 'Reach level 3' },
];

export function newGame() {
  return { spins: 0, settled: 0, score: 0, xp: 0, streak: 0, best: 0, badges: [], last: null };
}

export function level(xp) {
  return Math.floor(xp / 100) + 1;
}

export function rank(xp) {
  return ['Rookie', 'Regular', 'High roller', 'VIP', 'Legend'][Math.min(4, Math.floor((level(xp) - 1) / 2))];
}

export function settle(game, reels) {
  const distinct = new Set(reels).size;
  const jackpot = distinct === 1 && reels[0] === '7';
  const base = distinct === 1 ? (jackpot ? 100 : 50) : distinct === 2 ? 10 : 0;
  const streak = base ? game.streak + 1 : 0;
  const multiplier = base ? Math.min(streak, 3) : 1;
  const settled = game.settled + 1;
  const xp = game.xp + 20 + (base ? 10 : 0);
  const gift = settled % 5 === 0 ? 25 : 0;
  const levelBonus = (level(xp) - level(game.xp)) * 25;
  const earned = BADGES.filter(badge => !game.badges.includes(badge.id) && ({
    first: true,
    pair: distinct === 2,
    triple: distinct === 1,
    jackpot,
    streak: streak >= 3,
    level: level(xp) >= 3,
  })[badge.id]);
  const bonus = gift + levelBonus + earned.reduce((sum, badge) => sum + badge.reward, 0);
  const points = base * multiplier + bonus;
  const title = jackpot ? 'JACKPOT!' : distinct === 1 ? 'Three of a kind!' : base ? 'A pair!' : 'XP collected';
  return {
    ...game, settled, score: game.score + points, xp, streak,
    best: Math.max(game.best, points),
    badges: [...game.badges, ...earned.map(badge => badge.id)],
    last: { title, points, base, multiplier, gift, levelBonus, earned, xp: xp - game.xp },
  };
}

export function progress(value, size = 10) {
  const filled = Math.floor((value % 100) / 100 * size);
  return '━'.repeat(filled) + '─'.repeat(size - filled);
}
