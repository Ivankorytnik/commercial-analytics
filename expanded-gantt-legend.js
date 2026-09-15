(function(){
  const STYLE_ID='expanded-gantt-legend-enhanced-css';

  function ensureStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .xg-legend.xg-legend-enhanced{display:grid;grid-template-columns:auto 1fr;gap:10px 16px;align-items:start;background:#fff;border:1px solid var(--line);border-radius:10px;padding:10px 12px;color:#425959;font-size:10px}
      .xg-legend-title{font-weight:700;font-size:11px;white-space:nowrap;padding-top:2px}
      .xg-legend-items{display:flex;gap:12px 16px;align-items:center;flex-wrap:wrap}
      .xg-legend.xg-legend-enhanced .xg-legend-item{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
      .xg-legend-swatch{width:20px;height:10px;border-radius:4px;display:inline-block;box-sizing:border-box;flex:0 0 auto}
      .xg-legend-swatch.base{background:#91aaa9;opacity:.55;border:1px dashed #4f696a}
      .xg-legend-swatch.idle{background:#cfdada}
      .xg-legend-swatch.work{background:#35bfb1}
      .xg-legend-swatch.done{background:#2ca66f}
      .xg-legend-swatch.problem{background:#d9534f}
      .xg-legend-response{width:8px;height:8px;border-radius:50%;background:#2ca66f;border:2px solid #fff;box-shadow:0 0 0 1px #2ca66f;display:inline-block;box-sizing:content-box;flex:0 0 auto}
      .xg-legend-today{width:2px;height:14px;background:#d95c5c;display:inline-block;flex:0 0 auto}
      @media(max-width:900px){.xg-legend.xg-legend-enhanced{grid-template-columns:1fr}.xg-legend-items{gap:9px 12px}}
    `;
    document.head.appendChild(style);
  }

  function apply(){
    ensureStyles();
    const legend=document.querySelector('.xg-legend');
    if(!legend||legend.dataset.enhancedLegend==='1')return;
    legend.dataset.enhancedLegend='1';
    legend.classList.add('xg-legend-enhanced');
    legend.innerHTML=`
      <div class="xg-legend-title">Легенда цветов</div>
      <div class="xg-legend-items">
        <span class="xg-legend-item"><i class="xg-legend-swatch base"></i>Базовый план</span>
        <span class="xg-legend-item"><i class="xg-legend-swatch idle"></i>Не запрошено</span>
        <span class="xg-legend-item"><i class="xg-legend-swatch work"></i>В работе</span>
        <span class="xg-legend-item"><i class="xg-legend-swatch done"></i>Готово</span>
        <span class="xg-legend-item"><i class="xg-legend-swatch problem"></i>Блокер / просрочка</span>
        <span class="xg-legend-item"><i class="xg-legend-response"></i>Ответ получен</span>
        <span class="xg-legend-item"><i class="xg-legend-today"></i>Сегодня</span>
      </div>`;
  }

  let queued=false;
  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;apply();});
  }

  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('hashchange',schedule);
  window.addEventListener('atom-sync-update',schedule);
  schedule();

  window.ATOM_EXPANDED_GANTT_LEGEND={apply};
})();
