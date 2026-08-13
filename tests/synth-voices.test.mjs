import test from 'node:test';
import assert from 'node:assert/strict';
import { FakeAudioContext } from './helpers/fake-audio-context.mjs';

await import('../src/js/synth-voices.js');

function graph() {
  const context = new FakeAudioContext();
  const buses = Object.fromEntries(['harmony', 'bass', 'drums', 'click', 'room'].map((name) => [name, context.createGain()]));
  return { context, buses, voices: globalThis.SynthVoices.create({ context, buses, maxSources: 5 }) };
}

test('renders semantic lanes to their buses and reuses one noise buffer', () => {
  const { context, buses, voices } = graph();
  voices.render({ lane: 'drums', instrument: 'hat', velocity: .6, durationTicks: 24 }, 1, 1 / 192);
  voices.render({ lane: 'drums', instrument: 'snare', velocity: .7, durationTicks: 24 }, 2, 1 / 192);
  voices.render({ lane: 'bass', instrument: 'bass', notes: [40], velocity: .7, durationTicks: 96 }, 3, 1 / 192);
  assert.equal(context.buffers.length, 1, 'noise should be cached');
  assert.ok(context.nodes.some((node) => node.connections.includes(buses.drums)));
  assert.ok(context.nodes.some((node) => node.connections.includes(buses.bass)));
});

test('normalizes unsupported voices, keeps exponential values safe, and caps sources', () => {
  const { context, voices } = graph();
  for (let index = 0; index < 12; index += 1) voices.render({ lane: 'mystery', instrument: 'unknown', notes: [60], velocity: 4, durationTicks: 96 }, index, .01);
  assert.ok(voices.activeCount() <= 5);
  const exponential = context.nodes.flatMap((node) => node.gain?.events || []).filter((event) => event.method === 'exponential');
  assert.ok(exponential.length > 0 && exponential.every((event) => event.value > 0));
  voices.stop(9);
  assert.equal(voices.activeCount(), 0);
});
