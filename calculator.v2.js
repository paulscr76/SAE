(() => {
  const $ = id => document.getElementById(id);
  const steps = [...document.querySelectorAll('.calc-step')];
  let step = 0;
  let hasCalculated = false;
  const baseElectric = {1:1700,2:2150,3:2500,4:3200,5:3900,6:4600};
  const baseGas = {1:6200,2:7800,3:9500,4:12200,5:15000,6:17800};
  const propertyFactor = {flat:.78,terrace:.92,semi:1,detached:1.18,bungalow:1.08};
  const efficiencyFactor = {efficient:.82,average:1,inefficient:1.22};
  const occupancyFactor = {low:.94,mixed:1,high:1.10};
  const labels = {
    propertyType:{flat:'Flat / apartment',terrace:'Terraced house',semi:'Semi-detached',detached:'Detached house',bungalow:'Bungalow'},
    heating:{gas:'Gas boiler',electric:'Electric heating',heatpump:'Heat pump',other:'Oil / other'},
    efficiency:{efficient:'Well insulated / newer',average:'Average / unknown',inefficient:'Older / draughty'},
    daytime:{low:'Usually empty',mixed:'Mixed',high:'Usually occupied'},
    ev:{no:'No EV',yes:'Electric vehicle'}, solar:{no:'No solar',yes:'Solar panels'}
  };
  const fmt = n => `${Math.round(n).toLocaleString('en-GB')} kWh`;
  const valueLabel = id => labels[id]?.[$(id).value] || $(id).value;

  function showStep(n, focusField = true) {
    step = Math.max(0, Math.min(steps.length-1, n));
    steps.forEach((s,i) => { s.classList.toggle('active', i===step); s.setAttribute('aria-hidden', String(i!==step)); });
    const pct = (step+1)/steps.length*100;
    $('progressBar').style.width = pct+'%'; $('progressBar').setAttribute('aria-valuenow', String(Math.round(pct)));
    $('progressText').textContent = `Step ${step+1} of ${steps.length}`;
    $('backBtn').style.visibility = step ? 'visible' : 'hidden';
    $('nextBtn').classList.toggle('hidden', step===steps.length-1);
    $('calculateBtn').classList.toggle('hidden', step!==steps.length-1);
    $('errorSummary').classList.remove('show');
    if (focusField) steps[step].querySelector('select,input')?.focus({preventScroll:true});
  }

  function validateStep() {
    const errors=[];
    if (step===2 && $('usageMode').value==='actual') {
      const e=+$('actualElectric').value, g=+$('actualGas').value;
      if (e<=0 && g<=0) errors.push('Enter at least one annual kWh figure, or choose “Estimate from the home”.');
    }
    if(errors.length){ $('errorSummary').innerHTML=`<strong>Please check:</strong><br>${errors.join('<br>')}`; $('errorSummary').classList.add('show'); $('errorSummary').focus(); return false; }
    return true;
  }

  $('nextBtn').addEventListener('click',()=>{ if(validateStep()) showStep(step+1); });
  $('backBtn').addEventListener('click',()=>showStep(step-1));
  $('usageMode').addEventListener('change',()=> $('actualFields').classList.toggle('hidden',$('usageMode').value!=='actual'));

  function baselineElectricity(){
    const beds=+$('bedrooms').value, people=+$('occupants').value;
    let v=baseElectric[beds]||5200; v+=Math.max(0,people-beds)*320;
    v*=propertyFactor[$('propertyType').value]||1; v*=occupancyFactor[$('daytime').value]||1;
    if($('ev').value==='yes')v+=2200;
    if($('heating').value==='electric')v+=6500;
    if($('heating').value==='heatpump')v+=2800;
    return Math.max(1000,v);
  }
  function estimateElectricity(){
    let v=baselineElectricity();
    if($('solar').value==='yes')v*=.78;
    return Math.max(1000,v);
  }
  function baselineGas(){
    if($('heating').value!=='gas')return 0;
    const beds=+$('bedrooms').value, people=+$('occupants').value;
    let v=baseGas[beds]||20000; v+=Math.max(0,people-beds)*400;
    v*=propertyFactor[$('propertyType').value]||1; v*=efficiencyFactor[$('efficiency').value]||1;
    return Math.max(3000,v);
  }
  function estimateGas(){ return baselineGas(); }

  function buildSummary(){
    const items=[['Property',valueLabel('propertyType')],['Bedrooms',$('bedrooms').value],['Occupants',$('occupants').value],['Heating',valueLabel('heating')],['Efficiency',valueLabel('efficiency')],['Daytime',valueLabel('daytime')],['EV',valueLabel('ev')],['Solar',valueLabel('solar')]];
    $('summaryList').innerHTML=items.map(([k,v])=>`<div class="summary-item"><span>${k}</span><strong>${v}</strong></div>`).join('');
  }

  function setBand(value, baseline, labelEl, markerEl) {
    if (!baseline || !value) return;
    const ratio=value/baseline;
    const label=ratio<.8?'Lower than the tool baseline':ratio<=1.2?'Within the tool’s typical range':'Higher than the tool baseline';
    labelEl.textContent=label;
    const position=Math.max(3,Math.min(97,((ratio-.4)/1.4)*100));
    markerEl.style.left=position+'%';
  }

  function calculate({scroll=true}={}) {
    if(!validateStep())return false;
    const ae=+$('actualElectric').value, ag=+$('actualGas').value, actual=$('usageMode').value==='actual', heat=$('heating').value;
    let electricity,gas,confidence,note;
    if(actual&&(ae>0||ag>0)){
      electricity=ae>0?ae:estimateElectricity(); gas=heat==='gas'?(ag>0?ag:estimateGas()):0;
      confidence=ae>0&&(heat!=='gas'||ag>0)?'High':'Medium';
      note='Actual annual kWh has been used where supplied. Any missing figure has been estimated from the household details.';
    } else {
      electricity=estimateElectricity(); gas=estimateGas(); confidence='Medium';
      note='This is an indicative estimate based on the household details supplied.';
    }

    $('electricResult').textContent=fmt(electricity); $('gasResult').textContent=gas>0?fmt(gas):'Not applicable';
    $('confidenceText').textContent=`Confidence: ${confidence}`; $('confidenceDot').className=`dot ${confidence==='High'?'high':''}`;
    $('explanation').textContent=note; buildSummary();

    const warnings=[];
    if(actual && ae>0 && (ae<500 || ae>30000)) warnings.push('The electricity figure is outside the usual range for many homes. Check that it is annual kWh rather than cost or a meter reading.');
    if(actual && ag>0 && (ag<1000 || ag>60000)) warnings.push('The gas figure is outside the usual range for many homes. Check that it is annual kWh rather than cost or a meter reading.');
    $('warning').textContent=warnings.join(' '); $('warning').classList.toggle('show',warnings.length>0);

    setBand(electricity, baselineElectricity(), $('electricBandLabel'), $('electricMarker'));
    $('gasComparisonRow').hidden=gas<=0;
    if(gas>0)setBand(gas, baselineGas(), $('gasBandLabel'), $('gasMarker'));
    $('usageComparison').hidden=false;
    $('liveBadge').hidden=false;

    $('results').dataset.e=Math.round(electricity); $('results').dataset.g=Math.round(gas); $('results').dataset.c=confidence;
    $('calculatedDate').textContent=new Intl.DateTimeFormat('en-GB',{dateStyle:'long'}).format(new Date());
    hasCalculated=true;
    if(scroll)$('results').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
    window.trackSafe?.('calculator_completed',{mode:actual?'actual':'estimate'});
    return true;
  }

  $('calculateBtn').addEventListener('click',()=>calculate());
  $('printBtn').addEventListener('click',()=>{if(calculate({scroll:false}))setTimeout(()=>window.print(),100)});
  $('resetBtn').addEventListener('click',()=>{
    $('calculatorForm').reset(); $('actualFields').classList.add('hidden'); $('electricResult').textContent='—'; $('gasResult').textContent='—';
    $('confidenceText').textContent='Confidence: awaiting calculation'; $('explanation').textContent='Complete the four steps, then calculate.';
    $('summaryList').innerHTML=''; $('warning').classList.remove('show'); $('usageComparison').hidden=true; $('liveBadge').hidden=true; hasCalculated=false; showStep(0);
  });

  $('calculatorForm').addEventListener('input',()=>{if(hasCalculated)calculate({scroll:false})});
  $('calculatorForm').addEventListener('change',()=>{if(hasCalculated)calculate({scroll:false})});

  $('whatsappBtn').addEventListener('click',()=>{
    if(!calculate({scroll:false}))return;
    const e=+$('results').dataset.e,g=+$('results').dataset.g,c=$('results').dataset.c;
    const msg=`Hi Paul, I used the Save & Earn calculator. My annual usage result is about ${e.toLocaleString('en-GB')} kWh electricity and ${g>0?g.toLocaleString('en-GB')+' kWh gas':'no gas estimate'}. Confidence: ${c}. Could we have a free chat?`;
    window.open(`https://wa.me/447925008477?text=${encodeURIComponent(msg)}`,'_blank','noopener');
    window.trackSafe?.('calculator_whatsapp');
  });

  $('shareBtn').addEventListener('click',async()=>{
    if(!calculate({scroll:false}))return;
    const e=+$('results').dataset.e,g=+$('results').dataset.g;
    const text=`My indicative annual energy usage: ${e.toLocaleString('en-GB')} kWh electricity${g>0?` and ${g.toLocaleString('en-GB')} kWh gas`:''}. Calculated at Save & Earn with Paul.`;
    try{
      if(navigator.share)await navigator.share({title:'Energy usage result',text,url:location.href});
      else{await navigator.clipboard.writeText(text+' '+location.href); alert('Result copied');}
      window.trackSafe?.('calculator_shared');
    }catch(e){}
  });

  showStep(0, false);
})();