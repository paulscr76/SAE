
(() => {
  const PLAN_KEY='saveEarnPaulV4Plan',OS_KEY='saveEarnPaulV4OS';
  const card=document.getElementById('resumeCard');
  if(!card)return;
  let plan=null,os=null;
  try{plan=JSON.parse(localStorage.getItem(PLAN_KEY));os=JSON.parse(localStorage.getItem(OS_KEY));}catch(_){}
  if(plan){
    const priority={save:'reducing household costs',understand:'understanding the household',earn:'exploring flexible earning',both:'saving and earning'}[plan.priority]||'building a household plan';
    const tasks=os?.tasks||[];
    const open=tasks.filter(t=>t.status!=='done').length;
    document.getElementById('resumeTitle').textContent='Welcome back — your household plan is ready.';
    document.getElementById('resumeCopy').textContent=`Priority: ${priority}. ${open ? open+' open action'+(open===1?'':'s')+'.' : 'Open the Household OS to continue.'}`;
    card.classList.add('show');
  }
})();
