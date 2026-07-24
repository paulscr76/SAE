
(() => {
  const input=document.getElementById('billFile'),preview=document.getElementById('filePreview');
  let url;
  input.addEventListener('change',()=>{
    if(url)URL.revokeObjectURL(url);preview.innerHTML='';preview.classList.remove('show');
    const file=input.files[0];if(!file)return;url=URL.createObjectURL(file);
    if(file.type==='application/pdf')preview.innerHTML=`<iframe src="${url}" title="Local PDF preview"></iframe>`;
    else preview.innerHTML=`<img src="${url}" alt="Local bill preview">`;
    preview.classList.add('show');window.trackSafe?.('bill_preview_opened',{type:file.type==='application/pdf'?'pdf':'image'});
  });
  document.getElementById('saveBill').addEventListener('click',()=>{
    const e=+document.getElementById('billElectric').value,g=+document.getElementById('billGas').value;
    const msg=document.getElementById('billMessage');
    if(!e&&!g){msg.hidden=false;msg.textContent='Enter at least one annual kWh figure first.';return;}
    let state={};try{state=JSON.parse(localStorage.getItem('saveEarnPaulV3Plan'))||{};}catch(_){}
    state.energyMode='actual';if(e)state.actualElectric=String(e);if(g)state.actualGas=String(g);
    localStorage.setItem('saveEarnPaulV3Plan',JSON.stringify(state));
    localStorage.setItem('saveEarnPaulV3BillMeta',JSON.stringify({
      electricRate:document.getElementById('electricRate').value,
      gasRate:document.getElementById('gasRate').value,
      standingCharge:document.getElementById('standingCharge').value,
      contractEnd:document.getElementById('contractEnd').value
    }));
    msg.hidden=false;msg.innerHTML='<strong>Saved on this device.</strong> The annual kWh figures will appear in the Command Centre.';
    window.trackSafe?.('bill_figures_saved');
  });
  window.addEventListener('beforeunload',()=>{if(url)URL.revokeObjectURL(url)});
})();
