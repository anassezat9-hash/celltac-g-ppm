(function(){
  // The manager dashboard has its own report-link handler.
  if(document.getElementById('reportModal')) return;
  const STYLE_ID='report-download-style';
  function addStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style');s.id=STYLE_ID;
    s.textContent='.report-download-btn{display:inline-block!important;min-width:92px;box-sizing:border-box;margin:0;padding:6px 8px;font-size:11px;line-height:1.2;text-align:center;text-decoration:none;white-space:nowrap}.report-download-btn.loading{opacity:.7;pointer-events:none}';
    document.head.appendChild(s);
  }
  async function makeUrl(btn,id){
    if(btn.dataset.busy) return;
    btn.dataset.busy='1';btn.textContent='⏳ تجهيز...';
    try{
      const {data,error}=await window.sb.from('visits').select('maintenance_report_path').eq('id',id).single();
      if(error||!data?.maintenance_report_path) throw new Error('no-report');
      const path=data.maintenance_report_path;
      const filename=(path.split('/').pop()||'maintenance-report').replace(/[^a-zA-Z0-9._-]/g,'_');
      const r=await window.sb.storage.from('maintenance-reports').createSignedUrl(path,3600,{download:filename});
      if(!r.data?.signedUrl) throw new Error('no-url');
      btn.href=r.data.signedUrl;btn.target='_blank';btn.rel='noopener';btn.dataset.ready='1';
      btn.textContent='⬇ تحميل التقرير';btn.classList.remove('loading');
    }catch(e){
      btn.textContent='⚠ لا يوجد تقرير';btn.title='تعذر إنشاء رابط تحميل التقرير';btn.classList.remove('loading');console.error('Report download:',e);
    }finally{delete btn.dataset.busy;}
  }
  async function loadReportMap(){
    const tbody=document.getElementById('tbody');if(!tbody||!window.sb)return;
    const table=tbody.closest('table');if(!table)return;
    const headers=[...table.querySelectorAll('thead th')].map(x=>x.textContent.trim());
    const serialIndex=headers.indexOf('Serial'),dateIndex=headers.indexOf('تاريخ الزيارة'),reportIndex=headers.indexOf('التقرير');
    if(serialIndex<0||dateIndex<0||reportIndex<0)return;
    const dates=[...new Set([...tbody.rows].map(tr=>tr.cells[dateIndex]?.textContent.trim()).filter(Boolean))];if(!dates.length)return;
    const {data,error}=await window.sb.from('visits').select('id,visit_date,maintenance_report_path,devices:device_id(serial_number)').in('visit_date',dates);
    if(error){console.error('Report list:',error);return;}
    const map=new Map();(data||[]).forEach(v=>{const serial=v.devices?.serial_number;if(serial&&v.visit_date)map.set(serial+'|'+v.visit_date,v)});
    [...tbody.rows].forEach(tr=>{
      const serial=tr.cells[serialIndex]?.textContent.trim(),date=tr.cells[dateIndex]?.textContent.trim(),cell=tr.cells[reportIndex],v=map.get(serial+'|'+date);
      if(!cell||!v?.maintenance_report_path||cell.querySelector('.report-download-btn'))return;
      cell.textContent='';const a=document.createElement('a');a.className='btn btn-primary report-download-btn loading';a.href='#';a.textContent='⬇ تحميل التقرير';
      a.addEventListener('click',function(e){if(!a.dataset.ready){e.preventDefault();makeUrl(a,v.id)}});cell.appendChild(a);
    });
  }
  function init(){
    addStyle();loadReportMap();const tbody=document.getElementById('tbody');
    if(tbody){let timer;new MutationObserver(function(){clearTimeout(timer);timer=setTimeout(loadReportMap,150)}).observe(tbody,{childList:true,subtree:true})}
    setTimeout(loadReportMap,500);setTimeout(loadReportMap,1500);setTimeout(loadReportMap,3000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
