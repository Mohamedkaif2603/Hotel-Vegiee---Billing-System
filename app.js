// Storage keys
const STORAGE = {
    MENU: 'hb_menu_items',
    CART: 'hb_cart_items',
    SALES: 'hb_sales_records'
};

const TAX_RATE = 0;

// Seed menu
const DEFAULT_MENU = [
    { id: cryptoRandomId(), name: 'Idly', price: 10, image: './imagesnew/idly.jpeg' },
    { id: cryptoRandomId(), name: 'Dosa', price: 30, image: './imagesnew/dosa.jpg' },
    { id: cryptoRandomId(), name: 'Puttu', price: 25, image: './imagesnew/puttu.webp' },
    { id: cryptoRandomId(), name: 'Poori', price: 20, image: './imagesnew/poori.webp' },
    { id: cryptoRandomId(), name: 'Coffee', price: 20, image: './imagesnew/coffee.webp' },
    { id: cryptoRandomId(), name: 'Tea', price: 12, image: './imagesnew/tea.jpg' },
    { id: cryptoRandomId(), name: 'Vada', price: 8, image: './imagesnew/vada.webp' },
    { id: cryptoRandomId(), name: 'Sweet Bonda', price: 10, image: './imagesnew/sweetbonda.webp' },
    { id: cryptoRandomId(), name: 'Pongal', price: 30, image: './imagesnew/pongal.webp' },
    { id: cryptoRandomId(), name: 'Chappathi', price: 20, image: './imagesnew/chappathi.webp' }
];

// Utilities
function cryptoRandomId() {
    if (window.crypto?.randomUUID) return crypto.randomUUID();
    return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function readStorage(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function writeStorage(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

function currency(n) { return `₹${(n ?? 0).toFixed(2)}`; }

// State
let menuItems = readStorage(STORAGE.MENU, null);
if (!menuItems || !Array.isArray(menuItems) || menuItems.length === 0) {
    menuItems = DEFAULT_MENU;
    writeStorage(STORAGE.MENU, menuItems);
}

// Migration: ensure latest prices for key items
const priceFix = { 'Poori': 20, 'Pongal': 30, 'Coffee': 20 };
let priceChanged = false;
menuItems = menuItems.map(it => {
    if (priceFix[it.name] && it.price !== priceFix[it.name]) {
        priceChanged = true;
        return { ...it, price: priceFix[it.name] };
    }
    return it;
});
if (priceChanged) writeStorage(STORAGE.MENU, menuItems);

// Migration: backfill robust Wikimedia image URLs
const imageMap = {
    'Idly': 'https://upload.wikimedia.org/wikipedia/commons/6/6e/Idli_Sambar.jpg',
    'Dosa': 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Dosa_on_steel_plate.jpg',
    'Puttu': 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Puttu_and_kadala_curry.jpg',
    'Poori': 'https://upload.wikimedia.org/wikipedia/commons/3/3b/Puri_Bhaji.jpg',
    'Coffee': 'https://upload.wikimedia.org/wikipedia/commons/5/58/Filter_coffee_serve.jpg',
    'Tea': 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Indian_masala_chai.jpg',
    'Vada': 'https://upload.wikimedia.org/wikipedia/commons/1/13/Medu_Vada.jpg',
    'Sweet Bonda': 'https://upload.wikimedia.org/wikipedia/commons/9/90/Bonda.JPG',
    'Pongal': 'https://upload.wikimedia.org/wikipedia/commons/7/7f/Ven_pongal.jpg',
    'Chappathi': 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Chapati.jpg'
};
let imageChanged = false;
menuItems = menuItems.map(it => {
    const shouldReplace = !it.image || it.image.includes('images.unsplash.com') || it.image.includes('placehold.co');
    if (shouldReplace && imageMap[it.name]) {
        imageChanged = true;
        return { ...it, image: imageMap[it.name] };
    }
    return it;
});
if (imageChanged) writeStorage(STORAGE.MENU, menuItems);

let cartItems = readStorage(STORAGE.CART, []);
let salesRecords = readStorage(STORAGE.SALES, []);
let qrShown = false;

// Elements
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.tab-panel');
const menuGrid = document.getElementById('menuGrid');
const menuSearch = document.getElementById('menuSearch');

const cartBody = document.getElementById('cartBody');
const subtotalEl = document.getElementById('subtotal');
const totalEl = document.getElementById('total');
const clearCartBtn = document.getElementById('clearCartBtn');
const payNowBtn = document.getElementById('payNowBtn');
const printBillBtn = document.getElementById('printBillBtn');
const customerNameEl = document.getElementById('customerName');
const qrWrap = document.getElementById('qrWrap');
const qrImage = document.getElementById('qrImage');

const manageTableBody = document.getElementById('manageTableBody');
const menuForm = document.getElementById('menuForm');
const itemNameEl = document.getElementById('itemName');
const itemPriceEl = document.getElementById('itemPrice');
const itemImageEl = document.getElementById('itemImage');
const editingIdEl = document.getElementById('editingId');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const saveItemBtn = document.getElementById('saveItemBtn');

const reportMonthEl = document.getElementById('reportMonth');
const reportBody = document.getElementById('reportBody');
const reportTotal = document.getElementById('reportTotal');
const exportCsvBtn = document.getElementById('exportCsvBtn');

// Tabs
tabs.forEach(btn => {
    btn.addEventListener('click', () => {
        tabs.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
        panels.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        const tab = btn.dataset.tab;
        document.getElementById(`tab-${tab}`).classList.add('active');
        if (tab === 'billing') renderCart();
        if (tab === 'reports') renderReport();
        if (tab === 'manage') renderManageTable();
    });
});

// Render menu
function renderMenu() {
    const q = (menuSearch.value || '').toLowerCase();
    const list = menuItems.filter(m => m.name.toLowerCase().includes(q));
    menuGrid.innerHTML = '';
    list.forEach(item => {
        const div = document.createElement('div');
        div.className = 'card menu-card';
        div.innerHTML = `
            <img src="${item.image || 'https://placehold.co/400x300?text=Menu'}" alt="${item.name}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='https://placehold.co/400x300?text=No+Image'">
            <div class="row">
                <span class="name">${item.name}</span>
                <span class="price">${currency(item.price)}</span>
            </div>
            <button class="btn btn-primary" data-action="add" data-id="${item.id}">Add</button>
        `;
        menuGrid.appendChild(div);
    });
}
menuSearch.addEventListener('input', renderMenu);

// Delegated click handler for Add buttons (robust across re-renders)
menuGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="add"][data-id]');
    if (!btn) return;
    addToCart(btn.dataset.id);
});

// Cart helpers
function addToCart(itemId) {
    const item = menuItems.find(m => m.id === itemId);
    if (!item) return;
    const wasEmpty = cartItems.length === 0;
    const existing = cartItems.find(c => c.id === itemId);
    if (existing) existing.qty += 1; else cartItems.push({ id: itemId, name: item.name, price: item.price, qty: 1 });
    persistCart();
    renderCart();
    // Stay on current tab; do not auto-switch to Billing
}

function updateQty(itemId, delta) {
    const entry = cartItems.find(c => c.id === itemId);
    if (!entry) return;
    entry.qty += delta;
    if (entry.qty <= 0) cartItems = cartItems.filter(c => c.id !== itemId);
    persistCart();
    renderCart();
}

function removeFromCart(itemId) {
    cartItems = cartItems.filter(c => c.id !== itemId);
    persistCart();
    renderCart();
}

function clearCart() {
    cartItems = [];
    persistCart();
    renderCart();
}

function persistCart() { writeStorage(STORAGE.CART, cartItems); }

function cartSummary() {
    const subtotal = cartItems.reduce((s, c) => s + c.price * c.qty, 0);
    const tax = 0;
    const total = subtotal;
    return { subtotal, tax, total };
}

// Snapshot cart directly from DOM to avoid any stale state
function getCartSnapshotFromDOM() {
    const rows = Array.from(cartBody?.querySelectorAll('tr') || []);
    const items = [];
    rows.forEach(tr => {
        const tds = tr.querySelectorAll('td');
        if (tds.length < 4) return;
        const name = tds[0].textContent?.trim() || '';
        const priceText = tds[1].textContent?.replace(/[^0-9.]/g, '') || '0';
        const qtyText = tds[2].querySelector('span')?.textContent || '0';
        const price = parseFloat(priceText) || 0;
        const qty = parseInt(qtyText, 10) || 0;
        if (name && qty > 0) items.push({ name, price, qty });
    });
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    return { items, subtotal, tax: 0, total: subtotal };
}

function renderCart() {
    cartBody.innerHTML = '';
    cartItems.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${c.name}</td>
            <td>${currency(c.price)}</td>
            <td>
                <div class="qty">
                    <button class="btn btn-outline" aria-label="decrease">-</button>
                    <span>${c.qty}</span>
                    <button class="btn btn-outline" aria-label="increase">+</button>
                </div>
            </td>
            <td>${currency(c.qty * c.price)}</td>
            <td><button class="btn btn-danger" aria-label="remove">×</button></td>
        `;
        const qtyButtons = tr.querySelectorAll('.qty button');
        const decBtn = qtyButtons[0];
        const incBtn = qtyButtons[1];
        if (decBtn) decBtn.addEventListener('click', () => updateQty(c.id, -1));
        if (incBtn) incBtn.addEventListener('click', () => updateQty(c.id, +1));
        tr.querySelector('.btn-danger').addEventListener('click', () => removeFromCart(c.id));
        cartBody.appendChild(tr);
    });

    const s = cartSummary();
    subtotalEl.textContent = currency(s.subtotal);
    totalEl.textContent = currency(s.total);

    const emptyRow = document.getElementById('cartEmpty');
    if (emptyRow) emptyRow.style.display = cartItems.length ? 'none' : '';
}

clearCartBtn.addEventListener('click', clearCart);

// Pay Now (QR) and record sale
payNowBtn.addEventListener('click', () => {
    // Build from DOM to ensure latest visible state
    const snap = getCartSnapshotFromDOM();
    if (cartItems.length === 0) return;

    if (!qrShown) {
        const descriptor = encodeURIComponent(`HOTEL BISMI | Total ${snap.total.toFixed(2)}`);
        const data = `upi://pay?pn=HOTEL%20BISMI&am=${snap.total.toFixed(2)}&tn=${descriptor}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;
        qrImage.src = 'images/QRpay.jpg';
        qrWrap.classList.remove('hidden');
        qrShown = true;
        payNowBtn.textContent = 'Payment Done';
        payNowBtn.classList.add('btn-success');
        return;
    }

    // Record sale
    const currentItems = snap.items;
    const cur = snap;
    const record = {
        id: cryptoRandomId(),
        dt: new Date().toISOString(),
        customer: (customerNameEl.value || '').trim() || 'Walk-in',
        items: currentItems,
        subtotal: cur.subtotal,
        tax: cur.tax,
        total: cur.total
    };
    salesRecords.push(record);
    writeStorage(STORAGE.SALES, salesRecords);

    // Reset
    qrShown = false;
    payNowBtn.textContent = 'Pay Now';
    payNowBtn.classList.remove('btn-success');
    qrWrap.classList.add('hidden');
    qrImage.removeAttribute('src');
    clearCart();
    renderReport();
    window.alert('Payment recorded. Thank you!');
});

// Print Bill
printBillBtn.addEventListener('click', () => {
    // Snapshot directly from DOM to avoid stale state
    const snap = getCartSnapshotFromDOM();
    if (snap.items.length === 0) return;
    const s = snap;
    const template = document.getElementById('billTemplate').content.cloneNode(true);
    template.querySelector('[data-bill="customer"]').textContent = (customerNameEl.value || '').trim() || 'Walk-in';
    template.querySelector('[data-bill="date"]').textContent = new Date().toLocaleString();
    template.querySelector('[data-bill="subtotal"]').textContent = currency(s.subtotal);
    template.querySelector('[data-bill\="total\"]').textContent = currency(s.total);

    const tbody = template.querySelector('[data-bill="items"]');
    snap.items.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${c.name}</td><td>${c.qty}</td><td>${currency(c.price)}</td><td>${currency(c.qty * c.price)}</td>`;
        tbody.appendChild(tr);
    });

    const win = window.open('', 'PRINT', 'height=600,width=400');
    win.document.write('<html><head><title>Bill - HOTEL BISMI</title></head><body>');
    win.document.body.appendChild(template);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    win.print();
});

// Manage Menu CRUD
function renderManageTable() {
    manageTableBody.innerHTML = '';
    menuItems.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.name}</td>
            <td>${currency(item.price)}</td>
            <td>${item.image ? `<img src="${item.image}" alt="${item.name}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='https://placehold.co/96x72?text=No+Image'">` : '-'}</td>
            <td class="actions">
                <button class="btn btn-outline" data-action="edit">Edit</button>
                <button class="btn btn-danger" data-action="delete">Delete</button>
            </td>
        `;
        tr.querySelector('[data-action="edit"]').addEventListener('click', () => startEdit(item.id));
        tr.querySelector('[data-action="delete"]').addEventListener('click', () => deleteItem(item.id));
        manageTableBody.appendChild(tr);
    });
}

function startEdit(id) {
    const item = menuItems.find(x => x.id === id);
    if (!item) return;
    itemNameEl.value = item.name;
    itemPriceEl.value = item.price;
    itemImageEl.value = item.image || '';
    editingIdEl.value = id;
    saveItemBtn.textContent = 'Update Item';
    cancelEditBtn.classList.remove('hidden');
}

cancelEditBtn.addEventListener('click', () => {
    menuForm.reset();
    editingIdEl.value = '';
    saveItemBtn.textContent = 'Add Item';
    cancelEditBtn.classList.add('hidden');
});

menuForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = itemNameEl.value.trim();
    const price = parseFloat(itemPriceEl.value);
    const image = itemImageEl.value.trim();
    if (!name || isNaN(price) || price < 0) return;
    const editingId = editingIdEl.value;
    if (editingId) {
        const idx = menuItems.findIndex(i => i.id === editingId);
        if (idx !== -1) {
            menuItems[idx] = { ...menuItems[idx], name, price, image };
        }
    } else {
        menuItems.push({ id: cryptoRandomId(), name, price, image });
    }
    writeStorage(STORAGE.MENU, menuItems);
    menuForm.reset();
    editingIdEl.value = '';
    saveItemBtn.textContent = 'Add Item';
    cancelEditBtn.classList.add('hidden');
    renderMenu();
    renderManageTable();
});

function deleteItem(id) {
    if (!confirm('Delete this item?')) return;
    menuItems = menuItems.filter(i => i.id !== id);
    writeStorage(STORAGE.MENU, menuItems);
    renderMenu();
    renderManageTable();
}

// Reports
function renderReport() {
    reportBody.innerHTML = '';
    const monthStr = reportMonthEl.value; // yyyy-MM
    const records = salesRecords.filter(r => {
        if (!monthStr) return true;
        const d = new Date(r.dt);
        const m = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        return m === monthStr;
    });
    let total = 0;
    records.forEach(r => {
        total += r.total;
        const tr = document.createElement('tr');
        const itemsStr = r.items.map(i => `${i.name} x${i.qty}`).join(', ');
        tr.innerHTML = `
            <td>${new Date(r.dt).toLocaleString()}</td>
            <td>${r.customer}</td>
            <td>${itemsStr}</td>
            <td>${currency(r.total)}</td>
        `;
        reportBody.appendChild(tr);
    });
    reportTotal.textContent = currency(total);
}

reportMonthEl.addEventListener('change', renderReport);

exportCsvBtn.addEventListener('click', () => {
    const monthStr = reportMonthEl.value;
    const rows = [['Date/Time','Customer','Items','Subtotal','Tax','Total']];
    salesRecords.forEach(r => {
        const d = new Date(r.dt);
        const m = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        if (monthStr && m !== monthStr) return;
        const itemsStr = r.items.map(i => `${i.name} x${i.qty}`).join('; ');
        rows.push([d.toLocaleString(), r.customer, itemsStr, r.subtotal.toFixed(2), r.tax.toFixed(2), r.total.toFixed(2)]);
    });
    const csv = rows.map(r => r.map(field => `"${String(field).replaceAll('"','""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hotel-bismi-sales${monthStr ? '-' + monthStr : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
});

// Init
renderMenu();
renderCart();
renderManageTable();
renderReport();


