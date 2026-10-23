(() => {
  'use strict';

  const demo = document.getElementById('demo');
  const modal = document.getElementById('modal');
  const buyModal = document.getElementById('buyModal');
  const modals = [modal, buyModal];
  const panel = document.getElementById('panel');
  const panelTab = document.getElementById('panelTab');
  const hoverBtn = demo.querySelector('[data-action="hover"]');

  // Estado das três "camadas" da página
  const state = { html: true, css: true, js: true };

  // Guarda os nós removidos quando o HTML é desativado
  // (mover os nós preserva os eventos ao reativar)
  let stash = null;

  /* ---------- Utilidades ---------- */
  function closeModal() {
    modals.forEach((m) => { m.hidden = true; });
  }

  function resetHover() {
    hoverBtn.textContent = hoverBtn.dataset.default;
    hoverBtn.classList.remove('is-shaking');
  }

  function renderSwitch(btn, isOn) {
    btn.classList.toggle('on', isOn);
    btn.classList.toggle('off', !isOn);
    btn.setAttribute('aria-checked', String(isOn));
    btn.querySelector('.switch-text').textContent = isOn ? 'LIGADO' : 'DESLIGADO';
  }

  /* ---------- Painel de controle: toggles ---------- */
  function applyLayer(key) {
    closeModal();

    if (key === 'html') {
      if (!state.html) {
        stash = document.createDocumentFragment();
        while (demo.firstChild) stash.appendChild(demo.firstChild);
      } else if (stash) {
        demo.appendChild(stash);
        stash = null;
      }
      demo.classList.toggle('html-off', !state.html);
    }

    if (key === 'css') {
      // Remove só a classe da demo: o painel continua estilizado
      demo.classList.toggle('styled', state.css);
      document.body.classList.toggle('demo-raw', !state.css);
    }

    if (key === 'js' && !state.js) {
      resetHover();
    }

    // Desligar HTML ou JS interrompe a corrida
    if ((key === 'html' && !state.html) || (key === 'js' && !state.js)) {
      stopRace();
    }
  }

  document.querySelectorAll('.switch').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.toggle;
      state[key] = !state[key];
      renderSwitch(btn, state[key]);
      applyLayer(key);
    });
  });

  /* ---------- Painel de controle: recolher/expandir ---------- */
  panelTab.addEventListener('click', () => {
    const collapsed = panel.classList.toggle('collapsed');
    document.body.classList.toggle('panel-closed', collapsed);
    panelTab.innerHTML = collapsed ? '&#9664;' : '&#9654;';
    panelTab.setAttribute('aria-expanded', String(!collapsed));
    panelTab.setAttribute('aria-label', collapsed ? 'Expandir painel' : 'Recolher painel');
  });

  /* ---------- Interações da demonstração ---------- */
  // Delegação de eventos: funciona mesmo depois de remover/recolocar o HTML
  demo.addEventListener('click', (event) => {
    if (!state.js) return; // JavaScript desativado: nada acontece

    if (modals.includes(event.target)) {
      closeModal();
      return;
    }

    const btn = event.target.closest('[data-action]');
    if (!btn) return;

    switch (btn.dataset.action) {
      case 'color':
        btn.classList.toggle('is-alt');
        break;
      case 'scale':
        btn.classList.toggle('is-big');
        break;
      case 'shape':
        btn.classList.toggle('is-shape');
        break;
      case 'modal':
        modal.hidden = false;
        break;
      case 'level':
        if (mode === 'countdown' || mode === 'racing') break; // não troca no meio da corrida
        level = Number(btn.dataset.level);
        demo.querySelectorAll('[data-action="level"]').forEach((b) => {
          const on = b === btn;
          b.classList.toggle('is-selected', on);
          b.setAttribute('aria-pressed', String(on));
        });
        stopRace();
        break;
      case 'race-start':
        startRace();
        break;
      case 'buy':
        buyModal.hidden = false;
        break;
      case 'close':
        closeModal();
        break;
    }
  });

  // Botão 4: hover dinâmico (troca o texto e treme levemente)
  hoverBtn.addEventListener('mouseenter', () => {
    if (!state.js) return;
    hoverBtn.textContent = hoverBtn.dataset.hover;
    hoverBtn.classList.add('is-shaking');
  });
  hoverBtn.addEventListener('mouseleave', resetHover);

  // Esc fecha o popup
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.js) closeModal();
  });
  /* ---------- Mini corrida (vista de cima) ---------- */
  const cv = document.getElementById('raceCanvas');
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const CX = 160, CY = 92, TAU = Math.PI * 2, LAPS = 3;
  // Dificuldades: velocidade do rival (rad/s) e obstáculos [ângulo, faixa]
  const LEVELS = [
    { speed: 5.00, obs: [[2.2, 1.0], [4.4, 1.0]] },
    { speed: 8.00, obs: [[1.2, 0.85], [2.4, 1.15], [3.6, 0.9], [4.8, 1.1]] },
    { speed: 10.00, obs: [[0.9, 1.1], [1.6, 0.85], [2.4, 1.15], [3.2, 0.85], [4.0, 1.15], [5.0, 0.9]] }
  ];
  const OUT = { rx: 140, ry: 76 }, INN = { rx: 78, ry: 30 }, MID = { rx: 109, ry: 53 };
  const hudLap = document.getElementById('gLap');
  const hudTime = document.getElementById('gTime');
  const hudBest = document.getElementById('gBest');
  const keys = {};
  let mode = 'idle'; // idle | countdown | racing | finished
  let me, rival, time, count, msg = '', raf = 0, last = 0;
  let level = 0, obstacles = [];
  const bests = [null, null, null];

  function resetRace() {
    const th0 = Math.atan2(8, MID.rx);
    me = { x: CX + MID.rx, y: CY + 8, a: -Math.PI / 2, v: 0, prog: -th0, prevTh: th0 };
    rival = { prog: -th0, stun: 0 };
    obstacles = LEVELS[level].obs.map(([th, k]) => ({
      x: CX + MID.rx * k * Math.cos(th),
      y: CY + MID.ry * k * Math.sin(th)
    }));
    time = 0;
    count = 3;
  }

  const ell = (r, x, y) => ((x - CX) / r.rx) ** 2 + ((y - CY) / r.ry) ** 2;
  const onTrack = (x, y) => ell(OUT, x, y) <= 1 && ell(INN, x, y) >= 1;

  function rivalPose() {
    const th = -rival.prog, k = 0.92;
    return {
      x: CX + MID.rx * k * Math.cos(th),
      y: CY + MID.ry * k * Math.sin(th),
      a: Math.atan2(-MID.ry * Math.cos(th), MID.rx * Math.sin(th))
    };
  }

  function updateHud() {
    const lap = Math.min(LAPS, Math.max(0, Math.floor(me.prog / TAU)) + 1);
    hudLap.textContent = lap + '/' + LAPS;
    hudTime.textContent = time.toFixed(1);
    hudBest.textContent = bests[level] === null ? '--' : bests[level].toFixed(1) + 's';
  }

  function finish(won) {
    mode = 'finished';
    msg = won ? 'VITORIA!' : 'RIVAL VENCEU!';
    if (won && (bests[level] === null || time < bests[level])) bests[level] = time;
  }

  function update(dt) {
    if (mode === 'countdown') {
      count -= dt;
      if (count <= 0) mode = 'racing';
      return;
    }
    time += dt;
    const up = keys.arrowup || keys.w, down = keys.arrowdown || keys.s;
    const left = keys.arrowleft || keys.a, right = keys.arrowright || keys.d;
    const maxV = onTrack(me.x, me.y) ? 70 : 24;

    if (up) me.v += 90 * dt;
    else if (down) me.v -= 110 * dt;
    else me.v -= Math.sign(me.v) * Math.min(Math.abs(me.v), 40 * dt);
    if (me.v > maxV) me.v = Math.max(maxV, me.v - 160 * dt);
    me.v = Math.max(-25, me.v);

    const steer = (right ? 1 : 0) - (left ? 1 : 0);
    me.a += steer * 2.6 * dt * Math.max(-1, Math.min(1, me.v / 30));
    me.x = Math.min(W - 6, Math.max(6, me.x + Math.cos(me.a) * me.v * dt));
    me.y = Math.min(H - 6, Math.max(6, me.y + Math.sin(me.a) * me.v * dt));

    // Colisão com obstáculos: perde velocidade e é empurrado para fora
    for (const o of obstacles) {
      const dx = me.x - o.x, dy = me.y - o.y, dist = Math.hypot(dx, dy);
      if (dist < 9) {
        me.v *= 0.3;
        const n = dist || 1;
        me.x += (dx / n) * (9.5 - dist);
        me.y += (dy / n) * (9.5 - dist);
      }
    }

    // Progresso: soma o ângulo percorrido ao redor do centro da pista
    const th = Math.atan2(me.y - CY, me.x - CX);
    let d = th - me.prevTh;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    me.prog -= d;
    me.prevTh = th;

    // Rival: velocidade do nível; esbarrar em obstáculo o atrasa
    const rp = rivalPose();
    const near = obstacles.some((o) => Math.hypot(rp.x - o.x, rp.y - o.y) < 9);
    rival.stun = near ? 0.5 : Math.max(0, rival.stun - dt);
    rival.prog += LEVELS[level].speed * (rival.stun > 0 ? 0.45 : 1) * dt;

    updateHud();
    if (me.prog >= LAPS * TAU) finish(true);
    else if (rival.prog >= LAPS * TAU) finish(false);
  }

  function ellipsePath(r) {
    ctx.beginPath();
    ctx.ellipse(CX, CY, r.rx, r.ry, 0, 0, TAU);
  }

  function curb(r) {
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = '#d9776b';
    ellipsePath(r); ctx.stroke();
    ctx.lineDashOffset = 6;
    ctx.strokeStyle = '#fff';
    ellipsePath(r); ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
  }

  function drawKart(x, y, a, color) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(a);
    ctx.fillStyle = '#3b3a4a';
    ctx.fillRect(-6, -5, 4, 3); ctx.fillRect(-6, 2, 4, 3);
    ctx.fillRect(3, -5, 4, 3); ctx.fillRect(3, 2, 4, 3);
    ctx.fillStyle = color;
    ctx.fillRect(-5, -3, 11, 6);
    ctx.fillStyle = '#fbf5e6';
    ctx.fillRect(0, -2, 3, 4);
    ctx.restore();
  }

  function banner(text) {
    ctx.fillStyle = 'rgba(59, 58, 74, .7)';
    ctx.fillRect(0, 64, W, 52);
    ctx.fillStyle = '#fbf5e6';
    ctx.font = "12px 'Press Start 2P', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, CX, 90);
  }

  function draw() {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#93c48d';
    ctx.fillRect(0, 0, W, H);
    ellipsePath(OUT); ctx.fillStyle = '#b9b2a1'; ctx.fill();
    ellipsePath(INN); ctx.fillStyle = '#93c48d'; ctx.fill();
    curb(OUT); curb(INN);

    // Linha de largada quadriculada
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? '#3b3a4a' : '#fff';
      ctx.fillRect(CX + INN.rx + i * 8, CY - 4, 8, 4);
      ctx.fillStyle = i % 2 ? '#fff' : '#3b3a4a';
      ctx.fillRect(CX + INN.rx + i * 8, CY, 8, 4);
    }

    for (const o of obstacles) {
      const ox = Math.round(o.x), oy = Math.round(o.y);
      ctx.fillStyle = '#3b3a4a'; ctx.fillRect(ox - 5, oy - 5, 10, 10);
      ctx.fillStyle = '#e8a35c'; ctx.fillRect(ox - 4, oy - 4, 8, 8);
      ctx.fillStyle = '#fbf5e6'; ctx.fillRect(ox - 4, oy - 1, 8, 2);
    }

    const r = rivalPose();
    drawKart(r.x, r.y, r.a, '#6f9fc8');
    drawKart(me.x, me.y, me.a, '#d9776b');

    if (mode === 'idle') banner('APERTE INICIAR');
    if (mode === 'countdown') banner(String(Math.ceil(count)));
    if (mode === 'finished') banner(msg);
  }

  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000 || 0);
    last = t;
    update(dt);
    draw();
    if (mode === 'countdown' || mode === 'racing') raf = requestAnimationFrame(frame);
  }

  function startRace() {
    cancelAnimationFrame(raf);
    resetRace();
    mode = 'countdown';
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stopRace() {
    cancelAnimationFrame(raf);
    mode = 'idle';
    resetRace();
    updateHud();
    draw();
  }

  document.addEventListener('keydown', (event) => {
    if (!state.js) return;
    const k = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k) &&
        (mode === 'countdown' || mode === 'racing')) {
      event.preventDefault();
    }
    keys[k] = true;
  });
  document.addEventListener('keyup', (event) => { keys[event.key.toLowerCase()] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  stopRace(); // desenha o quadro inicial
})();