(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const STORAGE_KEY = 'timerBelajar.sessions';

  function safeAnimate(el, keyframes, options) {
    if (!el || reduceMotion.matches || typeof el.animate !== 'function') return;
    el.animate(keyframes, options);
  }

  function shake(el) {
    safeAnimate(el, [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-8px)' },
      { transform: 'translateX(8px)' },
      { transform: 'translateX(-6px)' },
      { transform: 'translateX(6px)' },
      { transform: 'translateX(0)' }
    ], { duration: 350, easing: 'ease-in-out' });
  }

  const form = $('sessionForm');
  const nameInput = $('sessionName');
  const durationInput = $('duration');
  const nameError = $('nameError');
  const durationError = $('durationError');
  const startBtn = $('startBtn');
  const resetBtn = $('resetBtn');
  const ring = $('ring');
  const statusLabel = $('statusLabel');
  const clockDisplay = $('clockDisplay');
  const activeSessionName = $('activeSessionName');
  const loadingState = $('loadingState');
  const modeRadios = document.querySelectorAll('input[name="mode"]');
  const bellAudio = $('bellAudio');

  const todayKey = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  function loadSessions() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(raw) ? raw.filter((s) => s.day === todayKey()) : [];
    } catch (e) {
      return [];
    }
  }
  function saveSessions() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions)); } catch (e) { /* abaikan */ }
  }
  let sessions = loadSessions();

  function makeBellUrl() {
    const rate = 22050;
    const seconds = 2.2;
    const n = Math.floor(rate * seconds);
    const buf = new ArrayBuffer(44 + n * 2);
    const v = new DataView(buf);
    const text = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };

    text(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true);
    text(8, 'WAVE'); text(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    text(36, 'data'); v.setUint32(40, n * 2, true);

    const partials = [[880, 1], [1760, 0.5], [2640, 0.25], [3520, 0.12]];
    for (let i = 0; i < n; i++) {
      const t = i / rate;
      let s = 0;
      partials.forEach(([f, a]) => {
        s += a * Math.sin(2 * Math.PI * f * t) * Math.exp(-t * (2 + f / 800));
      });
      s *= Math.min(1, t * 200); // fade-in singkat supaya tidak "klik"
      v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s * 0.5)) * 32767, true);
    }
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  }
  bellAudio.src = makeBellUrl();

  function playBell() {
    try {
      bellAudio.currentTime = 0;
      const p = bellAudio.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) { /* abaikan */ }
  }

  const LEVELS = [
    { min: 0,   title: 'Tunas Baru',       color: '#8fb07f', stars: 0 },
    { min: 30,  title: 'Pelajar Rajin',    color: '#d9a441', stars: 1 },
    { min: 60,  title: 'Penjelajah Fokus', color: '#c4552d', stars: 2 },
    { min: 120, title: 'Master Fokus',     color: '#7a4fa3', stars: 3 }
  ];

  function starPoints(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? r : r * 0.45;
      const ang = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push((cx + rad * Math.cos(ang)).toFixed(1) + ',' + (cy + rad * Math.sin(ang)).toFixed(1));
    }
    return pts.join(' ');
  }

  function badgeSvg(level) {
    const { color, stars } = level;
    let starsSvg = '';
    const gap = 38;
    const startX = 80 - ((stars - 1) * gap) / 2;
    for (let i = 0; i < stars; i++) {
      starsSvg += '<polygon points="' + starPoints(startX + i * gap, 78, 16) + '" fill="#fff"/>';
    }
    const sprout = stars === 0
      ? '<path d="M80 108 V70" stroke="#fff" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M80 80 C60 80 56 62 56 56 C72 56 80 64 80 80Z" fill="#fff"/>' +
        '<path d="M80 74 C98 74 104 58 104 52 C88 52 80 60 80 74Z" fill="#fff"/>'
      : '';
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">' +
      '<circle cx="80" cy="80" r="74" fill="' + color + '"/>' +
      '<circle cx="80" cy="80" r="62" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="4 6" opacity="0.7"/>' +
      starsSvg + sprout +
      '<rect x="46" y="112" width="68" height="14" rx="7" fill="#fff" opacity="0.9"/>' +
      '</svg>'
    );
  }

  let totalMs = 0;
  let remainingMs = 0;
  let endAt = 0;
  let tickId = null;
  let running = false;
  let loading = false;
  let hasSession = false;
  let activeMode = 'fokus';

  const currentMode = () => document.querySelector('input[name="mode"]:checked').value;

  const mmss = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  };

  function setState(state) {
    document.body.dataset.state = state;
    const focus = activeMode === 'fokus';
    const labels = {
      idle: 'Siap saat kamu siap',
      loading: 'Menyiapkan…',
      running: focus ? 'Sedang fokus' : 'Sedang istirahat',
      paused: 'Dijeda',
      done: 'Sesi selesai!'
    };
    statusLabel.textContent = labels[state] || '';
  }

  function setProgress(pct) {
    ring.style.setProperty('--progress', pct.toFixed(2));
  }

  function lockInputs(locked) {
    nameInput.disabled = locked;
    durationInput.disabled = locked;
    modeRadios.forEach((r) => { r.disabled = locked; });
  }

  function updateIdleClock() {
    const d = Number(durationInput.value);
    clockDisplay.textContent = Number.isFinite(d) && d >= 0 ? mmss(d * 60000) : '00:00';
  }

  function showError(input, errEl, message) {
    errEl.textContent = message;
    input.classList.add('invalid');
    input.setAttribute('aria-invalid', 'true');
    shake(input);
  }
  function clearError(input, errEl) {
    errEl.textContent = '';
    input.classList.remove('invalid');
    input.removeAttribute('aria-invalid');
  }

  nameInput.addEventListener('input', () => clearError(nameInput, nameError));
  durationInput.addEventListener('input', () => {
    clearError(durationInput, durationError);
    if (!hasSession) updateIdleClock();
  });
  modeRadios.forEach((r) => r.addEventListener('change', () => {
    document.body.dataset.mode = currentMode();
  }));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    toggleTimer();
  });

  function toggleTimer() {
    if (loading) return;
    if (running) return pause();
    if (hasSession) return run();
    begin();
  }

  function begin() {
    const name = nameInput.value.trim();
    const raw = durationInput.value.trim();
    const minutes = Number(raw);
    let firstInvalid = null;

    clearError(nameInput, nameError);
    clearError(durationInput, durationError);

    if (!name) {
      showError(nameInput, nameError, 'Nama sesi tidak boleh kosong.');
      firstInvalid = firstInvalid || nameInput;
    }
    if (!raw || !Number.isInteger(minutes) || minutes < 1 || minutes > 120) {
      showError(durationInput, durationError, 'Isi durasi 1–120 menit (bilangan bulat).');
      firstInvalid = firstInvalid || durationInput;
    }
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    // Tampilkan keadaan "memuat" sebentar sebelum timer berjalan
    loading = true;
    startBtn.disabled = true;
    setState('loading');
    loadingState.hidden = false;

    setTimeout(() => {
      loading = false;
      startBtn.disabled = false;
      loadingState.hidden = true;

      totalMs = minutes * 60000;
      remainingMs = totalMs;
      activeMode = currentMode();
      hasSession = true;
      lockInputs(true);
      activeSessionName.textContent = name;
      setProgress(0);
      run();
    }, 600);
  }

  function run() {
    endAt = Date.now() + remainingMs;
    running = true;
    clearInterval(tickId);
    tickId = setInterval(tick, 250);
    setState('running');
    startBtn.textContent = 'Jeda';
    tick();
  }

  function pause() {
    remainingMs = Math.max(0, endAt - Date.now());
    running = false;
    clearInterval(tickId);
    setState('paused');
    startBtn.textContent = 'Lanjut';
  }

  function tick() {
    const left = endAt - Date.now();
    if (left <= 0) return finish();
    clockDisplay.textContent = mmss(left);
    setProgress((1 - left / totalMs) * 100);
    document.title = mmss(left) + ' · Timer Belajar';
  }

  function finish() {
    running = false;
    clearInterval(tickId);

    sessions.push({
      name: activeSessionName.textContent,
      minutes: Math.round(totalMs / 60000),
      mode: activeMode,
      day: todayKey(),
      time: new Date().toISOString()
    });
    saveSessions();

    hasSession = false;
    lockInputs(false);
    clockDisplay.textContent = '00:00';
    setProgress(100);
    setState('done');
    startBtn.textContent = 'Mulai';
    document.title = 'Selesai · Timer Belajar';

    playBell();
    safeAnimate(ring, [
      { transform: 'scale(1)' },
      { transform: 'scale(1.06)' },
      { transform: 'scale(1)' }
    ], { duration: 500, easing: 'ease-in-out' });

    renderAll();
  }

  function resetTimer() {
    running = false;
    loading = false;
    hasSession = false;
    clearInterval(tickId);
    loadingState.hidden = true;
    startBtn.disabled = false;
    startBtn.textContent = 'Mulai';
    lockInputs(false);
    clearError(nameInput, nameError);
    clearError(durationInput, durationError);
    setProgress(0);
    updateIdleClock();
    activeSessionName.textContent = 'Belum ada sesi berjalan';
    setState('idle');
    document.title = 'Timer Belajar';
  }
  resetBtn.addEventListener('click', resetTimer);

  // Pintasan keyboard: Space = mulai / jeda (di luar kolom isian)
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || e.repeat) return;
    if (e.target.closest('input, textarea, select, button, audio, a')) return;
    if ($('viewTimer').hidden) return;
    e.preventDefault();
    toggleTimer();
  });

  const historyList = $('historyList');
  const emptyState = $('emptyState');

  function renderHistory() {
    historyList.innerHTML = '';
    emptyState.hidden = sessions.length > 0;
    historyList.hidden = sessions.length === 0;

    sessions.slice().reverse().forEach((s) => {
      const li = document.createElement('li');

      const name = document.createElement('span');
      name.className = 'h-name';
      name.textContent = s.name;

      const tag = document.createElement('span');
      tag.className = 'tag ' + s.mode;
      tag.textContent = s.mode;

      const meta = document.createElement('span');
      meta.className = 'h-meta';
      const t = new Date(s.time);
      meta.textContent = s.minutes + ' mnt · ' +
        String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');

      li.append(name, tag, meta);
      historyList.appendChild(li);
    });
  }

  let lastLevelIndex = -1;

  function renderStats() {
    const focus = sessions.filter((s) => s.mode === 'fokus');
    const total = focus.reduce((sum, s) => sum + s.minutes, 0);
    const count = focus.length;
    const avg = count ? Math.round(total / count) : 0;

    $('statTotal').textContent = total;
    $('statCount').textContent = count;
    $('statAvg').textContent = avg;

    // Badge (gambar) berubah sesuai total menit fokus
    let levelIndex = 0;
    LEVELS.forEach((l, i) => { if (total >= l.min) levelIndex = i; });
    const level = LEVELS[levelIndex];
    const next = LEVELS[levelIndex + 1];

    const img = $('badgeImg');
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(badgeSvg(level));
    img.alt = 'Badge ' + level.title;
    $('badgeTitle').textContent = level.title;
    $('badgeNote').textContent = next
      ? 'Tinggal ' + (next.min - total) + ' menit fokus lagi menuju "' + next.title + '".'
      : 'Level tertinggi tercapai!';

    if (lastLevelIndex !== -1 && levelIndex !== lastLevelIndex) {
      safeAnimate(img, [
        { transform: 'scale(0.6)', opacity: 0 },
        { transform: 'scale(1.1)', opacity: 1 },
        { transform: 'scale(1)', opacity: 1 }
      ], { duration: 450, easing: 'ease-out' });
    }
    lastLevelIndex = levelIndex;

    // Grafik batang: 8 sesi fokus terakhir
    const chart = $('chart');
    chart.innerHTML = '';
    const recent = focus.slice(-8);
    $('chartEmpty').hidden = recent.length > 0;
    chart.hidden = recent.length === 0;

    const max = Math.max(1, ...recent.map((s) => s.minutes));
    recent.forEach((s, i) => {
      const col = document.createElement('div');
      col.className = 'bar-col';

      const val = document.createElement('span');
      val.className = 'bar-value';
      val.textContent = s.minutes;

      const bar = document.createElement('div');
      bar.className = 'bar';
      bar.style.height = Math.max(6, (s.minutes / max) * 100 * 0.78) + '%';

      const lab = document.createElement('span');
      lab.className = 'bar-label';
      lab.textContent = '#' + (focus.length - recent.length + i + 1);

      col.append(val, bar, lab);
      chart.appendChild(col);
    });
    chart.setAttribute('aria-label',
      recent.length
        ? 'Grafik batang durasi sesi fokus: ' + recent.map((s) => s.minutes + ' menit').join(', ')
        : 'Belum ada data');
  }

  function animateBars() {
    document.querySelectorAll('#chart .bar').forEach((bar, i) => {
      safeAnimate(bar, [
        { transform: 'scaleY(0)' },
        { transform: 'scaleY(1)' }
      ], { duration: 400, delay: i * 50, easing: 'ease-out', fill: 'backwards' });
    });
  }

  function renderAll() {
    renderHistory();
    renderStats();
  }

  const navButtons = document.querySelectorAll('.view-nav button');

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = $(btn.dataset.view);
      const current = document.querySelector('.view:not([hidden])');
      if (!next || next === current) return;

      current.hidden = true;
      next.hidden = false;

      navButtons.forEach((b) => {
        const active = b === btn;
        b.classList.toggle('active', active);
        if (active) b.setAttribute('aria-current', 'page');
        else b.removeAttribute('aria-current');
      });

      safeAnimate(next, [
        { opacity: 0, transform: 'translateY(16px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 300, easing: 'ease-out' });

      if (next.id === 'viewStatistik') animateBars();
    });
  });

  renderAll();
  updateIdleClock();
  setState('idle');
})();
