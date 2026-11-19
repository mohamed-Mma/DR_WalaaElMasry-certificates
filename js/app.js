let currentScreen = 'intro';
let currentChapter = null;

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
  });
  const screen = document.getElementById(screenId);
  if (screen) {
    screen.classList.add('active');
    currentScreen = screenId;
    window.scrollTo(0, 0);
  }
}

function renderChapters() {
  const container = document.getElementById('chapters-list');
  container.innerHTML = '';
  
  chaptersData.forEach(ch => {
    const card = document.createElement('div');
    card.className = 'chapter-card';
    card.onclick = () => openChapter(ch.id);
    
    const statusClass = ch.status === 'completed' ? 'status-completed' : 'status-upcoming';
    const statusText = ch.status === 'completed' ? 'CERTIFICATES AVAILABLE' : 'TO BE CONTINUED';
    
    card.innerHTML = `
      <div class="chapter-info">
        <div class="chapter-number">0${ch.id}</div>
        <div class="chapter-title">${ch.title.toUpperCase()}</div>
        <div class="chapter-status ${statusClass}">${statusText}</div>
      </div>
      <div class="chapter-arrow">↗</div>
    `;
    container.appendChild(card);
  });
}

function openChapter(id) {
  const ch = chaptersData.find(c => c.id === id);
  if (!ch) return;
  currentChapter = ch;
  
  if (ch.status === 'upcoming') {
    showToBeContinued(ch);
  } else {
    showCertificates(ch);
  }
}

function showCertificates(ch) {
  document.getElementById('certs-chapter-title').textContent = `CHAPTER 0${ch.id}`;
  document.getElementById('certs-subtitle').textContent = `Celebrating the students who completed ${ch.title}.`;
  
  const grid = document.getElementById('certs-grid');
  grid.innerHTML = '';
  
  if (ch.certificates.length === 0) {
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 3rem;">Certificates will be added soon.</p>';
  } else {
    ch.certificates.forEach(cert => {
      const card = document.createElement('div');
      card.className = 'cert-card';
      card.innerHTML = `
        <img src="${cert.image}" alt="${cert.studentName}" class="cert-image" loading="lazy">
        <div class="cert-info">
          <div class="student-name">${cert.studentName}</div>
          <button class="view-btn" onclick="openModal('${cert.image}', '${cert.studentName.replace(/'/g, "\\'")}')">VIEW CERTIFICATE</button>
        </div>
      `;
      grid.appendChild(card);
    });
  }
  
  showScreen('certs-screen');
}

function showToBeContinued(ch) {
  document.getElementById('tbc-number').textContent = `0${ch.id}`;
  document.getElementById('tbc-title').textContent = `CHAPTER 0${ch.id}`;
  document.getElementById('tbc-message').textContent = 'CONTENT NOT RELEASED';
  showScreen('tbc-screen');
  
  // Animate terminal lines
  const lines = document.querySelectorAll('.terminal-line');
  lines.forEach((line, i) => {
    line.style.animationDelay = `${i * 0.3}s`;
  });
}

function openModal(imageSrc, studentName) {
  document.getElementById('modal-image').src = imageSrc;
  document.getElementById('modal-student').textContent = studentName;
  document.getElementById('certificate-modal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('certificate-modal').classList.remove('active');
  document.body.style.overflow = '';
}

function downloadCertificate() {
  const img = document.getElementById('modal-image');
  const a = document.createElement('a');
  a.href = img.src;
  a.download = img.src.split('/').pop();
  a.click();
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  renderChapters();
  showScreen('intro-screen');
  
  document.getElementById('start-btn').addEventListener('click', () => {
    showScreen('chapters-screen');
  });
  
  document.querySelectorAll('.back-to-chapters').forEach(btn => {
    btn.addEventListener('click', () => showScreen('chapters-screen'));
  });
  
  document.getElementById('back-to-welcome').addEventListener('click', () => {
    showScreen('intro-screen');
  });
  
  document.getElementById('close-modal').addEventListener('click', closeModal);
  document.getElementById('certificate-modal').addEventListener('click', (e) => {
    if (e.target.id === 'certificate-modal') closeModal();
  });
  
  // Keyboard support
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
});

// Browser back support (simple)
window.addEventListener('popstate', () => {
  if (currentScreen !== 'intro') {
    showScreen('intro-screen');
  }
});
