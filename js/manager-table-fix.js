(function(){
  if(!/\/manager\.html$/i.test(location.pathname)) return;
  const STYLE_ID='manager-table-fix-v2';
  function normalize(){
    const tbody=document.getElementById('tbody');
    if(!tbody) return;
    for(const tr of tbody.rows){
      // Older/duplicate rendering can leave the removed Device column as the
      // second cell while the current header has no Device column.
      if(tr.cells.length>=13 && tr.cells[1] && tr.cells[1].textContent.trim()==='Celltac G'){
        tr.deleteCell(1);
      }
    }
  }
  function init(){
    if(!document.getElementById(STYLE_ID)){
      const s=document.createElement('style');s.id=STYLE_ID;
      s.textContent='#tbody td:nth-child(2),#tbody th:nth-child(2){ }';
      document.head.appendChild(s);
    }
    normalize();
    const tbody=document.getElementById('tbody');
    if(tbody){
      const observer=new MutationObserver(()=>normalize());
      observer.observe(tbody,{childList:true,subtree:true});
    }
    let n=0;const tick=()=>{normalize();if(++n<20)setTimeout(tick,500)};tick();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
