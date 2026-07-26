(() => {
  const STORAGE_KEY = 'saveEarnPaulV6Plan';
  const CALENDLY = 'https://calendly.com/save-with-paul/chat-with-paul';
  const WHATSAPP = 'https://wa.me/447925008477';
  const form = document.getElementById('householdCheckForm');
  const panels = [...document.querySelectorAll('[data-check-panel]')];
  const stepLinks = [...document.querySelectorAll('[data-step-link]')];
  const errorBox = document.getElementById('checkError');
  const resultRoot = document.getElementById('checkResult');
  const nav = document.getElementById('checkNavigation');
  const back = document.getElementById('checkBack');
  const next = document.getElementById('checkNext');
  const saved = document.getElementById('checkSaved');
  const importInput = document.getElementById('checkImportInput');
  const model = window.HouseholdCheckV61;
  const energyModel = window.EnergyModelV6;

  if (!model || !energyModel) throw new Error('Household Check model failed to load');

  let step = 0;
  let saveTimer = 0;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[character]));

  const fmtDate = value => {
    if (!value) return '';
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  };

  const fieldIds = [
    'householdName','postcode','propertyType','bedrooms','occupants','heating','efficiency','daytime','ev','solar',
    'actualElectric','actualGas','energyConcern','broadbandExperience','broadbandContract','broadbandRenewalDate',
    'workFromHome','mobileLines','mobileConcern','mobileContract','mobileRenewalDate','insuranceInterest',
    'insuranceRenewal','insuranceRenewalDate','earningTime','earningGoal','consentContact'
  ];

  function readPlan() {
    const plan = model.defaultPlan();
    fieldIds.forEach(id => {
      const element = document.getElementById(id);
      if (!element) return;
      plan[id] = element.type === 'checkbox' ? element.checked : element.value;
    });
    ['priority','energyMode','earningInterest'].forEach(name => {
      plan[name] = form.querySelector(`[name="${name}"]:checked`)?.value || '';
    });

    if (plan.energyMode === 'estimate') {
      const estimated = energyModel.householdEstimate({
        property:plan.propertyType, bedrooms:+plan.bedrooms, occupants:+plan.occupants,
        heating:plan.heating, efficiency:plan.efficiency, daytime:plan.daytime,
        ev:plan.ev, solar:plan.solar
      });
      plan.estimatedElectric = String(Math.round(estimated.e));
      plan.estimatedGas = estimated.g ? String(Math.round(estimated.g)) : '';
    }

    const existing = currentStoredPlan();
    plan.meta = {
      ...(existing.meta || {}),
      checkStep:step,
      updatedAt:new Date().toISOString()
    };
    plan.version = '6.3';
    return plan;
  }

  function currentStoredPlan() {
    try {
      return model.mergePlan(JSON.parse(localStorage.getItem(STORAGE_KEY)) || JSON.parse(localStorage.getItem('saveEarnPaulV5Plan')) || {});
    } catch (_) {
      return model.defaultPlan();
    }
  }

  function setPlan(planInput) {
    const plan = model.mergePlan(planInput);
    fieldIds.forEach(id => {
      const element = document.getElementById(id);
      if (!element || plan[id] === undefined || plan[id] === null) return;
      if (element.type === 'checkbox') element.checked = Boolean(plan[id]);
      else element.value = String(plan[id]);
    });
    ['priority','energyMode','earningInterest'].forEach(name => {
      const selected = [...form.querySelectorAll(`[name="${name}"]`)].find(input => input.value === String(plan[name] || ''));
      if (selected) selected.checked = true;
    });
    updateEnergyVisibility();
    updateEnergyMessage();
  }

  function savePlan(message = 'Saved on this device') {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const plan = readPlan();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
      saved.textContent = `${message} · ${new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`;
      window.dispatchEvent(new CustomEvent('householdcheckchange',{detail:{plan}}));
    }, 120);
  }

  function showStep(target, {focus=true} = {}) {
    step = Math.max(0, Math.min(5, target));
    const showingResult = step === 5;
    panels.forEach((panel,index) => {
      panel.classList.toggle('active', index === step);
      panel.hidden = index !== step;
    });
    resultRoot.hidden = !showingResult;
    form.hidden = showingResult;
    nav.hidden = showingResult;
    stepLinks.forEach((link,index) => {
      link.classList.toggle('active', index === step);
      link.classList.toggle('complete', index < step);
      link.setAttribute('aria-current', index === step ? 'step' : 'false');
    });
    const progress = Math.min(100, (Math.min(step,5) / 5) * 100);
    document.getElementById('checkMobileFill').style.width = `${progress}%`;
    document.getElementById('checkMobileLabel').textContent = showingResult ? 'Your household snapshot' : `Step ${step + 1} of 5`;
    back.hidden = step === 0;
    next.textContent = step === 4 ? 'Create my household snapshot' : 'Continue';
    errorBox.classList.remove('show');
    if (showingResult) renderResult();
    savePlan();
    if (focus) {
      const targetElement = showingResult ? resultRoot : panels[step];
      targetElement?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
      targetElement?.querySelector('h2')?.setAttribute('tabindex','-1');
      targetElement?.querySelector('h2')?.focus({preventScroll:true});
    }
    window.trackSafe?.('household_check_step',{step:showingResult?'result':step+1});
  }

  function updateEnergyVisibility() {
    const mode = form.querySelector('[name="energyMode"]:checked')?.value || 'estimate';
    const figures = document.getElementById('energyFigures');
    document.querySelectorAll('.energy-source-card').forEach(card => {
      const input = card.querySelector('input');
      card.classList.toggle('is-selected', Boolean(input?.checked));
    });
    figures.classList.toggle('is-estimate', mode === 'estimate');
    ['actualElectric','actualGas'].forEach(id => {
      const input=document.getElementById(id);
      input.closest('div').classList.toggle('soft-disabled', mode === 'estimate');
      input.disabled = mode === 'estimate';
    });
  }

  function updateEnergyMessage() {
    const quality = model.energyQuality(readPlan());
    const box = document.getElementById('energyQualityMessage');
    if (quality.warnings.length) {
      box.className = 'energy-quality-message show warning';
      box.innerHTML = `<strong>Please check this figure.</strong><p>${quality.warnings.map(esc).join(' ')}</p>`;
    } else {
      box.className = 'energy-quality-message show';
      const sourceMessage = {
        actual:'Enter annual electricity and gas kWh from a bill or supplier statement.',
        annualised:'Use the Energy Data Passport to annualise readings, then return with the resulting annual kWh.',
        epc:'Use official EPC property information as context. It remains an estimate, not actual usage.',
        estimate:'No figures are required here. The household details will create an indicative estimate.'
      }[quality.mode] || '';
      box.innerHTML = `<strong>${esc(quality.label)}</strong><p>${esc(quality.confidence)}. ${esc(sourceMessage)}</p>`;
    }
  }

  function validateCurrentStep() {
    errorBox.classList.remove('show');
    const plan = readPlan();
    const errors = [];
    if (step === 0 && !plan.priority) errors.push('Choose the main household goal.');
    if (step === 2) {
      const quality = model.energyQuality(plan);
      if (['actual','annualised','epc'].includes(plan.energyMode) && !quality.electricity && !quality.gas) {
        errors.push('Enter annual electricity or gas kWh, or choose the household estimate.');
      }
      if (quality.warnings.length) errors.push(quality.warnings[0]);
    }
    if (errors.length) {
      errorBox.innerHTML = `<strong>One thing needs attention.</strong><p>${errors.map(esc).join(' ')}</p>`;
      errorBox.classList.add('show');
      errorBox.focus();
      return false;
    }
    return true;
  }

  function statusClass(status) {
    return status === 'ready' ? 'ready' : status === 'almost' ? 'almost' : 'building';
  }

  function serviceStatusLabel(status) {
    return status === 'ready' ? 'Strong information' : status === 'review' ? 'Worth discussing' : status === 'missing' ? 'Add a detail' : 'Not a priority';
  }

  function resultSummary(evaluation) {
    const plan = evaluation.plan;
    const household = plan.householdName || 'My household';
    return `${household}: ${evaluation.priorityLabel}. Readiness ${evaluation.score}%. ${evaluation.reviewCount} areas are worth discussing. ${evaluation.missing.length ? `Useful missing details: ${evaluation.missing.join(', ')}.` : 'No essential information gaps were identified.'}`;
  }

  function renderResult() {
    const plan = readPlan();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    const evaluation = model.evaluate(plan);
    const topActions = evaluation.actions.slice(0,4);
    const missing = evaluation.missing.length
      ? `<div class="snapshot-missing"><h3>Details that would improve the conversation</h3><div>${evaluation.missing.map(item=>`<span>${esc(item)}</span>`).join('')}</div></div>`
      : `<div class="snapshot-complete"><span>✓</span><div><strong>No essential gaps identified</strong><p>You can still update any section before or after speaking to Paul.</p></div></div>`;
    const warnings = evaluation.warnings.length
      ? `<div class="snapshot-warning"><strong>Check the energy information</strong><p>${evaluation.warnings.map(esc).join(' ')}</p></div>` : '';
    const timeline = evaluation.timeline.length
      ? `<section class="snapshot-section"><div class="snapshot-section-head"><div><span class="kicker">Timing</span><h3>Upcoming contract and renewal dates</h3></div><button type="button" class="mini-action" data-result-edit="3">Edit dates</button></div><div class="renewal-timeline">${evaluation.timeline.map(item=>`<article><span class="timeline-dot ${esc(item.kind)}"></span><div><strong>${esc(item.service)}</strong><p>${esc(item.label)} · ${esc(fmtDate(item.date))}</p></div></article>`).join('')}</div></section>`
      : `<section class="snapshot-section timeline-empty"><span class="kicker">Timing</span><h3>Add exact dates when you find them.</h3><p>Contract and renewal dates turn this snapshot into a useful household reminder.</p><button type="button" class="btn btn-light btn-small" data-result-edit="3">Add dates</button></section>`;

    resultRoot.innerHTML = `
      <div class="snapshot-hero snapshot-${statusClass(evaluation.status)}">
        <div class="snapshot-score" style="--score:${evaluation.score * 3.6}deg"><div><strong>${evaluation.score}%</strong><span>ready</span></div></div>
        <div class="snapshot-hero-copy"><span class="kicker" style="color:var(--yellow)">Your household snapshot</span><h2>${esc(evaluation.title)}</h2><p>${esc(evaluation.summary)}</p><div class="snapshot-badges"><span>${esc(evaluation.priorityLabel)}</span><span>${evaluation.reviewCount} areas worth discussing</span><span>${evaluation.actions.length} next actions</span></div></div>
      </div>

      ${warnings}
      ${missing}

      <section class="snapshot-section">
        <div class="snapshot-section-head"><div><span class="kicker">At a glance</span><h3>What may be worth discussing</h3></div><span class="snapshot-help">Nothing here is a quotation or guaranteed saving.</span></div>
        <div class="snapshot-service-grid">${evaluation.services.map(service=>`
          <article class="snapshot-service status-${esc(service.status)}">
            <div class="snapshot-service-top"><h4>${esc(service.label)}</h4><span>${esc(serviceStatusLabel(service.status))}</span></div>
            ${service.metric ? `<strong class="snapshot-service-metric">${esc(service.metric)}</strong>` : ''}
            <p>${esc(service.reason)}</p>
            <button type="button" class="mini-action" data-result-edit="${service.id === 'energy' ? 2 : service.id === 'earning' ? 4 : 3}">Edit ${esc(service.label)}</button>
          </article>`).join('')}</div>
      </section>

      ${timeline}

      <section class="snapshot-section">
        <div class="snapshot-section-head"><div><span class="kicker">Next best actions</span><h3>Keep this simple.</h3></div></div>
        <div class="snapshot-actions-list">${topActions.map((action,index)=>`
          <article><span>${index+1}</span><div><strong>${esc(action.title)}</strong><p>${esc(action.detail)}</p></div>${action.route ? `<a href="${esc(action.route)}">${action.route.startsWith('http')?'Open':'Go'}</a>` : ''}</article>`).join('')}</div>
      </section>

      <section class="paul-result">
        <img src="/paul-scrase-480.webp" width="160" height="200" alt="Paul Scrase">
        <div><span class="kicker" style="color:var(--yellow)">Paul’s recommendation</span><h3>${evaluation.readyToBook ? 'Bring this snapshot to a free conversation.' : 'Improve the highlighted details, then bring the snapshot.'}</h3><p>I’ll use the household priorities, energy evidence and renewal timing to keep the conversation relevant. Nothing changes unless you decide to proceed.</p><div class="paul-result-actions"><a class="btn btn-yellow" href="${CALENDLY}" target="_blank" rel="noopener">Book a free 30-minute chat</a><button class="btn btn-light" type="button" id="resultWhatsApp">WhatsApp my summary</button></div></div>
      </section>

      <div class="snapshot-main-actions no-print">
        <a class="btn btn-blue" href="/household-os">Open My household</a>
        <button class="btn btn-yellow" type="button" id="snapshotPdf">Create one-page snapshot</button>
        <button class="btn btn-light" type="button" id="copySnapshot">Copy summary</button>
        <button class="btn btn-light" type="button" id="editSnapshot">Edit my answers</button>
      </div>

      <details class="technical-backup no-print"><summary>Data backup options</summary><p>JSON is a technical portability format, not a customer report.</p><div><button class="btn btn-light btn-small" type="button" id="exportCheck">Export plan file</button><button class="btn btn-light btn-small" type="button" id="importCheck">Import plan file</button></div></details>
      <div class="snapshot-boundary">Guidance only. This is not a supplier comparison, quotation, financial advice, guaranteed saving or income forecast.</div>`;

    resultRoot.querySelectorAll('[data-result-edit]').forEach(button => {
      button.addEventListener('click', () => showStep(+button.dataset.resultEdit));
    });
    document.getElementById('editSnapshot').onclick = () => showStep(0);
    document.getElementById('snapshotPdf').onclick = () => {
      savePlan('Snapshot saved');
      location.href = '/report-studio?type=snapshot';
      window.trackSafe?.('household_snapshot_pdf');
    };
    document.getElementById('copySnapshot').onclick = async () => {
      await navigator.clipboard.writeText(resultSummary(evaluation));
      window.showToast?.('Household summary copied');
      window.trackSafe?.('household_snapshot_copied');
    };
    document.getElementById('resultWhatsApp').onclick = () => {
      window.open(`${WHATSAPP}?text=${encodeURIComponent(`Hi Paul, I completed the Household Check. ${resultSummary(evaluation)} Could we discuss it?`)}`,'_blank','noopener');
      window.trackSafe?.('household_snapshot_whatsapp');
    };
    document.getElementById('exportCheck').onclick = exportPlan;
    document.getElementById('importCheck').onclick = () => importInput.click();
    window.trackSafe?.('household_check_completed',{status:evaluation.status,score:evaluation.score,priority:plan.priority});
  }

  function exportPlan() {
    const payload = {type:'SaveAndEarnWithPaulPlan',version:'6.3',exportedAt:new Date().toISOString(),data:readPlan()};
    const blob = new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `household-plan-${new Date().toISOString().slice(0,10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function importPlan(file) {
    try {
      const payload = JSON.parse(await file.text());
      if (payload?.type !== 'SaveAndEarnWithPaulPlan' || !payload.data) throw new Error('Unsupported file');
      const plan = model.mergePlan(payload.data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
      setPlan(plan);
      showStep(5);
      window.showToast?.('Household plan imported');
    } catch (_) {
      errorBox.innerHTML = '<strong>That file could not be imported.</strong><p>Choose a compatible household-plan JSON file.</p>';
      errorBox.classList.add('show');
    } finally {
      importInput.value = '';
    }
  }

  form.addEventListener('input', event => {
    if (event.target.matches('[name="energyMode"],#actualElectric,#actualGas,#heating')) updateEnergyMessage();
    savePlan();
  });
  form.addEventListener('change', event => {
    if (event.target.matches('[name="energyMode"]')) {
      updateEnergyVisibility();
      document.querySelectorAll('.energy-source-card').forEach(card => {
        const input = card.querySelector('input');
        card.classList.toggle('is-selected', Boolean(input?.checked));
      });
    }
    updateEnergyMessage();
    savePlan();
  });
  back.onclick = () => showStep(step - 1);
  next.onclick = () => {
    if (!validateCurrentStep()) return;
    showStep(step + 1);
  };
  stepLinks.forEach(link => link.addEventListener('click', () => {
    const target = +link.dataset.stepLink;
    if (target <= step || target === 5) showStep(target);
  }));
  document.getElementById('clearCheck').onclick = () => {
    if (!confirm('Clear the Household Check saved on this device?')) return;
    localStorage.removeItem(STORAGE_KEY);
    setPlan(model.defaultPlan());
    showStep(0);
    window.showToast?.('Household Check cleared');
  };
  importInput.addEventListener('change', () => importInput.files?.[0] && importPlan(importInput.files[0]));

  const demo = document.documentElement.dataset.demo === 'true' || new URLSearchParams(location.search).has('demo');
  let initial = currentStoredPlan();
  if (demo && !initial.priority) {
    initial = model.mergePlan({
      householdName:'The Example household', postcode:'BN21 1AA', priority:'both',
      propertyType:'semi', bedrooms:'3', occupants:'3', heating:'gas', efficiency:'average', daytime:'mixed',
      energyMode:'actual', actualElectric:'3120', actualGas:'11840', energyConcern:'cost',
      broadbandExperience:'unreliable', broadbandContract:'ending', broadbandRenewalDate:'2026-08-18', workFromHome:'work',
      mobileLines:'family', mobileConcern:'cost', mobileContract:'ending', mobileRenewalDate:'2026-10-04',
      insuranceInterest:'home', insuranceRenewal:'soon', insuranceRenewalDate:'2026-09-20',
      earningInterest:'curious', earningTime:'few', earningGoal:'bills', consentContact:true,
      meta:{updatedAt:new Date().toISOString(),checkStep:5,energyInsight:{source:'actual',sourceLabel:'Customer-supplied actual annual usage',sourceGrade:'A',confidence:'Highest confidence',actual:true}}
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  }
  setPlan(initial);
  const requestedResult = document.documentElement.dataset.view === 'result' || new URLSearchParams(location.search).get('view') === 'result';
  const initialStep = requestedResult ? 5 : Math.max(0,Math.min(4,+initial.meta?.checkStep || 0));
  showStep(initialStep,{focus:false});
  updateEnergyVisibility();
  updateEnergyMessage();
})();
