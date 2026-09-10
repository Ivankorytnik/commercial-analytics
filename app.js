let DATA;
const app = document.getElementById('app');

fetch('data/project.json').then(r=>r.json()).then(d=>{
  DATA=d;
  updateHeaderProgress();
  render('overview');
});

document.querySelectorAll('.nav').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));
  btn.classList.add('active');
  render(btn.dataset.view);
}));

const badge = s => s==='done' ? '<span class="badge ok">Готово</span>' : s==='work' ? '<span class="badge work">В работе</span>' : '<span class="badge neutral">Не начато</span>';
const progress = p => `<div class="progress"><div style="width:${p}%"></div></div>`;

function updateHeaderProgress(){
  const value = Number(DATA?.progress ?? 0);
  const safe = Math.max(0, Math.min(100, value));
  const label = document.getElementById('header-progress');
  const bar = document.getElementById('header-progress-bar');
  if(label) label.textContent = `${safe}%`;
  if(bar) bar.style.width = `${safe}%`;
}

function render(view){
  const views={overview,roadmap,teams,sources,funnel,dictionary,issues,dod};
  app.innerHTML=views[view]();
  bindChecks();
}

function overview(){return `
  <div class="grid">
    <div class="card kpi"><div class="label">Готовность проекта</div><div class="value">${DATA.progress}%</div>${progress(DATA.progress)}<div class="sub">до принятого единого дашборда</div></div>
    <div class="card kpi"><div class="label">Источники определены</div><div class="value">${DATA.sources_ready} / ${DATA.sources}</div><div class="sub">нужна полная инвентаризация</div></div>
    <div class="card kpi"><div class="label">Владельцы назначены</div><div class="value">${DATA.owners_ready} / ${DATA.owners}</div><div class="sub">RACI должен быть закрыт</div></div>
    <div class="card kpi"><div class="label">Критические блокеры</div><div class="value">${DATA.critical_blockers}</div><div class="sub">мешают сквозной связке</div></div>
  </div>
  <div class="section-title"><h2>Цель проекта</h2></div>
  <div class="callout"><b>${DATA.goal}</b><br><br>Проект закрывается только после приемки единого рабочего дашборда.</div>
  <div class="section-title"><h2>Следующие действия</h2><small>Рекомендуемый порядок</small></div>
  <div class="checklist">
    ${['Назначить владельцев Метрик, ELMA, Альфа-Авто, DATA, 1С и BI','Зафиксировать единую воронку B2B/B2C','Проверить передачу Lead ID из ELMA в Альфа-Авто','Определить Master Client ID','Согласовать состав полей и Data Dictionary','Согласовать целевую схему DWH → BI'].map((x,i)=>`<label class="check"><input type="checkbox" data-key="next-${i}"><span>${x}</span></label>`).join('')}
  </div>`}

function roadmap(){return `<div class="section-title"><h2>Этапы проекта</h2><small>0 → единый дашборд</small></div><table class="table"><thead><tr><th>#</th><th>Этап</th><th>Статус</th><th>Готовность</th></tr></thead><tbody>${DATA.stages.map(s=>`<tr><td>${s.id}</td><td><b>${s.name}</b></td><td>${badge(s.status)}</td><td style="min-width:180px">${s.progress}% ${progress(s.progress)}</td></tr>`).join('')}</tbody></table>`}

function teams(){return `<div class="section-title"><h2>Команды и RACI</h2><small>R делает · A отвечает · C консультирует · I информируется</small></div><table class="table"><thead><tr><th>Команда</th><th>RACI</th><th>Роль в проекте</th><th>Ответственный</th></tr></thead><tbody>${DATA.teams.map(r=>`<tr>${r.map((c,i)=>`<td>${i===0?'<b>'+c+'</b>':c}</td>`).join('')}</tr>`).join('')}</tbody></table>`}

function sources(){return `<div class="section-title"><h2>Источники данных</h2><small>что собираем и куда передаем</small></div><table class="table"><thead><tr><th>Источник</th><th>Данные</th><th>Целевая связка</th><th>Статус</th></tr></thead><tbody>${DATA.sources_list.map(r=>`<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td><td>${badge(r[3])}</td></tr>`).join('')}</tbody></table>`}

function funnel(){return `<div class="section-title"><h2>Сквозной путь клиента</h2><small>контрольная цепочка</small></div><div class="card"><div class="flow">${['Реклама','Сайт','Метрика','ELMA','Квалификация','Альфа-Авто','Договор','1С / Оплата','DWH','BI Dashboard'].map((x,i)=>`${i?'<div class="arrow">→</div>':''}<div class="node"><b>${x}</b></div>`).join('')}</div></div><div class="section-title"><h2>Главный тест</h2></div><div class="callout">Для любого проданного автомобиля должна быть возможность восстановить путь: <b>источник → лид → клиент → сделка → оплата → выдача</b>. Если цепочка рвется, сквозная аналитика не завершена.</div>`}

function dictionary(){return `<div class="section-title"><h2>Data Dictionary</h2><small>минимальный набор для связки</small></div><table class="table"><thead><tr><th>Поле</th><th>Система</th><th>Назначение</th><th>Класс</th></tr></thead><tbody>${DATA.dictionary.map(r=>`<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td><td><span class="badge ${r[3]==='critical'?'bad':'work'}">${r[3]==='critical'?'Критично':'Обязательно'}</span></td></tr>`).join('')}</tbody></table>`}

function issues(){return `<div class="section-title"><h2>Критические блокеры</h2><small>что мешает закрыть проект</small></div><table class="table"><thead><tr><th>Проблема</th><th>Система</th><th>Критичность</th><th>Статус</th></tr></thead><tbody>${DATA.issues.map(r=>`<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td><span class="badge bad">${r[2]}</span></td><td>${r[3]}</td></tr>`).join('')}</tbody></table>`}

function dod(){return `<div class="section-title"><h2>Definition of Done</h2><small>12 условий закрытия проекта</small></div><div class="checklist">${DATA.dod.map((x,i)=>`<label class="check"><input type="checkbox" data-key="dod-${i}"><span><b>${i+1}.</b> ${x}</span></label>`).join('')}</div><div class="callout"><b>Финальное условие:</b> коммерческий директор принимает единый дашборд как рабочий инструмент. После этого проект считается закрытым.</div>`}

function bindChecks(){document.querySelectorAll('input[type=checkbox][data-key]').forEach(el=>{const k='atom-mvp-'+el.dataset.key;el.checked=localStorage.getItem(k)==='1';el.addEventListener('change',()=>localStorage.setItem(k,el.checked?'1':'0'));});}
