
(() => {
  const KEY='saveEarnPaulV3Plan';
  const form=document.getElementById('commandForm');
  if(!form)return;
  const panels=[...document.querySelectorAll('.wizard-panel')];
  const links=[...document.querySelectorAll('[data-step-link]')];
  const back=document.getElementById('commandBack');
  const next=document.getElementById('commandNext');
  const clear=document.getElementById('clearPlan');
  const error=document.getElementById('commandError');
  const saved=document.getElementById('savedState');
  let step=0;

  const ids=['propertyType','bedrooms','occupants','heating','efficiency','daytime','energyMode','energyConcern','actualElectric','actualGas','ev','solar','broadbandExperience','broadbandContract','workFromHome','mobileLines','mobileConcern','mobileContract','earningInterest','earningTime','earningGoal'];
  const getPriority=()=>form.querySelector('[name="priority"]:checked')?.value||'';
  const getState=()=>{const state={priority:getPriority()};ids.forEach(id=>state[id]=document.getElementById(id)?.value||'');return state;};
  const setState=state=>{if(!state)return;form.querySelector(`[name="priority"][value="${state.priority}"]`)?.click();ids.forEach(id=>{const el=document.getElementById(id);if(el&&state[id]!==undefined)el.value=state[id];});toggleActual();};
  const save=()=>{localStorage.setItem(KEY,JSON.stringify(getState()));saved.textContent='Progress saved on this device at '+new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+'.';};
  const load=()=>{try{const state=JSON.parse(localStorage.getItem(KEY));setState(state);if(state)saved.textContent='Saved progress restored from this device.';}catch(_ ){}};

  const baseE={1:1700,2:2150,3:2500,4:3200,5:3900,6:4600},baseG={1:6200,2:7800,3:9500,4:12200,5:15000,6:17800};
  const prop={flat:.78,terrace:.92,semi:1,detached:1.18,bungalow:1.08},eff={efficient:.82,average:1,inefficient:1.22},occ={low:.94,mixed:1,high:1.1};
  const estimateEnergy=()=>{const s=getState(),b=+s.bedrooms,p=+s.occupants;let e=baseE[b]||5200;e+=Math.max(0,p-b)*320;e*=prop[s.propertyType]||1;e*=occ[s.daytime]||1;if(s.ev==='yes')e+=2200;if(s.solar==='yes')e*=.78;if(s.heating==='electric')e+=6500;if(s.heating==='heatpump')e+=2800;let g=0;if(s.heating==='gas'){g=(baseG[b]||20000)+Math.max(0,p-b)*400;g*=prop[s.propertyType]||1;g*=eff[s.efficiency]||1;g=Math.max(3000,g);}return{e:Math.max(1000,e),g};};
  const energyValues=()=>{const s=getState(),est=estimateEnergy();if(s.energyMode==='actual')return{e:+s.actualElectric||est.e,g:s.heating==='gas'?(+s.actualGas||est.g):0,actual:Boolean(+s.actualElectric||+s.actualGas)};return{...est,actual:false};};
  const fmt=n=>Math.round(n).toLocaleString('en-GB')+' kWh';

  function toggleActual(){const actual=document.getElementById('energyMode').value==='actual';document.querySelectorAll('.hidden-actual').forEach(el=>el.style.display=actual?'block':'none');}
  document.getElementById('energyMode').addEventListener('change',toggleActual);

  function show(n){step=Math.max(0,Math.min(panels.length-1,n));panels.forEach((p,i)=>p.classList.toggle('active',i===step));links.forEach((l,i)=>{l.classList.toggle('active',i===step);l.classList.toggle('done',i<step)});back.style.visibility=step===0?'hidden':'visible';next.textContent=step===panels.length-1?'Start again':step===panels.length-2?'Build dashboard':'Next';error.classList.remove('show');if(step===panels.length-1)renderDashboard();window.scrollTo({top:document.querySelector('.command-main').offsetTop-95,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
  function validate(){if(step===0&&!getPriority()){error.innerHTML='<strong>Please choose a main priority.</strong>';error.classList.add('show');error.focus();return false;}if(step===2&&document.getElementById('energyMode').value==='actual'&&!(+document.getElementById('actualElectric').value||+document.getElementById('actualGas').value)){error.innerHTML='<strong>Enter at least one annual kWh figure, or choose an estimate.</strong>';error.classList.add('show');error.focus();return false;}return true;}

  const status=(kind,label,copy,metric,link)=>`<article class="dashboard-card"><div class="dashboard-card-top"><h3>${label}</h3><span class="status-pill status-${kind}">${kind==='review'?'Review':kind==='ready'?'Ready':'Low priority'}</span></div>${metric?`<div class="dashboard-metric">${metric}</div>`:''}<p>${copy}</p>${link||''}</article>`;
  function renderDashboard(){
    const s=getState(),energy=energyValues(),actions=[],cards=[];
    let eKind='low',eCopy='Energy is not currently marked as a priority.';
    if(s.energyConcern!=='none'||['save','understand','both'].includes(s.priority)){eKind='review';eCopy=energy.actual?'Actual annual figures are available for a conversation.':'The result is an indicative estimate; finding annual kWh would improve confidence.';actions.push(energy.actual?'Have the latest bill or annual statement available.':'Use the bill helper or calculator to confirm annual kWh.');}
    cards.push(status(eKind,'Energy',eCopy,fmt(energy.e)+(energy.g?' / '+fmt(energy.g):''),'<a href="/calculator">Open energy laboratory →</a>'));

    const broadbandNeeds=['slow','unreliable','expensive'].includes(s.broadbandExperience)||['ending','out'].includes(s.broadbandContract);
    cards.push(status(broadbandNeeds?'ready':'low','Broadband',broadbandNeeds?'A review may be useful based on experience or contract timing.':'No immediate broadband issue was identified.','', '<a href="/guides#broadband">Prepare for a review →</a>'));
    if(broadbandNeeds)actions.push('Note the current provider, speed and contract end date.');

    const mobileNeeds=s.mobileLines!=='none'||s.mobileConcern!=='none'||['ending','out'].includes(s.mobileContract);
    cards.push(status(mobileNeeds?'review':'low','Mobile',mobileNeeds?'There is enough information to discuss household mobile requirements.':'Mobile is not currently a priority.','', '<a href="/guides">Read the mobile guide →</a>'));
    if(mobileNeeds)actions.push('List the number of lines and the main signal, data or cost concern.');

    const earningNeeds=s.earningInterest!=='none'||['earn','both'].includes(s.priority);
    cards.push(status(earningNeeds?'review':'low','Flexible earning',earningNeeds?'A factual conversation can cover activity, training, time and costs. Income is not guaranteed.':'Flexible earning is not currently selected.','', `<a href="https://calendly.com/save-with-paul/chat-with-paul" target="_blank" rel="noopener">Book a factual conversation →</a>`));
    if(earningNeeds)actions.push('Prepare questions about activity, training, realistic time and any costs.');

    if(!actions.length)actions.push('Book a general conversation only if you would find one useful.');
    const actionHtml=actions.map((a,i)=>`<div class="action-item"><span class="action-no">${i+1}</span><div><strong>${a}</strong><span>You decide whether to take this step.</span></div></div>`).join('');
    const priority={save:'Reducing household costs',understand:'Understanding the household',earn:'Exploring flexible earning',both:'Saving and earning'}[s.priority]||'General review';
    document.getElementById('dashboardContent').innerHTML=`<div class="dashboard-head"><div><span class="kicker" style="color:var(--yellow)">Your household plan</span><h2>${priority}</h2><p>Generated locally from your answers on ${new Date().toLocaleDateString('en-GB',{dateStyle:'long'})}.</p></div><div class="plan-count"><div><strong>${actions.length}</strong><span>next steps</span></div></div></div><div class="dashboard-grid">${cards.join('')}</div><div class="action-plan"><h3>Your ordered action plan</h3><div class="action-list">${actionHtml}</div><div class="dashboard-actions no-print"><a class="btn btn-blue" href="https://calendly.com/save-with-paul/chat-with-paul" target="_blank" rel="noopener" data-track="booking_dashboard">Book a free 30-minute chat</a><button class="btn btn-yellow" type="button" id="sendPlan">WhatsApp my summary</button><button class="btn btn-light" type="button" id="downloadPlan">Download plan</button><button class="btn btn-light" type="button" id="printPlan">Print / save PDF</button></div></div><div class="notice blue">This is guidance, not a quotation, supplier recommendation, financial advice or income forecast.</div>`;
    const summary=`Household priority: ${priority}. Suggested next steps: ${actions.join(' ')} Energy result: about ${fmt(energy.e)} electricity${energy.g?' and '+fmt(energy.g)+' gas':''}.`;
    document.getElementById('sendPlan').onclick=()=>{window.open('https://wa.me/447925008477?text='+encodeURIComponent('Hi Paul, I completed the Household Command Centre. '+summary+' Could we discuss it?'),'_blank','noopener');window.trackSafe?.('command_whatsapp');};
    document.getElementById('printPlan').onclick=()=>window.print();
    document.getElementById('downloadPlan').onclick=()=>{const content='SAVE & EARN WITH PAUL — HOUSEHOLD ACTION PLAN\n\n'+summary+'\n\n'+actions.map((a,i)=>`${i+1}. ${a}`).join('\n')+'\n\nGenerated locally. No personal details were submitted.';const blob=new Blob([content],{type:'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='household-action-plan.txt';a.click();URL.revokeObjectURL(a.href);window.trackSafe?.('command_download');};
    window.trackSafe?.('command_completed',{priority:s.priority});
  }

  form.addEventListener('input',save);form.addEventListener('change',save);
  back.onclick=()=>show(step-1);next.onclick=()=>{if(step===panels.length-1){show(0);return;}if(validate()){save();show(step+1);}};
  links.forEach(link=>link.onclick=()=>{const n=+link.dataset.stepLink;if(n<=step||n===panels.length-1&&getPriority())show(n);});
  clear.onclick=()=>{if(confirm('Clear the saved household plan from this device?')){localStorage.removeItem(KEY);form.reset();toggleActual();saved.textContent='Saved plan cleared.';show(0);}};
  load();toggleActual();show(0);
})();
