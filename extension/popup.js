// Verifact extension — popup controller (Track C).
// Anonymous by default. "Log in" captures the website's Supabase token (Mode A)
// and every subsequent /api/v1/verify call sends it as `Authorization: Bearer`.

(function () {
  const $ = (id) => document.getElementById(id);
  const els = {
    mode: $('mode'),
    authLabel: $('auth-label'),
    login: $('login'),
    logout: $('logout'),
    text: $('text'),
    textHelp: $('text-help'),
    inputType: $('inputType'),
    language: $('language'),
    isPublic: $('isPublic'),
    verify: $('verify'),
    status: $('status'),
    result: $('result'),
    usage: $('usage'),
  };

  const VERDICT = {
    true: { label: 'True', dot: 'dot-true' },
    false: { label: 'False', dot: 'dot-false' },
    partial: { label: 'Partially true', dot: 'dot-partial' },
    unclear: { label: 'Unclear', dot: 'dot-unclear' },
  };

  // --- auth state ----------------------------------------------------------

  function renderAuth(auth) {
    if (auth?.accessToken) {
      els.mode.textContent = 'Signed in';
      els.mode.className = 'badge badge-auth';
      const who = auth.user?.email || auth.user?.id || 'user';
      els.authLabel.textContent = 'Bearer active · ' + who;
      els.login.classList.add('hidden');
      els.logout.classList.remove('hidden');
    } else {
      els.mode.textContent = 'Anonymous';
      els.mode.className = 'badge badge-anon';
      els.authLabel.textContent = 'Not signed in — 3 free checks / 30 days';
      els.login.classList.remove('hidden');
      els.logout.classList.add('hidden');
    }
    if (auth?.error) setStatus(auth.error, 'err');
  }

  function setStatus(msg, kind) {
    els.status.textContent = msg || '';
    els.status.className = 'status' + (kind ? ' ' + kind : '');
  }

  // --- result rendering ----------------------------------------------------

  function renderUsage(usage) {
    if (!usage) { els.usage.textContent = ''; return; }
    const tier = (usage.tier || 'free').toUpperCase();
    if (usage.remaining == null) {
      els.usage.textContent = `Tier: ${tier} · anonymous (no remaining count)`;
    } else {
      const reset = usage.resetsAt ? new Date(usage.resetsAt).toLocaleDateString() : '—';
      els.usage.textContent = `Tier: ${tier} · ${usage.remaining} remaining · resets ${reset}`;
    }
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Only http(s) URLs may become href; rejects javascript:, data:, etc. (XSS).
  function safeUrl(u) {
    if (!u || typeof u !== 'string') return null;
    let p;
    try { p = new URL(u); } catch { return null; }
    return (p.protocol === 'http:' || p.protocol === 'https:') ? u : null;
  }

  function renderResult(res) {
    els.result.classList.remove('hidden');
    const { status, data } = res || {};

    if (!data || data.success === false) {
      const code = data?.code || (status ? 'HTTP_' + status : 'ERROR');
      const msg = data?.error || 'Verification failed.';
      els.result.innerHTML =
        `<div class="verdict"><span class="dot dot-false"></span>Error ${escapeHtml(code)}</div>` +
        `<p class="summary">${escapeHtml(msg)}</p>`;
      renderUsage(null);
      return;
    }

    const r = data.report || {};
    const v = VERDICT[r.verdict] || VERDICT.unclear;
    const score = typeof r.score === 'number' ? r.score : '—';
    const conf = r.confidenceLevel ? r.confidenceLevel.toUpperCase() : '—';

    let html = `<div class="verdict"><span class="dot ${v.dot}"></span>${escapeHtml(v.label)}</div>`;
    html += `<div class="score">Credibility score <b>${score}/100</b> · confidence <b>${escapeHtml(conf)}</b></div>`;
    html += `<div class="summary">${escapeHtml(r.executiveSummary || '')}</div>`;

    if (Array.isArray(r.keyTakeaways) && r.keyTakeaways.length) {
      html += '<ul class="takeaways">';
      r.keyTakeaways.forEach((t) => { html += `<li>${escapeHtml(t)}</li>`; });
      html += '</ul>';
    }

    if (Array.isArray(r.sources) && r.sources.length) {
      html += '<div class="sources"><h4>Sources</h4>';
      r.sources.forEach((s) => {
        const safe = safeUrl(s.url);
        const stance = s.supports === true ? ' ✅ supports' : s.supports === false ? ' ❌ denies' : '';
        const open = safe
          ? `<a class="source" href="${escapeHtml(safe)}" target="_blank" rel="noopener">`
          : `<div class="source">`;
        const close = safe ? `</a>` : `</div>`;
        html += open +
          `<div class="s-title">${escapeHtml(s.title || s.publisher || 'Source')}</div>` +
          `<div class="s-meta">${escapeHtml(s.publisher || '')}${stance}</div>` + close;
      });
      html += '</div>';
    }

    els.result.innerHTML = html;
    renderUsage(data.usage);
  }

  // --- actions -------------------------------------------------------------

  function doVerify() {
    const text = els.text.value.trim();
    const inputType = els.inputType.value;

    if (inputType !== 'url' && text.length < 10) {
      setStatus('Enter at least 10 characters to verify.', 'err');
      return;
    }
    if (inputType === 'url' && !/^https?:\/\//i.test(text)) {
      setStatus('Enter a valid http(s) URL.', 'err');
      return;
    }

    const payload = {
      text,
      inputType,
      language: els.language.value,
      isPublic: els.isPublic.checked,
    };

    els.verify.disabled = true;
    setStatus('Verifying…', 'busy');
    els.result.classList.add('hidden');

    chrome.runtime.sendMessage({ type: 'VERIFY', payload }, (res) => {
      els.verify.disabled = false;
      if (chrome.runtime.lastError) {
        setStatus(chrome.runtime.lastError.message || 'Extension error.', 'err');
        return;
      }
      renderResult(res);
      if (res?.data?.success) setStatus('Done.', 'ok');
      else setStatus(res?.data?.error || 'Request failed.', 'err');
    });
  }

  function doLogin() {
    setStatus('Open the website and log in. The token is captured automatically.', 'busy');
    chrome.runtime.sendMessage({ type: 'LOGIN' });
  }

  function doLogout() {
    setStatus('Logging out…', 'busy');
    chrome.runtime.sendMessage({ type: 'LOGOUT' }, () => renderAuth(null));
  }

  // --- wiring --------------------------------------------------------------

  els.verify.addEventListener('click', doVerify);
  els.login.addEventListener('click', doLogin);
  els.logout.addEventListener('click', doLogout);

  els.inputType.addEventListener('change', () => {
    const isUrl = els.inputType.value === 'url';
    els.textHelp.textContent = isUrl ? 'Paste the article URL.' : '10–2000 characters.';
    els.text.placeholder = isUrl ? 'https://…' : 'Paste the claim, text, or article URL…';
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'AUTH_STATE_CHANGED') renderAuth(msg.auth);
  });

  // Initial auth state.
  chrome.runtime.sendMessage({ type: 'GET_AUTH' }, (auth) => renderAuth(auth || null));
})();
