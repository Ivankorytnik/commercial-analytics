(function(){
  const VERSION='1.3.0';
  const ALL='__all__';
  const SESSION_KEY='atom-pa-requirements-team-filter';
  const STABLE_KEY='atom-requirements-stable-team-filter';
  const DRAFTS_KEY='atom-pa-requirement-drafts-v1';
  const PICKER_LOCK_MS=90000;
  const PICKER_RELEASE_MS=2500;
  const SELECTOR=[
    '#req-enh-team','#pa-req-team',
    '[data-req-enh-status]','select[data-pa-req-status]',
    '[data-req-enh-person]','select[data-pa-req-person]',
    '[data-req-enh-stage]','select[data-pa-req-stage]',
    '#req-enh-new-team','#req-enh-new-stage',
    '#pa-new-req','#pa-new-req-stage','[data-pa-req-comment]',
    '#pa-panel input','#pa-panel textarea','#pa-panel select'
  ].join(',');
  const DRAFT_SELECTOR=[
    '#pa-new-req','#pa-new-req-stage',
    '#pa-new-req-start-date','#pa-new-req-start-time',
    '#pa-new-req-end-date','#pa-new-req-end-time'
  ].join(',');
  const PICKER_SELECTOR='#pa-panel input[type="date"],#pa-panel input[type="time"],#pa-panel input[type="datetime-local"]';
  const GUARDED_EVENTS=[
    'atom-core-data-changed','atom-sync-update','atom-view-rendered',
    'atom-reference-data-changed','atom-project-reconciled'
  ];

  let lockUntil=0;
  let activeControl=null;
  let lockTimer=null;
  const pending=new Map();
  let flushQueued=false;
  let restoreQueued=false;
  let draftEditing=false;
  let draftFocusId='';
  let draftSelectionStart=0;
  let draftSelectionEnd=0;

  const inRequirements=()=>location.hash.startsWith('#management/requirements');
  const isGuarded=el=>Boolean(el?.matches?.(SELECTOR));
  const isPicker=el=>Boolean(el?.matches?.(PICKER_SELECTOR));
  const hasActiveFocus=()=>Boolean(activeControl?.isConnected&&document.activeElement===activeControl);
  const isLocked=()=>inRequirements()&&(Date.now()<lockUntil||hasActiveFocus());
  const isDraft=el=>Boolean(el?.matches?.(DRAFT_SELECTOR));

  function readDrafts(){try{return JSON.parse(sessionStorage.getItem(DRAFTS_KEY)||'{}')||{}}catch{return{}}}
  function writeDrafts(value){try{sessionStorage.setItem(DRAFTS_KEY,JSON.stringify(value))}catch{}}

  function teamFromHash(){
    const prefix='#management/requirements/';
    const h=location.hash||'';
    if(!h.startsWith(prefix))return'';
    try{return decodeURIComponent(h.slice(prefix.length));}catch{return h.slice(prefix.length);}
  }

  function currentTeam(){
    return document.getElementById('pa-req-team')?.value||document.getElementById('req-enh-team')?.value||teamFromHash()||sessionStorage.getItem(SESSION_KEY)||'';
  }

  function rememberTeam(control){
    if(!control?.matches?.('#req-enh-team,#pa-req-team'))return;
    const value=control.value||ALL;
    sessionStorage.setItem(SESSION_KEY,value);
    sessionStorage.setItem(STABLE_KEY,value);
    try{window.ATOM_REQUIREMENTS_FILTER_PERSISTENCE?.remember?.(value,true);}catch{}
  }

  function rememberDraftFocus(el){
    if(!isDraft(el))return;
    draftEditing=true;
    draftFocusId=el.id||'';
    if(el.id==='pa-new-req'){
      draftSelectionStart=Number.isFinite(el.selectionStart)?el.selectionStart:el.value.length;
      draftSelectionEnd=Number.isFinite(el.selectionEnd)?el.selectionEnd:draftSelectionStart;
    }
  }

  function saveDraftFromDom(){
    if(!inRequirements())return;
    const input=document.getElementById('pa-new-req');
    if(!input)return;
    const team=currentTeam();
    if(!team||team===ALL)return;
    const stage=document.getElementById('pa-new-req-stage');
    const sd=document.getElementById('pa-new-req-start-date');
    const st=document.getElementById('pa-new-req-start-time');
    const ed=document.getElementById('pa-new-req-end-date');
    const et=document.getElementById('pa-new-req-end-time');
    const drafts=readDrafts();
    const next={...(drafts[team]||{}),text:input.value||'',stage:stage?.value||'1'};
    if(sd)next.startDate=sd.value||'';
    if(st)next.startTime=st.value||'';
    if(ed)next.endDate=ed.value||'';
    if(et)next.endTime=et.value||'';
    drafts[team]=next;
    writeDrafts(drafts);
    rememberDraftFocus(document.activeElement);
  }

  function clearDraft(team=currentTeam()){
    if(!team||team===ALL)return;
    const drafts=readDrafts();
    delete drafts[team];
    writeDrafts(drafts);
  }

  function restoreDraft(){
    if(!inRequirements())return;
    const input=document.getElementById('pa-new-req');
    if(!input)return;
    const team=currentTeam();
    if(!team||team===ALL)return;
    const draft=readDrafts()[team];
    if(!draft)return;
    const stage=document.getElementById('pa-new-req-stage');
    const sd=document.getElementById('pa-new-req-start-date');
    const st=document.getElementById('pa-new-req-start-time');
    const ed=document.getElementById('pa-new-req-end-date');
    const et=document.getElementById('pa-new-req-end-time');
    if(input.value!==String(draft.text||''))input.value=String(draft.text||'');
    if(stage&&draft.stage&&stage.value!==String(draft.stage))stage.value=String(draft.stage);
    if(sd&&Object.prototype.hasOwnProperty.call(draft,'startDate')&&sd.value!==String(draft.startDate||''))sd.value=String(draft.startDate||'');
    if(st&&Object.prototype.hasOwnProperty.call(draft,'startTime')&&st.value!==String(draft.startTime||''))st.value=String(draft.startTime||'');
    if(ed&&Object.prototype.hasOwnProperty.call(draft,'endDate')&&ed.value!==String(draft.endDate||''))ed.value=String(draft.endDate||'');
    if(et&&Object.prototype.hasOwnProperty.call(draft,'endTime')&&et.value!==String(draft.endTime||''))et.value=String(draft.endTime||'');
    if(draftEditing&&draftFocusId){
      const target=document.getElementById(draftFocusId);
      if(target&&document.activeElement!==target){
        try{target.focus({preventScroll:true});}catch{try{target.focus();}catch{}}
      }
      if(target?.id==='pa-new-req'&&typeof target.setSelectionRange==='function'){
        const max=target.value.length;
        try{target.setSelectionRange(Math.min(draftSelectionStart,max),Math.min(draftSelectionEnd,max));}catch{}
      }
    }
  }

  function queueRestore(){
    if(restoreQueued)return;
    restoreQueued=true;
    requestAnimationFrame(()=>{
      restoreQueued=false;
      restoreDraft();
    });
  }

  function scheduleLockCheck(delay){
    clearTimeout(lockTimer);
    lockTimer=setTimeout(()=>{
      lockTimer=null;
      if(!isLocked())flushPending();
    },Math.max(50,Number(delay)||50));
  }

  function lock(control,ms=30000){
    if(!inRequirements()||!isGuarded(control))return;
    activeControl=control;
    const hold=isPicker(control)?PICKER_LOCK_MS:ms;
    lockUntil=Math.max(lockUntil,Date.now()+hold);
    scheduleLockCheck(hold+80);
    rememberTeam(control);
    rememberDraftFocus(control);
    try{control.focus({preventScroll:true});}catch{try{control.focus();}catch{}}
  }

  function unlock(){
    clearTimeout(lockTimer);lockTimer=null;
    lockUntil=0;
    activeControl=null;
    flushPending();
  }

  function queuePending(type,detail){pending.set(type,detail)}

  function flushPending(){
    if(flushQueued||!pending.size)return;
    flushQueued=true;
    setTimeout(()=>{
      flushQueued=false;
      if(isLocked())return;
      const events=[...pending.entries()];
      pending.clear();
      events.forEach(([type,detail])=>{
        try{window.dispatchEvent(new CustomEvent(type,{detail}));}catch{}
      });
    },0);
  }

  document.addEventListener('pointerdown',e=>{
    const control=e.target.closest?.(SELECTOR);
    if(control)lock(control);
  },true);

  document.addEventListener('mousedown',e=>{
    const control=e.target.closest?.(SELECTOR);
    if(control)lock(control);
  },true);

  document.addEventListener('focusin',e=>{
    const control=e.target.closest?.(SELECTOR);
    if(control)lock(control);
  },true);

  document.addEventListener('keydown',e=>{
    if(isGuarded(e.target))lock(e.target);
  },true);

  document.addEventListener('input',e=>{
    if(!isDraft(e.target))return;
    rememberDraftFocus(e.target);
    saveDraftFromDom();
  },true);

  document.addEventListener('change',e=>{
    const control=e.target.closest?.(SELECTOR);
    if(!control)return;
    rememberTeam(control);
    if(isDraft(control)){
      rememberDraftFocus(control);
      saveDraftFromDom();
      if(control.id==='pa-new-req-stage')setTimeout(saveDraftFromDom,40);
      if(isPicker(control)){
        lockUntil=Date.now()+PICKER_RELEASE_MS;
        activeControl=document.activeElement===control?control:null;
        scheduleLockCheck(PICKER_RELEASE_MS+80);
      }
      return;
    }
    if(control.id==='pa-req-team'){
      setTimeout(queueRestore,0);
    }
    if(control.matches('input,textarea'))return;
    lockUntil=0;
    activeControl=null;
    setTimeout(flushPending,0);
  },true);

  document.addEventListener('click',e=>{
    if(!e.target.closest?.('#pa-add-req'))return;
    const team=currentTeam();
    const draft=readDrafts()[team];
    if(!draft?.text?.trim())return;
    setTimeout(()=>{
      clearDraft(team);
      draftEditing=false;
      draftFocusId='';
      queueRestore();
    },0);
  });

  document.addEventListener('focusout',e=>{
    if(!isGuarded(e.target))return;
    if(isPicker(e.target)){
      activeControl=null;
      draftEditing=false;
      draftFocusId='';
      const remain=lockUntil-Date.now();
      if(remain<=0)setTimeout(flushPending,0);
      else scheduleLockCheck(remain+80);
      return;
    }
    setTimeout(()=>{
      const next=document.activeElement;
      if(next&&isGuarded(next)){
        lock(next);
        return;
      }
      if(isDraft(e.target)){
        const draftInput=document.getElementById('pa-new-req');
        if(!draftInput)return;
        draftEditing=false;
        draftFocusId='';
      }
      if(document.activeElement===e.target)return;
      unlock();
    },250);
  },true);

  GUARDED_EVENTS.forEach(type=>{
    window.addEventListener(type,e=>{
      queueRestore();
      if(!isLocked())return;
      queuePending(type,e.detail);
      e.stopImmediatePropagation();
    },true);
  });

  function applyHashTeam(){
    if(isLocked())return setTimeout(applyHashTeam,180);
    const team=teamFromHash();if(!team)return;
    const select=document.getElementById('req-enh-team')||document.getElementById('pa-req-team');
    if(!select||![...select.options].some(o=>o.value===team))return;
    if(select.value===team){rememberTeam(select);queueRestore();return;}
    select.value=team;
    rememberTeam(select);
    select.dispatchEvent(new Event('change',{bubbles:true}));
    setTimeout(queueRestore,0);
  }

  const observer=new MutationObserver(()=>{
    if(inRequirements())queueRestore();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  ['hashchange','atom-view-rendered'].forEach(type=>window.addEventListener(type,()=>setTimeout(applyHashTeam,80)));
  setTimeout(applyHashTeam,900);
  setTimeout(applyHashTeam,1800);
  setTimeout(queueRestore,1000);

  window.ATOM_REQUIREMENTS_INTERACTION_STABILITY={
    version:VERSION,
    isLocked,
    lock,
    unlock,
    applyHashTeam,
    restoreDraft,
    clearDraft,
    active:()=>activeControl
  };
})();
