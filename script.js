/* ===== Lógica do painel de controle =====
   O painel NÃO depende do estado "js" da demonstração: ele sempre funciona. */
(function () {
  'use strict';

  const demo = document.getElementById('demo');
  const vazio = document.getElementById('vazio');
  const painel = document.getElementById('painel');
  const aba = document.getElementById('painel-aba');
  const status = document.getElementById('painel-status');

  const estado = { html: true, css: true, js: true };

  /* Abrir / fechar painel */
  aba.addEventListener('click', () => {
    const aberto = painel.classList.toggle('aberto');
    aba.setAttribute('aria-expanded', String(aberto));
  });

  /* Toggles */
  function aplicar() {
    demo.hidden = !estado.html;
    vazio.hidden = estado.html;
    demo.classList.toggle('css-off', !estado.css);

    const desligados = Object.keys(estado).filter(k => !estado[k]).map(k => k.toUpperCase());
    status.textContent = desligados.length ? 'DESLIGADO: ' + desligados.join(' + ') : 'TUDO ATIVO';
  }

  document.querySelectorAll('#painel .toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const alvo = btn.dataset.alvo;
      estado[alvo] = !estado[alvo];
      btn.classList.toggle('on', estado[alvo]);
      btn.classList.toggle('off', !estado[alvo]);
      btn.textContent = estado[alvo] ? 'LIGADO' : 'DESLIGADO';
      btn.setAttribute('aria-checked', String(estado[alvo]));
      aplicar();
    });
  });

  /* ===== Interações da demonstração =====
     Cada handler passa por "quando", que ignora o evento se o JS estiver desligado. */
  function quando(el, evento, fn) {
    el.addEventListener(evento, e => { if (estado.js) fn(e); });
  }
  const $ = id => document.getElementById(id);

  /* Modo claro / escuro (só altera o atributo em #demo, nunca no painel) */
  const btnTema = $('btn-tema');
  quando(btnTema, 'click', () => {
    const claro = demo.dataset.theme === 'dark';
    demo.dataset.theme = claro ? 'light' : 'dark';
    btnTema.textContent = claro ? 'MODO ESCURO' : 'MODO CLARO';
  });

  /* Botão 1: muda de cor */
  const bCor = $('b-cor');
  let cor = 0;
  quando(bCor, 'click', () => {
    bCor.classList.remove('cor-1', 'cor-2', 'cor-3');
    cor = (cor % 3) + 1;
    bCor.classList.add('cor-' + cor);
  });

  /* Botão 2: aumenta / volta ao tamanho normal */
  const bEscala = $('b-escala');
  quando(bEscala, 'click', () => {
    const grande = bEscala.classList.toggle('grande');
    bEscala.textContent = grande ? '2. DIMINUIR' : '2. AUMENTAR';
  });

  /* Botão 3: altera a forma da borda */
  quando($('b-forma'), 'click', e => e.currentTarget.classList.toggle('forma'));

  /* Botão 4: hover dinâmico (texto + tremor) */
  const bHover = $('b-hover');
  quando(bHover, 'mouseenter', () => {
    bHover.textContent = '4. TREMENDO!';
    bHover.classList.add('tremer');
  });
  quando(bHover, 'mouseleave', () => {
    bHover.textContent = '4. PASSE O MOUSE';
    bHover.classList.remove('tremer');
  });
  /* Se o JS for desligado com o mouse em cima, o botão volta ao normal */
  bHover.addEventListener('mouseleave', () => {
    bHover.textContent = '4. PASSE O MOUSE';
    bHover.classList.remove('tremer');
  });

  /* Botão 5: popup pixelado */
  const popup = $('popup');
  quando($('b-alerta'), 'click', () => { popup.hidden = false; });
  quando($('popup-fechar'), 'click', () => { popup.hidden = true; });

  /* Contador */
  const valor = $('c-valor');
  let n = 0;
  const mostrar = () => { valor.textContent = n; };
  quando($('c-mais'), 'click', () => { n++; mostrar(); });
  quando($('c-menos'), 'click', () => { n--; mostrar(); });
  quando($('c-zero'), 'click', () => { n = 0; mostrar(); });

  /* Menu de navegação: destaca o link clicado */
  const links = document.querySelectorAll('#demo .menu-link');
  links.forEach(link => {
    quando(link, 'click', () => {
      links.forEach(l => l.classList.remove('ativo'));
      link.classList.add('ativo');
    });
  });

  aplicar();
})();