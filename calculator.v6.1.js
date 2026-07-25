(() => {
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  const MODEL = window.EnergyModelV6;
  if (!MODEL) throw new Error('Energy model failed to load');
  const {BENCHMARKS, householdEstimate, annualiseReadings, benchmarkPosition} = MODEL;

  function propertyTypeCode(property) {
    const value = `${property.propertyType} ${property.builtForm}`.toLowerCase();
    if (value.includes('flat') || value.includes('maisonette')) return 'flat';
    if (value.includes('bungalow')) return 'bungalow';
    if (value.includes('detached') && !value.includes('semi')) return 'detached';
    if (value.includes('semi')) return 'semi';
    if (value.includes('terrace') || value.includes('mid-terrace') || value.includes('end-terrace')) return 'terrace';
    return 'semi';
  }

  function heatingCode(description) {
    const value = String(description || '').toLowerCase();
    if (value.includes('heat pump')) return 'heatpump';
    if (value.includes('electric') || value.includes('storage heater')) return 'electric';
    if (value.includes('gas') || value.includes('boiler')) return 'gas';
    return 'other';
  }

  function efficiencyCode(rating) {
    const grade = String(rating || '').toUpperCase();
    if (['A','B','C'].includes(grade)) return 'efficient';
    if (grade === 'D' || !grade) return 'average';
    return 'inefficient';
  }

  function bedroomsFromFloorArea(area) {
    const value = +area || 0;
    if (!value) return 3;
    if (value <= 50) return 1;
    if (value <= 70) return 2;
    if (value <= 95) return 3;
    if (value <= 125) return 4;
    if (value <= 160) return 5;
    return 6;
  }

  function resultStateFromEstimate() {
    return {
      property: $('calcProperty').value,
      bedrooms: +$('calcBedrooms').value,
      occupants: +$('calcOccupants').value,
      heating: $('calcHeating').value,
      efficiency: $('calcEfficiency').value,
      daytime: $('calcDaytime').value,
      ev: $('calcEv').value,
      solar: $('calcSolar').value
    };
  }

  function setSource(source) {
    currentSource = source;
    document.querySelectorAll('[data-source]').forEach(button => {
      const active = button.dataset.source === source;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('[data-source-view]').forEach(panel => {
      const active = panel.dataset.sourceView === source;
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
    window.trackSafe?.('energy_source_selected', {source});
  }

  document.querySelectorAll('[data-source]').forEach(button => {
    button.addEventListener('click', () => setSource(button.dataset.source));
  });

  async function checkEpcStatus() {
    const status = $('epcApiStatus');
    const demo = document.documentElement.dataset.demo === 'true' || location.protocol === 'file:';
    if (demo) {
      apiConfigured = false;
      status.innerHTML = '<span class="status-dot demo"></span><span>Preview mode: use the demonstration property. Live lookup activates after deployment and API setup.</span>';
      $('useDemoProperty').hidden = false;
      return;
    }
    try {
      const response = await fetch('/api/epc-status', {headers:{Accept:'application/json'}});
      if (!response.ok) throw new Error('Status unavailable');
      const payload = await response.json();
      apiConfigured = Boolean(payload.configured);
      status.innerHTML = apiConfigured
        ? '<span class="status-dot ready"></span><span>Official England and Wales property lookup is ready.</span>'
        : '<span class="status-dot unavailable"></span><span>Official lookup is not configured yet. Annual kWh, meter readings and household estimates still work.</span>';
    } catch (_) {
      apiConfigured = false;
      status.innerHTML = '<span class="status-dot unavailable"></span><span>Official lookup could not be checked. The other energy sources remain available.</span>';
    }
  }

  function demoProperty() {
    return {
      lmkKey: 'DEMONSTRATION',
      uprn: '',
      address: '12 Example Close',
      postcode: 'BN21 1AA',
      lodgementDate: '2025-11-18',
      currentRating: 'D',
      potentialRating: 'B',
      currentEfficiency: 64,
      potentialEfficiency: 84,
      floorArea: 92,
      propertyType: 'House',
      builtForm: 'Semi-Detached',
      constructionAgeBand: 'England and Wales: 1930-1949',
      mainHeating: 'Boiler and radiators, mains gas',
      walls: 'Cavity wall, as built, no insulation (assumed)',
      roof: 'Pitched, 150 mm loft insulation',
      windows: 'Fully double glazed',
      hotWater: 'From main system',
      lighting: 'Low energy lighting in 70% of fixed outlets',
      energyIntensityCurrent: 219,
      energyIntensityPotential: 104,
      co2Current: 3.7,
      co2Potential: 1.8,
      heatingCostCurrent: 910,
      heatingCostPotential: 520,
      hotWaterCostCurrent: 170,
      hotWaterCostPotential: 105,
      lightingCostCurrent: 92,
      lightingCostPotential: 61,
      localAuthority: 'Demonstration area'
    };
  }

  function renderPropertyResults(rows) {
    propertyRows = rows;
    const root = $('propertyResults');
    if (!rows.length) {
      root.hidden = false;
      root.innerHTML = '<div class="empty-property-results"><strong>No current property record was returned.</strong><p>Try checking the postcode or continue with annual kWh, meter readings or a household estimate.</p></div>';
      return;
    }
    root.hidden = false;
    root.innerHTML = `<h3>Select the property</h3><div class="property-result-list">${
      rows.map((property, index) => `
        <button type="button" class="property-result" data-property-index="${index}">
          <span><strong>${esc(property.address)}</strong><small>${esc(property.postcode)} · EPC ${esc(property.currentRating || 'not supplied')} · lodged ${esc(formatDate(property.lodgementDate))}</small></span>
          <b>Select</b>
        </button>`).join('')
    }</div>`;
    root.querySelectorAll('[data-property-index]').forEach(button => {
      button.addEventListener('click', () => selectProperty(+button.dataset.propertyIndex));
    });
  }

  async function searchProperty() {
    const message = $('epcMessage');
    const postcode = $('epcPostcode').value.trim();
    message.className = 'lookup-message';
    message.textContent = '';
    if (!$('epcConsent').checked) {
      message.className = 'lookup-message show error';
      message.textContent = 'Confirm the postcode search before continuing.';
      return;
    }
    if (!/^[A-Za-z0-9 ]{5,9}$/.test(postcode)) {
      message.className = 'lookup-message show error';
      message.textContent = 'Enter a complete UK postcode.';
      return;
    }
    if (!apiConfigured) {
      message.className = 'lookup-message show notice';
      message.textContent = 'Official lookup is not configured on this deployment. Use the demonstration property or another source.';
      $('useDemoProperty').hidden = false;
      return;
    }

    $('searchEpc').disabled = true;
    $('searchEpc').textContent = 'Searching…';
    try {
      const response = await fetch(`/api/epc-search?postcode=${encodeURIComponent(postcode)}`, {
        headers: {Accept:'application/json'}
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Property lookup failed');
      renderPropertyResults(payload.properties || []);
      message.className = 'lookup-message show success';
      message.textContent = payload.count
        ? `${payload.count} current address record${payload.count === 1 ? '' : 's'} found. Select the correct property.`
        : 'No current address records were found.';
      window.trackSafe?.('epc_lookup_completed', {count:payload.count || 0});
    } catch (error) {
      message.className = 'lookup-message show error';
      message.textContent = error.message || 'Official property data is temporarily unavailable.';
    } finally {
      $('searchEpc').disabled = false;
      $('searchEpc').textContent = 'Find property records';
    }
  }

  function selectProperty(index) {
    selectedProperty = propertyRows[index];
    if (!selectedProperty) return;
    const floorArea = selectedProperty.floorArea ? `${Math.round(selectedProperty.floorArea)} m²` : 'Not supplied';
    const currentIntensity = selectedProperty.energyIntensityCurrent
      ? `${Math.round(selectedProperty.energyIntensityCurrent)} kWh/m²/year`
      : 'Not supplied';
    const modelledTotal = selectedProperty.floorArea && selectedProperty.energyIntensityCurrent
      ? `${Math.round(selectedProperty.floorArea * selectedProperty.energyIntensityCurrent).toLocaleString('en-GB')} kWh/year`
      : 'Not available';

    $('selectedProperty').hidden = false;
    $('selectedProperty').innerHTML = `
      <div class="selected-property-head">
        <div><span>SELECTED PROPERTY</span><h3>${esc(selectedProperty.address)}</h3><p>${esc(selectedProperty.postcode)}</p></div>
        <span class="epc-grade grade-${esc((selectedProperty.currentRating || 'u').toLowerCase())}">${esc(selectedProperty.currentRating || '?')}</span>
      </div>
      <div class="property-facts">
        <div><span>Floor area</span><strong>${esc(floorArea)}</strong></div>
        <div><span>Property</span><strong>${esc([selectedProperty.propertyType, selectedProperty.builtForm].filter(Boolean).join(' · ') || 'Not supplied')}</strong></div>
        <div><span>Main heating</span><strong>${esc(selectedProperty.mainHeating || 'Not supplied')}</strong></div>
        <div><span>EPC model intensity</span><strong>${esc(currentIntensity)}</strong></div>
        <div><span>Whole-property model</span><strong>${esc(modelledTotal)}</strong><small>Not split by fuel and not actual consumption</small></div>
        <div><span>Certificate lodged</span><strong>${esc(formatDate(selectedProperty.lodgementDate))}</strong></div>
      </div>`;
    $('epcContext').hidden = false;
    $('epcContext').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
  }

  function calculateEpcEstimate() {
    if (!selectedProperty) {
      $('epcMessage').className = 'lookup-message show error';
      $('epcMessage').textContent = 'Select the property first.';
      return;
    }
    const modelState = {
      property: propertyTypeCode(selectedProperty),
      bedrooms: bedroomsFromFloorArea(selectedProperty.floorArea),
      occupants: +$('epcOccupants').value,
      heating: heatingCode(selectedProperty.mainHeating),
      efficiency: efficiencyCode(selectedProperty.currentRating),
      daytime: $('epcDaytime').value,
      ev: $('epcEv').value,
      solar: $('epcSolar').value
    };
    const model = householdEstimate(modelState);
    result = {
      source: 'epc',
      sourceLabel: 'Official EPC-informed estimate',
      sourceGrade: 'C',
      confidence: 'Medium confidence',
      e: model.e,
      g: model.g,
      actual: false,
      modelState,
      property: selectedProperty,
      period: selectedProperty.lodgementDate,
      notes: [
        'Official EPC building information',
        'Household occupancy and lifestyle choices supplied in this browser',
        'Transparent local annual-kWh model'
      ]
    };
    renderResult();
    window.trackSafe?.('epc_estimate_created', {rating:selectedProperty.currentRating || 'unknown'});
  }

  function useActualFigures() {
    const e = +$('actualElectric').value;
    const g = +$('actualGas').value;
    const message = $('actualMessage');
    if (!e && !g) {
      message.className = 'lookup-message show error';
      message.textContent = 'Enter at least one annual kWh figure.';
      return;
    }
    const warnings = [];
    if (e && (e < 500 || e > 30000)) warnings.push('Electricity is outside the broad range used by this tool.');
    if (g && (g < 1000 || g > 60000)) warnings.push('Gas is outside the broad range used by this tool.');
    message.className = warnings.length ? 'lookup-message show notice' : 'lookup-message show success';
    message.textContent = warnings.length
      ? `${warnings.join(' ')} Check the bill label before saving.`
      : 'Annual figures accepted.';

    const quality = $('actualQuality').value;
    result = {
      source: 'actual',
      sourceLabel: quality === 'actual' ? 'Customer-supplied actual annual usage' : 'Customer-supplied annual usage',
      sourceGrade: 'A',
      confidence: quality === 'actual' ? 'Highest confidence' : 'High confidence',
      e, g,
      actual: quality === 'actual',
      modelState: null,
      property: selectedProperty,
      period: $('actualPeriodEnd').value,
      notes: [
        'Annual kWh entered by the household',
        quality === 'actual' ? 'Supplier figure based on actual readings' : quality === 'supplier-estimate' ? 'Supplier-estimated annual figure' : 'Reading quality not confirmed'
      ]
    };
    renderResult();
    window.trackSafe?.('actual_usage_used', {quality});
  }

  function annualiseMeterReadings() {
    const message = $('meterMessage');
    const startDate = new Date(`${$('meterStartDate').value}T00:00:00`);
    const endDate = new Date(`${$('meterEndDate').value}T00:00:00`);
    const days = Math.round((endDate - startDate) / 86400000);
    if (!Number.isFinite(days) || days < 7) {
      message.className = 'lookup-message show error';
      message.textContent = 'Use two valid dates at least seven days apart.';
      return;
    }

    const eStart = +$('electricStart').value;
    const eEnd = +$('electricEnd').value;
    const gStart = +$('gasStart').value;
    const gEnd = +$('gasEnd').value;
    const gasUnit = $('gasMeterUnit').value;
    const calorific = Math.min(43, Math.max(37.5, +$('calorificValue').value || 39.2));
    const annualised = annualiseReadings({
      days,
      electricityStart:eStart,
      electricityEnd:eEnd,
      gasStart:gStart,
      gasEnd:gEnd,
      gasUnit,
      calorificValue:calorific
    });
    const e = annualised.e, g = annualised.g;
    const notes = [`Annualised from ${days} days of household meter readings`];
    if (e) notes.push('Electricity readings treated as kWh');
    if (g) notes.push(gasUnit === 'kwh'
      ? 'Gas readings already supplied in kWh'
      : `Gas converted using ${calorific.toFixed(1)} MJ/m³ calorific value and the statutory volume correction factor`);
    if (!e && !g) {
      message.className = 'lookup-message show error';
      message.textContent = 'Enter a higher end reading for electricity, gas or both.';
      return;
    }

    const seasonalWarning = days < 180
      ? 'The period is under six months, so seasonal heating could materially distort the annual result.'
      : days < 300
        ? 'The period does not cover a full year, so some seasonal distortion remains.'
        : 'The period covers most of a year, which improves confidence.';

    message.className = 'lookup-message show notice';
    message.textContent = seasonalWarning;
    result = {
      source: 'meter',
      sourceLabel: 'Meter-reading annualisation',
      sourceGrade: 'B',
      confidence: days >= 300 ? 'High confidence' : 'Medium confidence',
      e, g,
      actual: false,
      modelState: null,
      property: selectedProperty,
      period: `${$('meterStartDate').value} to ${$('meterEndDate').value}`,
      notes: [...notes, seasonalWarning]
    };
    renderResult();
    window.trackSafe?.('meter_readings_annualised', {days});
  }

  function calculateHouseholdEstimate() {
    const modelState = resultStateFromEstimate();
    const model = householdEstimate(modelState);
    result = {
      source: 'estimate',
      sourceLabel: 'Transparent household estimate',
      sourceGrade: 'D',
      confidence: 'Indicative',
      e: model.e,
      g: model.g,
      actual: false,
      modelState,
      property: selectedProperty,
      period: '',
      notes: [
        'Property and household details supplied in this browser',
        'Local planning model using broad annual-kWh baselines',
        'Actual annual kWh would improve confidence'
      ]
    };
    renderResult();
    window.trackSafe?.('household_estimate_created');
  }

  function renderBenchmarkRow(name, value, benchmark) {
    const position = benchmarkPosition(value, benchmark);
    return `<div class="benchmark-row">
      <div class="benchmark-row-head"><strong>${name}</strong><span>${esc(position.label)}</span></div>
      <div class="benchmark-scale"><span></span><span></span><span></span>${value ? `<i style="left:${position.percent}%"></i>` : ''}</div>
      <div class="benchmark-values"><span>${benchmark.lower.toLocaleString('en-GB')}</span><b>Median ${benchmark.median.toLocaleString('en-GB')} kWh</b><span>${benchmark.upper.toLocaleString('en-GB')}</span></div>
    </div>`;
  }

  function renderPropertyModel(property) {
    if (!property) {
      $('propertyModelCard').hidden = true;
      return;
    }
    const modelledTotal = property.floorArea && property.energyIntensityCurrent
      ? Math.round(property.floorArea * property.energyIntensityCurrent)
      : null;
    $('propertyModelCard').hidden = false;
    $('propertyModelCard').innerHTML = `
      <div class="property-model-head"><span>OFFICIAL PROPERTY MODEL</span><b>EPC ${esc(property.currentRating || '?')}</b></div>
      <h3>${esc(property.address)}</h3>
      <div class="property-model-grid">
        <div><span>Floor area</span><strong>${property.floorArea ? `${Math.round(property.floorArea)} m²` : 'Not supplied'}</strong></div>
        <div><span>Energy intensity</span><strong>${property.energyIntensityCurrent ? `${Math.round(property.energyIntensityCurrent)} kWh/m²/year` : 'Not supplied'}</strong></div>
        <div><span>Whole-property model</span><strong>${modelledTotal ? `${modelledTotal.toLocaleString('en-GB')} kWh/year` : 'Not available'}</strong></div>
        <div><span>Main heating</span><strong>${esc(property.mainHeating || 'Not supplied')}</strong></div>
      </div>
      <p>The EPC whole-property figure is not split into actual electricity and gas consumption. It uses standard occupancy assumptions.</p>`;
  }

  function renderResult() {
    if (!result) return;
    const region = BENCHMARKS[$('benchmarkRegion').value] || BENCHMARKS['england-wales'];
    $('passportEmpty').hidden = true;
    $('passportOutput').hidden = false;
    $('resultSource').textContent = result.sourceLabel;
    $('resultConfidence').textContent = `${result.sourceGrade} · ${result.confidence}`;
    $('electricResult').textContent = result.e ? fmt(result.e) : 'Not supplied';
    $('gasResult').textContent = result.g ? fmt(result.g) : 'Not supplied';
    $('benchmarkComparison').innerHTML = `
      <div class="benchmark-title"><div><span>PUBLIC BENCHMARK</span><h3>${esc(region.label)} domestic consumption, ${region.year}</h3></div><small>National group statistics</small></div>
      ${renderBenchmarkRow('Electricity', result.e, region.electricity)}
      ${renderBenchmarkRow('Gas', result.g, region.gas)}
      <p>Quartiles and medians are a context check—not a target, quotation or diagnosis.</p>`;
    renderPropertyModel(result.property);
    $('provenanceList').innerHTML = result.notes.map(note => `<div><span>✓</span><p>${esc(note)}</p></div>`).join('');
    const sourceGuidance = {
      actual: '<strong>Best next step:</strong> Keep the bill or supplier statement available for Paul. Check that the period and reading quality are clear.',
      meter: '<strong>Best next step:</strong> Compare the annualised result with a full-year bill before relying on it, especially when the period is shorter than a year.',
      epc: '<strong>Best next step:</strong> Find actual annual kWh on a bill. The EPC improves the property picture but cannot reveal how this household actually uses energy.',
      estimate: '<strong>Best next step:</strong> Replace the estimate with annual kWh from a bill or supplier when available.'
    };
    $('passportGuidance').innerHTML = sourceGuidance[result.source] || '';
    $('passportResults').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
    window.__sewpEnergyReport = {current:result, comparison:scenario, benchmark:region};
  }

  $('benchmarkRegion').addEventListener('change', () => {
    if (result) renderResult();
  });

  function scenarioBaseState() {
    if (result?.modelState) return result.modelState;
    return {
      property: result?.property ? propertyTypeCode(result.property) : 'semi',
      bedrooms: result?.property ? bedroomsFromFloorArea(result.property.floorArea) : 3,
      occupants: +$('epcOccupants').value || 3,
      heating: result?.property ? heatingCode(result.property.mainHeating) : 'gas',
      efficiency: result?.property ? efficiencyCode(result.property.currentRating) : 'average',
      daytime: $('epcDaytime').value || 'mixed',
      ev: $('epcEv').value || 'no',
      solar: $('epcSolar').value || 'no'
    };
  }

  function modelScenario() {
    if (!result) {
      window.showToast?.('Create the current energy picture first');
      return;
    }
    const baseState = scenarioBaseState();
    const currentModel = householdEstimate(baseState);
    const nextState = {
      ...baseState,
      heating: $('scenarioHeating').value === 'same' ? baseState.heating : $('scenarioHeating').value,
      occupants: $('scenarioOccupants').value === 'same' ? baseState.occupants : +$('scenarioOccupants').value,
      daytime: $('scenarioDaytime').value === 'same' ? baseState.daytime : $('scenarioDaytime').value,
      ev: $('scenarioEv').value === 'same' ? baseState.ev : $('scenarioEv').value,
      solar: $('scenarioSolar').value === 'same' ? baseState.solar : $('scenarioSolar').value,
      efficiency: $('scenarioEfficiency').value === 'same' ? baseState.efficiency : $('scenarioEfficiency').value
    };
    const futureModel = householdEstimate(nextState);
    const anchored = ['actual','meter'].includes(result.source);
    const e = anchored ? Math.max(0, result.e + (futureModel.e - currentModel.e)) : futureModel.e;
    const g = anchored ? (nextState.heating === 'gas' ? Math.max(0, result.g + (futureModel.g - currentModel.g)) : 0) : futureModel.g;
    scenario = {
      name: $('scenarioName').value.trim() || 'Future household',
      e, g,
      currentE: result.e,
      currentG: result.g,
      anchored,
      state: nextState,
      savedAt: new Date().toISOString()
    };
    const delta = value => `${value > 0 ? '+' : ''}${Math.round(value).toLocaleString('en-GB')} kWh`;
    $('scenarioResults').hidden = false;
    $('scenarioResults').innerHTML = `
      <div class="scenario-head"><div><span>MODELLED SCENARIO</span><h3>${esc(scenario.name)}</h3></div><span class="scenario-confidence">${anchored ? 'Actual/readings anchored' : 'Modelled comparison'}</span></div>
      <div class="scenario-deltas">
        <article><span>Electricity difference</span><strong>${delta(e-result.e)}</strong><small>Annual modelled change</small></article>
        <article><span>Gas difference</span><strong>${delta(g-result.g)}</strong><small>Annual modelled change</small></article>
      </div>
      <p>${anchored ? 'The current household figure is adjusted by the difference between two transparent models.' : 'Both current and future figures use the same household model.'}</p>`;
    window.__sewpEnergyReport = {current:result, comparison:scenario, benchmark:BENCHMARKS[$('benchmarkRegion').value]};
    window.trackSafe?.('energy_scenario_modelled', {anchored});
  }

  function resetScenario() {
    $('scenarioName').value = 'Future household';
    ['scenarioHeating','scenarioOccupants','scenarioDaytime','scenarioEv','scenarioSolar','scenarioEfficiency'].forEach(id => $(id).value = 'same');
    $('scenarioResults').hidden = true;
    scenario = null;
  }

  function planFromResult() {
    if (!result) return null;
    const base = scenarioBaseState();
    return {
      version: '6.1',
      propertyType: base.property,
      bedrooms: String(base.bedrooms),
      occupants: String(base.occupants),
      heating: base.heating,
      efficiency: base.efficiency,
      daytime: base.daytime,
      ev: base.ev,
      solar: base.solar,
      energyMode: result.source === 'actual' ? 'actual' : result.source === 'meter' ? 'annualised' : result.source === 'epc' ? 'epc' : 'estimate',
      actualElectric: result.e ? String(Math.round(result.e)) : '',
      actualGas: result.g ? String(Math.round(result.g)) : ''
    };
  }

  function savePassport() {
    if (!result) {
      window.showToast?.('Create an energy result first');
      return;
    }
    let plan = {};
    try {
      plan = JSON.parse(localStorage.getItem('saveEarnPaulV6Plan'))
        || JSON.parse(localStorage.getItem('saveEarnPaulV5Plan'))
        || {};
    } catch (_) {}
    const energyPlan = planFromResult();
    Object.assign(plan, energyPlan);
    plan.meta = {
      ...(plan.meta || {}),
      updatedAt: new Date().toISOString(),
      energyInsight: {
        source: result.source,
        sourceLabel: result.sourceLabel,
        sourceGrade: result.sourceGrade,
        confidence: result.confidence,
        period: result.period || '',
        actual: result.actual,
        property: result.property || null,
        benchmarkRegion: $('benchmarkRegion').value,
        benchmarkYear: 2024,
        notes: result.notes,
        savedAt: new Date().toISOString()
      },
      scenarioComparison: scenario || plan.meta?.scenarioComparison || null
    };
    localStorage.setItem('saveEarnPaulV6Plan', JSON.stringify(plan));
    localStorage.setItem('saveEarnPaulV6EnergySnapshot', JSON.stringify({
      current: result,
      comparison: scenario,
      benchmark: BENCHMARKS[$('benchmarkRegion').value]
    }));
    window.showToast?.('Energy Data Passport saved to My household');
    window.trackSafe?.('energy_passport_saved', {source:result.source});
  }

  async function sharePassport() {
    if (!result) {
      window.showToast?.('Create an energy result first');
      return;
    }
    const text = `${result.sourceLabel}: ${result.e ? fmt(result.e) + ' electricity' : 'electricity not supplied'}${result.g ? ` and ${fmt(result.g)} gas` : ''}. ${result.confidence}.`;
    try {
      if (navigator.share) await navigator.share({title:'My Energy Data Passport', text, url:location.href});
      else {
        await navigator.clipboard.writeText(`${text} ${location.href}`);
        window.showToast?.('Energy summary copied');
      }
    } catch (_) {}
  }

  function printPassport() {
    if (!result) {
      window.showToast?.('Create an energy result first');
      return;
    }
    savePassport();
    location.href = '/report-studio?type=energy';
  }

  $('searchEpc').addEventListener('click', searchProperty);
  $('useDemoProperty').addEventListener('click', () => {
    renderPropertyResults([demoProperty()]);
    $('epcMessage').className = 'lookup-message show notice';
    $('epcMessage').textContent = 'Demonstration data loaded. This is not a real household record.';
  });
  $('calculateEpcEstimate').addEventListener('click', calculateEpcEstimate);
  $('useActual').addEventListener('click', useActualFigures);
  $('annualiseMeters').addEventListener('click', annualiseMeterReadings);
  $('calculateEstimate').addEventListener('click', calculateHouseholdEstimate);
  $('modelScenario').addEventListener('click', modelScenario);
  $('resetScenario').addEventListener('click', resetScenario);
  $('saveEnergyPassport').addEventListener('click', savePassport);
  $('shareEnergy').addEventListener('click', sharePassport);
  $('printEnergy').addEventListener('click', printPassport);

  // Restore enough context to make repeat visits useful without making a network request.
  try {
    const plan = JSON.parse(localStorage.getItem('saveEarnPaulV6Plan')) || JSON.parse(localStorage.getItem('saveEarnPaulV5Plan'));
    if (plan) {
      if (plan.propertyType) $('calcProperty').value = plan.propertyType;
      if (plan.bedrooms) $('calcBedrooms').value = plan.bedrooms;
      if (plan.occupants) {
        $('calcOccupants').value = plan.occupants;
        $('epcOccupants').value = plan.occupants;
      }
      if (plan.heating) $('calcHeating').value = plan.heating;
      if (plan.efficiency) $('calcEfficiency').value = plan.efficiency;
      if (plan.daytime) {
        $('calcDaytime').value = plan.daytime;
        $('epcDaytime').value = plan.daytime;
      }
      if (plan.ev) {
        $('calcEv').value = plan.ev;
        $('epcEv').value = plan.ev;
      }
      if (plan.solar) {
        $('calcSolar').value = plan.solar;
        $('epcSolar').value = plan.solar;
      }
      if (plan.actualElectric) $('actualElectric').value = plan.actualElectric;
      if (plan.actualGas) $('actualGas').value = plan.actualGas;
    }
  } catch (_) {}

  setSource('epc');
  checkEpcStatus();
})();
