(() => {
  const form = document.getElementById('reviewForm');
  if (!form) return;
  const steps = [...document.querySelectorAll('.review-step')];
  const back = document.getElementById('reviewBack');
  const next = document.getElementById('reviewNext');
  const reset = document.getElementById('reviewReset');
  const bar = document.getElementById('reviewProgressBar');
  const text = document.getElementById('reviewProgressText');
  const error = document.getElementById('reviewError');
  const summary = document.getElementById('reviewSummary');
  let step = 0;

  const val = id => document.getElementById(id)?.value || '';
  const checked = name => form.querySelector(`[name="${name}"]:checked`)?.value || '';

  function showStep(n) {
    step = Math.max(0, Math.min(steps.length - 1, n));
    steps.forEach((s, i) => {
      s.classList.toggle('active', i === step);
      s.setAttribute('aria-hidden', String(i !== step));
    });
    const pct = ((step + 1) / steps.length) * 100;
    bar.style.width = pct + '%';
    text.textContent = `Step ${step + 1} of ${steps.length}`;
    back.style.visibility = step === 0 ? 'hidden' : 'visible';
    next.textContent = step === steps.length - 1 ? 'Start again' : (step === steps.length - 2 ? 'Build my summary' : 'Next');
    error.classList.remove('show');
    if (step === steps.length - 1) buildSummary();
    steps[step].querySelector('input,select,button')?.focus({preventScroll:true});
  }

  function validate() {
    if (step === 0 && !checked('priority')) {
      error.innerHTML = '<strong>Please choose:</strong><br>Select saving, earning, or both.';
      error.classList.add('show');
      error.focus();
      return false;
    }
    return true;
  }

  function sentenceList(items) {
    if (items.length === 1) return items[0];
    if (items.length === 2) return items.join(' and ');
    return items.slice(0, -1).join(', ') + ', and ' + items.at(-1);
  }

  function buildSummary() {
    const priority = checked('priority');
    const recommendations = [];
    const details = [];

    if (priority === 'save' || priority === 'both') {
      if (val('energyConcern') !== 'none') {
        recommendations.push('an energy usage review');
        if (val('energyStatement') === 'yes') details.push('Have your annual electricity and gas kWh available');
        else details.push('Use the energy calculator to create an indicative estimate');
      }
      if (['slow','unreliable','expensive'].includes(val('broadbandExperience')) || ['ending','out'].includes(val('broadbandContract'))) {
        recommendations.push('a broadband conversation');
        details.push('Check your current provider, speed and contract end date');
      }
      if (val('mobileLines') !== 'none' || val('mobileConcern') !== 'none') {
        recommendations.push('a mobile requirements review');
        details.push('Note how many mobiles are involved and the main coverage or cost concern');
      }
    }

    if ((priority === 'earn' || priority === 'both') && val('earningInterest') !== 'none') {
      recommendations.push('a factual conversation about flexible earning');
      details.push('Ask about the activity involved, realistic time commitment, training and costs');
    }

    if (!recommendations.length) {
      recommendations.push('a general no-obligation conversation');
      details.push('Use the chat to explain what matters most and decide whether any next step is useful');
    }

    const priorityLabel = {save:'Reducing household costs',earn:'Exploring extra income',both:'Saving and earning'}[priority] || 'General review';
    const recText = sentenceList(recommendations);
    const lines = details.map(item => `<li><span class="checkmark">✓</span><span>${item}</span></li>`).join('');
    const summaryText = `Priority: ${priorityLabel}. Suggested next step: ${recText}.`;

    summary.innerHTML = `
      <div class="summary-hero"><span>Your priority</span><strong>${priorityLabel}</strong></div>
      <div class="summary-recommendation"><span>Suggested next step</span><h3>${recText.charAt(0).toUpperCase() + recText.slice(1)}.</h3></div>
      <ul class="checklist">${lines}</ul>
      <div class="review-summary-actions no-print">
        <a class="btn btn-blue" href="https://calendly.com/save-with-paul/chat-with-paul" target="_blank" rel="noopener" data-track="booking_review_result">Book a free 30-minute chat</a>
        <button class="btn btn-yellow" type="button" id="sendReview">WhatsApp this summary</button>
        <a class="btn btn-light" href="/calculator">Energy calculator</a>
        <button class="btn btn-light" type="button" id="printReview">Print or save PDF</button>
      </div>`;

    document.getElementById('sendReview').addEventListener('click', () => {
      const message = `Hi Paul, I completed the household review. ${summaryText} Could we have a free, no-obligation chat?`;
      window.open(`https://wa.me/447925008477?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
      window.trackSafe?.('review_whatsapp');
    });
    document.getElementById('printReview').addEventListener('click', () => window.print());
    window.trackSafe?.('review_completed', {priority});
  }

  next.addEventListener('click', () => {
    if (step === steps.length - 1) {
      form.reset();
      showStep(0);
      return;
    }
    if (validate()) showStep(step + 1);
  });
  back.addEventListener('click', () => showStep(step - 1));
  reset.addEventListener('click', () => { form.reset(); summary.innerHTML = ''; showStep(0); });

  form.querySelectorAll('.option-card input').forEach(input => {
    input.addEventListener('change', () => {
      form.querySelectorAll('.option-card').forEach(card => card.classList.toggle('selected', card.querySelector('input').checked));
    });
  });

  showStep(0);
})();