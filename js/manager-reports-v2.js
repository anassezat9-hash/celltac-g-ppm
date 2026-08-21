(function(){
  const STYLE_ID='manager-reports-v2-style';
  function style(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');s.id=STYLE_ID;
    s.textContent='.manager-report-link{display:inline-flex!important;align-items:center;justify-content:center;white-space:nowrap;min-width:105px;padding:6px 8px!important;font-size:11px!important;line-height:1.2!important;text-decoration:none!important;margin:0!important}.manager-report-loading{opacity:.7}.manager-report-error{font-size:11px;color:#b42318}';
    document.head.appendChild(s);
  }
  async function getVisits(){
    if(!window.sb)return [];
    const {data,error}=await window.sb.from('visits').select('id,visit_date,maintenance_report_path,device_id,devices:device_id(serial_number)').not('maintenance_report_path','is',null);
    if(error){console.error('manager report links:',error);return []}
    return data||[];
  }
  async function run(){
    const tbody=document.getElementById('tbody');
    if(!tbody||!window.sb)return;
    const domRows=[...tbody.rows];
    if(!domRows.length)return;
    const visits=await getVisits();
    const map=new Map();
    visits.forEach(v=>{
      const serial=v.devices?.serial_number;
      if(serial&&v.visit_date&&v.maintenance_report_path)map.set(serial+'|'+v.visit_date,v);
    });
    domRows.forEach(tr=>{
      const c=tr.cells;
      if(c.length<13)return;
      const serial=c[0].textContent.trim();
      const date=c[5].textContent.trim();
      const cell=c[12];
      const v=map.get(serial+'|'+date);
      if(!cell||!v?.maintenance_report_path)return;
      if(cell.querySelector('.manager-report-link'))return;
      cell.textContent='';
      const a=document.createElement('a');
      a.className='btn btn-primary manager-report-link manager-report-loading';
      a.href='#';
      a.textContent='⬇ تحميل التقرير';
      a.addEventListener('click',async e=>{
        e.preventDefault();
        if(a.dataset.busy)return;
        a.dataset.busy='1';
        a.textContent='⏳ تجهيز...';
        try{
          const filename=(v.maintenance_report_path.split('/').pop()||'maintenance-report').replace(/[^a-zA-Z0-9._-]/g,'_');
          const r=await window.sb.storage.from('maintenance-reports').createSignedUrl(v.maintenance_report_path,3600,{download:filename});
          if(!r.data?.signedUrl)throw new Error('no signed url');
          a.href=r.data.signedUrl;
          a.target='_blank';
          a.rel='noopener';
          a.textContent='⬇ تحميل التقرير';
          a.classList.remove('manager-report-loading');
        }catch(err){
          a.textContent='⚠ تعذر التحميل';
          a.classList.add('manager-report-error');
          console.error(err);
        }finally{delete a.dataset.busy}
      });
      cell.appendChild(a);
    });
  }
  function init(){
    style();
    let n=0;
    const tick=()=>{run();if(++n<30)setTimeout(tick,700)};
    tick();
    const tbody=document.getElementById('tbody');
    if(tbody){
      let timer;
      new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(run,200)}).observe(tbody,{childList:true,subtree:true});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
