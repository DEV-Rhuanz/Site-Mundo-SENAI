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
})();