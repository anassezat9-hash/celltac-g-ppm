(function(){
  const STYLE_ID='manager-reports-v2-style';
  function style(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');s.id=STYLE_ID;
    s.textContent='.manager-report-link{display:inline-flex!important;align-items:center;justify-content:center;white-space:nowrap;min-width:105px;padding:6px 8px!important;font-size:11px!important;line-height:1.2!important;text-decoration:none!important;margin:0!important}.manager-report-loading{opacity:.65}';
    document.head.appendChild(s);
  }
  function getSourceRows(){
    try{return typeof rows!=='undefined'&&Array.isArray(rows)?rows:[]}catch(e){return []}
  }
  async function makeLink(a,path){
    if(a.dataset.busy)return;
    a.dataset.busy='1';a.textContent='⏳ تجهيز...';
    try{
      if(!window.sb||!path)throw new Error('no-report');
      const filename=(path.split('/').pop()||'maintenance-report').replace(/[^a-zA-Z0-9._-]/g,'_');
      const r=await window.sb.storage.from('maintenance-reports').createSignedUrl(path,3600,{download:filename});
      if(!r.data?.signedUrl)throw new Error('no-signed-url');
      a.href=r.data.signedUrl;a.target='_blank';a.rel='noopener';a.textContent='⬇ تحميل التقرير';a.classList.remove('manager-report-loading');a.dataset.ready='1';
    }catch(err){a.textContent='⚠ تعذر التحميل';console.error('Report download:',err)}finally{delete a.dataset.busy}
  }
  function run(){
    const table=document.querySelector('#tbody')?.closest('table');
    if(!table)return;
    const domRows=[...document.querySelectorAll('#tbody tr')];
    const source=getSourceRows();
    if(!domRows.length||!source.length)return;
    const map=new Map();
    source.forEach(r=>{if(r.serial_number&&r.visit_date)map.set(r.serial_number+'|'+r.visit_date,r)});
    domRows.forEach(tr=>{
      const c=tr.cells;
      if(c.length<13)return;
      const serial=c[0].textContent.trim();
      const date=c[5].textContent.trim();
      const cell=c[12];
      const r=map.get(serial+'|'+date);
      if(!cell||!r?.maintenance_report_path)return;
      if(cell.querySelector('.manager-report-link'))return;
      cell.textContent='';
      const a=document.createElement('a');
      a.className='btn btn-primary manager-report-link manager-report-loading';
      a.href='#';a.textContent='📎 تحميل التقرير';
      a.addEventListener('click',e=>{e.preventDefault();makeLink(a,r.maintenance_report_path)});
      cell.appendChild(a);
    });
  }
  function init(){style();let n=0;const tick=()=>{run();if(++n<60)setTimeout(tick,500)};tick();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
