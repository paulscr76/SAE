(() => {
  // No form answers, energy figures, names or contact details are tracked.
  // This only queues anonymous interaction labels if Vercel Web Analytics is later enabled.
  window.trackSafe = (name, data = {}) => {
    try {
      if (typeof window.va === 'function') window.va('event', {name, data});
    } catch (_) {}
  };

  document.addEventListener('click', event => {
    const target = event.target.closest('[data-track]');
    if (!target) return;
    window.trackSafe(target.dataset.track);
  });
})();