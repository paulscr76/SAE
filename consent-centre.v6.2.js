
(() => {
  const PLAN_KEY='saveEarnPaulV6Plan',OS_KEY='saveEarnPaulV6OS',PREF_KEY='saveEarnPaulV6Preferences';
  const allKeys=[PLAN_KEY,OS_KEY,PREF_KEY,'saveEarnPaulV31Plan','saveEarnPaulV3Plan','saveEarnPaulV6BillMeta','saveEarnPaulV5BillMeta','saveEarnPaulV3BillMeta','saveEarnPaulRecentGuide'];
  const read=k=>{try{return JSON.parse(localStorage.getItem(k))}catch(_){return null}};
  const plan=()=>read(PLAN_KEY),os=()=>read(OS_KEY)||{tasks:[],documents:[],consent:{}};
  const inventory=document.getElementById('dataInventory');
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function renderInventory(){
    const p=plan(),o=os(),prefs=read(PREF_KEY);
    const rows=[
      ['Household plan',p?'Present':'Not found'],
      ['Living-plan tasks',`${(o.tasks||[]).length} stored`],
      ['Document metadata',`${(o.documents||[]).length} item${(o.documents||[]).length===1?'':'s'}`],
      ['Appearance preferences',prefs?'Present':'Not found'],
      ['Bill files','Never retained by the website']
    ];
    inventory.innerHTML=rows.map(([a,b])=>`<div class="data-row"><span>${a}</span><strong>${b}</strong></div>`).join('');
  }
  const fields=[['energy','Energy figures and basis'],['broadband','Broadband experience and contract'],['mobile','Mobile requirements'],['insurance','Insurance and renewal timing'],['earning','Flexible-earning interest'],['tasks','Open action-plan items'],['documents','Document labels only']];
  const options=document.getElementById('consentOptions');
  let consent={energy:true,broadband:true,mobile:true,insurance:true,earning:false,tasks:true,documents:false,...(os().consent||{})};
  options.innerHTML=fields.map(([id,label])=>`<label class="share-option"><input type="checkbox" data-consent="${id}" ${consent[id]?'checked':''}><span><strong>${label}</strong><small>${id==='documents'?'No file content is included.':'Include this information in the brief.'}</small></span></label>`).join('');
  function priorityLabel(p){return{save:'Reducing household costs',understand:'Understanding the household',earn:'Exploring flexible earning',both:'Saving and earning'}[p]||'Not selected'}
  function brief(){
    const p=plan(),o=os();if(!p)return'No household plan exists on this device.';
    const parts=[`Main priority: ${priorityLabel(p.priority)}.`];
    if(consent.energy)parts.push(`Energy basis: ${p.energyMode==='actual'?'annual kWh supplied':'household estimate'}. Electricity ${Math.round(+p.actualElectric||0).toLocaleString('en-GB')||'not confirmed'} kWh${+p.actualGas?`, gas ${Math.round(+p.actualGas).toLocaleString('en-GB')} kWh`:''}.`);
    if(consent.broadband)parts.push(`Broadband: ${p.broadbandExperience||'not supplied'}, contract ${p.broadbandContract||'not supplied'}.`);
    if(consent.mobile)parts.push(`Mobile: ${p.mobileLines||'not supplied'}, concern ${p.mobileConcern||'not supplied'}.`);
    if(consent.insurance)parts.push(`Insurance: ${p.insuranceInterest||'not selected'}, renewal ${p.insuranceRenewal||'not supplied'}.`);
    if(consent.earning)parts.push(`Flexible earning: ${p.earningInterest||'not supplied'}. Income is not guaranteed.`);
    if(consent.tasks){const tasks=(o.tasks||[]).filter(t=>t.status!=='done').slice(0,5);if(tasks.length)parts.push('Open actions: '+tasks.map(t=>t.title).join('; ')+'.');}
    if(consent.documents&&(o.documents||[]).length)parts.push('Available document labels: '+o.documents.map(d=>d.label).join(', ')+'.');
    return parts.join('\n');
  }
  function updateBrief(){document.querySelectorAll('[data-consent]').forEach(c=>consent[c.dataset.consent]=c.checked);const o=os();o.consent=consent;localStorage.setItem(OS_KEY,JSON.stringify(o));document.getElementById('consentBrief').textContent=brief();}
  document.querySelectorAll('[data-consent]').forEach(c=>c.onchange=updateBrief);updateBrief();
  document.getElementById('copyConsentBrief').onclick=async()=>{await navigator.clipboard.writeText(brief());showToast('Meeting brief copied');};
  document.getElementById('whatsappConsentBrief').onclick=()=>window.open('https://wa.me/447925008477?text='+encodeURIComponent('Hi Paul, here is the information I chose to share:\n\n'+brief()),'_blank','noopener');

  const enc=new TextEncoder(),dec=new TextDecoder();
  const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes)));
  const fromB64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
  async function derive(pass,salt,usage){
    const material=await crypto.subtle.importKey('raw',enc.encode(pass),'PBKDF2',false,['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:210000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,usage);
  }
  const status=(msg)=>{const el=document.getElementById('backupStatus');el.hidden=false;el.textContent=msg;};
  document.getElementById('encryptedExport').onclick=async()=>{
    const pass=document.getElementById('backupPassphrase').value;
    if(pass.length<10){status('Use a passphrase of at least 10 characters.');return;}
    try{
      const payload={type:'SaveAndEarnWithPaulEncryptedBackup',version:'6.2',exportedAt:new Date().toISOString(),plan:plan(),os:os(),preferences:read(PREF_KEY)};
      const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await derive(pass,salt,['encrypt']);
      const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(JSON.stringify(payload)));
      const wrapper={type:'SEWP4',kdf:'PBKDF2-SHA256',iterations:210000,cipher:'AES-256-GCM',salt:b64(salt),iv:b64(iv),data:b64(ciphertext)};
      const blob=new Blob([JSON.stringify(wrapper)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`save-earn-encrypted-backup-${new Date().toISOString().slice(0,10)}.sewp4`;a.click();URL.revokeObjectURL(a.href);status('Encrypted backup created. Keep the passphrase separately.');window.trackSafe?.('encrypted_backup_export');
    }catch(_){status('The encrypted backup could not be created in this browser.');}
  };
  document.getElementById('encryptedImport').onclick=async()=>{
    const pass=document.getElementById('backupPassphrase').value,file=document.getElementById('encryptedImportFile').files[0];
    if(!file||pass.length<10){status('Choose a .sewp4 file and enter its passphrase.');return;}
    try{
      const wrapper=JSON.parse(await file.text());if(wrapper.type!=='SEWP4')throw new Error();
      const salt=fromB64(wrapper.salt),iv=fromB64(wrapper.iv),key=await derive(pass,salt,['decrypt']);
      const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,fromB64(wrapper.data));const payload=JSON.parse(dec.decode(plain));
      if(payload.type!=='SaveAndEarnWithPaulEncryptedBackup')throw new Error();
      if(payload.plan)localStorage.setItem(PLAN_KEY,JSON.stringify(payload.plan));if(payload.os)localStorage.setItem(OS_KEY,JSON.stringify(payload.os));if(payload.preferences)localStorage.setItem(PREF_KEY,JSON.stringify(payload.preferences));
      status('Encrypted backup restored. Reloading the Household OS.');setTimeout(()=>location.href='/household-os',600);window.trackSafe?.('encrypted_backup_import');
    }catch(_){status('The backup could not be decrypted. Check the file and passphrase.');}
  };

  document.getElementById('plainExport').onclick=()=>{
    const payload={type:'SaveAndEarnWithPaulPlan',version:'6.2',exportedAt:new Date().toISOString(),plan:plan(),os:os(),preferences:read(PREF_KEY)};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='save-and-earn-household-plan.json';a.click();URL.revokeObjectURL(a.href);
  };
  document.getElementById('plainImportFile').onchange=async e=>{
    try{const payload=JSON.parse(await e.target.files[0].text());if(!payload.plan&&!payload.data)throw new Error();localStorage.setItem(PLAN_KEY,JSON.stringify(payload.plan||payload.data));if(payload.os)localStorage.setItem(OS_KEY,JSON.stringify(payload.os));if(payload.preferences)localStorage.setItem(PREF_KEY,JSON.stringify(payload.preferences));showToast('Plan imported');renderInventory();updateBrief();}catch(_){showToast('That JSON file was not recognised');}e.target.value='';
  };
  document.getElementById('eraseLocalData').onclick=()=>{
    if(!confirm('Erase all Save & Earn local data from this browser?'))return;
    allKeys.forEach(k=>localStorage.removeItem(k));Object.keys(localStorage).filter(k=>k.startsWith('guideFeedback:')).forEach(k=>localStorage.removeItem(k));renderInventory();updateBrief();showToast('Local household data erased');
  };
  renderInventory();
})();
