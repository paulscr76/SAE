((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HouseholdCheckV61 = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  const todayISO = (today = new Date()) => {
    const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };

  const daysUntil = (dateString, today = new Date()) => {
    if (!dateString) return null;
    const target = new Date(`${dateString}T12:00:00`);
    if (Number.isNaN(target.getTime())) return null;
    const base = new Date(`${todayISO(today)}T12:00:00`);
    return Math.round((target - base) / 86400000);
  };

  const defaultPlan = () => ({
    version: '6.2',
    householdName: '',
    postcode: '',
    priority: '',
    propertyType: 'semi',
    bedrooms: '3',
    occupants: '3',
    heating: 'gas',
    efficiency: 'average',
    daytime: 'mixed',
    energyMode: 'estimate',
    actualElectric: '',
    actualGas: '',
    estimatedElectric: '',
    estimatedGas: '',
    energyConcern: 'review',
    ev: 'no',
    solar: 'no',
    broadbandExperience: 'happy',
    broadbandContract: 'unknown',
    broadbandRenewalDate: '',
    workFromHome: 'standard',
    mobileLines: 'none',
    mobileConcern: 'none',
    mobileContract: 'unknown',
    mobileRenewalDate: '',
    insuranceInterest: 'none',
    insuranceRenewal: 'unknown',
    insuranceRenewalDate: '',
    earningInterest: 'none',
    earningTime: 'unknown',
    earningGoal: 'savings',
    consentContact: false,
    meta: {
      checkStep: 0,
      updatedAt: '',
      energyInsight: null,
      dismissedActions: []
    }
  });

  function mergePlan(value = {}) {
    const base = defaultPlan();
    const merged = {...base, ...value, meta:{...base.meta, ...(value.meta || {})}};
    merged.version = '6.2';
    return merged;
  }

  function energyQuality(plan) {
    const insight = plan.meta?.energyInsight || {};
    const mode = plan.energyMode || 'estimate';
    const electricity = Number((mode === 'estimate' ? plan.estimatedElectric : plan.actualElectric) || 0);
    const gas = Number((mode === 'estimate' ? plan.estimatedGas : plan.actualGas) || 0);
    const warnings = [];
    const issues = [];

    if (electricity > 0 && electricity < 250) warnings.push('The electricity figure is very low for annual kWh. Check that it is not a monthly cost or meter reading.');
    if (electricity > 30000) warnings.push('The electricity figure is unusually high. Check the unit and period.');
    if (gas > 0 && gas < 800) warnings.push('The gas figure is very low for annual kWh. Check that it is not a monthly cost or meter reading.');
    if (gas > 60000) warnings.push('The gas figure is unusually high. Check the unit and period.');
    if (plan.heating === 'gas' && ['actual','annualised'].includes(mode) && !gas) issues.push('Annual gas kWh');
    if (['actual','annualised','epc'].includes(mode) && !electricity && !gas) issues.push('Annual energy figures');

    const labels = {
      actual: ['Customer-supplied annual usage', 'A', insight.confidence || 'Highest confidence'],
      annualised: ['Meter-reading annualisation', 'B', insight.confidence || 'Medium confidence'],
      epc: ['EPC-informed household estimate', 'C', insight.confidence || 'Medium confidence'],
      estimate: ['Transparent household estimate', 'D', 'Indicative']
    };
    const [label, grade, confidence] = labels[mode] || labels.estimate;
    return {
      mode,
      label: insight.sourceLabel || label,
      grade: insight.sourceGrade || grade,
      confidence,
      electricity,
      gas,
      warnings,
      issues,
      hasStrongData: mode === 'actual' && Boolean(electricity || gas),
      hasUsableData: Boolean(electricity || gas) || mode === 'estimate'
    };
  }

  function renewalState(dateString, fallback, today = new Date()) {
    const days = daysUntil(dateString, today);
    if (days !== null) {
      if (days < 0) return {kind:'ready', label:'Renewal date passed', days, date:dateString};
      if (days <= 30) return {kind:'ready', label:'Due within 30 days', days, date:dateString};
      if (days <= 90) return {kind:'review', label:'Due within 3 months', days, date:dateString};
      return {kind:'later', label:'More than 3 months away', days, date:dateString};
    }
    const map = {
      out:{kind:'ready',label:'Out of contract'},
      ending:{kind:'review',label:'Ending soon'},
      soon:{kind:'review',label:'Within 3 months'},
      due:{kind:'ready',label:'Due now or recently renewed'},
      in:{kind:'later',label:'Still in contract'},
      unknown:{kind:'missing',label:'Date not known'}
    };
    return map[fallback] || {kind:'missing',label:'Date not known'};
  }

  function serviceCards(plan, today = new Date()) {
    const energy = energyQuality(plan);
    const broadbandRenewal = renewalState(plan.broadbandRenewalDate, plan.broadbandContract, today);
    const mobileRenewal = renewalState(plan.mobileRenewalDate, plan.mobileContract, today);
    const insuranceRenewal = renewalState(plan.insuranceRenewalDate, plan.insuranceRenewal, today);

    const broadbandConcern = ['slow','unreliable','expensive'].includes(plan.broadbandExperience);
    const broadbandWorthReview = broadbandConcern || ['ready','review'].includes(broadbandRenewal.kind);
    const mobileSelected = plan.mobileLines !== 'none' || plan.mobileConcern !== 'none';
    const mobileWorthReview = mobileSelected && (plan.mobileConcern !== 'none' || ['ready','review'].includes(mobileRenewal.kind));
    const insuranceSelected = plan.insuranceInterest && plan.insuranceInterest !== 'none';
    const earningSelected = plan.earningInterest && plan.earningInterest !== 'none';

    return [
      {
        id:'energy', label:'Energy',
        status: energy.hasStrongData ? 'ready' : energy.hasUsableData ? 'review' : 'missing',
        headline: energy.hasStrongData ? 'Strong information available' : 'Worth improving',
        reason: `${energy.label}. ${energy.confidence}.`,
        metric: [energy.electricity ? `${Math.round(energy.electricity).toLocaleString('en-GB')} kWh electricity` : '', energy.gas ? `${Math.round(energy.gas).toLocaleString('en-GB')} kWh gas` : ''].filter(Boolean).join(' · '),
        missing: energy.issues,
        renewal: null
      },
      {
        id:'broadband', label:'Broadband',
        status: broadbandWorthReview ? 'review' : plan.broadbandExperience === 'unknown' ? 'missing' : 'low',
        headline: broadbandWorthReview ? 'Worth discussing' : 'No immediate issue identified',
        reason: broadbandConcern ? `Current experience: ${plan.broadbandExperience}.` : `Contract position: ${broadbandRenewal.label}.`,
        metric: broadbandRenewal.label,
        missing: plan.broadbandContract === 'unknown' && !plan.broadbandRenewalDate ? ['Broadband contract or renewal date'] : [],
        renewal: broadbandRenewal
      },
      {
        id:'mobile', label:'Mobile',
        status: mobileWorthReview ? 'review' : mobileSelected ? 'low' : 'low',
        headline: mobileWorthReview ? 'Worth discussing' : mobileSelected ? 'Requirements recorded' : 'Not selected',
        reason: mobileSelected ? `Lines: ${plan.mobileLines}. Main concern: ${plan.mobileConcern}.` : 'No mobile review requested.',
        metric: mobileSelected ? mobileRenewal.label : '',
        missing: mobileSelected && plan.mobileContract === 'unknown' && !plan.mobileRenewalDate ? ['Mobile contract or upgrade date'] : [],
        renewal: mobileSelected ? mobileRenewal : null
      },
      {
        id:'insurance', label:'Insurance',
        status: insuranceSelected && ['ready','review'].includes(insuranceRenewal.kind) ? 'review' : insuranceSelected ? 'low' : 'low',
        headline: insuranceSelected ? 'Included in the conversation' : 'Not selected',
        reason: insuranceSelected ? `Cover to discuss: ${plan.insuranceInterest}.` : 'No insurance discussion requested.',
        metric: insuranceSelected ? insuranceRenewal.label : '',
        missing: insuranceSelected && plan.insuranceRenewal === 'unknown' && !plan.insuranceRenewalDate ? ['Insurance renewal date'] : [],
        renewal: insuranceSelected ? insuranceRenewal : null
      },
      {
        id:'earning', label:'Optional earning',
        status: earningSelected ? 'review' : 'low',
        headline: earningSelected ? 'Discuss separately and factually' : 'Not selected',
        reason: earningSelected ? 'Paul can explain activity, training, time and current costs. Income is not guaranteed.' : 'The Partner opportunity remains optional.',
        metric: earningSelected ? `Available time: ${plan.earningTime}` : '',
        missing: earningSelected && plan.earningTime === 'unknown' ? ['Time available for optional earning'] : [],
        renewal: null
      }
    ];
  }

  function evaluate(planInput, today = new Date()) {
    const plan = mergePlan(planInput);
    const services = serviceCards(plan, today);
    const missing = [];
    if (!plan.priority) missing.push('Main household goal');
    if (!plan.householdName) missing.push('Household name or label');
    services.forEach(service => missing.push(...service.missing));

    const energy = energyQuality(plan);
    const warnings = [...energy.warnings];
    const reviewServices = services.filter(service => service.status === 'review');
    const readyServices = services.filter(service => service.status === 'ready');

    let score = 100;
    score -= Math.min(45, missing.length * 9);
    score -= warnings.length * 5;
    if (!plan.consentContact) score -= 5;
    score = Math.max(20, Math.min(100, score));

    let status = 'ready';
    let title = 'You are ready to speak to Paul';
    let summary = 'The household picture is clear enough for a useful conversation. You can still improve individual details later.';
    if (!plan.priority || missing.length >= 3 || score < 70) {
      status = 'building';
      title = 'A few details would make this much more useful';
      summary = `${missing.length} details are still worth adding before the conversation.`;
    } else if (missing.length || warnings.length) {
      status = 'almost';
      title = missing.length === 1 ? 'One detail would strengthen your plan' : `${missing.length} details would strengthen your plan`;
      summary = 'You can book now, or improve these details first.';
    }

    const actions = [];
    const add = (id, title, detail, priority, route='') => {
      if (!actions.some(action => action.id === id)) actions.push({id,title,detail,priority,route});
    };
    if (!plan.priority) add('goal','Choose the main household goal','This keeps the result focused on what matters most.',1,'/command-centre');
    if (energy.warnings.length) add('energy-check','Check the annual energy figures',energy.warnings[0],1,'/calculator');
    else if (!energy.hasStrongData) add('energy-improve','Improve the energy evidence','Annual kWh from a bill or supplier would give the strongest starting point.',2,'/calculator');
    services.forEach(service => {
      if (service.missing.length) add(`${service.id}-missing`, `Add ${service.missing[0].toLowerCase()}`, 'A date or contract detail helps Paul understand the right timing.',2,'/command-centre');
    });
    reviewServices.forEach(service => add(`${service.id}-review`, `Prepare ${service.label.toLowerCase()} questions`, service.reason, 3,'/household-os'));
    if (plan.earningInterest !== 'none') add('earning-questions','Prepare questions about optional earning','Ask about activity, training, time, current costs and realistic expectations.',3,'/household-os');
    add('book','Book a free conversation with Paul','Bring the household snapshot and decide in your own time.',4,'https://calendly.com/save-with-paul/chat-with-paul');

    const dismissed = new Set(plan.meta?.dismissedActions || []);
    const visibleActions = actions
      .filter(action => !dismissed.has(action.id))
      .sort((a,b) => a.priority - b.priority)
      .slice(0, 6);

    const timeline = services
      .filter(service => service.renewal?.date)
      .map(service => ({service:service.label,...service.renewal}))
      .sort((a,b) => (a.days ?? 99999) - (b.days ?? 99999));

    const priorityLabel = {
      save:'Reduce household costs',
      understand:'Simplify household bills',
      earn:'Explore optional earning',
      both:'Save money and perhaps earn'
    }[plan.priority] || 'Understand the household';

    return {
      plan,
      score,
      status,
      title,
      summary,
      priorityLabel,
      services,
      missing:[...new Set(missing)],
      warnings,
      actions:visibleActions,
      timeline,
      reviewCount:reviewServices.length + readyServices.length,
      readyToBook:status !== 'building',
      updatedAt:plan.meta?.updatedAt || ''
    };
  }

  return {defaultPlan, mergePlan, energyQuality, renewalState, serviceCards, evaluate, daysUntil};
});
