(function(){
  const STYLE_ID='manager-reports-v2-style';
  function style(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');s.id=STYLE_ID;
    s.textContent='.manager-report-link{display:inline-flex!important;align-items:center;justify-content:center;white-space:nowrap;min-width:105px;padding:6px 8px!important;font-size:11px!important;line-height:1.2!important;text-decoration:none!important;margin:0!important}.manager-report-loading{opacity:.65}';
    document.head.appendChild(s);
  }
  async function run(){
    if(!window.sb)return;
    const table=document.querySelector('#tbody')?.closest('table');
    if(!table||!table.tHead)return;
    const rows=[...document.querySelectorAll('#tbody tr')];
    if(!rows.length)return;
    const data=[];
    for(const tr of rows){
      const c=tr.cells;
      if(c.length<13)continue;
      const serial=c[0].textContent.trim();
      const date=c[5].textContent.trim();
      if(serial&&date)data.push({tr,serial,date,cell:c[12]});
    }
    if(!data.length)return;
    const dates=[...new Set(data.map(x=>x.date))];
    const {data:visits,error}=await window.sb.from('visits').select('id,visit_date,maintenance_report_path,device_id,devices:device_id(serial_number)').in('visit_date',dates);
    if(error){console.error('manager reports v2',error);return;}
    const map=new Map();
    (visits||[]).forEach(v=>{const s=v.devices?.serial_number;if(s&&v.visit_date&&v.maintenance_report_path)map.set(s+'|'+v.visit_date,v)});
    data.forEach(x=>{
      const v=map.get(x.serial+'|'+x.date);
      if(!v||!v.maintenance_report_path)return;
      if(x.cell.querySelector('.manager-report-link'))return;
      x.cell.textContent='';
      const a=document.createElement('a');
      a.className='btn btn-primary manager-report-link manager-report-loading';
      a.href='#';a.textContent='📎 تحميل التقرير';
      a.addEventListener('click',async e=>{
        e.preventDefault();
        if(a.dataset.busy)return;
        a.dataset.busy='1';a.textContent='⏳ تجهيز...';
        try{
          const filename=(v.maintenance_report_path.split('/').pop()||'maintenance-report').replace(/[^a-zA-Z0-9._-]/g,'_');
          const r=await window.sb.storage.from('maintenance-reports').createSignedUrl(v.maintenance_report_path,3600,{download:filename});
          if(!r.data?.signedUrl)throw new Error('no signed url');
          a.href=r.data.signedUrl;a.target='_blank';a.rel='noopener';a.textContent='⬇ تحميل التقرير';a.classList.remove('manager-report-loading');a.dataset.ready='1';
        }catch(err){a.textContent='⚠ تعذر التحميل';console.error(err)}finally{delete a.dataset.busy}
      });
      x.cell.appendChild(a);
    });
  }
  function init(){style();let n=0;const tick=()=>{run();if(++n<20)setTimeout(tick,500)};tick();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
