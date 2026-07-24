
(() => {
  const PLAN_KEYS=['saveEarnPaulV5Plan','saveEarnPaulV4Plan','saveEarnPaulV31Plan','saveEarnPaulV3Plan'];
  const OS_KEYS=['saveEarnPaulV5OS','saveEarnPaulV4OS'];
  const SAMPLE=document.documentElement.dataset.sample==='true'||new URLSearchParams(location.search).has('sample');
  const asset=p=>location.protocol==='file:'?p.replace(/^\//,''):p;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const readFirst=keys=>{for(const key of keys){try{const value=JSON.parse(localStorage.getItem(key));if(value)return value}catch(_){}}return null};
  const samplePlan={
    version:'5.0',priority:'both',propertyType:'semi',bedrooms:'3',occupants:'3',heating:'gas',efficiency:'average',daytime:'mixed',
    energyMode:'actual',energyConcern:'review',actualElectric:'3120',actualGas:'11840',ev:'no',solar:'no',
    broadbandExperience:'unreliable',broadbandContract:'ending',workFromHome:'work',
    mobileLines:'family',mobileConcern:'cost',mobileContract:'unknown',
    earningInterest:'curious',earningTime:'few',earningGoal:'savings',
    meta:{updatedAt:new Date().toISOString(),scenarioComparison:{name:'Solar and electric vehicle',e:4380,g:11840,currentE:3120,currentG:11840,savedAt:new Date().toISOString()}}
  };
  const sampleOS={
    version:'5.0',
    tasks:[
      {id:'t1',title:'Check broadband contract end date',owner:'Household',due:'2026-08-05',status:'doing'},
      {id:'t2',title:'Prepare annual energy statement for the conversation',owner:'Household',due:'2026-08-08',status:'open'},
      {id:'t3',title:'List family mobile lines and upgrade dates',owner:'Household',due:'2026-08-10',status:'open'},
      {id:'t4',title:'Prepare questions about activity, training and costs',owner:'Both',due:'',status:'open'},
      {id:'t5',title:'Review and approve the meeting brief',owner:'Both',due:'',status:'open'},
      {id:'t6',title:'Book a free 30-minute conversation with Paul',owner:'Household',due:'',status:'open'}
    ],
    documents:[
      {id:'d1',label:'Annual energy statement',type:'energy',fileName:'statement.pdf',addedAt:new Date().toISOString()},
      {id:'d2',label:'Broadband contract summary',type:'broadband',fileName:'contract.pdf',addedAt:new Date().toISOString()}
    ],
    consent:{energy:true,broadband:true,mobile:true,earning:false,tasks:true,documents:true}
  };
  const plan=SAMPLE?samplePlan:readFirst(PLAN_KEYS);
  const os=SAMPLE?sampleOS:(readFirst(OS_KEYS)||{tasks:[],documents:[],consent:{energy:true,broadband:true,mobile:true,earning:false,tasks:true,documents:false}});
  const fmt=n=>Math.round(+n||0).toLocaleString('en-GB')+' kWh';
  const priorityLabel=p=>({save:'Reducing household costs',understand:'Understanding the household',earn:'Exploring flexible earning',both:'Saving and earning'}[p]||'Household review');
  const labels={
    propertyType:{flat:'Flat / apartment',terrace:'Terraced house',semi:'Semi-detached',detached:'Detached house',bungalow:'Bungalow'},
    heating:{gas:'Gas boiler',electric:'Electric heating',heatpump:'Heat pump',other:'Oil / other'},
    efficiency:{efficient:'Well insulated / newer',average:'Average / unknown',inefficient:'Older / draughty'},
    daytime:{low:'Usually empty',mixed:'Mixed',high:'Usually occupied'},
    broadbandExperience:{happy:'Generally happy',slow:'Too slow',unreliable:'Unreliable',expensive:'Feels expensive',unknown:'Not supplied'},
    broadbandContract:{in:'Still in contract',ending:'Ending soon',out:'Out of contract',unknown:'Not supplied'},
    mobileLines:{none:'No mobile review needed',one:'One mobile',family:'Several / family mobiles',unknown:'Not supplied'},
    mobileConcern:{none:'No concern',signal:'Signal / coverage',data:'Data allowance',cost:'Monthly cost',upgrade:'Upgrade timing'},
    earningInterest:{none:'Not interested just now',curious:'Curious and wants the facts',explore:'Open to exploring it',ready:'Ready for a conversation'}
  };
  const label=(group,value)=>labels[group]?.[value]||value||'Not supplied';

  function estimateEnergy(p){
    const baseE={1:1700,2:2150,3:2500,4:3200,5:3900,6:4600},baseG={1:6200,2:7800,3:9500,4:12200,5:15000,6:17800};
    const prop={flat:.78,terrace:.92,semi:1,detached:1.18,bungalow:1.08},eff={efficient:.82,average:1,inefficient:1.22},occ={low:.94,mixed:1,high:1.1};
    const b=+p.bedrooms||3,people=+p.occupants||3;let e=(baseE[b]||5200)+Math.max(0,people-b)*320;e*=prop[p.propertyType]||1;e*=occ[p.daytime]||1;
    if(p.ev==='yes')e+=2200;if(p.solar==='yes')e*=.78;if(p.heating==='electric')e+=6500;if(p.heating==='heatpump')e+=2800;
    let g=0;if(p.heating==='gas'){g=(baseG[b]||20000)+Math.max(0,people-b)*400;g*=prop[p.propertyType]||1;g*=eff[p.efficiency]||1;}
    return{e,g};
  }
  function energyValues(){
    if(!plan)return{e:0,g:0,actual:false};
    const est=estimateEnergy(plan);
    if(plan.energyMode==='actual')return{e:+plan.actualElectric||est.e,g:plan.heating==='gas'?(+plan.actualGas||est.g):0,actual:Boolean(+plan.actualElectric||+plan.actualGas)};
    return{...est,actual:false};
  }
  function suggestedTasks(){
    if(!plan)return[];
    const tasks=[];const add=(title,owner='Household')=>tasks.push({title,owner,due:'',status:'open'});
    const en=energyValues();
    if(!en.actual)add('Find annual electricity and gas kWh');
    if(plan.broadbandContract==='unknown')add('Check broadband contract end date');
    if(['slow','unreliable','expensive'].includes(plan.broadbandExperience))add('Note broadband speed and reliability problems');
    if(plan.mobileLines!=='none'&&plan.mobileContract==='unknown')add('Check mobile contract or upgrade dates');
    if(plan.earningInterest&&plan.earningInterest!=='none')add('Prepare questions about activity, training, time and costs');
    add('Review and approve the meeting brief','Both');
    return tasks;
  }
  const tasks=(Array.isArray(os.tasks)&&os.tasks.length?os.tasks:suggestedTasks()).filter(t=>t.status!=='dismissed');
  const en=energyValues();
  const broadbandNeed=plan&&(['slow','unreliable','expensive'].includes(plan.broadbandExperience)||['ending','out'].includes(plan.broadbandContract));
  const mobileNeed=plan&&(plan.mobileLines!=='none'||plan.mobileConcern!=='none');
  const earningNeed=plan&&plan.earningInterest&&plan.earningInterest!=='none';
  const complete=plan?[Boolean(plan.priority),Boolean(plan.propertyType&&plan.bedrooms&&plan.occupants&&plan.heating),plan.energyMode==='estimate'||en.actual,plan.broadbandExperience!=='unknown'&&plan.broadbandContract!=='unknown',plan.mobileLines==='none'||plan.mobileConcern!=='none',plan.earningInterest==='none'||plan.earningTime!=='unknown'].filter(Boolean).length:0;
  const reportRef='SEWP-'+new Date().toISOString().slice(0,10).replaceAll('-','')+'-'+String(Math.abs((plan?.meta?.updatedAt||'5.0').split('').reduce((a,c)=>a+c.charCodeAt(0),0))).padStart(4,'0').slice(-4);
  const generated=new Intl.DateTimeFormat('en-GB',{dateStyle:'long'}).format(new Date());
  const consent={energy:true,broadband:true,mobile:true,earning:false,tasks:true,documents:false,...(os.consent||{})};

  function meetingBrief(){
    if(!plan)return'No household plan exists on this device.';
    const parts=[`Main priority: ${priorityLabel(plan.priority)}.`];
    if(consent.energy)parts.push(`Energy: ${fmt(en.e)} electricity${en.g?' and '+fmt(en.g)+' gas':''} (${en.actual?'annual kWh supplied':'indicative household estimate'}).`);
    if(consent.broadband)parts.push(`Broadband: ${label('broadbandExperience',plan.broadbandExperience)}, contract ${label('broadbandContract',plan.broadbandContract)}.`);
    if(consent.mobile)parts.push(`Mobile: ${label('mobileLines',plan.mobileLines)}, main concern ${label('mobileConcern',plan.mobileConcern)}.`);
    if(consent.earning)parts.push(`Flexible earning: ${label('earningInterest',plan.earningInterest)}. Income is not guaranteed.`);
    if(consent.tasks&&tasks.length)parts.push('Open actions: '+tasks.filter(t=>t.status!=='done').slice(0,6).map(t=>t.title).join('; ')+'.');
    if(consent.documents&&os.documents?.length)parts.push('Available document labels: '+os.documents.map(d=>d.label).join(', ')+'.');
    return parts.join('\n');
  }

  function footer(page,total,title){
    return `<div class="report-page-footer"><span><strong>Save &amp; Earn with Paul</strong> • ${esc(title)}</span><span>Confidential household planning document • Page ${page} of ${total}</span></div>`;
  }
  function wrapPage(content,page,total,title,classes=''){
    return `<section class="report-page ${classes}">${content}${classes.includes('report-cover')?'':footer(page,total,title)}</section>`;
  }
  function header(labelText,title){
    return `<div class="report-page-header"><div><div class="label">${esc(labelText)}</div><div class="title">${esc(title)}</div></div><div class="label">${reportRef}</div></div>`;
  }
  function cover(title,subtitle,page,total){
    return wrapPage(`<div class="report-cover-content"><div class="report-brand"><span class="report-brand-mark">£</span><span>Save &amp; Earn with Paul<small>Professional Household Report</small></span></div><div class="report-cover-main"><span class="report-eyebrow">Version 5.0 • Prepared locally</span><h1>${esc(title)}<br><span>${esc(subtitle)}</span></h1><p class="report-cover-lead">A professionally structured planning document generated from the information saved in this browser.</p><div class="report-cover-meta"><div><span>Main priority</span><strong>${esc(plan?priorityLabel(plan.priority):'No plan found')}</strong></div><div><span>Generated</span><strong>${generated}</strong></div><div><span>Report reference</span><strong>${reportRef}</strong></div></div></div><div class="report-cover-bottom"><div class="report-cover-contact"><strong>Paul Scrase</strong>Independent Utility Warehouse Partner<br>${esc('07925 008477')} • paul.scrase@uw.partners</div><img class="report-cover-photo" src="${asset('/paul-scrase-480.webp')}" alt="Paul Scrase"></div></div>`,page,total,title,'report-cover');
  }
  function executivePage(page,total){
    const statuses=[
      ['Energy',en.actual?'ready':'review',en.actual?'Annual kWh supplied':'Indicative estimate',`${fmt(en.e)}${en.g?' / '+fmt(en.g):''}`],
      ['Broadband',broadbandNeed?'review':'low',broadbandNeed?'Worth reviewing':'No immediate issue',label('broadbandContract',plan.broadbandContract)],
      ['Mobile',mobileNeed?'review':'low',mobileNeed?'Included in the plan':'Not a priority',label('mobileLines',plan.mobileLines)],
      ['Flexible earning',earningNeed?'review':'low',earningNeed?'Factual conversation':'Not selected',label('earningInterest',plan.earningInterest)]
    ];
    return wrapPage(`${header('Executive summary','Household readiness at a glance')}<p class="report-intro">This page summarises the current household plan without pretending to provide a tariff quotation, guaranteed saving or income forecast.</p><div class="report-grid-4"><div class="report-metric"><span>Information readiness</span><strong>${complete} of 6 areas</strong></div><div class="report-metric"><span>Energy confidence</span><strong>${en.actual?'High':'Medium'}</strong></div><div class="report-metric"><span>Open actions</span><strong>${tasks.filter(t=>t.status!=='done').length}</strong></div><div class="report-metric"><span>Documents listed</span><strong>${os.documents?.length||0}</strong></div></div><div class="report-section"><h2>Household domains</h2><div class="report-grid-2">${statuses.map(([name,status,copy,metric])=>`<article class="report-card"><div class="report-domain-top"><strong>${name}</strong><span class="report-status ${status}">${status==='ready'?'Ready':status==='review'?'Worth reviewing':'Low priority'}</span></div><p>${esc(copy)}</p><p><strong>${esc(metric)}</strong></p></article>`).join('')}</div></div><div class="report-section"><h2>Recommended conversation</h2><div class="report-callout">${earningNeed&&plan.priority==='earn'?'A factual flexible-earning conversation appears most relevant. Discuss activity, training, realistic time and costs. Income is not guaranteed.':plan.priority==='both'?'A complete household review can cover services first, then flexible earning if still relevant.':'An energy and household-services conversation appears most relevant.'}</div></div>`,page,total,'Executive Summary');
  }
  function profileEnergyPage(page,total){
    const max=Math.max(en.e,en.g||0,plan.meta?.scenarioComparison?.e||0,1);
    const pct=n=>Math.max(5,Math.min(100,(n/max)*100));
    const scenario=plan.meta?.scenarioComparison;
    return wrapPage(`${header('Household profile','Property and energy picture')}<div class="report-profile"><div><span>Property type</span><strong>${esc(label('propertyType',plan.propertyType))}</strong></div><div><span>Bedrooms</span><strong>${esc(plan.bedrooms)}</strong></div><div><span>Occupants</span><strong>${esc(plan.occupants)}</strong></div><div><span>Main heating</span><strong>${esc(label('heating',plan.heating))}</strong></div><div><span>Home efficiency</span><strong>${esc(label('efficiency',plan.efficiency))}</strong></div><div><span>Daytime occupancy</span><strong>${esc(label('daytime',plan.daytime))}</strong></div><div><span>Electric vehicle</span><strong>${plan.ev==='yes'?'Yes':'No'}</strong></div><div><span>Solar panels</span><strong>${plan.solar==='yes'?'Yes':'No'}</strong></div></div><div class="report-section"><h2>Annual energy picture</h2><div class="energy-hero"><div class="energy-value"><span>Electricity</span><strong>${fmt(en.e)}</strong></div><div class="energy-value"><span>Gas</span><strong>${en.g?fmt(en.g):'Not applicable'}</strong></div></div><div class="energy-bars"><div class="energy-bar-row"><span>Electricity</span><div class="energy-track"><span style="width:${pct(en.e)}%"></span></div><strong>${fmt(en.e)}</strong></div>${en.g?`<div class="energy-bar-row"><span>Gas</span><div class="energy-track"><span style="width:${pct(en.g)}%"></span></div><strong>${fmt(en.g)}</strong></div>`:''}${scenario?`<div class="energy-bar-row"><span>${esc(scenario.name||'Future scenario')}</span><div class="energy-track"><span style="width:${pct(scenario.e)}%"></span></div><strong>${fmt(scenario.e)}</strong></div>`:''}</div></div><div class="report-section"><h2>Basis and confidence</h2><div class="report-callout">${en.actual?'Actual annual kWh has been supplied for at least one fuel. Scenario comparisons remain modelled and indicative.':'The figures are estimated from property and household information. Actual annual kWh would improve confidence.'}</div></div>${scenario?`<div class="report-section"><h2>Saved scenario comparison</h2><div class="report-grid-2"><div class="report-card"><h3>Current electricity</h3><p><strong>${fmt(scenario.currentE||en.e)}</strong></p></div><div class="report-card"><h3>${esc(scenario.name||'Future scenario')}</h3><p><strong>${fmt(scenario.e)}</strong></p><p>Difference: ${Math.round((scenario.e-(scenario.currentE||en.e))).toLocaleString('en-GB')} kWh</p></div></div></div>`:''}`,page,total,'Household Profile & Energy');
  }
  function taskPages(startPage,total){
    const visible=tasks.length?tasks:[{title:'No active tasks have been generated.',owner:'Household',due:'',status:'open'}];
    const chunks=[];for(let i=0;i<visible.length;i+=6)chunks.push(visible.slice(i,i+6));
    return chunks.map((chunk,index)=>wrapPage(`${header('Living action plan',chunks.length>1?`Actions ${index*6+1}-${index*6+chunk.length}`:'Ordered next steps')}<p class="report-intro">The living plan can be updated in My Household. Completion states and dates are stored locally on this device.</p><div>${chunk.map((t,i)=>`<article class="report-task"><span class="report-task-no">${index*6+i+1}</span><div><strong>${esc(t.title)}</strong><small>Status: ${t.status==='done'?'Complete':t.status==='doing'?'In progress':'Open'}</small></div><div class="report-task-meta"><strong>${esc(t.owner||'Household')}</strong>${t.due?`<br>Due ${new Date(t.due+'T00:00:00').toLocaleDateString('en-GB')}`:''}</div></article>`).join('')}</div><div class="report-section"><div class="report-callout">Owners and dates are planning prompts. You remain responsible for deciding whether each action is appropriate.</div></div>`,startPage+index,total,'Living Action Plan'));
  }
  function briefPage(page,total){
    const fields=[['Energy',consent.energy],['Broadband',consent.broadband],['Mobile',consent.mobile],['Flexible earning',consent.earning],['Open tasks',consent.tasks],['Document labels',consent.documents]];
    return wrapPage(`${header('Meeting brief','Information selected for sharing')}<p class="report-intro">Nothing is sent automatically. This page records the sections currently selected in the local consent controls.</p><div class="report-brief"><strong>Prepared meeting brief</strong>\n\n${esc(meetingBrief())}</div><div class="report-section"><h2>Selected sections</h2><div class="report-consent-list">${fields.map(([name,on])=>`<div class="report-consent-item"><span class="report-consent-icon">${on?'✓':'–'}</span><div><strong>${esc(name)}</strong><span>${on?'Included in the generated brief':'Not included'}</span></div></div>`).join('')}</div></div><div class="report-section"><h2>Document handling</h2><div class="report-callout">Bill and statement files are not included in this report. Only labels or manually confirmed figures may appear. Review the brief before copying it into WhatsApp, email or Calendly.</div></div>`,page,total,'Meeting Brief & Consent');
  }
  function contactPage(page,total){
    return wrapPage(`${header('Next steps','Speak to Paul when ready')}<div class="contact-panel"><div><span class="report-eyebrow">Free 30-minute conversation</span><h2>Bring the plan. Keep control.</h2><p>Use the meeting brief to explain the household priorities quickly. Paul can then focus on the areas that may genuinely deserve a conversation.</p><div class="contact-details"><div><strong>Book:</strong> calendly.com/save-with-paul/chat-with-paul</div><div><strong>WhatsApp:</strong> 07925 008477</div><div><strong>Email:</strong> paul.scrase@uw.partners</div></div></div><img src="${asset('/calendly-qr.png')}" alt="QR code for Paul's Calendly booking page"></div><div class="report-section"><h2>Responsible-use statement</h2><div class="report-disclaimer"><p><strong>Independent partner:</strong> Paul Scrase is an independent Utility Warehouse Partner. This is not the official Utility Warehouse corporate website.</p><p><strong>Household services:</strong> This report is a planning summary. It is not a supplier quotation, tariff recommendation, engineering assessment, EPC, financial advice or guarantee of savings.</p><p><strong>Flexible earning:</strong> Income is not guaranteed and depends on personal activity and results. The report does not make an income prediction.</p><p><strong>Privacy:</strong> The report is generated locally from information stored in this browser. Review the content before printing, saving or sharing it.</p></div></div><div class="report-section"><div class="report-callout">Generated ${generated} • Report reference ${reportRef}</div></div>`,page,total,'Next Steps');
  }
  function energyAssumptionsPage(page,total){
    return wrapPage(`${header('Energy methodology','Assumptions and limitations')}<p class="report-intro">The Scenario Lab compares broad annual kWh estimates. It does not calculate prices, tariff suitability or guaranteed savings.</p><table class="report-table"><thead><tr><th>Factor</th><th>How it affects the model</th><th>Main uncertainty</th></tr></thead><tbody><tr><td>Property and bedrooms</td><td>Sets the broad household baseline.</td><td>Actual floor area, insulation and behaviour.</td></tr><tr><td>Occupants and daytime use</td><td>Adjusts general electricity and hot-water demand.</td><td>Individual routines and appliance use.</td></tr><tr><td>Heating type</td><td>Moves demand between gas and electricity.</td><td>System efficiency and heat-loss characteristics.</td></tr><tr><td>Electric vehicle</td><td>Adds a broad annual charging allowance.</td><td>Mileage, vehicle efficiency and public charging.</td></tr><tr><td>Solar panels</td><td>Reduces estimated imported electricity.</td><td>Generation, export, battery use and roof orientation.</td></tr></tbody></table><div class="report-section"><div class="report-callout">Use actual annual kWh whenever available. A model is most useful for comparing directions and assumptions—not for claiming precise future bills.</div></div>`,page,total,'Energy Methodology');
  }

  function render(type){
    const root=document.getElementById('reportDocument');
    if(!plan){root.innerHTML=`<section class="report-page"><div class="no-data"><h2>No household plan found.</h2><p>Build a plan first, then return to the Report Studio.</p><a href="/command-centre">Open the Plan Builder</a></div></section>`;return;}
    const taskCount=Math.max(1,Math.ceil((tasks.length||1)/6));
    let pageBuilders=[];
    if(type==='energy'){
      pageBuilders=[()=>cover('Energy & Scenario','Professional Report'),profileEnergyPage,energyAssumptionsPage,contactPage];
    }else if(type==='actions'){
      pageBuilders=[()=>cover('Living Action Plan','Professional Report'),{taskPages:true,count:taskCount},contactPage];
    }else if(type==='brief'){
      pageBuilders=[()=>cover('Meeting Brief','Professional Report'),briefPage,contactPage];
    }else{
      pageBuilders=[()=>cover('Complete Household','Professional Report'),executivePage,profileEnergyPage,{taskPages:true,count:taskCount},briefPage,contactPage];
    }
    const total=pageBuilders.reduce((sum,item)=>sum+(item?.taskPages?item.count:1),0);
    let html='',page=1;
    for(const builder of pageBuilders){
      if(builder?.taskPages){
        html+=taskPages(page,total).join('');
        page+=builder.count;
      }else{
        html+=builder(page,total);page++;
      }
    }
    root.innerHTML=html;
    document.title=`${type==='energy'?'Energy & Scenario':type==='actions'?'Action Plan':type==='brief'?'Meeting Brief':'Complete Household'} Report | Save & Earn with Paul`;
  }

  const select=document.getElementById('reportType');
  const params=new URLSearchParams(location.search);
  const initial=['full','actions','energy','brief'].includes(params.get('type'))?params.get('type'):'full';
  select.value=initial;render(initial);
  select.addEventListener('change',()=>{history.replaceState(null,'',location.pathname+'?type='+select.value+(SAMPLE?'&sample=1':''));render(select.value);});
  document.getElementById('refreshReport').onclick=()=>render(select.value);
  document.getElementById('printReport').onclick=()=>{window.trackSafe?.('professional_report_print',{type:select.value});window.print();};
})();
