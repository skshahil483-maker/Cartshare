(() => {
  'use strict';
  const Store = window.CartShareStore;
  const USER_KEY = 'cartshare_user';
  const ROOM_SESSION_KEY = 'cartshare_current_room';
  const session = {
    get(key) { try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (_) { return null; } },
    set(key, value) { try { sessionStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; } },
    remove(key) { try { sessionStorage.removeItem(key); } catch (_) { /* storage may be disabled */ } }
  };
  const getUser = () => session.get(USER_KEY);
  const getRoomCode = () => session.get(ROOM_SESSION_KEY);
  const saveSession = (user, code) => { session.set(USER_KEY, user); session.set(ROOM_SESSION_KEY, code); };
  const makeUser = name => ({ id: Store.createId(), name: name.trim(), color: Store.getColor(name.trim().toLowerCase()) });
  const showAlert = (message, type = 'danger') => {
    const alert = document.getElementById('access-alert');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.focus?.();
  };
  const validateName = input => {
    const name = input.value.trim();
    const valid = name.length >= 2 && name.length <= 20;
    input.classList.toggle('is-invalid', !valid);
    input.classList.toggle('is-valid', valid);
    return valid ? name : null;
  };
  const goToRoom = (code, name) => {
    const user = makeUser(name);
    saveSession(user, code);
    session.set('cartshare_join_pending', true);
    Store.addRecent(code, name);
    window.location.href = `room.html?room=${encodeURIComponent(code)}`;
  };
  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let attempts = 0; attempts < 25; attempts += 1) {
      const bytes = new Uint8Array(6);
      if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
      else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
      code = Array.from(bytes, byte => chars[byte % chars.length]).join('');
      if (!Store.readRoom(code)) return code;
    }
    return `${Date.now().toString(36).slice(-6).toUpperCase()}`;
  };
  const create = () => {
    const name = validateName(document.getElementById('display-name'));
    if (!name) { showAlert('Please enter a name between 2 and 20 characters.'); return; }
    const code = generateCode();
    const user = makeUser(name);
    if (!Store.createRoom(code, user)) { showAlert('Browser storage is unavailable. Enable local storage and try again.'); return; }
    saveSession(user, code);
    Store.addRecent(code, name);
    window.location.href = `room.html?room=${encodeURIComponent(code)}`;
  };
  const join = (event, recentCode) => {
    if (event) event.preventDefault();
    const name = validateName(document.getElementById('display-name'));
    const codeInput = document.getElementById('room-code');
    const code = String(recentCode || codeInput.value).trim().toUpperCase();
    const validCode = /^[A-Z0-9]{6}$/.test(code);
    codeInput.classList.toggle('is-invalid', !validCode);
    if (!name) { showAlert('Please enter a name between 2 and 20 characters.'); return; }
    if (!validCode) { showAlert('Room codes must be exactly 6 letters or numbers.'); return; }
    if (!Store.readRoom(code)) { showAlert(`Room ${code} was not found. Check the code or create a new room.`); return; }
    goToRoom(code, name);
  };
  const renderRecents = () => {
    const rooms = Store.readRecents();
    const section = document.getElementById('recent-section');
    const list = document.getElementById('recent-rooms');
    if (!section || !list) return;
    section.classList.toggle('d-none', rooms.length === 0);
    list.innerHTML = rooms.map(entry => `<li><button type="button" data-recent-code="${Store.escapeHtml(entry.code)}"><span><strong>${Store.escapeHtml(entry.code)}</strong><small> · ${Store.escapeHtml(entry.name || 'Recent room')}</small></span><i class="bi bi-arrow-up-right"></i></button></li>`).join('');
    list.querySelectorAll('[data-recent-code]').forEach(button => button.addEventListener('click', () => join(null, button.dataset.recentCode)));
  };
  const initTheme = () => {
    let dark = false;
    try { dark = localStorage.getItem('cartshare_dark_mode') === 'true'; } catch (_) { /* defaults to light */ }
    document.body.classList.toggle('dark-mode', dark);
    document.querySelectorAll('.theme-toggle').forEach(button => button.addEventListener('click', () => {
      const enabled = document.body.classList.toggle('dark-mode');
      try { localStorage.setItem('cartshare_dark_mode', String(enabled)); } catch (_) { /* visual toggle still works */ }
      button.innerHTML = `<i class="bi ${enabled ? 'bi-sun' : 'bi-moon-stars'}"></i>`;
    }));
    document.querySelectorAll('.theme-toggle').forEach(button => { button.innerHTML = `<i class="bi ${dark ? 'bi-sun' : 'bi-moon-stars'}"></i>`; });
  };
  const initEntry = () => {
    initTheme();
    const form = document.getElementById('access-form');
    form.addEventListener('submit', join);
    document.getElementById('create-room').addEventListener('click', create);
    document.getElementById('clear-recent').addEventListener('click', () => { Store.clearRecents(); renderRecents(); });
    document.getElementById('room-code').addEventListener('input', event => { event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); event.target.classList.remove('is-invalid'); });
    document.getElementById('display-name').addEventListener('input', event => event.target.classList.remove('is-invalid'));
    renderRecents();
  };
  const initRoom = () => {
    initTheme();
    const requestedCode = new URLSearchParams(window.location.search).get('room')?.toUpperCase();
    const code = requestedCode || getRoomCode();
    const user = getUser();
    if (!user || !code || !/^[A-Z0-9]{6}$/.test(code) || !Store.readRoom(code)) { window.location.replace('index.html'); return; }
    session.set(ROOM_SESSION_KEY, code);
    if (session.get('cartshare_join_pending')) {
      session.remove('cartshare_join_pending');
      Store.transact(code, room => window.CartShareActivity.add(room, user, 'joined'));
    }
    window.CartShareApp.start({ code, user });
  };
  window.CartShareAuth = { initEntry, initRoom, getUser, getRoomCode, session, showAlert };
})();