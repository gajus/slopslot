import { expect, mock, test } from 'claude-code/testing';

const BAND = {
  plugin: 'slopslot',
  component: 'AbovePrompt',
  surface: 'terminal',
  viewport: { columns: 100, rows: 30 },
  props: { bodyColumns: 100, maxRows: 8, hasSurvey: false, isWorking: false, view: {} },
} as const;

test('registers /slopslot and manual spins finish without a model request', async ($, on) => {
  const clock = mock.clock(on);
  let registered = false;
  on('command.register', ($, e) => {
    registered = e.name === 'slopslot';
    return { value: undefined };
  });
  on('session.start', () => ({ cwd: '/work' }));
  await $.session.start({ cwd: '/work' });
  expect(registered).toBe(true);
  expect((await $.command.run({ command: 'slopslot', args: '' })).text).toMatch(/1 spins/);
  await clock.advance(2000);
  expect((await $.command.run({ command: 'slopslot', args: 'status' })).text).toMatch(/1 spins/);
});

test('a prompt passes through immediately and the reels settle after two seconds', async ($, on) => {
  const clock = mock.clock(on);
  on('prompt.submit', ($, e) => ({ text: e.text }));
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['Other mod'] }));
  const result = await $.prompt.submit({ text: 'Keep my prompt exactly as typed' });
  expect(result.text).toBe('Keep my prompt exactly as typed');
  const ui = await $.ui.mount(BAND);
  expect(await ui.find({ type: 'Text', text: /Spinning/ })).toBeDefined();
  expect(await ui.find({ type: 'Text', text: 'Other mod' })).toBeDefined();
  await clock.advance(1900);
  expect(await ui.find({ type: 'Text', text: /Spinning/ })).toBeDefined();
  await clock.advance(100);
  expect(await ui.find({ type: 'Text', text: /Spinning/ })).toBeUndefined();
  expect(await ui.find({ type: 'Text', text: /#1/ })).toBeDefined();
  await ui.unmount();
});

test('rapid prompts replace the animation and reset cancels pending scoring', async ($, on) => {
  const clock = mock.clock(on);
  on('prompt.submit', ($, e) => ({ text: e.text }));
  await $.prompt.submit({ text: 'One' });
  await clock.advance(500);
  await $.prompt.submit({ text: 'Two' });
  expect((await $.command.run({ command: 'slopslot', args: 'status' })).text).toMatch(/2 spins/);
  await $.command.run({ command: 'slopslot', args: 'reset' });
  await clock.advance(5000);
  expect((await $.command.run({ command: 'slopslot', args: 'status' })).text).toBe('SlopSlot on · 0 spins · 0 points · Level 1 Rookie · 0/100 XP · 0/6 badges · Best +0');
});

test('off hides the machine and prompts no longer spin; on restores it', async ($, on) => {
  mock.clock(on);
  on('prompt.submit', ($, e) => ({ text: e.text }));
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['Other mod'] }));
  await $.command.run({ command: 'slopslot', args: 'off' });
  const ui = await $.ui.mount(BAND);
  expect(await ui.find({ type: 'Text', text: /SLOT/ })).toBeUndefined();
  expect(await ui.find({ type: 'Text', text: 'Other mod' })).toBeDefined();
  await $.prompt.submit({ text: 'No spin' });
  expect((await $.command.run({ command: 'slopslot', args: 'status' })).text).toBe('SlopSlot off · 0 spins · 0 points · Level 1 Rookie · 0/100 XP · 0/6 badges · Best +0');
  await $.command.run({ command: 'slopslot', args: 'on' });
  expect(await ui.find({ type: 'Text', text: /SLOT/ })).toBeDefined();
  await ui.unmount();
});

test('desktop and narrow terminals render the reels', async ($, on) => {
  mock.clock(on);
  on('ui.render', () => ({ type: 'Text', props: {}, children: [] }));
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface, props: { ...BAND.props, bodyColumns: 40 } });
    expect(await ui.find({ type: 'Text', text: /0 pts/ })).toBeDefined();
    await ui.unmount();
  }
});

test('the spin button starts a spin and rewards lists earned badges', async ($, on) => {
  const clock = mock.clock(on);
  on('ui.render', () => ({ type: 'Text', props: {}, children: [] }));
  const ui = await $.ui.mount(BAND);
  await ui.press({ key: 'slopslot-spin' });
  expect(await ui.find({ type: 'Text', text: /Spinning/ })).toBeDefined();
  await clock.advance(2000);
  const rewards = await $.command.run({ command: 'slopslot', args: 'rewards' });
  expect(rewards.text).toContain('◆ First pull +5 pts');
  expect(await ui.find({ type: 'Text', text: /First pull/ })).toBeDefined();
  await ui.unmount();
});

test('tiny displays use two rows and surveys keep their band', async ($, on) => {
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['Survey'] }));
  const tiny = await $.ui.mount({ ...BAND, props: { ...BAND.props, bodyColumns: 28, maxRows: 2 } });
  expect(await tiny.find({ type: 'Text', text: /0 pts/ })).toBeDefined();
  await tiny.unmount();
  const survey = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true } });
  expect(await survey.find({ type: 'Text', text: /SLOT/ })).toBeUndefined();
  expect(await survey.find({ type: 'Text', text: 'Survey' })).toBeDefined();
  await survey.unmount();
});

test('terminal pixels scroll, celebrate, and stop repainting without awarding extra points', async ($, on) => {
  const clock = mock.clock(on);
  on('ui.render', () => ({ type: 'Text', props: {}, children: [] }));
  const ui = await $.ui.mount(BAND);
  const idle = await ui.find({ type: 'Raster' });
  expect(idle).toBeDefined();
  await ui.press({ key: 'slopslot-spin' });
  const moving = await ui.find({ type: 'Raster' });
  await clock.advance(100);
  expect((await ui.find({ type: 'Raster' })).props.cells).not.toBe(moving.props.cells);
  await clock.advance(1900);
  const status = (await $.command.run({ command: 'slopslot', args: 'status' })).text;
  const reward = (await ui.find({ type: 'Raster' })).props.cells;
  await clock.advance(200);
  expect((await ui.find({ type: 'Raster' })).props.cells).not.toBe(reward);
  await clock.advance(1200);
  const settled = (await ui.find({ type: 'Raster' })).props.cells;
  await clock.advance(2000);
  expect((await ui.find({ type: 'Raster' })).props.cells).toBe(settled);
  expect((await $.command.run({ command: 'slopslot', args: 'status' })).text).toBe(status);
  await ui.unmount();
});

test('desktop gets SVG artwork while terminals get pixel art', async ($, on) => {
  mock.clock(on);
  on('ui.render', () => ({ type: 'Text', props: {}, children: [] }));
  const desktop = await $.ui.mount({ ...BAND, surface: 'desktop' });
  expect((await desktop.find({ type: 'Svg' })).props.source).toContain('<linearGradient');
  expect(await desktop.find({ type: 'Raster' })).toBeUndefined();
  await desktop.unmount();
  const terminal = await $.ui.mount(BAND);
  expect(await terminal.find({ type: 'Raster' })).toBeDefined();
  expect(await terminal.find({ type: 'Svg' })).toBeUndefined();
  await terminal.unmount();
});

test('the cabinet command opens a larger interactive machine', async ($, on) => {
  mock.clock(on);
  let opened;
  on('ui.open', ($, e) => {
    opened = e.id;
    return { value: { isPlaced: true } };
  });
  on('ui.close', () => ({ value: undefined }));
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['Other mod'] }));
  await $.command.run({ command: 'slopslot', args: 'cabinet' });
  expect(opened).toBe('slopslot-cabinet');
  const ui = await $.ui.mount({
    ...BAND,
    component: 'Pane',
    requestId: 'slopslot-cabinet',
    props: { title: 'SlopSlot', bodyColumns: 80, isFocused: true, placement: 'inline', scroll: { offset: 0, bodyRows: 12 }, view: {} },
  });
  expect(await ui.find({ type: 'Raster' })).toBeDefined();
  await ui.press({ key: 'slopslot-spin' });
  expect(await ui.find({ type: 'Text', text: /Spinning/ })).toBeDefined();
  const band = await $.ui.mount(BAND);
  expect(await band.find({ type: 'Raster' })).toBeUndefined();
  await ui.press({ key: 'slopslot-close' });
  expect(await band.find({ type: 'Raster' })).toBeDefined();
  await band.unmount();
  await ui.unmount();
});
