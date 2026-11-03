(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  let tries=0;
  async function init(){
    if(!window.sb || !document.querySelector('.container') || !document.querySelector('.kpis')){if(++tries<40)setTimeout(init,300);return}
    try{
      const {data:{user}}=await sb.auth.getUser(); if(!user)return;
      const {data:profile}=await sb.from('profiles').select('role,active').eq('id',user.id).single();
      if(!profile?.active || profile.role!=='manager')return;
      let card=document.getElementById('readingConflictsCard');
      if(!card){
        card=document.createElement('section');card.id='readingConflictsCard';card.className='card';
        card.style.cssText='margin:0 0 16px;border-right:5px solid #b42318';
        card.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><h2 style="margin:0 0 5px">⚠️ مراجعة تعارضات القراءات</h2><div class="small">القراءات الأقل من القراءة السابقة، مع سجل قرارات المدير.</div></div><button id="refreshReadingConflicts" class="btn">تحديث</button></div><div id="readingConflictsContent" style="margin-top:12px">جاري فحص القراءات...</div>';
        const kpis=document.querySelector('.kpis');if(kpis)kpis.insertAdjacentElement('afterend',card);
        document.getElementById('refreshReadingConflicts').onclick=load;
      }
      await load();
    }catch(e){console.error('reading conflicts:',e)}
  }
  async function load(){
    const box=document.getElementById('readingConflictsContent');if(!box)return;
    box.textContent='جاري فحص القراءات...';
    const sync=await sb.rpc('sync_visit_reading_conflicts');
    if(sync.error){box.innerHTML='<div class="msg err">تعذر فحص التعارضات: '+esc(sync.error.message)+'</div>';return}
    const {data,error}=await sb.from('visit_reading_conflicts').select('id,serial_number,hospital_name,visit_date,previous_visit_date,current_total_count,previous_total_count,difference,status,approval_reason,approved_at,approved_by').order('created_at',{ascending:false}).limit(100);
    if(error){box.innerHTML='<div class="msg err">تعذر تحميل سجل التعارضات: '+esc(error.message)+'</div>';return}
    const all=data||[],open=all.filter(x=>x.status==='open'),closed=all.filter(x=>x.status==='approved_closed');
    const approverIds=[...new Set(closed.map(x=>x.approved_by).filter(Boolean))];
    const approverResult=approverIds.length?await sb.from('profiles').select('id,full_name').in('id',approverIds):{data:[],error:null};
    const approverNames=new Map((approverResult.data||[]).map(x=>[x.id,x.full_name]));
    let html='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px"><span class="badge '+(open.length?'bad':'good')+'">مفتوح: '+open.length+'</span><span class="badge good">مغلق بموافقة المدير: '+closed.length+'</span></div>';
    if(!open.length)html+='<div style="padding:14px;border-radius:10px;background:#ecfdf3;color:#067647;font-weight:700">✓ لا توجد تعارضات مفتوحة حالياً.</div>';
    else html+=open.map(x=>'<article style="border:1px solid #fecaca;background:#fffafa;border-radius:12px;padding:12px;margin:9px 0"><div style="font-weight:800;font-size:15px">Serial '+esc(x.serial_number)+' — '+esc(x.hospital_name)+'</div><div class="small" style="margin:5px 0">الزيارة الحالية: '+esc(x.visit_date)+' | السابقة: '+esc(x.previous_visit_date)+'</div><div style="display:flex;gap:8px;flex-wrap:wrap"><span>السابقة: <b>'+Number(x.previous_total_count).toLocaleString('en-US')+'</b></span><span>الحالية: <b>'+Number(x.current_total_count).toLocaleString('en-US')+'</b></span><span style="color:#b42318;font-weight:800">الفرق: '+Number(x.difference).toLocaleString('en-US')+'</span></div><button class="btn btn-primary" data-close-conflict="'+esc(x.id)+'" style="margin-top:10px">اعتماد وإغلاق التعارض</button></article>').join('');
    if(closed.length)html+='<details style="margin-top:12px"><summary style="cursor:pointer;font-weight:800">سجل التعارضات المغلقة ('+closed.length+')</summary>'+closed.map(x=>'<div style="border-bottom:1px solid #eee;padding:9px 0"><b>Serial '+esc(x.serial_number)+' — '+esc(x.hospital_name)+'</b><div class="small">'+esc(x.visit_date)+' | '+Number(x.difference).toLocaleString('en-US')+' عينة</div><div class="small">اعتمد بواسطة: '+esc(approverNames.get(x.approved_by)||'مدير')+' | '+esc(x.approved_at?new Date(x.approved_at).toLocaleString('ar-EG'):'—')+'<br>سبب الموافقة: '+esc(x.approval_reason||'—')+'</div></div>').join('')+'</details>';
    box.innerHTML=html;
    box.querySelectorAll('[data-close-conflict]').forEach(btn=>btn.onclick=async()=>{
      const reason=prompt('اكتب سبب اعتماد الاستثناء وإغلاق التعارض:');
      if(reason===null)return;
      if(!reason.trim()){alert('يجب كتابة سبب الموافقة.');return}
      btn.disabled=true;btn.textContent='جاري الحفظ...';
      const result=await sb.rpc('approve_visit_reading_conflict',{p_conflict_id:btn.dataset.closeConflict,p_reason:reason.trim()});
      if(result.error){alert('تعذر إغلاق التعارض: '+result.error.message);btn.disabled=false;btn.textContent='اعتماد وإغلاق التعارض';return}
      await load();
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();