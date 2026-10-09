window.SalesForm = {
  cart: [],
  availableItems: [],
  searchResults: [],
  highlightedSearchIndex: 0,
  filteredShops: [],
  highlightedShopIndex: 0,
  settings: {},
  discountType: 'flat',
  editingSaleId: null,
  sellers: [],
  shops: [],
  sellerName: '',
  salesmanContact: '',
  shopName: '',
  shopAddress: '',
  shopPhone: '',
  shopId: null,
  bookingDay: '',
  deliveryDay: '',
  paymentMethod: 'Cash',
  additionalDiscount: 0,
  includePrevBalance: true,

  categoryLabels: [],

  getDayOfWeek(date = new Date()) {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[date.getDay()];
  },

  getNextDayOfWeek(date = new Date()) {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[(date.getDay() + 1) % 7];
  },

  getCategoryName(item) {
    if (!item) return '';
    const rawCat = (item.category_name || '').trim();
    const solarKeywords = ['panels', 'inverters', 'structures', 'cables', 'breakers', 'batteries', 'misc', 'others', 'solar'];
    if (rawCat && !solarKeywords.includes(rawCat.toLowerCase())) {
      return rawCat;
    }
    const catMap = {
      panels: 'Biscuits',
      inverters: 'Cold Drinks',
      structures: 'Jellies & Candies',
      cables: 'Snacks & Chips',
      breakers: 'Chocolates',
      batteries: 'Dairy & Groceries',
      misc: 'Juices & Beverages',
      others: 'General Items'
    };
    const slug = (item.slug || item.section || '').toLowerCase();
    if (this.categoryLabels && this.categoryLabels.length > 0) {
      const match = this.categoryLabels.find(l => (l.slug || '').toLowerCase() === slug);
      if (match && match.label && !solarKeywords.includes(match.label.toLowerCase())) return match.label;
    }
    return catMap[slug] || (slug ? slug.toUpperCase() : '');
  },

  async render(container, args) {
    this.discountType = 'flat';
    this.settings = await window.api.getSettings();
    this.shops = await window.api.getShops() || [];
    this.categoryLabels = await window.api.getCategoryLabels() || [];
    this.paymentMethod = 'Cash';
    this.cart = [];
    this.searchResults = [];
    this.highlightedSearchIndex = 0;
    this.filteredShops = [];
    this.highlightedShopIndex = 0;
    
    // Fetch all items for instant client-side searching
    this.availableItems = await window.api.searchAllProducts('');

    // Disable parent scrolling for this page to keep our custom layout stable
    container.style.overflow = 'hidden';
    container.style.height = '100vh';
    
    this.editingSaleId = args?.id || null;
    this.originalTotal = 0;
    this.alreadyReceived = 0;
    this.receivedAmount = null;
    this.isReceivedCustom = false;
    this.originalItemsMap = {};
    this.sellerName = '';
    this.salesmanContact = '';
    this.shopName = '';
    this.shopAddress = '';
    this.shopPhone = '';
    this.shopId = null;
    this.bookingDay = this.getDayOfWeek(new Date());
    this.deliveryDay = this.getNextDayOfWeek(new Date());
    const savedTaxEnabled = window.storage ? window.storage.get('tax_enabled') : null;
    const savedTaxPercent = window.storage ? window.storage.get('tax_percent') : null;
    this.taxPercent = savedTaxPercent !== null ? parseFloat(savedTaxPercent) : 18;
    this.isTaxEnabled = savedTaxEnabled !== null ? Boolean(savedTaxEnabled) : true;
    const savedWhtEnabled = window.storage ? window.storage.get('wht_enabled') : null;
    const savedWhtPercent = window.storage ? window.storage.get('wht_percent') : null;
    this.whtPercent = savedWhtPercent !== null ? parseFloat(savedWhtPercent) : 0.5;
    this.isWhtEnabled = savedWhtEnabled !== null ? Boolean(savedWhtEnabled) : true;
    const savedIncludePrevBal = window.storage ? window.storage.get('include_prev_balance') : null;
    this.includePrevBalance = savedIncludePrevBal !== null ? Boolean(savedIncludePrevBal) : true;

    try {
      let configuredSellers = [];
      if (this.settings && this.settings.sellers_list) {
        try { configuredSellers = JSON.parse(this.settings.sellers_list); } catch(e) {}
      }
      if (!configuredSellers || configuredSellers.length === 0) {
        configuredSellers = [
          { name: 'Ifrahim', phone: '0329-9934620' },
          { name: 'Muhammad Ali', phone: '0300-1234567' },
          { name: 'Usman Tariq', phone: '0312-7654321' },
          { name: 'Bilal Ahmed', phone: '0333-9876543' }
        ];
      }
      this.sellers = configuredSellers.map(s => {
        if (typeof s === 'string') return { name: s.trim(), phone: '' };
        return { name: (s.name || s.full_name || '').trim(), phone: (s.phone || '').trim() };
      }).filter(s => s.name);
    } catch (e) {
      this.sellers = [
        { name: 'Ifrahim', phone: '0329-9934620' },
        { name: 'Muhammad Ali', phone: '0300-1234567' }
      ];
    }
    
    if (this.editingSaleId) {
      const sale = await window.api.getProposal(this.editingSaleId);
      if (sale) {
        this.originalItemsMap = {};
        if (sale.items) {
          sale.items.forEach(it => {
            const key = `${it.section}-${it.item_id}`;
            this.originalItemsMap[key] = (this.originalItemsMap[key] || 0) + (it.qty || 0);
          });
        }
        this.originalTotal = sale.retail_total;
        this.alreadyReceived = sale.received_amount || 0;
        this.receivedAmount = (sale.received_amount !== undefined && sale.received_amount !== null) ? Number(sale.received_amount) : (sale.retail_total || 0);
        this.isReceivedCustom = true;
        this.taxPercent = (sale.tax_percent !== undefined && sale.tax_percent !== null && sale.tax_percent > 0) ? sale.tax_percent : (savedTaxPercent !== null ? parseFloat(savedTaxPercent) : 18);
        this.isTaxEnabled = (sale.tax_percent > 0 || (sale.tax_amount !== undefined && sale.tax_amount > 0));
        this.whtPercent = (sale.wht_percent !== undefined && sale.wht_percent !== null && Number(sale.wht_percent) > 0) ? Number(sale.wht_percent) : (savedWhtPercent !== null ? parseFloat(savedWhtPercent) : 0.5);
        this.isWhtEnabled = (Number(sale.wht_percent) > 0 || (sale.wht_amount !== undefined && Number(sale.wht_amount) > 0));
        this.cart = sale.items.map(item => ({
          id: item.item_id,
          description: item.description,
          item_name: item.description.split(' - ')[0],
          retail_price: item.unit_retail,
          original_retail_price: item.unit_retail,
          cost_price: item.unit_cost,
          qty: item.qty,
          slug: item.section,
          unit: item.unit || 'pcs',
          discount: (item.unit_retail - (item.unit_discounted || item.unit_retail)) || '',
          discountType: 'flat'
        }));
        this.shopName = sale.shop_name || sale.customer_name || '';
        this.shopAddress = sale.shop_address || sale.location || '';
        this.shopPhone = sale.phone || '';
        this.shopId = sale.shop_id || null;
        const matchShop = (this.shops || []).find(s => s.id === this.shopId || s.name.toLowerCase() === this.shopName.toLowerCase());
        this.shopPreviousBalance = matchShop ? (Number(matchShop.amount) || 0) : (Number(sale.shop_previous_balance) || 0);
        if (sale.include_prev_balance !== undefined && sale.include_prev_balance !== null) {
          this.includePrevBalance = (sale.include_prev_balance === 1 || sale.include_prev_balance === true || sale.include_prev_balance === '1');
        }
        this.bookingDay = sale.booking_day || this.getDayOfWeek(new Date(sale.date || Date.now()));
        this.deliveryDay = sale.delivery_day || this.getNextDayOfWeek(new Date(sale.date || Date.now()));
        this.saleNumber = sale.proposal_number;
        this.sellerName = sale.salesman_name || sale.seller_name || '';
        this.salesmanContact = sale.salesman_contact || (this.sellers.find(s => s.name === this.sellerName)?.phone || '');
        
        const itemDiscountSum = sale.items.reduce((sum, item) => {
          return sum + ((item.unit_retail - (item.unit_discounted || item.unit_retail)) * item.qty);
        }, 0);
        this.additionalDiscount = (sale.discount || 0) - itemDiscountSum;
        if (this.additionalDiscount < 0) this.additionalDiscount = 0;
        if (sale.payment_method) this.paymentMethod = sale.payment_method;
        else this.paymentMethod = 'Cash';
        this.remarks = sale.remarks || (sale.payment_method ? `Paid via ${sale.payment_method}` : 'Paid via Cash');
        this.shopNtn = sale.cnic_ntn || sale.ntn || sale.cnic || (matchShop ? (matchShop.ntn || matchShop.cnic || '') : '');
      }
    } else {
      this.originalItemsMap = {};
      this.additionalDiscount = 0;
      this.saleNumber = await window.api.getNextProposalNumber();
      this.shopName = '';
      this.shopAddress = '';
      this.shopPhone = '';
      this.shopNtn = '';
      this.shopId = null;
      this.shopPreviousBalance = 0;
      this.receivedAmount = null;
      this.isReceivedCustom = false;
      this.sellerName = '';
      this.salesmanContact = '';
      this.paymentMethod = 'Cash';
      this.remarks = 'Paid via Cash';
    }

    const daysList = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

    container.innerHTML = `
      <div class="flex flex-col h-full bg-slate-200/90 overflow-y-auto custom-scrollbar p-3 md:p-5 select-none" id="sales-form-root">
        
        <!-- Centered Authentic Paper Bill Worksheet -->
        <div class="max-w-[980px] w-full mx-auto bg-white rounded-xl shadow-2xl border-2 border-slate-950 flex flex-col p-4 md:p-6 gap-3.5 text-slate-950 font-sans">
          
          <!-- 1. Top Header Box (Logo + Company Info + Sales Invoice Title) -->
          <div class="border-[1.5px] border-slate-950 p-3 flex items-center justify-between bg-white">
            <!-- Logo Frame -->
            <div class="w-20 h-14 border border-slate-950 flex items-center justify-center font-black text-xs uppercase shrink-0 bg-slate-50">
              ${(this.settings && this.settings.logo_path) ? `<img src="file://${this.settings.logo_path}" class="max-h-12 max-w-16 object-contain">` : '<span class="text-slate-700 tracking-wider">LOGO</span>'}
            </div>
            
            <!-- Company Title & Address Center -->
            <div class="flex-1 text-center px-2">
              <h1 class="font-sans text-2xl md:text-3xl font-black uppercase tracking-tight leading-none text-slate-950">
                ${this.settings.company_name || 'Akhtar & Sons'}
              </h1>
              <div class="text-[11px] font-semibold text-slate-800 mt-1">
                ${this.settings.address || 'B-99, Lalarukh Basti, Wah Cantt'} &nbsp;•&nbsp; ${this.settings.phone || '0310-5123788'}
              </div>
              <div class="border-t border-slate-950 my-1 w-4/5 mx-auto"></div>
              <div class="font-sans text-xs md:text-sm font-black uppercase tracking-wider text-slate-900">
                ${this.editingSaleId ? `<span class="text-blue-600">EDIT INVOICE</span> #${this.saleNumber}` : 'SALES INVOICE'}
              </div>
            </div>

            <!-- Quick Action / Invoice Tag on Right -->
            <div class="flex flex-col items-end gap-1.5 shrink-0">
              <div class="flex items-center gap-1.5 bg-slate-950 text-white px-2.5 py-1 rounded border border-slate-950 shadow-sm">
                <span class="text-[10px] uppercase font-bold text-amber-400">INV #</span>
                <input type="text" id="sf-sale-number" value="${this.saleNumber}" class="w-20 bg-transparent text-white font-black text-xs uppercase text-center outline-none focus:bg-slate-800 rounded">
              </div>
              <div id="sf-live-clock" class="text-[10px] font-bold text-slate-600">
                Loading...
              </div>
            </div>
          </div>

          <!-- 2. 2-Column Metadata Grid (Clean Dashed Inputs, No Booking Days) -->
          <div class="border border-slate-950 p-2.5 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-semibold bg-white">
            
            <!-- Left Metadata Column -->
            <div class="space-y-1.5 pr-0 md:pr-3 md:border-r border-slate-300">
              <div class="flex items-center">
                <span class="w-24 font-bold text-slate-700">Invoice #:</span>
                <span class="font-black text-slate-950 text-xs tracking-tight">${this.saleNumber}</span>
              </div>

              <div class="flex items-center">
                <span class="w-24 font-bold text-slate-700">Booked By:</span>
                <div class="flex-1 flex items-center gap-1">
                  <select id="sf-salesman-select" onchange="SalesForm.onSalesmanChange(this.value)" class="flex-1 bg-amber-50/50 border-b border-dashed border-slate-400 font-black text-slate-900 text-xs py-0.5 outline-none focus:border-slate-950 cursor-pointer">
                    <option value="">-- Select Salesman --</option>
                    ${(this.sellers || []).map(s => `<option value="${s.name}" ${this.sellerName === s.name ? 'selected' : ''}>${s.name} ${s.phone ? '(' + s.phone + ')' : ''}</option>`).join('')}
                  </select>
                  <span id="sf-salesman-contact-badge" class="text-[10px] text-slate-500 font-bold">${this.salesmanContact || ''}</span>
                </div>
              </div>

              <div class="flex items-center">
                <span class="w-24 font-bold text-slate-700">Delivered By:</span>
                <input type="text" id="sf-delivered-by" value="SELF" class="flex-1 bg-transparent border-b border-dashed border-slate-400 font-bold text-slate-800 text-xs py-0.5 outline-none focus:border-slate-950">
              </div>

              <div class="flex items-center">
                <span class="w-24 font-bold text-slate-700">Remarks:</span>
                <input type="text" id="sf-payment-remarks" value="${this.remarks || ('Paid via ' + (this.paymentMethod || 'Cash'))}" class="flex-1 bg-transparent border-b border-dashed border-slate-400 font-bold text-slate-800 text-xs py-0.5 outline-none focus:border-slate-950">
              </div>
            </div>

            <!-- Right Metadata Column -->
            <div class="space-y-1.5 pl-0 md:pl-1">
              <div class="flex items-center relative" id="sf-shop-container">
                <span class="w-24 font-bold text-slate-700 flex items-center justify-between pr-1">
                  <span>Sale To: <span class="text-rose-600">*</span></span>
                </span>
                <div class="flex-1 relative flex items-center">
                  <input type="text" 
                         id="sf-shop-name" 
                         autocomplete="off"
                         onfocus="SalesForm.handleShopFocus()" 
                         onclick="SalesForm.handleShopFocus()"
                         oninput="SalesForm.handleShopInput(this.value)" 
                         onkeydown="SalesForm.handleShopKeyDown(event)"
                         value="${this.shopName || ''}" 
                         placeholder="Search / Type Shop Name (Press F1)..." 
                         ${this.shopName ? 'readonly' : ''}
                         class="w-full ${this.shopName ? 'bg-amber-50/50 font-black text-slate-950' : 'bg-transparent font-bold text-slate-800'} border-b border-dashed border-slate-400 text-xs py-0.5 pr-6 outline-none focus:border-slate-950">
                  
                  <button type="button" 
                          id="sf-shop-clear-btn" 
                          onclick="SalesForm.clearSelectedShop()" 
                          title="Clear shop (Del)"
                          class="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 text-xs font-bold cursor-pointer ${this.shopName ? '' : 'hidden'}">
                    ✕
                  </button>
                </div>
                <!-- Dropdown List -->
                <div id="sf-shops-dropdown" class="absolute top-full left-24 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-2xl overflow-hidden hidden max-h-[240px] overflow-y-auto custom-scrollbar z-50 divide-y divide-slate-100"></div>
              </div>

              <div class="flex items-center">
                <span class="w-24 font-bold text-slate-700">Address:</span>
                <input type="text" 
                       id="sf-shop-address" 
                       value="${this.shopAddress || ''}" 
                       placeholder="Shop Address (e.g. FAISAL IQBAL TOWN)" 
                       class="flex-1 bg-transparent border-b border-dashed border-slate-400 text-slate-800 font-semibold text-xs py-0.5 outline-none focus:border-slate-950">
              </div>

              <div class="flex items-center">
                <span class="w-24 font-bold text-slate-700">Contact Info:</span>
                <input type="text" 
                       id="sf-shop-phone" 
                       value="${this.shopPhone || ''}" 
                       placeholder="Phone Number (e.g. 0312-3456789)" 
                       class="flex-1 bg-transparent border-b border-dashed border-slate-400 text-slate-800 font-semibold text-xs py-0.5 outline-none focus:border-slate-950">
              </div>

              <div class="flex items-center">
                <span class="w-24 font-bold text-slate-700">CNIC - NTN #:</span>
                <input type="text" id="sf-cnic-ntn" value="${this.shopNtn || ''}" placeholder="CNIC / NTN #" class="flex-1 bg-transparent border-b border-dashed border-slate-400 font-bold text-slate-800 text-xs py-0.5 outline-none focus:border-slate-950 placeholder:font-normal placeholder:text-slate-400">
              </div>
            </div>

          </div>

          <!-- 3. Fast Item Search Bar Directly on the Bill -->
          <div class="relative z-20" id="sf-search-container">
            <div class="relative flex items-center bg-amber-50/70 border-2 border-amber-400 focus-within:border-slate-950 focus-within:bg-white rounded-lg transition-all shadow-sm">
              <span class="pl-3 pr-2 text-amber-600 font-bold text-sm">🔍</span>
              <input type="text" 
                     id="sf-fast-item-search" 
                     autocomplete="off"
                     oninput="SalesForm.handleSearchInput(this.value)"
                     onkeydown="SalesForm.handleSearchKeyDown(event)"
                     placeholder="Type product name or code to add item to bill (Press F2 or type anywhere)..." 
                     class="w-full py-2 bg-transparent text-slate-950 font-black text-xs outline-none placeholder:text-slate-400">
              
              <button type="button" 
                      id="sf-search-clear-btn" 
                      onclick="SalesForm.clearSearchInput()" 
                      title="Clear search (Del / Esc)"
                      class="px-2 py-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded text-xs font-bold cursor-pointer hidden mr-1 transition-colors">
                ✕
              </button>

              <span class="text-[10px] font-black uppercase text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded mr-2 shrink-0">
                Fast Add (F2)
              </span>
            </div>
            <div id="sf-search-dropdown" class="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-2xl overflow-hidden hidden max-h-[300px] overflow-y-auto custom-scrollbar z-50 divide-y divide-slate-100"></div>
          </div>

          <!-- 4. Products Table (Structured Identically to the Bill Table with GST 18%) -->
          <div class="border border-slate-950 overflow-hidden flex flex-col bg-white">
            <table class="w-full border-collapse text-[11px]" id="sf-cart-table">
              <thead class="bg-slate-100 border-b border-slate-950 text-slate-950 uppercase font-black tracking-wider select-none text-[10.5px]">
                <tr>
                  <th class="py-1.5 px-2 w-10 text-center border-r border-slate-950">Sr. #</th>
                  <th class="py-1.5 px-3 border-r border-slate-950 text-left">Product Description</th>
                  <th class="py-1.5 px-2 w-20 text-center border-r border-slate-950">Qty</th>
                  <th class="py-1.5 px-2 w-24 text-right border-r border-slate-950">Rate (Rs.)</th>
                  <th class="py-1.5 px-2 w-24 text-right border-r border-slate-950">Gross Value</th>
                  <th class="py-1 px-1.5 w-32 text-right border-r border-slate-950 select-none">
                    <div class="inline-flex items-center justify-end gap-1">
                      <label class="inline-flex items-center gap-1 cursor-pointer" title="Include/Exclude GST">
                        <input type="checkbox" 
                               id="sf-gst-toggle" 
                               ${this.isTaxEnabled ? 'checked' : ''} 
                               onchange="SalesForm.toggleTaxEnable(this.checked)" 
                               class="w-3.5 h-3.5 rounded text-amber-500 cursor-pointer accent-amber-500">
                        <span class="text-[10px] font-black uppercase text-slate-900 tracking-tight">GST</span>
                      </label>
                      <span class="text-[10px] text-slate-500 font-bold">(</span>
                      <input type="number" 
                             id="sf-gst-percent" 
                             value="${this.taxPercent}" 
                             min="0" 
                             max="100" 
                             step="any" 
                             oninput="SalesForm.onTaxPercentInput(this.value)" 
                             style="-moz-appearance: textfield; -webkit-appearance: none; margin: 0;"
                             class="w-10 text-center bg-white border border-slate-300 rounded px-1 py-0 text-[10.5px] font-black text-slate-900 outline-none focus:border-amber-500 tabular-nums">
                      <span class="text-[10px] text-slate-500 font-bold">%)</span>
                    </div>
                  </th>
                  <th class="py-1.5 px-3 w-28 text-right border-r border-slate-950">Net Value</th>
                  <th class="py-1.5 px-1.5 w-10 text-center">✕</th>
                </tr>
              </thead>
              <tbody id="sf-cart-tbody" class="divide-y divide-slate-200">
                <!-- Injected via renderCart() -->
              </tbody>
              <tfoot id="sf-cart-tfoot" class="bg-slate-50 border-t-2 border-slate-950 font-black text-slate-950">
                <!-- Summary Totals Row -->
              </tfoot>
            </table>

            <!-- Empty state when no items in cart -->
            <div id="sf-cart-empty-state" class="py-8 text-center flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
              <p class="font-bold text-slate-700 text-xs">No items on this bill yet</p>
              <p class="text-[11px] text-slate-400 mt-0.5">Type in the yellow search box above or press <kbd class="px-1 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px]">F2</kbd> to add items.</p>
            </div>
          </div>

          <!-- 5. Lower Summary Breakdown Strip (Ultra Compact Bill Footer Matching Given Bill) -->
          <div class="border border-slate-950 px-3 py-1.5 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold bg-white">
            
            <!-- Left Info & Balances -->
            <div class="flex items-center gap-3 text-xs">
              <div class="flex items-center gap-1.5">
                <label class="inline-flex items-center gap-1.5 cursor-pointer select-none" title="Include / Exclude Previous Balance in Bill">
                  <input type="checkbox" 
                         id="sf-prev-bal-toggle" 
                         ${this.includePrevBalance ? 'checked' : ''} 
                         onchange="SalesForm.togglePrevBalanceEnable(this.checked)" 
                         class="w-3.5 h-3.5 rounded text-amber-500 cursor-pointer accent-amber-500">
                  <span class="font-bold text-slate-600">Prev. Bal:</span>
                </label>
                <span class="font-black text-slate-900" id="sf-prev-balance-text">${this.shopPreviousBalance ? app.formatCurrency(this.shopPreviousBalance) : '0'}</span>
              </div>
              <span class="text-slate-300">|</span>
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-slate-600">Net Balance:</span>
                <span class="font-black text-slate-950" id="sf-net-balance-text">Rs. 0</span>
              </div>
              <span class="text-slate-300">|</span>
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-slate-600">Sum Net:</span>
                <span class="font-black text-slate-900" id="sf-subtotal">Rs. 0</span>
              </div>
            </div>

            <!-- Right Financial Summary with WHT, Received Amount & Pending Due -->
            <div class="flex items-center gap-3">
              <!-- WHT Toggle & Custom % Field -->
              <div class="inline-flex items-center gap-1 select-none">
                <label class="inline-flex items-center gap-1 cursor-pointer" title="Include/Exclude Withholding Tax (WHT)">
                  <input type="checkbox" 
                         id="sf-wht-toggle" 
                         ${this.isWhtEnabled ? 'checked' : ''} 
                         onchange="SalesForm.toggleWhtEnable(this.checked)" 
                         class="w-3.5 h-3.5 rounded text-amber-500 cursor-pointer accent-amber-500">
                  <span class="text-[10px] font-black uppercase text-slate-900 tracking-tight">WHT</span>
                </label>
                <span class="text-[10px] text-slate-500 font-bold">(</span>
                <input type="number" 
                       id="sf-wht-percent" 
                       value="${this.whtPercent !== undefined && this.whtPercent !== null ? this.whtPercent : 0.5}" 
                       min="0" 
                       max="100" 
                       step="any" 
                       oninput="SalesForm.onWhtPercentInput(this.value)" 
                       style="-moz-appearance: textfield; -webkit-appearance: none; margin: 0;"
                       class="w-10 text-center bg-white border border-slate-300 rounded px-1 py-0 text-[10.5px] font-black text-slate-900 outline-none focus:border-amber-500 tabular-nums">
                <span class="text-[10px] text-slate-500 font-bold">%)</span>
                <span class="text-[11px] font-black text-slate-800 tabular-nums ml-0.5" id="sf-wht-amount-text">Rs. 0</span>
              </div>

              <div class="h-4 w-[1px] bg-slate-300"></div>

              <div class="flex items-center gap-1.5">
                <span class="font-black text-xs text-slate-950 uppercase tracking-tight">Net Inv. Amount:</span>
                <span class="font-black text-base text-emerald-700 tabular-nums" id="sf-grand-total">Rs. 0</span>
              </div>

              <!-- Received Amount Input Field -->
              <div class="flex items-center gap-1.5 bg-amber-50/90 border border-amber-300 rounded-lg px-2 py-0.5 shadow-2xs">
                <label for="sf-received-amount" class="font-bold text-xs text-amber-950 uppercase tracking-tight whitespace-nowrap">Received:</label>
                <div class="flex items-center">
                  <span class="text-[11px] font-bold text-amber-700 mr-1 select-none">Rs.</span>
                  <input type="number" 
                         id="sf-received-amount" 
                         min="0" 
                         step="any" 
                         placeholder="0" 
                         value="${this.receivedAmount !== null && this.receivedAmount !== undefined ? this.receivedAmount : ''}"
                         oninput="SalesForm.onReceivedAmountInput(this.value)" 
                         class="w-20 text-right font-black text-xs text-slate-900 bg-white border border-amber-400 rounded px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 tabular-nums">
                </div>
              </div>

              <!-- Pending / Due for this bill (Added to Shop Balance) -->
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-xs text-rose-700 uppercase tracking-tight">Pending:</span>
                <span class="font-black text-xs text-rose-700 tabular-nums" id="sf-pending-amount">Rs. 0</span>
              </div>
            </div>

          </div>

          <!-- 6. Bottom Action Toolbar -->
          <div class="flex items-center justify-between pt-2 border-t border-slate-300 shrink-0">
            <div class="flex items-center gap-2.5">
              <button type="button" 
                      onclick="SalesForm.resetForm()" 
                      class="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all border border-slate-300">
                <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
                <span>Clear / Reset (Esc)</span>
              </button>

              <!-- Payment Method Toggle (Cash / Online) -->
              <div class="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-300 select-none">
                <span class="text-[11px] font-bold text-slate-600 px-2 uppercase tracking-tight">Method:</span>
                <button type="button" 
                        id="sf-method-cash"
                        onclick="SalesForm.setPaymentMethod('Cash')" 
                        class="px-3 py-1.5 rounded-md text-xs ${(!this.paymentMethod || this.paymentMethod === 'Cash') ? 'font-black bg-slate-900 text-white shadow-sm' : 'font-bold bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200'} cursor-pointer">
                  Cash
                </button>
                <button type="button" 
                        id="sf-method-online"
                        onclick="SalesForm.setPaymentMethod('Online')" 
                        class="px-3 py-1.5 rounded-md text-xs ${this.paymentMethod === 'Online' ? 'font-black bg-slate-900 text-white shadow-sm' : 'font-bold bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200'} cursor-pointer">
                  Online
                </button>
              </div>
            </div>

            <div class="flex items-center gap-3">
              ${this.editingSaleId ? `
                <button type="button" onclick="app.navigate('proposals')" class="px-4 py-2.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer">
                  Cancel
                </button>
                <button type="button" 
                        id="sf-save-btn"
                        onclick="SalesForm.completeSale(false)" 
                        class="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-xs flex items-center gap-1.5 shadow cursor-pointer">
                  <i data-lucide="save" class="w-4 h-4 text-emerald-400"></i>
                  <span>SAVE</span>
                </button>
                <button type="button" 
                        id="sf-complete-btn"
                        onclick="SalesForm.completeSale(true)" 
                        class="px-6 py-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white font-black text-xs flex items-center gap-2 shadow-lg cursor-pointer">
                  <i data-lucide="printer" class="w-4 h-4 text-amber-400"></i>
                  <span>SAVE & PRINT (F9)</span>
                </button>
              ` : `
                <button type="button" 
                        id="sf-complete-btn"
                        onclick="SalesForm.completeSale(true)" 
                        class="px-6 py-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white font-black text-sm flex items-center gap-2 shadow-lg cursor-pointer transition-all">
                  <i data-lucide="printer" class="w-4 h-4 text-amber-400"></i>
                  <span>COMPLETE & PRINT (F9)</span>
                </button>
              `}
            </div>
          </div>

        </div>
      </div>
    `;

    this.renderCart();
    this.updateSummary();
    this.initClock();
    this.setupGlobalShortcuts();

    // Close dropdowns on outside click
    if (this._outsideClickHandler) {
      document.removeEventListener('click', this._outsideClickHandler);
    }
    this._outsideClickHandler = (e) => {
      const shopContainer = document.getElementById('sf-shop-container');
      const shopDropdown = document.getElementById('sf-shops-dropdown');
      if (shopDropdown && shopContainer && !shopContainer.contains(e.target)) {
        shopDropdown.classList.add('hidden');
      }

      const searchContainer = document.getElementById('sf-search-container');
      const searchDropdown = document.getElementById('sf-search-dropdown');
      if (searchDropdown && searchContainer && !searchContainer.contains(e.target)) {
        searchDropdown.classList.add('hidden');
      }
    };
    document.addEventListener('click', this._outsideClickHandler);

    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      const searchInput = document.getElementById('sf-fast-item-search');
      if (searchInput) {
        searchInput.focus();
      }
    }, 100);
  },

  initClock() {
    if (this.clockInterval) clearInterval(this.clockInterval);
    const update = () => {
      const el = document.getElementById('sf-live-clock');
      if (!el) {
        if (this.clockInterval) clearInterval(this.clockInterval);
        return;
      }
      const now = new Date();
      el.textContent = now.toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      }).toUpperCase() + ' • ' + now.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
      });
    };
    update();
    this.clockInterval = setInterval(update, 1000);
  },

  // --- Fast Custom Shop Search & Dropdown ---
  handleShopFocus() {
    if (this.shopName && document.getElementById('sf-shop-name')?.hasAttribute('readonly')) {
      return;
    }
    const val = document.getElementById('sf-shop-name')?.value || '';
    this.handleShopInput(val);
  },

  handleShopInput(val) {
    const q = (val || '').trim().toLowerCase();
    const dropdown = document.getElementById('sf-shops-dropdown');
    if (!dropdown) return;

    if (q.length === 0) {
      this.filteredShops = (this.shops || []).slice(0, 15);
    } else {
      const isNumeric = /^[0-9]+$/.test(q);
      const matches = (this.shops || []).filter(s => {
        const name = (s.name || '').toLowerCase();
        const words = name.split(/[\s\-_\/]+/);
        if (name.startsWith(q) || words.some(w => w.startsWith(q))) return true;
        if (isNumeric && (s.phone || '').includes(q)) return true;
        if (q.length >= 3 && (name.includes(q) || (s.address || '').toLowerCase().includes(q))) return true;
        return false;
      });

      matches.sort((a, b) => {
        const an = (a.name || '').toLowerCase();
        const bn = (b.name || '').toLowerCase();
        const aStarts = an.startsWith(q);
        const bStarts = bn.startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        const aWordStarts = an.split(/[\s\-_\/]+/).some(w => w.startsWith(q));
        const bWordStarts = bn.split(/[\s\-_\/]+/).some(w => w.startsWith(q));
        if (aWordStarts && !bWordStarts) return -1;
        if (!aWordStarts && bWordStarts) return 1;

        return an.localeCompare(bn);
      });

      this.filteredShops = matches.slice(0, 15);
    }

    this.highlightedShopIndex = 0;
    this.renderShopsDropdown();
  },

  renderShopsDropdown() {
    const dropdown = document.getElementById('sf-shops-dropdown');
    if (!dropdown) return;

    if (this.filteredShops.length === 0) {
      const val = document.getElementById('sf-shop-name')?.value || '';
      dropdown.innerHTML = `
        <div class="p-3.5 text-center text-slate-400">
          <p class="font-bold text-xs text-slate-600">No matching shops found</p>
          <p class="text-[10.5px] text-slate-400 mt-0.5">${val ? `Press Enter to use "<b>${val}</b>"` : 'Type name to select custom shop'}</p>
        </div>
      `;
      dropdown.classList.remove('hidden');
      return;
    }

    dropdown.innerHTML = this.filteredShops.map((shop, idx) => {
      const isHighlighted = idx === this.highlightedShopIndex;

      return `
        <div id="sf-shop-item-${idx}" 
             onmousedown="SalesForm.selectShopByIndex(${idx})"
             class="px-3 py-1.5 flex items-center justify-between gap-2 cursor-pointer transition-colors ${isHighlighted ? 'bg-amber-500 text-slate-950 font-bold' : 'hover:bg-slate-50 text-slate-800'}">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span class="w-4 h-4 rounded ${isHighlighted ? 'bg-slate-950 text-amber-400' : 'bg-slate-100 text-slate-500'} flex items-center justify-center text-[9px] font-black shrink-0 font-mono">${idx + 1}</span>
            <span class="text-xs font-black truncate ${isHighlighted ? 'text-slate-950' : 'text-slate-900'}">${shop.name}</span>
          </div>
          <div class="flex items-center gap-2 shrink-0 text-right">
            ${shop.phone ? `<span class="text-[10px] font-bold ${isHighlighted ? 'text-slate-950' : 'text-slate-600'}">${shop.phone}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');

    dropdown.classList.remove('hidden');

    const activeEl = document.getElementById(`sf-shop-item-${this.highlightedShopIndex}`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  },

  selectShopByIndex(idx) {
    const shop = this.filteredShops[idx];
    if (shop) {
      this.selectShop(shop);
    }
  },

  selectShop(shop) {
    this.shopName = shop.name;
    this.shopAddress = shop.address || shop.city || '';
    this.shopPhone = shop.phone || '';
    this.shopId = shop.id;
    this.shopNtn = shop.ntn || shop.cnic || shop.cnic_ntn || '';
    this.shopPreviousBalance = Number(shop.amount) || 0;

    const nameInput = document.getElementById('sf-shop-name');
    const addrInput = document.getElementById('sf-shop-address');
    const phoneInput = document.getElementById('sf-shop-phone');
    const clearBtn = document.getElementById('sf-shop-clear-btn');
    const dropdown = document.getElementById('sf-shops-dropdown');

    if (nameInput) {
      nameInput.value = shop.name;
      nameInput.setAttribute('readonly', 'true');
      nameInput.className = 'w-full bg-amber-50/50 font-black text-slate-950 border-b border-dashed border-slate-400 text-xs py-0.5 pr-6 outline-none focus:border-slate-950';
    }
    if (addrInput) {
      addrInput.value = this.shopAddress;
      addrInput.className = 'flex-1 bg-transparent border-b border-dashed border-slate-400 text-slate-800 font-semibold text-xs py-0.5 outline-none focus:border-slate-950';
    }
    if (phoneInput) {
      phoneInput.value = this.shopPhone;
      phoneInput.className = 'flex-1 bg-transparent border-b border-dashed border-slate-400 text-slate-800 font-semibold text-xs py-0.5 outline-none focus:border-slate-950';
    }
    const cnicInput = document.getElementById('sf-cnic-ntn');
    if (cnicInput) {
      cnicInput.value = this.shopNtn;
    }
    if (clearBtn) {
      clearBtn.classList.remove('hidden');
    }
    if (dropdown) {
      dropdown.classList.add('hidden');
    }
    if (window.lucide) lucide.createIcons();

    this.renderCart();
    this.updateSummary();

    setTimeout(() => {
      const searchInput = document.getElementById('sf-fast-item-search');
      if (searchInput) searchInput.focus();
    }, 50);
  },

  handleShopKeyDown(e) {
    const dropdown = document.getElementById('sf-shops-dropdown');
    const isDropdownOpen = dropdown && !dropdown.classList.contains('hidden');

    if (e.key === 'Delete') {
      e.preventDefault();
      this.clearSelectedShop();
      return;
    }

    if (e.key === 'Backspace' && this.shopName && document.getElementById('sf-shop-name')?.hasAttribute('readonly')) {
      e.preventDefault();
      this.clearSelectedShop();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isDropdownOpen) {
        this.handleShopFocus();
        return;
      }
      if (this.highlightedShopIndex < this.filteredShops.length - 1) {
        this.highlightedShopIndex++;
        this.renderShopsDropdown();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (this.highlightedShopIndex > 0) {
        this.highlightedShopIndex--;
        this.renderShopsDropdown();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isDropdownOpen && this.filteredShops[this.highlightedShopIndex]) {
        this.selectShop(this.filteredShops[this.highlightedShopIndex]);
      } else {
        const val = (e.target.value || '').trim();
        if (val) {
          const match = this.shops.find(s => s.name.toLowerCase() === val.toLowerCase());
          if (match) {
            this.selectShop(match);
          } else {
            this.shopName = val;
            this.shopId = null;
            this.shopPreviousBalance = 0;
            this.renderCart();
            this.updateSummary();
            if (dropdown) dropdown.classList.add('hidden');
            const searchInput = document.getElementById('sf-fast-item-search');
            if (searchInput) searchInput.focus();
          }
        }
      }
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      if (dropdown) dropdown.classList.add('hidden');
    }
  },

  clearSelectedShop() {
    this.shopName = '';
    this.shopAddress = '';
    this.shopPhone = '';
    this.shopNtn = '';
    this.shopId = null;
    this.shopPreviousBalance = 0;

    const nameInput = document.getElementById('sf-shop-name');
    const addrInput = document.getElementById('sf-shop-address');
    const phoneInput = document.getElementById('sf-shop-phone');
    const clearBtn = document.getElementById('sf-shop-clear-btn');
    const dropdown = document.getElementById('sf-shops-dropdown');

    if (nameInput) {
      nameInput.value = '';
      nameInput.removeAttribute('readonly');
      nameInput.className = 'w-full bg-transparent font-bold text-slate-800 border-b border-dashed border-slate-400 text-xs py-0.5 pr-6 outline-none focus:border-slate-950';
      nameInput.focus();
    }
    if (addrInput) {
      addrInput.value = '';
      addrInput.className = 'flex-1 bg-transparent border-b border-dashed border-slate-400 text-slate-800 font-semibold text-xs py-0.5 outline-none focus:border-slate-950';
    }
    if (phoneInput) {
      phoneInput.value = '';
      phoneInput.className = 'flex-1 bg-transparent border-b border-dashed border-slate-400 text-slate-800 font-semibold text-xs py-0.5 outline-none focus:border-slate-950';
    }
    const cnicInput = document.getElementById('sf-cnic-ntn');
    if (cnicInput) {
      cnicInput.value = '';
    }
    if (clearBtn) {
      clearBtn.classList.add('hidden');
    }
    if (dropdown) {
      dropdown.classList.add('hidden');
    }
    if (window.lucide) lucide.createIcons();
    this.renderCart();
    this.updateSummary();
    this.handleShopFocus();
  },

  onSalesmanChange(name) {
    this.sellerName = name || '';
    const s = this.sellers.find(x => x.name === name);
    this.salesmanContact = s ? (s.phone || '') : '';
    const badge = document.getElementById('sf-salesman-contact-badge');
    if (badge) badge.textContent = this.salesmanContact;
  },

  setDeliveryDay(day) {
    this.deliveryDay = day || this.getNextDayOfWeek(new Date());
  },

  setSeller(name) {
    this.onSalesmanChange(name);
  },

  setPaymentMethod(method) {
    this.paymentMethod = method;
  },

  getItemAvailableStock(item) {
    if (!item) return 0;
    const itemId = item.id !== undefined ? item.id : item.item_id;
    const itemSlug = item.slug || item.section;
    const prod = (this.availableItems || []).find(p => p.id === itemId && p.slug === itemSlug);
    let stock = prod ? (prod.current_stock || 0) : (item.current_stock || 0);
    if (this.editingSaleId && this.originalItemsMap) {
      const origQty = this.originalItemsMap[`${itemSlug}-${itemId}`] || 0;
      stock += origQty;
    }
    return Math.max(0, stock);
  },

  // --- Instant Keyboard-Driven Item Search & Dropdown ---
  handleSearchInput(value) {
    const q = (value || '').trim().toLowerCase();
    const dropdown = document.getElementById('sf-search-dropdown');
    const clearBtn = document.getElementById('sf-search-clear-btn');
    
    if (clearBtn) {
      if ((value || '').length > 0) {
        clearBtn.classList.remove('hidden');
      } else {
        clearBtn.classList.add('hidden');
      }
    }

    if (!dropdown) return;

    if (q.length === 0) {
      this.searchResults = [];
      this.highlightedSearchIndex = 0;
      dropdown.innerHTML = '';
      dropdown.classList.add('hidden');
      return;
    }

    // Match by item name (prefix or word-start prioritized)
    const matches = (this.availableItems || []).filter(i => {
      const name = (i.item_name || '').toLowerCase();
      const words = name.split(/[\s\-_\/]+/);
      if (name.startsWith(q) || words.some(w => w.startsWith(q))) return true;
      if (q.length >= 3 && name.includes(q)) return true;
      return false;
    });

    matches.sort((a, b) => {
      const aName = (a.item_name || '').toLowerCase();
      const bName = (b.item_name || '').toLowerCase();

      const aStarts = aName.startsWith(q);
      const bStarts = bName.startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      const aWordStarts = aName.split(/[\s\-_\/]+/).some(w => w.startsWith(q));
      const bWordStarts = bName.split(/[\s\-_\/]+/).some(w => w.startsWith(q));
      if (aWordStarts && !bWordStarts) return -1;
      if (!aWordStarts && bWordStarts) return 1;

      return aName.localeCompare(bName);
    });

    this.searchResults = matches.slice(0, 15);

    // Default highlight to the first item that is not already in the cart
    const firstAvail = this.searchResults.findIndex(i => !this.cart.some(c => c.id === i.id && c.slug === i.slug));
    this.highlightedSearchIndex = firstAvail !== -1 ? firstAvail : 0;
    this.renderSearchDropdown();
  },

  clearSearchInput() {
    const searchInput = document.getElementById('sf-fast-item-search');
    const clearBtn = document.getElementById('sf-search-clear-btn');
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
    if (clearBtn) {
      clearBtn.classList.add('hidden');
    }
    this.searchResults = [];
    this.highlightedSearchIndex = 0;
    const dropdown = document.getElementById('sf-search-dropdown');
    if (dropdown) {
      dropdown.innerHTML = '';
      dropdown.classList.add('hidden');
    }
  },

  renderSearchDropdown() {
    const dropdown = document.getElementById('sf-search-dropdown');
    if (!dropdown) return;

    if (this.searchResults.length === 0) {
      dropdown.innerHTML = `
        <div class="p-3.5 text-center text-slate-400">
          <p class="font-bold text-xs text-slate-600">No matching products found</p>
          <p class="text-[10.5px] text-slate-400 mt-0.5">Check spelling or add item in Stock tab.</p>
        </div>
      `;
      dropdown.classList.remove('hidden');
      return;
    }

    dropdown.innerHTML = this.searchResults.map((item, idx) => {
      const isAlreadyInCart = this.cart.some(c => c.id === item.id && c.slug === item.slug);
      const isHighlighted = idx === this.highlightedSearchIndex && !isAlreadyInCart;
      const stock = this.getItemAvailableStock(item);
      const price = item.retail_price || 0;
      const categoryTitle = this.getCategoryName(item);

      if (isAlreadyInCart) {
        return `
          <div id="sf-search-item-${idx}" 
               class="px-3 py-1.5 flex items-center justify-between gap-2 bg-slate-50/70 text-slate-400 cursor-not-allowed select-none opacity-60">
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <span class="w-4 h-4 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center text-[9px] font-black shrink-0 font-mono">✓</span>
              <span class="text-xs font-bold text-slate-500 truncate line-through">${item.item_name}</span>
              ${categoryTitle ? `<span class="text-[9.5px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">${categoryTitle}</span>` : ''}
              ${item.company_name ? `<span class="text-[9.5px] text-slate-400 truncate shrink-0">• ${item.company_name}</span>` : ''}
            </div>
            <div class="flex items-center gap-2 shrink-0 text-right">
              <span class="px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase tracking-wider bg-slate-200/80 text-slate-600">In Bill</span>
              <span class="text-xs font-bold tabular-nums text-slate-400 min-w-[55px] text-right">${app.formatCurrency(price)}</span>
            </div>
          </div>
        `;
      }

      return `
        <div id="sf-search-item-${idx}" 
             onmousedown="SalesForm.selectSearchItem(${idx})"
             class="px-3 py-1.5 flex items-center justify-between gap-2 cursor-pointer transition-colors ${isHighlighted ? 'bg-amber-500 text-slate-950 font-bold' : 'hover:bg-slate-50 text-slate-800'}">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span class="w-4 h-4 rounded ${isHighlighted ? 'bg-slate-950 text-amber-400' : 'bg-slate-100 text-slate-500'} flex items-center justify-center text-[9px] font-black shrink-0 font-mono">${idx + 1}</span>
            <span class="text-xs font-black truncate ${isHighlighted ? 'text-slate-950' : 'text-slate-900'}">${item.item_name}</span>
            ${categoryTitle ? `<span class="text-[9.5px] font-bold ${isHighlighted ? 'bg-slate-950/10 text-slate-950' : 'bg-slate-100 text-slate-600'} px-1.5 py-0.2 rounded shrink-0">${categoryTitle}</span>` : ''}
            ${item.company_name ? `<span class="text-[9.5px] ${isHighlighted ? 'text-slate-900 font-semibold' : 'text-slate-400'} truncate shrink-0">• ${item.company_name}</span>` : ''}
          </div>
          <div class="flex items-center gap-3 shrink-0 text-right">
            <span class="text-[10px] ${isHighlighted ? 'text-slate-950' : 'text-slate-500'} font-semibold">
              Stock: <b class="${stock > 0 ? (isHighlighted ? 'text-slate-950 font-black' : 'text-emerald-600 font-bold') : 'text-rose-500 font-bold'} tabular-nums">${stock} avail</b>
            </span>
            <span class="text-xs font-black tabular-nums ${isHighlighted ? 'text-slate-950' : 'text-slate-900'} min-w-[55px] text-right">
              ${app.formatCurrency(price)}
            </span>
          </div>
        </div>
      `;
    }).join('');

    dropdown.classList.remove('hidden');

    const activeEl = document.getElementById(`sf-search-item-${this.highlightedSearchIndex}`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  },

  handleSearchKeyDown(e) {
    const dropdown = document.getElementById('sf-search-dropdown');
    const isDropdownOpen = dropdown && !dropdown.classList.contains('hidden') && this.searchResults.length > 0;

    if (e.key === 'Delete') {
      const searchInput = document.getElementById('sf-fast-item-search');
      if (searchInput && searchInput.value) {
        e.preventDefault();
        this.clearSearchInput();
        return;
      }
    }

    if (e.key === 'Escape') {
      const searchInput = document.getElementById('sf-fast-item-search');
      if (searchInput && searchInput.value) {
        e.preventDefault();
        this.clearSearchInput();
        return;
      }
      if (dropdown) {
        dropdown.classList.add('hidden');
        return;
      }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (isDropdownOpen) {
        let nextIdx = this.highlightedSearchIndex + 1;
        while (nextIdx < this.searchResults.length) {
          const item = this.searchResults[nextIdx];
          const isAlready = this.cart.some(c => c.id === item.id && c.slug === item.slug);
          if (!isAlready) {
            this.highlightedSearchIndex = nextIdx;
            this.renderSearchDropdown();
            return;
          }
          nextIdx++;
        }
      } else if (this.cart.length > 0) {
        this.focusCartField(0, 'qty');
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isDropdownOpen) {
        let prevIdx = this.highlightedSearchIndex - 1;
        while (prevIdx >= 0) {
          const item = this.searchResults[prevIdx];
          const isAlready = this.cart.some(c => c.id === item.id && c.slug === item.slug);
          if (!isAlready) {
            this.highlightedSearchIndex = prevIdx;
            this.renderSearchDropdown();
            return;
          }
          prevIdx--;
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isDropdownOpen && this.searchResults[this.highlightedSearchIndex]) {
        const item = this.searchResults[this.highlightedSearchIndex];
        const isAlready = this.cart.some(c => c.id === item.id && c.slug === item.slug);
        if (!isAlready) {
          this.selectSearchItem(this.highlightedSearchIndex);
        }
      } else if (this.cart.length > 0) {
        this.focusCartField(0, 'qty');
      }
    }
  },

  selectSearchItem(index) {
    const item = this.searchResults[index];
    if (!item) return;

    const isAlreadyInCart = this.cart.some(c => c.id === item.id && c.slug === item.slug);
    if (isAlreadyInCart) return;

    this.addToCart(item);

    const searchInput = document.getElementById('sf-fast-item-search');
    const clearBtn = document.getElementById('sf-search-clear-btn');
    const dropdown = document.getElementById('sf-search-dropdown');
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.classList.add('hidden');
    if (dropdown) dropdown.classList.add('hidden');
    this.searchResults = [];
    this.highlightedSearchIndex = 0;

    const cartIdx = this.cart.findIndex(i => i.id === item.id && i.slug === item.slug);
    if (cartIdx !== -1) {
      setTimeout(() => {
        this.focusCartField(cartIdx, 'qty');
      }, 50);
    }
  },

  addToCart(item) {
    const maxStock = this.getItemAvailableStock(item);
    if (maxStock <= 0) {
      app.showAlert({ title: 'Out of Stock', message: `<b>${item.item_name}</b> is currently out of stock.` });
      return;
    }

    const existing = this.cart.find(i => i.id === item.id && i.slug === item.slug);
    if (existing) {
      if (existing.qty < maxStock) {
        existing.qty++;
      }
    } else {
      const activePrice = item.retail_price || 0;
      const activeCost = item.cost_price || 0;

      this.cart.push({
        id: item.id,
        slug: item.slug,
        item_name: item.item_name,
        description: item.item_name + (item.description ? ' - ' + item.description : ''),
        retail_price: activePrice,
        original_retail_price: activePrice,
        cost_price: activeCost,
        qty: 1,
        unit: item.unit || 'pcs',
        discount: '',
        discountType: 'flat'
      });
    }
    this.renderCart();
    this.updateSummary();
  },

  removeFromCart(index) {
    this.cart.splice(index, 1);
    this.renderCart();
    this.updateSummary();
    const searchInput = document.getElementById('sf-fast-item-search');
    if (searchInput) searchInput.focus();
  },

  focusCartField(rowIdx, fieldName) {
    const input = document.getElementById(`cart-${fieldName}-input-${rowIdx}`);
    if (input) {
      input.focus();
      input.select();
    }
  },

  handleCartKeyDown(e, rowIdx, fieldName) {
    const numRows = this.cart.length;

    if (e.key === 'Delete' && e.shiftKey) {
      e.preventDefault();
      this.removeFromCart(rowIdx);
      return;
    }

    if (e.key === 'Delete') {
      if (fieldName === 'discount') {
        const input = document.getElementById(`cart-discount-input-${rowIdx}`);
        if (input && input.value !== '') {
          e.preventDefault();
          input.value = '';
          this.updateItemDiscount(rowIdx, '');
        }
      }
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (fieldName === 'qty') {
        this.focusCartField(rowIdx, 'price');
      } else if (fieldName === 'price') {
        this.focusCartField(rowIdx, 'discount');
      } else if (fieldName === 'discount') {
        const searchInput = document.getElementById('sf-fast-item-search');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (fieldName === 'discount') {
        this.focusCartField(rowIdx, 'price');
      } else if (fieldName === 'price') {
        this.focusCartField(rowIdx, 'qty');
      } else if (fieldName === 'qty') {
        if (rowIdx > 0) {
          this.focusCartField(rowIdx - 1, 'discount');
        } else {
          document.getElementById('sf-fast-item-search')?.focus();
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (rowIdx < numRows - 1) {
        this.focusCartField(rowIdx + 1, fieldName);
      } else {
        const searchInput = document.getElementById('sf-fast-item-search');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rowIdx > 0) {
        this.focusCartField(rowIdx - 1, fieldName);
      } else {
        const searchInput = document.getElementById('sf-fast-item-search');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const searchInput = document.getElementById('sf-fast-item-search');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
  },

  updateCartQty(index, qty, inputEl) {
    const item = this.cart[index];
    if (!item) return;
    const maxStock = this.getItemAvailableStock(item);

    if (qty === '' || qty === null || qty === undefined) {
      item.qty = 0;
      this.updateLineTotal(index);
      this.updateSummary();
      return;
    }

    let parsed = parseFloat(qty);
    if (isNaN(parsed)) parsed = 0;

    if (parsed > maxStock) {
      parsed = maxStock;
      if (inputEl) inputEl.value = maxStock;
    } else if (parsed < 0) {
      parsed = 0;
      if (inputEl) inputEl.value = 0;
    }

    item.qty = parsed;
    this.updateLineTotal(index);
    this.updateSummary();
  },

  onCartQtyBlur(index, inputEl) {
    const item = this.cart[index];
    if (!item) return;
    const maxStock = this.getItemAvailableStock(item);
    let parsed = parseFloat(inputEl.value);

    if (isNaN(parsed) || parsed <= 0) {
      parsed = maxStock > 0 ? 1 : 0;
      inputEl.value = parsed;
    } else if (parsed > maxStock) {
      parsed = maxStock;
      inputEl.value = maxStock;
    }

    item.qty = parsed;
    this.updateLineTotal(index);
    this.updateSummary();
  },

  updateCartPrice(index, price) {
    const item = this.cart[index];
    if (!item) return;
    item.retail_price = parseFloat(price) || 0;
    
    if (item.discountType === 'flat' && item.discount > item.retail_price) {
      item.discount = item.retail_price;
    }
    
    this.updateLineTotal(index);
    this.updateSummary();
  },

  resetCartPrice(index) {
    const item = this.cart[index];
    if (!item) return;
    item.retail_price = item.original_retail_price;
    item.discount = '';
    item.discountType = 'flat';
    this.renderCart();
    this.updateSummary();
  },

  toggleItemDiscountType(index, type) {
    if (!this.cart[index]) return;
    this.cart[index].discountType = type;
    this.renderCart();
    this.updateSummary();
  },

  updateItemDiscount(index, val) {
    const item = this.cart[index];
    if (!item) return;

    if (val === '' || val === null || val === undefined || parseFloat(val) === 0) {
      item.discount = '';
      const input = document.getElementById(`cart-discount-input-${index}`);
      if (input && input.value !== '') input.value = '';
      this.updateLineTotal(index);
      this.updateSummary();
      return;
    }

    let disc = parseFloat(val);
    if (isNaN(disc)) disc = 0;
    
    const maxVal = item.discountType === 'percent' ? 100 : item.retail_price;
    if (disc > maxVal) {
      disc = maxVal;
      const input = document.getElementById(`cart-discount-input-${index}`);
      if (input) input.value = disc;
      item.discount = disc;
    } else if (disc <= 0) {
      disc = 0;
      const input = document.getElementById(`cart-discount-input-${index}`);
      if (input) input.value = '';
      item.discount = '';
    } else {
      item.discount = val;
    }

    this.updateLineTotal(index);
    this.updateSummary();
  },

  updateLineTotal(index) {
    const item = this.cart[index];
    if (!item) return;
    const el = document.getElementById(`cart-line-total-${index}`);
    const gstEl = document.getElementById(`cart-line-gst-${index}`);
    if (el) {
      const qty = parseFloat(item.qty) || 0;
      const rate = parseFloat(item.retail_price) || 0;
      const grossVal = qty * rate;
      let discAmt = 0;
      const discNum = parseFloat(item.discount) || 0;
      if (item.discountType === 'percent') {
        discAmt = (grossVal * discNum) / 100;
      } else {
        discAmt = discNum * qty;
      }
      const taxable = Math.max(0, grossVal - discAmt);
      const gstVal = this.isTaxEnabled ? Math.round(taxable * (this.taxPercent / 100)) : 0;
      const netVal = taxable + gstVal;

      el.textContent = app.formatAmount(netVal);
      if (gstEl) {
        gstEl.textContent = app.formatAmount(gstVal);
      }
    }
  },

  setPaymentMethod(method) {
    this.paymentMethod = method;
    const btnCash = document.getElementById('sf-method-cash');
    const btnOnline = document.getElementById('sf-method-online');

    if (btnCash && btnOnline) {
      if (method === 'Cash') {
        btnCash.className = 'px-3 py-1.5 rounded-md text-xs font-black bg-slate-900 text-white shadow-sm cursor-pointer';
        btnOnline.className = 'px-3 py-1.5 rounded-md text-xs font-bold bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200 cursor-pointer';
      } else {
        btnOnline.className = 'px-3 py-1.5 rounded-md text-xs font-black bg-slate-900 text-white shadow-sm cursor-pointer';
        btnCash.className = 'px-3 py-1.5 rounded-md text-xs font-bold bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200 cursor-pointer';
      }
    }

    const remarksInput = document.getElementById('sf-payment-remarks');
    if (remarksInput) {
      const val = remarksInput.value.trim();
      if (!val || val === 'Paid via Cash' || val === 'Paid via Online') {
        remarksInput.value = `Paid via ${method}`;
      }
    }
  },

  resetForm() {
    this.cart = [];
    this.shopName = '';
    this.shopAddress = '';
    this.shopPhone = '';
    this.shopId = null;
    this.shopPreviousBalance = 0;
    this.receivedAmount = null;
    this.isReceivedCustom = false;
    this.sellerName = '';
    this.salesmanContact = '';
    this.additionalDiscount = 0;
    this.paymentMethod = 'Cash';
    this.remarks = 'Paid via Cash';
    app.navigate('proposal-form');
  },

  renderCart() {
    const tbody = document.getElementById('sf-cart-tbody');
    const tfoot = document.getElementById('sf-cart-tfoot');
    const emptyState = document.getElementById('sf-cart-empty-state');

    if (!tbody) return;

    const prevBal = Number(this.shopPreviousBalance) || 0;
    const hasPrevBalEntry = Boolean(this.includePrevBalance && prevBal > 0);

    if (this.cart.length === 0 && !hasPrevBalEntry) {
      tbody.innerHTML = '';
      if (tfoot) tfoot.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    let totalQty = 0;
    let totalGross = 0;
    let totalItemDisc = 0;
    let totalGst = 0;
    let totalNet = 0;

    const itemsHtml = this.cart.map((item, idx) => {
      const maxStock = this.getItemAvailableStock(item);
      const qty = parseFloat(item.qty) || 0;
      const rate = parseFloat(item.retail_price) || 0;
      const grossVal = qty * rate;
      const discNum = parseFloat(item.discount) || 0;
      const discAmt = item.discountType === 'percent' 
        ? (grossVal * discNum / 100) 
        : (discNum * qty);
      const taxableVal = Math.max(0, grossVal - discAmt);
      const gstPercent = this.isTaxEnabled ? (parseFloat(this.taxPercent) || 0) : 0;
      const gstVal = this.isTaxEnabled ? Math.round(taxableVal * (gstPercent / 100)) : 0;
      const netVal = taxableVal + gstVal;

      totalQty += qty;
      totalGross += grossVal;
      totalItemDisc += discAmt;
      totalGst += gstVal;
      totalNet += netVal;

      return `
        <tr class="hover:bg-amber-50/40 transition-colors group">
          <!-- Sr. # -->
          <td class="py-1.5 px-2 text-center text-xs font-bold text-slate-500 tabular-nums border-r border-slate-950">
            ${idx + 1}
          </td>

          <!-- Product Description -->
          <td class="py-1.5 px-3 border-r border-slate-950">
            <div class="flex items-center justify-between gap-2">
              <span class="font-black text-slate-900 text-xs uppercase leading-tight">${item.item_name}</span>
              <span class="text-[9.5px] font-bold ${maxStock > 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-600 bg-rose-50'} px-1.5 py-0.2 rounded border border-slate-200 tabular-nums shrink-0">${maxStock} in stock</span>
            </div>
          </td>

          <!-- Qty Input -->
          <td class="py-1 px-2 text-center border-r border-slate-950">
            <input type="number" 
                   id="cart-qty-input-${idx}"
                   value="${item.qty}"
                   min="1"
                   max="${maxStock}"
                   step="1"
                   onkeydown="SalesForm.handleCartKeyDown(event, ${idx}, 'qty')"
                   oninput="SalesForm.updateCartQty(${idx}, this.value, this)"
                   onblur="SalesForm.onCartQtyBlur(${idx}, this)"
                   class="w-full px-1.5 py-1 bg-amber-50/60 focus:bg-white border border-slate-300 focus:border-slate-950 rounded text-center font-black text-slate-900 text-xs outline-none tabular-nums">
          </td>

          <!-- Rate (Rs.) Input -->
          <td class="py-1 px-2 text-right border-r border-slate-950">
            <input type="number" 
                   id="cart-price-input-${idx}"
                   value="${item.retail_price}"
                   min="0"
                   step="1"
                   onkeydown="SalesForm.handleCartKeyDown(event, ${idx}, 'price')"
                   oninput="SalesForm.updateCartPrice(${idx}, this.value)"
                   class="w-full px-1.5 py-1 bg-transparent focus:bg-white border border-transparent focus:border-slate-950 rounded text-right font-black text-slate-900 text-xs outline-none tabular-nums">
          </td>

          <!-- Gross Value -->
          <td class="py-1.5 px-2 text-right font-bold text-slate-800 text-xs border-r border-slate-950 tabular-nums">
            ${app.formatAmount(grossVal)}
          </td>

          <!-- Discount Input -->
          <td class="py-1 px-2 border-r border-slate-950">
            <div class="flex items-center gap-1 justify-end">
              <input type="number" 
                     id="cart-discount-input-${idx}"
                     value="${item.discount !== undefined && item.discount !== null && item.discount !== '' && parseFloat(item.discount) > 0 ? item.discount : ''}"
                     placeholder="0"
                     min="0"
                     step="1"
                     onkeydown="SalesForm.handleCartKeyDown(event, ${idx}, 'discount')"
                     oninput="SalesForm.updateItemDiscount(${idx}, this.value)"
                     class="w-16 px-1.5 py-1 bg-transparent focus:bg-white border border-slate-300 focus:border-slate-950 rounded text-right font-black text-slate-900 text-xs outline-none tabular-nums">
            </div>
          </td>

          <!-- GST (18%) -->
          <td class="py-1.5 px-2 text-right font-bold text-blue-900 text-xs border-r border-slate-950 tabular-nums">
            <span id="cart-line-gst-${idx}">${app.formatAmount(gstVal)}</span>
          </td>

          <!-- Net Value -->
          <td class="py-1.5 px-3 text-right font-black text-slate-950 text-xs border-r border-slate-950 tabular-nums">
            <span id="cart-line-total-${idx}">${app.formatAmount(netVal)}</span>
          </td>

          <!-- Actions -->
          <td class="py-1 px-1 text-center">
            <div class="flex items-center justify-center gap-1">
              <button type="button" onclick="SalesForm.removeFromCart(${idx})" class="text-slate-400 hover:text-rose-600 text-xs font-bold p-1 cursor-pointer transition-colors" title="Remove Item">
                ✕
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    let balanceRowHtml = '';
    if (hasPrevBalEntry) {
      totalGross += prevBal;
      totalNet += prevBal;
      const rowIdx = this.cart.length + 1;
      balanceRowHtml = `
        <tr class="bg-amber-50/25 hover:bg-amber-50/50 transition-colors">
          <!-- Sr. # -->
          <td class="py-1.5 px-2 text-center text-xs font-bold text-slate-500 tabular-nums border-r border-slate-950">
            ${rowIdx}
          </td>

          <!-- Product Description -->
          <td class="py-1.5 px-3 border-r border-slate-950">
            <div class="flex items-center justify-between gap-2">
              <span class="font-black text-amber-950 text-xs uppercase leading-tight tracking-tight">BALANCE AMOUNT</span>
              <span class="text-[9.5px] font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.2 rounded border border-amber-300 tabular-nums shrink-0">Previous Balance</span>
            </div>
          </td>

          <!-- Qty Input -->
          <td class="py-1 px-2 text-center text-slate-400 font-bold border-r border-slate-950 text-xs">
            -
          </td>

          <!-- Rate (Rs.) Input -->
          <td class="py-1 px-2 text-right text-slate-400 font-bold border-r border-slate-950 text-xs">
            -
          </td>

          <!-- Gross Value -->
          <td class="py-1.5 px-2 text-right font-black text-slate-900 text-xs border-r border-slate-950 tabular-nums">
            ${app.formatAmount(prevBal)}
          </td>

          <!-- Discount -->
          <td class="py-1.5 px-2 text-right text-slate-400 font-bold text-xs border-r border-slate-950 tabular-nums">
            -
          </td>

          <!-- GST -->
          <td class="py-1.5 px-2 text-right font-bold text-slate-400 text-xs border-r border-slate-950 tabular-nums">
            0
          </td>

          <!-- Net Value -->
          <td class="py-1.5 px-3 text-right font-black text-slate-950 text-xs border-r border-slate-950 tabular-nums">
            ${app.formatAmount(prevBal)}
          </td>

          <!-- Actions -->
          <td class="py-1 px-1 text-center">
            <div class="flex items-center justify-center gap-1">
              <button type="button" onclick="SalesForm.togglePrevBalanceEnable(false)" class="text-slate-400 hover:text-rose-600 text-xs font-bold p-1 cursor-pointer transition-colors" title="Exclude Previous Balance from bill">
                ✕
              </button>
            </div>
          </td>
        </tr>
      `;
    }

    tbody.innerHTML = itemsHtml + balanceRowHtml;

    if (tfoot) {
      tfoot.innerHTML = `
        <tr class="border-t-2 border-slate-950 bg-slate-100 text-xs">
          <td colspan="2" class="py-1.5 px-3 text-left border-r border-slate-950 font-bold">
            Items: ${this.cart.length}
          </td>
          <td class="py-1.5 px-2 text-center border-r border-slate-950 font-black">
            ${totalQty}
          </td>
          <td class="py-1.5 px-2 border-r border-slate-950"></td>
          <td class="py-1.5 px-2 text-right border-r border-slate-950 font-black">
            ${app.formatAmount(totalGross)}
          </td>
          <td class="py-1.5 px-2 text-right border-r border-slate-950 font-black text-rose-600">
            ${totalItemDisc > 0 ? app.formatAmount(totalItemDisc) : '0'}
          </td>
          <td class="py-1.5 px-2 text-right border-r border-slate-950 font-black text-blue-900">
            ${totalGst > 0 ? app.formatAmount(totalGst) : '0'}
          </td>
          <td class="py-1.5 px-3 text-right border-r border-slate-950 font-black text-slate-950">
            ${app.formatAmount(totalNet)}
          </td>
          <td class="py-1.5 px-1"></td>
        </tr>
      `;
    }

    if (window.lucide) lucide.createIcons();
  },

  toggleDiscountType(type) {
    this.discountType = type;
    const btnFlat = document.getElementById('btn-disc-flat');
    const btnPct = document.getElementById('btn-disc-pct');
    if (type === 'percent') {
      btnPct?.classList.add('bg-slate-950', 'text-white');
      btnPct?.classList.remove('text-slate-600');
      btnFlat?.classList.remove('bg-slate-950', 'text-white');
      btnFlat?.classList.add('text-slate-600');
    } else {
      btnFlat?.classList.add('bg-slate-950', 'text-white');
      btnFlat?.classList.remove('text-slate-600');
      btnPct?.classList.remove('bg-slate-950', 'text-white');
      btnPct?.classList.add('text-slate-600');
    }
    this.updateSummary();
  },

  toggleTaxEnable(enabled) {
    this.isTaxEnabled = Boolean(enabled);
    if (window.storage) {
      window.storage.set('tax_enabled', this.isTaxEnabled);
    }
    this.renderCart();
    this.updateSummary();
  },

  onTaxPercentInput(val) {
    const num = parseFloat(val);
    this.taxPercent = isNaN(num) ? 0 : Math.max(0, num);
    if (window.storage) {
      window.storage.set('tax_percent', this.taxPercent);
    }
    this.renderCart();
    this.updateSummary();
  },

  toggleWhtEnable(enabled) {
    this.isWhtEnabled = Boolean(enabled);
    if (window.storage) {
      window.storage.set('wht_enabled', this.isWhtEnabled);
    }
    this.updateSummary();
  },

  onWhtPercentInput(val) {
    const num = parseFloat(val);
    this.whtPercent = isNaN(num) ? 0 : Math.max(0, num);
    if (window.storage) {
      window.storage.set('wht_percent', this.whtPercent);
    }
    this.updateSummary();
  },

  togglePrevBalanceEnable(enabled) {
    this.includePrevBalance = Boolean(enabled);
    if (window.storage) {
      window.storage.set('include_prev_balance', this.includePrevBalance);
    }
    this.renderCart();
    this.updateSummary();
  },

  updateSummary() {
    let totalGross = 0;
    let totalItemDisc = 0;
    let totalGst = 0;

    const currentTaxPct = this.isTaxEnabled ? (parseFloat(this.taxPercent) || 0) : 0;
    const currentWhtPct = this.isWhtEnabled ? (parseFloat(this.whtPercent) || 0) : 0;

    this.cart.forEach(item => {
      const qty = parseFloat(item.qty) || 0;
      const rate = parseFloat(item.retail_price) || 0;
      const grossVal = qty * rate;
      totalGross += grossVal;

      let discAmt = 0;
      const discNum = parseFloat(item.discount) || 0;
      if (item.discountType === 'percent') {
        discAmt = (grossVal * discNum) / 100;
      } else {
        discAmt = discNum * qty;
      }
      totalItemDisc += discAmt;

      const taxableVal = Math.max(0, grossVal - discAmt);
      const gstVal = this.isTaxEnabled ? Math.round(taxableVal * (currentTaxPct / 100)) : 0;
      totalGst += gstVal;
    });

    let additionalDisc = 0;
    const addDiscInput = document.getElementById('sf-additional-discount');
    if (addDiscInput) {
      const val = parseFloat(addDiscInput.value) || 0;
      if (val > 0) {
        additionalDisc = val;
      }
    }

    const subtotalValue = Math.max(0, totalGross - totalItemDisc - additionalDisc);
    const totalWht = this.isWhtEnabled ? Math.round(subtotalValue * (currentWhtPct / 100)) : 0;

    const prevBal = Number(this.shopPreviousBalance) || 0;
    const effectivePrevBal = (this.includePrevBalance && prevBal > 0) ? prevBal : 0;

    const goodsNet = Math.max(0, subtotalValue + totalGst + totalWht);
    const netInvAmount = goodsNet + effectivePrevBal;
    
    // Received Amount Calculation
    const receivedInput = document.getElementById('sf-received-amount');
    let receivedAmount = netInvAmount;
    if (this.isReceivedCustom) {
      if (receivedInput && receivedInput.value !== '') {
        receivedAmount = Math.max(0, parseFloat(receivedInput.value) || 0);
      } else if (this.receivedAmount !== null && this.receivedAmount !== undefined) {
        receivedAmount = this.receivedAmount;
      } else {
        receivedAmount = 0;
      }
    } else {
      receivedAmount = netInvAmount;
      if (receivedInput && document.activeElement !== receivedInput) {
        receivedInput.value = netInvAmount > 0 ? netInvAmount : '';
      }
    }

    this.receivedAmount = receivedAmount;
    const pendingAmount = Math.max(0, netInvAmount - receivedAmount);
    const netBalance = Math.max(0, (this.includePrevBalance ? netInvAmount : (prevBal + netInvAmount)) - receivedAmount);

    const prevBalToggle = document.getElementById('sf-prev-bal-toggle');
    if (prevBalToggle && prevBalToggle.checked !== this.includePrevBalance) {
      prevBalToggle.checked = this.includePrevBalance;
    }

    const whtToggle = document.getElementById('sf-wht-toggle');
    if (whtToggle && whtToggle.checked !== this.isWhtEnabled) {
      whtToggle.checked = this.isWhtEnabled;
    }

    const whtAmountEl = document.getElementById('sf-wht-amount-text');
    if (whtAmountEl) {
      whtAmountEl.textContent = app.formatCurrency(totalWht);
      if (totalWht > 0 && this.isWhtEnabled) {
        whtAmountEl.className = 'text-[11px] font-black text-amber-900 tabular-nums ml-0.5';
      } else {
        whtAmountEl.className = 'text-[11px] font-bold text-slate-400 tabular-nums ml-0.5';
      }
    }

    const prevBalEl = document.getElementById('sf-prev-balance-text');
    if (prevBalEl) {
      if (this.includePrevBalance) {
        prevBalEl.textContent = prevBal !== 0 ? app.formatCurrency(prevBal) : '0';
        prevBalEl.className = 'font-black text-slate-900 tabular-nums';
      } else {
        if (prevBal > 0) {
          prevBalEl.innerHTML = `<span class="line-through text-slate-400 font-bold">${app.formatCurrency(prevBal)}</span> <span class="text-[9.5px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">Excluded</span>`;
          prevBalEl.className = 'tabular-nums';
        } else {
          prevBalEl.textContent = '0';
          prevBalEl.className = 'font-black text-slate-900 tabular-nums';
        }
      }
    }

    const subtotalEl = document.getElementById('sf-subtotal');
    if (subtotalEl) subtotalEl.textContent = app.formatCurrency(totalGross + effectivePrevBal);

    const grandTotalEl = document.getElementById('sf-grand-total');
    if (grandTotalEl) grandTotalEl.textContent = app.formatCurrency(netInvAmount);

    const pendingEl = document.getElementById('sf-pending-amount');
    if (pendingEl) {
      pendingEl.textContent = app.formatCurrency(pendingAmount);
      if (pendingAmount > 0) {
        pendingEl.className = 'font-black text-xs text-rose-600 tabular-nums';
      } else {
        pendingEl.className = 'font-bold text-xs text-slate-500 tabular-nums';
      }
    }

    const netBalanceEl = document.getElementById('sf-net-balance-text');
    if (netBalanceEl) {
      netBalanceEl.textContent = app.formatCurrency(netBalance);
      if (netBalance > 0) {
        netBalanceEl.className = 'font-black text-xs text-rose-600 tabular-nums';
      } else {
        netBalanceEl.className = 'font-black text-xs text-slate-900 tabular-nums';
      }
    }
  },

  onReceivedAmountInput(val) {
    this.isReceivedCustom = true;
    const num = parseFloat(val);
    this.receivedAmount = isNaN(num) ? 0 : Math.max(0, num);
    this.updateSummary();
  },

  setupGlobalShortcuts() {
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
    }
    this._keyHandler = (e) => {
      if (app.currentPage !== 'proposal-form') return;

      if (e.key === 'F9' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        this.completeSale();
      } else if (e.key === 'F1') {
        e.preventDefault();
        const shopInput = document.getElementById('sf-shop-name');
        if (shopInput) {
          if (shopInput.hasAttribute('readonly')) {
            this.clearSelectedShop();
          } else {
            shopInput.focus();
            shopInput.select();
            this.handleShopFocus();
          }
        }
      } else if (e.key === 'F2') {
        e.preventDefault();
        const searchInput = document.getElementById('sf-fast-item-search');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    };
    window.addEventListener('keydown', this._keyHandler);
  },

  async completeSale(andPrint = true) {
    if (this.cart.length === 0) {
      app.showAlert({ title: 'Invoice Empty', message: 'Please add at least one item to complete the invoice.' });
      return;
    }

    for (const item of this.cart) {
      const itemQty = parseFloat(item.qty);
      if (isNaN(itemQty) || itemQty <= 0) {
        return app.showAlert({ title: 'Invalid Quantity', message: `Please enter a valid quantity for <b>${item.item_name}</b>.` });
      }
      const maxStock = this.getItemAvailableStock(item);
      if (itemQty > maxStock) {
        item.qty = maxStock;
      }
    }
    
    const shopNameInput = document.getElementById('sf-shop-name')?.value || this.shopName;
    const shopAddressInput = document.getElementById('sf-shop-address')?.value || this.shopAddress;
    const currentSaleNo = document.getElementById('sf-sale-number')?.value || this.saleNumber;
    const deliveryDayInput = document.getElementById('sf-delivery-day')?.value || this.deliveryDay;
    
    let finalShopName = (shopNameInput || '').trim();
    if (!finalShopName) {
      finalShopName = 'PARKING CANTEEN';
    }

    let totalGross = 0;
    let totalDiscount = 0;
    let totalCost = 0;
    let totalGst = 0;

    const items = this.cart.map(i => {
      const qty = parseFloat(i.qty) || 0;
      const rate = parseFloat(i.retail_price) || 0;
      const grossVal = qty * rate;
      totalGross += grossVal;

      let discAmt = 0;
      const discNum = parseFloat(i.discount) || 0;
      if (i.discountType === 'percent') {
        discAmt = (grossVal * discNum) / 100;
      } else {
        discAmt = discNum * qty;
      }
      totalDiscount += discAmt;
      totalCost += (qty * i.cost_price);

      const taxableVal = Math.max(0, grossVal - discAmt);
      const currentTaxPct = this.isTaxEnabled ? (parseFloat(this.taxPercent) || 0) : 0;
      const gstVal = this.isTaxEnabled ? Math.round(taxableVal * (currentTaxPct / 100)) : 0;
      totalGst += gstVal;
      const lineNet = taxableVal + gstVal;
      const unitDiscounted = taxableVal / (qty || 1);

      return {
        item_id: i.id,
        section: i.slug,
        description: i.description,
        qty: qty,
        unit: i.unit,
        unit_cost: i.cost_price,
        unit_retail: rate,
        unit_discounted: unitDiscounted,
        gst_percent: currentTaxPct,
        gst_amount: gstVal,
        line_cost: qty * i.cost_price,
        line_retail: lineNet,
        line_profit: lineNet - (qty * i.cost_price)
      };
    });

    let additionalDisc = 0;
    const addDiscInput = document.getElementById('sf-additional-discount');
    if (addDiscInput) {
      const val = parseFloat(addDiscInput.value) || 0;
      if (val > 0) {
        additionalDisc = val;
      }
    }

    totalDiscount += additionalDisc;
    const subtotalValue = Math.max(0, totalGross - totalDiscount);
    const currentWhtPct = this.isWhtEnabled ? (parseFloat(this.whtPercent) || 0) : 0;
    const totalWht = this.isWhtEnabled ? Math.round(subtotalValue * (currentWhtPct / 100)) : 0;

    const prevBal = Number(this.shopPreviousBalance) || 0;
    const effectivePrevBal = (this.includePrevBalance && prevBal > 0) ? prevBal : 0;
    const goodsNet = Math.max(0, subtotalValue + totalGst + totalWht);
    const grandTotal = goodsNet + effectivePrevBal;
    const totalProfit = goodsNet - totalCost;

    // Get received amount
    const receivedInput = document.getElementById('sf-received-amount');
    let finalReceived = grandTotal;
    if (this.isReceivedCustom) {
      if (receivedInput && receivedInput.value !== '') {
        finalReceived = Math.max(0, parseFloat(receivedInput.value) || 0);
      } else if (this.receivedAmount !== null && this.receivedAmount !== undefined) {
        finalReceived = this.receivedAmount;
      } else {
        finalReceived = 0;
      }
    } else {
      finalReceived = grandTotal;
    }

    const pending = Math.max(0, grandTotal - finalReceived);
    let saleStatus = 'Paid';
    if (finalReceived <= 0) {
      saleStatus = 'Pending';
    } else if (finalReceived < grandTotal) {
      saleStatus = 'Partial';
    } else {
      saleStatus = 'Paid';
    }

    const saleData = {
      proposal_number: currentSaleNo,
      customer_name: finalShopName,
      shop_name: finalShopName,
      shop_address: shopAddressInput || 'Wah Cantt',
      location: shopAddressInput || 'Wah Cantt',
      phone: this.shopPhone || '',
      cnic_ntn: (document.getElementById('sf-cnic-ntn')?.value || '').trim(),
      ntn: (document.getElementById('sf-cnic-ntn')?.value || '').trim(),
      shop_id: this.shopId,
      shop_previous_balance: prevBal,
      include_prev_balance: this.includePrevBalance ? 1 : 0,
      salesman_name: this.sellerName || 'IFRAHIM',
      salesman_contact: this.salesmanContact || '',
      seller_name: this.sellerName || 'IFRAHIM',
      date: new Date().toISOString(),
      subtotal: totalGross + effectivePrevBal,
      tax_percent: this.isTaxEnabled ? (parseFloat(this.taxPercent) || 0) : 0,
      tax_amount: totalGst,
      wht_percent: this.isWhtEnabled ? (parseFloat(this.whtPercent) || 0) : 0,
      wht_amount: totalWht,
      retail_total: grandTotal,
      cost_total: totalCost,
      profit: totalProfit,
      status: saleStatus,
      received_amount: finalReceived,
      pending_amount: pending,
      discount: totalDiscount,
      payment_method: this.paymentMethod || 'Cash',
      remarks: (document.getElementById('sf-payment-remarks')?.value || '').trim() || `Paid via ${this.paymentMethod || 'Cash'}`,
      sale_mode: 'retail',
      items: items
    };

    if (this.editingSaleId) {
      saleData.id = this.editingSaleId;
    }

    const doSaveSale = async (shouldPrint = false) => {
      app.showLoading();
      try {
        const id = await window.api.saveProposal(saleData);

        // Update Shop balance with pending amount
        const allShops = (await window.api.getShops()) || [];
        let registeredShop = allShops.find(s => 
          (this.shopId && s.id === this.shopId) || 
          s.name.toLowerCase() === finalShopName.toLowerCase()
        );

        let oldPending = 0;
        if (this.editingSaleId) {
          const oldSale = await window.api.getProposal(this.editingSaleId);
          if (oldSale) {
            oldPending = Math.max(0, (Number(oldSale.retail_total) || 0) - (Number(oldSale.received_amount) || 0));
          }
        }
        const deltaPending = pending - oldPending;

        if (registeredShop) {
          const currentShopAmount = Number(registeredShop.amount) || 0;
          let newShopAmount;
          if (this.includePrevBalance && prevBal > 0) {
            newShopAmount = Math.max(0, pending);
          } else {
            newShopAmount = Math.max(0, currentShopAmount + deltaPending);
          }
          await window.api.saveShop({
            ...registeredShop,
            amount: newShopAmount,
            phone: this.shopPhone || registeredShop.phone || '',
            address: shopAddressInput || registeredShop.address || '',
            ntn: (document.getElementById('sf-cnic-ntn')?.value || '').trim() || registeredShop.ntn || ''
          });
        } else {
          try {
            await window.api.saveShop({
              name: finalShopName,
              owner_name: '',
              phone: this.shopPhone || '',
              ntn: (document.getElementById('sf-cnic-ntn')?.value || '').trim(),
              address: shopAddressInput || 'Wah Cantt',
              city: 'Wah Cantt',
              amount: pending
            });
          } catch(e) {
            console.error("Failed to auto-register shop:", e);
          }
        }

        app.hideLoading();
        if (shouldPrint) {
          await this.generateReceipt(saleData);
          await app.printReceipt();
        }

        if (this.editingSaleId) {
          app.showAlert({ title: 'Invoice Saved', message: `Invoice <b>#${currentSaleNo}</b> updated successfully.` });
          app.navigate('proposals');
        } else {
          app.navigate('proposal-form');
        }
      } catch (e) {
        console.error(e);
        app.hideLoading();
        app.showAlert("Error saving invoice.");
      }
    };

    // If Save (no print) is triggered directly from the button when editing
    if (this.editingSaleId && andPrint === false) {
      await doSaveSale(false);
      return;
    }

    const receiptHtml = await this.generateReceipt(saleData);

    const summaryHtml = `
      <div class="mt-4 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-xs">
        <div class="flex justify-between items-center text-slate-500">
          <span>Shop Name</span>
          <span class="font-bold text-slate-800">${finalShopName}</span>
        </div>
        <div class="flex justify-between items-center text-slate-500">
          <span>Address</span>
          <span class="font-bold text-slate-800">${shopAddressInput || 'Wah Cantt'}</span>
        </div>
        <div class="flex justify-between items-center text-slate-500">
          <span>Salesman</span>
          <span class="font-bold text-slate-800">${this.sellerName} (${this.salesmanContact || '-'})</span>
        </div>
        <div class="flex justify-between items-center text-slate-500">
          <span>Total Items</span>
          <span class="font-bold text-slate-800">${items.length} item${items.length === 1 ? '' : 's'} (${items.reduce((s, i) => s + i.qty, 0)} qty)</span>
        </div>
        ${totalDiscount > 0 ? `
        <div class="flex justify-between items-center text-rose-500">
          <span>Total Discount</span>
          <span class="font-bold font-display">- ${app.formatCurrency(totalDiscount)}</span>
        </div>` : ''}
        ${this.isTaxEnabled ? `
        <div class="flex justify-between items-center text-blue-800">
          <span>GST (${parseFloat(this.taxPercent) || 0}%)</span>
          <span class="font-bold font-display">+ ${app.formatCurrency(totalGst)}</span>
        </div>` : ''}
        ${this.isWhtEnabled && totalWht > 0 ? `
        <div class="flex justify-between items-center text-amber-900">
          <span>WHT (${parseFloat(this.whtPercent) || 0}%)</span>
          <span class="font-bold font-display">+ ${app.formatCurrency(totalWht)}</span>
        </div>` : ''}
        ${effectivePrevBal > 0 ? `
        <div class="flex justify-between items-center text-amber-800 bg-amber-50/80 px-2 py-1 rounded border border-amber-200">
          <span class="font-bold">Balance Amount (Prev. Bal)</span>
          <span class="font-black font-display">+ ${app.formatCurrency(effectivePrevBal)}</span>
        </div>` : ''}
        <div class="flex justify-between items-center pt-2 border-t border-slate-200 text-sm">
          <span class="font-bold text-slate-700">Net Inv. Amount (Total)</span>
          <span class="font-black text-emerald-600 text-base">${app.formatCurrency(grandTotal)}</span>
        </div>
        <div class="flex justify-between items-center text-xs">
          <span class="font-bold text-slate-600">Received Amount</span>
          <span class="font-black text-slate-900">${app.formatCurrency(finalReceived)}</span>
        </div>
        ${!this.includePrevBalance && prevBal > 0 ? `
        <div class="flex justify-between items-center text-xs">
          <span class="font-bold text-slate-400">Previous Balance</span>
          <span class="font-semibold text-slate-400 line-through">${app.formatCurrency(prevBal)} (Excluded from bill)</span>
        </div>` : ''}
        ${pending > 0 ? `
        <div class="flex justify-between items-center text-xs text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200">
          <span class="font-bold">Pending (New Shop Balance)</span>
          <span class="font-black">${app.formatCurrency(pending)}</span>
        </div>` : ''}
      </div>
    `;

    app.showConfirm({
      title: this.editingSaleId ? 'Confirm Update' : 'Confirm Invoice',
      message: `<p class="text-sm text-slate-600 leading-relaxed">${this.editingSaleId ? 'Save changes for invoice' : 'Save and print invoice'} <b class="font-black text-slate-900">#${currentSaleNo}</b> for <b class="font-black text-slate-900">${finalShopName}</b>?</p>${summaryHtml}`,
      confirmText: this.editingSaleId ? 'Save & Print' : 'Complete & Print',
      confirmColor: 'green',
      altText: this.editingSaleId ? 'Save' : null,
      onAlt: this.editingSaleId ? (() => doSaveSale(false)) : null,
      previewHtml: receiptHtml,
      onConfirm: () => doSaveSale(true)
    });
  },

  // Exact matching bill design based on the physical paper invoice photo (A5 format)
  async generateReceipt(data) {
    const previewEl = document.getElementById('preview-paper');

    if (!this.settings || !this.settings.company_name) {
      this.settings = await window.api.getSettings();
    }
    if (!this.shops || this.shops.length === 0) {
      this.shops = (await window.api.getShops()) || [];
    }

    const formatBillDate = (d) => {
      if (!d) return '';
      const dateObj = new Date(d);
      if (isNaN(dateObj.getTime())) return String(d);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = months[dateObj.getMonth()];
      const year = dateObj.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const invoiceDate = data.date ? new Date(data.date) : new Date();
    const invoiceDateStr = formatBillDate(invoiceDate);

    const invoiceNo = data.proposal_number || data.sale_number || data.id || '8011';
    const shopId = data.shop_id || '';
    const rawShopName = (data.shop_name || data.customer_name || 'MUSTAFA CASH & CARRY STORE');
    const cleanShopName = rawShopName.replace(/^\d+\s*-\s*/, '').trim();
    const shopName = cleanShopName.toUpperCase();
    const shopDisplay = shopId ? `${shopId} - ${shopName}` : (rawShopName.includes('-') ? rawShopName.toUpperCase() : shopName);
    const shopAddress = (data.shop_address || data.location || 'BASTI EID GHA RD, WAH CANTT').toUpperCase();
    const shopPhone = data.phone || data.shop_phone || '0310-5123788';
    
    const salesmanName = (data.salesman_name || data.seller_name || 'IFRAHIM').toUpperCase();
    const salesmanContact = data.salesman_contact || data.seller_phone || '0310-5123788';

    const items = data.items || [];

    const includePrevBal = (data.include_prev_balance !== undefined && data.include_prev_balance !== null)
      ? (data.include_prev_balance === 1 || data.include_prev_balance === true || data.include_prev_balance === '1')
      : (this.includePrevBalance !== undefined ? Boolean(this.includePrevBalance) : true);

    let prevBalance = 0;
    if (includePrevBal) {
      if (data.shop_previous_balance !== undefined && data.shop_previous_balance !== null && Number(data.shop_previous_balance) !== 0) {
        prevBalance = Number(data.shop_previous_balance) || 0;
      } else if (this.shopPreviousBalance !== undefined && this.shopPreviousBalance !== null && Number(this.shopPreviousBalance) !== 0) {
        prevBalance = Number(this.shopPreviousBalance) || 0;
      } else {
        const matchShop = (this.shops || []).find(s => 
          (data.shop_id && s.id === data.shop_id) ||
          s.name.toLowerCase() === cleanShopName.toLowerCase() ||
          s.name.toLowerCase() === rawShopName.toLowerCase() ||
          rawShopName.toLowerCase().includes(s.name.toLowerCase())
        );
        if (matchShop) prevBalance = Number(matchShop.amount) || 0;
      }
    }

    const hasPrevBalRow = Boolean(includePrevBal && prevBalance > 0);
    const displayedItemsCount = items.length + (hasPrevBalRow ? 1 : 0);
    const minRows = 12; // Pad nicely for A5 page
    const totalRowsCount = Math.max(displayedItemsCount, minRows);

    let totalQty = 0;
    let totalGross = 0;
    let totalItemDisc = 0;
    let totalGst = 0;
    let totalNet = 0;

    const receiptTaxPercent = (data.tax_percent !== undefined && data.tax_percent !== null)
      ? Number(data.tax_percent)
      : (this.isTaxEnabled ? (parseFloat(this.taxPercent) || 0) : 0);
    const hasReceiptTax = receiptTaxPercent > 0 || (Number(data.tax_amount) > 0);

    const receiptWhtPercent = (data.wht_percent !== undefined && data.wht_percent !== null)
      ? Number(data.wht_percent)
      : (this.isWhtEnabled ? (parseFloat(this.whtPercent) || 0) : 0);
    const hasReceiptWht = receiptWhtPercent > 0 || (Number(data.wht_amount) > 0);

    let rowsHtml = '';
    for (let i = 0; i < totalRowsCount; i++) {
      if (i < items.length) {
        const item = items[i];
        const desc = (item.description || item.item_name || '').toUpperCase();
        const qty = Number(item.qty) || 0;
        const rate = Number(item.unit_retail !== undefined ? item.unit_retail : (item.retail_price || item.unit_discounted || 0));
        const grossVal = qty * rate;
        
        // Item discount
        let itemDisc = 0;
        if (item.discount) {
          itemDisc = item.discountType === 'percent' ? (grossVal * Number(item.discount)) / 100 : (Number(item.discount) * qty);
        }

        const taxableVal = Math.max(0, grossVal - itemDisc);
        const itemTaxPct = item.gst_percent !== undefined ? Number(item.gst_percent) : receiptTaxPercent;
        const gstVal = hasReceiptTax ? (item.gst_amount !== undefined ? Number(item.gst_amount) : Math.round(taxableVal * (itemTaxPct / 100))) : 0;
        const lineNet = taxableVal + gstVal;

        totalQty += qty;
        totalGross += grossVal;
        totalItemDisc += itemDisc;
        totalGst += gstVal;
        totalNet += lineNet;

        rowsHtml += `
          <tr style="height: 18px; border-bottom: 1px solid #000;">
            <td style="border: 1px solid #000; padding: 2px 2px; font-size: 8.5px; text-align: center; font-weight: 700;">${i + 1}</td>
            <td style="border: 1px solid #000; padding: 2px 3px; font-size: 8.5px; font-weight: 700; text-align: left; text-transform: uppercase; line-height: 1.15;">${desc}</td>
            <td style="border: 1px solid #000; padding: 2px 2px; font-size: 8.5px; text-align: center; font-weight: 700;">${qty}</td>
            <td style="border: 1px solid #000; padding: 2px 3px; font-size: 8.5px; text-align: right; font-weight: 600;">${app.formatAmount(rate)}</td>
            <td style="border: 1px solid #000; padding: 2px 3px; font-size: 8.5px; text-align: right; font-weight: 700;">${app.formatAmount(grossVal)}</td>
            <td style="border: 1px solid #000; padding: 2px 2px; font-size: 8.5px; text-align: right;">${itemDisc > 0 ? app.formatAmount(itemDisc) : ''}</td>
            <td style="border: 1px solid #000; padding: 2px 3px; font-size: 8.5px; text-align: right; font-weight: 700; color: #1e3a8a;">${gstVal > 0 ? app.formatAmount(gstVal) : '0'}</td>
            <td style="border: 1px solid #000; padding: 2px 3px; font-size: 8.5px; text-align: right; font-weight: 800;">${app.formatAmount(lineNet)}</td>
          </tr>
        `;
      } else if (i === items.length && hasPrevBalRow) {
        totalGross += prevBalance;
        totalNet += prevBalance;

        rowsHtml += `
          <tr style="height: 18px; border-bottom: 1px solid #000; background: #fff;">
            <td style="border: 1px solid #000; padding: 2px 2px; font-size: 8.5px; text-align: center; font-weight: 700;">${i + 1}</td>
            <td style="border: 1px solid #000; padding: 2px 3px; font-size: 8.5px; font-weight: 800; text-align: left; text-transform: uppercase; line-height: 1.15;">BALANCE AMOUNT</td>
            <td style="border: 1px solid #000; padding: 2px 2px; font-size: 8.5px; text-align: center; font-weight: 700;">-</td>
            <td style="border: 1px solid #000; padding: 2px 3px; font-size: 8.5px; text-align: right; font-weight: 600;">-</td>
            <td style="border: 1px solid #000; padding: 2px 3px; font-size: 8.5px; text-align: right; font-weight: 700;">${app.formatAmount(prevBalance)}</td>
            <td style="border: 1px solid #000; padding: 2px 2px; font-size: 8.5px; text-align: right;">-</td>
            <td style="border: 1px solid #000; padding: 2px 3px; font-size: 8.5px; text-align: right; font-weight: 700; color: #1e3a8a;">0</td>
            <td style="border: 1px solid #000; padding: 2px 3px; font-size: 8.5px; text-align: right; font-weight: 800;">${app.formatAmount(prevBalance)}</td>
          </tr>
        `;
      } else {
        // Empty padded row
        rowsHtml += `
          <tr style="height: 18px; border-bottom: 1px solid #000;">
            <td style="border: 1px solid #000; padding: 2px 2px; font-size: 8.5px; text-align: center; color: #555;">${i + 1}</td>
            <td style="border: 1px solid #000; padding: 2px 3px;">&nbsp;</td>
            <td style="border: 1px solid #000; padding: 2px 2px;">&nbsp;</td>
            <td style="border: 1px solid #000; padding: 2px 3px;">&nbsp;</td>
            <td style="border: 1px solid #000; padding: 2px 3px;">&nbsp;</td>
            <td style="border: 1px solid #000; padding: 2px 2px;">&nbsp;</td>
            <td style="border: 1px solid #000; padding: 2px 3px;">&nbsp;</td>
            <td style="border: 1px solid #000; padding: 2px 3px;">&nbsp;</td>
          </tr>
        `;
      }
    }

    const specialDisc = Number(data.discount) || 0;
    const totalWht = hasReceiptWht 
      ? (data.wht_amount !== undefined && data.wht_amount !== null ? Number(data.wht_amount) : Math.round(Math.max(0, totalGross - totalItemDisc - specialDisc) * (receiptWhtPercent / 100))) 
      : 0;

    const grandTotal = (data.retail_total !== undefined && data.retail_total !== null)
      ? Number(data.retail_total)
      : Math.max(0, totalNet + totalWht - specialDisc);

    const receivedAmount = (data.received_amount !== undefined && data.received_amount !== null)
      ? Number(data.received_amount)
      : grandTotal;
    const pendingAmount = Math.max(0, grandTotal - receivedAmount);
    const netBalance = Math.max(0, (includePrevBal ? grandTotal : (prevBalance + grandTotal)) - receivedAmount);
    const paymentMethodStr = (data.payment_method || this.paymentMethod || 'Cash').toUpperCase();
    const rawRemarks = (data.remarks !== undefined && data.remarks !== null)
      ? data.remarks
      : (document.getElementById('sf-payment-remarks')?.value || '').trim();
    const paymentRemarks = rawRemarks || (data.payment_method ? `Paid via ${data.payment_method}` : (pendingAmount > 0 ? (receivedAmount > 0 ? 'Partial Payment' : 'Credit / Pending') : 'Cash / Paid'));

    const logoSrc = (this.settings && this.settings.logo_path) ? `file://${this.settings.logo_path}` : '';
    const logoHtml = logoSrc 
      ? `<img src="${logoSrc}" style="max-height: 48px; max-width: 65px; object-fit: contain;">`
      : `<div style="font-size: 10px; font-weight: 800; color: #222; text-align: center; text-transform: uppercase;">LOGO</div>`;

    const html = `
      <div class="receipt-80mm" style="width: 100%; max-width: 138mm; margin: 0 auto; padding: 10px 12px; background: #fff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #000; box-sizing: border-box; font-size: 10px; line-height: 1.3; border: 1.5px solid #000; border-radius: 4px; -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision;">
        
        <!-- Top Box / Header with Logo and Company Info -->
        <div style="border: 1px solid #000; padding: 4px 8px; margin-bottom: 8px; display: flex; align-items: center; background: #fff;">
          <div style="width: 68px; height: 50px; border: 1px solid #000; display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0; background: #fff;">
            ${logoHtml}
          </div>
          <div style="flex: 1; text-align: center;">
            <h1 style="font-family: inherit; font-size: 20px; font-weight: 800; margin: 0; line-height: 1.15; color: #000; text-transform: uppercase; letter-spacing: -0.2px;">${this.settings.company_name || 'Akhtar & Sons'}</h1>
            <div style="font-size: 9.5px; font-weight: 500; margin: 2px 0 3px 0; color: #000;">${this.settings.address || 'B-99, Lalarukh Basti, Wah Cantt'} ${this.settings.phone || '0310-5123788'}</div>
            <div style="border-top: 1px solid #000; margin: 2px auto 3px auto; width: 92%;"></div>
            <div style="font-family: inherit; font-size: 12px; font-weight: 700; color: #000; text-transform: uppercase; letter-spacing: 0.5px;">Sales Invoice</div>
          </div>
        </div>

        <!-- 2-Column Metadata Section (No Booking Days) -->
        <div style="display: flex; justify-content: space-between; font-size: 9.5px; line-height: 1.4; margin-bottom: 8px; color: #000;">
          <!-- Left Column -->
          <div style="flex: 1; padding-right: 8px;">
            <div style="display: flex;"><span style="width: 85px; font-weight: 600;">Invoice #</span> <span style="font-weight: 700; font-size: 10px;">${invoiceNo}</span></div>
            <div style="display: flex;"><span style="width: 85px; font-weight: 600;">Booked By:</span> <span style="font-weight: 600; text-transform: uppercase;">${salesmanName} ${salesmanContact}</span></div>
            <div style="display: flex;"><span style="width: 85px; font-weight: 600;">Delivered By:</span> <span>SELF</span></div>
            <div style="display: flex;"><span style="width: 85px; font-weight: 600;">Method:</span> <span style="font-weight: 700; text-transform: uppercase;">${paymentMethodStr}</span></div>
            <div style="display: flex;"><span style="width: 85px; font-weight: 600;">Remarks:</span> <span>${paymentRemarks}</span></div>
          </div>

          <!-- Right Column -->
          <div style="flex: 1.15;">
            <div style="display: flex; margin-top: 1px;"><span style="width: 75px; font-weight: 600;">Sale To:</span> <span style="font-weight: 700; font-size: 10px; text-transform: uppercase;">${shopDisplay}</span></div>
            <div style="display: flex; margin-top: 1px;"><span style="width: 75px; font-weight: 600;">Address:</span> <span style="font-weight: 500; text-transform: uppercase;">${shopAddress}</span></div>
            <div style="display: flex;"><span style="width: 75px; font-weight: 600;">Contact Info:</span> <span>${shopPhone}</span></div>
            <div style="display: flex;"><span style="width: 75px; font-weight: 600;">CNIC - NTN #</span> <span>${data.cnic_ntn || data.cnic || data.ntn || (document.getElementById('sf-cnic-ntn')?.value || '').trim() || '-'}</span></div>
          </div>
        </div>

        <!-- Products Table with GST (18%) -->
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 8.5px; margin-bottom: 8px; color: #000;">
          <thead>
            <tr style="border-bottom: 1px solid #000; background: #fff;">
              <th style="border: 1px solid #000; padding: 2.5px 2px; width: 5%; text-align: center; font-weight: 700; font-size: 8.5px;">Sr. #</th>
              <th style="border: 1px solid #000; padding: 2.5px 3px; width: 38%; text-align: left; font-weight: 700; font-size: 8.5px;">Product Description</th>
              <th style="border: 1px solid #000; padding: 2.5px 2px; width: 8%; text-align: center; font-weight: 700; font-size: 8.5px;">Qty</th>
              <th style="border: 1px solid #000; padding: 2.5px 3px; width: 11%; text-align: right; font-weight: 700; font-size: 8.5px;">Rate</th>
              <th style="border: 1px solid #000; padding: 2.5px 3px; width: 12%; text-align: right; font-weight: 700; font-size: 8.5px;">Gross Value</th>
              <th style="border: 1px solid #000; padding: 2.5px 2px; width: 8%; text-align: right; font-weight: 700; font-size: 8.5px;">Discount</th>
              <th style="border: 1px solid #000; padding: 2.5px 3px; width: 9%; text-align: right; font-weight: 700; font-size: 8.5px;">GST (${hasReceiptTax ? receiptTaxPercent + '%' : '0%'})</th>
              <th style="border: 1px solid #000; padding: 2.5px 3px; width: 12%; text-align: right; font-weight: 700; font-size: 8.5px;">Net Value</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <!-- Totals Row -->
            <tr style="border-top: 1px solid #000; font-weight: 700; font-size: 8.5px; background: #fff;">
              <td colspan="2" style="border: 1px solid #000; padding: 2.5px 3px; text-align: left;">Items: ${items.length}</td>
              <td style="border: 1px solid #000; padding: 2.5px 2px; text-align: center;">${totalQty}</td>
              <td style="border: 1px solid #000; padding: 2.5px 2px;"></td>
              <td style="border: 1px solid #000; padding: 2.5px 3px; text-align: right;">${app.formatAmount(totalGross)}</td>
              <td style="border: 1px solid #000; padding: 2.5px 2px; text-align: right;">${totalItemDisc > 0 ? app.formatAmount(totalItemDisc) : ''}</td>
              <td style="border: 1px solid #000; padding: 2.5px 3px; text-align: right;">${totalGst > 0 ? app.formatAmount(totalGst) : '0'}</td>
              <td style="border: 1px solid #000; padding: 2.5px 3px; text-align: right;">${app.formatAmount(totalNet)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Summary Section Below Table (Compact Strip) -->
        <div style="display: flex; justify-content: space-between; font-size: 10px; line-height: 1.4; margin-bottom: 12px; color: #000;">
          <!-- Left Summary -->
          <div style="width: 48%;">
            <div style="margin-top: 4px; font-weight: 700; font-size: 9.5px;">
              ${includePrevBal ? `Previous Balance: ${app.formatAmount(prevBalance)} &nbsp;&nbsp;|&nbsp;&nbsp; ` : ''}Net Balance: ${app.formatAmount(netBalance)}
            </div>
          </div>

          <!-- Right Summary -->
          <div style="width: 46%;">
            <div style="display: flex; justify-content: space-between; padding: 1px 0;">
              <span style="font-weight: 700;">Sum Net</span>
              <span style="font-weight: 800; width: 75px; text-align: right;">${app.formatAmount(totalGross)}</span>
            </div>
            ${specialDisc > 0 ? `
            <div style="display: flex; justify-content: space-between; padding: 1px 0;">
              <span style="font-weight: 700;">Special Disc</span>
              <span style="font-weight: 700; width: 75px; text-align: right;">${app.formatAmount(specialDisc)}</span>
            </div>` : ''}
            ${hasReceiptTax ? `
            <div style="display: flex; justify-content: space-between; padding: 1px 0;">
              <span style="font-weight: 700;">GST (${receiptTaxPercent}%)</span>
              <span style="font-weight: 700; width: 75px; text-align: right;">${app.formatAmount(totalGst)}</span>
            </div>` : ''}
            ${hasReceiptWht && totalWht > 0 ? `
            <div style="display: flex; justify-content: space-between; padding: 1px 0;">
              <span style="font-weight: 700;">WHT (${receiptWhtPercent}%)</span>
              <span style="font-weight: 700; width: 75px; text-align: right;">${app.formatAmount(totalWht)}</span>
            </div>` : ''}
            <div style="display: flex; justify-content: space-between; padding: 2px 0; border-top: 1px solid #000; border-bottom: 1px solid #000; margin-top: 2px; font-size: 11px;">
              <span style="font-weight: 700;">Net Inv. Amount</span>
              <span style="font-weight: 800; width: 75px; text-align: right;">${app.formatAmount(grandTotal)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 1.5px 0;">
              <span style="font-weight: 600;">Received</span>
              <span style="font-weight: 700; width: 75px; text-align: right;">${app.formatAmount(receivedAmount)}</span>
            </div>
            ${pendingAmount > 0 ? `
            <div style="display: flex; justify-content: space-between; padding: 1.5px 0; color: #b91c1c;">
              <span style="font-weight: 700;">Pending Due</span>
              <span style="font-weight: 800; width: 75px; text-align: right;">${app.formatAmount(pendingAmount)}</span>
            </div>` : ''}
          </div>
        </div>

        <!-- Footer Section -->
        <div style="border-top: 1.5px solid #000; border-bottom: 1px solid #000; padding: 4px 2px; margin-top: 12px; display: flex; justify-content: space-between; font-size: 9px; font-weight: 600; color: #111;">
          <div>${invoiceDateStr}</div>
          <div>Software by PrimeSoft Agency - Contact: 0309-5369472</div>
        </div>

      </div>
    `;

    app.setPrintContent('receipt-print', html);
    if (previewEl) previewEl.innerHTML = html;
    return html;
  },

  generateReceiptHTML(data) {
    return this.generateReceipt(data);
  },

  showPrintPreview() {
    const titleEl = document.getElementById('preview-title');
    const subtitleEl = document.getElementById('preview-subtitle');
    if (titleEl) titleEl.textContent = 'Invoice Receipt Preview';
    if (subtitleEl) subtitleEl.textContent = 'A5 INVOICE PREVIEW';
    const modal = document.getElementById('preview-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    const printBtn = document.getElementById('confirm-print-btn');
    if (printBtn) {
      printBtn.onclick = () => app.confirmPrint();
    }

    if (window.lucide) lucide.createIcons();
  },

  onClosePreview() {
    app.navigate('proposal-form');
  },

  onAfterPrint() {
    this.onClosePreview();
  },

  async loadAllItems() {
    this.availableItems = await window.api.searchAllProducts('');
  }
};
