(function(){
  const STYLE_ID='manager-reports-v10-style';
  function style(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');s.id=STYLE_ID;
    s.textContent='.manager-report-link{display:inline-flex!important;align-items:center;justify-content:center;white-space:nowrap!important;min-width:110px;padding:6px 8px!important;font-size:11px!important;line-height:1.2!important;text-decoration:none!important;margin:0!important;cursor:pointer}.manager-report-loading{opacity:.7;pointer-events:none}.manager-report-error{font-size:11px!important;color:#b42318!important}#tbody td,#tbody th{white-space:nowrap!important;vertical-align:middle!important;word-break:normal!important;overflow-wrap:normal!important}#tbody td:nth-child(6),#tbody th:nth-child(6){white-space:nowrap!important;min-width:115px!important;width:115px!important}#tbody td:nth-child(12),#tbody th:nth-child(12){min-width:125px!important;width:125px!important;white-space:nowrap!important}#tbody td:nth-child(13),#tbody th:nth-child(13){min-width:170px!important;width:170px!important;white-space:nowrap!important}#tbody td:nth-child(11){min-width:105px!important}.table-wrap{overflow-x:auto!important;-webkit-overflow-scrolling:touch}.table-wrap table{min-width:1420px!important}';
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
  function getVisibleRows(){
    const tbody=document.getElementById('tbody');
    return tbody?[...tbody.rows]:[];
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
  async function downloadReport(path,a){
    if(a.dataset.busy)return;
    a.dataset.busy='1';
    const old=a.textContent;
    a.textContent='⏳ جاري التحميل...';
    try{
      const filename=(path.split('/').pop()||'maintenance-report').replace(/[^a-zA-Z0-9._-]/g,'_');
      const result=await window.sb.storage.from('maintenance-reports').download(path);
      if(!result.error&&result.data){
        const blobUrl=URL.createObjectURL(result.data);
        const dl=document.createElement('a');
        dl.href=blobUrl;dl.download=filename;dl.style.display='none';
        document.body.appendChild(dl);dl.click();dl.remove();
        setTimeout(()=>URL.revokeObjectURL(blobUrl),30000);
        a.textContent='✓ تم التحميل';
        setTimeout(()=>{a.textContent=old},1800);
        return;
      }
      const signed=await window.sb.storage.from('maintenance-reports').createSignedUrl(path,3600,{download:filename});
      if(signed.error||!signed.data?.signedUrl)throw new Error(signed.error?.message||result.error?.message||'download failed');
      window.location.href=signed.data.signedUrl;
    }catch(err){
      a.textContent='⚠ تعذر التحميل';
      a.classList.add('manager-report-error');
      a.title=err?.message||'تعذر تحميل التقرير';
      console.error('Report download:',err);
    }finally{delete a.dataset.busy}
  }
  async function run(){
    const tbody=document.getElementById('tbody');
    if(!tbody||!window.sb)return;
    reorderColumns();
    const domRows=getVisibleRows();
    if(!domRows.length)return;
    let source=[];
    try{source=typeof rows!=='undefined'&&Array.isArray(rows)?rows:[]}catch(e){}
    const byKey=new Map();source.forEach(r=>{if(r.serial_number&&r.visit_date)byKey.set(r.serial_number+'|'+r.visit_date,r)});
    const pathMap=await getPathMap();
    for(const tr of domRows){
      const c=tr.cells;if(c.length<13)continue;
      const serial=c[0].textContent.trim(),date=c[5].textContent.trim();
      const r=byKey.get(serial+'|'+date);const path=r?.id?pathMap.get(r.id):null;const cell=c[11];
      if(!cell||!path)continue;
      if(cell.querySelector('.manager-report-link'))continue;
      cell.textContent='';
      const a=document.createElement('button');
      a.type='button';
      a.className='btn btn-primary manager-report-link';
      a.textContent='⬇ تحميل التقرير';
      a.addEventListener('click',()=>downloadReport(path,a));
      cell.appendChild(a);
    }
  }
  function init(){
    style();
    let n=0;const tick=()=>{run();if(++n<30)setTimeout(tick,700)};tick();
    const tbody=document.getElementById('tbody');
    if(tbody){let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(run,250)}).observe(tbody,{childList:true,subtree:true})}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
