/* Room schema and guarded browser storage access. */
(() => {
  'use strict';
  const PREFIX = 'cartshare_room_';
  const RECENTS_KEY = 'cartshare_recent_rooms';
  const COLOR_PALETTE = ['#267154', '#df765d', '#577fa7', '#a27a36', '#8c6d9b', '#3e8990', '#c05b77', '#718044'];
  const safeStorage = (storage, operation) => {
    try { return operation(storage); } catch (error) { console.warn('CartShare storage unavailable:', error); return null; }
  };
  const roomKey = code => `${PREFIX}${String(code || '').toUpperCase()}`;
  const clone = value => JSON.parse(JSON.stringify(value));
  const readRoom = code => safeStorage(window.localStorage, storage => {
    const raw = storage.getItem(roomKey(code));
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (error) { console.error('Invalid saved room data:', error); return null; }
  });
  const writeRoom = room => safeStorage(window.localStorage, storage => {
    storage.setItem(roomKey(room.code), JSON.stringify(room));
    return room;
  });
  const createRoom = (code, user) => {
    const now = Date.now();
    const room = { version: 1, code, creatorId: user.id, createdAt: now, updatedAt: now, threshold: 75, items: [], activity: [], participants: {}, revision: 0 };
    room.participants[user.id] = { id: user.id, name: user.name, color: user.color, lastSeen: now };
    room.activity.push({ id: createId(), userId: user.id, userName: user.name, color: user.color, action: 'joined', item: null, at: now });
    return writeRoom(room);
  };
  const transact = (code, mutator) => {
    const latest = readRoom(code);
    if (!latest) return null;
    const draft = clone(latest);
    const result = mutator(draft);
    if (result === false) return latest;
    draft.updatedAt = Date.now();
    draft.revision = (Number(latest.revision) || 0) + 1;
    return writeRoom(draft);
  };
  const readRecents = () => safeStorage(window.localStorage, storage => {
    try { return JSON.parse(storage.getItem(RECENTS_KEY) || '[]').filter(entry => entry && /^[A-Z0-9]{6}$/.test(entry.code)); }
    catch (error) { console.warn('Invalid recent room list:', error); return []; }
  }) || [];
  const addRecent = (code, name) => safeStorage(window.localStorage, storage => {
    const next = readRecents().filter(entry => entry.code !== code);
    next.unshift({ code, name: String(name).slice(0, 20), visitedAt: Date.now() });
    storage.setItem(RECENTS_KEY, JSON.stringify(next.slice(0, 6)));
    return next.slice(0, 6);
  }) || [];
  const clearRecents = () => safeStorage(window.localStorage, storage => storage.removeItem(RECENTS_KEY));
  const createId = () => {
    try { if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID(); } catch (_) { /* use fallback */ }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  };
  const getColor = id => COLOR_PALETTE[Array.from(String(id)).reduce((sum, char) => sum + char.charCodeAt(0), 0) % COLOR_PALETTE.length];
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const money = value => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
  window.CartShareStore = { roomKey, readRoom, writeRoom, createRoom, transact, readRecents, addRecent, clearRecents, createId, getColor, escapeHtml, money };
})();