(function (root) {
  'use strict';
  function parseLines(text) {
    const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) throw new Error('Add at least one chord line.');
    return lines.map((line, index) => {
      const [chord, pulseText, section = 'A'] = line.split('|').map((part) => part.trim());
      const pulses = Number(pulseText);
      if (!chord) throw new Error(`Line ${index + 1} needs a chord.`);
      if (!Number.isFinite(pulses) || pulses <= 0) throw new Error(`Line ${index + 1} needs a positive pulse count.`);
      return { chord, pulses, section: section || 'A' };
    });
  }
  function formatLines(events) { return (events || []).map((event) => `${event.chord} | ${event.pulses} | ${event.section || 'A'}`).join('\n'); }
  function meterFrom(document) {
    const [numerator, denominator] = document.querySelector('#custom-meter').value.split('/').map(Number);
    const groups = document.querySelector('#custom-grouping').value.split('+').map(Number);
    return { numerator, denominator, groups, tempoUnit: denominator };
  }
  function asTrack(preset) {
    return { id: preset.id, title: preset.name, style: `${preset.groove} · custom`, key: 'Custom', meter: `${preset.meter.numerator}/${preset.meter.denominator} (${preset.meter.groups.join('+')})`, meterObject: preset.meter, beatsPerBar: preset.meter.numerator * 4 / preset.meter.denominator, bpm: preset.tempo, groove: preset.groove, seed: preset.seed, description: 'Your private custom progression, generated and stored on this device.', progression: preset.events };
  }
  function create(context = {}) {
    const document = context.document; const $ = (selector) => document.querySelector(selector);
    function status(message) { $('#custom-progression-status').textContent = message; }
    function draft() {
      return root.ProgressionEngine.normalize({ id: `custom-${Date.now()}`, name: $('#custom-progression-name').value || 'My progression', tempo: Number($('#tempo-input').value), groove: $('#groove-select').value, meter: meterFrom(document), events: parseLines($('#custom-progression-text').value), seed: 29 });
    }
    function applyPreset(preset, message) {
      const portable = { id: preset.id, name: preset.name, tempo: preset.tempo, groove: preset.groove, meter: preset.meter, events: preset.events, seed: preset.seed };
      const list = Array.isArray(context.state.customProgressions) ? context.state.customProgressions.filter((item) => item.id !== portable.id) : [];
      context.state.customProgressions = [...list, portable]; context.saveState?.(); context.onApply?.(asTrack(preset)); status(message);
    }
    function exportPreset() {
      const preset = draft(); const blob = new Blob([JSON.stringify({ id: preset.id, name: preset.name, tempo: preset.tempo, meter: preset.meter, groove: preset.groove, seed: preset.seed, events: preset.events }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'backing-lab-preset.json'; link.click(); URL.revokeObjectURL(url); status('Preset exported locally.');
    }
    async function importFile(file) {
      try { const preset = root.ProgressionEngine.importPreset(await file.text()); $('#custom-progression-name').value = preset.name; $('#custom-progression-text').value = formatLines(preset.events); $('#custom-meter').value = `${preset.meter.numerator}/${preset.meter.denominator}`; $('#custom-grouping').value = preset.meter.groups.join('+'); $('#groove-select').value = preset.groove; applyPreset(preset, 'Preset imported and applied.'); } catch (error) { status(error.message); }
    }
    function init() {
      $('#custom-progression-apply')?.addEventListener('click', () => { try { applyPreset(draft(), 'Custom progression applied. Press Play when ready.'); } catch (error) { status(error.message); } });
      $('#custom-progression-export')?.addEventListener('click', () => { try { exportPreset(); } catch (error) { status(error.message); } });
      $('#custom-progression-import')?.addEventListener('click', () => $('#custom-progression-file').click());
      $('#custom-progression-file')?.addEventListener('change', (event) => importFile(event.target.files?.[0]));
      $('#tempo-ramp')?.addEventListener('click', () => { const current = Number($('#tempo-input').value); $('#tempo-input').value = Math.min(240, current + 2); $('#tempo-input').dispatchEvent(new Event('input')); status('Tempo raised by 2 BPM. Undo with the tempo slider if the take was not clean.'); });
    }
    return Object.freeze({ init, draft });
  }
  root.BackingLabView = Object.freeze({ create, parseLines, formatLines, asTrack });
})(typeof globalThis !== 'undefined' ? globalThis : this);
