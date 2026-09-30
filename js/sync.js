(() => {
  'use strict';
  const Store = window.CartShareStore;
  let channel = null;
  let timer = null;
  let config = null;
  let leaving = false;
  const notify = () => window.CartShareApp?.render();
  const publish = room => { try { channel?.postMessage({ code: room.code, revision: room.revision, updatedAt: room.updatedAt }); } catch (_) { /* storage event remains a fallback */ } };
  const heartbeat = () => {
    if (!config || leaving) return;
    const now = Date.now();
    const room = Store.transact(config.code, draft => {
      draft.participants ||= {};
      draft.participants[config.user.id] = { id: config.user.id, name: config.user.name, color: config.user.color, lastSeen: now };
      Object.entries(draft.participants).forEach(([id, person]) => { if (id !== config.user.id && now - Number(person.lastSeen) > 15000) delete draft.participants[id]; });
    });
    if (room) { publish(room); notify(); }
  };
  const leave = (recordActivity = true) => {
    if (!config || leaving) return;
    leaving = true;
    clearInterval(timer);
    const room = Store.transact(config.code, draft => {
      if (recordActivity) window.CartShareActivity.add(draft, config.user, 'left');
      delete draft.participants?.[config.user.id];
    });
    if (room) publish(room);
    try { channel?.close(); } catch (_) { /* ignore close failures */ }
  };
  const start = settings => {
    config = settings;
    try { channel = new BroadcastChannel(`cartshare_${settings.code}`); channel.addEventListener('message', event => { if (event.data?.code === settings.code) notify(); }); } catch (_) { channel = null; }
    window.addEventListener('storage', event => { if (event.key === Store.roomKey(settings.code)) notify(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) heartbeat(); });
    window.addEventListener('beforeunload', () => leave(false), { once: true });
    heartbeat();
    timer = window.setInterval(heartbeat, 5000);
    return { publish, leave };
  };
  window.CartShareSync = { start, publish, leave };
})();