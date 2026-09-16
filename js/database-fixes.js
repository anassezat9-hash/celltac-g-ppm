/* Database page: governorate filter for devices */
(function(){
 let tries=0;
 async function init(){
  try{
   if(typeof sb==='undefined'||!document.getElementById('devicesBody')){if(++tries<40)setTimeout(init,250);return;}
   const {data:{user}}=await sb.auth.getUser();if(!user)return;
   const {data:p}=await sb.from('profiles').select('role,active').eq('id',user.id).single();if(!p?.active||p.role!=='manager')return;
   if(document.getElementById('dbGovernorateFilter'))return;
   const card=document.createElement('div');card.id='dbGovernorateFilter';card.className='card';card.style.cssText='margin-bottom:14px;border-right:4px solid #0f6673';
   card.innerHTML='<div class="toolbar"><div><h2>🏥 فلترة الأجهزة حسب المحافظة</h2><div class="small">اختار محافظة لعرض الأجهزة التابعة لها.</div></div><b id="dbGovCount" style="font-size:28px">0</b></div><div class="filters"><div><label>المحافظة</label><select id="dbGovSelect"><option value="">كل المحافظات</option></select></div></div><div class="table-wrap"><table><thead><tr><th>Serial</th><th>المستشفى</th><th>المحافظة</th><th>تاريخ التركيب</th></tr></thead><tbody id="dbGovBody"></tbody></table></div>';
   const parent=document.querySelector('.container');const first=parent?.querySelector('.card');if(!parent)return;parent.insertBefore(card,first||null);
   const select=document.getElementById('dbGovSelect');
   async function load(){const {data,error}=await sb.from('devices').select('id,serial_number,hospital_name,governorate,installation_date').order('hospital_name',{ascending:true});if(error)throw error;const ds=data||[];const govs=[...new Set(ds.map(d=>String(d.governorate||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));select.innerHTML='<option value="">كل المحافظات</option>'+govs.map(g=>'<option value="'+esc(g)+'">'+esc(g)+'</option>').join('');function draw(){const g=select.value,a=ds.filter(d=>!g||String(d.governorate||'').trim()===g);document.getElementById('dbGovCount').textContent=a.length;document.getElementById('dbGovBody').innerHTML=a.length?a.map(d=>'<tr><td><b>'+esc(d.serial_number)+'</b></td><td>'+esc(d.hospital_name)+'</td><td>'+esc(d.governorate||'—')+'</td><td>'+esc(d.installation_date||'—')+'</td></tr>').join(''):'<tr><td colspan="4">لا توجد أجهزة في هذه المحافظة.</td></tr>'}select.onchange=draw;draw()}
   await load();
  }catch(e){console.error('database-fixes',e);if(++tries<40)setTimeout(init,500)}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();