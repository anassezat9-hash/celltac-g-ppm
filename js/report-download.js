(function(){
  const STYLE_ID='report-download-style';
  function addStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent='.report-download-btn{display:block!important;width:100%;box-sizing:border-box;margin-top:5px;padding:6px 8px;font-size:11px;line-height:1.2;text-align:center;text-decoration:none}.report-download-btn.loading{opacity:.7;pointer-events:none}';
    document.head.appendChild(s);
  }
  async function prepareButton(btn,id){
    if(btn.dataset.ready||btn.dataset.loading) return;
    btn.dataset.loading='1';
    try{
      const {data,error}=await window.sb.from('visits').select('maintenance_report_path').eq('id',id).single();
      if(error||!data?.maintenance_report_path) throw new Error('no-report');
      const path=data.maintenance_report_path;
      const filename=(path.split('/').pop()||'maintenance-report').replace(/[^a-zA-Z0-9._-]/g,'_');
      const signed=await window.sb.storage.from('maintenance-reports').createSignedUrl(path,3600,{download:filename});
      if(!signed.data?.signedUrl) throw new Error('no-url');
      btn.href=signed.data.signedUrl;
      btn.dataset.ready='1';
      btn.textContent='⬇ تحميل التقرير';
      btn.classList.remove('loading');
      btn.target='_blank';
      btn.rel='noopener';
      btn.onclick=function(){
        setTimeout(function(){
          if(btn.dataset.ready==='1'){
            btn.classList.remove('loading');
            btn.textContent='⬇ تحميل التقرير';
          }
        },500);
      };
    }catch(e){
      btn.classList.remove('loading');
      btn.textContent='⚠ تعذر تجهيز التحميل';
      btn.title='تعذر إنشاء رابط تحميل التقرير';
      console.error('Report download:',e);
    }finally{delete btn.dataset.loading;}
  }
  function scan(){
    const tbody=document.getElementById('tbody');
    if(!tbody) return;
    tbody.querySelectorAll('button[onclick^="previewReport("]').forEach(view=>{
      if(view.parentElement.querySelector('.report-download-btn')) return;
      const m=view.getAttribute('onclick').match(/previewReport\(['\"]([^'\"]+)['\"]\)/);
      if(!m) return;
      const id=m[1];
      const a=document.createElement('a');
      a.className='btn btn-primary report-download-btn loading';
      a.href='#';
      a.textContent='⬇ تجهيز التحميل...';
      a.setAttribute('aria-label','تحميل التقرير');
      a.addEventListener('click',function(e){
        if(!a.dataset.ready){e.preventDefault();prepareButton(a,id);}
      });
      view.insertAdjacentElement('afterend',a);
    });
  }
  function init(){
    addStyle();
    scan();
    const tbody=document.getElementById('tbody');
    if(tbody)new MutationObserver(scan).observe(tbody,{childList:true,subtree:true});
    setTimeout(scan,500);
    setTimeout(scan,1500);
    setTimeout(scan,3000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
