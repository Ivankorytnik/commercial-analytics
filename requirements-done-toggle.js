(function(){
  const STORAGE_KEY='atom-requirements-hide-done-v1';
  let hideDone=localStorage.getItem(STORAGE_KEY)==='1';
  let scheduled=false;

  function rows(){
    return [...document.querySelectorAll('#pa-panel tr[data-pa-req]')];
  }

  function applyFilter(){
    const button=document.getElementById('pa-toggle-done');
    if(!button)return;
    const allRows=rows();
    let doneCount=0;

    allRows.forEach(row=>{
      const status=row.querySelector('[data-pa-req-status]');
      const isDone=status?.value==='done';
      if(isDone)doneCount+=1;
      row.style.display=hideDone&&isDone?'none':'';
    });

    const label=hideDone
      ?`Показать готовые${doneCount?` (${doneCount})`:''}`
      :`Скрыть готовые${doneCount?` (${doneCount})`:''}`;
    if(button.textContent!==label)button.textContent=label;
    button.setAttribute('aria-pressed',hideDone?'true':'false');
    button.title=hideDone?'Показать завершённые требования':'Скрыть требования со статусом «Готово»';
  }

  function ensureButton(){
    scheduled=false;
    const teamSelect=document.getElementById('pa-req-team');
    const toolbar=teamSelect?.closest('.pa-toolbar');
    if(!toolbar)return;

    let button=document.getElementById('pa-toggle-done');
    if(!button){
      button=document.createElement('button');
      button.id='pa-toggle-done';
      button.type='button';
      button.className='btn';
      button.style.marginLeft='4px';
      button.addEventListener('click',()=>{
        hideDone=!hideDone;
        localStorage.setItem(STORAGE_KEY,hideDone?'1':'0');
        applyFilter();
      });
      (toolbar.querySelector('.pa-toolbar-left')||toolbar).appendChild(button);
    }
    applyFilter();
  }

  function scheduleEnsure(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(ensureButton);
  }

  document.addEventListener('change',event=>{
    if(event.target?.matches?.('[data-pa-req-status],#pa-req-team'))setTimeout(scheduleEnsure,0);
  },true);

  window.addEventListener('hashchange',()=>setTimeout(scheduleEnsure,0));
  window.addEventListener('atom-core-data-changed',()=>setTimeout(scheduleEnsure,0));
  window.addEventListener('atom-sync-ready',()=>setTimeout(scheduleEnsure,0));

  const observer=new MutationObserver(scheduleEnsure);
  observer.observe(document.body,{childList:true,subtree:true});
  scheduleEnsure();

  window.ATOM_REQUIREMENTS_DONE_TOGGLE={
    apply:applyFilter,
    isHidden:()=>hideDone,
    setHidden(value){
      hideDone=Boolean(value);
      localStorage.setItem(STORAGE_KEY,hideDone?'1':'0');
      scheduleEnsure();
    }
  };
})();
