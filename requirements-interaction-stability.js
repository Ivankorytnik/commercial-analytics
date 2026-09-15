(function(){
  const VERSION='1.2.0';
  const ALL='__all__';
  const SESSION_KEY='atom-pa-requirements-team-filter';
  const STABLE_KEY='atom-requirements-stable-team-filter';
  const DRAFTS_KEY='atom-pa-requirement-drafts-v1';
  const SELECTOR=[
    '#req-enh-team','#pa-req-team',
    '[data-req-enh-status]','select[data-pa-req-status]',
    '[data-req-enh-person]','select[data-pa-req-person]',
    '[data-req-enh-stage]','select[data-pa-req-stage]',
    '#req-enh-new-team','#req-enh-new-stage',
    '#pa-new-req','#pa-new-req-stage','[data-pa-req-comment]',
    '#pa-panel input','#pa-panel textarea','#pa-panel select'
  ].join(',');
  const DRAFT_SELECTOR='#pa-new-req,#pa-new-req-stage';
  const GUARDED_EVENTS=[
    'atom-core-data-changed','atom-sync-update','atom-view-rendered',
    'atom-reference-data-changed','atom-project-reconciled'
  ];

  let lockUntil=0;
  let activeControl=null;
  const pending=new Map();
  let flushQueued=false;
  let restoreQueued=false;
  let draftEditing=false;
  let draftFocusId='';
  let draftSelectionStart=0;
  let draftSelectionEnd=0;

  const inRequirements=()=>location.hash.startsWith('#management/requirements');
  const isGuarded=el=>Boolean(el?.matches?.(SELECTOR));
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
    const drafts=readDrafts();
    drafts[team]={text:input.value||'',stage:stage?.value||'1'};
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
    if(input.value!==String(draft.text||''))input.value=String(draft.text||'');
    if(stage&&draft.stage&&stage.value!==String(draft.stage))stage.value=String(draft.stage);
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

  function lock(control,ms=30000){
    if(!inRequirements()||!isGuarded(control))return;
    activeControl=control;
    lockUntil=Math.max(lockUntil,Date.now()+ms);
    rememberTeam(control);
    rememberDraftFocus(control);
    try{control.focus({preventScroll:true});}catch{try{control.focus();}catch{}}
  }

  function unlock(){
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
    if(e.target?.id!=='pa-new-req')return;
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
