(() => {
  const body = document.body;
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('primary-navigation');
  const scrim = document.querySelector('.nav-scrim');
  const setNav = open => {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('open', open);
    scrim?.classList.toggle('show', open);
    body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  };
  toggle?.addEventListener('click', () => setNav(toggle.getAttribute('aria-expanded') !== 'true'));
  scrim?.addEventListener('click', () => setNav(false));
  nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setNav(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setNav(false); });

  const path = location.pathname.replace(/\/$/, '') || '/';
  if (path === '/calculator') nav?.querySelector('a[href="/calculator"]')?.setAttribute('aria-current','page');
  if (path === '/review') nav?.querySelector('a[href="/review"]')?.setAttribute('aria-current','page');
  if (path === '/privacy') nav?.querySelector('a[href="/privacy"]')?.setAttribute('aria-current','page');

  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  } else document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));

  const result = document.getElementById('choice-result');
  document.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-choice]').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
    button.classList.add('active'); button.setAttribute('aria-pressed','true');
    const choice = button.dataset.choice;
    const copy = {
      save: 'You are interested in reviewing household services and possible savings.',
      earn: 'You are interested in understanding the flexible extra-income opportunity.',
      both: 'You would like to explore household savings and flexible earning together.'
    };
    if (result) { result.textContent = copy[choice]; result.classList.add('show'); result.dataset.choice = choice; }
  }));
  document.getElementById('choice-continue')?.addEventListener('click', () => {
    const choice = result?.dataset.choice || 'both';
    const text = { save:'saving on household services', earn:'the flexible earning opportunity', both:'saving and earning' }[choice];
    window.open(`https://wa.me/447925008477?text=${encodeURIComponent(`Hi Paul, I would like a free, no-obligation chat about ${text}.`)}`, '_blank', 'noopener');
  });

  document.querySelectorAll('.faq-q').forEach(button => button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!open));
    const answer = document.getElementById(button.getAttribute('aria-controls'));
    if (answer) answer.hidden = open;
  }));

  const toast = document.getElementById('toast');
  const showToast = text => { if (!toast) return; toast.textContent = text; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2200); };
  document.querySelectorAll('[data-share-site]').forEach(btn => btn.addEventListener('click', async () => {
    const data = { title:'Save & Earn with Paul', text:'Save more, earn extra, or explore both with Paul.', url:location.origin };
    try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(location.origin); showToast('Website address copied'); } } catch (e) { if (e.name !== 'AbortError') showToast('Unable to share right now'); }
  }));

  let installPrompt;
  const installButtons = document.querySelectorAll('[data-install-app]');
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; installButtons.forEach(b => b.hidden = false); });
  installButtons.forEach(button => button.addEventListener('click', async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; button.hidden = true; }));

  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
})();// Version 2.1 personalised starting journey
(() => {
  const buttons = [...document.querySelectorAll('[data-journey]')];
  const outcome = document.getElementById('journeyOutcome');
  if (!buttons.length || !outcome) return;
  const title = document.getElementById('journeyTitle');
  const copy = document.getElementById('journeyCopy');
  const actions = document.getElementById('journeyActions');
  const content = {
    save: {
      title: 'Start with the household review.',
      copy: 'It will help you identify whether energy, broadband or mobile deserves the first conversation.',
      actions: '<a class="btn btn-blue" href="/review">Start the review</a><a class="btn btn-light" href="/calculator">Energy calculator</a>'
    },
    earn: {
      title: 'Start with a factual earning conversation.',
      copy: 'There is no income promise. The useful first step is understanding the activity, training, time and costs.',
      actions: '<a class="btn btn-blue" href="https://calendly.com/save-with-paul/chat-with-paul" target="_blank" rel="noopener">Book a 30-minute chat</a><a class="btn btn-light" href="/review">Add it to my review</a>'
    },
    both: {
      title: 'Build the complete household picture.',
      copy: 'The household review combines services and earning interest, then creates one clear summary.',
      actions: '<a class="btn btn-blue" href="/review">Start the complete review</a><a class="btn btn-light" href="https://calendly.com/save-with-paul/chat-with-paul" target="_blank" rel="noopener">Book a chat</a>'
    }
  };
  buttons.forEach(button => button.addEventListener('click', () => {
    buttons.forEach(item => { item.classList.remove('active'); item.setAttribute('aria-pressed','false'); });
    button.classList.add('active'); button.setAttribute('aria-pressed','true');
    const item = content[button.dataset.journey];
    title.textContent = item.title; copy.textContent = item.copy; actions.innerHTML = item.actions;
    outcome.classList.add('active');
    window.trackSafe?.('journey_choice', {choice:button.dataset.journey});
  }));
})();