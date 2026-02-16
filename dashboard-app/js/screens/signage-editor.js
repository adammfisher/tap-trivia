'use strict';

// ================================================================
// TEMPLATES + DATA
// ================================================================

const TEMPLATES = [
  {id:'specials',name:'Daily Specials',icon:'\u{1F37A}',desc:'Feature food & drink deals',color:'#f59e0b',
    defaults:{emoji:'\u{1F37A}',label:"Today's Specials",headline:'Happy Hour',subheadline:'All Day Tuesday',featuredName:'Margarita Pitcher',featuredDesc:'House lime, Cointreau, fresh squeeze',featuredPrice:'$18',menuItems:[{name:'Draft Beers',desc:'All domestics',price:'$3',icon:'\u{1F37A}'},{name:'Well Drinks',desc:'Vodka, rum, whiskey',price:'$4',icon:'\u{1F378}'},{name:'Wings Basket',desc:'12 ct. buffalo or BBQ',price:'$8',icon:'\u{1F357}'},{name:'Loaded Nachos',desc:'Beef, cheese, jalapenos',price:'$10',icon:'\u{1F32E}'}]}},
  {id:'happyhour',name:'Happy Hour',icon:'\u{1F379}',desc:'Time-based drink & food deals',color:'#e879f9',
    defaults:{emoji:'\u{1F379}',timeRange:'4 PM \u2013 7 PM',frequency:'Every weekday',deals:[{deal:'50% OFF',item:'All Drafts',color:'#f59e0b'},{deal:'$5',item:'House Wine',color:'#e879f9'},{deal:'$6',item:'Appetizers',color:'#00d4aa'}]}},
  {id:'event',name:'Event Promo',icon:'\u{1F3A7}',desc:'Promote upcoming events',color:'#667eea',
    defaults:{emoji:'\u{1F3A7}',eventName:'Trivia Night',when:'This Thursday',details:'8 PM \u2022 Free to play \u2022 Prizes for top 3',prizes:[{place:'1st',prize:'$50 Bar Tab',emoji:'\u{1F947}'},{place:'2nd',prize:'$25 Bar Tab',emoji:'\u{1F948}'},{place:'3rd',prize:'Free Appetizer',emoji:'\u{1F949}'}]}},
  {id:'brand',name:'Bar Branding',icon:'\u{1F3DB}',desc:'Logo, tagline & hours',color:'#764ba2',
    defaults:{tagline:'Cold Drinks \u2022 Good Times \u2022 Live Trivia',hours:[{label:'Mon\u2013Thu',hours:'4 PM \u2013 12 AM'},{label:'Fri\u2013Sat',hours:'4 PM \u2013 2 AM'},{label:'Sunday',hours:'12 PM \u2013 10 PM'}]}},
  {id:'announcement',name:'Announcement',icon:'\u{1F4E2}',desc:'Custom message or alert',color:'#00d4aa',
    defaults:{emoji:'\u{1F4E2}',headline:'Big News!',message:"We're expanding our patio \u2014 more seating, more fun starting next month!",subtext:'Stay tuned for the grand reveal'}},
  {id:'sports',name:'Game Day',icon:'\u{1F3C8}',desc:'Promote sports events',color:'#ff4757',
    defaults:{emoji:'\u{1F3C8}',headline:'Game Day',matchup:'Eagles vs Cowboys',when:'Sunday at 4:25 PM',promo:'$3 Bud Light \u2022 $5 Wings Basket',tagline:'Best seat in town'}},
  {id:'custom',name:'Custom Slide',icon:'\u{2728}',desc:'Freeform \u2014 anything you want',color:'#22d3ee',
    defaults:{emoji:'\u{2728}',headline:'Your Message Here',body:'Write anything you want to show on your TV.',items:[{emoji:'\u{1F3AF}',text:'Customize everything'},{emoji:'\u{1F525}',text:'Change the icon above'},{emoji:'\u{1F4A1}',text:'Add or remove items'}]}},
];

const EMOJI_GROUPS = [
  {label:'Food & Drink',emojis:['\u{1F37A}','\u{1F37B}','\u{1F378}','\u{1F379}','\u{1F377}','\u{1F37E}','\u{1F943}','\u{1F9CA}','\u2615','\u{1F354}','\u{1F355}','\u{1F32E}','\u{1F32F}','\u{1F357}','\u{1F969}','\u{1F373}','\u{1F957}','\u{1F37D}','\u{1F9C0}','\u{1F968}','\u{1F35F}','\u{1F953}']},
  {label:'Events & Music',emojis:['\u{1F3A7}','\u{1F3A4}','\u{1F3B5}','\u{1F3B6}','\u{1F3B8}','\u{1F3B9}','\u{1F3BA}','\u{1F3AD}','\u{1FA69}','\u{1F3AC}','\u{1F3A8}','\u{1F3AA}','\u{1F3AF}','\u{1F0CF}','\u{1F3B2}','\u{1F3B0}']},
  {label:'Sports',emojis:['\u{1F3C8}','\u26BD','\u{1F3C0}','\u{1F3D2}','\u26BE','\u{1F3C6}','\u{1F94A}','\u{1F3B1}','\u{1F3D3}','\u{1F3B3}','\u{1F3CE}','\u{1F94B}','\u{1F3D0}','\u{1F3A3}']},
  {label:'Celebrate',emojis:['\u{1F389}','\u{1F38A}','\u{1F973}','\u2728','\u{1F525}','\u{1F4A5}','\u{1F31F}','\u2B50','\u{1F4AB}','\u{1F381}','\u{1F380}','\u{1FA85}','\u{1F942}','\u{1F340}']},
  {label:'General',emojis:['\u{1F4E2}','\u{1F4E3}','\u{1F514}','\u{1F4A1}','\u{1F3F7}','\u2764','\u{1F451}','\u{1F48E}','\u26A1','\u{1F680}','\u{1F4AC}','\u{1F4CC}','\u{1F397}','\u2139','\u{1F195}','\u{1F193}','\u{1F4AF}','\u{1F44D}']},
];

const WEEKDAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const ALL_DAYS = ['All Days', ...WEEKDAYS];

// ================================================================
// SIGNAGE EDITOR STATE
// ================================================================

let signageState = {
  slides: [],
  rotationSpeed: 15,
  enabled: true,
  editing: null,       // { templateId, data, editIdx } or null
  selectedDay: 'All Days',
  previewSlide: 0,
  saving: false,
  dirty: false,
  error: '',
  success: ''
};

// ================================================================
// MAIN RENDER
// ================================================================

function renderSignageEditor() {
  const container = document.getElementById('screen-signage');
  if (!container) return;

  // Load signage from auth state on first render
  const { bar } = getAuthState();
  if (bar && bar.signage && !signageState.dirty) {
    signageState.slides = bar.signage.slides ? JSON.parse(JSON.stringify(bar.signage.slides)) : [];
    signageState.rotationSpeed = bar.signage.rotationSpeed || 15;
    signageState.enabled = bar.signage.enabled !== false;
  }

  if (signageState.editing) {
    renderSlideEditor(container);
  } else {
    renderSlideList(container);
  }
}

// ================================================================
// SLIDE LIST VIEW
// ================================================================

function renderSlideList(container) {
  const slides = signageState.slides;
  const daySlides = signageState.selectedDay === 'All Days'
    ? slides
    : slides.filter(s => !s.schedule || !s.schedule.days || s.schedule.days.includes(signageState.selectedDay));
  const canAdd = slides.length < 10;

  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-title">Signage Creator</h1>
        <p class="page-desc">Design what shows on your TV &mdash; full-screen during breaks, side panel during games</p>
      </div>

      ${signageState.error ? `<div class="auth-error">${signageState.error}</div>` : ''}
      ${signageState.success ? `<div class="auth-success">${signageState.success}</div>` : ''}

      <!-- Template Picker -->
      <div class="section-block">
        <div class="section-header">
          <span class="section-label">START FROM A TEMPLATE</span>
          ${!canAdd ? '<span class="badge-warn">10/10 slides &mdash; remove one to add more</span>' : ''}
        </div>
        <div class="template-grid">
          ${TEMPLATES.map(t => `
            <div class="template-card ${canAdd ? '' : 'disabled'}" data-tmpl="${t.id}" style="--tmpl-color:${t.color}">
              <div class="template-icon">${t.icon}</div>
              <div class="template-name">${t.name}</div>
              <div class="template-desc">${t.desc}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Your Rotation -->
      <div class="section-block">
        <div class="section-header">
          <div class="section-header-left">
            <span class="section-label">YOUR ROTATION</span>
            <span class="badge-muted">${slides.length}/10 slides</span>
          </div>
          ${slides.length > 0 ? `
            <div class="section-header-right">
              <span class="rotation-label">Rotate every</span>
              <div class="speed-toggle">
                ${[10,15,30,60].map(s => `<button class="speed-btn ${signageState.rotationSpeed === s ? 'active' : ''}" data-speed="${s}">${s}s</button>`).join('')}
              </div>
              ${signageState.dirty ? `<button class="btn-primary btn-save-signage" id="btn-save-signage">${signageState.saving ? 'Saving...' : 'Save Changes'}</button>` : ''}
            </div>
          ` : ''}
        </div>

        ${slides.length > 0 ? `
          <div class="day-filter">
            ${ALL_DAYS.map(d => `<button class="day-btn ${signageState.selectedDay === d ? 'active' : ''}" data-day="${d}">${d}</button>`).join('')}
          </div>
        ` : ''}

        ${slides.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">&#x1F4FA;</div>
            <div class="empty-title">No slides in rotation yet</div>
            <div class="empty-desc">Pick a template above to create your first slide</div>
          </div>
        ` : `
          <div class="slide-list">
            ${daySlides.map((slide, di) => {
              const realIdx = slides.indexOf(slide);
              const tmpl = TEMPLATES.find(t => t.id === slide.template);
              return `
                <div class="dash-card slide-row ${slide.enabled ? '' : 'slide-disabled'}" data-idx="${realIdx}">
                  <div class="slide-thumb" style="background:${tmpl ? tmpl.color + '20' : 'rgba(255,255,255,.04)'}">
                    <span class="slide-thumb-icon">${tmpl ? tmpl.icon : '\u{1F4FA}'}</span>
                  </div>
                  <div class="slide-info">
                    <div class="slide-name-row">
                      <span class="slide-icon">${slide.icon || (tmpl ? tmpl.icon : '')}</span>
                      <span class="slide-name">${slide.name || (tmpl ? tmpl.name : 'Slide')}</span>
                    </div>
                    <div class="slide-days">
                      ${WEEKDAYS.map(day => {
                        const active = !slide.schedule || !slide.schedule.days || slide.schedule.days.includes(day);
                        return `<span class="day-chip ${active ? 'active' : ''}" data-real="${realIdx}" data-day="${day}">${day}</span>`;
                      }).join('')}
                    </div>
                  </div>
                  <div class="slide-actions">
                    <div class="toggle-switch ${slide.enabled ? 'on' : ''}" data-toggle="${realIdx}">
                      <div class="toggle-knob"></div>
                    </div>
                    <button class="btn-ghost btn-sm" data-edit="${realIdx}">Edit</button>
                    <button class="btn-danger btn-sm" data-remove="${realIdx}">&times;</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    </div>
  `;

  // Event listeners
  container.querySelectorAll('.template-card:not(.disabled)').forEach(el => {
    el.addEventListener('click', () => startCreateSlide(el.dataset.tmpl));
  });

  container.querySelectorAll('.speed-btn').forEach(el => {
    el.addEventListener('click', () => {
      signageState.rotationSpeed = parseInt(el.dataset.speed);
      signageState.dirty = true;
      renderSignageEditor();
    });
  });

  container.querySelectorAll('.day-btn').forEach(el => {
    el.addEventListener('click', () => {
      signageState.selectedDay = el.dataset.day;
      signageState.previewSlide = 0;
      renderSignageEditor();
    });
  });

  container.querySelectorAll('[data-toggle]').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.toggle);
      signageState.slides[idx].enabled = !signageState.slides[idx].enabled;
      signageState.dirty = true;
      renderSignageEditor();
    });
  });

  container.querySelectorAll('[data-edit]').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.edit);
      startEditSlide(idx);
    });
  });

  container.querySelectorAll('[data-remove]').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.remove);
      signageState.slides.splice(idx, 1);
      signageState.dirty = true;
      renderSignageEditor();
    });
  });

  container.querySelectorAll('.day-chip').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const idx = parseInt(el.dataset.real);
      const day = el.dataset.day;
      toggleSlideDay(idx, day);
    });
  });

  const saveBtn = document.getElementById('btn-save-signage');
  if (saveBtn) saveBtn.addEventListener('click', saveSignage);
}

// ================================================================
// SLIDE EDITOR VIEW
// ================================================================

function renderSlideEditor(container) {
  const ed = signageState.editing;
  const tmpl = TEMPLATES.find(t => t.id === ed.templateId);

  container.innerHTML = `
    <div class="fade-in">
      <div class="editor-header">
        <button class="btn-ghost" id="btn-editor-back">&larr; Back</button>
        <div class="editor-title-block">
          <span class="editor-title-icon">${tmpl.icon}</span>
          <div>
            <h1 class="editor-title">${ed.editIdx !== null ? 'Edit' : 'Create'} ${tmpl.name}</h1>
            <p class="editor-desc">Fill out the details below</p>
          </div>
        </div>
        <div class="editor-actions">
          <button class="btn-ghost" id="btn-editor-cancel">Cancel</button>
          <button class="btn-primary" id="btn-editor-save">${ed.editIdx !== null ? 'Save Changes' : 'Add to Rotation'}</button>
        </div>
      </div>
      <div class="editor-body">
        <div class="dash-card editor-form" id="editor-form"></div>
        <div class="editor-preview">
          <div class="preview-label">PREVIEW</div>
          <div class="dash-card preview-card" id="preview-card"></div>
        </div>
      </div>
    </div>
  `;

  // Render the form for this template
  renderEditorForm(ed.templateId, ed.data);
  renderPreview(ed.templateId, ed.data);

  document.getElementById('btn-editor-back').addEventListener('click', () => { signageState.editing = null; renderSignageEditor(); });
  document.getElementById('btn-editor-cancel').addEventListener('click', () => { signageState.editing = null; renderSignageEditor(); });
  document.getElementById('btn-editor-save').addEventListener('click', saveSlide);
}

// ================================================================
// TEMPLATE-SPECIFIC EDITOR FORMS
// ================================================================

function renderEditorForm(templateId, data) {
  const formEl = document.getElementById('editor-form');
  if (!formEl) return;

  const builders = {
    specials: buildSpecialsForm,
    happyhour: buildHappyHourForm,
    event: buildEventForm,
    brand: buildBrandForm,
    announcement: buildAnnouncementForm,
    sports: buildSportsForm,
    custom: buildCustomForm,
  };

  const builder = builders[templateId];
  if (builder) builder(formEl, data);
}

function buildSpecialsForm(el, d) {
  el.innerHTML = `
    ${emojiPickerHTML('emoji', d.emoji || '\u{1F37A}', 'Slide Icon')}
    <div class="field-label form-section-label">HEADER</div>
    ${fieldHTML('label', 'Label', d.label || '', "Today's Specials")}
    <div class="field-row">
      ${fieldHTML('headline', 'Headline', d.headline || '', 'Happy Hour')}
      ${fieldHTML('subheadline', 'Gold Subheadline', d.subheadline || '', 'All Day Tuesday')}
    </div>
    <div class="field-label form-section-label">FEATURED ITEM</div>
    <div class="field-row">
      <div class="field-flex-2">${fieldHTML('featuredName', 'Name', d.featuredName || '', 'Margarita Pitcher')}</div>
      <div class="field-flex-1">${fieldHTML('featuredPrice', 'Price', d.featuredPrice || '', '$18')}</div>
    </div>
    ${fieldHTML('featuredDesc', 'Description', d.featuredDesc || '', 'House lime, Cointreau...')}
    <div class="menu-items-header">
      <div class="field-label form-section-label">MENU ITEMS (${(d.menuItems || []).length}/6)</div>
      ${(d.menuItems || []).length < 6 ? '<button class="btn-ghost btn-sm" id="btn-add-menu-item">+ Add</button>' : ''}
    </div>
    <div id="menu-items-list">
      ${(d.menuItems || []).map((item, i) => `
        <div class="menu-row" data-idx="${i}">
          ${inlineEmojiPickerHTML('menuIcon-' + i, item.icon || '\u{1F37D}')}
          <input class="field-input field-sm" value="${esc(item.name)}" placeholder="Item" data-field="name" data-idx="${i}">
          <input class="field-input field-sm" value="${esc(item.desc)}" placeholder="Description" data-field="desc" data-idx="${i}">
          <input class="field-input field-sm field-price" value="${esc(item.price)}" placeholder="$0" data-field="price" data-idx="${i}">
          <button class="btn-remove-item" data-remove-menu="${i}">&times;</button>
        </div>
      `).join('')}
    </div>
  `;
  attachFormListeners(el, d);
  attachMenuItemListeners(el, d);

  const addBtn = document.getElementById('btn-add-menu-item');
  if (addBtn) addBtn.addEventListener('click', () => {
    d.menuItems = d.menuItems || [];
    d.menuItems.push({name:'',desc:'',price:'',icon:'\u{1F37D}'});
    renderEditorForm('specials', d);
    renderPreview('specials', d);
  });
}

function buildHappyHourForm(el, d) {
  const DEAL_COLORS = ['#f59e0b','#e879f9','#00d4aa','#667eea','#22d3ee'];
  el.innerHTML = `
    ${emojiPickerHTML('emoji', d.emoji || '\u{1F379}', 'Slide Icon')}
    <div class="field-row">
      ${fieldHTML('timeRange', 'Time Range', d.timeRange || '', '4 PM \u2013 7 PM')}
      ${fieldHTML('frequency', 'Frequency', d.frequency || '', 'Every weekday')}
    </div>
    <div class="menu-items-header">
      <div class="field-label form-section-label">DEALS (${(d.deals || []).length}/4)</div>
      ${(d.deals || []).length < 4 ? '<button class="btn-ghost btn-sm" id="btn-add-deal">+ Add</button>' : ''}
    </div>
    <div id="deals-list">
      ${(d.deals || []).map((deal, i) => `
        <div class="deal-card" data-idx="${i}">
          <div class="field-row">
            <input class="field-input field-sm" value="${esc(deal.deal)}" placeholder="50% OFF" data-field="deal" data-idx="${i}">
            <input class="field-input field-sm" value="${esc(deal.item)}" placeholder="All Drafts" data-field="item" data-idx="${i}">
            <button class="btn-remove-item" data-remove-deal="${i}">&times;</button>
          </div>
          <div class="color-row">
            ${DEAL_COLORS.map(c => `<div class="color-swatch ${deal.color === c ? 'active' : ''}" style="background:${c}" data-color="${c}" data-deal-idx="${i}"></div>`).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
  attachFormListeners(el, d);
  attachDealListeners(el, d);

  const addBtn = document.getElementById('btn-add-deal');
  if (addBtn) addBtn.addEventListener('click', () => {
    d.deals = d.deals || [];
    d.deals.push({deal:'',item:'',color:'#f59e0b'});
    renderEditorForm('happyhour', d);
    renderPreview('happyhour', d);
  });
}

function buildEventForm(el, d) {
  el.innerHTML = `
    ${emojiPickerHTML('emoji', d.emoji || '\u{1F3A7}', 'Event Icon')}
    ${fieldHTML('eventName', 'Event Name', d.eventName || '', 'Trivia Night')}
    ${fieldHTML('when', 'When', d.when || '', 'This Thursday')}
    ${fieldHTML('details', 'Details', d.details || '', '8 PM \u2022 Free to play \u2022 Prizes for top 3')}
    <div class="field-label form-section-label">PRIZES</div>
    <div id="prizes-list">
      ${(d.prizes || []).map((p, i) => `
        <div class="menu-row" data-idx="${i}">
          ${inlineEmojiPickerHTML('prizeEmoji-' + i, p.emoji || '\u{1F3C6}')}
          <input class="field-input field-sm field-price" value="${esc(p.place)}" placeholder="1st" data-field="place" data-idx="${i}">
          <input class="field-input field-sm" value="${esc(p.prize)}" placeholder="$50 Bar Tab" data-field="prize" data-idx="${i}" style="flex:2">
        </div>
      `).join('')}
    </div>
  `;
  attachFormListeners(el, d);
  attachPrizeListeners(el, d);
}

function buildBrandForm(el, d) {
  const { bar } = getAuthState();
  const logoUrl = bar ? bar.logoUrl : null;
  const barName = bar ? bar.barName : 'Your Bar';

  el.innerHTML = `
    <div class="brand-logo-row">
      <div class="brand-logo-thumb">
        ${logoUrl
          ? `<img src="${logoUrl}" alt="${barName}" class="brand-logo-img">`
          : `<span class="brand-logo-initial">${barName.charAt(0)}</span>`
        }
      </div>
      <div class="brand-logo-info">
        <div class="brand-logo-name">${barName}</div>
        <div class="brand-logo-hint">Logo on all signage</div>
      </div>
      <button class="btn-ghost btn-sm" id="btn-brand-upload-logo">Upload Logo</button>
    </div>
    ${fieldHTML('tagline', 'Tagline', d.tagline || '', 'Cold Drinks \u2022 Good Times')}
    <div class="field-label form-section-label">HOURS</div>
    <div id="hours-list">
      ${(d.hours || []).map((h, i) => `
        <div class="menu-row" data-idx="${i}">
          <input class="field-input field-sm" value="${esc(h.label)}" placeholder="Mon\u2013Thu" data-field="label" data-idx="${i}" style="flex:1">
          <input class="field-input field-sm" value="${esc(h.hours)}" placeholder="4 PM \u2013 12 AM" data-field="hours" data-idx="${i}" style="flex:2">
        </div>
      `).join('')}
    </div>
  `;
  attachFormListeners(el, d);
  attachHoursListeners(el, d);

  const uploadBtn = document.getElementById('btn-brand-upload-logo');
  if (uploadBtn) uploadBtn.addEventListener('click', () => {
    signageState.editing = null;
    DashApp.showScreen('logo');
  });
}

function buildAnnouncementForm(el, d) {
  el.innerHTML = `
    ${emojiPickerHTML('emoji', d.emoji || '\u{1F4E2}', 'Slide Icon')}
    ${fieldHTML('headline', 'Headline', d.headline || '', 'Big News!')}
    <div class="field-group">
      <label class="field-label">MESSAGE</label>
      <textarea class="field-input field-textarea" id="field-message" placeholder="Your announcement..." rows="3">${esc(d.message || '')}</textarea>
    </div>
    ${fieldHTML('subtext', 'Subtext (optional)', d.subtext || '', 'Additional details')}
  `;
  attachFormListeners(el, d);
  const ta = document.getElementById('field-message');
  if (ta) ta.addEventListener('input', () => { d.message = ta.value; renderPreview(signageState.editing.templateId, d); });
}

function buildSportsForm(el, d) {
  el.innerHTML = `
    ${emojiPickerHTML('emoji', d.emoji || '\u{1F3C8}', 'Sport Icon')}
    ${fieldHTML('headline', 'Headline', d.headline || '', 'Game Day')}
    ${fieldHTML('matchup', 'Matchup', d.matchup || '', 'Eagles vs Cowboys')}
    ${fieldHTML('when', 'When', d.when || '', 'Sunday at 4:25 PM')}
    ${fieldHTML('promo', 'Promo / Specials', d.promo || '', '$3 Bud Light \u2022 $5 Wings')}
    ${fieldHTML('tagline', 'Tagline (optional)', d.tagline || '', 'Best seat in town')}
  `;
  attachFormListeners(el, d);
}

function buildCustomForm(el, d) {
  el.innerHTML = `
    ${emojiPickerHTML('emoji', d.emoji || '\u{2728}', 'Hero Icon')}
    ${fieldHTML('headline', 'Headline', d.headline || '', 'Your Message Here')}
    <div class="field-group">
      <label class="field-label">BODY TEXT</label>
      <textarea class="field-input field-textarea" id="field-body" placeholder="Write anything you want..." rows="3">${esc(d.body || '')}</textarea>
    </div>
    <div class="menu-items-header">
      <div class="field-label form-section-label">ITEMS (${(d.items || []).length}/6)</div>
      ${(d.items || []).length < 6 ? '<button class="btn-ghost btn-sm" id="btn-add-custom-item">+ Add</button>' : ''}
    </div>
    <div id="custom-items-list">
      ${(d.items || []).map((item, i) => `
        <div class="menu-row" data-idx="${i}">
          ${inlineEmojiPickerHTML('customIcon-' + i, item.emoji || '\u2B50')}
          <input class="field-input field-sm" value="${esc(item.text)}" placeholder="Item text" data-field="text" data-idx="${i}" style="flex:1">
          <button class="btn-remove-item" data-remove-custom="${i}">&times;</button>
        </div>
      `).join('')}
    </div>
  `;
  attachFormListeners(el, d);
  attachCustomItemListeners(el, d);

  const ta = document.getElementById('field-body');
  if (ta) ta.addEventListener('input', () => { d.body = ta.value; renderPreview('custom', d); });

  const addBtn = document.getElementById('btn-add-custom-item');
  if (addBtn) addBtn.addEventListener('click', () => {
    d.items = d.items || [];
    d.items.push({emoji:'\u2B50',text:''});
    renderEditorForm('custom', d);
    renderPreview('custom', d);
  });
}

// ================================================================
// PREVIEW RENDERER
// ================================================================

function renderPreview(templateId, data) {
  const card = document.getElementById('preview-card');
  if (!card) return;

  const renderers = {
    specials: previewSpecials,
    happyhour: previewHappyHour,
    event: previewEvent,
    brand: previewBrand,
    announcement: previewAnnouncement,
    sports: previewSports,
    custom: previewCustom,
  };

  const renderer = renderers[templateId];
  if (renderer) card.innerHTML = renderer(data);
}

function previewSpecials(d) {
  return `
    <div class="tv-preview specials-preview">
      <div class="tv-preview-header">
        <span class="preview-label-text">${d.emoji || '\u{1F37A}'} ${d.label || "Today's Specials"}</span>
      </div>
      <div class="preview-headline">${d.headline || ''}</div>
      <div class="preview-subheadline gold">${d.subheadline || ''}</div>
      <div class="preview-featured">
        <div class="preview-featured-info">
          <div class="preview-featured-name">${d.featuredName || ''}</div>
          <div class="preview-featured-desc">${d.featuredDesc || ''}</div>
        </div>
        <div class="preview-featured-price">${d.featuredPrice || ''}</div>
      </div>
      <div class="preview-menu">
        ${(d.menuItems || []).map(item => `
          <div class="preview-menu-item">
            <span class="preview-menu-icon">${item.icon || '\u{1F37D}'}</span>
            <div class="preview-menu-info"><span class="preview-menu-name">${item.name}</span><span class="preview-menu-desc">${item.desc}</span></div>
            <span class="preview-menu-price">${item.price}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function previewHappyHour(d) {
  return `
    <div class="tv-preview happyhour-preview">
      <div class="preview-center">
        <div class="preview-accent-label">${d.emoji || '\u{1F379}'} Happy Hour</div>
        <div class="preview-headline-lg">${d.timeRange || ''}</div>
        <div class="preview-muted">${d.frequency || ''}</div>
        <div class="preview-deals">
          ${(d.deals || []).map(deal => `
            <div class="preview-deal" style="--deal-color:${deal.color || '#f59e0b'}">
              <div class="preview-deal-value">${deal.deal}</div>
              <div class="preview-deal-item">${deal.item}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function previewEvent(d) {
  return `
    <div class="tv-preview event-preview">
      <div class="preview-center">
        <div class="preview-big-emoji">${d.emoji || '\u{1F3A7}'}</div>
        <div class="preview-accent-label blue">${d.when || ''}</div>
        <div class="preview-headline-lg">${d.eventName || ''}</div>
        <div class="preview-muted">${d.details || ''}</div>
        <div class="preview-prizes">
          ${(d.prizes || []).map(p => `
            <div class="preview-prize">
              <span class="preview-prize-emoji">${p.emoji}</span>
              <span class="preview-prize-place">${p.place}</span>
              <span class="preview-prize-name">${p.prize}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function previewBrand(d) {
  const { bar } = getAuthState();
  const barName = bar ? bar.barName : 'Your Bar';
  return `
    <div class="tv-preview brand-preview">
      <div class="preview-center">
        <div class="preview-brand-logo">${barName.charAt(0)}</div>
        <div class="preview-headline-lg">${barName}</div>
        <div class="preview-muted">${d.tagline || ''}</div>
        <div class="preview-divider"></div>
        <div class="preview-hours">
          ${(d.hours || []).map(h => `
            <div class="preview-hours-row">
              <span class="preview-hours-label">${h.label}</span>
              <span class="preview-hours-value">${h.hours}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function previewAnnouncement(d) {
  return `
    <div class="tv-preview announcement-preview">
      <div class="preview-center">
        <div class="preview-big-emoji">${d.emoji || '\u{1F4E2}'}</div>
        <div class="preview-headline-lg">${d.headline || ''}</div>
        <div class="preview-body">${d.message || ''}</div>
        ${d.subtext ? `<div class="preview-muted" style="margin-top:12px">${d.subtext}</div>` : ''}
      </div>
    </div>
  `;
}

function previewSports(d) {
  return `
    <div class="tv-preview sports-preview">
      <div class="preview-center">
        <div class="preview-big-emoji">${d.emoji || '\u{1F3C8}'}</div>
        <div class="preview-accent-label red">${d.headline || ''}</div>
        <div class="preview-headline-lg">${d.matchup || ''}</div>
        <div class="preview-muted">${d.when || ''}</div>
        <div class="preview-promo">${d.promo || ''}</div>
        ${d.tagline ? `<div class="preview-tagline">${d.tagline}</div>` : ''}
      </div>
    </div>
  `;
}

function previewCustom(d) {
  return `
    <div class="tv-preview custom-preview">
      <div class="preview-center">
        <div class="preview-big-emoji">${d.emoji || '\u{2728}'}</div>
        <div class="preview-headline-lg">${d.headline || ''}</div>
        <div class="preview-body">${d.body || ''}</div>
        ${(d.items || []).length > 0 ? `
          <div class="preview-custom-items">
            ${d.items.map(item => `
              <div class="preview-custom-item">
                <span>${item.emoji}</span>
                <span>${item.text}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// ================================================================
// FORM HELPERS
// ================================================================

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function fieldHTML(name, label, value, placeholder) {
  return `
    <div class="field-group">
      <label class="field-label">${label.toUpperCase()}</label>
      <input class="field-input" id="field-${name}" data-field-name="${name}" value="${esc(value)}" placeholder="${esc(placeholder)}">
    </div>
  `;
}

function emojiPickerHTML(name, current, label) {
  return `
    <div class="field-group emoji-picker-group">
      <label class="field-label">${label.toUpperCase()}</label>
      <button class="emoji-trigger" id="emoji-trigger-${name}" data-emoji-name="${name}">${current}</button>
      <div class="emoji-dropdown hidden" id="emoji-dropdown-${name}">
        ${EMOJI_GROUPS.map(group => `
          <div class="emoji-group">
            <div class="emoji-group-label">${group.label}</div>
            <div class="emoji-grid">
              ${group.emojis.map(e => `<button class="emoji-btn ${e === current ? 'active' : ''}" data-emoji="${e}" data-target="${name}">${e}</button>`).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function inlineEmojiPickerHTML(name, current) {
  return `
    <div class="inline-emoji-picker">
      <button class="emoji-trigger-sm" id="emoji-trigger-${name}" data-emoji-name="${name}">${current}</button>
      <div class="emoji-dropdown emoji-dropdown-sm hidden" id="emoji-dropdown-${name}">
        ${EMOJI_GROUPS.map(group => `
          <div class="emoji-group">
            <div class="emoji-group-label">${group.label}</div>
            <div class="emoji-grid">
              ${group.emojis.map(e => `<button class="emoji-btn-sm ${e === current ? 'active' : ''}" data-emoji="${e}" data-target="${name}">${e}</button>`).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function attachFormListeners(el, data) {
  // Standard field inputs
  el.querySelectorAll('input[data-field-name]').forEach(inp => {
    inp.addEventListener('input', () => {
      data[inp.dataset.fieldName] = inp.value;
      renderPreview(signageState.editing.templateId, data);
    });
  });

  // Emoji pickers
  el.querySelectorAll('.emoji-trigger, .emoji-trigger-sm').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const name = btn.dataset.emojiName;
      const dd = document.getElementById(`emoji-dropdown-${name}`);
      // Close all other dropdowns
      el.querySelectorAll('.emoji-dropdown').forEach(d => { if (d !== dd) d.classList.add('hidden'); });
      dd.classList.toggle('hidden');
    });
  });

  el.querySelectorAll('.emoji-btn, .emoji-btn-sm').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const emoji = btn.dataset.emoji;
      const targetName = btn.dataset.target;

      // Determine what field this emoji belongs to
      if (targetName === 'emoji') {
        data.emoji = emoji;
      } else if (targetName.startsWith('menuIcon-')) {
        const idx = parseInt(targetName.split('-')[1]);
        if (data.menuItems && data.menuItems[idx]) data.menuItems[idx].icon = emoji;
      } else if (targetName.startsWith('prizeEmoji-')) {
        const idx = parseInt(targetName.split('-')[1]);
        if (data.prizes && data.prizes[idx]) data.prizes[idx].emoji = emoji;
      } else if (targetName.startsWith('customIcon-')) {
        const idx = parseInt(targetName.split('-')[1]);
        if (data.items && data.items[idx]) data.items[idx].emoji = emoji;
      }

      // Close dropdown and re-render
      const dd = document.getElementById(`emoji-dropdown-${targetName}`);
      if (dd) dd.classList.add('hidden');
      renderEditorForm(signageState.editing.templateId, data);
      renderPreview(signageState.editing.templateId, data);
    });
  });

  // Close emoji dropdowns on outside click
  document.addEventListener('click', function closeEmoji(e) {
    if (!e.target.closest('.emoji-picker-group') && !e.target.closest('.inline-emoji-picker')) {
      el.querySelectorAll('.emoji-dropdown').forEach(d => d.classList.add('hidden'));
    }
  }, { once: false });
}

function attachMenuItemListeners(el, d) {
  el.querySelectorAll('#menu-items-list input[data-field]').forEach(inp => {
    inp.addEventListener('input', () => {
      const idx = parseInt(inp.dataset.idx);
      const field = inp.dataset.field;
      if (d.menuItems && d.menuItems[idx]) {
        d.menuItems[idx][field] = inp.value;
        renderPreview('specials', d);
      }
    });
  });
  el.querySelectorAll('[data-remove-menu]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.removeMenu);
      d.menuItems.splice(idx, 1);
      renderEditorForm('specials', d);
      renderPreview('specials', d);
    });
  });
}

function attachDealListeners(el, d) {
  el.querySelectorAll('#deals-list input[data-field]').forEach(inp => {
    inp.addEventListener('input', () => {
      const idx = parseInt(inp.dataset.idx);
      const field = inp.dataset.field;
      if (d.deals && d.deals[idx]) {
        d.deals[idx][field] = inp.value;
        renderPreview('happyhour', d);
      }
    });
  });
  el.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      const idx = parseInt(swatch.dataset.dealIdx);
      if (d.deals && d.deals[idx]) {
        d.deals[idx].color = swatch.dataset.color;
        renderEditorForm('happyhour', d);
        renderPreview('happyhour', d);
      }
    });
  });
  el.querySelectorAll('[data-remove-deal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.removeDeal);
      d.deals.splice(idx, 1);
      renderEditorForm('happyhour', d);
      renderPreview('happyhour', d);
    });
  });
}

function attachPrizeListeners(el, d) {
  el.querySelectorAll('#prizes-list input[data-field]').forEach(inp => {
    inp.addEventListener('input', () => {
      const idx = parseInt(inp.dataset.idx);
      const field = inp.dataset.field;
      if (d.prizes && d.prizes[idx]) {
        d.prizes[idx][field] = inp.value;
        renderPreview('event', d);
      }
    });
  });
}

function attachHoursListeners(el, d) {
  el.querySelectorAll('#hours-list input[data-field]').forEach(inp => {
    inp.addEventListener('input', () => {
      const idx = parseInt(inp.dataset.idx);
      const field = inp.dataset.field;
      if (d.hours && d.hours[idx]) {
        d.hours[idx][field] = inp.value;
        renderPreview('brand', d);
      }
    });
  });
}

function attachCustomItemListeners(el, d) {
  el.querySelectorAll('#custom-items-list input[data-field]').forEach(inp => {
    inp.addEventListener('input', () => {
      const idx = parseInt(inp.dataset.idx);
      if (d.items && d.items[idx]) {
        d.items[idx].text = inp.value;
        renderPreview('custom', d);
      }
    });
  });
  el.querySelectorAll('[data-remove-custom]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.removeCustom);
      d.items.splice(idx, 1);
      renderEditorForm('custom', d);
      renderPreview('custom', d);
    });
  });
}

// ================================================================
// ACTIONS
// ================================================================

function startCreateSlide(templateId) {
  const tmpl = TEMPLATES.find(t => t.id === templateId);
  if (!tmpl) return;
  signageState.editing = {
    templateId: tmpl.id,
    data: JSON.parse(JSON.stringify(tmpl.defaults)),
    editIdx: null
  };
  renderSignageEditor();
}

function startEditSlide(idx) {
  const slide = signageState.slides[idx];
  if (!slide) return;
  signageState.editing = {
    templateId: slide.template,
    data: JSON.parse(JSON.stringify(slide.data)),
    editIdx: idx
  };
  renderSignageEditor();
}

function saveSlide() {
  const ed = signageState.editing;
  if (!ed) return;

  if (ed.editIdx !== null) {
    signageState.slides[ed.editIdx].data = JSON.parse(JSON.stringify(ed.data));
  } else {
    const tmpl = TEMPLATES.find(t => t.id === ed.templateId);
    signageState.slides.push({
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
      template: ed.templateId,
      name: tmpl.name,
      icon: tmpl.icon,
      enabled: true,
      data: JSON.parse(JSON.stringify(ed.data)),
      schedule: { days: null }
    });
  }

  signageState.editing = null;
  signageState.dirty = true;
  renderSignageEditor();
}

function toggleSlideDay(idx, day) {
  const slide = signageState.slides[idx];
  if (!slide) return;
  if (!slide.schedule) slide.schedule = { days: null };
  const cur = slide.schedule.days || [];
  const has = cur.includes(day);
  const next = has ? cur.filter(d => d !== day) : [...cur, day];
  slide.schedule.days = next.length === 0 ? null : next;
  signageState.dirty = true;
  renderSignageEditor();
}

async function saveSignage() {
  signageState.saving = true;
  signageState.error = '';
  signageState.success = '';
  renderSignageEditor();

  try {
    await apiCall('PUT', '/dashboard/signage', {
      slides: signageState.slides,
      rotationSpeed: signageState.rotationSpeed,
      enabled: signageState.enabled
    });

    // Update local state
    const { bar, data } = getAuthState();
    if (bar) {
      bar.signage = {
        slides: JSON.parse(JSON.stringify(signageState.slides)),
        rotationSpeed: signageState.rotationSpeed,
        enabled: signageState.enabled
      };
      setAuthState(bar, data);
    }

    signageState.saving = false;
    signageState.dirty = false;
    signageState.success = 'Signage saved! Changes will appear on your TV within seconds.';
    renderSignageEditor();
  } catch (err) {
    signageState.saving = false;
    signageState.error = err.message || 'Failed to save signage';
    renderSignageEditor();
  }
}
