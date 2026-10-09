const app = {
  currentPage: null,
  modalTimeout: null,
  isStockUnlocked: false,
  unlockedTabs: {},
  saleMode: 'retail',

  async init() {
    // Rehydrate localStorage from SQLite app_kv_store on startup
    try {
      if (window.api && window.api.getAllKv) {
        const kvList = await window.api.getAllKv();
        if (kvList && kvList.length > 0) {
          for (const item of kvList) {
            localStorage.setItem(item.key, item.value);
          }
        }
      }
    } catch (e) {
      console.error("Failed to rehydrate storage from DB:", e);
    }

    this.saleMode = window.storage.get('sale_mode') || 'retail';
    this.bindEvents();
    this.initCalculator();
    await this.loadSettings();
    this.updateSaleModeUI();
    if (window.lucide) lucide.createIcons();
    this.navigate('proposal-form');
  },

  setSaleMode(mode) {
    this.saleMode = mode;
    window.storage.set('sale_mode', mode);
    this.updateSaleModeUI();
    
    // Refresh active tab to reflect price mode change
    if (this.currentPage === 'proposal-form' && window.SalesForm) {
        SalesForm.loadAllItems();
    } else if (this.currentPage === 'master-db' && window.MasterDB) {
        MasterDB.applySearch();
    }
  },

  updateSaleModeUI() {
    const retailBtn = document.getElementById('sale-mode-retail');
    const wholesaleBtn = document.getElementById('sale-mode-wholesale');
    const badge = document.getElementById('topbar-mode-badge');

    if (!retailBtn || !wholesaleBtn) return;

    if (this.saleMode === 'wholesale') {
        wholesaleBtn.className = 'px-3 py-1 text-xs font-black rounded-lg bg-slate-900 text-white shadow-sm flex items-center gap-1.5 cursor-pointer';
        retailBtn.className = 'px-3 py-1 text-xs font-black rounded-lg text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer';
        if (badge) {
          badge.className = 'px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-extrabold flex items-center gap-1.5';
          badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-indigo-500"></span> Active: Wholesale Selling Prices';
        }
    } else {
        retailBtn.className = 'px-3 py-1 text-xs font-black rounded-lg bg-slate-900 text-white shadow-sm flex items-center gap-1.5 cursor-pointer';
        wholesaleBtn.className = 'px-3 py-1 text-xs font-black rounded-lg text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer';
        if (badge) {
          badge.className = 'px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-extrabold flex items-center gap-1.5';
          badge.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-500"></span> Active: Retail Selling Prices';
        }
    }
    if (window.lucide) lucide.createIcons();
  },

  bindEvents() {
    document.getElementById('confirm-cancel-btn').addEventListener('click', () => this.hideConfirm());
    document.getElementById('confirm-alt-btn')?.addEventListener('click', () => {
      const cb = this.confirmAltCallback;
      this.hideConfirm();
      if (cb) cb();
    });
    document.getElementById('confirm-ok-btn').addEventListener('click', () => {
      const input = document.getElementById('prompt-input').value;
      const cb = this.confirmCallback;
      this.hideConfirm();
      if (cb) cb(input);
    });

    const promptInput = document.getElementById('prompt-input');
    if (promptInput) {
      promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          document.getElementById('confirm-ok-btn').click();
        }
      });
    }

    window.addEventListener('afterprint', () => {
      this.clearAllPrintContainers();
    });

    // Global integer enforcement for all number inputs
    document.addEventListener('keydown', (e) => {
      if (e.target && e.target.type === 'number') {
        if (['.', ',', 'e', 'E', '+'].includes(e.key)) {
          e.preventDefault();
        }
      }
    });

    document.addEventListener('input', (e) => {
      if (e.target && e.target.type === 'number') {
        if (e.target.value.includes('.') || e.target.value.includes('e') || e.target.value.includes('E')) {
          e.target.value = e.target.value.replace(/[^0-9-]/g, '');
        }
      }
    });

    document.addEventListener('paste', (e) => {
      if (e.target && e.target.type === 'number') {
        const text = (e.clipboardData || window.clipboardData)?.getData('text');
        if (text && !/^-?\d+$/.test(text.trim())) {
          e.preventDefault();
          const cleanText = text.replace(/[^0-9-]/g, '');
          if (cleanText) {
            document.execCommand('insertText', false, cleanText);
          }
        }
      }
    });
  },

  async loadSettings() {
    const settings = await window.api.getSettings();
    const logoImg = document.getElementById('sidebar-logo');
    const logoPlaceholder = document.getElementById('sidebar-logo-placeholder');
    const title = document.getElementById('sidebar-title');

    if (settings.logo_path) {
      logoImg.src = 'file://' + settings.logo_path;
      logoImg.classList.remove('hidden');
      if (logoPlaceholder) logoPlaceholder.classList.add('hidden');
    } else {
      logoImg.classList.add('hidden');
      if (logoPlaceholder) logoPlaceholder.classList.remove('hidden');
    }

    if (settings.company_name) {
      title.textContent = settings.company_name;
    } else {
      title.textContent = 'Akhtar & Sons';
    }
  },

  async navigate(page, args) {
    // Support legacy stock_password configuration
    const stockPassword = window.storage.get('stock_password');
    const lockedTabs = window.storage.get('locked_tabs');
    if (stockPassword && (lockedTabs === null || lockedTabs === undefined)) {
        window.storage.set('locked_tabs', []);
    }

    const currentLockedTabs = window.storage.get('locked_tabs') || [];
    if (currentLockedTabs.includes(page) && stockPassword && (!this.unlockedTabs || !this.unlockedTabs[page])) {
        this.showTabPasswordPrompt(page, args);
        return;
    }

    this.currentPage = page;

    // Update active nav button
    document.querySelectorAll('.nav-btn').forEach(btn => {
      if (btn.id === `nav-${page}`) {
        btn.classList.add('bg-accent', 'text-slate-900', 'font-bold');
        btn.classList.remove('hover:bg-slate-800');
      } else {
        btn.classList.remove('bg-accent', 'text-slate-900', 'font-bold');
        btn.classList.add('hover:bg-slate-800');
      }
    });

    const content = document.getElementById('app-content');
    content.innerHTML = '';
    if (page !== 'proposal-form') {
      content.style.overflow = '';
      content.style.height = '';
    }

    // Route to corresponding module
    try {
      switch(page) {
        case 'dashboard': await Dashboard.render(content); break;
        case 'proposals': await Proposals.render(content); break;
        case 'item-sales': await ItemSales.render(content, args); break;
        case 'proposal-form': await SalesForm.render(content, args); break;
        case 'master-db': await MasterDB.render(content); break;
        case 'expenses': await Expenses.render(content); break;
        case 'companies': await Companies.render(content); break;
        case 'shops': await Shops.render(content); break;
        case 'reports': await Reports.render(content); break;
        case 'settings': await Settings.render(content); break;
      }
    } catch (err) {
      console.error(`Error rendering page ${page}:`, err);
      content.innerHTML = `
        <div class="flex flex-col items-center justify-center h-[60vh] p-6">
          <div class="bg-white p-8 rounded-3xl shadow-xl border border-rose-100 max-w-md w-full text-center space-y-4">
            <div class="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
              <i data-lucide="alert-circle" class="w-8 h-8"></i>
            </div>
            <h3 class="text-xl font-bold text-slate-800">Unable to load section</h3>
            <p class="text-xs text-slate-500">${err.message || 'An unexpected error occurred while loading this view.'}</p>
            <button onclick="app.navigate('${page}')" class="px-6 py-2.5 bg-accent hover:bg-amber-500 text-slate-900 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer">
              Reload Section
            </button>
          </div>
        </div>
      `;
    }
    
    // Refresh Icons after rendering
    if (window.lucide) {
      lucide.createIcons();
    }
  },

  showTabPasswordPrompt(page, args) {
    this.pendingNavigation = { page, args };
    const content = document.getElementById('app-content');
    content.classList.add('opacity-0');

    const tabNames = {
      'proposal-form': 'New Sale',
      'proposals': 'Sales History',
      'item-sales': 'Item Sales',
      'master-db': 'Stock',
      'expenses': 'Expenses',
      'reports': 'Reports',
      'companies': 'Purchases',
      'shops': 'Shops',
      'dashboard': 'Dashboard',
      'settings': 'Settings'
    };
    const tabName = tabNames[page] || page;

    setTimeout(() => {
        content.innerHTML = `
            <div class="flex flex-col items-center justify-center h-[60vh]">
                <div class="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 max-w-md w-full text-center space-y-6">
                    <div class="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                        <i data-lucide="lock" class="w-10 h-10"></i>
                    </div>
                    <div>
                        <h2 class="text-2xl font-black text-slate-800">${tabName} Locked</h2>
                        <p class="text-slate-500 mt-2">Please enter the password to access locked tab.</p>
                    </div>
                    <form onsubmit="app.handleTabUnlock(event)" class="space-y-4 text-left">
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                            <div class="relative">
                                <input type="password" id="tab-unlock-pass" class="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 pr-12 text-xl font-bold focus:bg-white focus:border-accent focus:ring-4 focus:ring-amber-50 outline-none transition-all" placeholder="••••••••" required autofocus>
                                <button type="button" onclick="app.toggleUnlockPasswordVisibility(this)" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1">
                                    <i data-lucide="eye" class="w-6 h-6"></i>
                                </button>
                            </div>
                        </div>
                        <button type="submit" class="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-sm tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98]">
                            Unlock Access
                        </button>
                    </form>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        content.classList.remove('opacity-0');
        document.getElementById('tab-unlock-pass').focus();
    }, 100);
  },

  toggleUnlockPasswordVisibility(btn) {
    const input = document.getElementById('tab-unlock-pass');
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      btn.innerHTML = '<i data-lucide="eye-off" class="w-6 h-6"></i>';
    } else {
      input.type = 'password';
      btn.innerHTML = '<i data-lucide="eye" class="w-6 h-6"></i>';
    }
    if (window.lucide) lucide.createIcons();
  },

  handleTabUnlock(e) {
    e.preventDefault();
    const pass = document.getElementById('tab-unlock-pass').value;
    const securityPassword = window.storage.get('stock_password');

    if (pass === securityPassword) {
        if (!this.unlockedTabs) this.unlockedTabs = {};
        const { page, args } = this.pendingNavigation;
        this.unlockedTabs[page] = true;
        this.navigate(page, args);
        this.pendingNavigation = null;
    } else {
        this.showAlert({
            title: 'Incorrect Password',
            message: 'The password you entered is incorrect. Please try again.',
            buttonText: 'Try Again'
        });
        document.getElementById('tab-unlock-pass').value = '';
        document.getElementById('tab-unlock-pass').focus();
    }
  },

  showLoading() {
    document.getElementById('loading-overlay').classList.remove('hidden');
    document.getElementById('loading-overlay').classList.add('flex');
  },

  hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
    document.getElementById('loading-overlay').classList.remove('flex');
  },

  showConfirm({ title = 'Confirm', message = 'Are you sure?', confirmText = 'Confirm', confirmColor = 'red', altText = null, onAlt = null, previewHtml = null, onConfirm }) {
    this.confirmCallback = onConfirm;
    this.confirmAltCallback = onAlt;
    
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').innerHTML = message;
    
    const okBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    const altBtn = document.getElementById('confirm-alt-btn');
    const previewCol = document.getElementById('confirm-preview-col');
    const previewContent = document.getElementById('confirm-preview-content');
    const card = document.getElementById('confirm-card');
    
    cancelBtn.classList.remove('hidden');

    if (altBtn) {
      if (altText && onAlt) {
        altBtn.classList.remove('hidden');
        altBtn.innerHTML = `<i data-lucide="save" class="w-4 h-4 text-emerald-400"></i> <span>${altText}</span>`;
      } else {
        altBtn.classList.add('hidden');
      }
    }

    if (previewHtml && previewCol && previewContent && card) {
      previewCol.classList.remove('hidden');
      previewCol.classList.add('flex');
      previewContent.innerHTML = previewHtml;
      card.classList.remove('max-w-sm');
      card.classList.add('max-w-3xl', 'md:max-w-4xl');
    } else {
      if (previewCol) {
        previewCol.classList.add('hidden');
        previewCol.classList.remove('flex');
      }
      if (previewContent) previewContent.innerHTML = '';
      if (card) {
        card.classList.remove('max-w-3xl', 'md:max-w-4xl', 'max-w-2xl');
        card.classList.add('max-w-sm');
      }
    }
    
    const colorClasses = {
      red: 'bg-rose-600 hover:bg-rose-700',
      blue: 'bg-blue-600 hover:bg-blue-700',
      green: 'bg-emerald-600 hover:bg-emerald-700',
      orange: 'bg-amber-600 hover:bg-amber-700'
    };
    
    okBtn.className = `px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-sm flex items-center gap-2 ${colorClasses[confirmColor] || colorClasses.orange}`;
    
    if (confirmText.toLowerCase().includes('print')) {
      okBtn.innerHTML = `<i data-lucide="printer" class="w-4 h-4"></i> <span>${confirmText}</span>`;
    } else {
      okBtn.textContent = confirmText;
    }

    document.getElementById('confirm-icon-bg').className = `w-10 h-10 rounded-full flex items-center justify-center bg-${confirmColor === 'red' ? 'rose' : (confirmColor === 'blue' ? 'blue' : (confirmColor === 'green' ? 'emerald' : 'amber'))}-100 text-${confirmColor === 'red' ? 'rose' : (confirmColor === 'blue' ? 'blue' : (confirmColor === 'green' ? 'emerald' : 'amber'))}-600 shrink-0`;
    document.getElementById('confirm-icon').setAttribute('data-lucide', confirmColor === 'red' ? 'trash-2' : (confirmColor === 'green' ? 'check-circle' : 'info'));
    if (window.lucide) lucide.createIcons();

    const modal = document.getElementById('confirm-modal');
    modal.classList.remove('hidden', 'opacity-0');
    modal.classList.add('flex');
    if (card) card.classList.remove('scale-95');
  },

  hideConfirm() {
    const modal = document.getElementById('confirm-modal');
    const card = document.getElementById('confirm-card');
    const previewCol = document.getElementById('confirm-preview-col');
    const previewContent = document.getElementById('confirm-preview-content');
    const altBtn = document.getElementById('confirm-alt-btn');

    if (altBtn) altBtn.classList.add('hidden');
    this.confirmAltCallback = null;
    document.getElementById('prompt-container').classList.add('hidden');
    document.getElementById('prompt-input').value = '';
    document.getElementById('prompt-input').type = 'text';
    
    modal.classList.remove('flex');
    modal.classList.add('hidden');
    if (previewCol) {
      previewCol.classList.add('hidden');
      previewCol.classList.remove('flex');
    }
    if (previewContent) previewContent.innerHTML = '';
    if (card) {
      card.classList.remove('max-w-3xl', 'md:max-w-4xl', 'max-w-2xl', 'md:max-w-3xl');
      card.classList.add('max-w-sm');
    }
    this.confirmCallback = null;
  },

  showAlert(config) {
    if (this.modalTimeout) clearTimeout(this.modalTimeout);
    if (typeof config === 'string') {
        config = { message: config };
    }
    const { title = 'Notice', message = '', buttonText = 'OK' } = config;
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').innerHTML = message;
    
    const okBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    const previewCol = document.getElementById('confirm-preview-col');
    const previewContent = document.getElementById('confirm-preview-content');
    const card = document.getElementById('confirm-card');

    if (previewCol) {
      previewCol.classList.add('hidden');
      previewCol.classList.remove('flex');
    }
    if (previewContent) previewContent.innerHTML = '';
    if (card) {
      card.classList.remove('max-w-2xl', 'md:max-w-3xl');
      card.classList.add('max-w-sm');
    }
    
    okBtn.textContent = buttonText;
    cancelBtn.classList.add('hidden'); // Hide cancel for alerts
    
    this.confirmCallback = () => {
        cancelBtn.classList.remove('hidden'); // restore for next use
    };
    
    okBtn.className = `px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-accent hover:bg-amber-600`;
    document.getElementById('confirm-icon-bg').className = 'w-10 h-10 rounded-full flex items-center justify-center bg-amber-100 text-amber-600 shrink-0';
    document.getElementById('confirm-icon').setAttribute('data-lucide', 'info');
    if (window.lucide) lucide.createIcons();

    const modal = document.getElementById('confirm-modal');
    modal.classList.remove('hidden', 'opacity-0');
    modal.classList.add('flex');
    if (card) card.classList.remove('scale-95');
  },

  showPrompt({ title = 'Input Required', message = '', value = '', type = 'text', confirmText = 'Submit', onConfirm }) {
    this.confirmCallback = onConfirm;
    
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    
    const previewCol = document.getElementById('confirm-preview-col');
    const previewContent = document.getElementById('confirm-preview-content');
    const card = document.getElementById('confirm-card');

    if (previewCol) {
      previewCol.classList.add('hidden');
      previewCol.classList.remove('flex');
    }
    if (previewContent) previewContent.innerHTML = '';
    if (card) {
      card.classList.remove('max-w-2xl', 'md:max-w-3xl');
      card.classList.add('max-w-sm');
    }

    const inputContainer = document.getElementById('prompt-container');
    const input = document.getElementById('prompt-input');
    const toggleBtn = document.getElementById('prompt-toggle-btn');
    inputContainer.classList.remove('hidden');
    input.value = value;
    input.type = type;

    if (type === 'password') {
      if (toggleBtn) {
        toggleBtn.classList.remove('hidden');
        toggleBtn.innerHTML = '<i data-lucide="eye" class="w-4 h-4"></i>';
      }
    } else {
      if (toggleBtn) {
        toggleBtn.classList.add('hidden');
      }
    }
    
    const okBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    cancelBtn.classList.remove('hidden');
    okBtn.textContent = confirmText;
    okBtn.className = `px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-accent hover:bg-amber-600`;
    
    document.getElementById('confirm-icon-bg').className = 'w-10 h-10 rounded-full flex items-center justify-center bg-amber-100 text-amber-600 shrink-0';
    document.getElementById('confirm-icon').setAttribute('data-lucide', type === 'password' ? 'lock' : 'edit-3');
    if (window.lucide) lucide.createIcons();

    const modal = document.getElementById('confirm-modal');
    modal.classList.remove('hidden', 'opacity-0');
    modal.classList.add('flex');
    if (card) card.classList.remove('scale-95');
    input.focus();
  },

  verifyPassword({ title = 'Security Verification', message = 'Please enter your password to proceed:', onVerified, onCancel }) {
    const password = window.storage.get('stock_password');
    if (!password) {
      if (onVerified) onVerified();
      return;
    }
    this.showPrompt({
      title,
      message,
      type: 'password',
      confirmText: 'Verify',
      onConfirm: (input) => {
        if (input === password) {
          if (onVerified) onVerified();
        } else {
          this.showAlert({
            title: 'Incorrect Password',
            message: 'Authentication failed. Action cancelled.',
            buttonText: 'OK'
          });
          if (onCancel) onCancel();
        }
      }
    });
  },

  togglePromptPasswordVisibility() {
    const input = document.getElementById('prompt-input');
    const btn = document.getElementById('prompt-toggle-btn');
    if (!input || !btn) return;
    if (input.type === 'password') {
      input.type = 'text';
      btn.innerHTML = '<i data-lucide="eye-off" class="w-4 h-4"></i>';
    } else {
      input.type = 'password';
      btn.innerHTML = '<i data-lucide="eye" class="w-4 h-4"></i>';
    }
    if (window.lucide) lucide.createIcons();
  },

  formatCurrency(amount) {
    const num = Number(amount || 0);
    const hasDecimals = (num % 1) !== 0;
    return num.toLocaleString('en-IN', { 
      style: 'currency', 
      currency: 'PKR', 
      minimumFractionDigits: hasDecimals ? 2 : 0, 
      maximumFractionDigits: 2 
    }).replace('PKR', 'Rs.');
  },

  formatNumber(amount) {
    const num = Number(amount || 0);
    const hasDecimals = (num % 1) !== 0;
    return num.toLocaleString('en-IN', { 
      minimumFractionDigits: hasDecimals ? 2 : 0, 
      maximumFractionDigits: 2 
    });
  },

  formatAmount(amount) {
    return Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  },

  formatStock(totalBoxes) {
    const boxes = parseInt(totalBoxes) || 0;
    return `${boxes} Bx`;
  },

  formatStockShort(totalBoxes) {
    const boxes = parseInt(totalBoxes) || 0;
    return `${boxes}`;
  },

  parseStockBoxes(boxes) {
    return parseInt(boxes) || 0;
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d)) return dateStr;
      return `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  },

  formatDateTime(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d)) return dateStr;
      
      const date = `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
      const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return `${time} ${date}`;
    } catch {
      return dateStr;
    }
  },

  showPaymentModal({ title, subtitle, total, alreadyReceived = 0, info = null, buttonText = 'Complete Sale', onConfirm }) {
    this.paymentCallback = onConfirm;
    const modal = document.getElementById('payment-modal');
    const card = document.getElementById('payment-card');
    const input = document.getElementById('payment-input');
    const totalDisplay = document.getElementById('payment-total-display');
    const alreadyReceivedBox = document.getElementById('payment-already-received-box');
    const alreadyReceivedDisplay = document.getElementById('payment-already-received-display');
    const remainingDisplay = document.getElementById('payment-remaining-display');
    const infoBox = document.getElementById('payment-info-box');
    const btnText = document.getElementById('payment-btn-text');
    const okBtn = document.getElementById('payment-confirm-btn');

    document.getElementById('payment-title').textContent = title || 'Receive Payment';
    document.getElementById('payment-subtitle').textContent = subtitle || 'Transaction Settlement';
    totalDisplay.textContent = this.formatCurrency(total);
    btnText.textContent = buttonText;

    if (info) {
        infoBox.innerHTML = info;
        infoBox.classList.remove('hidden');
    } else {
        infoBox.classList.add('hidden');
    }

    if (alreadyReceived > 0) {
        alreadyReceivedBox.classList.remove('hidden');
        alreadyReceivedDisplay.textContent = this.formatCurrency(alreadyReceived);
    } else {
        alreadyReceivedBox.classList.add('hidden');
    }

    // Reset input
    const maxVal = total - alreadyReceived;
    input.value = maxVal;
    input.value = maxVal;
    const updateRemaining = () => {
        let val = parseFloat(input.value) || 0;
        const maxAllowed = total - alreadyReceived;
        
        if (val > maxAllowed) {
            val = maxAllowed;
            input.value = val;
        }

        const rem = maxAllowed - val;
        remainingDisplay.textContent = this.formatCurrency(rem);
        if (rem < 0) {
            remainingDisplay.classList.add('text-rose-600');
            remainingDisplay.classList.remove('text-emerald-600');
        } else if (rem === 0) {
            remainingDisplay.classList.add('text-emerald-600');
            remainingDisplay.classList.remove('text-rose-600');
        } else {
            remainingDisplay.classList.add('text-rose-600');
            remainingDisplay.classList.remove('text-emerald-600');
        }
    };

    input.oninput = updateRemaining;
    updateRemaining();

    this.setPaymentMethod('Cash');
    okBtn.onclick = () => {
        const val = parseFloat(input.value) || 0;
        const cb = this.paymentCallback;
        const method = this.currentPaymentMethod || 'Cash';
        this.hidePaymentModal();
        if (cb) cb(val, method);
    };

    modal.classList.remove('hidden', 'opacity-0');
    modal.classList.add('flex');
    if (card) card.classList.remove('scale-95');
    input.focus();
    input.select();
  },

  setPaymentMethod(method) {
    this.currentPaymentMethod = method || 'Cash';
    const cashBtn = document.getElementById('pm-cash');
    const onlineBtn = document.getElementById('pm-online');
    if (cashBtn && onlineBtn) {
      if (method === 'Online') {
        onlineBtn.className = 'flex-1 py-1.5 text-[10px] font-black rounded-lg bg-slate-900 text-white shadow-sm';
        cashBtn.className = 'flex-1 py-1.5 text-[10px] font-black rounded-lg text-slate-400 hover:text-slate-600';
      } else {
        cashBtn.className = 'flex-1 py-1.5 text-[10px] font-black rounded-lg bg-slate-900 text-white shadow-sm';
        onlineBtn.className = 'flex-1 py-1.5 text-[10px] font-black rounded-lg text-slate-400 hover:text-slate-600';
      }
    }
  },

  hidePaymentModal() {
    const modal = document.getElementById('payment-modal');
    modal.classList.remove('flex');
    modal.classList.add('hidden');
    this.paymentCallback = null;
  },

  closePreview() {
    const modal = document.getElementById('preview-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    
    if (this.currentPage === 'proposal-form' && SalesForm.onClosePreview) {
        SalesForm.onClosePreview();
    }
  },

  setPrintContent(targetId, html) {
    const printContainerIds = [
      'receipt-print',
      'db-print-container',
      'voucher-print',
      'report-print-container'
    ];

    printContainerIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (id === targetId) {
          el.innerHTML = html;
          el.classList.add('active-print-target');
        } else {
          el.innerHTML = '';
          el.classList.remove('active-print-target');
        }
      }
    });
  },

  clearAllPrintContainers() {
    const printContainerIds = [
      'receipt-print',
      'db-print-container',
      'voucher-print',
      'report-print-container'
    ];

    printContainerIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = '';
        el.classList.remove('active-print-target');
      }
    });
  },

  async printReceipt(options = {}) {
    let result;
    if (window.api && window.api.printReceipt) {
      try {
        result = await window.api.printReceipt(options);
      } catch (err) {
        console.warn('API printReceipt failed, falling back to window.print', err);
        window.print();
        result = { success: true, fallback: true };
      }
    } else {
      window.print();
      result = { success: true, fallback: true };
    }
    this.clearAllPrintContainers();
    return result;
  },

  async confirmPrint() {
    const modal = document.getElementById('preview-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    
    await this.printReceipt();
    
    if (this.currentPage === 'proposal-form' && SalesForm.onAfterPrint) {
        SalesForm.onAfterPrint();
    }
  },

  async savePDF({ html, defaultFilename, title, pageSize = 'A5' }) {
    if (!window.api || !window.api.savePDF) {
      this.showAlert("PDF export not supported in this environment.");
      return;
    }
    this.showLoading();
    try {
      const res = await window.api.savePDF({ html, defaultFilename, title, pageSize });
      this.hideLoading();
      if (res && res.success) {
        this.showAlert({
          title: 'PDF Saved Successfully',
          message: `Bill saved to:<br><b class="text-slate-800 text-xs break-all">${res.path}</b>`,
          type: 'success'
        });
      } else if (res && res.error) {
        this.showAlert({
          title: 'Save Failed',
          message: `Could not save PDF: ${res.error}`,
          confirmColor: 'red'
        });
      }
    } catch (err) {
      this.hideLoading();
      console.error('Save PDF error:', err);
      this.showAlert("An error occurred while saving the PDF.");
    }
  },

  async saveCurrentPreviewPDF() {
    const previewPaper = document.getElementById('preview-paper');
    const titleEl = document.getElementById('preview-title');
    const docTitle = titleEl ? titleEl.textContent.trim() : 'Document';
    const cleanTitle = docTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${cleanTitle}_${Date.now()}.pdf`;

    const html = previewPaper ? previewPaper.innerHTML : '';
    await this.savePDF({
      html: html,
      defaultFilename: filename,
      title: `Save ${docTitle} as PDF`
    });
  },

  // Calculator State & Logic
  calcState: {
    current: '0',
    previous: null,
    operator: null,
    isNewNumber: true,
    history: '',
    isOpen: false
  },

  initCalculator() {
    // Click outside listener to close calculator
    document.addEventListener('mousedown', (e) => {
      if (!this.calcState || !this.calcState.isOpen) return;
      const calcWidget = document.getElementById('quick-calculator-widget');
      const calcBtn = document.getElementById('sidebar-calc-btn');
      if (calcWidget && !calcWidget.contains(e.target) && (!calcBtn || !calcBtn.contains(e.target))) {
        this.closeCalculator();
      }
    });

    // Keyboard listener
    document.addEventListener('keydown', (e) => {
      if (!this.calcState || !this.calcState.isOpen) return;
      if (e.key === 'Escape') {
        this.closeCalculator();
        return;
      }
      // If user is actively typing in an input/textarea, allow normal typing
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea' || (document.activeElement && document.activeElement.isContentEditable)) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        this.calcAction('num', e.key);
      } else if (e.key === '.') {
        this.calcAction('dot');
      } else if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') {
        this.calcAction('op', e.key);
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        this.calcAction('equals');
      } else if (e.key === 'Backspace') {
        this.calcAction('backspace');
      } else if (e.key.toLowerCase() === 'c' || e.key === 'Delete') {
        this.calcAction('clear');
      } else if (e.key === '%') {
        this.calcAction('percent');
      }
    });

    // Draggable header support
    const header = document.getElementById('calc-header');
    const widget = document.getElementById('quick-calculator-widget');
    if (header && widget) {
      let isDragging = false;
      let startX, startY, origLeft, origTop;

      header.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = widget.getBoundingClientRect();
        origLeft = rect.left;
        origTop = rect.top;
        widget.style.bottom = 'auto';
        widget.style.left = `${origLeft}px`;
        widget.style.top = `${origTop}px`;
        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const newLeft = Math.max(10, Math.min(window.innerWidth - widget.offsetWidth - 10, origLeft + dx));
        const newTop = Math.max(10, Math.min(window.innerHeight - widget.offsetHeight - 10, origTop + dy));
        widget.style.left = `${newLeft}px`;
        widget.style.top = `${newTop}px`;
      });

      document.addEventListener('mouseup', () => {
        isDragging = false;
      });
    }
  },

  toggleCalculator(e) {
    if (e) e.stopPropagation();
    if (this.calcState && this.calcState.isOpen) {
      this.closeCalculator();
    } else {
      this.openCalculator();
    }
  },

  openCalculator() {
    const widget = document.getElementById('quick-calculator-widget');
    if (!widget) return;
    if (!this.calcState) {
      this.calcState = { current: '0', previous: null, operator: null, isNewNumber: true, history: '', isOpen: false };
    }
    this.calcState.isOpen = true;
    widget.classList.remove('hidden');
    const btn = document.getElementById('sidebar-calc-btn');
    if (btn) {
      btn.classList.add('bg-slate-800', 'border-amber-500/50', 'text-amber-400');
    }
    this.updateCalcDisplay();
    if (window.lucide) lucide.createIcons();
  },

  closeCalculator() {
    const widget = document.getElementById('quick-calculator-widget');
    if (!widget) return;
    if (this.calcState) {
      this.calcState.isOpen = false;
    }
    widget.classList.add('hidden');
    const btn = document.getElementById('sidebar-calc-btn');
    if (btn) {
      btn.classList.remove('bg-slate-800', 'border-amber-500/50', 'text-amber-400');
    }
  },

  calcAction(action, value = null) {
    if (!this.calcState) return;
    let s = this.calcState;
    if (action === 'num') {
      if (s.isNewNumber || s.current === '0') {
        s.current = value;
        s.isNewNumber = false;
      } else {
        if (s.current.length < 14) {
          s.current += value;
        }
      }
    } else if (action === 'dot') {
      if (s.isNewNumber) {
        s.current = '0.';
        s.isNewNumber = false;
      } else if (!s.current.includes('.')) {
        s.current += '.';
      }
    } else if (action === 'op') {
      const curNum = parseFloat(s.current);
      if (s.previous !== null && !s.isNewNumber && s.operator) {
        const res = this._evalCalc(s.previous, curNum, s.operator);
        s.current = String(Number(res.toFixed(6)));
        s.previous = parseFloat(s.current);
      } else {
        s.previous = curNum;
      }
      s.operator = value;
      s.isNewNumber = true;
      const opSym = value === '*' ? '×' : (value === '/' ? '÷' : (value === '-' ? '−' : '+'));
      s.history = `${s.previous} ${opSym}`;
    } else if (action === 'equals') {
      if (s.operator && s.previous !== null) {
        const curNum = parseFloat(s.current);
        const opSym = s.operator === '*' ? '×' : (s.operator === '/' ? '÷' : (s.operator === '-' ? '−' : '+'));
        const res = this._evalCalc(s.previous, curNum, s.operator);
        const formattedRes = String(Number(res.toFixed(6)));
        s.history = `${s.previous} ${opSym} ${curNum} =`;
        s.current = formattedRes;
        s.previous = null;
        s.operator = null;
        s.isNewNumber = true;
      }
    } else if (action === 'clear') {
      s.current = '0';
      s.previous = null;
      s.operator = null;
      s.history = '';
      s.isNewNumber = true;
    } else if (action === 'backspace') {
      if (!s.isNewNumber && s.current.length > 0) {
        s.current = s.current.slice(0, -1);
        if (s.current === '' || s.current === '-') {
          s.current = '0';
          s.isNewNumber = true;
        }
      }
    } else if (action === 'percent') {
      const val = parseFloat(s.current) / 100;
      s.current = String(Number(val.toFixed(6)));
    } else if (action === 'plusminus') {
      if (s.current !== '0') {
        if (s.current.startsWith('-')) {
          s.current = s.current.slice(1);
        } else {
          s.current = '-' + s.current;
        }
      }
    }
    this.updateCalcDisplay();
  },

  _evalCalc(a, b, op) {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b !== 0 ? (a / b) : 0;
      default: return b;
    }
  },

  updateCalcDisplay() {
    const disp = document.getElementById('calc-display');
    const hist = document.getElementById('calc-history');
    if (!this.calcState) return;
    if (disp) {
      let num = this.calcState.current;
      if (!num.includes('e') && !num.includes('E')) {
        const parts = num.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        disp.textContent = parts.join('.');
      } else {
        disp.textContent = num;
      }
    }
    if (hist) {
      hist.textContent = this.calcState.history || '';
    }
  },

  copyCalculatorResult() {
    if (!this.calcState) return;
    const val = this.calcState.current;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(val);
    }
    const hist = document.getElementById('calc-history');
    if (hist) {
      const prev = hist.textContent;
      hist.textContent = 'Copied to clipboard!';
      hist.classList.add('text-emerald-400');
      setTimeout(() => {
        hist.textContent = prev;
        hist.classList.remove('text-emerald-400');
      }, 1200);
    }
  }
};

window.storage = {
  get: (key) => {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch (e) { return null; }
  },
  set: (key, val) => {
    try {
      const jsonStr = JSON.stringify(val);
      localStorage.setItem(key, jsonStr);
      if (window.api && window.api.setKv) {
        window.api.setKv(key, jsonStr);
      }
    } catch (e) {
      console.error("Storage set error:", e);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
