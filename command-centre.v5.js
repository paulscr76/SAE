(() => {
  const KEY = 'saveEarnPaulV5Plan';
  const LEGACY_KEY = 'saveEarnPaulV4Plan';
  const VERSION = '5.0';
  const CALENDLY = 'https://calendly.com/save-with-paul/chat-with-paul';
  const WHATSAPP = 'https://wa.me/447925008477';
  const form = document.getElementById('commandForm');
  if (!form) return;

  const panels = [...document.querySelectorAll('.wizard-panel')];
  const links = [...document.querySelectorAll('[data-step-link]')];
  const back = document.getElementById('commandBack');
  const next = document.getElementById('commandNext');
  const clear = document.getElementById('clearPlan');
  const error = document.getElementById('commandError');
  const saved = document.getElementById('savedState');
  const importButton = document.getElementById('importPlan');
  const importInput = document.getElementById('importPlanFile');
  const exportTop = document.getElementById('exportPlanTop');
  const mobileFill = document.getElementById('mobileProgressFill');
  const mobileLabel = document.getElementById('mobileProgressLabel');
  let step = 0;

  const ids = ['propertyType','bedrooms','occupants','heating','efficiency','daytime','energyMode','energyConcern','actualElectric','actualGas','ev','solar','broadbandExperience','broadbandContract','workFromHome','mobileLines','mobileConcern','mobileContract','earningInterest','earningTime','earningGoal'];
  const defaultMeta = () => ({ actionOrder: [], dismissedActions: [], scenarioComparison: null, updatedAt: new Date().toISOString() });
  const priority = () => form.querySelector('[name="priority"]:checked')?.value || '';

  function rawState() {
    const state = { version: VERSION, priority: priority(), meta: defaultMeta() };
    ids.forEach(id => state[id] = document.getElementById(id)?.value || '');
    try {
      const existing = JSON.parse(localStorage.getItem(KEY));
      if (existing?.meta) state.meta = {...defaultMeta(), ...existing.meta, updatedAt: new Date().toISOString()};
    } catch (_) {}
    return state;
  }

  function setState(state) {
    if (!state || typeof state !== 'object') return;
    if (state.priority) form.querySelector(`[name="priority"][value="${CSS.escape(state.priority)}"]`)?.click();
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el && state[id] !== undefined && state[id] !== null) el.value = state[id];
    });
    const clean = {...state, version: VERSION, meta: {...defaultMeta(), ...(state.meta || {})}};
    localStorage.setItem(KEY, JSON.stringify(clean));
    toggleActual();
    updateContextTips();
  }

  function save(message = '') {
    const state = rawState();
    localStorage.setItem(KEY, JSON.stringify(state));
    saved.textContent = message || `Progress saved on this device at ${new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}.`;
    updateContextTips();
    return state;
  }

  function load() {
    try {
      let state = JSON.parse(localStorage.getItem(KEY));
      if (!state) {
        state = JSON.parse(localStorage.getItem(LEGACY_KEY));
        if (state) state = {...state, version: VERSION, meta: defaultMeta()};
      }
      if (state) {
        setState(state);
        saved.innerHTML = '<strong>Saved plan restored.</strong> Continue or jump directly to the dashboard.';
      }
    } catch (_) {}
  }

  const baseE = {1:1700,2:2150,3:2500,4:3200,5:3900,6:4600};
  const baseG = {1:6200,2:7800,3:9500,4:12200,5:15000,6:17800};
  const prop = {flat:.78,terrace:.92,semi:1,detached:1.18,bungalow:1.08};
  const eff = {efficient:.82,average:1,inefficient:1.22};
  const occ = {low:.94,mixed:1,high:1.1};

  function estimateEnergy(s = rawState()) {
    const beds = +s.bedrooms, people = +s.occupants;
    let e = baseE[beds] || 5200;
    e += Math.max(0, people - beds) * 320;
    e *= prop[s.propertyType] || 1;
    e *= occ[s.daytime] || 1;
    if (s.ev === 'yes') e += 2200;
    if (s.solar === 'yes') e *= .78;
    if (s.heating === 'electric') e += 6500;
    if (s.heating === 'heatpump') e += 2800;
    let g = 0;
    if (s.heating === 'gas') {
      g = (baseG[beds] || 20000) + Math.max(0, people - beds) * 400;
      g *= prop[s.propertyType] || 1;
      g *= eff[s.efficiency] || 1;
      g = Math.max(3000, g);
    }
    return {e: Math.max(1000,e), g};
  }

  function energyValues(s = rawState()) {
    const estimated = estimateEnergy(s);
    if (s.energyMode === 'actual') {
      return {e:+s.actualElectric || estimated.e, g:s.heating === 'gas' ? (+s.actualGas || estimated.g) : 0, actual:Boolean(+s.actualElectric || +s.actualGas)};
    }
    return {...estimated, actual:false};
  }

  const fmt = n => `${Math.round(n).toLocaleString('en-GB')} kWh`;
  function toggleActual() {
    const showActual = document.getElementById('energyMode').value === 'actual';
    document.querySelectorAll('.hidden-actual').forEach(el => el.style.display = showActual ? 'block' : 'none');
  }
  document.getElementById('energyMode').addEventListener('change', toggleActual);

  function ensureTips() {
    panels.slice(0,5).forEach((panel,index) => {
      if (!panel.querySelector('.context-tip')) {
        const tip = document.createElement('div');
        tip.className = 'context-tip';
        tip.id = `contextTip${index}`;
        tip.setAttribute('aria-live','polite');
        panel.appendChild(tip);
      }
    });
  }

  function updateContextTips() {
    const s = rawState();
    const tips = [
      s.priority ? 'Good start. You can change this priority later without losing the rest of the plan.' : 'Choose the main reason you are here. This controls the order of the final actions, not what you are allowed to review.',
      s.efficiency === 'average' ? '“Average / unknown” is fine for planning. Actual annual kWh will matter more than a guessed efficiency label.' : 'Property details affect estimates, but they do not replace actual annual consumption.',
      s.energyMode === 'actual' ? ((+s.actualElectric || +s.actualGas) ? 'Actual annual kWh raises the energy confidence level. Check that the figures are usage—not cost or a meter reading.' : 'Actual mode is selected, but no annual kWh has been entered yet.') : 'This estimate is a planning baseline. Use the bill helper when you can find annual kWh.',
      s.broadbandContract === 'unknown' ? 'A contract end date is often the most useful missing broadband detail.' : (['ending','out'].includes(s.broadbandContract) ? 'Contract timing suggests a broadband conversation may be useful.' : 'Being in contract does not prevent planning, but exit charges may matter.'),
      s.earningInterest === 'none' ? 'Leaving this as “not interested” keeps earning out of the action plan.' : 'Time availability alone cannot predict income. Use the conversation to understand activity, training and costs.'
    ];
    tips.forEach((tip,index) => {
      const el = document.getElementById(`contextTip${index}`);
      if (el) el.innerHTML = `<strong>Helpful context:</strong> ${tip}`;
    });
  }

  function show(n, scroll = true) {
    step = Math.max(0, Math.min(panels.length - 1, n));
    panels.forEach((p,i) => p.classList.toggle('active', i === step));
    links.forEach((l,i) => { l.classList.toggle('active', i === step); l.classList.toggle('done', i < step); });
    back.style.visibility = step === 0 ? 'hidden' : 'visible';
    next.textContent = step === panels.length - 1 ? 'Return to start' : step === panels.length - 2 ? 'Build dashboard' : 'Next';
    error.classList.remove('show');
    const pct = ((step + 1) / panels.length) * 100;
    if (mobileFill) mobileFill.style.width = `${pct}%`;
    if (mobileLabel) mobileLabel.textContent = `Step ${step + 1} of ${panels.length}`;
    if (step === panels.length - 1) renderDashboard();
    updateContextTips();
    if (scroll) window.scrollTo({top:document.querySelector('.command-main').offsetTop - 95,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }

  function validate() {
    if (step === 0 && !priority()) {
      error.innerHTML = '<strong>Please choose a main priority.</strong>';
      error.classList.add('show'); error.focus(); return false;
    }
    if (step === 2 && document.getElementById('energyMode').value === 'actual' && !(+document.getElementById('actualElectric').value || +document.getElementById('actualGas').value)) {
      error.innerHTML = '<strong>Enter at least one annual kWh figure, or choose an estimate.</strong>';
      error.classList.add('show'); error.focus(); return false;
    }
    return true;
  }

  function readiness(s, energy, actions) {
    const outstanding = [];
    if (!s.priority) outstanding.push('Main priority');
    if (s.energyMode !== 'actual' || !(+s.actualElectric || +s.actualGas)) outstanding.push('Actual annual energy kWh');
    if (s.broadbandContract === 'unknown') outstanding.push('Broadband contract position');
    if (s.mobileLines !== 'none' && s.mobileContract === 'unknown') outstanding.push('Mobile contract timing');
    const domains = [
      Boolean(s.priority),
      Boolean(s.propertyType && s.bedrooms && s.occupants && s.heating),
      s.energyConcern === 'none' || energy.actual || s.energyMode === 'estimate',
      s.broadbandExperience !== 'unknown' && s.broadbandContract !== 'unknown',
      s.mobileLines === 'none' || s.mobileConcern !== 'none',
      s.earningInterest === 'none' || s.earningTime !== 'unknown'
    ];
    const complete = domains.filter(Boolean).length;
    const energyConfidence = energy.actual ? 'High — annual kWh supplied' : 'Medium — household estimate';
    const conversation = actions.length && outstanding.length <= 2 ? 'Ready' : actions.length ? 'Nearly ready' : 'No urgent conversation';
    return {complete, total:domains.length, energyConfidence, conversation, outstanding};
  }

  function buildActions(s, energy = energyValues(s)) {
    const actions = [];
    if (s.energyConcern !== 'none' || ['save','understand','both'].includes(s.priority)) {
      actions.push({id:'energy',title:energy.actual?'Keep your latest bill available':'Confirm annual electricity and gas kWh',detail:energy.actual?'The Command Centre already has annual figures.':'Use the bill helper or calculator to improve confidence.',step:2});
    }
    const broadbandNeeds = ['slow','unreliable','expensive'].includes(s.broadbandExperience) || ['ending','out'].includes(s.broadbandContract);
    if (broadbandNeeds) actions.push({id:'broadband',title:'Prepare the broadband facts',detail:'Note the provider, typical speed, reliability issue and contract end date.',step:3});
    const mobileNeeds = s.mobileLines !== 'none' || s.mobileConcern !== 'none' || ['ending','out'].includes(s.mobileContract);
    if (mobileNeeds) actions.push({id:'mobile',title:'List the household mobile requirements',detail:'Record the number of lines and the main signal, data, cost or upgrade concern.',step:3});
    const earningNeeds = s.earningInterest !== 'none' || ['earn','both'].includes(s.priority);
    if (earningNeeds) actions.push({id:'earning',title:'Prepare responsible earning questions',detail:'Ask about activity, training, realistic time and any costs. Income is not guaranteed.',step:4});
    if (!actions.length) actions.push({id:'general',title:'Choose whether a general conversation would help',detail:'There is no obligation to book or message.',step:0});

    const meta = s.meta || defaultMeta();
    const dismissed = new Set(meta.dismissedActions || []);
    let visible = actions.filter(a => !dismissed.has(a.id));
    const order = meta.actionOrder || [];
    visible.sort((a,b) => {
      const ai = order.indexOf(a.id), bi = order.indexOf(b.id);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
    return {all:actions, visible};
  }

  function updateActionMeta(mutator) {
    const state = rawState();
    state.meta = {...defaultMeta(), ...(state.meta || {})};
    mutator(state.meta);
    state.meta.updatedAt = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(state));
    renderDashboard();
  }

  function moveAction(id, direction) {
    updateActionMeta(meta => {
      const current = buildActions({...rawState(),meta}).visible.map(a => a.id);
      const index = current.indexOf(id), target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return;
      [current[index],current[target]] = [current[target],current[index]];
      meta.actionOrder = current;
    });
  }

  function dismissAction(id) {
    updateActionMeta(meta => {
      meta.dismissedActions = [...new Set([...(meta.dismissedActions || []), id])];
    });
  }

  function restoreActions() {
    updateActionMeta(meta => { meta.dismissedActions = []; meta.actionOrder = []; });
  }

  function meetingBrief(s, energy, actions) {
    const priorityLabel = {save:'Reducing household costs',understand:'Simplifying household bills',earn:'Flexible earning',both:'Saving and perhaps earning'}[s.priority] || 'General household review';
    const areas = actions.map(a => a.id).filter(id => id !== 'general').join(', ') || 'general review';
    return `Main priority: ${priorityLabel}. Areas to discuss: ${areas}. Energy: ${energy.actual ? 'actual annual kWh available' : 'indicative estimate only'}. Broadband contract: ${s.broadbandContract || 'unknown'}.`;
  }


  function exportPlan() {
    const payload = {type:'SaveAndEarnWithPaulPlan',version:VERSION,exportedAt:new Date().toISOString(),data:rawState()};
    const blob = new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `save-and-earn-household-plan-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(a.href);
    window.trackSafe?.('command_export');
  }

  async function importPlan(file) {
    try {
      const payload = JSON.parse(await file.text());
      if (payload?.type !== 'SaveAndEarnWithPaulPlan' || !payload.data || typeof payload.data !== 'object') throw new Error('Unsupported plan file');
      setState(payload.data);
      save('Imported plan restored on this device.');
      show(5);
      window.showToast?.('Plan imported');
      window.trackSafe?.('command_import');
    } catch (_) {
      error.innerHTML = '<strong>That file could not be imported.</strong><br>Choose a compatible Save & Earn household-plan JSON file.';
      error.classList.add('show'); error.focus();
    } finally { importInput.value = ''; }
  }

  function renderDashboard() {
    const s = rawState();
    const energy = energyValues(s);
    const built = buildActions(s);
    const actions = built.visible;
    const readinessInfo = readiness(s,energy,actions);
    const priorityLabel = {save:'Reducing household costs',understand:'Simplifying household bills',earn:'Exploring flexible earning',both:'Saving and perhaps earning'}[s.priority] || 'General review';
    const energyKind = s.energyConcern === 'none' && !['save','understand','both'].includes(s.priority) ? 'low' : energy.actual ? 'ready' : 'review';
    const broadbandNeeds = ['slow','unreliable','expensive'].includes(s.broadbandExperience) || ['ending','out'].includes(s.broadbandContract);
    const mobileNeeds = s.mobileLines !== 'none' || s.mobileConcern !== 'none' || ['ending','out'].includes(s.mobileContract);
    const earningNeeds = s.earningInterest !== 'none' || ['earn','both'].includes(s.priority);
    const statusLabel = kind => kind === 'ready' ? 'Ready' : kind === 'review' ? 'Worth reviewing' : 'Not a priority';
    const card = (kind,label,reason,metric,editStep,link='') => `<article class="dashboard-card editable-card"><div class="dashboard-card-top"><h3>${label}</h3><span class="status-pill status-${kind}">${statusLabel(kind)}</span></div>${metric ? `<div class="dashboard-metric">${metric}</div>` : ''}<p>${reason}</p><div class="card-actions"><button class="mini-action" type="button" data-edit-step="${editStep}">Edit ${label}</button>${link}</div></article>`;
    const cards = [
      card(energyKind,'Energy',energy.actual?'Actual annual kWh is available.':'This is an indicative household estimate.',`${fmt(energy.e)}${energy.g ? ' / '+fmt(energy.g) : ''}`,2,'<a href="/calculator">Compare scenarios</a>'),
      card(broadbandNeeds?'review':'low','Broadband',broadbandNeeds?'Experience or contract timing suggests a review may help.':'No immediate broadband issue was identified.','',3,'<a href="/guides#broadband">Preparation guide</a>'),
      card(mobileNeeds?'review':'low','Mobile',mobileNeeds?'Household requirements are ready to discuss.':'Mobile is not currently a priority.','',3),
      card(earningNeeds?'review':'low','Flexible earning',earningNeeds?'A factual conversation can cover activity, training, time and costs.':'Flexible earning is not selected.','',4)
    ].join('');
    const outstanding = readinessInfo.outstanding.length ? readinessInfo.outstanding.map(item=>`<li>${item}</li>`).join('') : '<li>No essential gaps identified.</li>';
    const actionHtml = actions.length ? actions.map((a,i)=>`<div class="action-item editable-action"><span class="action-no">${i+1}</span><div><strong>${a.title}</strong><span>${a.detail}</span><div class="action-controls no-print"><button type="button" data-action-up="${a.id}" aria-label="Move ${a.title} up">↑</button><button type="button" data-action-down="${a.id}" aria-label="Move ${a.title} down">↓</button><button type="button" data-action-edit="${a.step}">Edit</button><button type="button" data-action-dismiss="${a.id}">Dismiss</button></div></div></div>`).join('') : '<div class="notice blue">All suggested actions are dismissed. Restore them below.</div>';
    const brief = meetingBrief(s,energy,actions);
    const tailoredBooking = ['earn'].includes(s.priority) ? 'Book a flexible-earning conversation' : s.priority === 'both' ? 'Book a saving and earning conversation' : 'Book a household savings conversation';

    document.getElementById('dashboardContent').innerHTML = `
      <div class="dashboard-head"><div><span class="kicker" style="color:var(--yellow)">Your editable household plan</span><h2>${priorityLabel}</h2><p>Generated locally on ${new Date().toLocaleDateString('en-GB',{dateStyle:'long'})}.</p></div><div class="plan-count"><div><strong>${actions.length}</strong><span>active steps</span></div></div></div>
      <div class="readiness-grid"><article><span>Information readiness</span><strong>${readinessInfo.complete} of ${readinessInfo.total} areas</strong></article><article><span>Energy confidence</span><strong>${readinessInfo.energyConfidence}</strong></article><article><span>Conversation readiness</span><strong>${readinessInfo.conversation}</strong></article><article><span>Outstanding information</span><strong>${readinessInfo.outstanding.length || 'None'}</strong></article></div>
      <div class="dashboard-grid">${cards}</div>
      <section class="outstanding-box"><div><h3>Outstanding information</h3><ul>${outstanding}</ul></div><button class="btn btn-light btn-small no-print" type="button" id="jumpFirstGap">Go to first gap</button></section>
      <div class="action-plan"><div class="action-plan-head"><div><h3>Your ordered action plan</h3><p>Move, edit or dismiss actions. Changes remain on this device.</p></div>${built.all.length !== actions.length ? '<button class="btn btn-light btn-small no-print" type="button" id="restoreActions">Restore dismissed actions</button>' : ''}</div><div class="action-list">${actionHtml}</div></div>
      <section class="meeting-brief"><span class="kicker">Meeting brief</span><h3>Arrive at the conversation prepared.</h3><p id="meetingBriefText">${brief}</p><button class="btn btn-light btn-small no-print" id="copyBrief" type="button">Copy meeting brief</button></section>
      <div class="dashboard-actions no-print"><a class="btn btn-blue" href="${CALENDLY}" target="_blank" rel="noopener" data-track="booking_dashboard">${tailoredBooking}</a><button class="btn btn-yellow" type="button" id="sendPlan">WhatsApp my summary</button><button class="btn btn-light" type="button" id="visualReport">Create printable summary</button><button class="btn btn-light" type="button" id="exportPlan">Export plan file</button><button class="btn btn-light" type="button" id="importPlanDashboard">Import plan</button></div>
      <div class="notice blue">Guidance only—not a quotation, supplier recommendation, financial advice or income forecast.</div>`;

    document.querySelectorAll('[data-edit-step]').forEach(btn => btn.onclick = () => show(+btn.dataset.editStep));
    document.querySelectorAll('[data-action-edit]').forEach(btn => btn.onclick = () => show(+btn.dataset.actionEdit));
    document.querySelectorAll('[data-action-up]').forEach(btn => btn.onclick = () => moveAction(btn.dataset.actionUp,-1));
    document.querySelectorAll('[data-action-down]').forEach(btn => btn.onclick = () => moveAction(btn.dataset.actionDown,1));
    document.querySelectorAll('[data-action-dismiss]').forEach(btn => btn.onclick = () => dismissAction(btn.dataset.actionDismiss));
    document.getElementById('restoreActions')?.addEventListener('click',restoreActions);
    document.getElementById('jumpFirstGap').onclick = () => {
      const first = readinessInfo.outstanding[0] || '';
      show(first.includes('priority') ? 0 : first.includes('energy') ? 2 : first.includes('Broadband') ? 3 : first.includes('Mobile') ? 3 : 0);
    };
    document.getElementById('copyBrief').onclick = async () => { await navigator.clipboard.writeText(brief); window.showToast?.('Meeting brief copied'); window.trackSafe?.('brief_copied'); };
    document.getElementById('sendPlan').onclick = () => { window.open(`${WHATSAPP}?text=${encodeURIComponent('Hi Paul, I completed the Household Command Centre. '+brief+' Suggested actions: '+actions.map(a=>a.title).join('; ')+'. Could we discuss it?')}`,'_blank','noopener'); window.trackSafe?.('command_whatsapp'); };
    document.getElementById('visualReport').onclick = () => { location.href='/report-studio?type=full'; window.trackSafe?.('professional_report_open',{type:'full'}); };
    document.getElementById('exportPlan').onclick = exportPlan;
    document.getElementById('importPlanDashboard').onclick = () => importInput.click();
    window.trackSafe?.('command_completed',{priority:s.priority});
  }

  form.addEventListener('input', () => save());
  form.addEventListener('change', () => save());
  back.onclick = () => show(step - 1);
  next.onclick = () => {
    if (step === panels.length - 1) { show(0); return; }
    if (validate()) { save(); show(step + 1); }
  };
  links.forEach(link => link.onclick = () => {
    const n = +link.dataset.stepLink;
    if (n <= step || (n === panels.length - 1 && priority())) show(n);
  });
  clear.onclick = () => {
    if (confirm('Clear the saved household plan from this device?')) {
      localStorage.removeItem(KEY); localStorage.removeItem(LEGACY_KEY); localStorage.removeItem('saveEarnPaulV31Plan'); localStorage.removeItem('saveEarnPaulV3Plan'); localStorage.removeItem('saveEarnPaulV3BillMeta');
      form.reset(); toggleActual(); saved.textContent = 'Saved plan cleared.'; show(0);
    }
  };
  importButton.onclick = () => importInput.click();
  importInput.addEventListener('change', () => importInput.files[0] && importPlan(importInput.files[0]));
  exportTop.onclick = exportPlan;

  ensureTips(); load(); toggleActual(); show(0,false);
})();
