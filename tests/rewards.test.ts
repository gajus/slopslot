import { expect, test } from 'claude-code/testing';
import { level, newGame, rank, settle } from '../hooks/rewards.js';

const MISS = ['🍒', '🍋', '⭐'];
const PAIR = ['🍒', '🍒', '⭐'];

test('misses earn XP and the welcome badge only pays once', () => {
  const first = settle(newGame(), MISS);
  expect(first.xp).toBe(20);
  expect(first.score).toBe(5);
  expect(first.badges).toEqual(['first']);
  const second = settle(first, MISS);
  expect(second.xp).toBe(40);
  expect(second.score).toBe(5);
  expect(second.last.earned).toEqual([]);
});

test('wins build a capped multiplier and a miss resets it', () => {
  let game = settle(newGame(), PAIR);
  expect(game.last.base).toBe(10);
  expect(game.last.points).toBe(30); // 10 base + welcome 5 + pair badge 15
  game = settle(game, PAIR);
  expect(game.last.multiplier).toBe(2);
  expect(game.last.points).toBe(20);
  game = settle(game, PAIR);
  expect(game.last.multiplier).toBe(3);
  expect(game.badges).toContain('streak');
  game = settle(game, PAIR);
  expect(game.last.multiplier).toBe(3);
  game = settle(game, MISS);
  expect(game.streak).toBe(0);
  game = settle(game, PAIR);
  expect(game.last.multiplier).toBe(1);
});

test('five-spin gifts and level bonuses stack and recur', () => {
  let game = newGame();
  for (let i = 0; i < 5; i++) game = settle(game, MISS);
  expect(game.last.gift).toBe(25);
  expect(game.last.levelBonus).toBe(25);
  expect(game.score).toBe(55);
  expect(level(game.xp)).toBe(2);
  game = settle(game, MISS);
  expect(game.last.gift).toBe(0);
  expect(game.last.levelBonus).toBe(0);
  for (let i = 0; i < 4; i++) game = settle(game, MISS);
  expect(game.last.gift).toBe(25);
  expect(game.last.levelBonus).toBe(25);
  expect(game.badges).toContain('level');
  expect(rank(game.xp)).toBe('Regular');
});

test('triples and jackpots get their own one-time rewards', () => {
  const triple = settle(newGame(), ['⭐', '⭐', '⭐']);
  expect(triple.last.base).toBe(50);
  expect(triple.last.points).toBe(105);
  const jackpot = settle(newGame(), ['7', '7', '7']);
  expect(jackpot.last.title).toBe('JACKPOT!');
  expect(jackpot.last.points).toBe(255);
  expect(jackpot.badges).toEqual(['first', 'triple', 'jackpot']);
  const repeat = settle(jackpot, ['7', '7', '7']);
  expect(repeat.last.points).toBe(200);
  expect(repeat.last.earned).toEqual([]);
  expect(repeat.best).toBe(255);
});
