(() => {
  const video=document.getElementById('paulHelpVideo');
  if(!video)return;
  const buttons=[...document.querySelectorAll('[data-video-time]')];
  const now=document.getElementById('videoNowPlaying');
  const title=document.getElementById('videoActionTitle');
  const copy=document.getElementById('videoActionCopy');
  const link=document.getElementById('videoActionLink');
  const chapters=[
    {time:0,label:'How can Paul help?',title:'See what could help your household',copy:'Complete the five-minute Household Check and receive one clear snapshot.',href:'/command-centre',cta:'Start my Household Check'},
    {time:12,label:'Making household bills simpler',title:'Bring the household picture together',copy:'Tell Paul which eligible services matter and what you already know.',href:'/command-centre',cta:'Check my household'},
    {time:36,label:'Personal, genuine help',title:'Talk it through with Paul',copy:'Book a free 30-minute conversation without pressure or obligation.',href:'https://calendly.com/save-with-paul/chat-with-paul',cta:'Book a free chat'},
    {time:49,label:'Exploring potential savings',title:'Strengthen the energy picture',copy:'Use annual kWh, meter readings, official property context or a transparent estimate.',href:'/calculator',cta:'Open Energy Data Passport'},
    {time:62,label:'Optional additional income',title:'Ask for the facts about earning',copy:'The Partner opportunity is optional. Income is not guaranteed.',href:'https://calendly.com/save-with-paul/chat-with-paul',cta:'Ask Paul about earning'},
    {time:75,label:'No pressure and no obligation',title:'Keep control of the next step',copy:'Nothing changes unless you decide to proceed.',href:'/command-centre',cta:'Build my snapshot'},
    {time:96,label:'Explore your next step',title:'Ready for a simple conversation?',copy:'Choose a time or send Paul a WhatsApp message.',href:'https://wa.me/447925008477',cta:'WhatsApp Paul'}
  ];
  function activeChapter(time){return [...chapters].reverse().find(ch=>time>=ch.time)||chapters[0]}
  function render(ch){
    now.querySelector('strong').textContent=ch.label;
    title.textContent=ch.title;copy.textContent=ch.copy;link.href=ch.href;link.textContent=ch.cta;
    const external=ch.href.startsWith('http');
    if(external){link.target='_blank';link.rel='noopener'}else{link.removeAttribute('target');link.removeAttribute('rel')}
    buttons.forEach(btn=>btn.classList.toggle('active',+btn.dataset.videoTime===ch.time));
  }
  buttons.forEach(btn=>btn.addEventListener('click',()=>{
    video.currentTime=+btn.dataset.videoTime;video.play().catch(()=>{});render(activeChapter(video.currentTime));
    window.trackSafe?.('video_chapter_selected',{chapter:btn.dataset.videoTitle,time:+btn.dataset.videoTime});
  }));
  video.addEventListener('timeupdate',()=>render(activeChapter(video.currentTime)));
  video.addEventListener('play',()=>window.trackSafe?.('video_played'));
  video.addEventListener('ended',()=>window.trackSafe?.('video_completed'));
  render(chapters[0]);
})();