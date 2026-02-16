'use strict';

let logoState = {
  preview: null,
  uploading: false,
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
              <div class="field-label">NEW LOGO PREVIEW</div>
              <img src="${logoState.preview}" alt="Preview" class="logo-preview-img">
            </div>
          ` : ''}

          <div class="logo-dropzone" id="logo-dropzone">
            <span class="dropzone-icon">&#x2B06;</span>
            <span class="dropzone-text">Click or drag an image here</span>
            <span class="dropzone-hint">PNG or JPEG, max 5 MB. Background will be automatically removed.</span>
            <input type="file" id="logo-file-input" accept="image/png,image/jpeg" class="hidden-input">
          </div>

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
                <div class="info-step-title">Upload your logo</div>
                <div class="info-step-desc">PNG or JPEG with any background</div>
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
                <div class="info-step-desc">Logo shows in signage headers and branding slides</div>
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

  const reader = new FileReader();
  reader.onload = () => {
    logoState.preview = reader.result;
    logoState.error = '';
    logoState.success = '';
    renderLogoUpload();
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
    // Extract base64 data and mime type
    const match = logoState.preview.match(/^data:(image\/(png|jpeg));base64,(.+)$/);
    if (!match) throw new Error('Invalid image data');

    const mimeType = match[1];
    const base64Data = match[3];

    const result = await apiCall('POST', '/dashboard/logo', {
      image: base64Data,
      mimeType: mimeType
    });

    // Update local auth state with new logo
    const { bar, data } = getAuthState();
    if (bar) {
      bar.logoUrl = result.logoUrl;
      bar.logoHash = result.logoHash;
      setAuthState(bar, data);
    }

    logoState.uploading = false;
    logoState.preview = null;
    logoState.success = 'Logo uploaded successfully! It will appear on your TV shortly.';
    renderLogoUpload();
  } catch (err) {
    logoState.uploading = false;
    logoState.error = err.message || 'Upload failed';
    renderLogoUpload();
  }
}
