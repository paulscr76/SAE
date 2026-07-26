
(() => {
  // Anonymous interaction labels only. Never include household answers, bill figures or personal information.
  window.trackSafe = (name, data = {}) => {
    try {
      if (typeof window.va === 'function') window.va('event', {name, data});
    } catch (_) {}
  };
  document.addEventListener('click', event => {
    const el = event.target.closest('[data-track]');
    if(el) window.trackSafe(el.dataset.track);
  });
})();
