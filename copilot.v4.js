
(() => {
  const PLAN_KEY='saveEarnPaulV4Plan',OS_KEY='saveEarnPaulV4OS';
  const read=k=>{try{return JSON.parse(localStorage.getItem(k))}catch(_){return null}};
  const plan=read(PLAN_KEY),os=read(OS_KEY)||{};
  const log=document.getElementById('chatLog'),form=document.getElementById('copilotForm'),input=document.getElementById('copilotInput');
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function add(text,type='bot'){
    const div=document.createElement('div');div.className='message '+type;div.innerHTML=escape(text).replace(/\n/g,'<br>')+(type==='bot'?'<small>Approved local guidance</small>':'');log.appendChild(div);log.scrollTop=log.scrollHeight;
  }
  function context(){
    const root=document.getElementById('copilotContext');
    if(!plan){root.innerHTML='<div><span>Household plan</span><strong>Not found</strong></div>';return;}
    const labels={save:'Household costs',understand:'Understanding',earn:'Flexible earning',both:'Save and earn'};
    root.innerHTML=`<div><span>Main priority</span><strong>${labels[plan.priority]||'Not set'}</strong></div><div><span>Property</span><strong>${plan.propertyType||'Not set'}, ${plan.bedrooms||'?'} bedrooms</strong></div><div><span>Energy basis</span><strong>${plan.energyMode==='actual'?'Annual kWh supplied':'Estimate'}</strong></div><div><span>Open tasks</span><strong>${(os.tasks||[]).filter(t=>t.status!=='done').length}</strong></div>`;
  }
  function answer(q){
    const x=q.toLowerCase();
    if(/annual|kwh|bill|meter reading/.test(x)) return 'Look for “annual consumption”, “estimated annual consumption” or “usage” in kWh. Electricity and gas normally appear separately. Do not use the bill cost, account balance, unit rate, standing charge or the number currently shown on the meter. The bill helper can display the document locally while you confirm the figures.';
    if(/broadband|speed|internet|wifi|gaming|work from home/.test(x)) return 'Prepare four facts: current provider, typical speed, where reliability struggles, and the contract end date. A household with home working, gaming or several simultaneous streams may value reliable capacity more than the cheapest headline price.';
    if(/\bev\b|electric vehicle|car charging/.test(x)) return 'An EV can add substantial annual electricity use. The scenario laboratory uses a broad planning adjustment, but the real effect depends on mileage, vehicle efficiency, charging location and tariff pattern. Treat the result as a range for discussion, not a bill prediction.';
    if(/solar|panels/.test(x)) return 'Solar can reduce electricity imported from the grid, but imported electricity is not the same as total household consumption. Generation, export, battery use, roof orientation and daytime demand all matter. Actual annual figures and generation records improve confidence.';
    if(/heat pump|heating|gas boiler|electric heating/.test(x)) return 'Heating type changes which fuel carries the household demand. Gas-heated homes often show much more gas kWh than electricity. Electric heating and heat pumps move more demand into electricity. The calculator is educational and not an engineering heat-loss assessment.';
    if(/earn|income|partner|opportunity|side/.test(x)) return 'A responsible first conversation should cover the activity involved, training, realistic time, any costs and how income is generated. Time availability alone cannot predict income. Income is not guaranteed and depends on personal activity and results.';
    if(/prepare|meeting|chat|paul|appointment/.test(x)){
      const tasks=(os.tasks||[]).filter(t=>t.status!=='done').slice(0,4).map(t=>t.title);
      return 'Before speaking to Paul, have annual energy kWh if available, broadband and mobile contract timing, and your main household priority. '+(tasks.length?'Your open plan items include: '+tasks.join('; ')+'.':'Open My Household to generate an action list.');
    }
    if(/privacy|data|stored|share|delete|account/.test(x)) return 'The public Version 4.0 platform stores the household plan in this browser. It does not create a secure cloud account or automatically send answers to Paul. Bill files are previewed locally and are not retained by the site. The Privacy & Consent Centre can export, selectively share or erase local data.';
    if(/my plan|summary|household/.test(x)&&plan){
      const labels={save:'reducing household costs',understand:'understanding the household',earn:'exploring flexible earning',both:'saving and earning'};
      return `Your saved priority is ${labels[plan.priority]||'not selected'}. The home is recorded as ${plan.propertyType||'not set'} with ${plan.bedrooms||'?'} bedrooms and ${plan.occupants||'?'} occupants. Energy is based on ${plan.energyMode==='actual'?'annual kWh':'an estimate'}. Open My Household for the living plan and sharing controls.`;
    }
    return 'I can help with annual kWh, reading bills, broadband preparation, mobile requirements, solar, EVs, heating, flexible earning, privacy and preparing for a conversation with Paul. Try asking one specific question.';
  }
  form.addEventListener('submit',e=>{e.preventDefault();const q=input.value.trim();if(!q)return;add(q,'user');input.value='';setTimeout(()=>add(answer(q)),120);});
  document.querySelectorAll('[data-prompt]').forEach(b=>b.onclick=()=>{input.value=b.dataset.prompt;form.requestSubmit();});
  document.getElementById('clearChat').onclick=()=>{log.innerHTML='';add('Chat cleared. What would you like to understand?');};
  context();add(plan?'I can use the household details saved on this device to make approved explanations more relevant. What would you like to understand?':'No household plan is saved yet, but I can still explain the tools and what information to prepare.');
})();
