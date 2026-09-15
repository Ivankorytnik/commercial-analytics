(function(){
  const VERSION='2.1.0';
  const REL_PREFIX='atom-requirement-not-actual-';
  const EXCLUDED_LABEL_PREFIX='atom-requirement-excluded-label-';
  const DELETED_KEY='atom-requirements-deleted-v1';
  let corePatched=false;
  let rawCore=null;
  let patchQueued=false;

  const core=()=>window.ATOM_CORE;
  const key=id=>`${REL_PREFIX}${id}`;
  const isNotActual=id=>localStorage.getItem(key(id))==='1';
  const readDeleted=()=>{try{const v=JSON.parse(localStorage.getItem(DELETED_KEY)||'[]');return Array.isArray(v)?v.map(String):[]}catch{return[]}};
  const isDeleted=id=>readDeleted().includes(String(id));
  const filterDeleted=rows=>(Array.isArray(rows)?rows:[]).filter(r=>!isDeleted(r?.id));

  function rememberDeleted(id){
    const ids=readDeleted();
    const value=String(id||'');
    if(!value||ids.includes(value))return;
    ids.push(value);
    localStorage.setItem(DELETED_KEY,JSON.stringify(ids));
  }

  function closeRequirementBlocker(id,note){
    let rows=[];
    try{rows=JSON.parse(localStorage.getItem('atom-blockers')||'[]')||[];}catch{}
    let changed=false;
    rows.forEach(b=>{
      if(b.autoKey!==`CORE:RACI:${id}`)return;
      if(['Решен','Закрыт'].includes(b.status))return;
      b.status='Решен';
      if(note&&!String(b.comment||'').includes(note))b.comment=(b.comment?b.comment+'\n':'')+note;
      changed=true;
    });
    if(changed)localStorage.setItem('atom-blockers',JSON.stringify(rows));
  }

  function setNotActual(id,value,label='Не актуально'){
    if(!id)return;
    if(value){
      localStorage.setItem(key(id),'1');
      localStorage.setItem(`${EXCLUDED_LABEL_PREFIX}${id}`,label||'Не актуально');
      closeRequirementBlocker(id,`Требование исключено из актуального контура: ${label||'Не актуально'}.`);
    }else{
      localStorage.removeItem(key(id));
      localStorage.removeItem(`${EXCLUDED_LABEL_PREFIX}${id}`);
    }
    try{core()?.reconcile?.();}catch{}
    window.dispatchEvent(new CustomEvent('atom-core-data-changed',{detail:{type:'requirement-relevance',id,notActual:Boolean(value),label}}));
  }

  function deleteRequirement(id){
    const c=core();if(!c||!rawCore)return false;
    const req=rawCore.requirement(id);if(!req)return false;
    if(req.custom)return rawCore.deleteRequirement(id);
    rememberDeleted(id);
    setNotActual(id,true,'Удалено');
    localStorage.removeItem(`atom-core-requirement-state-${id}`);
    closeRequirementBlocker(id,'Требование удалено из управления проектом.');
    window.dispatchEvent(new CustomEvent('atom-core-data-changed',{detail:{type:'requirement-delete',id}}));
    return true;
  }

  function installCompatibility(){
    const c=core();if(!c)return false;
    c.isRequirementNotActual=isNotActual;
    c.setRequirementNotActual=setNotActual;
    c.isRequirementDeleted=isDeleted;
    if(!corePatched){
      rawCore={
        requirements:c.requirements.bind(c),
        requirement:c.requirement.bind(c),
        requirementsByTeam:c.requirementsByTeam.bind(c),
        requirementsByStage:c.requirementsByStage.bind(c),
        deleteRequirement:c.deleteRequirement.bind(c)
      };
      c.requirements=()=>filterDeleted(rawCore.requirements());
      c.requirement=id=>isDeleted(id)?null:rawCore.requirement(id);
      c.requirementsByTeam=team=>filterDeleted(rawCore.requirementsByTeam(team));
      c.requirementsByStage=stageId=>filterDeleted(rawCore.requirementsByStage(stageId));
      c.deleteRequirement=deleteRequirement;
      corePatched=true;
    }
    return true;
  }

  function patchDeleteButtons(){
    if(!location.hash.startsWith('#management/requirements'))return;
    document.querySelectorAll('#pa-panel tr[data-pa-req]').forEach(row=>{
      const id=row.dataset.paReq;if(!id)return;
      if(isDeleted(id)){row.remove();return;}
      const cell=row.lastElementChild;if(!cell)return;
      let btn=cell.querySelector('.pa-delete-req');
      if(!btn){
        btn=document.createElement('button');
        btn.type='button';
        btn.className='btn pa-delete-req';
        btn.dataset.id=id;
        btn.textContent='Удалить';
        cell.appendChild(btn);
      }else{
        btn.dataset.id=id;
      }
      btn.title='Удалить требование';
    });
  }

  function queuePatch(){
    if(patchQueued)return;
    patchQueued=true;
    requestAnimationFrame(()=>{patchQueued=false;patchDeleteButtons();});
  }

  function render(){
    if(!location.hash.startsWith('#management/requirements'))return;
    try{window.ATOM_PROJECT_ADMIN?.open?.();}catch{}
    setTimeout(()=>{
      try{window.ATOM_REQUIREMENTS_TIME?.patch?.();}catch{}
      try{window.ATOM_REQUIREMENTS_STATUS_DIRECTORY?.patch?.();}catch{}
      try{window.ATOM_REQUIREMENTS_ALL_TEAM_FILTER?.patch?.();}catch{}
      patchDeleteButtons();
    },0);
  }

  // project-admin.js remains the single owner of the requirements UI.
  // This module adds compatibility rules, persistent deletion and row actions.
  window.ATOM_REQUIREMENTS_ENHANCED={
    version:VERSION,
    compatibilityOnly:true,
    isNotActual,
    setNotActual,
    isDeleted,
    deleteRequirement,
    patchDeleteButtons,
    render
  };

  const timer=setInterval(()=>{if(installCompatibility()){clearInterval(timer);queuePatch();}},50);
  setTimeout(()=>clearInterval(timer),5000);
  window.addEventListener('atom-core-ready',()=>{installCompatibility();queuePatch();});
  ['hashchange','atom-core-data-changed','atom-sync-update','atom-view-rendered'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(queuePatch,0)));
  new MutationObserver(queuePatch).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(queuePatch,700);
  setTimeout(queuePatch,1500);
})();