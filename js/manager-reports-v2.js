(function(){
  const STYLE_ID='manager-reports-v7-style';
  function style(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');s.id=STYLE_ID;
    s.textContent='.manager-report-link{display:inline-flex!important;align-items:center;justify-content:center;white-space:nowrap;min-width:92px;padding:6px 8px!important;font-size:11px!important;line-height:1.2!important;text-decoration:none!important;margin:0!important;cursor:pointer}.manager-report-loading{opacity:.7}.manager-report-error{font-size:11px;color:#b42318}#tbody td,#tbody th{white-space:nowrap;vertical-align:middle}#tbody td:nth-child(6){white-space:nowrap;min-width:92px}#tbody td:nth-child(12){min-width:90px;max-width:150px;white-space:normal;word-break:break-word}#tbody td:nth-child(11),#tbody td:nth-child(13){min-width:105px}.table-wrap{overflow-x:auto}.table-wrap table{min-width:1250px}';
    document.head.appendChild(s);
  }
  function reorderColumns(){
    const table=document.querySelector('#tbody')?.closest('table');
    if(!table)return;
    const head=table.tHead?.rows?.[0];
    if(!head||head.cells.length<13)return;
    const h11=head.cells[11],h12=head.cells[12];
    if((h11.textContent||'').trim()==='قطع الغيار'&&(h12.textContent||'').trim()==='التقرير'){
      h11.parentNode.insertBefore(h12,h11);
      [...table.tBodies].forEach(tb=>[...tb.rows].forEach(tr=>{if(tr.cells.length>=13)tr.insertBefore(tr.cells[12],tr.cells[11])}));
    }
  }
  async function getPathMap(){
    try{
      if(!window.sb)return new Map();
      let source=[];
      try{source=typeof rows!=='undefined'&&Array.isArray(rows)?rows:[]}catch(e){}
      const ids=source.map(r=>r?.id).filter(Boolean);
      if(ids.length){
        const {data,error}=await window.sb.from('visits').select('id,maintenance_report_path').in('id',ids).not('maintenance_report_path','is',null);
        if(!error){const m=new Map();(data||[]).forEach(v=>{if(v.maintenance_report_path)m.set(v.id,v.maintenance_report_path)});return m}
      }
      const {data,error}=await window.sb.from('visits').select('id,maintenance_report_path').not('maintenance_report_path','is',null);
      if(error)return new Map();
      const m=new Map();(data||[]).forEach(v=>{if(v.maintenance_report_path)m.set(v.id,v.maintenance_report_path)});return m;
    }catch(e){console.error('manager report links:',e);return new Map()}
  }
  async function prepareUrl(path){
    const filename=(path.split('/').pop()||'maintenance-report').replace(/[^a-zA-Z0-9._-]/g,'_');
    const result=await window.sb.storage.from('maintenance-reports').createSignedUrl(path,3600,{download:filename});
    if(result.error||!result.data?.signedUrl)throw new Error(result.error?.message||'no signed url');
    return result.data.signedUrl;
  }
  async function run(){
    const tbody=document.getElementById('tbody');
    if(!tbody||!window.sb)return;
    reorderColumns();
    const domRows=[...tbody.rows];
    if(!domRows.length)return;
    let source=[];
    try{source=typeof rows!=='undefined'&&Array.isArray(rows)?rows:[]}catch(e){}
    const byKey=new Map();source.forEach(r=>{if(r.serial_number&&r.visit_date)byKey.set(r.serial_number+'|'+r.visit_date,r)});
    const pathMap=await getPathMap();
    for(const tr of domRows){
      const c=tr.cells;if(c.length<13)continue;
      const serial=c[0].textContent.trim(),date=c[5].textContent.trim();
      const r=byKey.get(serial+'|'+date);const path=r?.id?pathMap.get(r.id):null;const cell=c[12];
      if(!cell||!path)continue;
      if(cell.querySelector('.manager-report-link'))continue;
      cell.textContent='';
      const a=document.createElement('a');a.className='btn btn-primary manager-report-link manager-report-loading';a.href='#';a.textContent='⏳ تجهيز التقرير...';
      try{
        const url=await prepareUrl(path);
        a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.dataset.ready='1';a.textContent='⬇ تحميل التقرير';a.classList.remove('manager-report-loading');
      }catch(err){
        a.textContent='⚠ تعذر التحميل';a.classList.add('manager-report-error');a.title='تعذر إنشاء رابط التقرير';console.error('Report URL:',err);
      }
      cell.appendChild(a);
    }
  }
  function init(){
    style();let n=0;const tick=()=>{run();if(++n<30)setTimeout(tick,700)};tick();
    const tbody=document.getElementById('tbody');if(tbody){let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(run,250)}).observe(tbody,{childList:true,subtree:true})}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
