
(() => {
  const PLAN_KEY='saveEarnPaulV6Plan', OS_KEY='saveEarnPaulV6OS';
  const defaultOS=()=>({version:'6.1',tasks:[],documents:[],consent:{energy:true,broadband:true,mobile:true,insurance:true,earning:false,tasks:true,documents:false},updatedAt:new Date().toISOString()});
  const read=(key,fallback=null)=>{try{return JSON.parse(localStorage.getItem(key))||fallback}catch(_){return fallback}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  let plan=read(PLAN_KEY),os={...defaultOS(),...(read(OS_KEY)||{})};
  if(!plan&&document.documentElement.dataset.demo==='true'){
    plan={
      version:'6.1',householdName:'The Example household',postcode:'BN21 1AA',priority:'both',
      propertyType:'semi',bedrooms:'3',occupants:'3',heating:'gas',efficiency:'average',daytime:'mixed',
      energyMode:'actual',actualElectric:'3120',actualGas:'11840',energyConcern:'cost',ev:'no',solar:'no',
      broadbandExperience:'unreliable',broadbandContract:'ending',broadbandRenewalDate:'2026-08-18',workFromHome:'work',
      mobileLines:'family',mobileConcern:'cost',mobileContract:'ending',mobileRenewalDate:'2026-10-04',
      insuranceInterest:'home',insuranceRenewal:'soon',insuranceRenewalDate:'2026-09-20',
      earningInterest:'curious',earningTime:'few',earningGoal:'bills',consentContact:true,
      meta:{updatedAt:new Date().toISOString(),energyInsight:{source:'actual',sourceLabel:'Customer-supplied actual annual usage',sourceGrade:'A',confidence:'Highest confidence',actual:true}}
    };
  }
  os.tasks=Array.isArray(os.tasks)?os.tasks:[];os.documents=Array.isArray(os.documents)?os.documents:[];
  const fmt=n=>Math.round(+n||0).toLocaleString('en-GB')+' kWh';
  const priorityLabel=p=>({save:'Reducing household costs',understand:'Understanding the household',earn:'Exploring flexible earning',both:'Saving and earning'}[p]||'Not selected');
  const energy=()=>{
    if(!plan)return{e:0,g:0,actual:false};
    const baseE={1:1700,2:2150,3:2500,4:3200,5:3900,6:4600},baseG={1:6200,2:7800,3:9500,4:12200,5:15000,6:17800};
    const prop={flat:.78,terrace:.92,semi:1,detached:1.18,bungalow:1.08},eff={efficient:.82,average:1,inefficient:1.22},occ={low:.94,mixed:1,high:1.1};
    const b=+plan.bedrooms||3,p=+plan.occupants||3;let e=(baseE[b]||5200)+Math.max(0,p-b)*320;e*=prop[plan.propertyType]||1;e*=occ[plan.daytime]||1;
    if(plan.ev==='yes')e+=2200;if(plan.solar==='yes')e*=.78;if(plan.heating==='electric')e+=6500;if(plan.heating==='heatpump')e+=2800;
    let g=0;if(plan.heating==='gas'){g=(baseG[b]||20000)+Math.max(0,p-b)*400;g*=prop[plan.propertyType]||1;g*=eff[plan.efficiency]||1;}
    if(['actual','annualised','epc'].includes(plan.energyMode)){
      const insight=plan.meta?.energyInsight;
      return{
        e:+plan.actualElectric||e,
        g:plan.heating==='gas'?(+plan.actualGas||g):0,
        actual:insight?Boolean(insight.actual):Boolean(+plan.actualElectric||+plan.actualGas),
        sourceLabel:insight?.sourceLabel||'Annual kWh supplied',
        confidence:insight?.confidence||(Boolean(+plan.actualElectric||+plan.actualGas)?'High confidence':'Indicative')
      };
    }
    return{e,g,actual:false,sourceLabel:plan.meta?.energyInsight?.sourceLabel||'Household estimate',confidence:plan.meta?.energyInsight?.confidence||'Indicative'};
  };
  function saveOS(){os.updatedAt=new Date().toISOString();write(OS_KEY,os);}

  function suggestedTasks(){
    if(!plan)return[];
    const list=[];const add=(id,title,owner='Household')=>list.push({id,title,owner,due:'',status:'open',createdAt:new Date().toISOString()});
    const en=energy();
    if(!en.actual&&(plan.energyConcern!=='none'||['save','understand','both'].includes(plan.priority)))add('confirm-energy','Find annual electricity and gas kWh');
    if(plan.broadbandContract==='unknown')add('broadband-date','Check broadband contract end date');
    if(['slow','unreliable','expensive'].includes(plan.broadbandExperience))add('broadband-notes','Note broadband speed and reliability problems');
    if(plan.mobileLines!=='none'&&plan.mobileContract==='unknown')add('mobile-date','Check mobile contract or upgrade dates');
    if(plan.insuranceInterest&&plan.insuranceInterest!=='none'&&plan.insuranceRenewal==='unknown')add('insurance-date','Check insurance renewal date');
    if(plan.earningInterest&&plan.earningInterest!=='none')add('earning-questions','Prepare questions about activity, training, time and costs');
    add('meeting-brief','Review and approve the meeting brief','Both');
    return list;
  }
  function mergeSuggested(){
    const existing=new Set(os.tasks.map(t=>t.id));suggestedTasks().forEach(t=>{if(!existing.has(t.id))os.tasks.push(t)});saveOS();renderTasks();renderOverview();
  }

  function renderOverview(){
    const root=document.getElementById('osOverview');
    if(!plan){root.innerHTML=`<div class="os-card os-empty"><span class="tag">NO PLAN FOUND</span><h2>Build your household plan first.</h2><p>The Command Centre takes a few minutes and does not ask for your name, address or account number.</p><a class="btn btn-yellow" href="/command-centre">Start the Command Centre</a></div>`;return;}
    const en=energy(),open=os.tasks.filter(t=>t.status!=='done').length,done=os.tasks.filter(t=>t.status==='done').length;const evaluation=window.HouseholdCheckV61?.evaluate(plan);
    const complete=[plan.priority,plan.propertyType,plan.energyMode,plan.broadbandExperience!=='unknown',plan.mobileLines==='none'||plan.mobileConcern!=='none',plan.insuranceInterest==='none'||plan.insuranceRenewal!=='unknown',plan.earningInterest==='none'||plan.earningTime!=='unknown'].filter(Boolean).length;
    const energyStatus=en.confidence|| (en.actual?'High confidence':'Indicative');
    const broadbandNeed=['slow','unreliable','expensive'].includes(plan.broadbandExperience)||['ending','out'].includes(plan.broadbandContract);
    const mobileNeed=plan.mobileLines!=='none'||plan.mobileConcern!=='none';
    const insuranceNeed=plan.insuranceInterest&&plan.insuranceInterest!=='none';
    const earningNeed=plan.earningInterest&&plan.earningInterest!=='none';
    root.innerHTML=`${evaluation?`<div class="os-readiness-banner"><div class="os-readiness-score" style="--score:${evaluation.score*3.6}deg"><strong>${evaluation.score}%</strong></div><div><span class="kicker" style="color:var(--yellow)">Household readiness</span><h2>${escapeHtml(evaluation.title)}</h2><p>${escapeHtml(evaluation.summary)}</p></div><a class="btn btn-yellow" href="/command-centre?view=result">Open my snapshot</a></div>`:''}<div class="os-card"><div class="os-head"><div><span class="kicker">Welcome back</span><h2>${priorityLabel(plan.priority)}</h2><p>Your household snapshot was last updated ${plan.meta?.updatedAt?new Date(plan.meta.updatedAt).toLocaleString('en-GB'): 'on this device'}.</p></div><span class="local-pill">Not sent to Paul</span></div>
      <div class="os-metrics"><div class="os-metric"><span>Information readiness</span><strong>${complete} of 7</strong></div><div class="os-metric"><span>Open actions</span><strong>${open}</strong></div><div class="os-metric"><span>Completed actions</span><strong>${done}</strong></div><div class="os-metric"><span>Energy confidence</span><strong>${energyStatus}</strong></div></div>
      <div class="os-launch-actions"><a class="btn btn-blue" href="/command-centre">Edit household details</a><button class="btn btn-light" id="overviewTasks" type="button">Open living plan</button><a class="btn btn-light" href="/copilot">Ask Paul’s guide</a><a class="btn btn-yellow" href="/report-studio?type=full">Create full printable summary</a></div></div>
      <div class="os-card"><div class="os-head"><div><span class="kicker">Household domains</span><h2>What deserves attention?</h2></div></div><div class="os-grid">
      <article class="os-domain"><div class="os-domain-top"><h3>Energy</h3><span class="os-status ${en.actual?'ready':'review'}">${en.actual?'Ready':'Review'}</span></div><p>${fmt(en.e)} electricity${en.g?' and '+fmt(en.g)+' gas':''}. ${escapeHtml(en.sourceLabel|| (en.actual?'Annual kWh supplied':'Indicative estimate'))}. ${escapeHtml(en.confidence||'')}</p><a href="/calculator">Open Energy Data Passport →</a></article>
      <article class="os-domain"><div class="os-domain-top"><h3>Broadband</h3><span class="os-status ${broadbandNeed?'review':'low'}">${broadbandNeed?'Review':'Low priority'}</span></div><p>${broadbandNeed?'Experience or contract timing suggests a useful conversation.':'No immediate issue identified.'}</p><a href="/guides#broadband">Preparation guide →</a></article>
      <article class="os-domain"><div class="os-domain-top"><h3>Mobile</h3><span class="os-status ${mobileNeed?'review':'low'}">${mobileNeed?'Review':'Low priority'}</span></div><p>${mobileNeed?'Household mobile requirements are included.':'Mobile is not currently selected.'}</p></article>
      <article class="os-domain"><div class="os-domain-top"><h3>Insurance</h3><span class="os-status ${insuranceNeed?'review':'low'}">${insuranceNeed?'Review':'Low priority'}</span></div><p>${insuranceNeed?'Insurance and renewal timing are included.':'Insurance is not currently selected.'}</p></article>
      <article class="os-domain"><div class="os-domain-top"><h3>Flexible earning</h3><span class="os-status ${earningNeed?'review':'low'}">${earningNeed?'Explore':'Low priority'}</span></div><p>${earningNeed?'Use a factual conversation to understand activity, training, time and costs.':'Not currently selected.'}</p></article>
      </div></div>`;
    document.getElementById('overviewTasks')?.addEventListener('click',()=>activate('plan'));
  }

  function renderTasks(){
    const root=document.getElementById('taskList');
    if(!os.tasks.length){root.innerHTML='<div class="os-empty"><h2>No living-plan tasks yet.</h2><p>Generate suggested tasks from the household plan or add your own.</p></div>';return;}
    root.innerHTML=os.tasks.map((t,i)=>`<article class="task-item ${t.status==='done'?'done':''}" data-task="${t.id}"><button class="task-status" type="button" data-task-status="${t.id}" aria-label="Change status">${t.status==='done'?'✓':t.status==='doing'?'→':'○'}</button><div><div class="task-title">${escapeHtml(t.title)}</div><div class="task-meta"><span class="task-chip">${escapeHtml(t.owner||'Household')}</span>${t.due?`<span class="task-chip">Due ${new Date(t.due+'T00:00:00').toLocaleDateString('en-GB')}</span>`:''}<span class="task-chip">${t.status==='done'?'Complete':t.status==='doing'?'In progress':'Open'}</span></div></div><div class="task-actions"><button type="button" data-task-up="${t.id}" aria-label="Move up">↑</button><button type="button" data-task-down="${t.id}" aria-label="Move down">↓</button><button type="button" data-task-delete="${t.id}" aria-label="Delete">×</button></div></article>`).join('');
    root.querySelectorAll('[data-task-status]').forEach(b=>b.onclick=()=>{const t=os.tasks.find(x=>x.id===b.dataset.taskStatus);t.status=t.status==='open'?'doing':t.status==='doing'?'done':'open';saveOS();renderTasks();renderOverview();});
    root.querySelectorAll('[data-task-delete]').forEach(b=>b.onclick=()=>{os.tasks=os.tasks.filter(x=>x.id!==b.dataset.taskDelete);saveOS();renderTasks();renderOverview();});
    const move=(id,delta)=>{const i=os.tasks.findIndex(x=>x.id===id),j=i+delta;if(i<0||j<0||j>=os.tasks.length)return;[os.tasks[i],os.tasks[j]]=[os.tasks[j],os.tasks[i]];saveOS();renderTasks();};
    root.querySelectorAll('[data-task-up]').forEach(b=>b.onclick=()=>move(b.dataset.taskUp,-1));
    root.querySelectorAll('[data-task-down]').forEach(b=>b.onclick=()=>move(b.dataset.taskDown,1));
  }
  const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  document.getElementById('taskForm').addEventListener('submit',e=>{e.preventDefault();const title=document.getElementById('taskTitle').value.trim();if(!title)return;os.tasks.push({id:'custom-'+crypto.randomUUID(),title,owner:document.getElementById('taskOwner').value,due:document.getElementById('taskDue').value,status:'open',createdAt:new Date().toISOString()});e.target.reset();saveOS();renderTasks();renderOverview();});
  document.getElementById('seedTasks').onclick=mergeSuggested;
  document.getElementById('clearCompleted').onclick=()=>{os.tasks=os.tasks.filter(t=>t.status!=='done');saveOS();renderTasks();renderOverview();};

  function renderTwin(){
    const root=document.getElementById('digitalTwin');
    if(!plan){root.innerHTML='<div class="os-card os-empty"><h2>No household model yet.</h2><a class="btn btn-yellow" href="/command-centre">Build the model</a></div>';return;}
    const en=energy(),scenario=plan.meta?.scenarioComparison,confidence=en.actual?90:62;
    root.innerHTML=`${evaluation?`<div class="os-readiness-banner"><div class="os-readiness-score" style="--score:${evaluation.score*3.6}deg"><strong>${evaluation.score}%</strong></div><div><span class="kicker" style="color:var(--yellow)">Household readiness</span><h2>${escapeHtml(evaluation.title)}</h2><p>${escapeHtml(evaluation.summary)}</p></div><a class="btn btn-yellow" href="/command-centre?view=result">Open my snapshot</a></div>`:''}<div class="os-card"><div class="os-head"><div><span class="kicker">Household digital twin</span><h2>A simplified picture—not a promise.</h2><p>The visual model uses the information already supplied and shows assumptions openly.</p></div><a class="btn btn-light btn-small" href="/calculator">Test scenarios</a></div><div class="twin-layout"><div class="house-diagram" aria-label="Visual household model"><div class="house-roof"></div><div class="house-shape"></div><div class="house-window one"></div><div class="house-window two"></div><div class="house-door"></div><div class="flow-bubble flow-energy"><span>ENERGY</span><strong>${fmt(en.e)}</strong></div><div class="flow-bubble flow-home"><span>HOME</span><strong>${plan.bedrooms||'?'} bed / ${plan.occupants||'?'} people</strong></div><div class="flow-bubble flow-connect"><span>BROADBAND</span><strong>${plan.broadbandExperience||'unknown'}</strong></div><div class="flow-bubble flow-mobile"><span>MOBILE</span><strong>${plan.mobileLines||'not set'}</strong></div></div><div class="twin-details"><div class="twin-row"><span>Property</span><strong>${plan.propertyType||'Not supplied'}</strong></div><div class="twin-row"><span>Main heating</span><strong>${plan.heating||'Not supplied'}</strong></div><div class="twin-row"><span>Solar / EV</span><strong>${plan.solar==='yes'?'Solar ':''}${plan.ev==='yes'?'EV':''}${plan.solar!=='yes'&&plan.ev!=='yes'?'Neither selected':''}</strong></div><div class="twin-row"><span>Energy basis</span><strong>${escapeHtml(en.sourceLabel|| (en.actual?'Actual annual kWh':'Household estimate'))}</strong></div>${scenario?`<div class="twin-row"><span>Saved future scenario</span><strong>${escapeHtml(scenario.name||'Scenario')}: ${fmt(scenario.e)} electricity</strong></div>`:''}<div><div class="twin-row"><span>Model confidence</span><strong>${escapeHtml(en.confidence|| (en.actual?'High':'Indicative'))}</strong></div><div class="confidence-bar"><span style="width:${confidence}%"></span></div></div></div></div><div class="notice blue">This model is educational. It is not an EPC, engineering assessment, tariff quote or forecast of financial savings.</div></div>`;
  }

  function renderDocuments(){
    const root=document.getElementById('documentList');
    if(!os.documents.length){root.innerHTML='<div class="os-empty"><h2>No document metadata saved.</h2><p>Use the bill helper to record what you have without retaining the file.</p></div>';return;}
    root.innerHTML=os.documents.map(d=>`<article class="document-item"><span class="document-icon">${d.type==='energy'?'E':d.type==='broadband'?'B':'M'}</span><div><strong>${escapeHtml(d.label)}</strong><span>${escapeHtml(d.fileName||'File not retained')} • Added ${new Date(d.addedAt).toLocaleDateString('en-GB')}</span></div><button type="button" data-document-delete="${d.id}">Remove</button></article>`).join('');
    root.querySelectorAll('[data-document-delete]').forEach(b=>b.onclick=()=>{os.documents=os.documents.filter(d=>d.id!==b.dataset.documentDelete);saveOS();renderDocuments();});
  }

  function brief(selections=os.consent){
    if(!plan)return'No household plan exists yet.';
    const en=energy(),parts=[`Main priority: ${priorityLabel(plan.priority)}.`];
    if(selections.energy)parts.push(`Energy: ${fmt(en.e)} electricity${en.g?' and '+fmt(en.g)+' gas':''} (${en.sourceLabel|| (en.actual?'annual figures supplied':'indicative estimate')}; ${en.confidence||'confidence not supplied'}).`);
    if(selections.broadband)parts.push(`Broadband: experience ${plan.broadbandExperience||'not supplied'}, contract ${plan.broadbandContract||'not supplied'}.`);
    if(selections.mobile)parts.push(`Mobile: ${plan.mobileLines||'not supplied'}, concern ${plan.mobileConcern||'not supplied'}.`);
    if(selections.insurance)parts.push(`Insurance: ${plan.insuranceInterest||'not selected'}, renewal ${plan.insuranceRenewal||'not supplied'}.`);
    if(selections.earning)parts.push(`Flexible earning interest: ${plan.earningInterest||'not supplied'}. Income is not guaranteed.`);
    if(selections.tasks){const tasks=os.tasks.filter(t=>t.status!=='done').slice(0,5);if(tasks.length)parts.push('Open actions: '+tasks.map(t=>t.title).join('; ')+'.');}
    if(selections.documents&&os.documents.length)parts.push('Document register: '+os.documents.map(d=>d.label).join(', ')+'.');
    return parts.join('\n');
  }
  function renderShare(){
    const root=document.getElementById('shareWorkspace');
    if(!plan){root.innerHTML='<div class="os-card os-empty"><h2>No plan to share.</h2><a class="btn btn-yellow" href="/command-centre">Build a plan</a></div>';return;}
    const fields=[['energy','Energy figures and basis'],['broadband','Broadband experience and contract'],['mobile','Mobile requirements'],['insurance','Insurance and renewal timing'],['earning','Flexible-earning interest'],['tasks','Open action-plan items'],['documents','Document labels only']];
    root.innerHTML=`${evaluation?`<div class="os-readiness-banner"><div class="os-readiness-score" style="--score:${evaluation.score*3.6}deg"><strong>${evaluation.score}%</strong></div><div><span class="kicker" style="color:var(--yellow)">Household readiness</span><h2>${escapeHtml(evaluation.title)}</h2><p>${escapeHtml(evaluation.summary)}</p></div><a class="btn btn-yellow" href="/command-centre?view=result">Open my snapshot</a></div>`:''}<div class="os-card"><div class="os-head"><div><span class="kicker">Selective sharing</span><h2>You choose the meeting brief.</h2><p>Nothing is sent automatically. Review the exact text first.</p></div><span class="local-pill">Consent controlled</span></div><div class="share-grid"><div class="share-options">${fields.map(([id,label])=>`<label class="share-option"><input type="checkbox" data-share-field="${id}" ${os.consent[id]?'checked':''}><span><strong>${label}</strong><small>${id==='documents'?'The bill file itself is never included.':'Include this section in the generated brief.'}</small></span></label>`).join('')}</div><div class="share-preview"><h3>Meeting brief preview</h3><pre id="osBrief"></pre></div></div><div class="share-actions"><button class="btn btn-blue" id="copyOSBrief" type="button">Copy brief</button><button class="btn btn-yellow" id="whatsappOSBrief" type="button">WhatsApp Paul</button><a class="btn btn-light" href="https://calendly.com/save-with-paul/chat-with-paul" target="_blank" rel="noopener">Open Calendly</a><a class="btn btn-light" href="/consent-centre">Advanced privacy &amp; backup</a></div></div>`;
    const update=()=>{root.querySelectorAll('[data-share-field]').forEach(c=>os.consent[c.dataset.shareField]=c.checked);saveOS();document.getElementById('osBrief').textContent=brief();};
    root.querySelectorAll('[data-share-field]').forEach(c=>c.onchange=update);update();
    document.getElementById('copyOSBrief').onclick=async()=>{await navigator.clipboard.writeText(brief());showToast('Meeting brief copied');};
    document.getElementById('whatsappOSBrief').onclick=()=>window.open('https://wa.me/447925008477?text='+encodeURIComponent('Hi Paul, here is the household brief I chose to share:\n\n'+brief()),'_blank','noopener');
  }

  const tabs=[...document.querySelectorAll('[data-os-tab]')],views=[...document.querySelectorAll('[data-os-view]')];
  function activate(name){tabs.forEach(t=>t.classList.toggle('active',t.dataset.osTab===name));views.forEach(v=>v.classList.toggle('active',v.dataset.osView===name));if(name==='overview')renderOverview();if(name==='plan')renderTasks();if(name==='twin')renderTwin();if(name==='documents')renderDocuments();if(name==='share')renderShare();}
  tabs.forEach(t=>t.onclick=()=>activate(t.dataset.osTab));

  const prefs=window.getPreferences?.()||{};
  document.getElementById('themePreference').value=prefs.theme||'light';
  document.getElementById('textPreference').value=prefs.textSize||'standard';
  document.getElementById('motionPreference').checked=Boolean(prefs.reduceMotion);
  document.getElementById('themePreference').onchange=e=>window.savePreferences({theme:e.target.value});
  document.getElementById('textPreference').onchange=e=>window.savePreferences({textSize:e.target.value});
  document.getElementById('motionPreference').onchange=e=>window.savePreferences({reduceMotion:e.target.checked});

  if(plan&&!os.tasks.length)mergeSuggested();else{renderOverview();renderTasks();}
  renderTwin();renderDocuments();renderShare();saveOS();
})();
