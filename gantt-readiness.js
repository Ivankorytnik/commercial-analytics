(function () {
  const COLORS = {
    notStarted: '#dfe7e7',
    low: '#f3c969',
    medium: '#42d7c8',
    high: '#149d91',
    done: '#2ca66f',
    blocker: '#d9534f'
  };

  function readinessColor(status, percent) {
    if (!isStarted()) return COLORS.notStarted;
    if (status === 'Блокер') return COLORS.blocker;
    if (percent >= 100) return COLORS.done;
    if (percent >= 75) return COLORS.high;
    if (percent >= 40) return COLORS.medium;
    if (percent > 0) return COLORS.low;
    return COLORS.notStarted;
  }

  function legendItem(color, text) {
    return `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:16px;margin-bottom:6px"><span style="width:12px;height:12px;border-radius:3px;background:${color};display:inline-block"></span>${text}</span>`;
  }

  window.gantt = function () {
    const plannedStart = isStarted() ? Number(localStorage.getItem(START_KEY)) : Date.now();
    const tasks = [
      [1, 'Цели и KPI', 0, 7],
      [2, 'Команды и владельцы', 0, 14],
      [3, 'Источники лидов', 4, 18],
      [4, 'Единая воронка', 10, 22],
      [5, 'Data Dictionary', 15, 31],
      [6, 'Сквозные ID', 22, 38],
      [7, 'Интеграции', 31, 59],
      [8, 'DWH и модель данных', 38, 66],
      [9, 'Контроль качества', 52, 73],
      [10, 'Единый BI-дашборд', 59, 80],
      [11, 'Валидация с бизнесом', 73, 85],
      [12, 'Приемка и закрытие', 84, 90]
    ];
    const weekHeaders = Array.from({ length: 13 }, (_, i) => `<div class="gantt-week">Н${i + 1}</div>`).join('');

    const rows = tasks.map(([id, name, start, end]) => {
      const percent = getStageProgress(id);
      const status = getStageStatus(id);
      const color = readinessColor(status, percent);
      const left = start / 90 * 100;
      const width = Math.max(2, (end - start) / 90 * 100);
      return `<div class="gantt-row">
        <div class="gantt-task">
          <b>${name}</b>
          <small>${formatDate(addDays(plannedStart, start))} - ${formatDate(addDays(plannedStart, end))}</small>
          <small><b>${percent}%</b> · ${status}</small>
        </div>
        <div class="gantt-track">
          <div class="gantt-grid"></div>
          <div class="gantt-bar" title="${name}: ${percent}% · ${status}" style="left:${left}%;width:${width}%;background:${color}"></div>
        </div>
      </div>`;
    }).join('');

    const legend = `<div style="margin:14px 0 18px;padding:12px 14px;background:#fff;border:1px solid #dbe5e5;border-radius:10px;font-size:12px">
      ${legendItem(COLORS.notStarted, '0% Не начато')}
      ${legendItem(COLORS.low, '1-39% Начало')}
      ${legendItem(COLORS.medium, '40-74% В работе')}
      ${legendItem(COLORS.high, '75-99% Близко к завершению')}
      ${legendItem(COLORS.done, '100% Готово')}
      ${legendItem(COLORS.blocker, 'Блокер')}
    </div>`;

    return `<div class="section-title"><h2>Диаграмма Ганта</h2><small>Цвет связан с готовностью каждого этапа</small></div>
      <div class="callout"><b>${isStarted() ? 'Гант рассчитан от фактической даты старта проекта.' : 'Проект еще не запущен.'}</b> ${isStarted() ? 'Цвет каждой полосы меняется автоматически вместе со статусом этапа.' : 'До старта все этапы отображаются нейтральным цветом.'}</div>
      ${legend}
      <div class="gantt-wrap">
        <div class="gantt-head"><div class="gantt-task-head">Этап</div><div class="gantt-weeks">${weekHeaders}</div></div>
        ${rows}
      </div>
      <div class="gantt-footer"><span>Старт: <b>${formatDate(plannedStart)}</b></span><span>Плановое завершение: <b>${formatDate(addDays(plannedStart, 90))}</b></span><span>Срок: <b>3 месяца / 90 дней</b></span></div>`;
  };
})();
