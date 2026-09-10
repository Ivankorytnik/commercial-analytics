(function () {
  const START_KEY = 'atom-project-started-at';
  const PROJECT_DAYS = 90;
  const DAY_MS = 24 * 60 * 60 * 1000;

  function started() {
    return Boolean(localStorage.getItem(START_KEY));
  }

  function ownerCount() {
    if (!started() || typeof DATA === 'undefined') return 0;
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

  function card(key, label, value, sub, percent) {
    const progressHtml = typeof percent === 'number'
      ? `<div class="progress"><div data-extra-progress="${key}" style="width:${Math.max(0, Math.min(100, percent))}%"></div></div>`
      : '';
    return `<div class="card kpi overview-extra-kpi" data-summary-key="${key}"><div class="label">${label}</div><div class="value">${value}</div>${progressHtml}<div class="sub">${sub}</div></div>`;
  }

  function setText(el, value) {
    if (el && el.textContent !== value) el.textContent = value;
  }

  function patchBaseCards(grid) {
    const cards = [...grid.querySelectorAll('.card.kpi:not(.overview-extra-kpi)')];
    cards.forEach(c => {
      const label = c.querySelector('.label')?.textContent?.trim();
      if (label === 'Владельцы назначены') {
        setText(c.querySelector('.value'), `${ownerCount()} / ${DATA.teams.length}`);
        setText(c.querySelector('.sub'), 'по назначенным ответственным в RACI');
      }
      if (label === 'Критические блокеры') {
        const active = started() ? activeBlockers().length : 0;
        setText(c.querySelector('.sub'), `активных всего: ${active}`);
      }
    });
  }

  function updateExtraCard(grid, key, value, sub, percent) {
    const el = grid.querySelector(`[data-summary-key="${key}"]`);
    if (!el) return false;
    setText(el.querySelector('.value'), value);
    setText(el.querySelector('.sub'), sub);
    if (typeof percent === 'number') {
      const bar = el.querySelector(`[data-extra-progress="${key}"]`);
      const width = `${Math.max(0, Math.min(100, percent))}%`;
      if (bar && bar.style.width !== width) bar.style.width = width;
    }
    return true;
  }

  function renderSummary() {
    const grid = document.querySelector('#app .grid');
    const startCard = document.querySelector('#app .project-start-card');
    if (!grid || !startCard || typeof DATA === 'undefined') return;

    patchBaseCards(grid);

    const schedule = scheduleInfo();
    const values = {
      stages: [`${stagesDone()} / ${DATA.stages.length}`, 'статус «Завершено»'],
      dictionary: [`${dictionaryDone()} / ${DATA.dictionary.length}`, 'поля подтверждены как готовые'],
      dod: [`${dodDone()} / ${DATA.dod.length}`, 'условия закрытия проекта'],
      schedule: [`${schedule.percent}%`, schedule.text, schedule.percent]
    };

    const hasAll = ['stages','dictionary','dod','schedule'].every(key => grid.querySelector(`[data-summary-key="${key}"]`));
    if (!hasAll) {
      grid.querySelectorAll('.overview-extra-kpi').forEach(el => el.remove());
      grid.insertAdjacentHTML('beforeend',
        card('stages', 'Этапы завершены', values.stages[0], values.stages[1]) +
        card('dictionary', 'Data Dictionary', values.dictionary[0], values.dictionary[1]) +
        card('dod', 'Definition of Done', values.dod[0], values.dod[1]) +
        card('schedule', 'Срок использован', values.schedule[0], values.schedule[1], values.schedule[2])
      );
      return;
    }

    updateExtraCard(grid, 'stages', values.stages[0], values.stages[1]);
    updateExtraCard(grid, 'dictionary', values.dictionary[0], values.dictionary[1]);
    updateExtraCard(grid, 'dod', values.dod[0], values.dod[1]);
    updateExtraCard(grid, 'schedule', values.schedule[0], values.schedule[1], values.schedule[2]);
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
