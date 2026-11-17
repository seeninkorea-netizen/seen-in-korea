// Shared public form sender. Saves via D1-backed server endpoints, never via mailto.
// Only a successful campaign application navigates to the confirmation page.
document.querySelectorAll<HTMLFormElement>('form[data-experience-endpoint]').forEach(form => {
  const result = form.querySelector<HTMLElement>('[data-result]');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const payload: Record<string, FormDataEntryValue | boolean> = Object.fromEntries(new FormData(form));
    for (const key of ['consent', 'policy', 'adult', 'eligibility', 'disclosure']) {
      const check = form.querySelector<HTMLInputElement>(`input[name="${key}"]`);
      if (check) payload[key] = check.checked;
    }
    if (result) {
      result.textContent = 'Submitting…';
      result.classList.remove('exp-success', 'exp-error');
    }
    if (submit) submit.disabled = true;
    try {
      const endpoint = form.dataset.experienceEndpoint || '';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Submission failed.');

      if (endpoint === '/api/experiences/apply') {
        // Store only public campaign details, never the creator's personal details.
        // The confirmed UI appears only after the API returns successful submission.
        // Session storage is not authentication or proof of selection.
        try {
          sessionStorage.setItem('sik_exp_last_application', JSON.stringify({
            submittedAt: Date.now(),
            campaignTitle: (document.querySelector('.exp-simple-detail-heading h1')?.textContent || '').trim().slice(0, 180),
            campaignUrl: window.location.pathname
          }));
        } catch {
          // If storage is blocked, the user still sees the successful inline message.
          if (result) {
            result.textContent = 'Your application was received. Selection is not guaranteed.';
            result.classList.add('exp-success');
          }
          form.reset();
          return;
        }
        window.location.assign('/experiences/application-complete');
        return;
      }

      if (result) {
        result.textContent = data.message || 'Your request was received.';
        result.classList.add('exp-success');
      }
      form.reset();
    } catch (e) {
      if (result) {
        result.textContent = e instanceof Error ? e.message : 'Unable to submit. Please retry.';
        result.classList.add('exp-error');
      }
    } finally {
      if (submit) submit.disabled = false;
    }
  });
});
