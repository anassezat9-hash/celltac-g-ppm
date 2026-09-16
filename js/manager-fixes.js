/* Manager dashboard fixes: device count from devices + governorate filter */
(function(){
  let tries=0;
  async function init(){
    try{
      if(typeof sb==='undefined' || !document.getElementById('tbody')){if(++tries<40)setTimeout(init,250);return;}
      const {data:{user}}=await sb.auth.getUser();
      if(!user)return;
      const {data:p}=await sb.from('profiles').select('role,active').eq('id',user.id).single();
      if(!p?.active || p.role!=='manager')return;
      const {data:devices,error}=await sb.from('devices').select('id,serial_number,hospital_name,hospital_type,governorate,installation_date,model').order('hospital_name',{ascending:true});
      if(error)throw error;
      const ds=devices||[];
      const kpi=document.getElementById('devices'); if(kpi)kpi.textContent=String(ds.length);
      const old=document.getElementById('governorateDeviceFilter');if(old)old.remove();
      const card=document.createElement('div');card.id='governorateDeviceFilter';card.className='card';card.style.cssText='margin-bottom:14px;border-right:4px solid #0f6673';
      const govs=[...new Set(ds.map(d=>String(d.governorate||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));
      card.innerHTML='<div class="toolbar"><div><h2>🏥 الأجهزة حسب المحافظة</h2><div class="small">اختار المحافظة لعرض الأجهزة المسجلة بها.</div></div><b id="govDeviceCount" style="font-size:28px">'+ds.length+'</b></div><div class="filters"><div><label>المحافظة</label><select id="govDeviceSelect"><option value="">كل المحافظات</option>'+govs.map(g=>'<option value="'+esc(g)+'">'+esc(g)+'</option>').join('')+'</select></div></div><div class="table-wrap"><table><thead><tr><th>Serial</th><th>الجهة</th><th>نوع الجهة</th><th>المحافظة</th><th>تاريخ التركيب</th><th>الموديل</th></tr></thead><tbody id="govDeviceBody"></tbody></table></div>';
      const container=document.querySelector('.container');const visitCard=[...document.querySelectorAll('.card')].find(c=>c.querySelector('h2')?.textContent.includes('سجل الزيارات'));if(container)container.insertBefore(card,visitCard||container.lastElementChild);
      const sel=document.getElementById('govDeviceSelect');
      function draw(){const g=sel.value,a=ds.filter(d=>!g||String(d.governorate||'').trim()===g);document.getElementById('govDeviceCount').textContent=a.length;document.getElementById('govDeviceBody').innerHTML=a.length?a.map(d=>'<tr><td><b>'+esc(d.serial_number)+'</b></td><td>'+esc(d.hospital_name)+'</td><td>'+esc(d.hospital_type||'غير محدد')+'</td><td>'+esc(d.governorate||'—')+'</td><td>'+esc(d.installation_date||'—')+'</td><td>'+esc(d.model||'—')+'</td></tr>').join(''):'<tr><td colspan="6">لا توجد أجهزة في هذه المحافظة.</td></tr>'}
      sel.onchange=draw;draw();
      let n=0;const fix=()=>{const el=document.getElementById('devices');if(el)el.textContent=String(ds.length);if(++n<30)setTimeout(fix,500)};fix();
    }catch(e){console.error('manager-fixes',e);if(++tries<40)setTimeout(init,500)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();