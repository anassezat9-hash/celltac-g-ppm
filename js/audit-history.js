(function(){
 const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const $=id=>document.getElementById(id);let records=[],devices=[],engineers=[],managerUserId=null,hiddenAuditIds=new Set(),selectedAuditIds=new Set(),showHiddenAudit=false;
 const fmt=v=>v?new Date(v).toLocaleString('ar-EG'):'—';
 const actions={visit_insert:'تسجيل زيارة',visit_update:'تعديل زيارة',visit_delete:'حذف زيارة',visit_accepted:'قبول زيارة',visit_cancelled:'إلغاء زيارة',conflict_approved:'اعتماد تعارض قراءة',conflict_cancelled:'إلغاء زيارة بسبب تعارض',approval_approved:'اعتماد زيارة متأخرة',approval_rejected:'رفض زيارة متأخرة'}; let liveVisits={}; let reviewedVisits={};
 async function init(){let i=0;while(!window.sb&&i++<40)await new Promise(r=>setTimeout(r,250));if(!window.sb)return;const{data:{user}}=await sb.auth.getUser();if(!user)return;managerUserId=user.id;const{data:p}=await sb.from('profiles').select('full_name,role,active').eq('id',user.id).single();if(!p?.active||p.role!=='manager')return;$('auditWho').textContent=p.full_name||'';await Promise.all([lookups(),load(),loadPendingConflicts()]);}
 async function loadPendingConflicts(){
  const host=$('auditPendingActions');if(!host)return;
  host.innerHTML='<div class="small">جاري فحص الإجراءات التي تنتظر قرار المدير...</div>';
  const sync=await sb.rpc('sync_visit_reading_conflicts');
  if(sync.error){host.innerHTML='<div class="msg err">تعذر فحص التعارضات: '+esc(sync.error.message)+'</div>';return}
  const {data,error}=await sb.from('visit_reading_conflicts').select('id,serial_number,hospital_name,visit_date,previous_visit_date,current_total_count,previous_total_count,difference,status').eq('status','open').order('created_at',{ascending:false});
  if(error){host.innerHTML='<div class="msg err">تعذر تحميل الإجراءات المعلقة: '+esc(error.message)+'</div>';return}
  const rows=data||[];
  if(!rows.length){host.innerHTML='<div class="msg ok">لا توجد إجراءات تنتظر قرار المدير حالياً.</div>';return}
  host.innerHTML=rows.map(x=>'<article style="border:1px solid #f3c4c4;background:#fffafa;border-radius:12px;padding:12px;margin:8px 0"><b>تعارض قراءة — Serial '+esc(x.serial_number)+'</b><div class="small" style="margin:6px 0">'+esc(x.hospital_name)+' | تاريخ الزيارة: '+esc(x.visit_date)+'</div><div>القراءة السابقة: <b>'+Number(x.previous_total_count).toLocaleString('en-US')+'</b> — القراءة الحالية: <b>'+Number(x.current_total_count).toLocaleString('en-US')+'</b> — الفرق: <b>'+Number(x.difference).toLocaleString('en-US')+'</b></div><div class="toolbar" style="margin-top:10px"><button class="btn btn-primary" data-audit-approve="'+x.id+'">اعتماد الاستثناء وإغلاق التعارض</button><button class="btn" style="background:#b42318;color:white" data-audit-cancel="'+x.id+'">إلغاء الزيارة</button></div></article>').join('');
  host.querySelectorAll('[data-audit-approve]').forEach(b=>b.onclick=async()=>{const reason=prompt('اكتب سبب اعتماد الاستثناء:');if(reason===null)return;if(!reason.trim()){alert('سبب الاعتماد مطلوب.');return}if(!confirm('تأكيد اعتماد الاستثناء وإغلاق التعارض؟'))return;b.disabled=true;const r=await sb.rpc('approve_visit_reading_conflict',{p_conflict_id:b.dataset.auditApprove,p_reason:reason.trim()});if(r.error){alert('تعذر اعتماد التعارض: '+r.error.message);b.disabled=false;return}alert('تم اعتماد الاستثناء وتسجيل القرار في سجل المراجعات.');await Promise.all([loadPendingConflicts(),load()]);});
  host.querySelectorAll('[data-audit-cancel]').forEach(b=>b.onclick=async()=>{const reason=prompt('اكتب سبب إلغاء الزيارة:');if(reason===null)return;if(!reason.trim()){alert('سبب الإلغاء مطلوب.');return}if(!confirm('تأكيد إلغاء الزيارة؟ سيتم حذف الزيارة المتعارضة من سجل الزيارات مع الاحتفاظ بأثر القرار في سجل المراجعات.'))return;b.disabled=true;const r=await sb.rpc('cancel_visit_reading_conflict',{p_conflict_id:b.dataset.auditCancel,p_reason:reason.trim()});if(r.error){alert('تعذر إلغاء الزيارة: '+r.error.message);b.disabled=false;return}alert('تم إلغاء الزيارة وتسجيل القرار في سجل المراجعات.');await Promise.all([loadPendingConflicts(),load()]);});
 }
 async function lookups(){const[d,e]=await Promise.all([sb.from('devices').select('id,serial_number,hospital_name').order('hospital_name'),sb.from('engineers').select('id,name').order('name')]);devices=d.data||[];engineers=e.data||[];$('auditHospital').innerHTML='<option value="">كل الجهات</option>'+[...new Set(devices.map(x=>x.hospital_name).filter(Boolean))].sort().map(v=>'<option>'+esc(v)+'</option>').join('');$('auditEngineer').innerHTML='<option value="">كل المهندسين</option>'+engineers.map(x=>'<option value="'+x.id+'">'+esc(x.name)+'</option>').join('');}
 async function load(){$('auditRows').innerHTML='<tr><td colspan="11">جاري تحميل السجل...</td></tr>';const{data,error}=await sb.from('audit_log').select('id,action,entity_type,entity_id,device_id,engineer_id,actor_id,old_data,new_data,reason,created_at').order('created_at',{ascending:false}).limit(1500);if(error){$('auditRows').innerHTML='<tr><td colspan="11">تعذر تحميل السجل: '+esc(error.message)+'</td></tr>';return}records=data||[];const hiddenResult=await sb.from('audit_log_hidden').select('audit_id');if(hiddenResult.error){$('auditRows').innerHTML='<tr><td colspan="11">تعذر تحميل حالات إخفاء السجلات: '+esc(hiddenResult.error.message)+'</td></tr>';return}hiddenAuditIds=new Set((hiddenResult.data||[]).map(x=>x.audit_id));const ids=col=>[...new Set(records.map(x=>x[col]).filter(Boolean))];const visitIds=[...new Set(records.filter(x=>x.entity_type==='visit'&&x.action==='visit_insert').map(x=>x.entity_id).filter(Boolean))];const [d,e,p,v]=await Promise.all([ids('device_id').length?sb.from('devices').select('id,serial_number,hospital_name').in('id',ids('device_id')):Promise.resolve({data:[]}),ids('engineer_id').length?sb.from('engineers').select('id,name').in('id',ids('engineer_id')):Promise.resolve({data:[]}),ids('actor_id').length?sb.from('profiles').select('id,full_name,role,engineer_id').in('id',ids('actor_id')):Promise.resolve({data:[]}),visitIds.length?sb.from('visits').select('id').in('id',visitIds):Promise.resolve({data:[]})]);const dm=Object.fromEntries((d.data||[]).map(x=>[x.id,x])),em=Object.fromEntries((e.data||[]).map(x=>[x.id,x])),pm=Object.fromEntries((p.data||[]).map(x=>[x.id,x]));liveVisits=Object.fromEntries((v.data||[]).map(x=>[x.id,true]));reviewedVisits={};records.filter(x=>x.entity_type==='visit'&&['visit_accepted','visit_cancelled'].includes(x.action)).forEach(x=>reviewedVisits[x.entity_id]=x.action);records=records.map(x=>({...x,devices:dm[x.device_id]||{},engineers:em[x.engineer_id]||{},actor:pm[x.actor_id]||{}}));render();}
 function render(){
  const serial=$('auditSerial').value.trim().toLowerCase(),hospital=$('auditHospital').value,engineer=$('auditEngineer').value,action=$('auditAction').value,from=$('auditFrom').value,to=$('auditTo').value;
  const isEngineerAction=x=>x.actor?.role==='engineer'&&(!x.actor.engineer_id||!x.engineer_id||x.actor.engineer_id===x.engineer_id);
  const visitDateOf=x=>String(x.new_data?.visit_date||x.old_data?.visit_date||'').slice(0,10);
  const timeOf=x=>new Date(x.created_at||0).getTime();
  const correctedAuditIds=new Set();
  const visitInserts=records.filter(x=>x.entity_type==='visit'&&x.action==='visit_insert'&&isEngineerAction(x));
  const visitDeletes=records.filter(x=>x.entity_type==='visit'&&x.action==='visit_delete'&&isEngineerAction(x));
  const correctionWindow=7*24*60*60*1000;
  visitDeletes.forEach(del=>{
   const deletedAt=timeOf(del),visitDate=visitDateOf(del);
   if(!del.device_id||!del.engineer_id||!visitDate||!Number.isFinite(deletedAt))return;
   const replacementWindow=10*60*1000;
   const replacements=visitInserts.filter(ins=>{
    const delta=timeOf(ins)-deletedAt;
    return ins.device_id===del.device_id&&ins.engineer_id===del.engineer_id&&ins.actor_id===del.actor_id&&delta>0&&delta<=replacementWindow;
   }).sort((a,b)=>timeOf(a)-timeOf(b));
   if(!replacements.length)return;
   correctedAuditIds.add(del.id);correctedAuditIds.add(replacements[0].id);
   const priorInserts=visitInserts.filter(ins=>{
    const delta=deletedAt-timeOf(ins);
    return ins.device_id===del.device_id&&ins.engineer_id===del.engineer_id&&ins.actor_id===del.actor_id&&visitDateOf(ins)===visitDate&&delta>=0&&delta<=correctionWindow;
   }).sort((a,b)=>{if(a.entity_id===del.entity_id)return -1;if(b.entity_id===del.entity_id)return 1;return timeOf(b)-timeOf(a)});
   if(priorInserts.length)correctedAuditIds.add(priorInserts[0].id);
  });
  const engineerEditIds=new Set(records.filter(x=>x.entity_type==='visit'&&x.action==='visit_update'&&isEngineerAction(x)).map(x=>x.id));
  const cutoff=new Date();cutoff.setHours(0,0,0,0);cutoff.setDate(cutoff.getDate()-7);
  const needsManagerApproval=x=>{
   if(x.action!=='visit_insert'||x.entity_type!=='visit')return true;
   const visitDate=visitDateOf(x);if(!visitDate)return false;
   const parsed=new Date(visitDate+'T00:00:00');return !Number.isNaN(parsed.getTime())&&parsed<cutoff;
  };
  const decidedIds=new Set(records.filter(x=>x.entity_type==='visit'&&['visit_accepted','visit_cancelled'].includes(x.action)).map(x=>x.entity_id));
  const deletedIds=new Set(records.filter(x=>x.entity_type==='visit'&&x.action==='visit_delete').map(x=>x.entity_id));
  const conflictCancelDevices=new Set(records.filter(x=>x.action==='conflict_cancelled').map(x=>x.device_id).filter(Boolean));
  const matching=records.filter(x=>{
   if(correctedAuditIds.has(x.id)||engineerEditIds.has(x.id))return false;
   if(x.entity_type==='visit'&&x.action==='visit_insert'&&(!needsManagerApproval(x)||decidedIds.has(x.entity_id)||(!liveVisits[x.entity_id]&&deletedIds.has(x.entity_id))))return false;
   if(x.entity_type==='visit'&&x.action==='visit_delete'&&(decidedIds.has(x.entity_id)||conflictCancelDevices.has(x.device_id)))return false;
   const d=x.devices||{};
   return(!serial||String(d.serial_number||'').toLowerCase().includes(serial))&&(!hospital||d.hospital_name===hospital)&&(!engineer||x.engineer_id===engineer)&&(!action||x.action===action)&&(!from||x.created_at.slice(0,10)>=from)&&(!to||x.created_at.slice(0,10)<=to);
  });
  const a=matching.filter(x=>showHiddenAudit?hiddenAuditIds.has(x.id):!hiddenAuditIds.has(x.id));
  $('auditCount').textContent='عدد السجلات: '+a.length+' '+(showHiddenAudit?'(سجلات مخفية)':'(السجلات الظاهرة)')+' — من آخر 1500 سجل';
  $('auditHideSelected').style.display=showHiddenAudit?'none':'inline-flex';
  $('auditRestoreSelected').style.display=showHiddenAudit?'inline-flex':'none';
  $('auditShowHidden').checked=showHiddenAudit;
  const selectedVisible=a.filter(x=>selectedAuditIds.has(x.id)).length;
  $('auditHideSelected').disabled=showHiddenAudit||selectedVisible===0;
  $('auditRestoreSelected').disabled=!showHiddenAudit||selectedVisible===0;
  $('auditSelectAll').checked=a.length>0&&selectedVisible===a.length;
  $('auditSelectAll').indeterminate=selectedVisible>0&&selectedVisible<a.length;
  $('auditRows').innerHTML=a.length?a.map(x=>{
   const d=x.devices||{},e=x.engineers||{},o=x.old_data||{},n=x.new_data||{};
   const eligible=x.action==='visit_insert'&&x.entity_type==='visit'&&needsManagerApproval(x)&&liveVisits[x.entity_id]&&!reviewedVisits[x.entity_id];
   const controls=eligible?'<button class="btn btn-primary" data-visit-decision="accept" data-visit-id="'+x.entity_id+'">قبول</button> <button class="btn" data-visit-decision="cancel" data-visit-id="'+x.entity_id+'">إلغاء</button> <button class="btn" style="background:#b42318;color:white" data-visit-decision="delete" data-visit-id="'+x.entity_id+'">حذف نهائي</button>':(x.action==='visit_accepted'?'تم القبول':x.action==='visit_cancelled'?'تم الإلغاء':'—');
   const hiddenLabel=showHiddenAudit?'<span class="small" style="color:#b45309">مخفي</span>':'';
   return'<tr'+(showHiddenAudit?' style="background:#fffaf0"':'')+'><td><input type="checkbox" data-audit-select="'+x.id+'" '+(selectedAuditIds.has(x.id)?'checked':'')+' aria-label="تحديد السجل"></td><td>'+esc(fmt(x.created_at))+'</td><td>'+esc(actions[x.action]||x.action)+' '+hiddenLabel+'</td><td>'+esc(d.serial_number||'—')+'</td><td>'+esc(d.hospital_name||'—')+'</td><td>'+esc(e.name||'—')+'</td><td>'+esc(o.total_count??'—')+'</td><td>'+esc(n.total_count??'—')+'</td><td>'+esc(x.actor?.full_name||'—')+'</td><td><button class="btn" data-detail="'+x.id+'">عرض</button></td><td style="min-width:230px;white-space:nowrap">'+controls+'</td></tr>';
  }).join(''):'<tr><td colspan="11">'+(showHiddenAudit?'لا توجد سجلات مخفية مطابقة.':'لا توجد سجلات مطابقة.')+'</td></tr>';
  $('auditRows').querySelectorAll('[data-audit-select]').forEach(b=>b.onchange=()=>{if(b.checked)selectedAuditIds.add(b.dataset.auditSelect);else selectedAuditIds.delete(b.dataset.auditSelect);renderSelectionState(a)});
  $('auditRows').querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>detail(records.find(x=>x.id===b.dataset.detail)));
  $('auditRows').querySelectorAll('[data-visit-decision]').forEach(b=>b.onclick=()=>decideVisit(b.dataset.visitId,b.dataset.visitDecision,b));
 }
 function renderSelectionState(visibleRows){
  const count=visibleRows.filter(x=>selectedAuditIds.has(x.id)).length;
  $('auditSelectAll').checked=visibleRows.length>0&&count===visibleRows.length;
  $('auditSelectAll').indeterminate=count>0&&count<visibleRows.length;
  $('auditHideSelected').disabled=showHiddenAudit||count===0;
  $('auditRestoreSelected').disabled=!showHiddenAudit||count===0;
 }
 async function hideSelectedAudit(){
  const ids=[...selectedAuditIds].filter(id=>!hiddenAuditIds.has(id)&&records.some(x=>x.id===id));
  if(!ids.length){alert('حدد سجلًا واحدًا على الأقل.');return}
  if(!confirm('سيتم إخفاء '+ids.length+' سجل من صفحة المراجعات فقط. لن يتم حذف الزيارات أو بيانات التعارض من قاعدة التشغيل. يمكنك إظهار السجلات المخفية واستعادتها لاحقًا. هل تريد المتابعة؟'))return;
  const rows=ids.map(audit_id=>({audit_id,hidden_by:managerUserId}));
  const{error}=await sb.from('audit_log_hidden').insert(rows);
  if(error){alert('تعذر إخفاء السجلات: '+error.message);return}
  ids.forEach(id=>{hiddenAuditIds.add(id);selectedAuditIds.delete(id)});
  render();alert('تم إخفاء السجلات المحددة من صفحة المراجعات.');
 }
 async function restoreSelectedAudit(){
  const ids=[...selectedAuditIds].filter(id=>hiddenAuditIds.has(id));
  if(!ids.length){alert('حدد سجلًا مخفيًا واحدًا على الأقل.');return}
  if(!confirm('سيتم إظهار '+ids.length+' سجل مرة أخرى في صفحة المراجعات. هل تريد المتابعة؟'))return;
  const{error}=await sb.from('audit_log_hidden').delete().in('audit_id',ids);
  if(error){alert('تعذرت استعادة السجلات: '+error.message);return}
  ids.forEach(id=>{hiddenAuditIds.delete(id);selectedAuditIds.delete(id)});
  render();alert('تمت استعادة السجلات المحددة.');
 }
 async function decideVisit(id,decision,button){const labels={accept:'قبول الزيارة',cancel:'إلغاء الزيارة مع الاحتفاظ بسجلها',delete:'حذف الزيارة نهائياً مع حذف سجلها التدقيقي'};const reason=prompt('اكتب سبب '+labels[decision]+':');if(reason===null)return;if(!reason.trim()){alert('سبب الإجراء مطلوب.');return}const warning=decision==='delete'?'تحذير: سيتم حذف الزيارة وجميع سجلاتها التدقيقية نهائياً ولا يمكن التراجع.':decision==='cancel'?'سيتم حذف الزيارة من السجل التشغيلي مع الاحتفاظ بأثر الإلغاء في سجل المراجعات.':'سيتم تسجيل قبول الزيارة في سجل المراجعات دون حذفها.';if(!confirm(warning+'\\nهل تريد المتابعة؟'))return;button.disabled=true;const r=await sb.rpc('manager_decide_audit_visit',{p_visit_id:id,p_decision:decision,p_reason:reason.trim()});if(r.error){alert('تعذر تنفيذ الإجراء: '+r.error.message);button.disabled=false;return}alert('تم '+labels[decision]+' بنجاح.');await load();}
 function detail(x){
  const m=document.createElement('div');
  m.style.cssText='position:fixed;inset:0;background:#0009;z-index:99999;display:flex;align-items:center;justify-content:center;padding:14px';
  const labels={visit_date:'تاريخ الزيارة',total_count:'قراءة العداد',previous_total_count:'القراءة السابقة',current_total_count:'القراءة الحالية',difference:'الفرق بين القراءتين',device_status:'حالة الجهاز',spare_parts:'قطع الغيار',status:'حالة الإجراء',approval_reason:'سبب الاعتماد',cancellation_reason:'سبب الإلغاء'};
  const readable=(data)=>{
   if(!data||typeof data!=='object'||!Object.keys(data).length)return '<p class="small">لا توجد بيانات إضافية.</p>';
   const entries=Object.entries(data).filter(([k,v])=>labels[k]&&v!==null&&v!==undefined&&v!=='');
   if(!entries.length)return '<p class="small">لا توجد تفاصيل إضافية لعرضها.</p>';
   return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px">'+entries.map(([k,v])=>'<div style="background:#f5f7fa;border:1px solid #e5e7eb;border-radius:9px;padding:10px"><div class="small" style="color:#667085;margin-bottom:5px">'+esc(labels[k])+'</div><b>'+esc(k==='status'?(v==='cancelled'?'ملغاة':v==='approved_closed'?'تم الاعتماد':v==='open'?'مفتوح':v):String(v))+'</b></div>').join('')+'</div>';
  };
  const title=actions[x.action]||x.action;
  m.innerHTML='<div style="background:white;border-radius:14px;padding:16px;max-width:650px;width:100%;max-height:88vh;overflow:auto"><div class="toolbar"><h2>تفاصيل '+esc(title)+'</h2><button class="btn" id="closeAuditDetail">إغلاق</button></div><p><b>السبب:</b> '+esc(x.reason||'—')+'</p><p><b>التاريخ والوقت:</b> '+esc(fmt(x.created_at))+'</p><h3>البيانات قبل الإجراء</h3>'+readable(x.old_data)+'<h3 style="margin-top:16px">نتيجة الإجراء</h3>'+readable(x.new_data)+'</div>';
  document.body.appendChild(m);
  m.querySelector('#closeAuditDetail').onclick=()=>m.remove();
  m.onclick=e=>{if(e.target===m)m.remove()};
 }
 document.addEventListener('DOMContentLoaded',()=>{if(!$('auditPage'))return; $('auditPage').innerHTML='<section class="card" style="margin-bottom:14px"><h2>📌 إجراءات تنتظر قرار المدير</h2><div id="auditPendingActions"></div></section><section class="card"><div class="filters"><div><label>Serial</label><input id="auditSerial" placeholder="بحث برقم الجهاز"></div><div><label>الجهة</label><select id="auditHospital"></select></div><div><label>المهندس</label><select id="auditEngineer"></select></div><div><label>نوع الإجراء</label><select id="auditAction"><option value="">كل الإجراءات</option>'+Object.entries(actions).map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join('')+'</select></div><div><label>من تاريخ الإجراء</label><input id="auditFrom" type="date"></div><div><label>إلى تاريخ الإجراء</label><input id="auditTo" type="date"></div></div><div class="toolbar" style="flex-wrap:wrap;gap:8px"><span id="auditCount">جاري التحميل...</span><button id="auditHideSelected" class="btn" disabled>🗃️ إخفاء المحدد</button><button id="auditRestoreSelected" class="btn" style="display:none" disabled>↩ استعادة المحدد</button><label style="display:inline-flex;align-items:center;gap:6px"><input id="auditShowHidden" type="checkbox"> عرض السجلات المخفية</label><button id="auditClear" class="btn">مسح الفلاتر</button><button id="auditRefresh" class="btn">تحديث</button></div><div class="table-wrap"><table class="visit-table" style="min-width:1080px"><thead><tr><th><input id="auditSelectAll" type="checkbox" aria-label="تحديد الكل"></th><th>التاريخ والوقت</th><th>الإجراء</th><th>Serial</th><th>الجهة</th><th>المهندس</th><th>من</th><th>إلى</th><th>المنفذ</th><th>التفاصيل</th><th>الإجراءات</th></tr></thead><tbody id="auditRows"></tbody></table></div></section><p class="small">ملاحظة: السجل يبدأ من تاريخ تفعيل التدقيق؛ لا يمكن استعادة تعديلات قديمة لم تكن مسجلة وقت حدوثها.</p>';$('auditRefresh').onclick=()=>{selectedAuditIds.clear();load()};$('auditHideSelected').onclick=hideSelectedAudit;$('auditRestoreSelected').onclick=restoreSelectedAudit;$('auditShowHidden').onchange=()=>{showHiddenAudit=$('auditShowHidden').checked;selectedAuditIds.clear();render()};$('auditSelectAll').onchange=()=>{const boxes=[...$('auditRows').querySelectorAll('[data-audit-select]')];boxes.forEach(b=>{b.checked=$('auditSelectAll').checked;if(b.checked)selectedAuditIds.add(b.dataset.auditSelect);else selectedAuditIds.delete(b.dataset.auditSelect)});render()};$('auditClear').onclick=()=>{['auditSerial','auditHospital','auditEngineer','auditAction','auditFrom','auditTo'].forEach(id=>$(id).value='');selectedAuditIds.clear();render()};['auditSerial','auditHospital','auditEngineer','auditAction','auditFrom','auditTo'].forEach(id=>$(id).addEventListener('input',()=>{selectedAuditIds.clear();render()}));init();});
})();