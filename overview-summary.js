(function () {
  const START_KEY = 'atom-project-started-at';
  const PROJECT_DAYS = 90;
  const DAY_MS = 24 * 60 * 60 * 1000;

  function started() {
    return Boolean(localStorage.getItem(START_KEY));
  }

  function ownerCount() {
    if (!started() || !window.DATA && typeof DATA === 'undefined') return 0;
    return DATA.teams.filter((_, i) => {
      const value = localStorage.getItem(`atom-responsible-${i}`);
      return value && value !== 'Не назначен';
    }).length;
  }

  function stagesDone() {
    if (!started()) return 0;
    return DATA.stages.filter(s => getStageStatus(s.id) === 'Завершено').length;
  }

  function dictionaryDone() {
    if (!started()) return 0;
    return DATA.dictionary.filter((_, i) => localStorage.getItem(`atom-dictionary-ready-${i}`) === '1').length;
  }

  function dodDone() {
    if (!started()) return 0;
    return DATA.dod.filter((_, i) => localStorage.getItem(`atom-mvp-dod-${i}`) === '1').length;
  }

  function scheduleInfo() {
    if (!started()) return { percent: 0, text: 'отсчет начнется после старта' };
    const start = Number(localStorage.getItem(START_KEY));
    const elapsedMs = Math.max(0, Date.now() - start);
    const elapsedDays = Math.floor(elapsedMs / DAY_MS);
    const percent = Math.min(100, Math.floor((elapsedMs / (PROJECT_DAYS * DAY_MS)) * 100));
    const remainingDays = Math.max(0, PROJECT_DAYS - elapsedDays);
    return {
      percent,
      text: remainingDays > 0 ? `осталось ${remainingDays} дн.` : 'плановый срок истек'
    };
  }

  function card(label, value, sub, percent) {
    const progressHtml = typeof percent === 'number'
      ? `<div class="progress"><div style="width:${Math.max(0, Math.min(100, percent))}%"></div></div>`
      : '';
    return `<div class="card kpi overview-extra-kpi"><div class="label">${label}</div><div class="value">${value}</div>${progressHtml}<div class="sub">${sub}</div></div>`;
  }

  function patchBaseCards(grid) {
    const cards = [...grid.querySelectorAll('.card.kpi:not(.overview-extra-kpi)')];
    cards.forEach(c => {
      const label = c.querySelector('.label')?.textContent?.trim();
      if (label === 'Владельцы назначены') {
        const value = c.querySelector('.value');
        const sub = c.querySelector('.sub');
        if (value) value.textContent = `${ownerCount()} / ${DATA.teams.length}`;
        if (sub) sub.textContent = 'по назначенным ответственным в RACI';
      }
      if (label === 'Критические блокеры') {
        const sub = c.querySelector('.sub');
        if (sub) {
          const active = started() ? activeBlockers().length : 0;
          sub.textContent = `активных всего: ${active}`;
        }
      }
    });
  }

  function renderSummary() {
    const grid = document.querySelector('#app .grid');
    const startCard = document.querySelector('#app .project-start-card');
    if (!grid || !startCard) return;

    patchBaseCards(grid);
    grid.querySelectorAll('.overview-extra-kpi').forEach(el => el.remove());

    const schedule = scheduleInfo();
    const stageTotal = DATA.stages.length;
    const dictionaryTotal = DATA.dictionary.length;
    const dodTotal = DATA.dod.length;

    grid.insertAdjacentHTML('beforeend',
      card('Этапы завершены', `${stagesDone()} / ${stageTotal}`, 'статус «Завершено»') +
      card('Data Dictionary', `${dictionaryDone()} / ${dictionaryTotal}`, 'поля подтверждены как готовые') +
      card('Definition of Done', `${dodDone()} / ${dodTotal}`, 'условия закрытия проекта') +
      card('Срок использован', `${schedule.percent}%`, schedule.text, schedule.percent)
    );
  }

  const appRoot = document.getElementById('app');
  if (appRoot) {
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        renderSummary();
      });
    });
    observer.observe(appRoot, { childList: true });
  }

  setInterval(() => {
    if (document.querySelector('#app .project-start-card')) renderSummary();
  }, 60000);

  renderSummary();
})();
