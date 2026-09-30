(() => {
  'use strict';
  const Store = window.CartShareStore;
  const add = (room, user, action, item, quantity) => {
    const subject = item ? { name: String(item.name).slice(0, 60), quantity: Math.max(1, Number(quantity) || 1) } : null;
    room.activity.unshift({ id: Store.createId(), userId: user.id, userName: user.name, color: user.color, action, item: subject, at: Date.now() });
    room.activity = room.activity.slice(0, 100);
  };
  const relativeTime = timestamp => {
    const seconds = Math.max(0, Math.floor((Date.now() - Number(timestamp)) / 1000));
    if (seconds < 8) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };
  const description = entry => {
    const subject = entry.item ? `${entry.item.quantity}× ${Store.escapeHtml(entry.item.name)}` : '';
    if (entry.action === 'added') return `added ${subject}`;
    if (entry.action === 'removed') return `removed ${Store.escapeHtml(entry.item?.name || 'an item')}`;
    if (entry.action === 'joined') return 'joined the room';
    if (entry.action === 'left') return 'left the room';
    if (entry.action === 'updated') return `updated ${Store.escapeHtml(entry.item?.name || 'an item')}`;
    return 'updated the room';
  };
  const render = room => {
    const feed = document.getElementById('activity-feed');
    const empty = document.getElementById('activity-empty');
    const filter = document.getElementById('activity-filter');
    if (!feed || !filter) return;
    const priorValue = filter.value || 'all';
    const people = new Map();
    Object.values(room.participants || {}).forEach(person => people.set(person.id, person));
    (room.activity || []).forEach(entry => {
      if (!people.has(entry.userId)) people.set(entry.userId, { id: entry.userId, name: entry.userName, color: entry.color });
    });
    const participants = Array.from(people.values()).sort((a, b) => a.name.localeCompare(b.name));
    filter.innerHTML = `<option value="all">Everyone</option>${participants.map(person => `<option value="${Store.escapeHtml(person.id)}">${Store.escapeHtml(person.name)}</option>`).join('')}`;
    filter.value = participants.some(person => person.id === priorValue) ? priorValue : 'all';
    const shown = (room.activity || []).filter(entry => filter.value === 'all' || entry.userId === filter.value);
    feed.innerHTML = shown.map(entry => `<article class="activity-entry"><span class="mini-avatar" style="background:${Store.escapeHtml(entry.color || '#267154')}">${Store.escapeHtml((entry.userName || '?').charAt(0).toUpperCase())}</span><div><p class="activity-text"><strong>${Store.escapeHtml(entry.userName || 'Someone')}</strong> ${description(entry)}</p><time class="activity-time" datetime="${new Date(entry.at).toISOString()}">${relativeTime(entry.at)}</time></div></article>`).join('');
    empty.style.display = shown.length ? 'none' : 'block';
  };
  const init = () => document.getElementById('activity-filter').addEventListener('change', () => window.CartShareApp.render());
  window.CartShareActivity = { add, render, init };
})();