// ── MediaVault Shared JS ──────────────────────────────────────────────────

const STORAGE_KEY = 'mediavault_data';

const DEFAULT_DATA = {
  media: [
    { id: 1, title: 'Golden Hour Landscape', type: 'image', category: 'Nature', src: '', thumb: '', caption: 'A beautiful golden hour landscape photo showcasing nature at its finest.', likes: 42, loves: 18, downloads: 130, status: 'active', date: '2026-03-01' },
    { id: 2, title: 'City Time-lapse', type: 'video', category: 'Urban', src: '', thumb: '', caption: 'Stunning city time-lapse captured at night showing busy streets and lights.', likes: 98, loves: 55, downloads: 210, status: 'active', date: '2026-03-02' },
    { id: 3, title: 'Ocean Waves', type: 'image', category: 'Nature', src: '', thumb: '', caption: 'Peaceful ocean waves crashing on a sandy beach during sunset.', likes: 67, loves: 31, downloads: 88, status: 'active', date: '2026-03-03' },
    { id: 4, title: 'Mountain Hiking Trail', type: 'video', category: 'Adventure', src: '', thumb: '', caption: 'An amazing hiking trail through the mountains with breathtaking views.', likes: 55, loves: 22, downloads: 105, status: 'active', date: '2026-03-04' },
    { id: 5, title: 'Street Art Collection', type: 'image', category: 'Art', src: '', thumb: '', caption: 'Colorful street art from around the world collected in one gallery.', likes: 120, loves: 75, downloads: 300, status: 'active', date: '2026-03-05' },
    { id: 6, title: 'Cooking Tutorial', type: 'video', category: 'Lifestyle', src: '', thumb: '', caption: 'Step by step cooking tutorial for making a delicious pasta dish.', likes: 88, loves: 44, downloads: 195, status: 'pending', date: '2026-03-06' },
    { id: 7, title: 'Wildlife Photography', type: 'image', category: 'Nature', src: '', thumb: '', caption: 'Amazing wildlife photography showing animals in their natural habitat.', likes: 200, loves: 110, downloads: 450, status: 'active', date: '2026-03-07' },
    { id: 8, title: 'Dance Performance', type: 'video', category: 'Arts', src: '', thumb: '', caption: 'A breathtaking dance performance combining traditional and modern styles.', likes: 310, loves: 170, downloads: 520, status: 'active', date: '2026-03-08' },
  ],
  nextId: 9
};

// ── Storage helpers ──────────────────────────────────────────────────────────

function getData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { ...DEFAULT_DATA };
  } catch { return { ...DEFAULT_DATA }; }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getAllMedia(filter = {}) {
  const { media } = getData();
  let list = media.filter(m => m.status === 'active');
  if (filter.type) list = list.filter(m => m.type === filter.type);
  if (filter.category) list = list.filter(m => m.category === filter.category);
  if (filter.search) {
    const q = filter.search.toLowerCase();
    list = list.filter(m => m.title.toLowerCase().includes(q) || m.category.toLowerCase().includes(q));
  }
  return list;
}

function getMediaById(id) {
  return getData().media.find(m => m.id === parseInt(id));
}

function addMedia(item) {
  const data = getData();
  item.id = data.nextId++;
  item.likes = 0; item.loves = 0; item.downloads = 0;
  item.status = 'pending';
  item.date = new Date().toISOString().split('T')[0];
  data.media.push(item);
  saveData(data);
  return item;
}

function updateMedia(id, updates) {
  const data = getData();
  const idx = data.media.findIndex(m => m.id === parseInt(id));
  if (idx !== -1) { data.media[idx] = { ...data.media[idx], ...updates }; saveData(data); }
}

function deleteMedia(id) {
  const data = getData();
  data.media = data.media.filter(m => m.id !== parseInt(id));
  saveData(data);
}

function incrementLike(id, type) {
  const data = getData();
  const item = data.media.find(m => m.id === parseInt(id));
  if (item) { item[type] = (item[type] || 0) + 1; saveData(data); return item[type]; }
  return 0;
}

function incrementDownload(id) {
  const data = getData();
  const item = data.media.find(m => m.id === parseInt(id));
  if (item) { item.downloads = (item.downloads || 0) + 1; saveData(data); }
}

// ── UI helpers ───────────────────────────────────────────────────────────────

function showToast(msg, duration = 3000) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── Menu toggle ──────────────────────────────────────────────────────────────
function initMenu() {
  const overlay = document.getElementById('menuOverlay');
  const menu = document.getElementById('sideMenu');
  const btnMenu = document.getElementById('btnMenu');
  const btnClose = document.getElementById('btnClose');
  if (!overlay) return;
  btnMenu?.addEventListener('click', () => { overlay.classList.add('open'); menu.classList.add('open'); });
  btnClose?.addEventListener('click', closeMenu);
  overlay.addEventListener('click', closeMenu);
  function closeMenu() { overlay.classList.remove('open'); menu.classList.remove('open'); }
  // menu search
  document.getElementById('menuSearchInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doMenuSearch();
  });
  document.getElementById('menuSearchBtn')?.addEventListener('click', doMenuSearch);
  function doMenuSearch() {
    const q = document.getElementById('menuSearchInput')?.value;
    if (q) window.location.href = `index.html?search=${encodeURIComponent(q)}`;
  }
  // nav links
  document.querySelectorAll('[data-cat]').forEach(el => {
    el.addEventListener('click', () => {
      const cat = el.dataset.cat;
      window.location.href = `index.html?category=${encodeURIComponent(cat)}`;
    });
  });
}

const CATEGORIES = ['Nature', 'Urban', 'Adventure', 'Art', 'Lifestyle', 'Arts', 'Travel', 'Technology', 'Animals', 'Architecture'];

// ── Thumb renderer ──────────────────────────────────────────────────────────
function renderThumb(item, big = false) {
  const icon = item.type === 'video' ? '🎬' : '🖼️';
  if (item.src) {
    if (item.type === 'video') return `<video src="${item.src}" preload="none"></video>`;
    return `<img src="${item.src}" alt="${item.title}" loading="lazy">`;
  }
  return `<div class="thumb-placeholder"><span class="ph-icon">${icon}</span><span>${item.type}</span></div>`;
}
