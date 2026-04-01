'use strict';

// Login flow: email + barCode -> OTP -> trust
let loginState = {
  step: 'credentials', // 'credentials' | 'otp' | 'trust'
  email: '',
  barCode: '',
  otp: ['', '', '', '', '', ''],
  token: null,
  barName: '',
  loading: false,
  error: ''
};

function initLogin() {
  loginState = {
    step: 'credentials',
    email: '',
    barCode: '',
    otp: ['', '', '', '', '', ''],
    token: null,
    barName: '',
    loading: false,
    error: ''
  };
  renderLogin();
}

function renderLogin() {
  const container = document.getElementById('screen-login');
  if (!container) return;

  if (loginState.step === 'credentials') {
    renderCredentials(container);
  } else if (loginState.step === 'otp') {
    renderOtp(container);
  } else if (loginState.step === 'trust') {
    renderTrust(container);
  }
}

function renderCredentials(container) {
  container.innerHTML = `
    <div class="auth-page">
      <div class="auth-orbs">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
      </div>
      <div class="auth-card pop-in">
        <div class="auth-logo-block">
          <span class="logo-text"><span class="logo-tap">Tap</span><span class="logo-trivia">Trivia</span></span>
          <div class="auth-subtitle">LOCATION DASHBOARD</div>
        </div>
        <div class="auth-form-card">
          <h2 class="auth-title">Welcome back</h2>
          <p class="auth-desc">Sign in with your email and location code</p>
          <div class="field-group">
            <label class="field-label">EMAIL ADDRESS</label>
            <input class="field-input" type="email" id="login-email" placeholder="you@example.com" value="${loginState.email}">
          </div>
          <div class="field-group">
            <label class="field-label">LOCATION CODE</label>
            <input class="field-input" type="text" id="login-barcode" placeholder="e.g., BR7X4" maxlength="6" value="${loginState.barCode}" style="text-transform:uppercase;letter-spacing:4px;font-family:'Fredoka',sans-serif;font-size:20px;text-align:center">
            <div class="field-hint">The code from your TV — shown when you first registered</div>
          </div>
          ${loginState.error ? `<div class="auth-error">${loginState.error}</div>` : ''}
          <button class="btn-primary btn-full" id="btn-send-otp" ${loginState.loading ? 'disabled' : ''}>
            ${loginState.loading ? 'Sending...' : 'Send One-Time Passcode'}
          </button>
        </div>
        <p class="auth-footer">Don't have a location code? <a href="https://tv.taptrivia.tv" class="link-blue">Register on your TV app</a></p>
      </div>
    </div>
  `;

  document.getElementById('btn-send-otp').addEventListener('click', handleSendOtp);
  document.getElementById('login-email').addEventListener('input', e => { loginState.email = e.target.value; });
  document.getElementById('login-barcode').addEventListener('input', e => { loginState.barCode = e.target.value.toUpperCase(); });
  // Enter key submits
  container.querySelectorAll('.field-input').forEach(el => {
    el.addEventListener('keydown', e => { if (e.key === 'Enter') handleSendOtp(); });
  });
}

async function handleSendOtp() {
  const email = loginState.email.trim();
  const barCode = loginState.barCode.trim().toUpperCase();

  if (!email || !barCode) {
    loginState.error = 'Please enter your email and location code';
    renderLogin();
    return;
  }

  loginState.loading = true;
  loginState.error = '';
  renderLogin();

  try {
    await apiCall('POST', '/dashboard/auth/otp', { email, barCode });
    loginState.step = 'otp';
    loginState.otp = ['', '', '', '', '', ''];
    loginState.loading = false;
    renderLogin();
    // Focus first OTP input
    setTimeout(() => {
      const first = document.querySelector('.otp-input');
      if (first) first.focus();
    }, 100);
  } catch (err) {
    loginState.error = err.message || 'Something went wrong';
    loginState.loading = false;
    renderLogin();
  }
}

function renderOtp(container) {
  const maskedEmail = loginState.email.replace(/^(.{2}).*(@.*)$/, '$1***$2');
  container.innerHTML = `
    <div class="auth-page">
      <div class="auth-orbs">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
      </div>
      <div class="auth-card pop-in">
        <div class="auth-logo-block">
          <span class="logo-text"><span class="logo-tap">Tap</span><span class="logo-trivia">Trivia</span></span>
        </div>
        <div class="auth-form-card">
          <h2 class="auth-title">Check your email</h2>
          <p class="auth-desc">We sent a 6-digit code to</p>
          <p class="auth-email-highlight">${maskedEmail}</p>
          <label class="field-label">ONE-TIME PASSCODE</label>
          <div class="otp-row" id="otp-row">
            ${loginState.otp.map((d, i) => `<input class="otp-input" type="text" inputmode="numeric" maxlength="1" data-idx="${i}" value="${d}" autocomplete="one-time-code">`).join('')}
          </div>
          ${loginState.error ? `<div class="auth-error">${loginState.error}</div>` : ''}
          <div class="otp-meta">
            <span class="text-muted">Expires in 10 minutes</span>
            <button class="link-blue btn-text" id="btn-resend">Resend code</button>
          </div>
        </div>
        <p class="auth-footer"><button class="link-muted btn-text" id="btn-back-login">&larr; Back to sign in</button></p>
      </div>
    </div>
  `;

  // OTP input auto-advance
  const inputs = container.querySelectorAll('.otp-input');
  inputs.forEach((inp, i) => {
    inp.addEventListener('input', e => {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val;
      loginState.otp[i] = val;
      if (val && i < 5) inputs[i + 1].focus();
      // Auto-submit when all 6 filled
      if (loginState.otp.every(d => d)) handleVerifyOtp();
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !e.target.value && i > 0) {
        inputs[i - 1].focus();
      }
    });
    inp.addEventListener('paste', e => {
      e.preventDefault();
      const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
      pasted.split('').forEach((ch, j) => {
        if (inputs[j]) {
          inputs[j].value = ch;
          loginState.otp[j] = ch;
        }
      });
      if (pasted.length === 6) handleVerifyOtp();
      else if (inputs[pasted.length]) inputs[pasted.length].focus();
    });
  });

  document.getElementById('btn-resend').addEventListener('click', async () => {
    try {
      await apiCall('POST', '/dashboard/auth/otp', { email: loginState.email.trim(), barCode: loginState.barCode.trim().toUpperCase() });
      loginState.error = '';
      loginState.otp = ['', '', '', '', '', ''];
      renderLogin();
      setTimeout(() => { const f = document.querySelector('.otp-input'); if (f) f.focus(); }, 100);
    } catch (err) { /* ignore */ }
  });

  document.getElementById('btn-back-login').addEventListener('click', () => {
    loginState.step = 'credentials';
    loginState.error = '';
    renderLogin();
  });
}

async function handleVerifyOtp() {
  const otp = loginState.otp.join('');
  if (otp.length !== 6) return;

  loginState.loading = true;
  loginState.error = '';

  try {
    const result = await apiCall('POST', '/dashboard/auth/verify', {
      email: loginState.email.trim(),
      barCode: loginState.barCode.trim().toUpperCase(),
      otp: otp
    });
    loginState.token = result.token;
    loginState.barName = result.barName;
    loginState.step = 'trust';
    loginState.loading = false;
    renderLogin();
  } catch (err) {
    loginState.error = err.message || 'Invalid code';
    loginState.loading = false;
    loginState.otp = ['', '', '', '', '', ''];
    renderLogin();
    setTimeout(() => { const f = document.querySelector('.otp-input'); if (f) f.focus(); }, 100);
  }
}

function renderTrust(container) {
  container.innerHTML = `
    <div class="auth-page">
      <div class="auth-orbs">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
      </div>
      <div class="auth-card pop-in">
        <div class="auth-logo-block">
          <span class="logo-text"><span class="logo-tap">Tap</span><span class="logo-trivia">Trivia</span></span>
        </div>
        <div class="auth-form-card" style="text-align:center">
          <div style="font-size:44px;margin-bottom:16px">&#x1F512;</div>
          <h2 class="auth-title">Trust this computer?</h2>
          <p class="auth-desc">You won't need to enter a passcode next time you visit from this device.</p>
          <p class="text-muted" style="margin-bottom:28px">Choose <strong>No</strong> if this is a shared computer or public device.</p>
          <div class="trust-buttons">
            <button class="btn-ghost btn-half" id="btn-trust-no">No, don't trust</button>
            <button class="btn-primary btn-half" id="btn-trust-yes">Yes, trust this computer</button>
          </div>
        </div>
        <div class="auth-bar-info">
          <span class="auth-bar-name">${loginState.barName}</span>
          <span class="auth-bar-code">${loginState.barCode.toUpperCase()}</span>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-trust-yes').addEventListener('click', () => finishLogin(true));
  document.getElementById('btn-trust-no').addEventListener('click', () => finishLogin(false));
}

async function finishLogin(persist) {
  setToken(loginState.token, persist);
  try {
    const data = await apiCall('GET', '/dashboard/data');
    setAuthState(data.bar, data);
    showScreen('dashboard');
  } catch (err) {
    clearToken();
    loginState.step = 'credentials';
    loginState.error = 'Failed to load dashboard. Please try again.';
    renderLogin();
  }
}
