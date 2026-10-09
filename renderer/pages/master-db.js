const MasterDB = {
  currentCategory: 'all',
  categories: [], // Dynamically loaded
  products: [],
  labels: {},
  currentSalesPeriod: 'daily',
  sectionMap: {}, // Dynamically loaded
  revSectionMap: {}, // Dynamically loaded
  isAllSalesView: false,
  _lastSalesData: [],
  units: [], // Dynamically loaded

  async render(container) {
    // Sync units and categories from DB
    this.settings = await window.api.getSettings();
    this.units = await window.api.getUnits();
    const stats = await window.api.getCategoryStats();
    this.sectionMap = {
        panels: 'pnl', inverters: 'inv', structures: 'str', cables: 'cab',
        breakers: 'brk', batteries: 'bat', misc: 'msc', others: 'oth'
    };
    this.revSectionMap = {};
    Object.entries(this.sectionMap).forEach(([k, v]) => {
        this.revSectionMap[v] = k;
        this.revSectionMap[k] = k; // Map slug to itself
    });

    const totalCount = stats.reduce((sum, s) => sum + (s.count || 0), 0);

    const actualCats = stats.map(s => {
        this.labels[s.slug] = s.label;
        if (!this.sectionMap[s.slug]) {
            this.sectionMap[s.slug] = s.slug; 
            this.revSectionMap[s.slug] = s.slug;
        }
        return { 
            id: s.slug, 
            label: s.label, 
            count: s.count,
            fields: ['item_name']
        };
    });

    this.categories = [
        {
            id: 'all',
            label: 'All',
            count: totalCount,
            fields: ['item_name']
        },
        ...actualCats
    ];

    if (!this.currentCategory || !this.categories.some(c => c.id === this.currentCategory)) {
        this.currentCategory = 'all';
    }

    container.innerHTML = `
      <div class="flex justify-between items-center mb-6 gap-4 no-print flex-wrap lg:flex-nowrap">
        <div class="flex items-center flex-1 max-w-2xl gap-3 min-w-[300px]">
          <h1 class="text-3xl font-bold text-slate-800 shrink-0">Stock</h1>
          <div class="relative flex-1 group no-print">
            <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-accent transition-colors"></i>
            <input type="text" id="db-search" 
              oninput="MasterDB.applySearch()"
              placeholder="Search Stock Items..." 
              class="w-full h-10 bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:border-accent focus:ring-4 focus:ring-amber-50/50 transition-all outline-none shadow-sm font-medium">
          </div>
          <div class="flex items-center gap-2 no-print shrink-0">
            <div class="h-6 w-[1px] bg-slate-200 mx-1"></div>
            <label class="text-[10px] font-black text-rose-500 uppercase tracking-widest whitespace-nowrap">Low Stock &le;</label>
            <input type="number" id="db-low-stock-filter" 
              min="0" step="1"
              oninput="MasterDB.applySearch()"
              placeholder="Any" 
              class="w-16 h-10 bg-white border border-slate-200 rounded-lg py-2 px-2 text-xs focus:border-rose-400 focus:ring-4 focus:ring-rose-50 transition-all outline-none shadow-sm font-black text-rose-600 text-center">
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
            <button onclick="MasterDB.openSalesStats(true)" class="h-10 px-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm hover:shadow transition-all active:scale-95 border border-slate-900 cursor-pointer">
              <i data-lucide="globe" class="w-4 h-4 text-amber-400"></i>
              <span>All Sales</span>
            </button>
            <div class="h-6 w-[1px] bg-slate-200 mx-1"></div>
            <button onclick="MasterDB.openManageCategoriesModal(true)" class="h-10 px-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer">
              <i data-lucide="settings" class="w-4 h-4 text-slate-400"></i>
              <span>Categories</span>
            </button>
            <button onclick="MasterDB.openForm()" class="h-10 px-4 bg-accent hover:bg-amber-500 text-slate-950 font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm hover:shadow transition-all active:scale-95 border border-amber-400/50 cursor-pointer">
              <i data-lucide="plus" class="w-4 h-4 stroke-[2.5]"></i>
              <span>Add Item</span>
            </button>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row overflow-hidden h-[calc(100vh-170px)]">
        
        <!-- Sidebar Tabs -->
        <div class="w-full md:w-64 bg-slate-50 border-r border-slate-200 flex flex-col p-4 no-print">
          <div class="flex items-center justify-between mb-4 px-2">
            <div class="flex items-center gap-2">
              <h3 class="text-xl font-bold text-slate-800">Categories</h3>
              <div class="flex items-center gap-0.5">
                <button onclick="MasterDB.printStockList()" class="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors" title="Print Current Category Stock">
                  <i data-lucide="printer" class="w-4 h-4"></i>
                </button>
                <button onclick="MasterDB.openCustomPrintModal()" class="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors" title="Select Categories to Print & Sort">
                  <i data-lucide="list-checks" class="w-4 h-4"></i>
                </button>
              </div>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar">
            ${this.categories.filter(c => c.id !== 'all').length === 0 ? `
              <div class="p-4 text-center text-slate-400 text-xs">
                <p class="mb-2.5">No categories exist.</p>
                <button onclick="MasterDB.openManageCategoriesModal(true)" class="px-3 py-1.5 bg-accent hover:bg-amber-500 text-slate-900 font-bold rounded-lg text-xs shadow-sm transition-all cursor-pointer">
                  + Add Category
                </button>
              </div>
            ` : this.categories.map(c => `
                <button onclick="MasterDB.switchTab('${c.id}')" id="tab-${c.id}" class="db-tab group w-full text-left px-4 py-1.5 rounded-lg transition-all flex justify-between items-center text-sm ${this.currentCategory === c.id ? 'bg-white shadow-sm border border-slate-200 text-slate-900 font-bold' : 'text-slate-600 hover:bg-slate-100 font-medium'}">
                  <span class="truncate pr-2">${c.label}</span>
                  <span id="count-${c.id}" class="text-[10px] font-black bg-slate-200/50 text-slate-500 px-1.5 py-0.5 rounded-md min-w-[20px] text-center group-hover:bg-slate-200 transition-colors">${c.count || 0}</span>
                </button>
            `).join('')}
          </div>
        </div>

        <!-- Main Data Table -->
        <div class="flex-1 p-0 overflow-auto relative custom-scrollbar">
          <table class="w-full text-sm text-left border-b border-slate-200">
            <thead class="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[13px] font-black tracking-wider sticky top-0 z-10 shadow-sm" id="db-thead">
            </thead>
            <tbody id="db-tbody" class="divide-y divide-slate-200 bg-white">
            </tbody>
          </table>
        </div>
      </div>

      <!-- Form Modal -->
      <div id="db-modal" onclick="if(event.target === this) MasterDB.closeForm()" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[500] backdrop-blur-md transition-opacity opacity-0 no-print">
        <div class="bg-white rounded-2xl shadow-2xl p-6 max-w-3xl w-full mx-4 transform transition-all scale-95 max-h-[92vh] overflow-y-auto custom-scrollbar" id="db-card">
          <div class="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
            <h3 class="text-xl font-bold text-slate-800" id="db-modal-title">Add Item</h3>
            <button onclick="MasterDB.closeForm()" class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
          <form id="db-form" onsubmit="MasterDB.saveForm(event)" class="space-y-4">
            <input type="hidden" id="db-id">
            
            <div class="mb-4">
              <label class="block text-sm font-bold text-slate-700 mb-1">Company (Supplier) <span class="text-xs text-slate-400 font-normal">(Optional)</span></label>
              <select id="db-company" class="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-accent focus:border-accent font-bold">
                <option value="">Select Company (Optional)</option>
                <!-- Dynamically filled -->
              </select>
            </div>
            
            <div id="db-dynamic-fields" class="space-y-4"></div>

            <div class="mt-4 pt-4 border-t border-slate-100">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Stock (Boxes) *</label>
                <input type="number" id="db-stock" min="0" step="1" placeholder="0" required class="w-full border border-slate-300 rounded-lg p-2.5 font-black text-emerald-800 bg-emerald-50/40 border-emerald-300 focus:bg-white focus:ring-2 focus:ring-accent focus:border-accent tabular-nums text-center">
              </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100 items-start">
              <!-- Cost Price -->
              <div>
                <div class="h-6 flex items-center mb-1.5">
                  <label class="block text-xs font-bold text-red-600 uppercase">Cost Price (Rs.) *</label>
                </div>
                <input type="number" id="db-cost" min="0" step="any" required placeholder="0" oninput="MasterDB.onCostOrMarginChange('cost')" class="w-full h-10 border border-slate-300 rounded-xl px-3 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-accent focus:border-accent text-sm">
              </div>

              <!-- Margin with % / Rs. Toggle -->
              <div>
                <div class="h-6 flex items-center justify-between mb-1.5">
                  <label class="block text-xs font-bold text-blue-600 uppercase" id="db-margin-label">Margin (%)</label>
                  <div class="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-xs">
                    <button type="button" id="btn-margin-mode-pct" onclick="MasterDB.setMarginMode('pct')" class="px-2 py-0.5 text-[10px] font-black rounded-md transition-all bg-white text-blue-600 shadow-xs cursor-pointer" title="Margin as percentage">
                      %
                    </button>
                    <button type="button" id="btn-margin-mode-rs" onclick="MasterDB.setMarginMode('rs')" class="px-2 py-0.5 text-[10px] font-bold rounded-md transition-all text-slate-500 hover:text-slate-800 cursor-pointer" title="Margin in Rupees">
                      Rs.
                    </button>
                  </div>
                </div>
                <div class="relative">
                  <input type="hidden" id="db-margin-mode" value="pct">
                  <input type="number" id="db-margin-percent" min="0" max="100000" step="any" value="6" placeholder="6" oninput="MasterDB.onCostOrMarginChange('margin')" class="w-full h-10 border border-blue-200 bg-blue-50/30 rounded-xl px-3 pr-8 focus:bg-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400 font-bold text-blue-700 text-sm">
                  <span id="db-margin-suffix" class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-blue-400 pointer-events-none">%</span>
                </div>
              </div>

              <!-- Sale Price -->
              <div>
                <div class="h-6 flex items-center mb-1.5">
                  <label class="block text-xs font-bold text-emerald-600 uppercase">Sale Price (Rs.) *</label>
                </div>
                <input type="number" id="db-retail" min="0" step="any" required placeholder="0" oninput="MasterDB.onCostOrMarginChange('retail')" class="w-full h-10 border border-slate-300 rounded-xl px-3 font-black text-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 text-sm">
              </div>

              <!-- Profit -->
              <div>
                <div class="h-6 flex items-center mb-1.5">
                  <label class="block text-xs font-bold text-emerald-800 uppercase">Profit</label>
                </div>
                <input type="text" id="db-retail-profit" readonly tabindex="-1" placeholder="Rs. 0 (0%)" class="w-full h-10 border border-slate-200 bg-slate-50 rounded-xl px-3 font-bold text-slate-400 text-xs md:text-sm outline-none cursor-default truncate">
              </div>
            </div>
            
            <div class="pt-4 flex justify-between gap-3">
              <button type="button" onclick="MasterDB.closeForm()" class="px-6 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-all active:scale-95">Cancel</button>
              <div class="flex gap-2">
                <button type="button" onclick="MasterDB.saveForm(event, true)" class="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center gap-2">
                  <i data-lucide="plus" class="w-4 h-4"></i> Save & Add Another
                </button>
                <button type="submit" class="px-8 py-2.5 bg-accent hover:bg-amber-500 text-slate-900 rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2">
                  <i data-lucide="save" class="w-4 h-4"></i> Save Item
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <!-- Add Stock Modal -->
      <div id="add-stock-modal" onclick="if(event.target === this) MasterDB.closeAddStockModal()" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[500] backdrop-blur-md transition-opacity opacity-0 no-print">
        <div class="bg-white rounded-3xl shadow-2xl p-6 max-w-2xl w-full mx-4 transform transition-all scale-95" id="add-stock-card">
          <div class="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
            <div>
              <h3 class="text-xl font-bold text-slate-800" id="add-stock-modal-title">Add Stock</h3>
              <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5" id="add-stock-item-subtitle"></p>
            </div>
            <button onclick="MasterDB.closeAddStockModal()" class="text-slate-400 hover:text-slate-600 transition-colors"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>

          <form id="add-stock-form" onsubmit="MasterDB.saveAddStock(event)" class="space-y-4">
            <input type="hidden" id="add-stock-item-id">
            <input type="hidden" id="add-stock-item-slug">

            <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center">
              <div>
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Current Stock</span>
                <span class="text-sm font-black text-slate-800" id="add-stock-current-val">0 Bx</span>
              </div>
              <div class="text-right">
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest block">New Total Stock</span>
                <span class="text-sm font-black text-emerald-700" id="add-stock-new-val">0 Bx</span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Add Boxes *</label>
                <input type="number" id="add-stock-qty" min="1" step="1" placeholder="Boxes" required oninput="MasterDB.calcAddStockTotal()" class="w-full border border-slate-300 rounded-lg p-2.5 font-black text-center text-emerald-800 text-sm focus:ring-2 focus:ring-accent focus:border-accent">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Company (Supplier)</label>
                <select id="add-stock-company" class="w-full border border-slate-300 rounded-lg p-2.5 font-bold focus:ring-2 focus:ring-accent focus:border-accent">
                  <option value="">Select Supplier (Optional)</option>
                </select>
              </div>
            </div>

            <!-- Prices & Profit -->
            <div class="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label class="block text-xs font-bold text-red-600 uppercase mb-1">Cost Price (Rs.) *</label>
                <input type="number" id="add-stock-cost" min="0" step="1" required placeholder="0" oninput="MasterDB.calcAddStockTotal()" class="w-full border border-slate-300 rounded-lg p-2.5 font-bold focus:ring-2 focus:ring-accent focus:border-accent">
              </div>
              <div>
                <label class="block text-xs font-bold text-emerald-600 uppercase mb-1">Sale Price (Rs.) *</label>
                <input type="number" id="add-stock-retail-sale" min="0" step="1" required placeholder="0" oninput="MasterDB.calcAddStockTotal()" class="w-full border border-slate-300 rounded-lg p-2.5 font-bold focus:ring-2 focus:ring-accent focus:border-accent">
              </div>
              <div>
                <label class="block text-xs font-bold text-emerald-800 uppercase mb-1">Profit</label>
                <input type="text" id="add-stock-retail-profit" readonly tabindex="-1" placeholder="Rs. 0 (0%)" class="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 font-bold text-slate-400 text-sm outline-none cursor-default">
              </div>
            </div>

            <div class="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-bold text-emerald-900">Total Purchase Cost:</span>
                <span class="text-sm font-black text-emerald-800" id="add-stock-total-cost">Rs. 0</span>
              </div>
              <label class="flex items-center gap-2 mt-2 cursor-pointer">
                <input type="checkbox" id="add-stock-record-khata" checked class="w-4 h-4 rounded border-slate-300 text-accent focus:ring-accent">
                <span class="text-xs font-bold text-slate-700">Record in Company Khata / Ledger</span>
              </label>
            </div>

            <div class="pt-2 flex justify-end gap-3">
              <button type="button" onclick="MasterDB.closeAddStockModal()" class="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors">Cancel</button>
              <button type="submit" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2">
                <i data-lucide="check" class="w-4 h-4"></i> Add Stock
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Categories Manager Modal -->
      <div id="cat-modal" onclick="if(event.target === this) MasterDB.closeCategoriesModal()" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[500] backdrop-blur-md transition-opacity opacity-0 no-print">
        <div class="bg-white rounded-xl shadow-2xl p-6 max-w-xl w-full mx-4 transform transition-all scale-95" id="cat-card">
          <div class="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
            <h3 class="text-xl font-bold text-slate-800">Manage Categories & Units</h3>
            <button onclick="MasterDB.closeCategoriesModal()" class="text-slate-400 hover:text-slate-600 transition-colors hover:bg-slate-100 p-1.5 rounded-lg"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>

          <!-- Tabs -->
          <div class="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6">
            <button id="cat-tab-categories" onclick="MasterDB.switchManageTab('categories')" class="flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all bg-white shadow-sm text-slate-900">Categories</button>
            <button id="cat-tab-units" onclick="MasterDB.switchManageTab('units')" class="flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all text-slate-500 hover:text-slate-700">Units</button>
          </div>

          <!-- Categories Section -->
          <div id="cat-section-categories">
            <div class="mb-4">
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Add New Category</label>
              <div class="flex gap-2">
                <input type="text" id="new-cat-name" placeholder="e.g. Smart Home, CCTV..." 
                  onkeydown="if(event.key==='Enter') MasterDB.addNewCategory()"
                  class="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-accent focus:bg-white outline-none transition-all">
                <button onclick="MasterDB.addNewCategory()" class="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2">
                  <i data-lucide="plus" class="w-4 h-4 text-accent"></i> Add
                </button>
              </div>
            </div>

            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Manage Existing</label>
            <div class="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar" id="cat-list"></div>
          </div>

          <!-- Units Section -->
          <div id="cat-section-units" class="hidden">
            <div class="mb-4">
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Add New Unit</label>
              <div class="flex gap-2">
                <input type="text" id="new-unit-name" placeholder="e.g. METER, PKT, BDL..." 
                  onkeydown="if(event.key==='Enter') MasterDB.addNewUnit()"
                  class="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-accent focus:bg-white outline-none transition-all uppercase">
                <button onclick="MasterDB.addNewUnit()" class="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2">
                  <i data-lucide="plus" class="w-4 h-4 text-accent"></i> Add
                </button>
              </div>
            </div>

            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Manage Units</label>
            <div class="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar" id="units-list"></div>
          </div>

          <div class="pt-6 flex justify-end">
            <button onclick="MasterDB.closeCategoriesModal()" class="px-8 py-2.5 bg-accent hover:bg-amber-500 text-slate-900 rounded-xl font-bold shadow-lg transition-all active:scale-95">Done</button>
          </div>
        </div>
      </div>

      <div id="sales-modal" onclick="if(event.target === this) MasterDB.closeSalesStats()" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[500] backdrop-blur-md transition-opacity opacity-0 no-print">
        <div class="bg-white rounded-xl shadow-2xl p-6 max-w-6xl w-full mx-4 transform transition-all scale-95" id="sales-card">
          <div class="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <div>
              <h3 class="text-2xl font-bold text-slate-800">Sales Statistics</h3>
              <p class="text-slate-500 text-sm mt-1" id="sales-category-name">Category: Electronics</p>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
                <div class="bg-slate-100 p-1 rounded-lg flex gap-1">
                   <button onclick="MasterDB.switchSalesPeriod('daily')" id="btn-sales-daily" class="period-btn px-3 py-1.5 rounded-md text-xs font-black bg-white shadow-sm text-slate-900 transition-all cursor-pointer">Daily</button>
                   <button onclick="MasterDB.switchSalesPeriod('monthly')" id="btn-sales-monthly" class="period-btn px-3 py-1.5 rounded-md text-xs font-bold text-slate-500 hover:text-slate-800 transition-all cursor-pointer">Monthly</button>
                   <button onclick="MasterDB.switchSalesPeriod('annual')" id="btn-sales-annual" class="period-btn px-3 py-1.5 rounded-md text-xs font-bold text-slate-500 hover:text-slate-800 transition-all cursor-pointer">Annual</button>
                   <button onclick="MasterDB.switchSalesPeriod('all')" id="btn-sales-all" class="period-btn px-3 py-1.5 rounded-md text-xs font-bold text-slate-500 hover:text-slate-800 transition-all cursor-pointer">All Time</button>
                </div>

                <div id="sales-stat-date-wrap" class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                  <input type="date" id="sales-stat-date" onchange="MasterDB.loadSalesData()" class="bg-transparent border-0 px-2 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer">
                </div>

                <div id="sales-stat-month-wrap" class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5 hidden">
                  <input type="month" id="sales-stat-month" onchange="MasterDB.loadSalesData()" class="bg-transparent border-0 px-2 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer">
                </div>

                <button onclick="MasterDB.closeSalesStats()" class="p-2 text-slate-400 hover:text-slate-600 ml-2 cursor-pointer"><i data-lucide="x" class="w-6 h-6"></i></button>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
             <div class="bg-blue-50 px-3.5 py-2.5 rounded-xl border border-blue-100">
                <span class="text-blue-600 text-[10px] font-bold uppercase tracking-wider block mb-0.5 truncate">Total Quantity Sold</span>
                <span class="text-lg font-black text-blue-900 truncate font-outfit" id="sales-total-qty">0</span>
             </div>
             <div class="bg-red-50 px-3.5 py-2.5 rounded-xl border border-red-100">
                <span class="text-red-600 text-[10px] font-bold uppercase tracking-wider block mb-0.5 truncate">Total Cost</span>
                <span class="text-lg font-black text-red-900 truncate font-outfit" id="sales-total-cost">Rs. 0</span>
             </div>
             <div class="bg-green-50 px-3.5 py-2.5 rounded-xl border border-green-100">
                <span class="text-green-600 text-[10px] font-bold uppercase tracking-wider block mb-0.5 truncate">Total Revenue</span>
                <span class="text-lg font-black text-green-900 truncate font-outfit" id="sales-total-revenue">Rs. 0</span>
             </div>
             <div class="bg-amber-50 px-3.5 py-2.5 rounded-xl border border-amber-100">
                <span class="text-amber-600 text-[10px] font-bold uppercase tracking-wider block mb-0.5 truncate">Total Profit</span>
                <span class="text-lg font-black text-amber-900 truncate font-outfit" id="sales-total-profit">Rs. 0</span>
             </div>
          </div>

          <div class="mb-3 flex justify-between items-center gap-4 flex-wrap">
            <div class="relative group flex-1 min-w-[200px]">
              <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-accent transition-colors"></i>
              <input type="text" id="sales-search" 
                oninput="MasterDB.applySalesFilters()"
                placeholder="Search items..." 
                class="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-9 pr-3 text-xs font-medium focus:bg-white focus:border-accent focus:ring-2 focus:ring-amber-50/50 transition-all outline-none">
            </div>

            <div class="flex items-center gap-2">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Category</label>
              <select id="sales-cat-filter" onchange="MasterDB.applySalesFilters()" class="bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-bold text-slate-700 focus:bg-white focus:border-accent focus:ring-0 cursor-pointer outline-none transition-all max-w-[150px]">
                <option value="all">All Categories</option>
              </select>
            </div>

            <div class="flex items-center gap-2">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Sort By</label>
              <select id="sales-sort" onchange="MasterDB.applySalesFilters()" class="bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-bold text-slate-700 focus:bg-white focus:border-accent focus:ring-0 cursor-pointer outline-none transition-all">
                <option value="revenue_desc">Most Revenue</option>
                <option value="revenue_asc">Least Revenue</option>
                <option value="qty_desc">Top Selling (Qty)</option>
                <option value="profit_desc">Most Profit</option>
                <option value="description_asc">Description (A-Z)</option>
              </select>
            </div>

            <!-- Global Reset -->
            <button id="sales-filter-reset" onclick="MasterDB.resetSalesFilters()" class="hidden flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-all border border-rose-100 shrink-0 shadow-sm self-center">
              <i data-lucide="x" class="w-3.5 h-3.5"></i>
              Clear Filters
            </button>
          </div>

          <div class="max-h-[380px] lg:max-h-[460px] overflow-y-auto border border-slate-200 rounded-xl shadow-inner">
            <table class="w-full text-sm text-left border-b border-slate-200">
              <thead class="bg-slate-50 text-slate-500 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                <tr class="border-b border-slate-200">
                  <th class="px-2 py-2 font-bold uppercase text-[11px] text-center border-r border-slate-200 w-10 bg-slate-50 text-slate-400">#</th>
                  <th class="px-4 py-2 font-bold uppercase text-[11px] bg-slate-50 text-slate-700 border-r border-slate-200">Item Description</th>
                  <th class="px-4 py-2 font-bold uppercase text-[11px] text-center border-r border-slate-200 bg-slate-50 text-blue-700">Qty Sold</th>
                  <th class="px-4 py-2 font-bold uppercase text-[11px] text-right border-r border-slate-200 bg-slate-50 text-red-600">Cost</th>
                  <th class="px-4 py-2 font-bold uppercase text-[11px] text-right border-r border-slate-200 bg-slate-50 text-emerald-600">Revenue</th>
                  <th class="px-4 py-2 font-bold uppercase text-[11px] text-right bg-slate-50 text-amber-600">Profit</th>
                </tr>
              </thead>
              <tbody id="sales-tbody" class="divide-y divide-slate-200 bg-white">
                <!-- Dynamically filled -->
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Profits Modal -->
      <div id="profits-modal" onclick="if(event.target === this) MasterDB.closeProfitsModal()" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[500] backdrop-blur-md transition-opacity opacity-0 no-print">
        <div class="bg-white rounded-xl shadow-2xl p-6 max-w-6xl w-full mx-4 transform transition-all scale-95 flex flex-col max-h-[90vh]" id="profits-card">
          <div class="flex justify-between items-center mb-6 border-b border-slate-100 pb-4 shrink-0">
            <div>
              <h3 class="text-2xl font-bold text-slate-800">Proposal Profits</h3>
              <p class="text-slate-500 text-sm mt-1">Analytics and profit tracking across all proposals.</p>
            </div>
            <button onclick="MasterDB.closeProfitsModal()" class="p-2 text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-6 h-6"></i></button>
          </div>

          <!-- Summary Stats -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 shrink-0">
             <div class="bg-red-50 p-4 rounded-xl border border-red-100">
                <span class="text-red-600 text-xs font-bold uppercase tracking-widest block mb-1">Total Cost</span>
                <span class="text-2xl font-black text-red-900" id="prof-total-cost">Rs. 0</span>
             </div>
             <div class="bg-green-50 p-4 rounded-xl border border-green-100">
                <span class="text-green-600 text-xs font-bold uppercase tracking-widest block mb-1">Total Sell</span>
                <span class="text-2xl font-black text-green-900" id="prof-total-retail">Rs. 0</span>
             </div>
             <div class="bg-amber-50 p-4 rounded-xl border border-amber-100">
                <span class="text-amber-600 text-xs font-bold uppercase tracking-widest block mb-1">Total Net Profit</span>
                <span class="text-2xl font-black text-amber-900" id="prof-total-profit">Rs. 0</span>
             </div>
          </div>

          <!-- Filters -->
          <div class="mb-4 flex flex-wrap gap-4 items-center shrink-0">
            <div class="relative flex-1 min-w-[200px]">
              <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
              <input type="text" id="prof-search" oninput="MasterDB.applyProfitsFilters()" placeholder="Search by customer name or proposal #..." class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-2 pl-10 pr-4 text-sm focus:bg-white focus:border-accent outline-none">
            </div>

            <select id="prof-status-filter" onchange="MasterDB.applyProfitsFilters()" class="bg-slate-50 border-2 border-slate-100 rounded-xl py-2 px-4 text-xs font-bold text-slate-700 focus:bg-white focus:border-accent cursor-pointer outline-none w-36">
              <option value="all">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
            </select>

            <select id="prof-sort" onchange="MasterDB.applyProfitsFilters()" class="bg-slate-50 border-2 border-slate-100 rounded-xl py-2 px-4 text-xs font-bold text-slate-700 focus:bg-white focus:border-accent cursor-pointer outline-none w-44">
              <option value="date_desc">Date (Newest First)</option>
              <option value="date_asc">Date (Oldest First)</option>
              <option value="profit_desc">Most Profit</option>
              <option value="profit_asc">Least Profit</option>
              <option value="total_desc">Highest Sell Total</option>
            </select>
            
            <button id="prof-filter-reset" onclick="MasterDB.resetProfitsFilters()" class="hidden flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-all border border-rose-100 shrink-0 shadow-sm">
              <i data-lucide="x" class="w-4 h-4"></i> Clear
            </button>
          </div>

          <div class="flex-1 overflow-auto border border-slate-100 rounded-lg shadow-inner bg-white min-h-[250px]">
            <table class="w-full text-xs text-left border-b border-slate-100">
              <thead class="bg-slate-50 text-slate-500 sticky top-0 z-10">
                <tr>
                  <th class="px-2 py-2.5 font-black uppercase text-[10px] text-center w-8 border-b border-r border-slate-200 bg-slate-50">#</th>
                  <th class="px-3 py-2.5 font-black uppercase text-[10px] border-b border-r border-amber-100 bg-amber-50 text-amber-700">Prop #</th>
                  <th class="px-3 py-2.5 font-black uppercase text-[10px] border-b border-r border-indigo-100 bg-indigo-50 text-indigo-700">Customer</th>
                  <th class="px-3 py-2.5 font-black uppercase text-[10px] text-center border-b border-r border-blue-100 bg-blue-50 text-blue-700">Status</th>
                  <th class="px-3 py-2.5 font-black uppercase text-[10px] text-right bg-red-50 text-red-600 border-b border-r border-red-100">Total Cost</th>
                  <th class="px-3 py-2.5 font-black uppercase text-[10px] text-right bg-green-50 text-green-600 border-b border-r border-green-100">Total Sell</th>
                  <th class="px-3 py-2.5 font-black uppercase text-[10px] text-right bg-amber-50 text-amber-600 border-b border-amber-100">Net Profit</th>
                </tr>
              </thead>
              <tbody id="profits-tbody" class="divide-y divide-slate-100">
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Custom / Batch Stock Print Modal -->
      <div id="db-custom-print-modal" onclick="if(event.target === this) MasterDB.closeCustomPrintModal()" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[500] backdrop-blur-md transition-opacity opacity-0 no-print">
        <div class="bg-white rounded-3xl shadow-2xl p-6 max-w-xl w-full mx-4 transform transition-all scale-95 flex flex-col max-h-[90vh]" id="db-custom-print-card">
          <div class="flex justify-between items-center mb-4 border-b border-slate-100 pb-3 shrink-0">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <i data-lucide="printer" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="text-lg font-black text-slate-800 tracking-tight">Print Categories Stock</h3>
                <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select categories & sort options for A5 report</p>
              </div>
            </div>
            <button onclick="MasterDB.closeCustomPrintModal()" class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
            <!-- Category Selection Header & Quick Select -->
            <div>
              <div class="flex justify-between items-center mb-2">
                <label class="text-xs font-black text-slate-700 uppercase tracking-wider">Select Categories to Print</label>
                <div class="flex items-center gap-2">
                  <button type="button" onclick="MasterDB.toggleAllPrintCats(true)" class="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline">Select All</button>
                  <span class="text-slate-300">|</span>
                  <button type="button" onclick="MasterDB.toggleAllPrintCats(false)" class="text-[11px] font-bold text-slate-500 hover:text-slate-700 hover:underline">Deselect All</button>
                </div>
              </div>

              <!-- Categories Grid -->
              <div class="grid grid-cols-2 gap-2" id="print-cats-list">
                <!-- Dynamically generated category checkboxes -->
              </div>
            </div>

            <!-- Sort and Filter Options -->
            <div class="pt-3 border-t border-slate-100 space-y-3">
              <div>
                <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Sort Items By</label>
                <select id="print-stock-sort" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-accent outline-none">
                  <option value="name_asc">Item Name (A &rarr; Z)</option>
                  <option value="name_desc">Item Name (Z &rarr; A)</option>
                  <option value="stock_desc">Stock Quantity (Highest First)</option>
                  <option value="stock_asc">Stock Quantity (Lowest First / Low Stock)</option>
                </select>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">Stock Filter</label>
                  <select id="print-stock-filter-type" onchange="MasterDB.onPrintFilterChange()" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-accent outline-none">
                    <option value="all">All Items</option>
                    <option value="in_stock">In Stock Only (&gt; 0)</option>
                    <option value="low_stock">Low Stock Only (&le; Limit)</option>
                  </select>
                </div>

                <div id="print-low-stock-limit-box" class="hidden">
                  <label class="block text-xs font-black text-rose-600 uppercase tracking-wider mb-1.5">Low Stock &le; (Boxes)</label>
                  <input type="number" id="print-low-stock-limit" value="5" min="0" step="1" class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-accent outline-none text-center">
                </div>
              </div>

              <!-- Grouping Toggle -->
              <div class="flex items-center justify-between pt-1">
                <label for="print-group-by-cat" class="text-xs font-bold text-slate-600 cursor-pointer select-none">Group items under Category headers</label>
                <input type="checkbox" id="print-group-by-cat" checked class="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300 cursor-pointer">
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="pt-4 border-t border-slate-100 flex justify-between items-center gap-3 shrink-0">
            <button type="button" onclick="MasterDB.closeCustomPrintModal()" class="px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-xs transition-all">Cancel</button>
            <button type="button" onclick="MasterDB.generateCustomStockPrint()" class="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs shadow-lg hover:shadow-xl transition-all flex items-center gap-2 cursor-pointer">
              <i data-lucide="eye" class="w-4 h-4 text-amber-400"></i>
              <span>Generate A5 Preview</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Style and local container removed, moved to global index.html and print.css -->
    `;

    try {
      await this.loadData();
    } catch(e) {
      console.error(e);
    }
    if (window.lucide) lucide.createIcons();
  },

  async switchTab(id) {
    this.currentCategory = id;
    
    // Update active tab styles
    document.querySelectorAll('.db-tab').forEach(btn => {
      if (btn.id === `tab-${id}`) {
        btn.className = 'db-tab group w-full text-left px-4 py-1.5 rounded-lg transition-all flex justify-between items-center text-sm bg-white shadow-sm border border-slate-200 text-slate-900 font-bold';
      } else {
        btn.className = 'db-tab group w-full text-left px-4 py-1.5 rounded-lg transition-all flex justify-between items-center text-sm text-slate-600 hover:bg-slate-100 font-medium';
      }
    });

    await this.loadData();
  },

  capitalize(str) {
    if (str === 'item_name') return 'Name';
    return str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  },

  async loadData() {
    // Update category counts in sidebar
    const stats = await window.api.getCategoryStats();
    let totalCount = 0;
    stats.forEach(s => {
      totalCount += (s.count || 0);
      const cat = this.categories.find(c => c.id === s.slug);
      if (cat) {
        cat.count = s.count;
        const countSpan = document.getElementById(`count-${s.slug}`);
        if (countSpan) countSpan.textContent = s.count || 0;
      }
    });

    const allCat = this.categories.find(c => c.id === 'all');
    if (allCat) {
      allCat.count = totalCount;
      const allCountSpan = document.getElementById('count-all');
      if (allCountSpan) allCountSpan.textContent = totalCount || 0;
    }

    if (this.currentCategory === 'all') {
      this.allProducts = (await window.api.searchAllProducts('')) || [];
    } else {
      const prods = (await window.api.getProducts(this.currentCategory)) || [];
      prods.forEach(p => { p.slug = this.currentCategory; });
      this.allProducts = prods;
    }
    this.companies = await window.api.getCompanies();
    this.applySearch();
  },

  applySearch() {
    const query = document.getElementById('db-search')?.value.toLowerCase() || '';
    const lowStockVal = document.getElementById('db-low-stock-filter')?.value;
    const cat = this.categories.find(c => c.id === this.currentCategory) || { fields: ['item_name'] };
    
    let filtered = [...this.allProducts];
    if (query) {
        filtered = filtered.filter(p => {
            const name = String(p.item_name || '').toLowerCase();
            const words = name.split(/[\s\-_\/]+/);
            if (name.startsWith(query) || words.some(w => w.startsWith(query))) return true;
            if (query.length >= 3) {
                return (cat && cat.fields && cat.fields.some(f => String(p[f] || '').toLowerCase().includes(query))) ||
                       String(p.description || '').toLowerCase().includes(query) ||
                       String(p.category_name || '').toLowerCase().includes(query) ||
                       String(p.company_name || '').toLowerCase().includes(query) ||
                       name.includes(query);
            }
            return false;
        });
        filtered.sort((a, b) => {
            const aName = (a.item_name || '').toLowerCase();
            const bName = (b.item_name || '').toLowerCase();
            const aStarts = aName.startsWith(query);
            const bStarts = bName.startsWith(query);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            const aWordStarts = aName.split(/[\s\-_\/]+/).some(w => w.startsWith(query));
            const bWordStarts = bName.split(/[\s\-_\/]+/).some(w => w.startsWith(query));
            if (aWordStarts && !bWordStarts) return -1;
            if (!aWordStarts && bWordStarts) return 1;
            return aName.localeCompare(bName);
        });
    }

    if (lowStockVal !== '' && lowStockVal !== undefined && lowStockVal !== null) {
        const limit = parseInt(lowStockVal);
        filtered = filtered.filter(p => (p.current_stock || 0) <= limit);
    }

    this.renderTableBody(filtered);
  },

  renderTableBody(list) {
    const isAll = this.currentCategory === 'all';
    const actualCats = this.categories.filter(c => c.id !== 'all');
    const cat = this.categories.find(c => c.id === this.currentCategory) || { fields: ['item_name'] };
    
    // Render thead
    const thead = document.getElementById('db-thead');
    if (thead) {
      thead.innerHTML = `
        <tr>
          <th class="px-2 py-2 font-black text-[13px] uppercase tracking-wider border-r border-slate-200 text-center w-10 text-slate-400 bg-slate-50">#</th>
          ${cat.fields.map((f, i) => {
            const colors = ['bg-amber-50 text-amber-700', 'bg-indigo-50 text-indigo-700', 'bg-purple-50 text-purple-700', 'bg-cyan-50 text-cyan-700', 'bg-rose-50 text-rose-700'];
            return `<th class="px-4 py-2 font-black text-[13px] uppercase tracking-wider border-r border-slate-200 ${colors[i % colors.length]}">${this.capitalize(f)}</th>`;
          }).join('')}
          <th class="px-3 py-2 font-black text-[11px] uppercase tracking-wider text-center text-amber-900 border-r border-slate-200 bg-amber-50">Stock</th>
          <th class="px-3 py-2 font-black text-[11px] uppercase tracking-wider text-right text-red-600 border-r border-slate-200 bg-red-50" title="Cost Price">Cost (Rs.)</th>
          <th class="px-3 py-2 font-black text-[11px] uppercase tracking-wider text-right text-green-600 border-r border-slate-200 bg-green-50" title="Sale Price">Sale (Rs.)</th>
          <th class="px-3 py-2 font-black text-[11px] uppercase tracking-wider text-right text-blue-600 border-r border-slate-200 bg-blue-50" title="Profit per Item">Profit (Rs.)</th>
          <th class="px-3 py-2 font-black text-[11px] uppercase tracking-wider text-right bg-slate-100 text-slate-700">Actions</th>
        </tr>
      `;
    }

    // Render tbody
    const tbody = document.getElementById('db-tbody');
    if (!tbody) return;

    if (actualCats.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="px-6 py-16 text-center text-slate-500 border-b border-slate-200">
            <div class="max-w-sm mx-auto flex flex-col items-center">
              <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                <i data-lucide="folder-plus" class="w-6 h-6"></i>
              </div>
              <h4 class="text-base font-bold text-slate-800 mb-1">No Categories Found</h4>
              <p class="text-xs text-slate-500 mb-4">Create a category first to start adding and managing stock items.</p>
              <button onclick="MasterDB.openManageCategoriesModal(true)" class="px-4 py-2 bg-accent hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer">
                <i data-lucide="plus" class="w-4 h-4"></i>
                <span>Add Category</span>
              </button>
            </div>
          </td>
        </tr>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-12 text-center text-slate-400 border-b border-slate-200 italic font-medium">No items found matching your search.</td></tr>`;
    } else {
      tbody.innerHTML = list.map((p, index) => {
        const profit = (p.retail_price || 0) - (p.cost_price || 0);
        const totalBoxes = p.current_stock || 0;
        const itemCategory = p.slug || (this.currentCategory !== 'all' ? this.currentCategory : '');
        const catName = p.category_name || this.labels[p.slug] || p.slug;

        return `
        <tr class="hover:bg-slate-50 transition-colors group border-b border-slate-200">
          <td class="px-2 py-1 border-r border-slate-200 text-center font-bold text-slate-400 tabular-nums">${index + 1}</td>
          ${cat.fields.map(f => {
            let val = p[f] || '-';
            if (f === 'item_name') {
              val = `
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="font-bold text-slate-900">${val}</span>
                  ${(isAll && catName) ? `<span class="text-xs font-semibold text-slate-500">(${catName})</span>` : ''}
                  ${p.company_name ? `<span class="text-[9px] font-black text-blue-500 uppercase tracking-widest ml-1">• ${p.company_name}</span>` : ''}
                </div>
              `;
            }
            return `<td class="px-4 py-1 font-medium text-slate-800 border-r border-slate-200 text-xs">${val}</td>`;
          }).join('')}
          <td class="px-3 py-1 text-center border-r border-slate-200 font-bold text-xs whitespace-nowrap">
            <div class="inline-flex items-center gap-1.5 ${totalBoxes > 0 ? 'bg-amber-50/80 border border-amber-200 text-amber-950 font-black' : 'bg-rose-50 border border-rose-200 text-rose-700 font-bold'} px-2.5 py-0.5 rounded-lg shadow-sm" title="${totalBoxes} Boxes in stock">
              <span>${totalBoxes}</span>
            </div>
          </td>
          <td class="px-3 py-1 tabular-nums text-xs text-right bg-red-50/30 text-red-700 border-r border-slate-200 font-medium">${app.formatNumber(p.cost_price)}</td>
          <td class="px-3 py-1 tabular-nums text-xs text-right bg-green-50/30 text-green-700 border-r border-slate-200 font-medium">${app.formatNumber(p.retail_price)}</td>
          <td class="px-3 py-1 tabular-nums text-xs text-right bg-blue-50/30 text-blue-700 border-r border-slate-200 font-medium">${app.formatNumber(profit)}</td>
          <td class="px-3 py-1 text-right font-medium">
            <div class="flex items-center justify-end gap-1.5 transition-opacity">
              <button onclick="MasterDB.toggleFavorite('${itemCategory}', ${p.id})" class="group/fav p-1.5 ${p.is_favorite ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-amber-400 hover:bg-amber-50'} rounded-lg transition-all flex items-center justify-center cursor-pointer" title="Toggle Favorite">
                <i data-lucide="star" class="w-4 h-4 ${p.is_favorite ? 'fill-current' : 'group-hover/fav:fill-amber-100'}"></i>
              </button>
              <button onclick="MasterDB.openForm(${p.id}, '${itemCategory}')" class="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-all cursor-pointer" title="Edit Item">
                <i data-lucide="edit-2" class="w-4 h-4"></i>
              </button>
              <button onclick="MasterDB.deleteItem(${p.id}, '${itemCategory}')" class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer" title="Delete Item">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </td>
        </tr>
      `;}).join('');
    }
    if (window.lucide) lucide.createIcons();
  },

  syncStockInputs(source = null) {
    // No-op - stock is managed directly in boxes
  },

  openForm(dataOrId = null, itemSlug = null) {
    const actualCats = this.categories.filter(c => c.id !== 'all');
    if (actualCats.length === 0) {
      app.showAlert({
        title: 'No Categories',
        message: 'Please create at least one category before adding items.'
      });
      this.openManageCategoriesModal(true);
      return;
    }

    let data = dataOrId;
    if (typeof dataOrId === 'number' || typeof dataOrId === 'string') {
      data = (this.allProducts || []).find(p => p.id == dataOrId && (!itemSlug || p.slug === itemSlug))
             || (this.allProducts || []).find(p => p.id == dataOrId) || null;
    }
    const currentSlug = itemSlug || data?.slug || (this.currentCategory !== 'all' ? this.currentCategory : (actualCats[0]?.id || ''));
    const cat = this.categories.find(c => c.id === currentSlug) || { label: 'Stock', fields: ['item_name'] };
    
    document.getElementById('db-modal-title').textContent = data ? `Edit ${cat.label} Item` : (this.currentCategory === 'all' ? 'Add Item' : `Add ${cat.label} Item`);
    document.getElementById('db-id').value = data ? data.id : '';
    document.getElementById('db-stock').value = data ? (data.current_stock ?? '') : '';
    document.getElementById('db-cost').value = data ? (data.cost_price ?? '') : '';
    document.getElementById('db-retail').value = data ? (data.retail_price ?? '') : '';

    const modeInput = document.getElementById('db-margin-mode');
    if (modeInput) modeInput.value = 'pct';
    const btnPct = document.getElementById('btn-margin-mode-pct');
    const btnRs = document.getElementById('btn-margin-mode-rs');
    if (btnPct) btnPct.className = 'px-2 py-0.5 text-[10px] font-black rounded-md transition-all bg-white text-blue-600 shadow-xs cursor-pointer';
    if (btnRs) btnRs.className = 'px-2 py-0.5 text-[10px] font-bold rounded-md transition-all text-slate-500 hover:text-slate-800 cursor-pointer';
    const labelEl = document.getElementById('db-margin-label');
    if (labelEl) labelEl.textContent = 'Margin (%)';
    const suffixEl = document.getElementById('db-margin-suffix');
    if (suffixEl) suffixEl.textContent = '%';

    const marginInput = document.getElementById('db-margin-percent');
    if (marginInput) {
      if (data && data.cost_price > 0 && data.retail_price > 0) {
        const calculatedMargin = ((data.retail_price - data.cost_price) / data.cost_price) * 100;
        marginInput.value = Math.round(calculatedMargin * 10) / 10;
      } else {
        marginInput.value = '6';
      }
    }

    let catSelectHtml = '';
    if (this.currentCategory === 'all' || !data) {
      catSelectHtml = `
        <div class="mb-4">
          <label class="block text-sm font-bold text-slate-700 mb-1">Category *</label>
          <select id="db-category-select" required class="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-accent focus:border-accent font-bold" ${data ? 'disabled' : ''}>
            ${actualCats.map(c => `<option value="${c.id}" ${currentSlug === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}
          </select>
          ${data ? `<input type="hidden" id="db-category-select-val" value="${currentSlug}">` : ''}
        </div>
      `;
    } else {
      catSelectHtml = `<input type="hidden" id="db-category-select" value="${currentSlug}">`;
    }

    const dynamicContainer = document.getElementById('db-dynamic-fields');
    dynamicContainer.innerHTML = catSelectHtml + cat.fields.map(f => {
      const isReq = f !== 'description';
      return `
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">${this.capitalize(f)} ${isReq ? '*' : '<span class="text-xs text-slate-400 font-normal">(Optional)</span>'}</label>
        <input type="text" id="db-field-${f}" ${isReq ? 'required' : ''} class="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-accent focus:border-accent" value="${data ? (data[f] || '') : ''}">
      </div>
    `;}).join('');

    // Populate companies dropdown (optional)
    const companySelect = document.getElementById('db-company');
    companySelect.innerHTML = '<option value="">Select Company (Optional)</option>' + 
      (this.companies || []).map(c => `
        <option value="${c.id}" ${data && data.company_id === c.id ? 'selected' : ''}>${c.name}</option>
      `).join('');

    const modal = document.getElementById('db-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const btnNext = document.getElementById('btn-save-next');
    if (btnNext) {
      if (data) btnNext.classList.add('hidden');
      else btnNext.classList.remove('hidden');
    }

    this.updateFormProfits();

    modal.classList.remove('opacity-0');
    document.getElementById('db-card').classList.remove('scale-95');
  },

  setMarginMode(mode) {
    const costInput = document.getElementById('db-cost');
    const marginInput = document.getElementById('db-margin-percent');
    const retailInput = document.getElementById('db-retail');
    const modeInput = document.getElementById('db-margin-mode');
    const labelEl = document.getElementById('db-margin-label');
    const suffixEl = document.getElementById('db-margin-suffix');
    const btnPct = document.getElementById('btn-margin-mode-pct');
    const btnRs = document.getElementById('btn-margin-mode-rs');

    if (!modeInput) return;
    const oldMode = modeInput.value || 'pct';
    if (oldMode === mode) return;
    modeInput.value = mode;

    const cost = parseFloat(costInput?.value) || 0;
    const retail = parseFloat(retailInput?.value) || 0;

    if (mode === 'rs') {
      if (btnRs) {
        btnRs.className = 'px-2 py-0.5 text-[10px] font-black rounded-md transition-all bg-white text-blue-600 shadow-xs cursor-pointer';
      }
      if (btnPct) {
        btnPct.className = 'px-2 py-0.5 text-[10px] font-bold rounded-md transition-all text-slate-500 hover:text-slate-800 cursor-pointer';
      }
      if (labelEl) labelEl.textContent = 'Margin (Rs.)';
      if (suffixEl) suffixEl.textContent = 'Rs';

      // Convert % to Rs without modifying sale price
      if (marginInput) {
        if (cost > 0 && retail > cost) {
          marginInput.value = Math.round((retail - cost) * 100) / 100;
        } else if (cost > 0) {
          const currentPct = parseFloat(marginInput.value) || 6;
          marginInput.value = Math.round((cost * (currentPct / 100)) * 100) / 100;
        } else {
          marginInput.value = '0';
        }
      }
    } else {
      if (btnPct) {
        btnPct.className = 'px-2 py-0.5 text-[10px] font-black rounded-md transition-all bg-white text-blue-600 shadow-xs cursor-pointer';
      }
      if (btnRs) {
        btnRs.className = 'px-2 py-0.5 text-[10px] font-bold rounded-md transition-all text-slate-500 hover:text-slate-800 cursor-pointer';
      }
      if (labelEl) labelEl.textContent = 'Margin (%)';
      if (suffixEl) suffixEl.textContent = '%';

      // Convert Rs to % without modifying sale price
      if (marginInput) {
        if (cost > 0 && retail > cost) {
          marginInput.value = Math.round((((retail - cost) / cost) * 100) * 10) / 10;
        } else if (cost > 0) {
          const rsVal = parseFloat(marginInput.value) || 0;
          marginInput.value = Math.round(((rsVal / cost) * 100) * 10) / 10;
        } else {
          marginInput.value = '6';
        }
      }
    }

    this.updateFormProfits();
  },

  onCostOrMarginChange(source) {
    const costInput = document.getElementById('db-cost');
    const marginInput = document.getElementById('db-margin-percent');
    const retailInput = document.getElementById('db-retail');
    const modeInput = document.getElementById('db-margin-mode');

    if (!costInput || !marginInput || !retailInput) return;

    const cost = parseFloat(costInput.value) || 0;
    const mode = modeInput ? (modeInput.value || 'pct') : 'pct';

    if (source === 'cost' || source === 'margin') {
      if (mode === 'rs') {
        const marginRs = parseFloat(marginInput.value) || 0;
        if (cost > 0) {
          const rawRetail = cost + marginRs;
          retailInput.value = Math.round(rawRetail * 100) / 100;
        }
      } else {
        let marginPct = parseFloat(marginInput.value);
        if (isNaN(marginPct)) {
          marginPct = 6;
        }
        if (cost > 0) {
          let rawRetail = cost * (1 + (marginPct / 100));
          if (Math.abs(rawRetail - Math.round(rawRetail)) < 0.005) {
            rawRetail = Math.round(rawRetail);
          } else {
            rawRetail = Math.round(rawRetail * 100) / 100;
          }
          retailInput.value = rawRetail;
        }
      }
    } else if (source === 'retail') {
      const retail = parseFloat(retailInput.value) || 0;
      if (cost > 0 && retail > 0) {
        if (mode === 'rs') {
          marginInput.value = Math.round((retail - cost) * 100) / 100;
        } else {
          const calculatedMargin = ((retail - cost) / cost) * 100;
          marginInput.value = Math.round(calculatedMargin * 10) / 10;
        }
      }
    }

    this.updateFormProfits();
  },

  updateFormProfits() {
    const costInput = document.getElementById('db-cost');
    const retailInput = document.getElementById('db-retail');

    if (!costInput || !retailInput) return;

    const cost = parseFloat(costInput.value) || 0;
    const retail = parseFloat(retailInput.value) || 0;

    // Profit calculations
    const retailProfit = retail - cost;
    const retailMargin = retail > 0 ? ((retailProfit / retail) * 100) : 0;

    const elRetailProfit = document.getElementById('db-retail-profit');
    if (elRetailProfit) {
      if (!costInput.value && !retailInput.value) {
        elRetailProfit.value = 'Rs. 0 (0%)';
        elRetailProfit.className = 'w-full h-10 border border-slate-200 bg-slate-50 rounded-xl px-3 font-bold text-slate-400 text-xs md:text-sm outline-none cursor-default truncate';
      } else if (retailProfit >= 0) {
        const profitFormatted = retailProfit % 1 === 0 ? retailProfit.toLocaleString() : (Math.round(retailProfit * 100) / 100).toFixed(2);
        elRetailProfit.value = `Rs. ${profitFormatted} (${retailMargin.toFixed(1)}%)`;
        elRetailProfit.className = 'w-full h-10 border border-emerald-300 bg-emerald-50/90 rounded-xl px-3 font-black text-emerald-700 text-xs md:text-sm outline-none cursor-default shadow-xs truncate';
      } else {
        const profitFormatted = Math.abs(retailProfit) % 1 === 0 ? Math.abs(retailProfit).toLocaleString() : (Math.round(Math.abs(retailProfit) * 100) / 100).toFixed(2);
        elRetailProfit.value = `-Rs. ${profitFormatted} (${retailMargin.toFixed(1)}%)`;
        elRetailProfit.className = 'w-full h-10 border border-red-300 bg-red-50/90 rounded-xl px-3 font-black text-red-600 text-xs md:text-sm outline-none cursor-default shadow-xs truncate';
      }
    }
  },

  closeForm() {
    const modal = document.getElementById('db-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  closeModal() {
    this.closeForm();
  },

  async openAddStockModal(itemId) {
    if (!this.companies || this.companies.length === 0) {
      this.companies = await window.api.getCompanies() || [];
    }
    let item = (typeof itemId === 'object' && itemId !== null) ? itemId : (this.allProducts || []).find(p => p.id === itemId);
    if (!item) return;
    this._stockItem = item;

    document.getElementById('add-stock-item-id').value = item.id;
    document.getElementById('add-stock-item-slug').value = item.slug || (this.currentCategory !== 'all' ? this.currentCategory : '');
    document.getElementById('add-stock-modal-title').textContent = `Add Stock: ${item.item_name || 'Item'}`;
    document.getElementById('add-stock-item-subtitle').textContent = `Current Stock: ${item.current_stock || 0} Boxes`;
    document.getElementById('add-stock-current-val').textContent = `${item.current_stock || 0} Boxes`;

    const qtyInput = document.getElementById('add-stock-qty');
    const costInput = document.getElementById('add-stock-cost');
    const retailInput = document.getElementById('add-stock-retail-sale');
    const wholesaleCostInput = document.getElementById('add-stock-wholesale-cost');
    const wholesaleInput = document.getElementById('add-stock-wholesale-sale');

    if (qtyInput) qtyInput.value = '';
    if (costInput) costInput.value = item.cost_price || '';
    if (retailInput) retailInput.value = item.retail_price || '';
    if (wholesaleCostInput) wholesaleCostInput.value = item.wholesale_cost_price || '';
    if (wholesaleInput) wholesaleInput.value = item.wholesale_price || '';

    // Populate suppliers
    const companySelect = document.getElementById('add-stock-company');
    companySelect.innerHTML = '<option value="">Select Supplier (Optional)</option>' +
      (this.companies || []).map(c => `
        <option value="${c.id}" ${item.company_id === c.id ? 'selected' : ''}>${c.name}</option>
      `).join('');

    this.calcAddStockTotal();

    const modal = document.getElementById('add-stock-modal');
    modal.classList.remove('hidden', 'opacity-0');
    modal.classList.add('flex');
    document.getElementById('add-stock-card').classList.remove('scale-95');
    if (window.lucide) lucide.createIcons();
  },

  calcAddStockTotal(triggerSource = null) {
    const item = this._stockItem;
    const currentStock = item ? (item.current_stock || 0) : 0;

    const qtyInput = document.getElementById('add-stock-qty');
    const costInput = document.getElementById('add-stock-cost');
    const retailInput = document.getElementById('add-stock-retail-sale');

    let qty = parseInt(qtyInput?.value) || 0;
    let cost = parseFloat(costInput?.value) || 0;
    let retail = parseFloat(retailInput?.value) || 0;

    const newTotalStock = currentStock + qty;
    const newValEl = document.getElementById('add-stock-new-val');
    if (newValEl) {
      newValEl.textContent = `${newTotalStock} Boxes`;
    }

    const totalCost = qty > 0 && cost > 0 ? (qty * cost) : 0;
    const totalCostEl = document.getElementById('add-stock-total-cost');
    if (totalCostEl) {
      totalCostEl.textContent = app.formatCurrency(totalCost);
    }

    // Profit calculation
    const retailProfit = retail - cost;
    const retailMargin = retail > 0 ? ((retailProfit / retail) * 100) : 0;
    const elRetailProfit = document.getElementById('add-stock-retail-profit');
    if (elRetailProfit) {
      if (!costInput?.value && !retailInput?.value) {
        elRetailProfit.value = 'Rs. 0 (0%)';
        elRetailProfit.className = 'w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 font-bold text-slate-400 text-sm outline-none cursor-default';
      } else if (retailProfit >= 0) {
        elRetailProfit.value = `Rs. ${Math.round(retailProfit).toLocaleString()} (${retailMargin.toFixed(1)}%)`;
        elRetailProfit.className = 'w-full border border-emerald-300 bg-emerald-50/90 rounded-lg p-2.5 font-black text-emerald-700 text-sm outline-none cursor-default shadow-sm';
      } else {
        elRetailProfit.value = `-Rs. ${Math.abs(Math.round(retailProfit)).toLocaleString()} (${retailMargin.toFixed(1)}%)`;
        elRetailProfit.className = 'w-full border border-red-300 bg-red-50/90 rounded-lg p-2.5 font-black text-red-600 text-sm outline-none cursor-default shadow-sm';
      }
    }
  },

  closeAddStockModal() {
    const modal = document.getElementById('add-stock-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    this._stockItem = null;
  },

  async saveAddStock(e) {
    if (e) e.preventDefault();
    const item = this._stockItem;
    if (!item) return;

    const qty = parseInt(document.getElementById('add-stock-qty')?.value) || 0;
    const unitCost = parseFloat(document.getElementById('add-stock-cost')?.value) || 0;
    const retailPrice = parseFloat(document.getElementById('add-stock-retail-sale')?.value) || 0;

    const companyId = parseInt(document.getElementById('add-stock-company')?.value) || null;
    const recordKhata = document.getElementById('add-stock-record-khata')?.checked;

    if (qty <= 0) {
      app.showAlert("Please enter the number of boxes to add.");
      return;
    }

    if (unitCost <= 0) {
      app.showAlert({ title: 'Invalid Cost', message: 'Cost must be greater than 0.' });
      return;
    }

    if (retailPrice <= unitCost) {
      app.showAlert({ title: 'Invalid Prices', message: 'Sale price must be greater than Cost to ensure profit.' });
      return;
    }

    app.showLoading();
    try {
      const newStock = (item.current_stock || 0) + qty;
      const updateData = {
        ...item,
        current_stock: newStock,
        cost_price: unitCost,
        retail_price: retailPrice,
        wholesale_cost_price: unitCost,
        wholesale_price: retailPrice,
        company_id: companyId || item.company_id
      };

      const targetCategory = item.slug || document.getElementById('add-stock-item-slug')?.value || (this.currentCategory !== 'all' ? this.currentCategory : '');
      await window.api.updateProduct(targetCategory, item.id, updateData);

      // Record in Company Khata if selected and companyId exists
      if (companyId && recordKhata && unitCost > 0) {
        const company = (this.companies || []).find(c => c.id === companyId);
        if (company) {
          const totalAmount = qty * unitCost;
          const newBalance = (company.amount || 0) + totalAmount;

          await window.api.saveCompany({ ...company, amount: newBalance });

          const txnKey = `companies-${company.id}-transactions`;
          const transactions = window.storage.get(txnKey) || [];
          const nextNoKey = `next-invoice-no-companies`;
          let nextNo = window.storage.get(nextNoKey) || 1;

          const desc = `${item.item_name || 'Item'} (${qty} Boxes @ Rs. ${unitCost.toLocaleString()}/box)`;

          transactions.unshift({
            id: Date.now().toString(),
            invoice_no: nextNo,
            invoice_prefix: 'CMP',
            type: 'purchase',
            amount: totalAmount,
            subtotal: totalAmount,
            discount: 0,
            description: desc,
            items: [{ 
              name: item.item_name || 'Item', 
              qty: qty, 
              price: unitCost, 
              lineTotal: totalAmount 
            }],
            date: new Date().toISOString(),
            balanceAfter: newBalance
          });

          window.storage.set(nextNoKey, nextNo + 1);
          window.storage.set(txnKey, transactions);
        }
      }

      app.hideLoading();
      this.closeAddStockModal();
      await this.loadData();
      app.showAlert({ 
        title: 'Stock Updated', 
        message: `Added +${qty} boxes to stock for ${item.item_name || 'item'}. Total stock is now ${newStock} boxes.` 
      });
    } catch (err) {
      console.error(err);
      app.hideLoading();
      app.showAlert("Error updating stock.");
    }
  },

  async saveForm(e, stayOpen = false) {
    if (e) e.preventDefault();
    const form = document.getElementById('db-form');
    if (form && !form.reportValidity()) return;

    const id = document.getElementById('db-id').value;
    const catSelectEl = document.getElementById('db-category-select');
    const catSelectValEl = document.getElementById('db-category-select-val');
    const targetCategory = (catSelectValEl ? catSelectValEl.value : null) 
      || (catSelectEl ? catSelectEl.value : null) 
      || (this.currentCategory !== 'all' ? this.currentCategory : (this.categories.find(c => c.id !== 'all')?.id));

    const cat = this.categories.find(c => c.id === targetCategory) || { fields: ['item_name'] };
    
    const costPrice = parseFloat(document.getElementById('db-cost').value) || 0;
    const retailPrice = parseFloat(document.getElementById('db-retail').value) || 0;

    const data = {
      current_stock: parseInt(document.getElementById('db-stock').value) || 0,
      unit: 'box',
      cost_price: costPrice,
      retail_price: retailPrice,
      wholesale_cost_price: costPrice,
      wholesale_price: retailPrice,
      company_id: parseInt(document.getElementById('db-company').value) || null
    };

    if (data.cost_price <= 0) {
      app.showAlert({
        title: 'Invalid Cost',
        message: 'Cost must be greater than 0.'
      });
      return;
    }

    if (data.retail_price <= data.cost_price) {
      app.showAlert({
        title: 'Invalid Prices',
        message: 'Sell Price must be greater than Cost to ensure profit.'
      });
      return;
    }
    
    cat.fields.forEach(f => {
      const fieldEl = document.getElementById(`db-field-${f}`);
      if (fieldEl) data[f] = fieldEl.value;
    });

    app.showLoading();
    try {
      if (id) {
        await window.api.updateProduct(targetCategory, parseInt(id), data);
      } else {
        await window.api.addProduct(targetCategory, data);
      }
      
      if (stayOpen) {
        this.openForm();
        app.showNotification?.({
          title: 'Success',
          message: 'Item saved successfully. You can now enter the next one.',
          type: 'success'
        });
      } else {
        this.closeForm();
      }
      await this.loadData();
    } catch(err) {
      console.error(err);
    } finally {
      app.hideLoading();
    }
  },

  deleteItem(id, itemSlug = null) {
    const item = (this.allProducts || []).find(p => p.id == id && (!itemSlug || p.slug === itemSlug)) || (this.allProducts || []).find(p => p.id == id);
    const targetCategory = itemSlug || item?.slug || (this.currentCategory !== 'all' ? this.currentCategory : (this.categories.find(c => c.id !== 'all')?.id));
    if (!targetCategory) {
      app.showAlert({ title: 'Error', message: 'Category not found for this item.' });
      return;
    }
    app.verifyPassword({
      title: 'Delete Item Verification',
      message: 'Please enter password to delete this item:',
      onVerified: () => {
        app.showConfirm({
          title: 'Delete Item',
          message: 'Are you sure you want to delete this item from the catalog?',
          confirmText: 'Delete',
          confirmColor: 'red',
          onConfirm: async () => {
            app.showLoading();
            try {
              await window.api.deleteProduct(targetCategory, id);
              await this.loadData();
            } catch (e) {
              console.error('Error deleting item:', e);
              app.showAlert({ title: 'Error', message: e.message || 'Failed to delete item.' });
            } finally {
              app.hideLoading();
            }
          }
        });
      }
    });
  },

  async toggleFavorite(category, id) {
    let targetCat = category;
    if (!targetCat || targetCat === 'all') {
      const item = (this.allProducts || []).find(p => p.id === id);
      targetCat = item?.slug || (this.categories.find(c => c.id !== 'all')?.id);
    }
    if (targetCat) {
      await window.api.toggleFavorite(targetCat, id);
      await this.loadData();
    }
  },

  async openManageCategoriesModal(resetTab = false) {
    if (resetTab) {
      const btnCat = document.getElementById('cat-tab-categories');
      const btnUni = document.getElementById('cat-tab-units');
      const secCat = document.getElementById('cat-section-categories');
      const secUni = document.getElementById('cat-section-units');
      if (btnCat && btnUni && secCat && secUni) {
        btnCat.className = 'flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all bg-white shadow-sm text-slate-900';
        btnUni.className = 'flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all text-slate-500 hover:text-slate-700';
        secCat.classList.remove('hidden');
        secUni.classList.add('hidden');
      }
    }
    const stats = (await window.api.getCategoryStats()) || [];
    const list = document.getElementById('cat-list');

    list.innerHTML = `
      <div class="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <table class="w-full text-sm text-left border-collapse">
          <thead class="sticky top-0 z-10">
            <tr>
              <th class="px-2 py-2 border-b border-r border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center w-10 bg-slate-50">#</th>
              <th class="px-4 py-2 border-b border-r border-amber-100 text-[10px] font-black text-amber-700 uppercase tracking-widest bg-amber-50">Category Name</th>
              <th class="px-4 py-2 border-b border-r border-blue-100 text-[10px] font-black text-blue-700 uppercase tracking-widest text-center bg-blue-50">Items</th>
              <th class="px-4 py-2 border-b border-rose-100 text-[10px] font-black text-rose-700 uppercase tracking-widest text-center bg-rose-50">Actions</th>
            </tr>
          </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              ${stats.length === 0 ? `
                <tr><td colspan="4" class="px-4 py-6 text-center text-slate-400 italic text-xs">No categories created yet.</td></tr>
              ` : stats.map((s, idx) => {
                return `
                  <tr class="group hover:bg-slate-50/50 transition-colors">
                    <td class="px-3 py-1.5 border-r border-slate-100 text-center font-bold text-slate-400 tabular-nums">${idx + 1}</td>
                    <td class="px-4 py-1.5 border-r border-slate-100">
                      <input type="text" id="cat-input-${s.slug}" value="${s.label}" 
                         onfocus="MasterDB.enterEditMode('${s.slug}')"
                         onkeydown="if(event.key==='Enter') MasterDB.handleCategoryRename('${s.slug}', this.value)"
                         class="w-full bg-transparent border-none focus:ring-0 p-0 text-slate-800 font-bold text-sm transition-colors cursor-text focus:text-accent">
                    </td>
                    <td class="px-4 py-1.5 border-r border-slate-100 text-right tabular-nums font-bold text-sm text-slate-800">
                      ${s.count}
                    </td>
                    <td class="px-4 py-1.5 text-right">
                      <div class="flex items-center justify-end gap-1">
                        <!-- Normal State -->
                        <div id="cat-actions-normal-${s.slug}" class="flex items-center gap-1">
                          <button onclick="MasterDB.handleCategoryDelete('${s.slug}')" class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer" title="Delete">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5" stroke-width="2.5"></i>
                          </button>
                          <button onclick="document.getElementById('cat-input-${s.slug}').focus()" class="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-all cursor-pointer" title="Rename">
                            <i data-lucide="edit-2" class="w-3.5 h-3.5" stroke-width="2.5"></i>
                          </button>
                        </div>
                        <!-- Edit State -->
                        <div id="cat-actions-edit-${s.slug}" class="flex items-center gap-1 hidden">
                          <button onmousedown="MasterDB.handleCategoryRename('${s.slug}', document.getElementById('cat-input-${s.slug}').value)" class="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-all cursor-pointer" title="Save">
                            <i data-lucide="check" class="w-4 h-4" stroke-width="3"></i>
                          </button>
                          <button onmousedown="MasterDB.openManageCategoriesModal()" class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer" title="Cancel">
                            <i data-lucide="x" class="w-4 h-4" stroke-width="3"></i>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
        </table>
      </div>
    `;
    const modal = document.getElementById('cat-modal');
    modal.classList.remove('hidden', 'opacity-0');
    modal.classList.add('flex');
    document.getElementById('cat-card').classList.remove('scale-95');
    if (window.lucide) lucide.createIcons();
  },

  enterEditMode(slug) {
    const normal = document.getElementById(`cat-actions-normal-${slug}`);
    const edit = document.getElementById(`cat-actions-edit-${slug}`);
    if (normal && edit) {
        normal.classList.add('hidden');
        edit.classList.remove('hidden');
    }
  },

  async addNewCategory() {
    const input = document.getElementById('new-cat-name');
    const name = input.value.trim();
    if (!name) return;

    app.showLoading();
    const res = await window.api.addCategory(name);
    app.hideLoading();

    if (res.error) {
      app.showAlert(res.error);
    } else {
      input.value = '';
      await this.render(document.getElementById('app-content')); // Refresh sidebar
      await this.openManageCategoriesModal();
    }
  },

  async handleCategoryRename(slug, newLabel) {
    if (!newLabel || newLabel.trim() === '') return;
    app.showLoading();
    await window.api.updateCategoryLabel(slug, newLabel.trim());
    app.hideLoading();
    await this.render(document.getElementById('app-content')); // Refresh sidebar
    await this.openManageCategoriesModal();
  },

  async handleCategoryDelete(slug) {
    app.verifyPassword({
      title: 'Delete Category Verification',
      message: 'Please enter password to delete this category and all its items:',
      onVerified: () => {
        app.showConfirm({
          title: 'Delete Category',
          message: 'Are you sure you want to delete this category? This will PERMANENTLY delete ALL ITEMS in this category and cannot be undone.',
          confirmText: 'Delete Everything',
          confirmColor: 'red',
          onConfirm: async () => {
            app.showLoading();
            const res = await window.api.deleteCategory(slug);
            if (res.error) {
              app.hideLoading();
              app.showAlert(res.error);
            } else {
              if (this.currentCategory === slug) {
                this.currentCategory = 'all';
              }
              await this.render(document.getElementById('app-content'));
              await this.openManageCategoriesModal();
              app.hideLoading();
            }
          }
        });
      }
    });
  },

  closeCategoriesModal() {
    const modal = document.getElementById('cat-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  switchManageTab(tab) {
    const btnCat = document.getElementById('cat-tab-categories');
    const btnUni = document.getElementById('cat-tab-units');
    const secCat = document.getElementById('cat-section-categories');
    const secUni = document.getElementById('cat-section-units');

    if (tab === 'categories') {
        btnCat.className = 'flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all bg-white shadow-sm text-slate-900';
        btnUni.className = 'flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all text-slate-500 hover:text-slate-700';
        secCat.classList.remove('hidden');
        secUni.classList.add('hidden');
        this.openManageCategoriesModal();
    } else {
        btnUni.className = 'flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all bg-white shadow-sm text-slate-900';
        btnCat.className = 'flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all text-slate-500 hover:text-slate-700';
        secUni.classList.remove('hidden');
        secCat.classList.add('hidden');
        this.renderUnitsList();
    }
    if (window.lucide) lucide.createIcons();
  },

  async renderUnitsList() {
    this.units = await window.api.getUnits();
    const list = document.getElementById('units-list');
    
    list.innerHTML = `
      <div class="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <table class="w-full text-sm text-left border-collapse">
          <thead>
            <tr>
              <th class="px-2 py-2 border-b border-r border-slate-200 text-[10px] font-black text-slate-500 bg-slate-50 text-center w-10">#</th>
              <th class="px-4 py-2 border-b border-r border-amber-100 text-[10px] font-black text-amber-700 bg-amber-50">Unit Name</th>
              <th class="px-4 py-2 border-b border-rose-100 text-[10px] font-black text-rose-700 bg-rose-50 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            ${this.units.map((u, idx) => `
              <tr class="group hover:bg-slate-50/50">
                <td class="px-3 py-1.5 border-r border-slate-100 text-center font-bold text-slate-400 tabular-nums text-xs">${idx + 1}</td>
                <td class="px-4 py-1.5 border-r border-slate-100">
                  <input type="text" id="unit-input-${u.id}" value="${u.name}" 
                    onfocus="MasterDB.enterUnitEditMode(${u.id})"
                    onkeydown="if(event.key==='Enter') MasterDB.handleUnitRename(${u.id}, this.value)"
                    class="w-full bg-transparent border-none focus:ring-0 p-0 text-slate-800 font-bold text-sm transition-colors uppercase cursor-text focus:text-accent">
                </td>
                <td class="px-4 py-1.5 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <div id="unit-actions-normal-${u.id}" class="flex items-center gap-1">
                      <button onclick="MasterDB.handleUnitDelete(${u.id})" class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Delete">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5" stroke-width="2.5"></i>
                      </button>
                      <button onclick="document.getElementById('unit-input-${u.id}').focus()" class="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg" title="Rename">
                        <i data-lucide="edit-2" class="w-3.5 h-3.5" stroke-width="2.5"></i>
                      </button>
                    </div>
                    <div id="unit-actions-edit-${u.id}" class="flex items-center gap-1 hidden">
                      <button onmousedown="MasterDB.handleUnitRename(${u.id}, document.getElementById('unit-input-${u.id}').value)" class="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Save">
                        <i data-lucide="check" class="w-4 h-4" stroke-width="3"></i>
                      </button>
                      <button onmousedown="MasterDB.renderUnitsList()" class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Cancel">
                        <i data-lucide="x" class="w-4 h-4" stroke-width="3"></i>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  },

  enterUnitEditMode(id) {
    document.getElementById(`unit-actions-normal-${id}`)?.classList.add('hidden');
    document.getElementById(`unit-actions-edit-${id}`)?.classList.remove('hidden');
  },

  async addNewUnit() {
    const name = document.getElementById('new-unit-name').value.trim();
    if (!name) return;
    await window.api.addUnit(name);
    document.getElementById('new-unit-name').value = '';
    await this.renderUnitsList();
  },

  async handleUnitRename(id, newName) {
    if (!newName.trim()) return;
    await window.api.updateUnit(id, newName.trim());
    await this.renderUnitsList();
  },

  async handleUnitDelete(id) {
    app.verifyPassword({
      title: 'Delete Unit Verification',
      message: 'Please enter password to delete this unit:',
      onVerified: () => {
        app.showConfirm({
          title: 'Delete Unit',
          message: 'Are you sure? Removing this unit may affect how items are displayed.',
          confirmText: 'Delete',
          confirmColor: 'red',
          onConfirm: async () => {
            await window.api.deleteUnit(id);
            await this.renderUnitsList();
          }
        });
      }
    });
  },

  _profitsData: [],

  async openProfitsModal() {
    const modal = document.getElementById('profits-modal');
    modal.classList.remove('hidden', 'opacity-0');
    modal.classList.add('flex');
    document.getElementById('profits-card').classList.remove('scale-95');
    
    app.showLoading();
    this._profitsData = await window.api.getProposals() || [];
    app.hideLoading();
    
    this.resetProfitsFilters(false);
    this.applyProfitsFilters();
  },

  closeProfitsModal() {
    const modal = document.getElementById('profits-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  resetProfitsFilters(apply = true) {
    document.getElementById('prof-search').value = '';
    document.getElementById('prof-status-filter').value = 'all';
    document.getElementById('prof-sort').value = 'date_desc';
    if(apply) this.applyProfitsFilters();
  },

  applyProfitsFilters() {
     const term = document.getElementById('prof-search').value.toLowerCase();
     const statusFilter = document.getElementById('prof-status-filter').value;
     const sort = document.getElementById('prof-sort').value;
     
     let filtered = this._profitsData.filter(p => {
        const propNum = String(p.proposal_number || '').toLowerCase();
        const custName = String(p.customer_name || '').toLowerCase();
        const matchesSearch = propNum.includes(term) || custName.includes(term);
        const matchesStatus = (statusFilter === 'all') || (p.status === statusFilter);
        return matchesSearch && matchesStatus;
     });

     if (sort === 'date_desc') filtered.sort((a,b) => new Date(b.date) - new Date(a.date));
     else if (sort === 'date_asc') filtered.sort((a,b) => new Date(a.date) - new Date(b.date));
     else if (sort === 'profit_desc') filtered.sort((a,b) => (b.profit || 0) - (a.profit || 0));
     else if (sort === 'profit_asc') filtered.sort((a,b) => (a.profit || 0) - (b.profit || 0));
     else if (sort === 'total_desc') filtered.sort((a,b) => (b.retail_total || 0) - (a.retail_total || 0));

     this.renderProfitsList(filtered);
     
     const hasFilters = term !== '' || statusFilter !== 'all' || sort !== 'date_desc';
     const resetBtn = document.getElementById('prof-filter-reset');
     if (resetBtn) resetBtn.classList.toggle('hidden', !hasFilters);
  },

  renderProfitsList(list) {
     const tbody = document.getElementById('profits-tbody');
     if (!tbody) return;

     if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-12 text-center text-slate-400">No proposals found matching criteria</td></tr>';
        document.getElementById('prof-total-cost').textContent = "Rs. 0";
        document.getElementById('prof-total-retail').textContent = "Rs. 0";
        document.getElementById('prof-total-profit').textContent = "Rs. 0";
        return;
     }

     let sumCost = 0;
     let sumRetail = 0;
     let sumProfit = 0;

     tbody.innerHTML = list.map((p, idx) => {
         const dateDisplay = app.formatDateTime ? app.formatDateTime(p.date) : app.formatDate(p.date);
         
         const sColor = {
             'Paid': 'bg-green-100 text-green-700',
             'Partial': 'bg-blue-100 text-blue-700',
             'Pending': 'bg-red-100 text-red-700',
             // Draft logic removed
             'Finalized': 'bg-cyan-100 text-cyan-700'
         }[p.status || 'Pending'] || 'bg-slate-100 text-slate-500';

         const cTotal = p.cost_total || 0;
         const rTotal = p.retail_total || 0;
         const prof = p.profit || 0;

         sumCost += cTotal;
         sumRetail += rTotal;
         sumProfit += prof;

         return `
            <tr class="hover:bg-slate-50 transition-colors group">
               <td class="px-2 py-1.5 border-b border-r border-slate-100 text-center font-bold text-slate-400 tabular-nums text-xs">${idx + 1}</td>
               <td class="px-3 py-1.5 border-b border-r border-slate-100 text-slate-800 font-bold whitespace-nowrap text-xs">${p.proposal_number}</td>
               <td class="px-3 py-1.5 border-b border-r border-slate-100 text-slate-800 break-words text-xs">${p.customer_name || '-'} <br><span class="text-[10px] text-slate-400 font-normal">${dateDisplay}</span></td>
               <td class="px-3 py-1.5 border-b border-r border-slate-100 text-center">
                   <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase ${sColor}">${p.status || 'Pending'}</span>
               </td>
               <td class="px-3 py-1.5 text-right border-b border-r border-red-100/50 bg-red-50/20 text-red-700 font-medium tabular-nums text-xs">${app.formatCurrency(cTotal)}</td>
               <td class="px-3 py-1.5 text-right border-b border-r border-green-100/50 bg-green-50/20 text-green-700 font-medium tabular-nums text-xs">${app.formatCurrency(rTotal)}</td>
               <td class="px-3 py-1.5 text-right bg-amber-50/20 text-amber-600 border-b border-amber-100/50 font-black tabular-nums text-xs">${app.formatCurrency(prof)}</td>
            </tr>
         `;
     }).join('');

     document.getElementById('prof-total-cost').textContent = app.formatCurrency(sumCost);
     document.getElementById('prof-total-retail').textContent = app.formatCurrency(sumRetail);
     document.getElementById('prof-total-profit').textContent = app.formatCurrency(sumProfit);
     if (window.lucide) lucide.createIcons();
  },

  async openSalesStats(isAll = false) {
    this.isAllSalesView = isAll;
    const cat = this.categories.find(c => c.id === this.currentCategory);
    document.getElementById('sales-category-name').textContent = isAll ? `All Categories collectively` : `Category: ${cat?.label || 'Current Category'}`;
    
    const now = new Date();
    const dateInput = document.getElementById('sales-stat-date');
    if (dateInput && !dateInput.value) {
      dateInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    const monthInput = document.getElementById('sales-stat-month');
    if (monthInput && !monthInput.value) {
      monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    // Show modal
    const modal = document.getElementById('sales-modal');
    modal.classList.remove('hidden', 'opacity-0');
    modal.classList.add('flex');
    const salesCard = document.getElementById('sales-card');
    if (salesCard) salesCard.classList.remove('scale-95');

    await this.loadSalesData();
  },

  async switchSalesPeriod(period) {
    this.currentSalesPeriod = period;
    await this.loadSalesData();
  },

  async loadSalesData() {
    // Update button styles
    document.querySelectorAll('.period-btn').forEach(btn => {
      if (btn.id === `btn-sales-${this.currentSalesPeriod}`) {
        btn.className = 'period-btn px-4 py-1.5 rounded-md text-xs font-black bg-white shadow-sm text-slate-900 transition-all';
      } else {
        btn.className = 'period-btn px-4 py-1.5 rounded-md text-xs font-bold text-slate-500 hover:text-slate-800 transition-all';
      }
    });

    const isDaily = this.currentSalesPeriod === 'daily';
    const isMonthly = this.currentSalesPeriod === 'monthly';
    document.getElementById('sales-stat-date-wrap')?.classList.toggle('hidden', !isDaily);
    document.getElementById('sales-stat-month-wrap')?.classList.toggle('hidden', !isMonthly);

    let targetDate = null;
    if (isDaily) {
      targetDate = document.getElementById('sales-stat-date')?.value || null;
    } else if (isMonthly) {
      targetDate = document.getElementById('sales-stat-month')?.value || null;
    }

    const tbody = document.getElementById('sales-tbody');
    tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-slate-400 italic">Loading sales data...</td></tr>`;

    const section = this.isAllSalesView ? 'all' : this.currentCategory;
    const sales = await window.api.getItemSales(section, this.currentSalesPeriod, targetDate);
    
    // Populate Category Filter if in All View
    const catFilter = document.getElementById('sales-cat-filter');
    catFilter.innerHTML = '<option value="all">All Categories</option>' + 
        this.categories.map(c => `<option value="${c.id}">${c.label}</option>`).join('');

    if (!this.isAllSalesView) {
        catFilter.value = section;
        catFilter.disabled = true;
    } else {
        catFilter.value = 'all';
        catFilter.disabled = false;
    }

    this._lastSalesData = sales;
    document.getElementById('sales-search').value = '';
    document.getElementById('sales-sort').value = 'revenue_desc';
    this.applySalesFilters();

    if (window.lucide) lucide.createIcons();
    this.checkSalesFilterChanges();
  },

  checkSalesFilterChanges() {
    const query = document.getElementById('sales-search')?.value || '';
    const sortBy = document.getElementById('sales-sort')?.value || 'revenue_desc';
    const catFilter = document.getElementById('sales-cat-filter')?.value || 'all';
    const period = this.currentSalesPeriod || 'daily';
    
    const hasFilters = query !== '' || sortBy !== 'revenue_desc' || (this.isAllSalesView && catFilter !== 'all') || period !== 'daily';
    
    const resetBtn = document.getElementById('sales-filter-reset');
    if (resetBtn) {
        resetBtn.classList.toggle('hidden', !hasFilters);
    }
  },

  resetSalesFilters() {
    const search = document.getElementById('sales-search');
    if (search) search.value = '';
    
    const sort = document.getElementById('sales-sort');
    if (sort) sort.value = 'revenue_desc';
    
    const cat = document.getElementById('sales-cat-filter');
    if (cat && this.isAllSalesView) cat.value = 'all';
    
    this.currentSalesPeriod = 'daily';
    this.loadSalesData();
  },

  applySalesFilters() {
    const query = document.getElementById('sales-search').value.toLowerCase();
    const sortBy = document.getElementById('sales-sort').value;
    const catFilter = document.getElementById('sales-cat-filter').value;
    
    let data = [...this._lastSalesData];
    
    // Category Filter
    if (catFilter !== 'all') {
        data = data.filter(s => {
            const sSlug = this.revSectionMap[s.section] || s.section;
            return sSlug === catFilter;
        });
    }

    // Search Filter
    if (query) {
        data = data.filter(s => 
            s.description.toLowerCase().includes(query) || 
            (s.section && s.section.toLowerCase().includes(query))
        );
    }
    
    // Sort
    data.sort((a, b) => {
        if (sortBy === 'revenue_desc') return b.total_revenue - a.total_revenue;
        if (sortBy === 'revenue_asc') return a.total_revenue - b.total_revenue;
        if (sortBy === 'qty_desc') return b.total_qty - a.total_qty;
        if (sortBy === 'profit_desc') return b.total_profit - a.total_profit;
        if (sortBy === 'description_asc') return a.description.localeCompare(b.description);
        return 0;
    });
    
    this.renderSalesList(data);
    this.updateSalesTotals(data);
    this.checkSalesFilterChanges();
  },

  renderSalesList(sales) {
    const tbody = document.getElementById('sales-tbody');
    if (sales.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-slate-400 italic">No sales found for this criteria</td></tr>`;
      return;
    }

    tbody.innerHTML = sales.map((s, index) => {
      const catSlug = this.revSectionMap[s.section];
      const catLabel = this.labels[catSlug] || s.section;

      return `
        <tr class="hover:bg-slate-50 transition-colors border-b border-slate-200">
          <td class="px-2 py-1 border-r border-slate-200 text-center font-bold text-slate-400 tabular-nums text-xs">${index + 1}</td>
          <td class="px-4 py-1 font-medium text-slate-800 border-r border-slate-200">
            <div class="flex items-center gap-2">
              <span class="text-slate-800 font-bold text-xs">${s.description}</span>
              ${this.isAllSalesView ? `<span class="text-[9px] text-accent font-bold uppercase tracking-wider px-1.5 py-0.2 bg-amber-50 rounded border border-amber-200/60 leading-none">${catLabel}</span>` : ''}
            </div>
          </td>
          <td class="px-4 py-1 text-center font-bold text-slate-700 border-r border-slate-200 text-xs font-outfit tabular-nums">${s.total_qty}</td>
          <td class="px-4 py-1 text-right font-bold text-red-700 border-r border-slate-200 text-xs font-outfit tabular-nums">${app.formatCurrency(s.total_cost || 0)}</td>
          <td class="px-4 py-1 text-right font-bold text-emerald-700 border-r border-slate-200 text-xs font-outfit tabular-nums">${app.formatCurrency(s.total_revenue)}</td>
          <td class="px-4 py-1 text-right font-bold text-amber-700 text-xs font-outfit tabular-nums">${app.formatCurrency(s.total_profit)}</td>
        </tr>
      `;
    }).join('');
  },

  updateSalesTotals(sales) {
    let totalQty = 0;
    let totalCost = 0;
    let totalRev = 0;
    let totalProf = 0;

    sales.forEach(s => {
      totalQty += s.total_qty;
      totalCost += s.total_cost || 0;
      totalRev += s.total_revenue;
      totalProf += s.total_profit;
    });

    document.getElementById('sales-total-qty').textContent = totalQty.toLocaleString();
    document.getElementById('sales-total-cost').textContent = app.formatCurrency(totalCost);
    document.getElementById('sales-total-revenue').textContent = app.formatCurrency(totalRev);
    document.getElementById('sales-total-profit').textContent = app.formatCurrency(totalProf);
  },

  closeSalesStats() {
    const modal = document.getElementById('sales-modal');
    modal.classList.add('opacity-0', 'hidden');
    modal.classList.remove('flex');
    const salesCard = document.getElementById('sales-card');
    if (salesCard) salesCard.classList.add('scale-95');
  },

  async printStockList() {
    const isAll = this.currentCategory === 'all';
    const cat = this.categories.find(c => c.id === this.currentCategory) || { id: 'all', label: 'All Categories', fields: ['item_name'] };
    if (!cat) return;
    
    if (!this.settings || !this.settings.company_name) {
      this.settings = await window.api.getSettings();
    }

    const query = document.getElementById('db-search')?.value.toLowerCase() || '';
    const lowStockVal = document.getElementById('db-low-stock-filter')?.value;
    let list = [...this.allProducts];
    if (query) {
        list = list.filter(p => {
            return (cat.fields && cat.fields.some(f => String(p[f] || '').toLowerCase().includes(query))) ||
                   String(p.description || '').toLowerCase().includes(query) ||
                   String(p.category_name || '').toLowerCase().includes(query) ||
                   String(p.company_name || '').toLowerCase().includes(query) ||
                   String(p.item_name || '').toLowerCase().includes(query);
        });
    }

    if (lowStockVal !== '' && lowStockVal !== undefined && lowStockVal !== null) {
        const limit = parseInt(lowStockVal);
        list = list.filter(p => (p.current_stock || 0) <= limit);
    }

    if (list.length === 0) {
        app.showAlert("No items to print in this category.");
        return;
    }

    const totalStock = list.reduce((sum, p) => sum + (p.current_stock || 0), 0);

    const rowHtml = list.map((p, idx) => {
      const catName = p.category_name || this.labels[p.slug] || p.slug;
      const itemName = (p.item_name || 'Unnamed Item') + (isAll && catName ? ` (${catName})` : '');
      return `
        <tr style="border-bottom: 1px solid #000;">
            <td style="border: 1px solid #000; padding: 6px 8px; font-size: 12px; text-align: center; color: #000; font-weight: 600;">${idx + 1}</td>
            <td style="border: 1px solid #000; padding: 6px 10px; font-size: 12.5px; color: #000; font-weight: 600; word-break: break-word; line-height: 1.3;">${itemName}</td>
            <td style="border: 1px solid #000; padding: 6px 10px; font-size: 13px; text-align: center; color: #000; font-weight: 700; line-height: 1.3;">${p.current_stock || 0}</td>
        </tr>
      `;
    }).join('');

    const html = `
        <div class="receipt-80mm" style="width: 100%; max-width: 780px; margin: 0 auto; padding: 20px 24px; background: #fff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #000; box-sizing: border-box; font-size: 13px; line-height: 1.5; border: 1.5px solid #000; border-radius: 8px; -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 14px;">
                <h1 style="font-size: 26px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.8px; color: #000; line-height: 1.2; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${this.settings.company_name || 'Akhtar & Sons'}</h1>
                <p style="font-size: 13px; margin: 3px 0 1px; font-weight: 500; color: #000; line-height: 1.4;">${this.settings.address || 'B-99, Lalarukh Basti, Wah Cantt'}</p>
                <p style="font-size: 13px; margin: 1px 0 0; font-weight: 600; color: #000;">Contact: ${this.settings.phone || '0310-5123788'}</p>
                <div style="margin-top: 6px;">
                    <span style="display: inline-block; border: 1.5px solid #000; padding: 3px 18px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; border-radius: 4px; color: #000; background: #fff;">${isAll ? 'FULL STOCK REPORT (ALL ITEMS)' : 'CATEGORY STOCK REPORT'}</span>
                </div>
            </div>
            
            <!-- Metadata Card -->
            <div style="display: flex; justify-content: space-between; gap: 20px; font-size: 12.5px; line-height: 1.6; color: #000; margin-bottom: 14px; background: #fff; padding: 8px 12px; border-radius: 6px; border: 1px solid #000;">
                <div><span style="font-weight: 700; color: #000;">Category:</span> <span style="font-weight: 700; color: #000;">${cat.label}</span></div>
                <div><span style="font-weight: 700; color: #000;">Total Items:</span> <span style="font-weight: 700; color: #000;">${list.length}</span></div>
                <div><span style="font-weight: 700; color: #000;">Date:</span> <span style="font-weight: 500; color: #000;">${app.formatDateTime ? app.formatDateTime(new Date().toISOString()) : new Date().toLocaleString()}</span></div>
            </div>

            <!-- Items Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; border: 1.5px solid #000; color: #000; background: #fff;">
                <thead>
                    <tr style="border-bottom: 1.5px solid #000; background: #fff;">
                        <th style="border: 1px solid #000; padding: 7px 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; text-align: center; width: 6%; color: #000;">#</th>
                        <th style="border: 1px solid #000; padding: 7px 10px; font-size: 12px; font-weight: 700; text-transform: uppercase; text-align: left; width: 74%; color: #000;">Item Name</th>
                        <th style="border: 1px solid #000; padding: 7px 10px; font-size: 12px; font-weight: 700; text-transform: uppercase; text-align: center; width: 20%; color: #000;">Stock Available</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowHtml}
                </tbody>
            </table>

            <!-- Summary Box -->
            <div style="margin-left: auto; width: 340px; margin-bottom: 14px; font-size: 13px; line-height: 1.8; color: #000; background: #fff; border: 1.5px solid #000; border-radius: 6px; padding: 8px 12px;">
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #000; font-weight: 500;">Total Items Listed:</span>
                    <span style="font-weight: 700; color: #000;">${list.length}</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-top: 1.5px solid #000; margin-top: 4px; padding-top: 4px; font-size: 14px;">
                    <span style="font-weight: 700; color: #000;">Total Stock Quantity:</span>
                    <span style="font-weight: 800; color: #000;">${totalStock} Boxes</span>
                </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 16px; border-top: 1.5px solid #000; padding-top: 8px; font-size: 11px; color: #000;">
                <p style="margin: 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #000;">*** END OF STOCK REPORT ***</p>
            </div>
        </div>
    `;

    app.setPrintContent('db-print-container', html);

    // Show Preview Modal
    const previewEl = document.getElementById('preview-paper');
    if (previewEl) previewEl.innerHTML = html;

    document.getElementById('preview-title').textContent = 'Category Stock Preview';
    document.getElementById('preview-subtitle').textContent = `A5 DOCUMENT • ${cat.label.toUpperCase()}`;

    const printBtn = document.getElementById('confirm-print-btn');
    if (printBtn) {
        printBtn.onclick = () => app.confirmPrint();
    }

    const modal = document.getElementById('preview-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    if (window.lucide) lucide.createIcons();
  },

  openCustomPrintModal() {
    const listEl = document.getElementById('print-cats-list');
    if (listEl) {
      listEl.innerHTML = this.categories.filter(c => c.id !== 'all').map(c => `
        <label class="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 cursor-pointer select-none transition-all group has-[:checked]:bg-indigo-50/70 has-[:checked]:border-indigo-300">
          <div class="flex items-center gap-2 min-w-0 pr-1">
            <input type="checkbox" value="${c.id}" class="print-cat-checkbox w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer" ${c.id === this.currentCategory ? 'checked' : ''}>
            <span class="text-xs font-bold text-slate-800 group-hover:text-slate-900 truncate">${c.label}</span>
          </div>
          <span class="text-[10px] font-black bg-slate-200/70 text-slate-600 px-1.5 py-0.5 rounded group-hover:bg-slate-200 shrink-0 tabular-nums">${c.count || 0}</span>
        </label>
      `).join('');
    }

    const modal = document.getElementById('db-custom-print-modal');
    const card = document.getElementById('db-custom-print-card');
    if (!modal) return;

    modal.classList.remove('hidden', 'opacity-0');
    modal.classList.add('flex');
    if (card) card.classList.remove('scale-95');
    if (window.lucide) lucide.createIcons();
  },

  closeCustomPrintModal() {
    const modal = document.getElementById('db-custom-print-modal');
    const card = document.getElementById('db-custom-print-card');
    if (!modal) return;

    modal.classList.add('opacity-0', 'hidden');
    modal.classList.remove('flex');
    if (card) card.classList.add('scale-95');
  },

  toggleAllPrintCats(selectAll) {
    document.querySelectorAll('.print-cat-checkbox').forEach(cb => {
      cb.checked = selectAll;
    });
  },

  onPrintFilterChange() {
    const filterType = document.getElementById('print-stock-filter-type')?.value;
    const limitBox = document.getElementById('print-low-stock-limit-box');
    if (limitBox) {
      if (filterType === 'low_stock') {
        limitBox.classList.remove('hidden');
      } else {
        limitBox.classList.add('hidden');
      }
    }
  },

  async generateCustomStockPrint() {
    const checkedBoxes = Array.from(document.querySelectorAll('.print-cat-checkbox:checked'));
    const selectedCatIds = checkedBoxes.map(cb => cb.value);

    if (selectedCatIds.length === 0) {
      return app.showAlert("Please select at least one category to print.");
    }

    if (!this.settings || !this.settings.company_name) {
      this.settings = await window.api.getSettings();
    }

    const sortBy = document.getElementById('print-stock-sort')?.value || 'name_asc';
    const filterType = document.getElementById('print-stock-filter-type')?.value || 'all';
    const lowStockLimit = parseInt(document.getElementById('print-low-stock-limit')?.value) || 5;
    const isGrouped = document.getElementById('print-group-by-cat')?.checked ?? true;

    // Fetch all products across store
    app.showLoading();
    let allProds = [];
    try {
      allProds = await window.api.searchAllProducts('') || [];
    } catch(err) {
      console.error(err);
      app.hideLoading();
      return app.showAlert("Error loading products for print.");
    }
    app.hideLoading();

    // Filter by selected categories
    let filtered = allProds.filter(p => selectedCatIds.includes(p.slug));

    // Filter by stock condition
    if (filterType === 'in_stock') {
      filtered = filtered.filter(p => (p.current_stock || 0) > 0);
    } else if (filterType === 'low_stock') {
      filtered = filtered.filter(p => (p.current_stock || 0) <= lowStockLimit);
    }

    if (filtered.length === 0) {
      return app.showAlert("No items match the selected categories and stock filter.");
    }

    // Sort function
    const sortItems = (items) => {
      return [...items].sort((a, b) => {
        if (sortBy === 'name_asc') return (a.item_name || '').localeCompare(b.item_name || '');
        if (sortBy === 'name_desc') return (b.item_name || '').localeCompare(a.item_name || '');
        if (sortBy === 'stock_desc') return (b.current_stock || 0) - (a.current_stock || 0);
        if (sortBy === 'stock_asc') return (a.current_stock || 0) - (b.current_stock || 0);
        return 0;
      });
    };

    const sortLabelsMap = {
      name_asc: 'Name (A-Z)',
      name_desc: 'Name (Z-A)',
      stock_desc: 'Stock (High to Low)',
      stock_asc: 'Stock (Low to High)'
    };
    const sortDisplay = sortLabelsMap[sortBy] || 'Name (A-Z)';

    const totalStock = filtered.reduce((sum, p) => sum + (p.current_stock || 0), 0);

    let sectionsHtml = '';
    if (isGrouped) {
      selectedCatIds.forEach(catId => {
        const catObj = this.categories.find(c => c.id === catId);
        const catLabel = catObj ? catObj.label : (this.labels[catId] || catId);
        const catItems = sortItems(filtered.filter(p => p.slug === catId));
        if (catItems.length === 0) return;

        const catStockSum = catItems.reduce((s, p) => s + (p.current_stock || 0), 0);
        const catRowsHtml = catItems.map((p, idx) => `
          <tr style="border-bottom: 1px dotted #000;">
            <td style="border: 1px solid #000; padding: 2.5px 2px; font-size: 9.5px; text-align: center; color: #000; font-weight: 600; line-height: 1.25;">${idx + 1}</td>
            <td style="border: 1px solid #000; padding: 2.5px 3px; font-size: 9.5px; color: #000; font-weight: 500; word-break: break-word; line-height: 1.25;">${p.item_name || 'Unnamed Item'}</td>
            <td style="border: 1px solid #000; padding: 2.5px 3px; font-size: 9.5px; text-align: center; color: #000; font-weight: 700; line-height: 1.25;">${p.current_stock || 0}</td>
          </tr>
        `).join('');

        sectionsHtml += `
          <div style="margin-bottom: 4px;">
            <div style="background: #000; color: #fff; padding: 2.5px 4px; font-weight: 700; font-size: 9.5px; text-transform: uppercase; display: flex; justify-content: space-between; align-items: center;">
              <span>${catLabel}</span>
              <span style="font-size: 8.5px; font-weight: 500;">${catItems.length} items &bull; ${catStockSum} Bx</span>
            </div>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; color: #000; margin-bottom: 2px;">
              <thead>
                <tr style="text-align: left; border-bottom: 1px solid #000; background: #fff;">
                  <th style="border: 1px solid #000; padding: 2.5px 2px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; text-align: center; width: 22px; color: #000;">#</th>
                  <th style="border: 1px solid #000; padding: 2.5px 3px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; color: #000;">Item Name</th>
                  <th style="border: 1px solid #000; padding: 2.5px 3px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; text-align: center; width: 38px; color: #000;">Stock</th>
                </tr>
              </thead>
              <tbody>
                ${catRowsHtml}
              </tbody>
            </table>
          </div>
        `;
      });
    } else {
      const sortedAll = sortItems(filtered);
      const allRowsHtml = sortedAll.map((p, idx) => `
        <tr style="border-bottom: 1px dotted #000;">
          <td style="border: 1px solid #000; padding: 2.5px 2px; font-size: 9.5px; text-align: center; color: #000; font-weight: 600; line-height: 1.25;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 2.5px 3px; font-size: 9.5px; color: #000; font-weight: 500; word-break: break-word; line-height: 1.25;">
            ${p.item_name || 'Unnamed Item'}${selectedCatIds.length > 1 ? ` <span style="font-size: 8px; color: #444; font-weight: 400;">(${this.labels[p.slug] || p.slug})</span>` : ''}
          </td>
          <td style="border: 1px solid #000; padding: 2.5px 3px; font-size: 9.5px; text-align: center; color: #000; font-weight: 700; line-height: 1.25;">${p.current_stock || 0}</td>
        </tr>
      `).join('');

      sectionsHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; border: 1.5px solid #000; color: #000; background: #fff;">
          <thead>
            <tr style="text-align: left; border-bottom: 1.5px solid #000; background: #fff;">
              <th style="border: 1px solid #000; padding: 7px 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; text-align: center; width: 6%; color: #000;">#</th>
              <th style="border: 1px solid #000; padding: 7px 10px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #000;">Item Name</th>
              <th style="border: 1px solid #000; padding: 7px 10px; font-size: 12px; font-weight: 700; text-transform: uppercase; text-align: center; width: 20%; color: #000;">Stock Available</th>
            </tr>
          </thead>
          <tbody>
            ${allRowsHtml}
          </tbody>
        </table>
      `;
    }

    const selectedLabelsList = selectedCatIds.map(id => this.labels[id] || id).join(', ');

    const html = `
      <div class="receipt-80mm" style="width: 100%; max-width: 780px; margin: 0 auto; padding: 20px 24px; background: #fff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #000; box-sizing: border-box; font-size: 13px; line-height: 1.5; border: 1.5px solid #000; border-radius: 8px; -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 14px;">
          <h1 style="font-size: 26px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.8px; color: #000; line-height: 1.2; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${this.settings.company_name || 'Akhtar & Sons'}</h1>
          <p style="font-size: 13px; margin: 3px 0 1px; font-weight: 500; color: #000; line-height: 1.4;">${this.settings.address || 'B-99, Lalarukh Basti, Wah Cantt'}</p>
          <p style="font-size: 13px; margin: 1px 0 0; font-weight: 600; color: #000;">Contact: ${this.settings.phone || '0310-5123788'}</p>
          <div style="margin-top: 6px;">
            <span style="display: inline-block; border: 1.5px solid #000; padding: 3px 18px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; border-radius: 4px; color: #000; background: #fff;">STOCK INVENTORY REPORT</span>
          </div>
        </div>
        
        <!-- Metadata Card -->
        <div style="display: flex; justify-content: space-between; gap: 20px; font-size: 12.5px; line-height: 1.6; color: #000; margin-bottom: 14px; background: #fff; padding: 8px 12px; border-radius: 6px; border: 1px solid #000;">
          <div><span style="font-weight: 700; color: #000;">Categories (${selectedCatIds.length}):</span> <span style="font-weight: 700; color: #000;">${selectedLabelsList}</span></div>
          <div><span style="font-weight: 700; color: #000;">Sort:</span> <span style="font-weight: 600; color: #000;">${sortDisplay}</span></div>
          <div><span style="font-weight: 700; color: #000;">Date:</span> <span style="font-weight: 500; color: #000;">${app.formatDateTime ? app.formatDateTime(new Date().toISOString()) : new Date().toLocaleString()}</span></div>
        </div>

        ${sectionsHtml}

        <!-- Summary Box -->
        <div style="margin-left: auto; width: 340px; margin-bottom: 14px; font-size: 13px; line-height: 1.8; color: #000; background: #fff; border: 1.5px solid #000; border-radius: 6px; padding: 8px 12px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #000; font-weight: 500;">Total Categories:</span>
            <span style="font-weight: 700; color: #000;">${selectedCatIds.length}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #000; font-weight: 500;">Total Items Listed:</span>
            <span style="font-weight: 700; color: #000;">${filtered.length}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 1.5px solid #000; margin-top: 4px; padding-top: 4px; font-size: 14px;">
            <span style="font-weight: 700; color: #000;">Total Stock Quantity:</span>
            <span style="font-weight: 800; color: #000;">${totalStock} Boxes</span>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 16px; border-top: 1.5px solid #000; padding-top: 8px; font-size: 11px; color: #000;">
          <p style="margin: 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #000;">*** END OF STOCK REPORT ***</p>
        </div>
      </div>
    `;

    // Close selection modal
    this.closeCustomPrintModal();

    // Set content and open Preview Modal
    app.setPrintContent('db-print-container', html);
    const previewEl = document.getElementById('preview-paper');
    if (previewEl) previewEl.innerHTML = html;

    document.getElementById('preview-title').textContent = 'Stock Report Preview';
    document.getElementById('preview-subtitle').textContent = `A5 DOCUMENT • ${selectedCatIds.length} CATEGORIES`;

    const printBtn = document.getElementById('confirm-print-btn');
    if (printBtn) {
      printBtn.onclick = () => app.confirmPrint();
    }

    const modal = document.getElementById('preview-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
    if (window.lucide) lucide.createIcons();
  }
};
