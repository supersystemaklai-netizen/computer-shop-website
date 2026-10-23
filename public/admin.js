const cfg=window.SITE_CONFIG;const configured=cfg.supabaseUrl.startsWith('http')&&cfg.supabaseAnonKey.length>30;const db=configured?supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey):null;let rows=[];
const login=document.getElementById('login-screen'),dash=document.getElementById('dash'),msg=document.getElementById('login-error');
function showLogin(text=''){login.style.display='flex';dash.classList.remove('open');msg.textContent=text}function showDash(){login.style.display='none';dash.classList.add('open');loadProducts();loadSettings();loadServices()}
async function boot(){if(!configured)return showLogin('First add your Supabase URL and anon key in site-config.js.');const {data}=await db.auth.getSession();data.session?showDash():showLogin()}
document.getElementById('login-form').addEventListener('submit',async e=>{e.preventDefault();msg.textContent='';const {error}=await db.auth.signInWithPassword({email:document.getElementById('login-email').value,password:document.getElementById('login-password').value});error?showLogin(error.message):showDash()});
document.getElementById('logout-btn').addEventListener('click',async()=>{await db.auth.signOut();showLogin()});
document.querySelectorAll('[data-panel]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-panel]').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));btn.classList.add('active');document.getElementById(`panel-${btn.dataset.panel}`).classList.add('active')}));
async function loadProducts(){const {data,error}=await db.from('products').select('*').order('sort_order').order('created_at',{ascending:false});if(error)return alert(error.message);rows=data||[];document.getElementById('product-count').textContent=`${rows.length} total`;document.getElementById('product-table').innerHTML=rows.length?rows.map(p=>`<tr><td>${p.name}${p.active?'':' (hidden)'}</td><td>${p.category}</td><td>₹${Number(p.offer_price||p.price).toLocaleString('en-IN')}</td><td>${p.stock}</td><td><div class="row-actions"><button class="btn-small" data-edit="${p.id}">Edit</button><button class="btn-small danger" data-delete="${p.id}">Delete</button></div></td></tr>`).join(''):'<tr><td colspan="5">No products yet.</td></tr>'}
document.getElementById('product-table').addEventListener('click',async e=>{
 const action=e.target.closest('[data-edit],[data-delete]');
 if(!action)return;
 const edit=action.dataset.edit,del=action.dataset.delete;
 if(edit){
  const p=rows.find(x=>String(x.id)===String(edit));
  if(!p){alert('Product was not found in the current list. Refresh and try again.');return}
  for(const [id,v] of [
   ['product-id',p.id],['p-name',p.name],['p-category',p.category],['p-price',p.price],
   ['p-offer',p.offer_price||''],['p-stock',p.stock],['p-sort',p.sort_order],
   ['p-image',p.image||''],['p-description',p.description||''],['p-brand',p.brand||''],
   ['p-model',p.model_number||''],['p-source',p.official_url||''],['p-warranty',p.warranty||''],
   ['p-compatibility',p.compatibility||''],['p-condition',p.condition||'New'],
   ['p-specifications',(Array.isArray(p.specifications)?p.specifications:[]).map(s=>typeof s==='string'?s:(s.name||s.label||'')+': '+(s.value||s.detail||'')).join('\\n')]
  ])document.getElementById(id).value=v;
  document.getElementById('p-best').checked=!!p.best_offer;
  document.getElementById('p-active').checked=!!p.active;
  document.getElementById('product-form-title').textContent='Edit product';
  document.getElementById('save-btn').textContent='Save changes';
  document.getElementById('cancel-btn').hidden=false;
  scrollTo({top:0,behavior:'smooth'});
  return;
 }
 if(del&&confirm('Delete this product permanently? This action cannot be undone.')){
  action.disabled=true;
  action.textContent='Deleting…';
  try{
   const {data,error}=await db.from('products').delete().eq('id',del).select('id,name');
   if(error)throw error;
   if(!Array.isArray(data)||data.length===0){
    alert('Product was not deleted. Your current login may not have admin permission. Sign out, sign in again, and retry.');
    await loadProducts();
    return;
   }
   await loadProducts();
   alert('Product deleted successfully.');
  }catch(err){
   alert('Delete failed: '+(err?.message||'Unknown database error'));
   await loadProducts();
  }finally{
   action.disabled=false;
  }
 }
});
function resetForm(){document.getElementById('product-form').reset();document.getElementById('product-id').value='';document.getElementById('p-active').checked=true;document.getElementById('product-form-title').textContent='Add a product';document.getElementById('save-btn').textContent='Add product';document.getElementById('cancel-btn').hidden=true}document.getElementById('cancel-btn').addEventListener('click',resetForm);
document.getElementById('product-form').addEventListener('submit',async e=>{e.preventDefault();const id=document.getElementById('product-id').value;const payload={name:document.getElementById('p-name').value,category:document.getElementById('p-category').value,price:Number(document.getElementById('p-price').value),offer_price:document.getElementById('p-offer').value?Number(document.getElementById('p-offer').value):null,stock:Number(document.getElementById('p-stock').value||0),sort_order:Number(document.getElementById('p-sort').value||0),image:document.getElementById('p-image').value.trim(),description:document.getElementById('p-description').value.trim(),brand:document.getElementById('p-brand').value.trim(),model_number:document.getElementById('p-model').value.trim(),official_url:document.getElementById('p-source').value.trim(),warranty:document.getElementById('p-warranty').value.trim(),compatibility:document.getElementById('p-compatibility').value.trim(),condition:document.getElementById('p-condition').value,specifications:document.getElementById('p-specifications').value.split('\n').map(line=>line.trim()).filter(Boolean).map(line=>{const i=line.indexOf(':');return i<0?{name:line,value:''}:{name:line.slice(0,i).trim(),value:line.slice(i+1).trim()}}),best_offer:document.getElementById('p-best').checked,active:document.getElementById('p-active').checked};if(!id)payload.id=crypto.randomUUID();const result=id?await db.from('products').update(payload).eq('id',id):await db.from('products').insert(payload);if(result.error)return document.getElementById('form-message').textContent=result.error.message;resetForm();loadProducts()});boot();
async function loadSettings(){const {data,error}=await db.from('site_settings').select('*').eq('id',1).single();if(error)return document.getElementById('settings-message').textContent=error.message;document.getElementById('s-name').value=data.site_name||'';document.getElementById('s-tagline').value=data.tagline||'';document.getElementById('s-whatsapp').value=data.whatsapp_number||'';document.getElementById('s-address').value=data.address||'';document.getElementById('s-hours').value=data.working_hours||'';document.getElementById('s-ticker').value=(data.ticker||[]).join('\n');document.getElementById('s-topbar').value=data.topbar_text||'Akola shop pickup • Computer & CCTV solutions • Repair booking';document.getElementById('s-theme-primary').value=data.theme_primary||'#176b4b';document.getElementById('s-theme-accent').value=data.theme_accent||'#d5f36a';document.getElementById('s-theme-background').value=data.theme_background||'#f7f8f3';document.getElementById('s-theme-text').value=data.theme_text||'#192a24';document.getElementById('s-theme-mode').value=data.theme_mode||'light'}
document.getElementById('settings-form').addEventListener('submit',async e=>{e.preventDefault();const out=document.getElementById('settings-message'),number=document.getElementById('s-whatsapp').value.trim();out.textContent='';if(!/^\d{8,15}$/.test(number)){out.textContent='Enter 8–15 digits including country code, without + or spaces.';return}const payload={site_name:document.getElementById('s-name').value.trim(),tagline:document.getElementById('s-tagline').value.trim(),whatsapp_number:number,address:document.getElementById('s-address').value.trim(),working_hours:document.getElementById('s-hours').value.trim(),ticker:document.getElementById('s-ticker').value.split('\n').map(x=>x.trim()).filter(Boolean),topbar_text:document.getElementById('s-topbar').value.trim(),theme_primary:document.getElementById('s-theme-primary').value,theme_accent:document.getElementById('s-theme-accent').value,theme_background:document.getElementById('s-theme-background').value,theme_text:document.getElementById('s-theme-text').value,theme_mode:document.getElementById('s-theme-mode').value,updated_at:new Date().toISOString()};const {error}=await db.from('site_settings').update(payload).eq('id',1);out.style.color=error?'#dc2626':'#16803a';out.textContent=error?error.message:'Settings saved successfully. Refresh the website to see changes.'});

let serviceRows=[];
async function loadServices(){const out=document.getElementById('svc-message');const {data,error}=await db.from('service_catalog').select('*').order('sort_order');if(error){out.textContent='Service catalog not ready. Run supabase-migration.sql from GitHub in Supabase SQL Editor. Details: '+error.message;return}serviceRows=data||[];const select=document.getElementById('svc-select');select.innerHTML=serviceRows.map(s=>'<option value="'+s.id+'">'+s.title+'</option>').join('');select.onchange=populateServiceForm;if(serviceRows.length)populateServiceForm()}
function populateServiceForm(){const s=serviceRows.find(x=>x.id===document.getElementById('svc-select').value);if(!s)return;document.getElementById('svc-title').value=s.title||'';document.getElementById('svc-description').value=s.description||'';document.getElementById('svc-image').value=s.image||'';document.getElementById('svc-rates').value=(Array.isArray(s.rates)?s.rates:[]).map(r=>r.name+' | '+r.charges).join('\n');document.getElementById('svc-note').value=s.rate_note||'Price may vary after inspection.';document.getElementById('svc-active').checked=s.active!==false;document.getElementById('svc-message').textContent='';}
document.getElementById('service-form').addEventListener('submit',async e=>{e.preventDefault();const out=document.getElementById('svc-message'),id=document.getElementById('svc-select').value;out.textContent='';const rates=document.getElementById('svc-rates').value.split('\n').map(line=>line.trim()).filter(Boolean).map(line=>{const parts=line.split('|');return {name:(parts.shift()||'').trim(),charges:parts.join('|').trim()}});if(!rates.length||rates.some(r=>!r.name||!r.charges)){out.textContent='Enter each line as Service Name | Charge.';return}const s=serviceRows.find(x=>x.id===id);if(!s){out.textContent='Service not found.';return}const payload={title:document.getElementById('svc-title').value.trim(),description:document.getElementById('svc-description').value.trim(),image:document.getElementById('svc-image').value.trim(),rates,rate_note:document.getElementById('svc-note').value.trim(),active:document.getElementById('svc-active').checked,updated_at:new Date().toISOString()};const {error}=await db.from('service_catalog').update(payload).eq('id',id);if(error){out.textContent=error.message;return}serviceRows=serviceRows.map(x=>x.id===id?{...x,...payload}:x);document.querySelector('#svc-select option:checked').textContent=payload.title;out.style.color='#34e2a1';out.textContent='Service and rates saved. Refresh the main website to view changes.'});
