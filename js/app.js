/* Programming Chapters Archive — app logic */
let currentChapter = null, visibleCerts = [], modalIndex = -1, modalPushed = false;
let shareTarget = null, view = 'grid', sortMode = 'default', favOnly = false, chFilter = 'all', letterFilter = '';

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, '0');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const ICON = {
  share: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
  heart: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z"/></svg>'
};

/* ---------------- Slugs + shareable links ---------------- */
// الرابط = اسم الطالب + رقم الشابتر  →  #chapter-2/hana-mohamed
const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
chaptersData.forEach((ch) => {
  const seen = {};
  ch.certificates.forEach((c) => {
    const s = c.slug || slugify(c.studentName);
    seen[s] = (seen[s] || 0) + 1;
    c.slug = seen[s] > 1 ? `${s}-${seen[s]}` : s;
    c.chapter = ch.id;
  });
});
const baseUrl = () => location.href.split('#')[0];
const chapterUrl = (ch) => `${baseUrl()}#chapter-${ch.id}`;
const certUrl = (c) => `${baseUrl()}#chapter-${c.chapter}/${c.slug}`;

/* Multi-chapter students (same name across chapters) */
const nameCount = {};
chaptersData.forEach((ch) => ch.certificates.forEach((c) => {
  const k = c.studentName.toLowerCase().trim();
  nameCount[k] = (nameCount[k] || 0) + 1;
}));
const isMulti = (c) => (nameCount[c.studentName.toLowerCase().trim()] || 0) > 1;

/* ---------------- Helpers ---------------- */
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 1900);
}
async function copyText(text, msg = 'Link copied ✓') {
  try { await navigator.clipboard.writeText(text); }
  catch (e) {
    const a = document.createElement('textarea'); a.value = text; document.body.appendChild(a); a.select();
    try { document.execCommand('copy'); } catch (_) {} a.remove();
  }
  toast(msg);
}
function countUp(el, to, suffix = '') {
  const t0 = performance.now();
  (function f(t) {
    const p = Math.min((t - t0) / 900, 1);
    el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))) + suffix;
    if (p < 1) requestAnimationFrame(f);
  })(t0);
}
const favKey = (c) => `${c.chapter}/${c.slug}`;
let favs = store.get('favs', []);
const isFav = (c) => favs.includes(favKey(c));

/* ---------------- Theme ---------------- */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#F4F7FB' : '#0B0D12');
  const btn = $('theme-toggle');
  if (btn) btn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
}
function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  applyTheme(next);
  try { localStorage.setItem('theme', next); } catch (e) {}
}

/* ---------------- Router ---------------- */
function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  $(id).classList.add('active');
  window.scrollTo(0, 0);
  if (id === 'intro-screen') renderStats();
}
function nav(hash) {
  history.pushState(null, '', hash ? '#' + hash : baseUrl());
  route();
}
function route() {
  closeModal(); closeShare();
  const h = decodeURIComponent(location.hash.slice(1));
  if (!h) return show('intro-screen');
  if (h === 'chapters') return show('chapters-screen');
  if (h === 'links') { renderLinks(); return show('links-screen'); }
  const m = h.match(/^(?:chapter|certs|tbc)-(\d+)(?:\/(.+))?$/);
  const ch = m && chaptersData.find((c) => c.id === +m[1]);
  if (!ch) return show('chapters-screen');
  if (ch.status !== 'completed') { currentChapter = ch; renderToBeContinued(ch); return show('tbc-screen'); }
  if (!(currentChapter === ch && $('certs-screen').classList.contains('active'))) {
    currentChapter = ch; renderCertificates(ch); show('certs-screen');
  }
  if (m[2]) {
    const i = visibleCerts.findIndex((c) => c.slug === m[2]);
    if (i > -1) openModal(i, true); else toast('Certificate not found');
  }
}

/* ---------------- Intro stats ---------------- */
function renderStats() {
  const total = chaptersData.length;
  const done = chaptersData.filter((c) => c.status === 'completed').length;
  const certs = chaptersData.reduce((n, c) => n + c.certificates.length, 0);
  $('intro-stats').innerHTML = `
    <div class="stat"><b data-n="${certs}">0</b><span>CERTIFICATES</span></div>
    <div class="stat"><b data-n="${done}" data-s="/${total}">0</b><span>CHAPTERS DONE</span></div>`;
  $('intro-stats').querySelectorAll('b').forEach((b) => countUp(b, +b.dataset.n, b.dataset.s || ''));
  $('chapters-count').textContent = `${total} CHAPTERS`;
}

/* ---------------- Chapters ---------------- */
function renderChapters() {
  const container = $('chapters-list');
  container.innerHTML = '';
  chaptersData
    .filter((ch) => chFilter === 'all' || (chFilter === 'done') === (ch.status === 'completed'))
    .forEach((ch, i) => {
      const done = ch.status === 'completed';
      const card = document.createElement('div');
      card.className = 'chapter-card' + (done ? '' : ' upcoming');
      card.dataset.num = pad(ch.id);
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.style.animationDelay = `${i * 0.06}s`;
      card.addEventListener('click', (e) => { if (!e.target.closest('[data-copy]')) nav('chapter-' + ch.id); });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nav('chapter-' + ch.id); }
      });
      card.innerHTML = `
        <div class="chapter-info">
          <div class="chapter-number">${pad(ch.id)}</div>
          <div class="chapter-title">${esc(ch.title.toUpperCase())}</div>
          <div class="chapter-meta">
            <span class="chapter-status ${done ? 'status-completed' : 'status-upcoming'}">${done ? 'CERTIFICATES AVAILABLE' : 'TO BE CONTINUED'}</span>
            ${done ? `<span class="chapter-count">${ch.certificates.length} students</span>` : ''}
          </div>
        </div>
        <div class="chapter-side">
          <button class="mini-btn" data-copy="${esc(chapterUrl(ch))}" title="Copy chapter link" aria-label="Copy chapter link">${ICON.share}</button>
          <div class="chapter-arrow">↗</div>
        </div>`;
      container.appendChild(card);
    });
}

/* ---------------- Certificates ---------------- */
const io = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0.08 })
  : null;

function renderCertificates(ch) {
  $('certs-chapter-title').textContent = `CHAPTER ${pad(ch.id)}`;
  $('certs-subtitle').textContent = `Celebrating the students who completed ${ch.title}.`;
  $('cert-search').value = '';
  letterFilter = '';
  drawCertGrid();
}

function drawCertGrid() {
  const ch = currentChapter, grid = $('certs-grid');
  const q = $('cert-search').value.trim().toLowerCase();
  visibleCerts = ch.certificates.filter((c) => {
    if (q && !c.studentName.toLowerCase().includes(q)) return false;
    if (favOnly && !isFav(c)) return false;
    if (letterFilter) {
      const first = c.studentName.trim().charAt(0).toUpperCase();
      if (first !== letterFilter) return false;
    }
    return true;
  });
  if (sortMode !== 'default') {
    visibleCerts.sort((a, b) => a.studentName.localeCompare(b.studentName) * (sortMode === 'za' ? -1 : 1));
  }
  grid.className = 'certs-grid' + (view === 'list' ? ' list' : '');
  const filtered = q || favOnly || letterFilter;
  $('search-count').textContent = filtered ? `${visibleCerts.length} / ${ch.certificates.length}` : `${ch.certificates.length} certificates`;
  $('view-toggle').textContent = view === 'list' ? '▦ Grid view' : '☰ List view';
  $('fav-filter').classList.toggle('on', favOnly);
  buildLetterBar(ch);

  if (ch.certificates.length === 0) {
    grid.innerHTML = '<div class="no-results"><div class="big">📭</div><p>Certificates will be added soon.</p></div>';
    return;
  }
  if (visibleCerts.length === 0) {
    const msg = favOnly ? 'No favorites yet — tap the heart on a certificate.'
      : letterFilter ? `No students starting with “${letterFilter}”.`
      : 'No student matches your search.';
    grid.innerHTML = `<div class="no-results"><div class="big">🔍</div><p>${msg}</p></div>`;
    return;
  }

  grid.innerHTML = visibleCerts.map((c, i) => `
    <div class="cert-card reveal" data-i="${i}">
      <div class="cert-thumb">
        <img class="cert-image" src="${esc(c.image)}" alt="Certificate — ${esc(c.studentName)}" loading="lazy">
        <span class="shine"></span>
        <button class="icon-btn fav ${isFav(c) ? 'on' : ''}" data-a="fav" type="button" aria-label="Favorite">${ICON.heart}</button>
      </div>
      <div class="cert-info">
        <div class="student-name">${esc(c.studentName)}${isMulti(c) ? ' <span class="multi-badge" title="Appears in multiple chapters">★ Multi</span>' : ''}</div>
        <div class="cert-actions">
          <button class="view-btn" data-a="view" type="button">VIEW CERTIFICATE</button>
          <button class="view-btn share-btn" data-a="share" type="button" aria-label="Share ${esc(c.studentName)}">${ICON.share}<span>SHARE</span></button>
        </div>
      </div>
    </div>`).join('');
  grid.querySelectorAll('.cert-card').forEach((el) => io ? io.observe(el) : el.classList.add('in'));
}

function buildLetterBar(ch) {
  const bar = $('letter-bar');
  if (!bar) return;
  const counts = {};
  ch.certificates.forEach((c) => {
    const L = c.studentName.trim().charAt(0).toUpperCase();
    if (/[A-Z]/.test(L)) counts[L] = (counts[L] || 0) + 1;
  });
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  bar.innerHTML = `<button class="letter-chip ${!letterFilter ? 'on' : ''}" data-l="" type="button" title="All">All</button>` +
    letters.map((L) => {
      const n = counts[L] || 0;
      return `<button class="letter-chip ${letterFilter === L ? 'on' : ''} ${n ? '' : 'empty'}" data-l="${L}" type="button" title="${n} student${n === 1 ? '' : 's'}">${L}</button>`;
    }).join('');
}

/* ---------------- Links hub ---------------- */
function linkRow(label, url, external) {
  return `<div class="link-row"><a href="${esc(url)}"${external ? ' target="_blank" rel="noopener"' : ''}>${esc(label)}</a><span class="link-url">${esc(url)}</span><button class="mini-btn" data-copy="${esc(url)}" type="button" aria-label="Copy link">${ICON.share}</button></div>`;
}
function renderLinks() {
  let h = (typeof linksData !== 'undefined' ? linksData : []).map((g) =>
    `<div class="link-group"><h3>${esc(g.group)}</h3>${g.items.map((i) => linkRow(i.label, i.url, true)).join('')}</div>`).join('');
  h += '<div class="link-group"><h3>Chapters &amp; certificates</h3>' + chaptersData.map((ch) => {
    const done = ch.status === 'completed';
    return `<details class="chapter-links"><summary><span>CHAPTER ${pad(ch.id)}</span><span class="chapter-count">${done ? ch.certificates.length + ' students' : 'upcoming'}</span>
      <button class="mini-btn" data-copy="${esc(chapterUrl(ch))}" type="button" aria-label="Copy chapter link">${ICON.share}</button></summary>
      ${linkRow('Chapter page', chapterUrl(ch))}${ch.certificates.map((c) => linkRow(c.studentName, certUrl(c))).join('')}</details>`;
  }).join('') + '</div>';
  const fl = chaptersData.flatMap((ch) => ch.certificates).filter(isFav);
  if (fl.length) h = `<div class="link-group"><h3>♥ My favorites</h3>${fl.map((c) => linkRow(`${c.studentName} · Chapter ${pad(c.chapter)}`, certUrl(c))).join('')}</div>` + h;
  $('links-list').innerHTML = h;
}

/* ---------------- To be continued ---------------- */
function renderToBeContinued(ch) {
  $('tbc-number').textContent = pad(ch.id);
  $('tbc-title').textContent = `CHAPTER ${pad(ch.id)}`;
  $('tbc-message').textContent = 'CONTENT NOT RELEASED';
  document.querySelectorAll('.terminal-line').forEach((line, i) => {
    line.style.animation = 'none'; void line.offsetWidth; line.style.animation = '';
    line.style.animationDelay = `${i * 0.35}s`;
  });
}

/* ---------------- Modal ---------------- */
function openModal(index, fromRoute) {
  modalIndex = index;
  const c = visibleCerts[index];
  if (!fromRoute && c) { history.pushState(null, '', `#chapter-${c.chapter}/${c.slug}`); modalPushed = true; }
  else if (fromRoute) modalPushed = false;
  updateModal(0);
  $('certificate-modal').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function updateModal(dir) {
  const cert = visibleCerts[modalIndex];
  if (!cert) return;
  const img = $('modal-image');
  img.classList.remove('zoomed', 'swap-next', 'swap-prev'); void img.offsetWidth;
  img.src = cert.image; img.alt = `Certificate — ${cert.studentName}`;
  if (dir) img.classList.add(dir > 0 ? 'swap-next' : 'swap-prev');
  $('modal-student').textContent = cert.studentName;
  $('modal-index').textContent = `CHAPTER ${pad(cert.chapter)} · ${modalIndex + 1} / ${visibleCerts.length}`;
  $('modal-prev').hidden = $('modal-next').hidden = visibleCerts.length < 2;
}
function stepModal(dir) {
  if (visibleCerts.length < 2) return;
  modalIndex = (modalIndex + dir + visibleCerts.length) % visibleCerts.length;
  const c = visibleCerts[modalIndex];
  history.replaceState(null, '', `#chapter-${c.chapter}/${c.slug}`);
  updateModal(dir);
}
function closeModal() {
  stopPlay();
  $('certificate-modal').classList.remove('active');
  document.body.style.overflow = '';
}
function userCloseModal() {
  if (modalPushed) { modalPushed = false; history.back(); return; }
  history.replaceState(null, '', '#chapter-' + currentChapter.id);
  closeModal();
}
function downloadCertificate(cert = visibleCerts[modalIndex]) {
  if (!cert) return;
  const a = document.createElement('a');
  a.href = cert.image; a.download = cert.image.split('/').pop();
  document.body.appendChild(a); a.click(); a.remove();
}

/* ---------------- Share sheet ---------------- */
function openShare(c) {
  shareTarget = c;
  const url = certUrl(c), text = `${c.studentName} — Chapter ${pad(c.chapter)} certificate`;
  $('share-sub').textContent = `CHAPTER ${pad(c.chapter)}`;
  $('share-title').textContent = c.studentName;
  $('share-link').value = url;
  $('share-wa').href = 'https://wa.me/?text=' + encodeURIComponent(text + '\n' + url);
  $('share-tg').href = 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text);
  $('share-fb').href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url);
  $('share-native').hidden = !navigator.share;
  $('share-img').hidden = !navigator.canShare;
  $('share-modal').classList.add('active');
}
function closeShare() { $('share-modal').classList.remove('active'); }

/* ---------------- Init ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(document.documentElement.getAttribute('data-theme') || 'dark');
  view = store.get('view', 'grid');
  renderChapters();
  initExtras();
  const deep = /\/./.test(location.hash);
  route();
  if (deep) setTimeout(confetti, 500);

  $('theme-toggle').addEventListener('click', toggleTheme);
  $('start-btn').addEventListener('click', () => nav('chapters'));
  $('back-to-welcome').addEventListener('click', () => nav(''));
  $('open-links').addEventListener('click', () => nav('links'));
  $('footer-links').addEventListener('click', (e) => { e.preventDefault(); nav('links'); });
  $('links-back').addEventListener('click', () => nav('chapters'));
  document.querySelectorAll('.back-to-chapters').forEach((btn) => btn.addEventListener('click', () => nav('chapters')));

  $('chapter-filters').addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    chFilter = b.dataset.f;
    document.querySelectorAll('#chapter-filters .chip').forEach((x) => x.classList.toggle('on', x === b));
    renderChapters();
  });

  $('cert-search').addEventListener('input', drawCertGrid);
  $('cert-sort').addEventListener('change', (e) => { sortMode = e.target.value; drawCertGrid(); });
  $('view-toggle').addEventListener('click', () => { view = view === 'list' ? 'grid' : 'list'; store.set('view', view); drawCertGrid(); });
  $('fav-filter').addEventListener('click', () => { favOnly = !favOnly; drawCertGrid(); });
  $('copy-chapter').addEventListener('click', () => copyText(chapterUrl(currentChapter)));
  $('copy-all').addEventListener('click', () => copyText(
    currentChapter.certificates.map((c) => `${c.studentName}: ${certUrl(c)}`).join('\n'), 'All student links copied ✓'));

  $('certs-grid').addEventListener('click', (e) => {
    const card = e.target.closest('.cert-card'); if (!card) return;
    const i = +card.dataset.i, c = visibleCerts[i];
    const a = (e.target.closest('[data-a]') || {}).dataset?.a || 'view';
    if (a === 'share') openShare(c);
    else if (a === 'fav') {
      favs = isFav(c) ? favs.filter((k) => k !== favKey(c)) : [...favs, favKey(c)];
      store.set('favs', favs);
      if (favOnly) drawCertGrid(); else e.target.closest('.fav').classList.toggle('on', isFav(c));
    } else openModal(i);
  });
  // 3D tilt on desktop
  const grid = $('certs-grid');
  grid.addEventListener('pointermove', (e) => {
    const c = e.target.closest('.cert-card');
    if (!c || e.pointerType !== 'mouse' || grid.classList.contains('list')) return;
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    c.style.setProperty('--ry', ((x - 0.5) * 9).toFixed(2) + 'deg');
    c.style.setProperty('--rx', ((0.5 - y) * 9).toFixed(2) + 'deg');
    c.style.setProperty('--mx', (x * 100) + '%');
  });
  grid.addEventListener('pointerout', (e) => {
    const c = e.target.closest('.cert-card');
    if (c) { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); }
  });

  document.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    if (go) nav(go.dataset.go);
    const cp = e.target.closest('[data-copy]');
    if (cp) { e.preventDefault(); copyText(cp.dataset.copy); }
    const b = e.target.closest('.view-btn, .start-btn, .mini-btn, .tool-btn');
    if (b) {   // ripple
      const r = b.getBoundingClientRect(), s = document.createElement('span'), d = Math.max(r.width, r.height);
      s.className = 'ripple'; s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
      b.appendChild(s); setTimeout(() => s.remove(), 600);
    }
  });

  $('close-modal').addEventListener('click', userCloseModal);
  $('modal-prev').addEventListener('click', () => stepModal(-1));
  $('modal-next').addEventListener('click', () => stepModal(1));
  $('download-btn').addEventListener('click', () => downloadCertificate());
  $('modal-share').addEventListener('click', () => openShare(visibleCerts[modalIndex]));
  $('modal-image').addEventListener('click', (e) => {
    const img = e.currentTarget, r = img.getBoundingClientRect();
    img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
    img.classList.toggle('zoomed');
  });
  $('certificate-modal').addEventListener('click', (e) => { if (e.target.id === 'certificate-modal') userCloseModal(); });

  $('share-close').addEventListener('click', closeShare);
  $('share-modal').addEventListener('click', (e) => { if (e.target.id === 'share-modal') closeShare(); });
  $('share-copy').addEventListener('click', () => copyText($('share-link').value));
  $('share-link').addEventListener('focus', (e) => e.target.select());
  $('share-native').addEventListener('click', () => {
    if (shareTarget) navigator.share({ title: shareTarget.studentName, text: `${shareTarget.studentName} — Chapter ${pad(shareTarget.chapter)}`, url: certUrl(shareTarget) }).catch(() => {});
  });

  document.addEventListener('keydown', (e) => {
    if ($('share-modal').classList.contains('active')) { if (e.key === 'Escape') closeShare(); return; }
    if (!$('certificate-modal').classList.contains('active')) return;
    if (e.key === 'Escape') userCloseModal();
    if (e.key === 'ArrowLeft') stepModal(-1);
    if (e.key === 'ArrowRight') stepModal(1);
  });
});

window.addEventListener('popstate', route);

/* ---------------- Extra options (v3) ---------------- */
let playTimer = null;
function stopPlay() {
  clearInterval(playTimer); playTimer = null;
  const b = $('modal-play'); if (b) { b.textContent = '▶'; b.classList.remove('on'); }
}
function togglePlay() {
  if (playTimer) return stopPlay();
  playTimer = setInterval(() => stepModal(1), 3000);
  $('modal-play').textContent = '❚❚'; $('modal-play').classList.add('on');
}
function toggleFs() {
  if (document.fullscreenElement) document.exitFullscreen();
  else if ($('certificate-modal').requestFullscreen) $('certificate-modal').requestFullscreen();
}

function confetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = $('confetti'), ctx = cv.getContext('2d'), cols = ['#3B82F6', '#22D3EE', '#8B5CF6', '#F59E0B', '#F43F5E', '#22C55E'];
  cv.width = innerWidth; cv.height = innerHeight;
  const ps = Array.from({ length: 120 }, () => ({ x: innerWidth / 2, y: innerHeight * 0.65, vx: (Math.random() - 0.5) * 18, vy: -Math.random() * 17 - 4, s: Math.random() * 7 + 5, r: Math.random() * 6, c: cols[(Math.random() * cols.length) | 0] }));
  let f = 0;
  (function tick() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    ps.forEach((p) => { p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.r += 0.2; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); ctx.restore(); });
    if (++f < 140) requestAnimationFrame(tick); else ctx.clearRect(0, 0, cv.width, cv.height);
  })();
}

async function downloadZip() {
  const ch = currentChapter;
  if (!window.JSZip) return toast('ZIP library not loaded (check internet)');
  const zip = new JSZip();
  try {
    for (let i = 0; i < ch.certificates.length; i++) {
      const c = ch.certificates[i]; toast(`Packing ${i + 1}/${ch.certificates.length}…`);
      const r = await fetch(c.image); if (!r.ok) throw new Error('fetch');
      zip.file(`${c.slug}.${c.image.split('.').pop()}`, await r.blob());
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await zip.generateAsync({ type: 'blob' }));
    a.download = `chapter-${pad(ch.id)}-certificates.zip`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000); toast('ZIP ready ✓');
  } catch (e) { toast('ZIP works only when the site is hosted (not file://)'); }
}

async function shareImage() {
  const c = shareTarget; if (!c) return;
  try {
    const b = await (await fetch(c.image)).blob();
    const f = new File([b], `${c.slug}.${c.image.split('.').pop()}`, { type: b.type || 'image/webp' });
    if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: c.studentName, text: certUrl(c) });
    else downloadCertificate(c);
  } catch (e) { /* cancelled */ }
}

function runGlobalSearch() {
  const q = $('global-search').value.trim().toLowerCase(), box = $('global-results');
  const searching = !!q;
  box.hidden = !searching; $('chapters-list').hidden = $('chapter-filters').hidden = searching;
  if (!searching) { $('global-count').textContent = ''; return; }
  const rows = chaptersData.flatMap((ch) => ch.certificates).filter((c) => c.studentName.toLowerCase().includes(q))
    .sort((a, b) => a.studentName.localeCompare(b.studentName) || a.chapter - b.chapter);
  $('global-count').textContent = `${rows.length} found`;
  box.innerHTML = rows.length ? rows.map((c) => `
    <div class="gr-row"><div class="gr-name"><b>${esc(c.studentName)}</b><span class="chapter-status status-completed">CHAPTER ${pad(c.chapter)}</span></div>
    <div class="gr-actions"><button class="view-btn" data-go="chapter-${c.chapter}/${esc(c.slug)}" type="button">VIEW</button>
    <button class="mini-btn" data-copy="${esc(certUrl(c))}" type="button" aria-label="Copy link">${ICON.share}</button></div></div>`).join('')
    : '<p class="no-results">No student matches your search.</p>';
}



function openHelp() { $('help-modal').classList.add('active'); }
function closeHelp() { $('help-modal').classList.remove('active'); }

function toggleDensity() {
  const compact = document.body.classList.toggle('density-compact');
  store.set('density', compact ? 'compact' : 'comfortable');
  const b = $('density-toggle');
  if (b) b.textContent = compact ? '⊟ Comfortable' : '⊞ Compact';
  toast(compact ? 'Compact view' : 'Comfortable view');
}

function initExtras() {
  // accent colors
  const ACC = ['blue', 'violet', 'green', 'orange', 'rose'];
  let acc = store.get('accent', 'blue');
  const setAcc = (a) => { acc = a; document.documentElement.setAttribute('data-accent', a); store.set('accent', a); };
  setAcc(ACC.includes(acc) ? acc : 'blue');
  $('accent-toggle').addEventListener('click', () => { setAcc(ACC[(ACC.indexOf(acc) + 1) % ACC.length]); toast(`Accent: ${acc}`); });

  $('global-search').addEventListener('input', runGlobalSearch);
  $('zip-all').addEventListener('click', downloadZip);
  $('celebrate').addEventListener('click', confetti);
  $('modal-play').addEventListener('click', togglePlay);
  $('modal-fs').addEventListener('click', toggleFs);
  $('modal-print').addEventListener('click', () => window.print());
  $('share-img').addEventListener('click', shareImage);
  $('to-top').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // scroll progress + back-to-top
  window.addEventListener('scroll', () => {
    const h = document.documentElement.scrollHeight - innerHeight, y = window.scrollY;
    $('progress').style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    $('to-top').classList.toggle('show', y > 500);
  }, { passive: true });

  // keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) || e.ctrlKey || e.metaKey) return;
    const modalOpen = $('certificate-modal').classList.contains('active');
    const helpOpen = $('help-modal') && $('help-modal').classList.contains('active');
    if (helpOpen) { if (e.key === 'Escape') closeHelp(); return; }
    if (e.key === '/') {
      const el = $('certs-screen').classList.contains('active') ? $('cert-search') : $('chapters-screen').classList.contains('active') ? $('global-search') : null;
      if (el) { e.preventDefault(); el.focus(); }
    } else if (e.key === '?' || (e.shiftKey && e.key === '/')) { e.preventDefault(); openHelp(); }
    else if (e.key.toLowerCase() === 't' && !modalOpen) toggleTheme();
    else if (e.key.toLowerCase() === 'a' && !modalOpen) $('accent-toggle').click();
    else if (e.key.toLowerCase() === 'c' && !modalOpen) confetti();
    else if (modalOpen && e.key.toLowerCase() === 's') openShare(visibleCerts[modalIndex]);
    else if (modalOpen && e.key.toLowerCase() === 'f') toggleFs();
  });

  // letter filter
  const letterBar = $('letter-bar');
  if (letterBar) letterBar.addEventListener('click', (e) => {
    const b = e.target.closest('.letter-chip'); if (!b || b.classList.contains('empty')) return;
    letterFilter = b.dataset.l || '';
    drawCertGrid();
  });

  // density / help
  const dens = $('density-toggle'); if (dens) dens.addEventListener('click', toggleDensity);
  const helpB = $('help-btn'); if (helpB) helpB.addEventListener('click', openHelp);
  const helpC = $('help-close'); if (helpC) helpC.addEventListener('click', closeHelp);
  const helpM = $('help-modal'); if (helpM) helpM.addEventListener('click', (e) => { if (e.target.id === 'help-modal') closeHelp(); });

  // restore density
  if (store.get('density', 'comfortable') === 'compact') {
    document.body.classList.add('density-compact');
    if (dens) dens.textContent = '⊟ Comfortable';
  }
}
