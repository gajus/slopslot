import { BADGES, level, newGame, progress, rank, settle } from './rewards.js';
import { desktopCabinet, SYMBOLS, terminalCabinet } from './art.js';

const STOP_TICKS = [20, 30, 40];
let reels = ['7', '7', '7'];
let targets = [];
let timer;
let celebrationTimer;
let celebration = 0;
let tick = 0;
let spinning = false;
let enabled = true;
let cabinetOpen = false;
let game = newGame();
let message = 'Your next prompt is a free spin';

function symbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function stop() {
  if (timer) timer.cancel();
  timer = undefined;
  spinning = false;
  if (celebrationTimer) celebrationTimer.cancel();
  celebrationTimer = undefined;
  celebration = 0;
}

function celebrate($) {
  if (!game.last?.points) return;
  celebration = 1;
  celebrationTimer = $.clock.every(50, () => {
    celebration += 1;
    if (celebration > 24) {
      celebrationTimer.cancel();
      celebrationTimer = undefined;
      celebration = 0;
    }
    $.ui.invalidate('ui.render');
  });
}

function finish() {
  reels = [...targets];
  game = settle(game, reels);
  const { title, points, base, multiplier, xp } = game.last;
  message = `${title}${base && multiplier > 1 ? ` ×${multiplier}` : ''}  ${points ? `+${points} pts` : `+${xp} XP`}`;
  stop();
}

function spin($) {
  // Settle a previous spin before replacing its timer, including rapid submissions.
  if (spinning) finish();
  stop();
  targets = [symbol(), symbol(), symbol()];
  reels = [symbol(), symbol(), symbol()];
  tick = 0;
  game = { ...game, spins: game.spins + 1 };
  spinning = true;
  message = 'Spinning…';
  $.ui.invalidate('ui.render');
  timer = $.clock.every(50, () => {
    tick += 1;
    reels = reels.map((value, index) => tick >= STOP_TICKS[index]
      ? targets[index] : symbol());
    if (tick >= STOP_TICKS[2]) {
      finish();
      celebrate($);
    }
    $.ui.invalidate('ui.render');
  });
}

async function closeCabinet($) {
  cabinetOpen = false;
  await $.ui.close({ id: 'slopslot-cabinet' });
  $.ui.invalidate('ui.render');
}

async function renderCabinet($, e, next) {
  const pane = e.component === 'Pane';
  const other = pane ? null : await next(e);
  const maxRows = pane ? 14 : e.props.maxRows;
  if (!enabled || e.props.hasSurvey || (!pane && cabinetOpen)) return other;
  const { Box, Text, Button, Raster, Svg } = $.ui.resolve(e);
  const columns = e.props.bodyColumns ?? e.viewport.columns;
  const narrow = columns < 60;
  const compact = columns < 34 || maxRows < 3;
  const graphical = !compact && (e.surface === 'desktop' || (e.surface === 'terminal' && columns >= 38 && maxRows >= 7));
  const art = {
    reels, spinning, tick, stops: STOP_TICKS, celebration,
    jackpot: game.last?.base === 100,
    score: game.score, xp: game.xp, title: message,
  };
  // Fruit emoji occupy two terminal cells; pad the single-cell seven to match.
  const display = reels.map((value, index) => {
    const face = value === '7' ? '7 ' : value;
    // Settled reels visibly lock while the remaining reels keep tumbling.
    return spinning && tick < STOP_TICKS[index] ? `⟦ ${face} ⟧` : `[ ${face} ]`;
  }).join(' ');
  const winning = !spinning && game.last?.base > 0;
  const color = spinning ? 'yellow' : winning ? 'green' : 'cyan';
  const details = !spinning && game.last ? [
    ...game.last.earned.map(badge => `◆ ${badge.name} +${badge.reward}`),
    ...(game.last.gift ? ['🎁 Five-spin gift +25'] : []),
    ...(game.last.levelBonus ? [`↑ Level ${level(game.xp)}! +25`] : []),
  ] : [];
  const rows = compact ? [
    Text({ bold: true, color, wrap: 'truncate-end', children: [`${reels.map(value => value === '7' ? '7 ' : value).join(' │ ')}  ${game.score} pts`] }),
    Text({ dimColor: true, wrap: 'truncate-end', children: [spinning ? 'Spinning…' : message] }),
  ] : [
    Box({ flexDirection: 'row', columnGap: 2, children: [
      Text({ bold: true, color: 'magenta', wrap: 'truncate-end', children: [narrow
        ? `✦ SLOPSLOT  ${game.score} pts · LV ${level(game.xp)}`
        : `✦ SLOPSLOT  ${game.score} pts · LV ${level(game.xp)} ${rank(game.xp)} · #${game.spins}${game.streak >= 2 ? ` · 🔥 ${Math.min(game.streak, 3)}×` : ''}`] }),
      ...(!spinning && columns >= 75 ? [Button({ key: 'slopslot-spin', label: 'Spin', onPress: () => spin($) })] : []),
      ...(pane && columns >= 75 ? [Button({ key: 'slopslot-close', label: 'Close', onPress: () => closeCabinet($) })] : []),
    ] }),
    ...(graphical ? [e.surface === 'terminal'
      ? Raster(terminalCabinet(art, columns, Math.min(5, maxRows - 3)))
      : Svg({ source: desktopCabinet(art), alt: `Slot machine: ${reels.join(', ')}. ${message}`, width: Math.min(560, columns * 8), height: Math.min(192, columns * 8 * 192 / 560), isInteractive: true }),
    Text({ bold: true, color, wrap: 'truncate-end', children: [message] }),
    ] : [Text({ bold: true, color, wrap: 'truncate-end', children: [narrow ? display : `${display}  ${message}`] })]),
    Text({ dimColor: !details.length, color: details.length ? 'yellow' : 'cyan', wrap: 'truncate-end', children: [narrow
      ? (details.length ? details[0] : graphical ? `${game.xp % 100}/100 XP · 🎁 ${5 - game.settled % 5} to gift` : spinning ? `Spinning… · ${game.xp % 100}/100 XP` : message)
      : details.length && graphical ? details.join('  ·  ') : `XP ${progress(game.xp)} ${game.xp % 100}/100  ·  🎁 ${5 - game.settled % 5} to gift  ·  ◆ ${game.badges.length}/${BADGES.length}${details.length && maxRows < 4 ? `  ·  ${details[0]}` : ''}`] }),
    ...(!graphical && !narrow && details.length && maxRows >= 4 ? [
      Text({ color: 'yellow', wrap: 'truncate-end', children: [details.join('  ·  ')] }),
    ] : []),
  ];
  return Box({
    flexDirection: 'column',
    children: [
      other,
      ...rows,
    ],
  });
}

export function register(on) {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'slopslot',
      description: 'Play SlopSlot, check rewards, or use on, off, reset, or status',
      argumentHint: '[spin|cabinet|rewards|on|off|reset|status]',
    });
    return next(e);
  });

  on('prompt.submit', ($, e, next) => {
    if (enabled) spin($);
    return next(e);
  });

  on('command.run', { command: 'slopslot' }, async ($, e) => {
    const action = e.args.trim().toLowerCase() || 'spin';
    if (action === 'off') {
      if (spinning) finish();
      stop();
      enabled = false;
      if (cabinetOpen) await closeCabinet($);
    } else if (action === 'on') {
      enabled = true;
    } else if (action === 'reset') {
      stop();
      reels = ['7', '7', '7'];
      game = newGame();
      message = 'Your next prompt is a free spin';
    } else if (action === 'spin') {
      enabled = true;
      spin($);
    } else if (action === 'cabinet') {
      enabled = true;
      const opened = await $.ui.open({ id: 'slopslot-cabinet', title: 'SlopSlot', rows: 12, closeOnEscape: true });
      cabinetOpen = opened.isPlaced;
      $.ui.invalidate('ui.render');
      return {};
    } else if (action === 'rewards') {
      return { text: [
        `LEVEL ${level(game.xp)} · ${rank(game.xp)} · ${game.xp % 100}/100 XP`,
        'Every spin: +20 XP. Matching reels: +10 extra XP.',
        'Pair: 10 pts · Triple: 50 pts · Sevens: 100 pts.',
        'Consecutive wins: ×2, then ×3 maximum. A miss resets the streak.',
        'Every 5 settled spins: +25 pts. Every level: +25 pts.',
        `BADGES ${game.badges.length}/${BADGES.length} (one-time bonuses)`,
        ...BADGES.map(badge => `${game.badges.includes(badge.id) ? '◆' : '◇'} ${badge.name} +${badge.reward} pts — ${badge.goal}`),
      ].join('\n') };
    } else if (action !== 'status') {
      return { text: 'Usage: /slopslot [spin|cabinet|rewards|on|off|reset|status]' };
    }
    $.ui.invalidate('ui.render');
    return { text: `SlopSlot ${enabled ? 'on' : 'off'} · ${game.spins} spins · ${game.score} points · Level ${level(game.xp)} ${rank(game.xp)} · ${game.xp % 100}/100 XP · ${game.badges.length}/${BADGES.length} badges · Best +${game.best}` };
  });

  on('ui.render', { component: 'AbovePrompt' }, ($, e, next) => renderCabinet($, e, next));

  on('ui.render', { component: 'Pane' }, ($, e, next) => {
    if (e.requestId !== 'slopslot-cabinet') return next(e);
    return renderCabinet($, e, next);
  });

  on('ui.close', { id: 'slopslot-cabinet' }, ($, e, next) => {
    cabinetOpen = false;
    $.ui.invalidate('ui.render');
    return next(e);
  });

  on('session.end', ($, e, next) => {
    cabinetOpen = false;
    if (spinning) finish();
    else stop();
    return next(e);
  });
}
