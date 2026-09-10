let DATA;
const app = document.getElementById('app');
const START_KEY = 'atom-project-started-at';
const RESPONSIBLES = ['Не назначен','Иван Корытник','Александр Костылев'];
const STAGE_STATUSES = ['Не начато','Подготовка','В работе','Ожидание данных','На согласовании','Блокер','Завершено'];
const STATUS_PROGRESS = {
  'Не начато': 0,
  'Подготовка': 10,
  'В работе': 40,
  'Ожидание данных': 50,
  'На согласовании': 75,
  'Блокер': 50,
  'Завершено': 100
};
let timerHandle = null;

fetch('data/project.json?v=0.5.0').then(r=>r.json()).then(d=>{
  DATA=d;
  updateHeaderProgress();
  render('overview');
  startProjectClock();
});

document.querySelectorAll('.nav').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));
  btn.classList.add('active');
  render(btn.dataset.view);
}));

const badge = s => s==='done' ? '<span class="badge ok">Готово</span>' : s==='work' ? '<span class="badge work">В работе</span>' : '<span class="badge neutral">Не начато</span>';
const progress = p => `<div class="progress"><div style="width:${p}%"></div></div>`;
const isStarted = () => Boolean(localStorage.getItem(START_KEY));

function effectiveStatus(s){return isStarted()?s:'todo';}
function effectiveProgress(p){return isStarted()?p:0;}
function getStageStatus(id){return isStarted() ? (localStorage.getItem(`atom-stage-status-${id}`) || 'Не начато') : 'Не начато';}
function getStageProgress(id){return STATUS_PROGRESS[getStageStatus(id)] || 0;}
function getProjectProgress(){
  if(!isStarted() || !DATA?.stages?.length) return 0;
  const total=DATA.stages.reduce((sum,s)=>sum+getStageProgress(s.id),0);
  return Math.round(total/DATA.stages.length);
}

function updateHeaderProgress(){
  const safe=Math.max(0,Math.min(100,getProjectProgress()));
  const label=document.getElementById('header-progress');
  const bar=document.getElementById('header-progress-bar');
  if(label) label.textContent=`${safe}%`;
  if(bar) bar.style.width=`${safe}%`;
}

function render(view){
  const views={overview,gantt,roadmap,teams,sources,funnel,dictionary,issues,dod};
  app.innerHTML=views[view]();
  bindChecks();
  bindStart();
  bindResponsibles();
  bindStageStatuses();
  updateProjectClock();
  updateHeaderProgress();
}

function formatStart(ts){return new Intl.DateTimeFormat('ru-RU',{dateStyle:'medium',timeStyle:'medium'}).format(new Date(ts));}
function formatDate(ts){return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(new Date(ts));}
function formatElapsed(ms){
  const total=Math.max(0,Math.floor(ms/1000));
  const days=Math.floor(total/86400);
  const hours=Math.floor((total%86400)/3600);
  const mins=Math.floor((total%3600)/60);
  const secs=total%60;
  const pad=n=>String(n).padStart(2,'0');
  return `${days} дн. ${pad(hours)}:${pad(mins)}:${pad(secs)}`;
}
function addDays(ts,days){return ts+days*86400000;}

function startProjectClock(){clearInterval(timerHandle);updateProjectClock();timerHandle=setInterval(updateProjectClock,1000);}
function updateProjectClock(){
  const ts=localStorage.getItem(START_KEY);
  const timer=document.getElementById('project-timer');
  const startAt=document.getElementById('project-start-at');
  const startBtn=document.getElementById('start-project-btn');
  if(!timer && !startAt && !startBtn) return;
  if(!ts){
    if(timer) timer.textContent='00 дн. 00:00:00';
    if(startAt) startAt.textContent='Проект еще не начат';
    if(startBtn){startBtn.disabled=false;startBtn.textContent='Старт проекта';}
    return;
  }
  if(timer) timer.textContent=formatElapsed(Date.now()-Number(ts));
  if(startAt) startAt.textContent=`Старт: ${formatStart(Number(ts))}`;
  if(startBtn){startBtn.disabled=true;startBtn.textContent='Проект запущен';}
}
function bindStart(){
  const btn=document.getElementById('start-project-btn');
  if(!btn) return;
  btn.addEventListener('click',()=>{
    if(isStarted()) return;
    localStorage.setItem(START_KEY,String(Date.now()));
    DATA.stages.forEach(s=>localStorage.setItem(`atom-stage-status-${s.id}`,'Не начато'));
    render('overview');
  });
}

function overview(){
  const started=isStarted();
  const projectProgress=getProjectProgress();
  const sourcesReady=started?DATA.sources_ready:0;
  const ownersReady=started?DATA.owners_ready:0;
  const blockers=started?DATA.critical_blockers:0;
  return `<div class="project-start-card"><div><div class="label">Статус проекта</div><div class="project-state">${started?'Проект запущен':'Не начат'}</div><div id="project-start-at" class="start-meta">Проект еще не начат</div></div><div class="project-clock-wrap"><div class="label">Время в проекте</div><div id="project-timer" class="project-timer">00 дн. 00:00:00</div></div><button id="start-project-btn" class="btn primary start-project-btn">${started?'Проект запущен':'Старт проекта'}</button></div>
  <div class="grid"><div class="card kpi"><div class="label">Готовность проекта</div><div class="value">${projectProgress}%</div>${progress(projectProgress)}<div class="sub">считается по статусам этапов</div></div><div class="card kpi"><div class="label">Источники определены</div><div class="value">${sourcesReady} / ${DATA.sources}</div><div class="sub">нужна полная инвентаризация</div></div><div class="card kpi"><div class="label">Владельцы назначены</div><div class="value">${ownersReady} / ${DATA.owners}</div><div class="sub">RACI должен быть закрыт</div></div><div class="card kpi"><div class="label">Критические блокеры</div><div class="value">${blockers}</div><div class="sub">мешают сквозной связке</div></div></div>
  <div class="section-title"><h2>Цель проекта</h2></div><div class="callout"><b>${DATA.goal}</b><br><br>Проект закрывается только после приемки единого рабочего дашборда.</div>`;
}

function gantt(){
  const plannedStart=isStarted()?Number(localStorage.getItem(START_KEY)):Date.now();
  const tasks=[['Цели и KPI',0,7],['Команды и владельцы',0,14],['Источники лидов',4,18],['Единая воронка',10,22],['Data Dictionary',15,31],['Сквозные ID',22,38],['Интеграции',31,59],['DWH и модель данных',38,66],['Контроль качества',52,73],['Единый BI-дашборд',59,80],['Валидация с бизнесом',73,85],['Приемка и закрытие',84,90]];
  const totalDays=90, weeks=13;
  const weekHeaders=Array.from({length:weeks},(_,i)=>`<div class="gantt-week">Н${i+1}</div>`).join('');
  const rows=tasks.map(([name,start,end])=>{const left=(start/totalDays)*100;const width=Math.max(2,((end-start)/totalDays)*100);return `<div class="gantt-row"><div class="gantt-task"><b>${name}</b><small>${formatDate(addDays(plannedStart,start))} - ${formatDate(addDays(plannedStart,end))}</small></div><div class="gantt-track"><div class="gantt-grid"></div><div class="gantt-bar" style="left:${left}%;width:${width}%"></div></div></div>`;}).join('');
  return `<div class="section-title"><h2>Диаграмма Ганта</h2><small>План проекта на 3 месяца</small></div><div class="callout"><b>${isStarted()?'Гант рассчитан от фактической даты старта проекта.':'Проект еще не запущен.'}</b> ${isStarted()?'':'Сейчас показан план на 90 дней от текущей даты. После нажатия «Старт проекта» даты будут считаться от фактического старта.'}</div><div class="gantt-wrap"><div class="gantt-head"><div class="gantt-task-head">Этап</div><div class="gantt-weeks">${weekHeaders}</div></div>${rows}</div><div class="gantt-footer"><span>Старт: <b>${formatDate(plannedStart)}</b></span><span>Плановое завершение: <b>${formatDate(addDays(plannedStart,90))}</b></span><span>Срок: <b>3 месяца / 90 дней</b></span></div>`;
}

function roadmap(){
  const started=isStarted();
  const options=STAGE_STATUSES.map(x=>`<option value="${x}">${x}</option>`).join('');
  return `<div class="section-title"><h2>Этапы проекта</h2><small>${started?'0 → единый дашборд':'Проект еще не начат'}</small></div>${started?'':'<div class="callout"><b>Проект не запущен.</b> До нажатия «Старт проекта» статусы недоступны для изменения и готовность равна 0%.</div>'}<table class="table"><thead><tr><th>#</th><th>Этап</th><th>Статус</th><th>Готовность</th></tr></thead><tbody>${DATA.stages.map(s=>{const p=getStageProgress(s.id);return `<tr><td>${s.id}</td><td><b>${s.name}</b></td><td><select class="stage-status-select" data-stage-id="${s.id}" ${started?'':'disabled'} style="width:100%;min-width:170px;padding:8px 10px;border:1px solid #dbe5e5;border-radius:8px;background:#fff;font-family:Arial,Helvetica,sans-serif;font-size:13px">${options}</select></td><td style="min-width:180px"><span id="stage-progress-value-${s.id}">${p}%</span>${progress(p)}</td></tr>`;}).join('')}</tbody></table>`;
}

function teams(){
  const responsibleOptions=RESPONSIBLES.map(x=>`<option value="${x}">${x}</option>`).join('');
  return `<div class="section-title"><h2>Команды и RACI</h2><small>R делает · A отвечает · C консультирует · I информируется</small></div><table class="table"><thead><tr><th>Команда</th><th>RACI</th><th>Роль в проекте</th><th>Ответственный</th></tr></thead><tbody>${DATA.teams.map((r,i)=>`<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td><td><select class="responsible-select" data-team-index="${i}" style="width:100%;padding:8px 10px;border:1px solid #dbe5e5;border-radius:8px;background:#fff;font-family:Arial,Helvetica,sans-serif;font-size:13px">${responsibleOptions}</select></td></tr>`).join('')}</tbody></table>`;
}
function sources(){return `<div class="section-title"><h2>Источники данных</h2><small>что собираем и куда передаем</small></div><table class="table"><thead><tr><th>Источник</th><th>Данные</th><th>Целевая связка</th><th>Статус</th></tr></thead><tbody>${DATA.sources_list.map(r=>`<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td><td>${badge(effectiveStatus(r[3]))}</td></tr>`).join('')}</tbody></table>`}
function funnel(){return `<div class="section-title"><h2>Сквозной путь клиента</h2><small>контрольная цепочка</small></div><div class="card"><div class="flow">${['Реклама','Сайт','Метрика','ELMA','Квалификация','Альфа-Авто','Договор','1С / Оплата','DWH','BI Dashboard'].map((x,i)=>`${i?'<div class="arrow">→</div>':''}<div class="node"><b>${x}</b></div>`).join('')}</div></div>`}
function dictionary(){return `<div class="section-title"><h2>Data Dictionary</h2><small>минимальный набор для связки</small></div><table class="table"><thead><tr><th>Поле</th><th>Система</th><th>Назначение</th><th>Класс</th></tr></thead><tbody>${DATA.dictionary.map(r=>`<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td><td><span class="badge ${r[3]==='critical'?'bad':'work'}">${r[3]==='critical'?'Критично':'Обязательно'}</span></td></tr>`).join('')}</tbody></table>`}
function issues(){return `<div class="section-title"><h2>Критические блокеры</h2></div>${!isStarted()?'<div class="callout">Проект еще не начат. Блокеры будут фиксироваться после запуска.</div>':DATA.issues.length?`<table class="table"><tbody>${DATA.issues.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table>`:'<div class="callout">Критических блокеров пока нет.</div>'}`}
function dod(){return `<div class="section-title"><h2>Definition of Done</h2><small>12 условий закрытия проекта</small></div><div class="checklist">${DATA.dod.map((x,i)=>`<label class="check"><input type="checkbox" data-key="dod-${i}" ${isStarted()?'':'disabled'}><span><b>${i+1}.</b> ${x}</span></label>`).join('')}</div>`}

function bindStageStatuses(){
  document.querySelectorAll('.stage-status-select').forEach(el=>{
    const id=el.dataset.stageId;
    const current=getStageStatus(id);
    el.value=current;
    el.addEventListener('change',()=>{
      localStorage.setItem(`atom-stage-status-${id}`,el.value);
      render('roadmap');
      updateHeaderProgress();
    });
  });
}
function bindResponsibles(){
  document.querySelectorAll('.responsible-select').forEach(el=>{
    const key=`atom-responsible-${el.dataset.teamIndex}`;
    const saved=localStorage.getItem(key);
    el.value=saved && RESPONSIBLES.includes(saved) ? saved : 'Не назначен';
    el.addEventListener('change',()=>localStorage.setItem(key,el.value));
  });
}
function bindChecks(){document.querySelectorAll('input[type=checkbox][data-key]').forEach(el=>{const k='atom-mvp-'+el.dataset.key;el.checked=localStorage.getItem(k)==='1';el.addEventListener('change',()=>localStorage.setItem(k,el.checked?'1':'0'));});}
