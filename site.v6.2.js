
(() => {
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav-links');
  const scrim = document.querySelector('.nav-scrim');
  const closeMenu = () => {
    nav?.classList.remove('open'); scrim?.classList.remove('show');
    navToggle?.setAttribute('aria-expanded','false'); document.body.classList.remove('menu-open');
  };
  if(navToggle && nav){
    navToggle.addEventListener('click',()=>{
      const open=nav.classList.toggle('open');
      scrim?.classList.toggle('show',open);navToggle.setAttribute('aria-expanded',String(open));
      document.body.classList.toggle('menu-open',open);
    });
    scrim?.addEventListener('click',closeMenu);
    nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
  }

  const path=location.pathname.replace(/\/$/,'')||'/';
  const routeMap={'/command-centre':'/command-centre','/bill-helper':'/bill-helper','/calculator':'/calculator','/guides':'/guides','/privacy':'/privacy'};
  const current=routeMap[path];
  if(current) nav?.querySelector(`a[href="${current}"]`)?.setAttribute('aria-current','page');

  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}
  }),{threshold:.12});
  document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

  let deferredPrompt;
  const installButtons=document.querySelectorAll('[data-install-app]');
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();deferredPrompt=event;installButtons.forEach(btn=>btn.hidden=false);
  });
  installButtons.forEach(btn=>btn.addEventListener('click',async()=>{
    if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;btn.hidden=true;
  }));

  const toast=document.getElementById('toast');
  window.showToast=(message)=>{
    if(!toast)return;toast.textContent=message;toast.classList.add('show');
    clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>toast.classList.remove('show'),2600);
  };

  document.querySelectorAll('[data-share-site]').forEach(btn=>btn.addEventListener('click',async()=>{
    try{
      if(navigator.share)await navigator.share({title:'Save & Earn with Paul',text:'Household reviews, energy tools and a free chat with Paul.',url:location.origin});
      else{await navigator.clipboard.writeText(location.origin);showToast('Website address copied');}
    }catch(_){}
  }));

  if('serviceWorker' in navigator && location.protocol.startsWith('http')){
    window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
  }
})();


// Local preferences and plan migration
(() => {
  const PREF_KEY = 'saveEarnPaulV6Preferences';
  const PLAN_KEY = 'saveEarnPaulV6Plan';
  const legacyKeys = ['saveEarnPaulV5Plan','saveEarnPaulV4Plan','saveEarnPaulV31Plan','saveEarnPaulV3Plan'];
  if (!localStorage.getItem(PREF_KEY)) {
    const previousPreferences = localStorage.getItem('saveEarnPaulV5Preferences');
    if (previousPreferences) localStorage.setItem(PREF_KEY, previousPreferences);
  }

  if (!localStorage.getItem(PLAN_KEY)) {
    for (const key of legacyKeys) {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          const plan = JSON.parse(value);
          plan.version = '6.2';
          localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
          break;
        } catch (_) {}
      }
    }
  }

  const getPrefs = () => {
    try { return JSON.parse(localStorage.getItem(PREF_KEY)) || {}; }
    catch (_) { return {}; }
  };
  const applyPrefs = () => {
    const prefs = getPrefs();
    document.documentElement.dataset.theme = prefs.theme || 'light';
    document.documentElement.dataset.textSize = prefs.textSize || 'standard';
    document.documentElement.classList.toggle('reduce-motion', Boolean(prefs.reduceMotion));
  };
  applyPrefs();

  window.savePreferences = (next) => {
    const prefs = {...getPrefs(), ...next};
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    applyPrefs();
    window.dispatchEvent(new CustomEvent('preferenceschange',{detail:prefs}));
    return prefs;
  };
  window.getPreferences = getPrefs;

  const route = location.pathname.replace(/\/$/,'') || '/';
  const routeLink = {
    '/household-os':'/household-os',
    '/command-centre':'/command-centre',
    '/copilot':'/copilot',
    '/bill-helper':'/bill-helper',
    '/calculator':'/calculator',
    '/consent-centre':'/consent-centre',
    '/guides':'/guides',
    '/privacy':'/consent-centre'
  }[route];
  if (routeLink) document.querySelector(`.nav-links a[href="${routeLink}"]`)?.setAttribute('aria-current','page');
})();

(() => {
  const sticky = document.querySelector('[data-sticky-cta]');
  if (!sticky) return;
  const hero = document.querySelector('.hero, .page-hero');
  const update = () => {
    const threshold = hero ? hero.getBoundingClientRect().bottom + window.scrollY - 80 : 260;
    sticky.classList.toggle('is-visible', window.scrollY > threshold);
  };
  update();
  addEventListener('scroll', update, {passive:true});
  addEventListener('resize', update);
})();
