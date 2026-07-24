
(() => {
  const search=document.getElementById('guideSearch'),articles=[...document.querySelectorAll('.guide-article')],empty=document.getElementById('guideEmpty');
  const filter=()=>{const q=search.value.trim().toLowerCase();let shown=0;articles.forEach(article=>{const match=!q||article.dataset.guide.includes(q)||article.textContent.toLowerCase().includes(q);article.hidden=!match;if(match)shown++;});empty.classList.toggle('show',shown===0);};
  search.addEventListener('input',filter);document.getElementById('clearGuideSearch').onclick=()=>{search.value='';filter();search.focus();};
  if(location.hash)document.querySelector(location.hash)?.setAttribute('open','');
})();
