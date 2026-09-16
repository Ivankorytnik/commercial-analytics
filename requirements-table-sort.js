(function(){
  const VERSION='1.0.0';
  const SORT_KEY='atom-pa-requirements-sort-v1';
  const COLUMNS={
    stage:{index:1,label:'Этап Ганта'},
    period:{index:2,label:'Период'},
    status:{index:3,label:'Статус'},
    person:{index:4,label:'Ответственный за ответ'}
  };
  let queued=false;

  const inRequirements=()=>location.hash.startsWith('#management/requirements');

  function readSort(){
    try{
      const value=JSON.parse(sessionStorage.getItem(SORT_KEY)||'null');
      return value&&COLUMNS[value.column]&&['asc','desc'].includes(value.dir)?value:null;
    }catch{return null;}
  }

  function writeSort(value){
    try{sessionStorage.setItem(SORT_KEY,JSON.stringify(value));}catch{}
  }

  function styles(){
    if(document.getElementById('requirements-table-sort-css'))return;
    const s=document.createElement('style');
    s.id='requirements-table-sort-css';
    s.textContent=`
      .req-sort-button{width:100%;display:inline-flex;align-items:center;justify-content:flex-start;gap:6px;padding:0;border:0;background:transparent;color:inherit;font:inherit;font-weight:inherit;text-align:left;cursor:pointer}
      .req-sort-button:hover{color:#0f6962}
      .req-sort-button:focus-visible{outline:2px solid #2bcbbb;outline-offset:3px;border-radius:3px}
      .req-sort-arrow{font-size:10px;line-height:1;color:#708686;min-width:11px}
      .req-sort-button.is-active .req-sort-arrow{color:#0f6962;font-weight:800}
    `;
    document.head.appendChild(s);
  }

  function table(){
    if(!inRequirements())return null;
    const tables=[...document.querySelectorAll('#pa-panel table.pa-table')];
    return tables.find(t=>t.querySelector('tbody tr[data-pa-req]'))||null;
  }

  function selectedText(select){
    if(!select)return'';
    return select.selectedOptions?.[0]?.textContent?.trim()||select.options?.[select.selectedIndex]?.textContent?.trim()||'';
  }

  function parseDateTime(text){
    const m=String(text||'').match(/(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
    if(!m)return Number.MAX_SAFE_INTEGER;
    const [,dd,mm,yyyy,hh='00',mi='00']=m;
    const ts=new Date(Number(yyyy),Number(mm)-1,Number(dd),Number(hh),Number(mi),0,0).getTime();
    return Number.isFinite(ts)?ts:Number.MAX_SAFE_INTEGER;
  }

  function keyFor(row,column){
    if(column==='stage'){
      const select=row.querySelector('[data-pa-req-stage]');
      if(select&&select.value!=='')return Number(select.value)||Number.MAX_SAFE_INTEGER;
      const n=parseInt(row.children[1]?.textContent||'',10);
      return Number.isFinite(n)?n:Number.MAX_SAFE_INTEGER;
    }
    if(column==='period')return parseDateTime(row.children[2]?.textContent||'');
    if(column==='status'){
      const select=row.querySelector('[data-pa-req-status]');
      if(!select)return Number.MAX_SAFE_INTEGER;
      return select.selectedIndex>=0?select.selectedIndex:Number.MAX_SAFE_INTEGER;
    }
    if(column==='person'){
      const text=selectedText(row.querySelector('[data-pa-req-person]'));
      return /^не назнач/i.test(text)?'\uffff':text.toLocaleLowerCase('ru-RU');
    }
    return'';
  }

  function compareValues(a,b){
    if(typeof a==='number'&&typeof b==='number')return a-b;
    return String(a).localeCompare(String(b),'ru',{numeric:true,sensitivity:'base'});
  }

  function applySort(t,state){
    if(!t||!state)return;
    const tbody=t.tBodies?.[0];
    if(!tbody)return;
    const rows=[...tbody.querySelectorAll(':scope > tr[data-pa-req]')];
    if(rows.length<2)return;
    const dir=state.dir==='desc'?-1:1;
    const sorted=rows.map((row,index)=>({row,index,key:keyFor(row,state.column)})).sort((a,b)=>{
      const c=compareValues(a.key,b.key);
      return c?c*dir:a.index-b.index;
    }).map(x=>x.row);
    const changed=sorted.some((row,i)=>row!==rows[i]);
    if(!changed)return;
    const frag=document.createDocumentFragment();
    sorted.forEach(row=>frag.appendChild(row));
    tbody.appendChild(frag);
  }

  function updateHeaders(t,state){
    const ths=t?.tHead?.rows?.[0]?.cells;
    if(!ths)return;
    Object.entries(COLUMNS).forEach(([id,cfg])=>{
      const th=ths[cfg.index];
      if(!th)return;
      let btn=th.querySelector(`.req-sort-button[data-req-sort="${id}"]`);
      if(!btn){
        th.textContent='';
        btn=document.createElement('button');
        btn.type='button';
        btn.className='req-sort-button';
        btn.dataset.reqSort=id;
        btn.title=`Сортировать: ${cfg.label}`;
        btn.innerHTML=`<span>${cfg.label}</span><span class="req-sort-arrow" aria-hidden="true">⇅</span>`;
        th.appendChild(btn);
      }
      const active=state?.column===id;
      btn.classList.toggle('is-active',active);
      btn.setAttribute('aria-sort',active?(state.dir==='asc'?'ascending':'descending'):'none');
      const arrow=btn.querySelector('.req-sort-arrow');
      if(arrow)arrow.textContent=active?(state.dir==='asc'?'▲':'▼'):'⇅';
    });
  }

  function patch(){
    if(!inRequirements())return;
    const t=table();
    if(!t)return;
    styles();
    const state=readSort();
    updateHeaders(t,state);
    applySort(t,state);
  }

  function queue(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      patch();
    });
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('.req-sort-button[data-req-sort]');
    if(!btn||!inRequirements())return;
    const column=btn.dataset.reqSort;
    if(!COLUMNS[column])return;
    const current=readSort();
    const next={column,dir:current?.column===column&&current.dir==='asc'?'desc':'asc'};
    writeSort(next);
    const t=table();
    updateHeaders(t,next);
    applySort(t,next);
  });

  document.addEventListener('change',e=>{
    if(!inRequirements())return;
    if(e.target.closest?.('[data-pa-req-stage],[data-pa-req-status],[data-pa-req-person]'))setTimeout(queue,0);
  },true);

  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
  ['hashchange','atom-view-rendered','atom-sync-update','atom-core-data-changed'].forEach(type=>window.addEventListener(type,queue));
  setTimeout(queue,250);
  setTimeout(queue,900);

  window.ATOM_REQUIREMENTS_TABLE_SORT={version:VERSION,patch,state:readSort};
})();
