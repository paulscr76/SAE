
(() => {
  const $=id=>document.getElementById(id);
  const baseE={1:1700,2:2150,3:2500,4:3200,5:3900,6:4600},baseG={1:6200,2:7800,3:9500,4:12200,5:15000,6:17800};
  const prop={flat:.78,terrace:.92,semi:1,detached:1.18,bungalow:1.08},eff={efficient:.82,average:1,inefficient:1.22},occ={low:.94,mixed:1,high:1.1};
  let calculated=false,last={e:0,g:0};
  const fmt=n=>Math.round(n).toLocaleString('en-GB')+' kWh';
  const actualFields=()=>document.querySelectorAll('.actual-only').forEach(el=>el.style.display=$('calcMode').value==='actual'?'block':'none');
  $('calcMode').addEventListener('change',actualFields);

  function estimate(){
    const b=+$('calcBedrooms').value,p=+$('calcOccupants').value;let e=baseE[b]||5200;e+=Math.max(0,p-b)*320;e*=prop[$('calcProperty').value]||1;e*=occ[$('calcDaytime').value]||1;
    if($('calcEv').value==='yes')e+=2200;if($('calcSolar').value==='yes')e*=.78;if($('calcHeating').value==='electric')e+=6500;if($('calcHeating').value==='heatpump')e+=2800;
    let g=0;if($('calcHeating').value==='gas'){g=(baseG[b]||20000)+Math.max(0,p-b)*400;g*=prop[$('calcProperty').value]||1;g*=eff[$('calcEfficiency').value]||1;g=Math.max(3000,g);}
    return{e:Math.max(1000,e),g};
  }
  function baseline(){
    const solar=$('calcSolar').value;$('calcSolar').value='no';const values=estimate();$('calcSolar').value=solar;return values;
  }
  function band(value,base,label,marker){
    if(!value||!base)return;const ratio=value/base;label.textContent=ratio<.8?'Lower than tool baseline':ratio<=1.2?'Within tool range':'Higher than tool baseline';marker.style.left=Math.max(3,Math.min(97,((ratio-.4)/1.4)*100))+'%';
  }
  function calculate(scroll=true){
    const est=estimate(),mode=$('calcMode').value;let e=est.e,g=est.g;
    if(mode==='actual'){const ae=+$('calcElectric').value,ag=+$('calcGas').value;if(!ae&&!ag){$('calcWarning').textContent='Enter at least one annual kWh figure, or choose an estimate.';$('calcWarning').classList.add('show');return false;}e=ae||e;g=$('calcHeating').value==='gas'?(ag||g):0;}
    $('calcWarning').classList.remove('show');last={e,g};$('electricResult').textContent=fmt(e);$('gasResult').textContent=g?fmt(g):'Not applicable';
    const base=baseline();band(e,base.e,$('electricBand'),$('electricMarker'));$('gasRangeRow').hidden=!g;if(g)band(g,base.g,$('gasBand'),$('gasMarker'));$('rangeCard').hidden=false;
    const data=[['Property',$('calcProperty').selectedOptions[0].text],['Bedrooms',$('calcBedrooms').value],['Occupants',$('calcOccupants').value],['Heating',$('calcHeating').selectedOptions[0].text],['EV',$('calcEv').value==='yes'?'Yes':'No'],['Solar',$('calcSolar').value==='yes'?'Yes':'No']];
    $('calcSummary').innerHTML=data.map(([k,v])=>`<div class="summary-item"><span>${k}</span><strong>${v}</strong></div>`).join('');
    $('calcNote').textContent=mode==='actual'?'Actual annual kWh has been used where supplied.':'Indicative estimate based on the household scenario. Actual annual kWh is more reliable.';
    calculated=true;if(scroll)$('calcResults').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});window.trackSafe?.('calculator_completed',{mode});return true;
  }
  $('calculateEnergy').onclick=()=>calculate();
  $('calculatorForm').addEventListener('change',()=>{if(calculated)calculate(false)});
  $('calculatorForm').addEventListener('input',()=>{if(calculated)calculate(false)});
  $('resetEnergy').onclick=()=>{$('calculatorForm').reset();actualFields();calculated=false;$('electricResult').textContent='—';$('gasResult').textContent='—';$('rangeCard').hidden=true;$('calcSummary').innerHTML='';$('calcNote').textContent='Complete the details and calculate. Actual annual kWh is more reliable than an estimate.';};
  $('saveToCommand').onclick=()=>{if(!calculate(false))return;let state={};try{state=JSON.parse(localStorage.getItem('saveEarnPaulV3Plan'))||{};}catch(_){};Object.assign(state,{propertyType:$('calcProperty').value,bedrooms:$('calcBedrooms').value,occupants:$('calcOccupants').value,heating:$('calcHeating').value,efficiency:$('calcEfficiency').value,daytime:$('calcDaytime').value,ev:$('calcEv').value,solar:$('calcSolar').value,energyMode:'actual',actualElectric:String(Math.round(last.e)),actualGas:String(Math.round(last.g))});localStorage.setItem('saveEarnPaulV3Plan',JSON.stringify(state));showToast('Energy result saved to Command Centre');window.trackSafe?.('calculator_saved');};
  $('shareEnergy').onclick=async()=>{if(!calculate(false))return;const text=`Indicative annual energy result: ${fmt(last.e)} electricity${last.g?' and '+fmt(last.g)+' gas':''}.`;try{if(navigator.share)await navigator.share({title:'Energy result',text,url:location.href});else{await navigator.clipboard.writeText(text+' '+location.href);showToast('Result copied');}}catch(_){}};
  $('printEnergy').onclick=()=>{if(calculate(false))window.print()};
  actualFields();
})();
