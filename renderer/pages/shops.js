window.Shops = {
  shops: [],
  proposals: [],
  currentFilteredShops: [],
  editingShopId: null,

  async render(container) {
    container.innerHTML = `
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-3xl font-bold text-slate-800">Shops</h2>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Manage Retail Shops, Routes & Accounts</p>
        </div>
        <div class="flex items-center gap-2.5 shrink-0">
          <button type="button" onclick="Shops.printShopsReport()" class="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer">
            <i data-lucide="printer" class="w-4 h-4 text-amber-400"></i>
            <span>Print Summary</span>
          </button>
          <button type="button" onclick="Shops.openShopModal()" class="h-10 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer">
            <i data-lucide="plus" class="w-4 h-4 stroke-[3]"></i>
            <span>Add Shop</span>
          </button>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3.5 border-l-4 border-l-amber-500">
          <div class="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <i data-lucide="store" class="w-5 h-5"></i>
          </div>
          <div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Registered Shops</p>
            <h3 id="shops-stat-count" class="text-xl font-black text-slate-800 tabular-nums">0</h3>
          </div>
        </div>

        <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3.5 border-l-4 border-l-blue-500">
          <div class="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <i data-lucide="receipt" class="w-5 h-5"></i>
          </div>
          <div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Orders Invoiced</p>
            <h3 id="shops-stat-orders" class="text-xl font-black text-slate-800 tabular-nums">0</h3>
          </div>
        </div>

        <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3.5 border-l-4 border-l-emerald-500">
          <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <i data-lucide="trending-up" class="w-5 h-5"></i>
          </div>
          <div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Shop Sales</p>
            <h3 id="shops-stat-sales" class="text-xl font-black text-emerald-600 tabular-nums font-display">Rs. 0</h3>
          </div>
        </div>

        <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3.5 border-l-4 border-l-rose-500">
          <div class="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <i data-lucide="wallet" class="w-5 h-5"></i>
          </div>
          <div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Receivables (Due)</p>
            <h3 id="shops-stat-due" class="text-xl font-black text-rose-600 tabular-nums font-display">Rs. 0</h3>
          </div>
        </div>
      </div>

      <!-- Main Card: Filter & Table -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col">
        <!-- Filter Header -->
        <div class="p-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3 flex-wrap">
          <div class="relative flex-1 min-w-[240px]">
            <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input type="text" id="shops-search-input" oninput="Shops.applyFilters()" placeholder="Search Shops..." class="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all">
          </div>
        </div>

        <!-- Table View -->
        <div class="overflow-x-auto max-h-[calc(100vh-360px)] custom-scrollbar">
          <table class="w-full text-left border-collapse">
            <thead class="bg-slate-50/90 text-slate-500 text-[11px] font-black uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200 shadow-sm">
              <tr>
                <th class="py-3 px-3 text-center w-12 border-r border-slate-200/80">#</th>
                <th class="py-3 px-4 border-r border-slate-200/80">Shop Name</th>
                <th class="py-3 px-4 border-r border-slate-200/80">Phone</th>
                <th class="py-3 px-4 border-r border-slate-200/80">Address</th>
                <th class="py-3 px-3 text-center border-r border-slate-200/80">Orders</th>
                <th class="py-3 px-4 text-right border-r border-slate-200/80">Total Invoiced</th>
                <th class="py-3 px-4 text-right border-r border-slate-200/80">Balance (Due)</th>
                <th class="py-3 px-3 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody id="shops-table-body" class="divide-y divide-slate-100 text-xs">
              <!-- Injected via renderList() -->
            </tbody>
          </table>
        </div>
      </div>

      <!-- Add / Edit Shop Modal -->
      <div id="shop-modal" onclick="if(event.target === this) Shops.closeShopModal()" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[500] backdrop-blur-md transition-opacity opacity-0 p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all scale-95" id="shop-modal-card">
          <div class="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                <i data-lucide="store" class="w-4 h-4"></i>
              </div>
              <h3 id="shop-modal-title" class="font-black text-base">Add New Shop</h3>
            </div>
            <button type="button" onclick="Shops.closeShopModal()" class="text-slate-400 hover:text-white transition-colors cursor-pointer">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <form id="shop-form" onsubmit="Shops.saveShopForm(event)" class="p-6 space-y-4">
            <div>
              <label class="block text-xs font-black uppercase text-slate-500 mb-1">Shop Name <span class="text-rose-500">*</span></label>
              <input type="text" id="shop-name-input" required placeholder="e.g. Parking Canteen" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:border-amber-500 outline-none">
            </div>

            <div>
              <label class="block text-xs font-black uppercase text-slate-500 mb-1">Phone Number</label>
              <input type="tel" id="shop-phone-input" placeholder="e.g. 0329-9934620" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:border-amber-500 outline-none">
            </div>

            <div>
              <label class="block text-xs font-black uppercase text-slate-500 mb-1">NTN <span class="text-slate-400 font-normal lowercase">(optional)</span></label>
              <input type="text" id="shop-ntn-input" placeholder="e.g. 5563324-1" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:border-amber-500 outline-none">
            </div>

            <div>
              <label class="block text-xs font-black uppercase text-slate-500 mb-1">Address / Street / Market</label>
              <input type="text" id="shop-address-input" placeholder="e.g. Near Barrier No. 3, Wah Cantt" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:border-amber-500 outline-none">
            </div>

            <div>
              <label class="block text-xs font-black uppercase text-slate-500 mb-1">Opening Balance / Due (Rs.)</label>
              <input type="number" id="shop-amount-input" value="0" step="1" placeholder="0" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:border-amber-500 outline-none">
            </div>

            <div>
              <label class="block text-xs font-black uppercase text-slate-500 mb-1">Notes / Delivery Route</label>
              <input type="text" id="shop-notes-input" placeholder="e.g. Route A, Delivery on Tuesday" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:border-amber-500 outline-none">
            </div>

            <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onclick="Shops.closeShopModal()" class="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer">Cancel</button>
              <button type="submit" class="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-all cursor-pointer">Save Shop</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Shop Transactions / Ledger Modal -->
      <div id="shop-ledger-modal" onclick="if(event.target === this) Shops.closeLedgerModal()" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[500] backdrop-blur-md transition-opacity opacity-0 p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden transform transition-all scale-95 flex flex-col max-h-[88vh]" id="shop-ledger-card">
          <div class="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                <i data-lucide="file-text" class="w-4 h-4"></i>
              </div>
              <div>
                <h3 id="shop-ledger-title" class="font-black text-base">Shop Ledger</h3>
                <p id="shop-ledger-subtitle" class="text-[11px] text-slate-400 font-medium">Sales & Transaction History</p>
              </div>
            </div>
            <button type="button" onclick="Shops.closeLedgerModal()" class="text-slate-400 hover:text-white transition-colors cursor-pointer">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <div class="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-4 shrink-0">
            <div id="shop-ledger-summary" class="flex items-center gap-6 text-xs font-bold text-slate-600">
              <!-- Summary pills -->
            </div>
          </div>

          <div class="flex-1 overflow-y-auto custom-scrollbar p-4">
            <table class="w-full text-left border-collapse text-xs">
              <thead class="bg-slate-100 text-slate-500 uppercase text-[10px] font-black tracking-wider sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th class="py-2.5 px-3">Date</th>
                  <th class="py-2.5 px-3">Invoice / Ref #</th>
                  <th class="py-2.5 px-3">Salesman</th>
                  <th class="py-2.5 px-3 text-center">Payment</th>
                  <th class="py-2.5 px-3 text-right">Invoiced (Rs.)</th>
                  <th class="py-2.5 px-3 text-right">Received (Rs.)</th>
                  <th class="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody id="shop-ledger-tbody" class="divide-y divide-slate-100">
                <!-- Injected via renderLedger() -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    await this.loadData();
  },

  async loadData() {
    app.showLoading();
    try {
      this.shops = await window.api.getShops() || [];
      this.proposals = await window.api.getProposals() || [];

      this.updateStats();
      this.applyFilters();
    } catch (e) {
      console.error("Failed to load shops:", e);
    } finally {
      app.hideLoading();
    }
    if (window.lucide) lucide.createIcons();
  },

  updateStats() {
    const countEl = document.getElementById('shops-stat-count');
    const ordersEl = document.getElementById('shops-stat-orders');
    const salesEl = document.getElementById('shops-stat-sales');
    const dueEl = document.getElementById('shops-stat-due');

    let totalOrders = 0;
    let totalSales = 0;
    let totalDue = 0;

    this.shops.forEach(shop => {
      const shopSales = this.proposals.filter(p => 
        (p.shop_name && p.shop_name.toLowerCase() === shop.name.toLowerCase()) || 
        (p.customer_name && p.customer_name.toLowerCase() === shop.name.toLowerCase())
      );
      totalOrders += shopSales.length;
      shopSales.forEach(s => {
        totalSales += (s.retail_total || 0);
      });
      totalDue += (shop.amount || 0);
    });

    if (countEl) countEl.textContent = this.shops.length;
    if (ordersEl) ordersEl.textContent = totalOrders;
    if (salesEl) salesEl.textContent = app.formatCurrency(totalSales);
    if (dueEl) dueEl.textContent = app.formatCurrency(totalDue);
  },

  applyFilters() {
    const q = (document.getElementById('shops-search-input')?.value || '').trim().toLowerCase();

    this.currentFilteredShops = this.shops.filter(s => {
      return !q || 
        (s.name || '').toLowerCase().includes(q) || 
        (s.owner_name || '').toLowerCase().includes(q) || 
        (s.address || '').toLowerCase().includes(q) || 
        (s.city || '').toLowerCase().includes(q) || 
        (s.phone || '').toLowerCase().includes(q) ||
        (s.ntn || '').toLowerCase().includes(q) ||
        (s.notes || '').toLowerCase().includes(q);
    });

    this.renderList();
  },

  renderList() {
    const tbody = document.getElementById('shops-table-body');
    if (!tbody) return;

    if (this.currentFilteredShops.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="px-6 py-12 text-center text-slate-400">
            <i data-lucide="store" class="w-12 h-12 mx-auto mb-2 opacity-30 text-slate-400"></i>
            <p class="font-bold text-sm text-slate-600">No shops found</p>
            <p class="text-xs text-slate-400 mt-1">Click "+ Add Shop" to register a retail shop.</p>
          </td>
        </tr>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    tbody.innerHTML = this.currentFilteredShops.map((shop, idx) => {
      const shopSales = this.proposals.filter(p => 
        (p.shop_name && p.shop_name.toLowerCase() === shop.name.toLowerCase()) || 
        (p.customer_name && p.customer_name.toLowerCase() === shop.name.toLowerCase())
      );
      const totalInvoiced = shopSales.reduce((acc, p) => acc + (p.retail_total || 0), 0);
      const balance = shop.amount || 0;

      return `
        <tr class="hover:bg-slate-50/80 transition-colors group">
          <td class="py-3 px-3 text-center text-xs font-bold text-slate-400 tabular-nums border-r border-slate-100">${idx + 1}</td>
          
          <td class="py-3 px-4 border-r border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-xs border border-amber-200/60 shrink-0">
                ${(shop.name || 'S').charAt(0).toUpperCase()}
              </div>
              <span class="font-black text-slate-800 text-[13px] block">${shop.name}</span>
            </div>
          </td>

          <td class="py-3 px-4 border-r border-slate-100 font-bold text-slate-600 tabular-nums">
            ${shop.phone || '<span class="text-slate-300 font-normal">-</span>'}
          </td>

          <td class="py-3 px-4 border-r border-slate-100 font-bold text-slate-600">
            ${shop.address || shop.city || '<span class="text-slate-300 font-normal">-</span>'}
          </td>

          <td class="py-3 px-3 text-center border-r border-slate-100 font-black text-slate-800 tabular-nums">
            ${shopSales.length}
          </td>

          <td class="py-3 px-4 text-right border-r border-slate-100 font-black text-slate-900 tabular-nums font-display">
            ${app.formatCurrency(totalInvoiced)}
          </td>

          <td class="py-3 px-4 text-right border-r border-slate-100 font-black tabular-nums font-display ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}">
            ${app.formatCurrency(balance)}
          </td>

          <td class="py-3 px-3 text-center">
            <div class="flex items-center justify-center gap-1">
              <button type="button" onclick="Shops.openLedgerModal(${shop.id})" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer" title="View Invoices & Ledger">
                <i data-lucide="file-text" class="w-4 h-4"></i>
              </button>
              <button type="button" onclick="Shops.openShopModal(${shop.id})" class="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer" title="Edit Shop">
                <i data-lucide="edit-2" class="w-4 h-4"></i>
              </button>
              <button type="button" onclick="Shops.deleteShop(${shop.id})" class="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title="Delete Shop">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  openShopModal(id = null) {
    this.editingShopId = id;
    const modal = document.getElementById('shop-modal');
    const card = document.getElementById('shop-modal-card');
    const titleEl = document.getElementById('shop-modal-title');

    if (!modal || !card) return;

    if (id) {
      const shop = this.shops.find(s => s.id === id);
      if (shop) {
        titleEl.textContent = `Edit Shop: ${shop.name}`;
        document.getElementById('shop-name-input').value = shop.name || '';
        document.getElementById('shop-phone-input').value = shop.phone || '';
        document.getElementById('shop-ntn-input').value = shop.ntn || '';
        document.getElementById('shop-address-input').value = shop.address || shop.city || '';
        document.getElementById('shop-amount-input').value = shop.amount || 0;
        document.getElementById('shop-notes-input').value = shop.notes || '';
      }
    } else {
      titleEl.textContent = 'Add New Shop';
      document.getElementById('shop-form').reset();
      document.getElementById('shop-amount-input').value = '0';
      if (document.getElementById('shop-ntn-input')) document.getElementById('shop-ntn-input').value = '';
    }

    modal.classList.remove('hidden', 'opacity-0');
    modal.classList.add('flex');
    if (card) card.classList.remove('scale-95');
    document.getElementById('shop-name-input')?.focus();
    if (window.lucide) lucide.createIcons();
  },

  closeShopModal() {
    const modal = document.getElementById('shop-modal');
    const card = document.getElementById('shop-modal-card');
    if (!modal) return;

    modal.classList.add('hidden');
    modal.classList.remove('flex');
    this.editingShopId = null;
  },

  async saveShopForm(e) {
    e.preventDefault();
    const name = document.getElementById('shop-name-input').value.trim();
    if (!name) return;

    const data = {
      name: name,
      owner_name: '',
      phone: document.getElementById('shop-phone-input').value.trim(),
      ntn: (document.getElementById('shop-ntn-input')?.value || '').trim(),
      address: document.getElementById('shop-address-input').value.trim(),
      amount: parseFloat(document.getElementById('shop-amount-input').value) || 0,
      notes: document.getElementById('shop-notes-input').value.trim()
    };

    if (this.editingShopId) {
      data.id = this.editingShopId;
    }

    app.showLoading();
    try {
      await window.api.saveShop(data);
      this.closeShopModal();
      await this.loadData();
      app.showAlert({ title: 'Success', message: `Shop <b>${name}</b> saved successfully!` });
    } catch (err) {
      console.error(err);
      app.showAlert({ title: 'Error', message: 'Failed to save shop.' });
    } finally {
      app.hideLoading();
    }
  },

  deleteShop(id) {
    const shop = this.shops.find(s => s.id === id);
    if (!shop) return;

    app.showConfirm({
      title: 'Delete Shop',
      message: `Are you sure you want to delete <b class="text-slate-900">${shop.name}</b> from the shops directory?`,
      confirmText: 'Delete',
      confirmColor: 'red',
      onConfirm: async () => {
        app.showLoading();
        try {
          await window.api.deleteShop(id);
          await this.loadData();
          app.showAlert({ title: 'Deleted', message: `Shop <b>${shop.name}</b> removed.` });
        } catch (err) {
          console.error(err);
          app.showAlert({ title: 'Error', message: 'Failed to delete shop.' });
        } finally {
          app.hideLoading();
        }
      }
    });
  },

  openLedgerModal(id) {
    const shop = this.shops.find(s => s.id === id);
    if (!shop) return;
    this.activeLedgerShop = shop;

    const modal = document.getElementById('shop-ledger-modal');
    const card = document.getElementById('shop-ledger-card');
    const title = document.getElementById('shop-ledger-title');
    const subtitle = document.getElementById('shop-ledger-subtitle');
    const summary = document.getElementById('shop-ledger-summary');
    const tbody = document.getElementById('shop-ledger-tbody');

    if (!modal) return;

    title.textContent = shop.name;
    const locationInfo = shop.address || shop.city || '';
    subtitle.textContent = `${shop.phone ? shop.phone : ''}${locationInfo ? (shop.phone ? ' • ' : '') + locationInfo : ''}`;

    const shopSales = this.proposals.filter(p => 
      (p.shop_name && p.shop_name.toLowerCase() === shop.name.toLowerCase()) || 
      (p.customer_name && p.customer_name.toLowerCase() === shop.name.toLowerCase())
    );

    const totalInvoiced = shopSales.reduce((acc, p) => acc + (p.retail_total || 0), 0);
    const totalReceived = shopSales.reduce((acc, p) => acc + (p.received_amount || 0), 0);
    const balance = shop.amount || 0;

    summary.innerHTML = `
      <div>Total Invoiced: <span class="text-slate-900 font-black">${app.formatCurrency(totalInvoiced)}</span></div>
      <div>Received: <span class="text-emerald-600 font-black">${app.formatCurrency(totalReceived)}</span></div>
      <div>Outstanding Balance: <span class="font-black ${balance > 0 ? 'text-rose-600' : 'text-slate-800'}">${app.formatCurrency(balance)}</span></div>
    `;

    if (shopSales.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="py-8 text-center text-slate-400 font-medium">No sales invoices recorded for this shop yet.</td>
        </tr>
      `;
    } else {
      tbody.innerHTML = shopSales.map(s => `
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="py-2.5 px-3 font-semibold text-slate-600">${app.formatDate(s.date)}</td>
          <td class="py-2.5 px-3 font-black text-slate-900">#${s.proposal_number}</td>
          <td class="py-2.5 px-3 font-bold text-slate-600">${s.salesman_name || s.seller_name || '-'}</td>
          <td class="py-2.5 px-3 text-center"><span class="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold">${s.payment_method || 'Cash'}</span></td>
          <td class="py-2.5 px-3 text-right font-black text-slate-900 font-display">${app.formatCurrency(s.retail_total)}</td>
          <td class="py-2.5 px-3 text-right font-black text-emerald-600 font-display">${app.formatCurrency(s.received_amount || s.retail_total)}</td>
          <td class="py-2.5 px-3 text-right">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${s.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}">${s.status || 'Paid'}</span>
          </td>
        </tr>
      `).join('');
    }

    modal.classList.remove('hidden', 'opacity-0');
    modal.classList.add('flex');
    if (card) card.classList.remove('scale-95');
    if (window.lucide) lucide.createIcons();
  },

  closeLedgerModal() {
    const modal = document.getElementById('shop-ledger-modal');
    if (!modal) return;

    modal.classList.add('hidden');
    modal.classList.remove('flex');
    this.activeLedgerShop = null;
  },

  printShopsReport() {
    window.print();
  },

  printShopLedger() {
    window.print();
  }
};
