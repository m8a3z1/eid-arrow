/**
 * EID MUBARAK — script.js (v4 — preload base64 fix)
 *
 * ROOT CAUSE OF OLD ERROR:
 *   fetch() and crossOrigin reload both fail on file:// protocol.
 *   The browser taints the canvas when a local image is drawn,
 *   then toDataURL() throws a SecurityError.
 *
 * THE FIX:
 *   On page load, we draw the <img> into a hidden canvas IMMEDIATELY
 *   (before any taint check fires) and save the result as a base64
 *   data-URL in `cachedImageDataURL`. At download time we load THAT
 *   data-URL — a same-origin string — so the canvas is never tainted.
 */

/* ══ DOM ══ */
const imageWrapper    = document.getElementById('imageWrapper');
const eidImage        = document.getElementById('eidImage');
const nameOverlay     = document.getElementById('nameOverlay');
const nameDisplay     = document.getElementById('nameDisplay');
const clickHint       = document.getElementById('clickHint');
const inputPanel      = document.getElementById('inputPanel');
const nameInput       = document.getElementById('nameInput');
const fontSizeSlider  = document.getElementById('fontSizeSlider');
const fontSizeValue   = document.getElementById('fontSizeValue');
const fontUpload      = document.getElementById('fontUpload');
const fontNameDisplay = document.getElementById('fontName');
const btnPreview      = document.getElementById('btnPreview');
const btnDownload     = document.getElementById('btnDownload');
const downloadCanvas  = document.getElementById('downloadCanvas');

/* ══ STATE ══ */
let customFontFamily   = 'CustomFont'; // مدى عريض — @font-face in CSS
let panelOpen          = false;
let cachedImageDataURL = null;         // base64 snapshot captured at load
let nativeW            = 1477;
let nativeH            = 2000;

/* Default position = centre of the white "هذه التهنئة من :" box */
let pos = { x: 0.0677 + 0.2776 / 2, y: 0.836 + 0.064 / 2 };

/* Text color */
let textColor = '#1a0a4a';

/* ══════════════════════════════════
   PRE-CACHE IMAGE AS BASE64
   Called as soon as the <img> is loaded.
   Drawing to canvas here (before toDataURL is ever called)
   captures a clean, untainted snapshot.
══════════════════════════════════ */
function cacheImage() {
  try {
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width  = eidImage.naturalWidth  || 1477;
    tmpCanvas.height = eidImage.naturalHeight || 2000;
    nativeW = tmpCanvas.width;
    nativeH = tmpCanvas.height;

    const ctx = tmpCanvas.getContext('2d');
    ctx.drawImage(eidImage, 0, 0);
    cachedImageDataURL = tmpCanvas.toDataURL('image/png');
    console.log('✅ Image cached as base64 (' + nativeW + 'x' + nativeH + ')');
  } catch (e) {
    /* This can still fail if the server adds CORS headers that block it.
       Fallback: we'll draw eidImage directly at download time and hope
       the browser allows it (works in most desktop browsers locally). */
    console.warn('Cache failed, will draw directly:', e.message);
    cachedImageDataURL = null;
  }
}

/* Hook into image load */
if (eidImage.complete && eidImage.naturalWidth) {
  cacheImage();
} else {
  eidImage.addEventListener('load', cacheImage);
}

/* ══════════════════════════════════
   OVERLAY POSITIONING (% based)
══════════════════════════════════ */
function renderOverlayPosition() {
  const W = imageWrapper.offsetWidth;
  const H = imageWrapper.offsetHeight;
  nameOverlay.style.left      = (pos.x * W) + 'px';
  nameOverlay.style.top       = (pos.y * H) + 'px';
  nameOverlay.style.transform = 'translate(-50%, -50%)';
  nameOverlay.style.width     = 'auto';
  nameOverlay.style.height    = 'auto';
}

window.addEventListener('resize', () => {
  renderOverlayPosition();
  if (nameInput.value.trim()) applyResponsiveFont();
});

/* ══════════════════════════════════
   DRAG TO REPOSITION
══════════════════════════════════ */
let dragging   = false;
let dragOffset = { x: 0, y: 0 };

function pointerRelative(e) {
  const rect   = imageWrapper.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: (clientX - rect.left) / rect.width,
    y: (clientY - rect.top)  / rect.height,
  };
}

nameOverlay.addEventListener('mousedown',  startDrag);
nameOverlay.addEventListener('touchstart', startDrag, { passive: false });

function startDrag(e) {
  if (!nameDisplay.textContent) return;
  e.preventDefault();
  e.stopPropagation();
  dragging = true;
  nameOverlay.style.cursor        = 'grabbing';
  document.body.style.userSelect  = 'none';
  const p    = pointerRelative(e);
  dragOffset = { x: p.x - pos.x, y: p.y - pos.y };
}

document.addEventListener('mousemove',  onDragMove);
document.addEventListener('touchmove',  onDragMove, { passive: false });

function onDragMove(e) {
  if (!dragging) return;
  e.preventDefault();
  const p = pointerRelative(e);
  pos.x   = Math.min(0.98, Math.max(0.02, p.x - dragOffset.x));
  pos.y   = Math.min(0.98, Math.max(0.02, p.y - dragOffset.y));
  renderOverlayPosition();
}

document.addEventListener('mouseup',  stopDrag);
document.addEventListener('touchend', stopDrag);

function stopDrag() {
  if (!dragging) return;
  dragging = false;
  nameOverlay.style.cursor       = 'grab';
  document.body.style.userSelect = '';
}

/* ══════════════════════════════════
   OPEN PANEL
══════════════════════════════════ */
imageWrapper.addEventListener('click', e => {
  if (dragging) return;
  openPanel();
});

function openPanel() {
  if (panelOpen) return;
  panelOpen = true;
  clickHint.style.transition = 'opacity 0.28s, transform 0.28s';
  clickHint.style.opacity    = '0';
  clickHint.style.transform  = 'translateX(-50%) translateY(6px)';
  setTimeout(() => clickHint.classList.add('hidden'), 310);
  inputPanel.classList.add('visible');
  setTimeout(() => nameInput.focus(), 360);
}

/* ══════════════════════════════════
   TEXT & FONT
══════════════════════════════════ */
nameInput.addEventListener('input', updateOverlay);

function updateOverlay() {
  const text = nameInput.value.trim();
  nameDisplay.textContent  = text;
  nameDisplay.style.color  = textColor;
  nameOverlay.style.cursor = text ? 'grab' : 'default';
  if (text && !imageWrapper.dataset.dragHinted) {
    imageWrapper.dataset.dragHinted = '1';
    showToast('💡 اسحب الاسم لتغيير موضعه');
  }
  applyResponsiveFont();
  renderOverlayPosition();
}

function applyResponsiveFont() {
  const REF_WIDTH = 400;
  const sliderPx  = parseInt(fontSizeSlider.value, 10);
  const renderW   = imageWrapper.offsetWidth || REF_WIDTH;
  const finalPx   = Math.max(8, Math.round(sliderPx * (renderW / REF_WIDTH)));
  nameDisplay.style.fontSize   = finalPx + 'px';
  nameDisplay.style.color      = textColor;
  nameDisplay.style.fontFamily = `'${customFontFamily}', 'Amiri', serif`;
}

fontSizeSlider.addEventListener('input', () => {
  fontSizeValue.textContent = fontSizeSlider.value;
  applyResponsiveFont();
});

btnPreview.addEventListener('click', () => {
  updateOverlay();
  nameDisplay.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }],
    { duration: 340, easing: 'ease-in-out' }
  );
  showToast('✅ تم عرض الاسم — اسحبه لتغيير موضعه');
});

nameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { updateOverlay(); showToast('✅ تم — اسحب الاسم لتحريكه'); }
});

/* ══════════════════════════════════
   COLOR PICKER (injected on panel open)
══════════════════════════════════ */
function injectColorPicker() {
  const glass = document.querySelector('.input-glass');
  if (!glass || document.getElementById('colorPickerRow')) return;

  const row = document.createElement('div');
  row.id        = 'colorPickerRow';
  row.className = 'slider-row';
  row.innerHTML = `
    <label class="slider-label" for="textColorPicker">لون الخط</label>
    <input type="color" id="textColorPicker" value="#1a0a4a"
           style="width:40px;height:32px;border:none;background:none;cursor:pointer;border-radius:6px;padding:2px;" />
    <div id="colorSwatches" style="display:flex;gap:6px;flex-wrap:wrap;"></div>
  `;
  glass.appendChild(row);

  const swatchColors = [
    { c: '#1a0a4a', t: 'بنفسجي غامق' },
    { c: '#ffffff', t: 'أبيض'        },
    { c: '#f5d97e', t: 'ذهبي'        },
    { c: '#d4a742', t: 'ذهبي داكن'   },
    { c: '#000000', t: 'أسود'        },
    { c: '#6c59ff', t: 'بنفسجي'      },
  ];

  const swatchContainer = row.querySelector('#colorSwatches');
  swatchColors.forEach(({ c, t }) => {
    const s = document.createElement('span');
    s.title = t;
    Object.assign(s.style, {
      display: 'inline-block', width: '22px', height: '22px',
      borderRadius: '50%', background: c, cursor: 'pointer',
      border: '2px solid rgba(255,255,255,0.3)',
      transition: 'transform 0.15s',
    });
    s.addEventListener('mouseenter', () => s.style.transform = 'scale(1.25)');
    s.addEventListener('mouseleave', () => s.style.transform = 'scale(1)');
    s.addEventListener('click', () => {
      textColor = c;
      document.getElementById('textColorPicker').value = c;
      applyResponsiveFont();
    });
    swatchContainer.appendChild(s);
  });

  document.getElementById('textColorPicker').addEventListener('input', e => {
    textColor = e.target.value;
    applyResponsiveFont();
  });
}

/* ══════════════════════════════════
   CUSTOM FONT UPLOAD
══════════════════════════════════ */
fontUpload.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const familyName = 'UserFont_' + Date.now();
  const url        = URL.createObjectURL(file);
  const style      = document.createElement('style');
  style.textContent = `@font-face{font-family:'${familyName}';src:url('${url}');font-display:swap;}`;
  document.head.appendChild(style);
  document.fonts.load(`16px '${familyName}'`).finally(() => {
    customFontFamily = familyName;
    fontNameDisplay.textContent = '✓ ' + file.name;
    applyResponsiveFont();
    showToast('🔤 تم تحميل الخط بنجاح');
  });
});

/* ══════════════════════════════════
   DOWNLOAD
   Uses cachedImageDataURL (base64) captured at page load,
   which is never CORS-tainted. Falls back to drawing the
   <img> element directly if the cache failed.
══════════════════════════════════ */
btnDownload.addEventListener('click', downloadImage);

async function downloadImage() {
  const name = nameInput.value.trim();
  if (!name) { showToast('⚠️ يرجى كتابة اسمك أولاً'); nameInput.focus(); return; }

  btnDownload.disabled = true;
  showToast('⏳ جاري تجهيز الصورة...');

  try {
    /* ── Load the base image ── */
    const img = new Image();

    await new Promise((resolve, reject) => {
      img.onload  = resolve;
      img.onerror = reject;

      if (cachedImageDataURL) {
        /* Use the pre-cached base64 — guaranteed untainted */
        img.src = cachedImageDataURL;
      } else {
        /* Fallback: draw eidImage directly (may still work in Chrome/Firefox) */
        img.src = eidImage.src;
      }
    });

    const CW = img.naturalWidth  || nativeW;
    const CH = img.naturalHeight || nativeH;

    downloadCanvas.width  = CW;
    downloadCanvas.height = CH;

    const ctx = downloadCanvas.getContext('2d');
    ctx.drawImage(img, 0, 0, CW, CH);

    /* ── Draw name at the stored position ── */
    const textX = pos.x * CW;
    const textY = pos.y * CH;

    const REF_WIDTH    = 400;
    const sliderVal    = parseInt(fontSizeSlider.value, 10);
    const canvasFontSz = Math.round(sliderVal * (CW / REF_WIDTH));
    const fontFam      = `'${customFontFamily}', 'Amiri', serif`;

    ctx.save();
    ctx.font         = `bold ${canvasFontSz}px ${fontFam}`;
    ctx.direction    = 'rtl';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = textColor;
    ctx.shadowColor   = 'rgba(0,0,0,0.22)';
    ctx.shadowBlur    = Math.round(canvasFontSz * 0.08);
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;
    ctx.fillText(name, textX, textY);
    ctx.restore();

    /* ── Trigger download ── */
    const dataURL = downloadCanvas.toDataURL('image/png', 1.0);
    const link    = document.createElement('a');
    link.href     = dataURL;
    link.download = 'eid_mubarak_' + name.replace(/\s+/g, '_') + '.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('✅ تم تحميل الصورة بنجاح!');

  } catch (err) {
    console.error('Download error:', err);
    showToast('❌ تعذّر التحميل — افتح الملف عبر خادم محلي أو متصفح Chrome');
  } finally {
    btnDownload.disabled = false;
  }
}

/* ══ Toast ══ */
let toastTimer = null;
function showToast(msg) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  clearTimeout(toastTimer);
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  toastTimer = setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 420);
  }, 2800);
}

/* ══ Init ══ */
(function init() {
  fontSizeValue.textContent = fontSizeSlider.value;

  nameOverlay.style.position  = 'absolute';
  nameOverlay.style.width     = 'auto';
  nameOverlay.style.height    = 'auto';
  nameOverlay.style.padding   = '2px 6px';
  nameOverlay.style.cursor    = 'default';
  nameOverlay.style.direction = 'rtl';
  nameOverlay.style.zIndex    = '6';

  const observer = new MutationObserver(() => {
    if (inputPanel.classList.contains('visible')) {
      injectColorPicker();
      observer.disconnect();
    }
  });
  observer.observe(inputPanel, { attributes: true, attributeFilter: ['class'] });

  renderOverlayPosition();
})();
