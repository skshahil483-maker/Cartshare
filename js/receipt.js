(() => {
  'use strict';
  const Store = window.CartShareStore;
  let config;
  let receiptId;
  const peopleFrom = room => {
    const people = new Map();
    Object.values(room.participants || {}).forEach(person => people.set(person.id, { id: person.id, name: person.name, color: person.color }));
    (room.activity || []).forEach(entry => {
      if (!people.has(entry.userId)) people.set(entry.userId, { id: entry.userId, name: entry.userName, color: entry.color });
    });
    room.items.forEach(item => people.set(item.addedBy, { id: item.addedBy, name: item.addedByName, color: item.addedByColor }));
    return Array.from(people.values());
  };
  const render = () => {
    const room = Store.readRoom(config.code);
    if (!room) return;
    const items = room.items || [];
    const people = peopleFrom(room);
    const equal = document.getElementById('equal-split').checked;
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shares = new Map(people.map(person => [person.id, 0]));
    if (equal && people.length) {
      const pennies = Math.round(total * 100);
      people.forEach((person, index) => shares.set(person.id, Math.floor(pennies / people.length) / 100 + (index < pennies % people.length ? 0.01 : 0)));
    } else items.forEach(item => shares.set(item.addedBy, (shares.get(item.addedBy) || 0) + item.price * item.quantity));
    const now = new Date();
    const rows = items.map(item => `<tr><td>${Store.escapeHtml(item.name)}</td><td>${item.quantity}</td><td>${Store.money(item.price)}</td><td>${Store.money(item.price * item.quantity)}</td><td>${Store.escapeHtml(item.addedByName)}</td></tr>`).join('');
    const split = people.map(person => `<div class="receipt-split-row"><span>${Store.escapeHtml(person.name)}</span><strong>${Store.money(shares.get(person.id) || 0)}</strong></div>`).join('') || '<div class="receipt-split-row"><span>No participants</span><strong>$0.00</strong></div>';
    document.getElementById('receipt-content').innerHTML = `<header class="receipt-brand"><div><img src="assets/logo.svg" alt=""><h3>cartshare</h3><div class="receipt-meta">Shared shop receipt · ${equal ? 'Equal split' : 'Items charged to the person who added them'}</div></div><div class="receipt-room"><span>ROOM CODE</span><strong>${Store.escapeHtml(room.code)}</strong></div></header><div class="receipt-meta"><span>${now.toLocaleString()}</span><span>Receipt ${Store.escapeHtml(receiptId)}</span></div><table class="receipt-table"><thead><tr><th>ITEM</th><th>QTY</th><th>UNIT PRICE</th><th>SUBTOTAL</th><th>ADDED BY</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No items in this cart.</td></tr>'}</tbody></table><section class="receipt-summary"><div class="receipt-total-row"><span>Grand total</span><strong>${Store.money(total)}</strong></div><h4 class="receipt-split-heading">${equal ? 'Equal split' : 'Per-person total'}</h4>${split}</section><footer class="receipt-audit">CartShare receipt ${Store.escapeHtml(receiptId)} · Generated ${now.toISOString()} · This receipt reflects the shared cart at time of generation.</footer>`;
  };
  const csvCell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const downloadCsv = () => {
    const room = Store.readRoom(config.code);
    if (!room) return;
    const equal = document.getElementById('equal-split').checked;
    const people = peopleFrom(room);
    const total = room.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const sums = new Map(people.map(person => [person.id, 0]));
    if (equal && people.length) people.forEach((person, index) => sums.set(person.id, Math.floor(Math.round(total * 100) / people.length) / 100 + (index < Math.round(total * 100) % people.length ? 0.01 : 0)));
    else room.items.forEach(item => sums.set(item.addedBy, (sums.get(item.addedBy) || 0) + item.price * item.quantity));
    const lines = [['CartShare receipt', receiptId], ['Room', room.code], ['Generated', new Date().toISOString()], [], ['Item', 'Quantity', 'Unit price', 'Subtotal', 'Added by']];
    room.items.forEach(item => lines.push([item.name, item.quantity, item.price.toFixed(2), (item.price * item.quantity).toFixed(2), item.addedByName]));
    lines.push([], ['Grand total', '', '', total.toFixed(2), ''], ['Split mode', equal ? 'Equal' : 'By item adder'], ['Person', 'Owes']);
    people.forEach(person => lines.push([person.name, (sums.get(person.id) || 0).toFixed(2)]));
    const blob = new Blob([lines.map(line => line.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `cartshare-${room.code}-${receiptId}.csv`; link.click();
    URL.revokeObjectURL(url);
  };
  const init = settings => {
    config = settings;
    document.getElementById('receipt-open').addEventListener('click', () => { receiptId = `CS-${Date.now().toString(36).toUpperCase()}-${Store.createId().slice(0, 5).toUpperCase()}`; render(); });
    document.getElementById('equal-split').addEventListener('change', render);
    document.getElementById('print-receipt').addEventListener('click', () => window.print());
    document.getElementById('download-csv').addEventListener('click', downloadCsv);
  };
  window.CartShareReceipt = { init, render };
})();