(() => {
  const input = document.getElementById('billFile');
  const preview = document.getElementById('filePreview');
  const dropZone = document.getElementById('dropZone');
  const toolbar = document.getElementById('viewerToolbar');
  const zoom = document.getElementById('billZoom');
  const validation = document.getElementById('billValidation');
  let objectUrl = null, rotation = 0, scale = 1, stage = null;

  function applyTransform() {
    if (!stage) return;
    stage.style.transform = `rotate(${rotation}deg) scale(${scale})`;
    stage.style.transformOrigin = 'center center';
  }

  function resetView() { rotation = 0; scale = 1; zoom.value = '100'; applyTransform(); }
  function showFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') { window.showToast?.('Choose an image or PDF'); return; }
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    preview.innerHTML = '<div class="preview-stage"></div>';
    stage = preview.querySelector('.preview-stage');
    if (file.type === 'application/pdf') stage.innerHTML = `<iframe src="${objectUrl}" title="Local PDF preview"></iframe>`;
    else stage.innerHTML = `<img src="${objectUrl}" alt="Local bill preview">`;
    preview.classList.add('show'); toolbar.hidden = false; resetView();
    window.trackSafe?.('bill_preview_opened',{type:file.type === 'application/pdf' ? 'pdf' : 'image'});
  }

  input.addEventListener('change',()=>showFile(input.files[0]));
  ['dragenter','dragover'].forEach(name => dropZone.addEventListener(name,event => {event.preventDefault();dropZone.classList.add('dragging');}));
  ['dragleave','drop'].forEach(name => dropZone.addEventListener(name,event => {event.preventDefault();dropZone.classList.remove('dragging');}));
  dropZone.addEventListener('drop',event => showFile(event.dataTransfer.files[0]));
  dropZone.addEventListener('keydown',event => {if(event.key === 'Enter' || event.key === ' ') {event.preventDefault();input.click();}});
  document.getElementById('rotateLeft').onclick = () => {rotation -= 90;applyTransform();};
  document.getElementById('rotateRight').onclick = () => {rotation += 90;applyTransform();};
  zoom.addEventListener('input',()=>{scale=+zoom.value/100;applyTransform();});
  document.getElementById('resetViewer').onclick = resetView;

  function checkValue(value,type) {
    if (!value) return null;
    if (type === 'electric') {
      if (value < 100) return 'This looks more like a unit rate or small cost than annual electricity kWh.';
      if (value < 500) return 'This is unusually low for annual electricity usage. Confirm that it is annual kWh.';
      if (value > 30000) return 'This is unusually high for many homes. Check for a meter reading or combined multi-year figure.';
    }
    if (type === 'gas') {
      if (value < 100) return 'This looks more like a unit rate or cost than annual gas kWh.';
      if (value < 1000) return 'This is unusually low for annual gas usage. Confirm the property actually uses gas.';
      if (value > 60000) return 'This is unusually high for many homes. Check that it is one year of usage.';
    }
    return 'Plausible annual kWh range—please still confirm the label on the bill.';
  }

  function validateFigures() {
    const e = +document.getElementById('billElectric').value;
    const g = +document.getElementById('billGas').value;
    const messages = [];
    if (e) messages.push(`<div class="validation-row ${checkValue(e,'electric').startsWith('Plausible')?'ok':'warn'}"><strong>Electricity</strong><span>${checkValue(e,'electric')}</span></div>`);
    if (g) messages.push(`<div class="validation-row ${checkValue(g,'gas').startsWith('Plausible')?'ok':'warn'}"><strong>Gas</strong><span>${checkValue(g,'gas')}</span></div>`);
    validation.innerHTML = messages.join('');
  }
  ['billElectric','billGas'].forEach(id=>document.getElementById(id).addEventListener('input',validateFigures));

  document.getElementById('saveBill').addEventListener('click',()=>{
    const e=+document.getElementById('billElectric').value,g=+document.getElementById('billGas').value;
    const msg=document.getElementById('billMessage');
    if(!e&&!g){msg.hidden=false;msg.textContent='Enter at least one annual kWh figure first.';return;}
    const warnings=[e&&checkValue(e,'electric'),g&&checkValue(g,'gas')].filter(Boolean).filter(m=>!m.startsWith('Plausible'));
    if(warnings.length && !confirm('One or more figures look unusual. Save them anyway after checking the bill label?')) return;
    let state={};try{state=JSON.parse(localStorage.getItem('saveEarnPaulV5Plan'))||JSON.parse(localStorage.getItem('saveEarnPaulV31Plan'))||JSON.parse(localStorage.getItem('saveEarnPaulV3Plan'))||{};}catch(_){}
    state.version='3.1';state.meta={...(state.meta||{}),updatedAt:new Date().toISOString()};state.energyMode='actual';if(e)state.actualElectric=String(e);if(g)state.actualGas=String(g);
    localStorage.setItem('saveEarnPaulV5Plan',JSON.stringify(state));
    localStorage.setItem('saveEarnPaulV3BillMeta',JSON.stringify({electricRate:document.getElementById('electricRate').value,gasRate:document.getElementById('gasRate').value,standingCharge:document.getElementById('standingCharge').value,contractEnd:document.getElementById('contractEnd').value}));
    msg.hidden=false;msg.innerHTML='<strong>Saved on this device.</strong> The confirmed annual kWh figures will appear in the Command Centre.';
    window.trackSafe?.('bill_figures_saved');
  });
  window.addEventListener('beforeunload',()=>{if(objectUrl)URL.revokeObjectURL(objectUrl);});
})();
