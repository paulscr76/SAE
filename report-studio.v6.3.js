
(() => {
  const PLAN_KEYS=['saveEarnPaulV6Plan','saveEarnPaulV5Plan','saveEarnPaulV4Plan','saveEarnPaulV31Plan','saveEarnPaulV3Plan'];
  const OS_KEYS=['saveEarnPaulV6OS','saveEarnPaulV5OS','saveEarnPaulV4OS'];
  const SAMPLE=document.documentElement.dataset.sample==='true'||new URLSearchParams(location.search).has('sample');
  const asset=p=>location.protocol==='file:'?p.replace(/^\//,''):p;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const readFirst=keys=>{for(const key of keys){try{const value=JSON.parse(localStorage.getItem(key));if(value)return value}catch(_){}}return null};
  const samplePlan={
    version:'6.3',householdName:'The Example household',postcode:'BN21 1AA',priority:'both',propertyType:'semi',bedrooms:'3',occupants:'3',heating:'gas',efficiency:'average',daytime:'mixed',
    energyMode:'actual',energyConcern:'review',actualElectric:'3120',actualGas:'11840',ev:'no',solar:'no',
    broadbandExperience:'unreliable',broadbandContract:'ending',broadbandRenewalDate:'2026-08-18',workFromHome:'work',
    mobileLines:'family',mobileConcern:'cost',mobileContract:'ending',mobileRenewalDate:'2026-10-04',insuranceInterest:'home',insuranceRenewal:'soon',insuranceRenewalDate:'2026-09-20',
    earningInterest:'curious',earningTime:'few',earningGoal:'savings',
    meta:{updatedAt:new Date().toISOString(),energyInsight:{source:'actual',sourceLabel:'Customer-supplied actual annual usage',sourceGrade:'A',confidence:'Highest confidence',actual:true,period:new Date().toISOString().slice(0,10),property:{address:'12 Example Close',postcode:'BN21 1AA',currentRating:'D',floorArea:92,mainHeating:'Boiler and radiators, mains gas',energyIntensityCurrent:219,lodgementDate:'2025-11-18'}},scenarioComparison:{name:'Solar and electric vehicle',e:4380,g:11840,currentE:3120,currentG:11840,savedAt:new Date().toISOString()}}
  };
  const sampleOS={
    version:'6.3',
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
    consent:{energy:true,broadband:true,mobile:true,insurance:true,earning:false,tasks:true,documents:true}
  };
  const plan=SAMPLE?samplePlan:readFirst(PLAN_KEYS);
  const evaluation=plan&&window.HouseholdCheckV61?window.HouseholdCheckV61.evaluate(plan):null;
  const insight=plan?.meta?.energyInsight||null;
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
    if(!plan)return{e:0,g:0,actual:false,sourceLabel:'No energy data',confidence:'Not supplied'};
    const est=estimateEnergy(plan);
    if(['actual','annualised','epc'].includes(plan.energyMode))return{
      e:+plan.actualElectric||est.e,
      g:plan.heating==='gas'?(+plan.actualGas||est.g):0,
      actual:insight?Boolean(insight.actual):Boolean(+plan.actualElectric||+plan.actualGas),
      sourceLabel:insight?.sourceLabel||'Annual kWh supplied',
      confidence:insight?.confidence||(Boolean(+plan.actualElectric||+plan.actualGas)?'High confidence':'Indicative')
    };
    return{...est,actual:false,sourceLabel:insight?.sourceLabel||'Transparent household estimate',confidence:insight?.confidence||'Indicative'};
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
    if(consent.energy)parts.push(`Energy: ${fmt(en.e)} electricity${en.g?' and '+fmt(en.g)+' gas':''} (${en.sourceLabel}; ${en.confidence}).`);
    if(consent.broadband)parts.push(`Broadband: ${label('broadbandExperience',plan.broadbandExperience)}, contract ${label('broadbandContract',plan.broadbandContract)}.`);
    if(consent.mobile)parts.push(`Mobile: ${label('mobileLines',plan.mobileLines)}, main concern ${label('mobileConcern',plan.mobileConcern)}.`);
    if(consent.insurance)parts.push(`Insurance: ${plan.insuranceInterest||'not selected'}, renewal ${plan.insuranceRenewal||'not supplied'}.`);
    if(consent.earning)parts.push(`Flexible earning: ${label('earningInterest',plan.earningInterest)}. Income is not guaranteed.`);
    if(consent.tasks&&tasks.length)parts.push('Open actions: '+tasks.filter(t=>t.status!=='done').slice(0,6).map(t=>t.title).join('; ')+'.');
    if(consent.documents&&os.documents?.length)parts.push('Available document labels: '+os.documents.map(d=>d.label).join(', ')+'.');
    return parts.join('\n');
  }

  function footer(page,total,title){
    return `<div class="report-page-footer"><span><strong>Save &amp; Earn with Paul v6.1</strong> • ${esc(title)}</span><span>Confidential household planning document • Page ${page} of ${total}</span></div>`;
  }
  function wrapPage(content,page,total,title,classes=''){
    return `<section class="report-page ${classes}">${content}${classes.includes('report-cover')?'':footer(page,total,title)}</section>`;
  }
  function header(labelText,title){
    return `<div class="report-page-header"><div><div class="label">${esc(labelText)}</div><div class="title">${esc(title)}</div></div><div class="label">${reportRef}</div></div>`;
  }
  function cover(title,subtitle,page,total){
    return wrapPage(`<div class="report-cover-content"><div class="report-brand"><span class="report-brand-mark">£</span><span>Save &amp; Earn with Paul<small>Printable Household Summary</small></span></div><div class="report-cover-main"><span class="report-eyebrow">Printable summary • Prepared locally</span><h2>${esc(title)}<br><span>${esc(subtitle)}</span></h2><p class="report-cover-lead">A professionally structured planning document generated from the information saved in this browser.</p><div class="report-cover-meta"><div><span>Main priority</span><strong>${esc(plan?priorityLabel(plan.priority):'No plan found')}</strong></div><div><span>Generated</span><strong>${generated}</strong></div><div><span>Report reference</span><strong>${reportRef}</strong></div></div></div><div class="report-cover-bottom"><div class="report-cover-contact"><strong>Paul Scrase</strong>Independent Utility Warehouse Partner<br>${esc('07925 008477')} • paul.scrase@uw.partners</div><img class="report-cover-photo" src="${asset('/paul-scrase-480.webp')}" alt="Paul Scrase"></div></div>`,page,total,title,'report-cover');
  }

  function snapshotPage(page,total){
    const snapshot=evaluation||{score:0,title:'Household snapshot',summary:'No evaluation available.',priorityLabel:priorityLabel(plan.priority),services:[],missing:[],actions:[],timeline:[]};
    const serviceLabel=status=>status==='ready'?'Strong':status==='review'?'Review':status==='missing'?'Add detail':'Low priority';
    const serviceRows=snapshot.services.map(service=>`<article class="snapshot-report-service"><div><strong>${esc(service.label)}</strong><span>${esc(service.headline)}</span></div><p>${esc(service.metric||service.reason)}</p><b class="${esc(service.status)}">${serviceLabel(service.status)}</b></article>`).join('');
    const missing=snapshot.missing.length?snapshot.missing.slice(0,4).map(item=>`<span>${esc(item)}</span>`).join(''):'<span>No essential gaps identified</span>';
    const actions=snapshot.actions.slice(0,3).map((action,index)=>`<article class="snapshot-report-action"><span>${index+1}</span><div><strong>${esc(action.title)}</strong><p>${esc(action.detail)}</p></div></article>`).join('');
    const renewals=snapshot.timeline.length?snapshot.timeline.slice(0,3).map(item=>`<div><span>${esc(item.service)}</span><strong>${esc(item.label)}</strong><small>${esc(item.date||'')}</small></div>`).join(''):'<div><span>Renewal timeline</span><strong>Add exact dates when available</strong><small>Dates improve timing, but are not required.</small></div>';
    return wrapPage(`
      <div class="snapshot-report-brand"><div class="report-brand"><span class="report-brand-mark">£</span><span>Save &amp; Earn with Paul<small>One-page Household Snapshot</small></span></div><div><span>REFERENCE</span><strong>${reportRef}</strong></div></div>
      <div class="snapshot-report-hero"><div class="snapshot-report-score" style="--score:${snapshot.score*3.6}deg"><div><strong>${snapshot.score}%</strong><span>ready</span></div></div><div><span class="report-eyebrow">Prepared ${generated}</span><h2>${esc(snapshot.title)}</h2><p>${esc(snapshot.summary)}</p><div class="snapshot-report-tags"><span>${esc(snapshot.priorityLabel)}</span><span>${snapshot.reviewCount||0} areas worth discussing</span></div></div></div>
      <div class="snapshot-report-metrics"><div><span>Household</span><strong>${esc(plan.householdName||'My household')}</strong></div><div><span>Energy source</span><strong>${esc(en.sourceLabel)}</strong></div><div><span>Energy confidence</span><strong>${esc(en.confidence)}</strong></div><div><span>Open actions</span><strong>${snapshot.actions.length}</strong></div></div>
      <div class="snapshot-report-columns">
        <section><div class="snapshot-report-heading"><span>AT A GLANCE</span><h3>What may be worth discussing</h3></div><div class="snapshot-report-services">${serviceRows}</div></section>
        <section><div class="snapshot-report-heading"><span>USEFUL DETAILS</span><h3>Information and timing</h3></div><div class="snapshot-report-missing">${missing}</div><div class="snapshot-report-renewals">${renewals}</div></section>
      </div>
      <section class="snapshot-report-next"><div class="snapshot-report-heading"><span>NEXT BEST ACTIONS</span><h3>Keep the next step simple</h3></div><div>${actions}</div></section>
      <div class="snapshot-report-contact"><div><span class="report-eyebrow">Free 30-minute conversation</span><h3>Bring the snapshot. Keep control.</h3><p>Paul can focus on the services, timing and questions that appear most relevant. Nothing changes unless the household chooses to proceed.</p><strong>07925 008477 · paul.scrase@uw.partners</strong></div><img src="${asset('/calendly-qr.png')}" alt="QR code for Paul's booking page"></div>
      <p class="snapshot-report-disclaimer">Paul Scrase is an independent Utility Warehouse Partner. This is not a supplier comparison, quotation, financial advice, guaranteed saving or income forecast. Income is not guaranteed.</p>
    `,page,total,'One-page Household Snapshot','snapshot-report-page');
  }

  function executivePage(page,total){
    const statuses=[
      ['Energy',en.actual?'ready':'review',en.actual?'Annual kWh supplied':'Indicative estimate',`${fmt(en.e)}${en.g?' / '+fmt(en.g):''}`],
      ['Broadband',broadbandNeed?'review':'low',broadbandNeed?'Worth reviewing':'No immediate issue',label('broadbandContract',plan.broadbandContract)],
      ['Mobile',mobileNeed?'review':'low',mobileNeed?'Included in the plan':'Not a priority',label('mobileLines',plan.mobileLines)],
      ['Flexible earning',earningNeed?'review':'low',earningNeed?'Factual conversation':'Not selected',label('earningInterest',plan.earningInterest)]
    ];
    return wrapPage(`${header('Executive summary','Household readiness at a glance')}<p class="report-intro">This page summarises the current household plan without pretending to provide a tariff quotation, guaranteed saving or income forecast.</p><div class="report-grid-4"><div class="report-metric"><span>Information readiness</span><strong>${complete} of 6 areas</strong></div><div class="report-metric"><span>Energy confidence</span><strong>${esc(en.confidence|| (en.actual?'High':'Indicative'))}</strong></div><div class="report-metric"><span>Open actions</span><strong>${tasks.filter(t=>t.status!=='done').length}</strong></div><div class="report-metric"><span>Documents listed</span><strong>${os.documents?.length||0}</strong></div></div><div class="report-section"><h2>Household domains</h2><div class="report-grid-2">${statuses.map(([name,status,copy,metric])=>`<article class="report-card"><div class="report-domain-top"><strong>${name}</strong><span class="report-status ${status}">${status==='ready'?'Ready':status==='review'?'Worth reviewing':'Low priority'}</span></div><p>${esc(copy)}</p><p><strong>${esc(metric)}</strong></p></article>`).join('')}</div></div><div class="report-section"><h2>Recommended conversation</h2><div class="report-callout">${earningNeed&&plan.priority==='earn'?'A factual flexible-earning conversation appears most relevant. Discuss activity, training, realistic time and costs. Income is not guaranteed.':plan.priority==='both'?'A household-services conversation can explore which eligible services may be brought together, then flexible earning only if it remains relevant.':'A household-services conversation can explore eligible energy, broadband, mobile and insurance services.'}</div></div>`,page,total,'Executive Summary');
  }
  function profileEnergyPage(page,total){
    const max=Math.max(en.e,en.g||0,plan.meta?.scenarioComparison?.e||0,1);
    const pct=n=>Math.max(5,Math.min(100,(n/max)*100));
    const scenario=plan.meta?.scenarioComparison;
    return wrapPage(`${header('Household profile','Property and energy picture')}<div class="report-profile"><div><span>Property type</span><strong>${esc(label('propertyType',plan.propertyType))}</strong></div><div><span>Bedrooms</span><strong>${esc(plan.bedrooms)}</strong></div><div><span>Occupants</span><strong>${esc(plan.occupants)}</strong></div><div><span>Main heating</span><strong>${esc(label('heating',plan.heating))}</strong></div><div><span>Home efficiency</span><strong>${esc(label('efficiency',plan.efficiency))}</strong></div><div><span>Daytime occupancy</span><strong>${esc(label('daytime',plan.daytime))}</strong></div><div><span>Electric vehicle</span><strong>${plan.ev==='yes'?'Yes':'No'}</strong></div><div><span>Solar panels</span><strong>${plan.solar==='yes'?'Yes':'No'}</strong></div></div><div class="report-section"><h2>Annual energy picture</h2><div class="energy-hero"><div class="energy-value"><span>Electricity</span><strong>${fmt(en.e)}</strong></div><div class="energy-value"><span>Gas</span><strong>${en.g?fmt(en.g):'Not applicable'}</strong></div></div><div class="energy-bars"><div class="energy-bar-row"><span>Electricity</span><div class="energy-track"><span style="width:${pct(en.e)}%"></span></div><strong>${fmt(en.e)}</strong></div>${en.g?`<div class="energy-bar-row"><span>Gas</span><div class="energy-track"><span style="width:${pct(en.g)}%"></span></div><strong>${fmt(en.g)}</strong></div>`:''}${scenario?`<div class="energy-bar-row"><span>${esc(scenario.name||'Future scenario')}</span><div class="energy-track"><span style="width:${pct(scenario.e)}%"></span></div><strong>${fmt(scenario.e)}</strong></div>`:''}</div></div><div class="report-section"><h2>Basis and confidence</h2><div class="report-grid-2"><div class="report-card"><h3>Energy source</h3><p><strong>${esc(en.sourceLabel)}</strong></p><p>${esc(en.confidence)}</p></div><div class="report-card"><h3>Data period</h3><p><strong>${esc(insight?.period||'Not supplied')}</strong></p><p>${insight?.actual?'Household actual usage':'Modelled or annualised information'}</p></div></div><div class="report-callout" style="margin-top:4mm">${en.actual?'Actual annual kWh has been supplied for at least one fuel. Future scenarios remain modelled and indicative.':insight?.source==='meter'?'The figures were annualised from household meter readings. Seasonal effects can remain.':insight?.source==='epc'?'Official EPC property information was used to inform a household estimate. The EPC is not actual meter consumption.':'The figures are estimated from property and household information. Actual annual kWh would improve confidence.'}</div></div>${insight?.property?`<div class="report-section"><h2>Official property information</h2><div class="report-profile"><div><span>Selected address</span><strong>${esc(insight.property.address||'Not supplied')}</strong></div><div><span>Postcode</span><strong>${esc(insight.property.postcode||'Not supplied')}</strong></div><div><span>EPC rating</span><strong>${esc(insight.property.currentRating||'Not supplied')}</strong></div><div><span>Floor area</span><strong>${insight.property.floorArea?esc(Math.round(insight.property.floorArea)+' m²'):'Not supplied'}</strong></div><div><span>EPC energy intensity</span><strong>${insight.property.energyIntensityCurrent?esc(Math.round(insight.property.energyIntensityCurrent)+' kWh/m²/year'):'Not supplied'}</strong></div><div><span>Certificate date</span><strong>${esc(insight.property.lodgementDate||'Not supplied')}</strong></div></div><p class="report-disclaimer">EPC figures use standard assumptions and do not reveal the household’s actual gas or electricity consumption.</p></div>`:''}${scenario?`<div class="report-section"><h2>Saved energy-use scenario</h2><div class="report-grid-2"><div class="report-card"><h3>Current electricity</h3><p><strong>${fmt(scenario.currentE||en.e)}</strong></p></div><div class="report-card"><h3>${esc(scenario.name||'Future scenario')}</h3><p><strong>${fmt(scenario.e)}</strong></p><p>Difference: ${Math.round((scenario.e-(scenario.currentE||en.e))).toLocaleString('en-GB')} kWh</p></div></div></div>`:''}`,page,total,'Household Profile & Energy');
  }
  function taskPages(startPage,total){
    const visible=tasks.length?tasks:[{title:'No active tasks have been generated.',owner:'Household',due:'',status:'open'}];
    const chunks=[];for(let i=0;i<visible.length;i+=6)chunks.push(visible.slice(i,i+6));
    return chunks.map((chunk,index)=>wrapPage(`${header('Living action plan',chunks.length>1?`Actions ${index*6+1}-${index*6+chunk.length}`:'Ordered next steps')}<p class="report-intro">The living plan can be updated in My Household. Completion states and dates are stored locally on this device.</p><div>${chunk.map((t,i)=>`<article class="report-task"><span class="report-task-no">${index*6+i+1}</span><div><strong>${esc(t.title)}</strong><small>Status: ${t.status==='done'?'Complete':t.status==='doing'?'In progress':'Open'}</small></div><div class="report-task-meta"><strong>${esc(t.owner||'Household')}</strong>${t.due?`<br>Due ${new Date(t.due+'T00:00:00').toLocaleDateString('en-GB')}`:''}</div></article>`).join('')}</div><div class="report-section"><div class="report-callout">Owners and dates are planning prompts. You remain responsible for deciding whether each action is appropriate.</div></div>`,startPage+index,total,'Living Action Plan'));
  }
  function briefPage(page,total){
    const fields=[['Energy',consent.energy],['Broadband',consent.broadband],['Mobile',consent.mobile],['Insurance',consent.insurance],['Flexible earning',consent.earning],['Open tasks',consent.tasks],['Document labels',consent.documents]];
    return wrapPage(`${header('Meeting brief','Information selected for sharing')}<p class="report-intro">Nothing is sent automatically. This page records the sections currently selected in the local consent controls.</p><div class="report-brief"><strong>Prepared meeting brief</strong>\n\n${esc(meetingBrief())}</div><div class="report-section"><h2>Selected sections</h2><div class="report-consent-list">${fields.map(([name,on])=>`<div class="report-consent-item"><span class="report-consent-icon">${on?'✓':'–'}</span><div><strong>${esc(name)}</strong><span>${on?'Included in the generated brief':'Not included'}</span></div></div>`).join('')}</div></div><div class="report-section"><h2>Document handling</h2><div class="report-callout">Bill and statement files are not included in this report. Only labels or manually confirmed figures may appear. Review the brief before copying it into WhatsApp, email or Calendly.</div></div>`,page,total,'Meeting Brief & Consent');
  }
  function contactPage(page,total){
    return wrapPage(`${header('Next steps','Speak to Paul when ready')}<div class="contact-panel"><div><span class="report-eyebrow">Free 30-minute conversation</span><h2>Bring the plan. Keep control.</h2><p>Use the meeting brief to explain the household priorities quickly. Paul can then focus on the areas that may genuinely deserve a conversation.</p><div class="contact-details"><div><strong>Book:</strong> calendly.com/save-with-paul/chat-with-paul</div><div><strong>WhatsApp:</strong> 07925 008477</div><div><strong>Email:</strong> paul.scrase@uw.partners</div></div></div><img src="${asset('/calendly-qr.png')}" alt="QR code for Paul's Calendly booking page"></div><div class="report-section"><h2>Responsible-use statement</h2><div class="report-disclaimer"><p><strong>Independent partner:</strong> Paul Scrase is an independent Utility Warehouse Partner. This is not the official Utility Warehouse corporate website.</p><p><strong>Household services:</strong> This report is a planning summary. It is not a supplier quotation, tariff recommendation, engineering assessment, EPC, financial advice or guarantee of savings.</p><p><strong>Flexible earning:</strong> Income is not guaranteed and depends on personal activity and results. The report does not make an income prediction.</p><p><strong>Privacy:</strong> The report is generated locally from information stored in this browser. Review the content before printing, saving or sharing it.</p></div></div><div class="report-section"><div class="report-callout">Generated ${generated} • Report reference ${reportRef}</div></div>`,page,total,'Next Steps');
  }
  function energyAssumptionsPage(page,total){
    return wrapPage(`${header('Energy data methodology','Assumptions and limitations')}<p class="report-intro">The Energy Data Passport separates actual usage, annualised readings, official property models, public benchmarks and household estimates. It does not calculate prices, tariff suitability or guaranteed savings.</p><table class="report-table"><thead><tr><th>Factor</th><th>How it affects the model</th><th>Main uncertainty</th></tr></thead><tbody><tr><td>Property and bedrooms</td><td>Sets the broad household baseline.</td><td>Actual floor area, insulation and behaviour.</td></tr><tr><td>Occupants and daytime use</td><td>Adjusts general electricity and hot-water demand.</td><td>Individual routines and appliance use.</td></tr><tr><td>Heating type</td><td>Moves demand between gas and electricity.</td><td>System efficiency and heat-loss characteristics.</td></tr><tr><td>Electric vehicle</td><td>Adds a broad annual charging allowance.</td><td>Mileage, vehicle efficiency and public charging.</td></tr><tr><td>Solar panels</td><td>Reduces estimated imported electricity.</td><td>Generation, export, battery use and roof orientation.</td></tr></tbody></table><div class="report-section"><div class="report-callout">Use actual annual kWh whenever available. EPC information and government benchmarks add context but cannot reveal the individual household’s actual consumption.</div></div>`,page,total,'Energy Methodology');
  }

  function render(type){
    const root=document.getElementById('reportDocument');
    if(!plan){root.innerHTML=`<section class="report-page"><div class="no-data"><h2>No household plan found.</h2><p>Build a household plan first, then return to the printable-summary page.</p><a href="/command-centre">Open the Plan Builder</a></div></section>`;return;}
    const taskCount=Math.max(1,Math.ceil((tasks.length||1)/6));
    let pageBuilders=[];
    if(type==='snapshot'){
      pageBuilders=[snapshotPage];
    }else if(type==='energy'){
      pageBuilders=[()=>cover('Energy Data Passport','Printable Summary'),profileEnergyPage,energyAssumptionsPage,contactPage];
    }else if(type==='actions'){
      pageBuilders=[()=>cover('Living Action Plan','Printable Summary'),{taskPages:true,count:taskCount},contactPage];
    }else if(type==='brief'){
      pageBuilders=[()=>cover('Meeting Brief','Printable Summary'),briefPage,contactPage];
    }else{
      pageBuilders=[()=>cover('Complete Household','Printable Summary'),executivePage,profileEnergyPage,{taskPages:true,count:taskCount},briefPage,contactPage];
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
    document.title=`${type==='snapshot'?'Household Snapshot':type==='energy'?'Energy Data Passport':type==='actions'?'Action Plan':type==='brief'?'Meeting Brief':'Complete Household'} Report | Save & Earn with Paul`;
  }

  const select=document.getElementById('reportType');
  const params=new URLSearchParams(location.search);
  const initial=['snapshot','full','actions','energy','brief'].includes(params.get('type'))?params.get('type'):'snapshot';
  select.value=initial;render(initial);
  select.addEventListener('change',()=>{history.replaceState(null,'',location.pathname+'?type='+select.value+(SAMPLE?'&sample=1':''));render(select.value);});
  document.getElementById('refreshReport').onclick=()=>render(select.value);
  document.getElementById('printReport').onclick=()=>{
    window.trackSafe?.('professional_report_print',{type:select.value});
    document.documentElement.classList.add('is-printing-report');
    requestAnimationFrame(()=>requestAnimationFrame(()=>window.print()));
  };
  window.addEventListener('afterprint',()=>document.documentElement.classList.remove('is-printing-report'));
})();
