(function(){
  if(!/\/manager\.html$/i.test(location.pathname)) return;
  const STYLE_ID='manager-table-fix-v3';
  function normalize(){
    const table=document.querySelector('.table-wrap table');
    const tbody=document.getElementById('tbody');
    if(!table||!tbody) return;
    // The manager table must never contain the removed Device column.
    // Some previously rendered rows still inject the literal "Celltac G"
    // as the second cell. Remove that cell regardless of the current cell count.
    for(const tr of tbody.rows){
      const c=tr.cells;
      if(c.length>=2 && c[1] && c[1].textContent.trim()==='Celltac G') tr.deleteCell(1);
    }
    // Keep the current 12-column header definition if an old header is cached.
    const head=table.tHead?.rows?.[0];
    if(head){
      const labels=[...head.cells].map(x=>x.textContent.trim());
      const deviceIndex=labels.findIndex(x=>x==='الجهاز');
      if(deviceIndex>=0) head.deleteCell(deviceIndex);
    }
  }
  function init(){
    if(!document.getElementById(STYLE_ID)){
      const s=document.createElement('style');s.id=STYLE_ID;
      s.textContent='.table-wrap table{table-layout:fixed!important}.table-wrap{overflow-x:auto!important;-webkit-overflow-scrolling:touch!important}';
      document.head.appendChild(s);
    }
    const run=()=>normalize();
    run();
    const root=document.querySelector('.table-wrap')||document.body;
    const observer=new MutationObserver(()=>run());
    observer.observe(root,{childList:true,subtree:true});
    let n=0;const tick=()=>{run();if(++n<60)setTimeout(tick,400)};tick();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
