'use strict';

let logoState = {
  preview: null,
  uploading: false,
  removeBackground: true,
  error: '',
  success: ''
};

function renderLogoUpload() {
  const container = document.getElementById('screen-logo');
  if (!container) return;

  const { bar } = getAuthState();
  const currentLogo = bar ? bar.logoUrl : null;
  const barName = bar ? bar.barName : 'Your Bar';

  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">Logo &amp; Branding</h1>
        <p class="page-desc">Upload your bar's logo — it appears on TV signage and the player app</p>
      </div>

      <div class="logo-upload-grid">
        <div class="dash-card logo-upload-card">
          <div class="card-title">Bar Logo</div>
          <div class="logo-current">
            ${currentLogo
              ? `<img src="${currentLogo}" alt="${barName}" class="logo-preview-img">`
              : `<div class="logo-placeholder">
                  <span class="logo-placeholder-icon">&#x1F5BC;</span>
                  <span class="logo-placeholder-text">No logo uploaded</span>
                </div>`
            }
          </div>

          ${logoState.preview ? `
            <div class="logo-new-preview">
              <div class="field-label">NEW LOGO PREVIEW (256 &times; 256)</div>
              <img src="${logoState.preview}" alt="Preview" class="logo-preview-img">
            </div>
          ` : ''}

          <div class="logo-dropzone" id="logo-dropzone">
            <span class="dropzone-icon">&#x2B06;</span>
            <span class="dropzone-text">Click or drag an image here</span>
            <span class="dropzone-hint">Square PNG or JPEG, max 5 MB</span>
            <input type="file" id="logo-file-input" accept="image/png,image/jpeg" class="hidden-input">
          </div>

          <label class="logo-option" id="label-remove-bg">
            <input type="checkbox" id="chk-remove-bg" ${logoState.removeBackground ? 'checked' : ''}>
            <span class="logo-option-text">Remove background</span>
            <span class="logo-option-hint">AI removes the background so your logo floats on the TV gradient</span>
          </label>

          ${logoState.error ? `<div class="auth-error">${logoState.error}</div>` : ''}
          ${logoState.success ? `<div class="auth-success">${logoState.success}</div>` : ''}

          <div class="logo-actions">
            <button class="btn-primary" id="btn-upload-logo" ${!logoState.preview || logoState.uploading ? 'disabled' : ''}>
              ${logoState.uploading ? 'Processing...' : 'Upload Logo'}
            </button>
          </div>
        </div>

        <div class="logo-info-col">
          <div class="dash-card logo-info-card">
            <div class="card-title">How it works</div>
            <div class="info-step">
              <span class="info-step-num">1</span>
              <div>
                <div class="info-step-title">Upload a square logo</div>
                <div class="info-step-desc">PNG or JPEG — resized to 256 &times; 256</div>
              </div>
            </div>
            <div class="info-step">
              <span class="info-step-num">2</span>
              <div>
                <div class="info-step-title">Background removed</div>
                <div class="info-step-desc">AI automatically removes the background</div>
              </div>
            </div>
            <div class="info-step">
              <span class="info-step-num">3</span>
              <div>
                <div class="info-step-title">Appears on your TV</div>
                <div class="info-step-desc">Logo shows in signage headers and branding slides. May take up to 24 hours to update.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // File input
  const fileInput = document.getElementById('logo-file-input');
  const dropzone = document.getElementById('logo-dropzone');

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('drag-over'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) handleLogoFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', e => {
    if (e.target.files.length) handleLogoFile(e.target.files[0]);
  });

  const chkRemoveBg = document.getElementById('chk-remove-bg');
  chkRemoveBg.addEventListener('change', () => { logoState.removeBackground = chkRemoveBg.checked; });

  document.getElementById('btn-upload-logo').addEventListener('click', handleLogoUpload);
}

function handleLogoFile(file) {
  if (!file.type.match(/^image\/(png|jpeg)$/)) {
    logoState.error = 'Please select a PNG or JPEG image';
    logoState.preview = null;
    renderLogoUpload();
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    logoState.error = 'Image must be under 5 MB';
    logoState.preview = null;
    renderLogoUpload();
    return;
  }

  // Load image to validate dimensions and resize
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      // Validate square (allow 5% tolerance)
      const ratio = img.width / img.height;
      if (ratio < 0.9 || ratio > 1.1) {
        logoState.error = `Image must be square. Yours is ${img.width} × ${img.height}. Please crop it to a 1:1 ratio.`;
        logoState.preview = null;
        renderLogoUpload();
        return;
      }

      // Resize to 256x256 via canvas
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 256, 256);

      logoState.preview = canvas.toDataURL('image/png');
      logoState.error = '';
      logoState.success = '';
      renderLogoUpload();
    };
    img.onerror = () => {
      logoState.error = 'Could not read image. Try a different file.';
      logoState.preview = null;
      renderLogoUpload();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

async function handleLogoUpload() {
  if (!logoState.preview) return;

  logoState.uploading = true;
  logoState.error = '';
  logoState.success = '';
  renderLogoUpload();

  try {
    // Extract base64 data (always PNG from canvas)
    const match = logoState.preview.match(/^data:(image\/png);base64,(.+)$/);
    if (!match) throw new Error('Invalid image data');

    const base64Data = match[2];

    const result = await apiCall('POST', '/dashboard/logo', {
      image: base64Data,
      contentType: 'image/png',
      removeBackground: logoState.removeBackground
    });

    // Update local auth state with new logo (add cache-bust)
    const { bar, data } = getAuthState();
    if (bar) {
      bar.logoUrl = result.logoUrl + '?v=' + result.logoHash;
      bar.logoHash = result.logoHash;
      setAuthState(bar, data);
    }

    logoState.uploading = false;
    logoState.preview = null;
    logoState.success = 'Logo uploaded! It may take up to 24 hours to appear everywhere, but we\'ve requested an immediate refresh.';
    renderLogoUpload();
  } catch (err) {
    logoState.uploading = false;
    logoState.error = err.message || 'Upload failed';
    renderLogoUpload();
  }
}
