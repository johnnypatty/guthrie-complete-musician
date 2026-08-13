(function (root) {
  'use strict';
  function create({ document, runtime, state, saveState }) {
    const $ = (selector) => document.querySelector(selector);
    let current = null; let replayCount = 0; let seed = 1;
    function optionsFor(type) { if (type === 'interval') return root.EarTrainingEngine.INTERVALS.map((item) => item.name); if (type === 'triad') return root.EarTrainingEngine.TRIADS.map((item) => item.name); return []; }
    async function play() {
      if (!current || replayCount >= current.replayLimit) return;
      const context = await runtime.activate(); const bus = runtime.createBus('ear').node; const start = context.currentTime + .05;
      current.notes.forEach((midi, index) => { const oscillator = context.createOscillator(); const gain = context.createGain(); oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12); gain.gain.setValueAtTime(0, start + index * .5); gain.gain.linearRampToValueAtTime(.16, start + index * .5 + .02); gain.gain.exponentialRampToValueAtTime(.001, start + index * .5 + .42); oscillator.connect(gain); gain.connect(bus); runtime.track(oscillator); oscillator.start(start + index * .5); oscillator.stop(start + index * .5 + .45); });
      replayCount += 1; $('#ear-replays').textContent = `${replayCount} / ${current.replayLimit} plays`;
    }
    function next() {
      const type = $('#ear-type').value; current = root.EarTrainingEngine.prompt({ type, seed: seed++ }); replayCount = 0;
      $('#ear-prompt').textContent = current.text; $('#ear-feedback').textContent = 'Listen first. Say the answer before touching the choices.'; $('#ear-replays').textContent = `0 / ${current.replayLimit} plays`;
      const choices = optionsFor(type); $('#ear-answer').innerHTML = choices.length ? `<label>Answer<select id="ear-choice"><option value="">Choose…</option>${choices.map((choice) => `<option>${choice}</option>`).join('')}</select></label><button id="ear-check" type="button">Check</button>` : '<button id="ear-correct" type="button">I matched it</button><button id="ear-again" type="button">Review again</button>';
      $('#ear-check')?.addEventListener('click', () => show(root.EarTrainingEngine.evaluate(current, $('#ear-choice').value)));
      $('#ear-correct')?.addEventListener('click', () => show(root.EarTrainingEngine.selfConfirm(current, true)));
      $('#ear-again')?.addEventListener('click', () => show(root.EarTrainingEngine.selfConfirm(current, false)));
    }
    function show(result) { $('#ear-feedback').textContent = result.feedback; if (result.reviewItem) { state.reviewItems ||= []; state.reviewItems.push({ ...result.reviewItem, dueAt: new Date(Date.now() + 86400000).toISOString() }); saveState(); } }
    function init() {
      const mount = $('#ear-training-app'); if (!mount) return;
      mount.innerHTML = '<div class="control-row"><label>Exercise<select id="ear-type"><option value="note-match">Note match</option><option value="interval">Intervals</option><option value="triad">Triad quality</option><option value="chord-tone">Sing a chord tone</option><option value="call-response">Call and response</option></select></label><button id="ear-new" type="button">New prompt</button><button id="ear-play" class="button" type="button">Play</button><small id="ear-replays"></small></div><p id="ear-prompt" class="ear-prompt"></p><div id="ear-answer" class="button-row"></div><p id="ear-feedback" class="status-line" aria-live="polite"></p>';
      $('#ear-new').addEventListener('click', next); $('#ear-play').addEventListener('click', play); $('#ear-type').addEventListener('change', next); next();
    }
    return Object.freeze({ init, deactivate() { runtime.stop(); } });
  }
  root.EarTrainingView = Object.freeze({ create });
})(typeof globalThis !== 'undefined' ? globalThis : this);
