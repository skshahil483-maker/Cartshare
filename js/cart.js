(() => {
  'use strict';
  const Store = window.CartShareStore;
  const catalog = [
    { name: 'Milk', emoji: '🥛', price: 3.49, category: 'Groceries' }, { name: 'Sourdough', emoji: '🥖', price: 4.25, category: 'Groceries' },
    { name: 'Avocado', emoji: '🥑', price: 1.79, category: 'Groceries' }, { name: 'Strawberries', emoji: '🍓', price: 4.99, category: 'Groceries' },
    { name: 'Eggs', emoji: '🥚', price: 4.5, category: 'Groceries' }, { name: 'Coffee', emoji: '☕', price: 8.99, category: 'Drinks' },
    { name: 'Bananas', emoji: '🍌', price: 1.25, category: 'Groceries' }, { name: 'Pasta', emoji: '🍝', price: 2.49, category: 'Groceries' },
    { name: 'Orange juice', emoji: '🧃', price: 3.75, category: 'Drinks' }, { name: 'Chips', emoji: '🥔', price: 2.99, category: 'Snacks' },
    { name: 'Dish soap', emoji: '🧼', price: 3.29, category: 'Household' }, { name: 'Chocolate', emoji: '🍫', price: 2.5, category: 'Snacks' }
  ];
  let config;
  const read = () => Store.readRoom(config.code);
  const toast = message => {
    const container = document.getElementById('toast-container');
    const element = document.createElement('div');
    element.className = 'toast align-items-center';
    element.setAttribute('role', 'status');
    element.innerHTML = `<div class="toast-body"><i class="bi bi-info-circle toast-icon"></i><span>${Store.escapeHtml(message)}</span><button type="button" class="btn-close ms-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
    container.append(element);
    const instance = bootstrap.Toast.getOrCreateInstance(element, { delay: 3500 });
    element.addEventListener('hidden.bs.toast', () => element.remove());
    instance.show();
  };
  const addItem = (details, source = 'form') => {
    const name = String(details.name || '').trim().slice(0, 60);
    const price = Number(details.price);
    const quantity = Number(details.quantity);
    if (!name || name.length > 60 || !Number.isFinite(price) || price <= 0 || price > 99999 || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      toast('Check the item name, price, and quantity.'); return false;
    }
    const room = Store.transact(config.code, draft => {
      draft.items ||= [];
      const item = { id: Store.createId(), name, price: Math.round(price * 100) / 100, quantity, category: String(details.category || 'Other'), addedBy: config.user.id, addedByName: config.user.name, addedByColor: config.user.color, addedAt: Date.now() };
      draft.items.push(item);
      window.CartShareActivity.add(draft, config.user, 'added', item, quantity);
    });
    if (room) window.CartShareSync.publish(room);
    if (source === 'form') document.getElementById('add-item-form').reset();
    window.CartShareApp.render();
    return true;
  };
  const updateQuantity = (id, delta) => {
    const room = Store.transact(config.code, draft => {
      const item = draft.items.find(entry => entry.id === id);
      if (!item) return false;
      item.quantity = Math.max(1, Math.min(99, item.quantity + delta));
      window.CartShareActivity.add(draft, config.user, 'updated', item, item.quantity);
    });
    if (room) window.CartShareSync.publish(room);
    window.CartShareApp.render();
  };
  const removeItem = id => {
    let denied = false;
    const room = Store.transact(config.code, draft => {
      const index = draft.items.findIndex(entry => entry.id === id);
      if (index < 0) return false;
      const item = draft.items[index];
      if (item.addedBy !== config.user.id && draft.creatorId !== config.user.id) { denied = true; return false; }
      draft.items.splice(index, 1);
      window.CartShareActivity.add(draft, config.user, 'removed', item, item.quantity);
    });
    if (denied) { toast('Only the person who added this item or the room creator can remove it.'); return; }
    if (room) window.CartShareSync.publish(room);
    window.CartShareApp.render();
  };
  const setThreshold = value => {
    const threshold = Number(value);
    if (!Number.isFinite(threshold) || threshold < 1 || threshold > 9999) return;
    const room = Store.transact(config.code, draft => { draft.threshold = Math.round(threshold * 100) / 100; });
    if (room) window.CartShareSync.publish(room);
    window.CartShareApp.render();
  };
  const renderCatalog = () => {
    document.getElementById('product-catalog').innerHTML = catalog.map((item, index) => `<article class="catalog-item"><span class="catalog-emoji" aria-hidden="true">${item.emoji}</span><span class="catalog-name">${Store.escapeHtml(item.name)}</span><span class="catalog-price">${Store.money(item.price)}</span><button class="catalog-add" type="button" data-catalog-index="${index}" aria-label="Add ${Store.escapeHtml(item.name)}">+ Add</button></article>`).join('');
    document.getElementById('product-catalog').addEventListener('click', event => {
      const button = event.target.closest('[data-catalog-index]');
      if (button) addItem({ ...catalog[Number(button.dataset.catalogIndex)], quantity: 1 }, 'catalog');
    });
  };
  const chip = item => `<span class="user-chip"><span class="mini-avatar" style="background:${Store.escapeHtml(item.addedByColor || '#267154')}">${Store.escapeHtml((item.addedByName || '?').charAt(0).toUpperCase())}</span>${Store.escapeHtml(item.addedByName || 'Unknown')}</span>`;
  const controls = item => `<span class="qty-control"><button type="button" data-quantity="-1" data-item-id="${Store.escapeHtml(item.id)}" aria-label="Decrease ${Store.escapeHtml(item.name)} quantity" ${item.quantity <= 1 ? 'disabled' : ''}>−</button><strong>${item.quantity}</strong><button type="button" data-quantity="1" data-item-id="${Store.escapeHtml(item.id)}" aria-label="Increase ${Store.escapeHtml(item.name)} quantity" ${item.quantity >= 99 ? 'disabled' : ''}>+</button></span>`;
  const removeButton = item => `<button type="button" class="remove-item" data-remove-id="${Store.escapeHtml(item.id)}" aria-label="Remove ${Store.escapeHtml(item.name)}"><i class="bi bi-trash3"></i></button>`;
  const renderItems = room => {
    const items = room.items || [];
    const empty = items.length === 0;
    document.getElementById('cart-empty').classList.toggle('d-none', !empty);
    document.getElementById('cart-content').classList.toggle('d-none', empty);
    document.getElementById('cart-item-count').textContent = String(items.reduce((sum, item) => sum + item.quantity, 0));
    document.getElementById('cart-table-body').innerHTML = items.map(item => `<tr><td><span class="item-title">${Store.escapeHtml(item.name)}</span><span class="item-meta">${Store.escapeHtml(item.category)} · ${new Date(item.addedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></td><td>${controls(item)}</td><td class="item-price">${Store.money(item.price)}</td><td class="item-subtotal">${Store.money(item.price * item.quantity)}</td><td>${chip(item)}</td><td>${removeButton(item)}</td></tr>`).join('');
    document.getElementById('cart-mobile-list').innerHTML = items.map(item => `<article class="mobile-cart-card"><div class="mobile-cart-top"><div><span class="item-title">${Store.escapeHtml(item.name)}</span><span class="item-meta">${Store.escapeHtml(item.category)} · ${Store.money(item.price)} each</span></div><strong class="item-subtotal">${Store.money(item.price * item.quantity)}</strong></div><div class="mobile-cart-bottom"><div>${controls(item)}</div>${chip(item)}${removeButton(item)}</div></article>`).join('');
    const totals = new Map();
    items.forEach(item => totals.set(item.addedBy, { name: item.addedByName, color: item.addedByColor, amount: (totals.get(item.addedBy)?.amount || 0) + item.price * item.quantity }));
    document.getElementById('per-user-totals').innerHTML = `<div class="per-user-list">${Array.from(totals.values()).map(person => `<span class="per-user-total"><span class="mini-avatar" style="background:${Store.escapeHtml(person.color)}">${Store.escapeHtml(person.name.charAt(0).toUpperCase())}</span>${Store.escapeHtml(person.name)} <strong>${Store.money(person.amount)}</strong></span>`).join('') || '<span class="item-meta">No items yet</span>'}</div>`;
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    document.getElementById('grand-total').textContent = Store.money(total);
    const thresholdInput = document.getElementById('shipping-threshold');
    thresholdInput.value = room.threshold || 75;
    const threshold = Number(room.threshold) || 75;
    const progress = Math.min(100, total / threshold * 100);
    const progressBar = document.getElementById('shipping-progress-bar');
    progressBar.style.width = `${progress}%`;
    const progressTrack = progressBar.parentElement;
    progressTrack.setAttribute('aria-valuenow', String(Math.round(progress)));
    const message = document.getElementById('shipping-message');
    const remaining = Math.max(0, threshold - total);
    message.classList.toggle('unlocked', remaining === 0);
    message.textContent = remaining === 0 ? 'Free shipping unlocked 🎉' : total === 0 ? 'Add items to start filling the bar.' : `You need ${Store.money(remaining)} more for free shipping.`;
  };
  const renderParticipants = room => {
    const people = Object.values(room.participants || {}).sort((a, b) => b.lastSeen - a.lastSeen);
    document.getElementById('participant-count').textContent = String(people.length);
    document.getElementById('participant-list').innerHTML = `${people.slice(0, 5).map(person => `<span class="participant-avatar" title="${Store.escapeHtml(person.name)}" style="background:${Store.escapeHtml(person.color)}">${Store.escapeHtml(person.name.charAt(0).toUpperCase())}</span>`).join('')}${people.length > 5 ? `<span class="participant-overflow" title="${people.length - 5} more">+${people.length - 5}</span>` : ''}`;
    document.querySelectorAll('.creator-only').forEach(element => { element.style.display = room.creatorId === config.user.id ? 'inline-grid' : 'none'; });
  };
  const bindEvents = () => {
    const form = document.getElementById('add-item-form');
    form.addEventListener('submit', event => {
      event.preventDefault();
      const nameInput = document.getElementById('item-name');
      const priceInput = document.getElementById('item-price');
      const quantityInput = document.getElementById('item-quantity');
      const validName = nameInput.value.trim().length > 0 && nameInput.value.trim().length <= 60;
      const validPrice = Number(priceInput.value) > 0 && Number(priceInput.value) <= 99999;
      const validQuantity = Number.isInteger(Number(quantityInput.value)) && Number(quantityInput.value) >= 1 && Number(quantityInput.value) <= 99;
      nameInput.classList.toggle('is-invalid', !validName);
      priceInput.classList.toggle('is-invalid', !validPrice);
      quantityInput.classList.toggle('is-invalid', !validQuantity);
      document.getElementById('price-feedback').textContent = validPrice ? '' : 'Enter a price above $0.';
      if (validName && validPrice && validQuantity) addItem({ name: nameInput.value, price: priceInput.value, quantity: quantityInput.value, category: document.getElementById('item-category').value });
    });
    document.querySelectorAll('#cart-table-body, #cart-mobile-list').forEach(container => container.addEventListener('click', event => {
      const quantityButton = event.target.closest('[data-quantity]');
      const deleteButton = event.target.closest('[data-remove-id]');
      if (quantityButton) updateQuantity(quantityButton.dataset.itemId, Number(quantityButton.dataset.quantity));
      if (deleteButton) removeItem(deleteButton.dataset.removeId);
    }));
    document.getElementById('shipping-threshold').addEventListener('change', event => setThreshold(event.target.value));
  };
  const render = () => {
    const room = read();
    if (!room) { window.location.replace('index.html'); return; }
    document.getElementById('room-code-display').textContent = room.code;
    renderItems(room);
    renderParticipants(room);
    window.CartShareActivity.render(room);
  };
  const bindRoomActions = () => {
    document.getElementById('copy-code').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(config.code);
      } catch (_) {
        const temporary = document.createElement('textarea');
        temporary.value = config.code;
        temporary.style.position = 'fixed';
        temporary.style.opacity = '0';
        document.body.append(temporary);
        temporary.select();
        document.execCommand('copy');
        temporary.remove();
      }
      const feedback = document.getElementById('copy-feedback');
      feedback.textContent = 'Copied';
      window.setTimeout(() => { feedback.textContent = ''; }, 1800);
    });
    document.querySelectorAll('[data-leave]').forEach(button => button.addEventListener('click', () => {
      if (!window.confirm('Leave this room? You can rejoin later with its code.')) return;
      window.CartShareSync.leave(true);
      window.CartShareAuth.session.remove('cartshare_user');
      window.CartShareAuth.session.remove('cartshare_current_room');
      window.location.href = 'index.html';
    }));
    document.getElementById('clear-log').addEventListener('click', () => {
      const room = read();
      if (!room || room.creatorId !== config.user.id) return;
      const updated = Store.transact(config.code, draft => { draft.activity = []; });
      if (updated) window.CartShareSync.publish(updated);
      render();
    });
  };
  const start = settings => {
    config = settings;
    document.getElementById('room-code-display').textContent = settings.code;
    window.CartShareActivity.init();
    window.CartShareReceipt.init(settings);
    renderCatalog();
    bindEvents();
    bindRoomActions();
    window.CartShareSync.start(settings);
    render();
  };
  window.CartShareCart = { start, renderItems, renderParticipants, addItem, toast };
  window.CartShareApp = { start, render };
})();