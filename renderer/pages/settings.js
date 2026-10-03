const LOCKABLE_TABS = [
  { key: 'proposal-form', name: 'New Sale' },
  { key: 'proposals', name: 'Sales History' },
  { key: 'master-db', name: 'Stock' },
  { key: 'expenses', name: 'Expenses' },
  { key: 'reports', name: 'Reports' },
  { key: 'companies', name: 'Purchases' },
  { key: 'shops', name: 'Shops' },
  { key: 'dashboard', name: 'Dashboard' },
  { key: 'settings', name: 'Settings' }
];

const Settings = {
  originalLogo: '',
  currentTab: 'general',
  sellers: [],

  async render(container) {
    this.currentTab = this.currentTab || 'general';
    container.innerHTML = `
      <div class="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div class="flex items-center gap-4 flex-wrap">
          <h2 class="text-3xl font-bold text-slate-800">Settings</h2>
          <div class="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
            <button type="button" id="tab-btn-general" onclick="Settings.switchTab('general')" class="px-4 py-2 text-xs font-bold rounded-lg transition-all ${this.currentTab === 'general' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'} flex items-center gap-2 cursor-pointer">
              <i data-lucide="sliders" class="w-3.5 h-3.5"></i> General
            </button>
            <button type="button" id="tab-btn-sellers" onclick="Settings.switchTab('sellers')" class="px-4 py-2 text-xs font-bold rounded-lg transition-all ${this.currentTab === 'sellers' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'} flex items-center gap-2 cursor-pointer">
              <i data-lucide="users" class="w-3.5 h-3.5"></i> Sellers List
            </button>
          </div>
        </div>
        <div id="settings-action-btn-container">
          <button type="submit" form="settings-form" id="btn-save-profile" class="h-10 px-4 bg-accent hover:bg-amber-500 text-slate-950 font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm hover:shadow transition-all active:scale-95 border border-amber-400/50 cursor-pointer ${this.currentTab === 'general' ? '' : 'hidden'}">
            <i data-lucide="save" class="w-4 h-4 stroke-[2.5]"></i> Save Profile
          </button>
        </div>
      </div>

      <!-- VIEW 1: General Settings -->
      <div id="settings-view-general" class="${this.currentTab === 'general' ? '' : 'hidden'} overflow-y-auto pr-2 custom-scrollbar" style="max-height: calc(100vh - 180px);">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pb-8">
          <!-- Company Profile -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="p-4 border-b border-slate-100 bg-slate-50">
              <h3 class="font-bold text-lg text-slate-700">Company Profile</h3>
            </div>
            
            <form id="settings-form" class="p-4 space-y-3" onsubmit="Settings.saveSettings(event)">
              
              <!-- Logo Section -->
              <div class="flex items-start gap-4 pb-2 border-b border-slate-100">
                <div class="shrink-0">
                  <div class="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden relative group">
                    <img id="settings-logo-preview" src="" class="w-full h-full object-cover object-center hidden rounded-xl">
                    <div id="settings-logo-placeholder" class="text-slate-400 flex flex-col items-center">
                      <i data-lucide="image" class="w-8 h-8 mb-2"></i>
                      <span class="text-[10px] font-medium">No Logo</span>
                    </div>
                    <div class="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer" onclick="Settings.selectLogo()">
                      <span class="text-white text-[10px] font-bold"><i data-lucide="upload" class="w-4 h-4 mb-1 mx-auto"></i> Change</span>
                    </div>
                  </div>
                  <input type="hidden" id="set-logo-path">
                </div>
                <div class="flex-1 pt-2">
                  <h4 class="font-medium text-slate-700 mb-2">Company UI Logo</h4>
                  <div class="flex gap-2">
                    <button type="button" onclick="Settings.selectLogo()" class="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50">Choose</button>
                    <button type="button" onclick="Settings.removeLogo()" class="px-3 py-1.5 text-red-600 hover:bg-red-50 text-xs font-medium rounded-lg">Remove</button>
                  </div>
                </div>
              </div>

              <!-- Fields -->
              <div class="grid grid-cols-1 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Company Name *</label>
                  <input type="text" id="set-name" disabled class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm opacity-70 cursor-not-allowed outline-none">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Website</label>
                  <input type="text" id="set-web" class="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-accent outline-none">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Company Address</label>
                  <textarea id="set-address" rows="2" class="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-accent outline-none" placeholder="Enter company address"></textarea>
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Contact Numbers</label>
                  <input type="text" id="set-phone" class="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-accent outline-none" placeholder="e.g. 0310-5123788">
                </div>
              </div>
            </form>
          </div>

          <!-- Security Settings -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-100">
            <div class="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
              <h3 class="font-bold text-lg text-slate-700">Tab Access Security</h3>
            </div>
            <div class="p-4 space-y-4">
              <div class="flex items-start gap-4">
                 <div class="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                    <i data-lucide="lock" class="w-5 h-5"></i>
                 </div>
                 <div class="flex-1">
                    <h4 class="font-bold text-slate-800 text-sm">Security Password</h4>
                    <p class="text-xs text-slate-500 mb-3">Set a password to restrict access to selected tabs. Leave blank to disable protection.</p>
                    
                     <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                       <div>
                         <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">New Password</label>
                         <div class="relative">
                           <input type="password" id="set-stock-password" placeholder="••••••••" class="w-full border border-slate-200 rounded-lg p-2 pr-9 text-sm focus:ring-1 focus:ring-accent outline-none">
                           <button type="button" onclick="Settings.togglePasswordVisibility('set-stock-password', this)" class="password-visibility-toggle absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1">
                             <i data-lucide="eye" class="w-4 h-4"></i>
                           </button>
                         </div>
                       </div>
                       <div>
                         <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Confirm Password</label>
                         <div class="relative">
                           <input type="password" id="set-stock-password-confirm" placeholder="••••••••" class="w-full border border-slate-200 rounded-lg p-2 pr-9 text-sm focus:ring-1 focus:ring-accent outline-none">
                           <button type="button" onclick="Settings.togglePasswordVisibility('set-stock-password-confirm', this)" class="password-visibility-toggle absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1">
                             <i data-lucide="eye" class="w-4 h-4"></i>
                           </button>
                         </div>
                       </div>
                     </div>
                     <button type="button" id="btn-remove-stock-pass" onclick="Settings.removeStockPassword()" class="hidden text-[10px] font-bold text-rose-500 hover:text-rose-700 uppercase tracking-widest flex items-center gap-1.5 transition-colors mb-3">
                        <i data-lucide="unlock" class="w-3 h-3"></i> Remove Current Password
                     </button>

                     <!-- Dropdown of Lockable Tabs with Checkmarks -->
                     <div class="pt-3 border-t border-slate-100">
                       <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Locked Tabs Selection</label>
                       <div class="relative">
                         <button type="button" onclick="Settings.toggleTabDropdown(event)" id="locked-tabs-btn" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold hover:bg-white border-slate-200 transition-all flex items-center justify-between">
                            <span id="locked-tabs-text">No Tabs Locked</span>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400"></i>
                         </button>
                         <div id="locked-tabs-menu" class="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-2 hidden max-h-60 overflow-y-auto">
                            <!-- Injected dynamically -->
                         </div>
                       </div>
                     </div>
                  </div>
              </div>
            </div>
          </div>

          <!-- Backup & Restore -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="p-4 border-b border-slate-100 bg-slate-50">
              <h3 class="font-bold text-lg text-slate-700">Backup & Data</h3>
            </div>
            <div class="p-4 space-y-3">
              <div class="flex items-start gap-4">
                 <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <i data-lucide="download" class="w-5 h-5"></i>
                 </div>
                 <div>
                    <h4 class="font-bold text-slate-800 text-sm">Backup Data Locally</h4>
                    <p class="text-xs text-slate-500 mb-3">Backup all proposals, expenses, products, and logs into a single file.</p>
                    <button onclick="Settings.backupData()" class="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 shadow-sm">
                      Backup App Data
                    </button>
                 </div>
              </div>

              <div class="pt-2 border-t border-slate-100 flex items-start gap-4">
                 <div class="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                    <i data-lucide="rotate-ccw" class="w-5 h-5"></i>
                 </div>
                 <div>
                    <h4 class="font-bold text-slate-800 text-sm">Restore from Backup</h4>
                    <p class="text-xs text-slate-500 mb-3">Restore your entire system from a previous backup file. <span class="text-red-500 font-bold">This will replace current data.</span></p>
                    <button onclick="Settings.restoreData()" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 shadow-sm">
                      Restore Data
                    </button>
                 </div>
              </div>

              <div class="pt-2 border-t border-slate-100 flex items-start gap-4">
                 <div class="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                 </div>
                 <div>
                    <h4 class="font-bold text-slate-800 text-sm">Clear All App Data</h4>
                    <p class="text-xs text-slate-500 mb-3">Permanently delete all data and reset the application to its original state. <span class="text-red-600 font-bold underline">This action cannot be undone.</span></p>
                    <button onclick="Settings.clearAppData()" class="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 shadow-sm">
                      Clear All Data
                    </button>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- VIEW 2: Sellers List Tab -->
      <div id="settings-view-sellers" class="${this.currentTab === 'sellers' ? '' : 'hidden'} overflow-y-auto pr-2 custom-scrollbar" style="max-height: calc(100vh - 180px);">
        <div class="max-w-4xl space-y-6 pb-8">
          <!-- Add Seller Card -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-wrap gap-2">
              <div>
                <h3 class="font-bold text-lg text-slate-800">Sellers & Sales Members</h3>
                <p class="text-xs text-slate-500">Staff or team members entered here will appear in the seller dropdown at checkout when making a sale.</p>
              </div>
              <span id="seller-count-badge" class="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200/80 rounded-full text-xs font-black">0 Sellers</span>
            </div>
            
            <div class="p-5">
              <form onsubmit="Settings.addSeller(event)" class="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div class="relative md:col-span-6">
                  <i data-lucide="user" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
                  <input type="text" id="new-seller-input" placeholder="Salesman Name (e.g. Ifrahim)..." required class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500 transition-all">
                </div>
                <div class="relative md:col-span-4">
                  <i data-lucide="phone" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
                  <input type="text" id="new-seller-phone" placeholder="Phone (e.g. 0329-9934620)..." class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500 transition-all">
                </div>
                <div class="md:col-span-2">
                  <button type="submit" class="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow transition-all active:scale-95 cursor-pointer shrink-0">
                    <i data-lucide="plus" class="w-4 h-4 stroke-[2.5]"></i> Add
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Sellers List Table Card -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h4 class="font-bold text-sm text-slate-700 uppercase tracking-wider">Configured Salesmen</h4>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-sm text-left border-collapse">
                <thead class="bg-slate-50/70 text-slate-400 uppercase text-[10px] font-black tracking-wider border-b border-slate-100">
                  <tr>
                    <th class="px-4 py-3 text-center w-12">#</th>
                    <th class="px-4 py-3">Salesman Name</th>
                    <th class="px-4 py-3">Contact</th>
                    <th class="px-4 py-3 text-right w-28">Actions</th>
                  </tr>
                </thead>
                <tbody id="sellers-table-body" class="divide-y divide-slate-100 bg-white">
                  <!-- Rendered dynamically -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Edit Salesman Modal -->
      <div id="seller-modal" onclick="if(event.target === this) Settings.closeSellerModal()" class="fixed inset-0 bg-slate-900/60 hidden items-center justify-center z-[500] backdrop-blur-md transition-opacity opacity-0 p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-95" id="seller-modal-card">
          <div class="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                <i data-lucide="user-check" class="w-4 h-4"></i>
              </div>
              <h3 class="font-black text-base">Edit Salesman</h3>
            </div>
            <button type="button" onclick="Settings.closeSellerModal()" class="text-slate-400 hover:text-white transition-colors cursor-pointer">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <form id="seller-edit-form" onsubmit="Settings.saveSellerEdit(event)" class="p-6 space-y-4">
            <input type="hidden" id="edit-seller-index" value="">
            <div>
              <label class="block text-xs font-black uppercase text-slate-500 mb-1">Salesman Name <span class="text-rose-500">*</span></label>
              <div class="relative">
                <i data-lucide="user" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input type="text" id="edit-seller-name" required placeholder="Salesman Name (e.g. Ifrahim)" class="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-amber-500 outline-none transition-all">
              </div>
            </div>

            <div>
              <label class="block text-xs font-black uppercase text-slate-500 mb-1">Contact Number</label>
              <div class="relative">
                <i data-lucide="phone" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input type="text" id="edit-seller-phone" placeholder="e.g. 0329-9934620" class="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-amber-500 outline-none transition-all">
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onclick="Settings.closeSellerModal()" class="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer">Cancel</button>
              <button type="submit" class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm">
                <i data-lucide="check" class="w-4 h-4 stroke-[2.5]"></i> Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    try {
      await this.reloadSettings();
      await this.loadSellers();
      if (window.lucide) lucide.createIcons();
    } catch(e) {
      console.error(e);
    }
  },

  async reloadSettings() {
    const s = await window.api.getSettings();
    if (document.getElementById('set-name')) document.getElementById('set-name').value = s.company_name || 'Akhtar & Sons';
    if (document.getElementById('set-web')) document.getElementById('set-web').value = s.website || '';
    if (document.getElementById('set-address')) document.getElementById('set-address').value = s.address || 'B-99, Lalarukh Basti, Wah Cantt';
    if (document.getElementById('set-phone')) document.getElementById('set-phone').value = s.phone || '0310-5123788';
    this.originalLogo = s.logo_path || '';
    this.updateLogoPreview(this.originalLogo);

    const stockPassword = window.storage.get('stock_password') || '';
    const passInput = document.getElementById('set-stock-password');
    const confirmInput = document.getElementById('set-stock-password-confirm');
    
    if (passInput && confirmInput) {
        passInput.value = stockPassword;
        confirmInput.value = stockPassword;
        
        const hasPassword = !!stockPassword;
        passInput.disabled = hasPassword;
        confirmInput.disabled = hasPassword;
        
        // Visual feedback
        [passInput, confirmInput].forEach(el => {
            el.classList.toggle('opacity-50', hasPassword);
            el.classList.toggle('bg-slate-50', hasPassword);
            el.classList.toggle('cursor-not-allowed', hasPassword);
        });

        // Toggle buttons state
        const toggleBtns = document.querySelectorAll('.password-visibility-toggle');
        toggleBtns.forEach(btn => {
            if (hasPassword) {
                btn.classList.add('pointer-events-none', 'opacity-30');
            } else {
                btn.classList.remove('pointer-events-none', 'opacity-30');
            }
        });
    }
    
    const removeBtn = document.getElementById('btn-remove-stock-pass');
    if (removeBtn) {
        if (stockPassword) removeBtn.classList.remove('hidden');
        else removeBtn.classList.add('hidden');
    }

    this.renderTabDropdown();
  },

  async removeStockPassword() {
    const currentPass = window.storage.get('stock_password');
    if (!currentPass) return;

    app.showPrompt({
      title: 'Remove Password',
      message: 'Please enter your current password to disable tab access protection:',
      type: 'password',
      onConfirm: (input) => {
        if (input === currentPass) {
          window.storage.set('stock_password', '');
          window.storage.set('locked_tabs', []);
          app.isStockUnlocked = false;
          app.unlockedTabs = {};
          app.showAlert({
            title: 'Password Removed',
            message: 'Tab access protection has been disabled.',
            buttonText: 'OK'
          });
          this.reloadSettings();
        } else {
          app.showAlert({
            title: 'Error',
            message: 'Incorrect password. Removal failed.',
            buttonText: 'Try Again'
          });
        }
      }
    });
  },

  updateLogoPreview(path) {
    document.getElementById('set-logo-path').value = path;
    const preview = document.getElementById('settings-logo-preview');
    const ph = document.getElementById('settings-logo-placeholder');
    
    if (path) {
      preview.src = 'file://' + path;
      preview.classList.remove('hidden');
      ph.classList.add('hidden');
    } else {
      preview.src = '';
      preview.classList.add('hidden');
      ph.classList.remove('hidden');
    }
  },

  async selectLogo() {
    const path = await window.api.selectLogoFile();
    if (path) {
      this.updateLogoPreview(path);
    }
  },

  removeLogo() {
    this.updateLogoPreview('');
  },



  async saveSettings(e) {
    if (e) e.preventDefault();
    app.showLoading();
    try {
      const data = {
        company_name: document.getElementById('set-name')?.value || '',
        website: document.getElementById('set-web')?.value || '',
        address: document.getElementById('set-address')?.value || '',
        phone: document.getElementById('set-phone')?.value || '',
        logo_path: document.getElementById('set-logo-path')?.value || '',
        qr_path: '',
        qr_text: ''
      };
      await window.api.saveSettings(data);
      
      // Save Stock Password
      const passInput = document.getElementById('set-stock-password');
      const confirmInput = document.getElementById('set-stock-password-confirm');
      const stockPass = passInput ? passInput.value : '';
      const stockPassConfirm = confirmInput ? confirmInput.value : '';

      if (stockPass !== stockPassConfirm) {
        app.hideLoading();
        return app.showAlert("Passwords do not match!");
      }

      window.storage.set('stock_password', stockPass);
      app.isStockUnlocked = false; // Require re-entry with new password
      // Ensure locked_tabs is initialized if not already set
      const currentLocked = window.storage.get('locked_tabs');
      if (stockPass && (currentLocked === null || currentLocked === undefined)) {
        window.storage.set('locked_tabs', []);
      }

      // Update app state
      await app.loadSettings();
      await this.reloadSettings();

      app.showAlert({
        title: 'Settings Saved',
        message: 'Your settings and security password have been saved successfully.',
        buttonText: 'OK'
      });

    } catch (err) {
      console.error(err);
      app.showAlert('Error saving settings: ' + err.message);
    } finally {
      app.hideLoading();
    }
  },

  async backupData() {
    return this.handleBackup();
  },

  async restoreData() {
    return this.handleRestore();
  },

  async handleBackup() {
    app.showLoading();
    try {
      // 1. Sync all current localStorage items into SQLite
      const allKv = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          allKv[key] = localStorage.getItem(key);
        }
      }
      if (window.api && window.api.saveAllKv) {
        await window.api.saveAllKv(allKv);
      }

      // 2. Perform backup
      const res = await window.api.backupData();
      if (res && res.success) {
        app.showAlert({
          title: 'Backup Successful',
          message: `Database backup created successfully at:<br><b class="text-slate-800 break-all text-xs">${res.path}</b>`,
          buttonText: 'Done'
        });
      } else if (res && res.error && res.error !== 'Cancelled') {
        app.showAlert('Backup failed: ' + res.error);
      }
    } catch (err) {
      console.error(err);
      app.showAlert('Failed to create backup: ' + err.message);
    } finally {
      app.hideLoading();
    }
  },

  async handleRestore() {
    app.showConfirm({
      title: 'Restore Database',
      message: 'Restoring a database will overwrite current data. The app will restart automatically upon completion. Are you sure you want to proceed?',
      confirmText: 'Select Backup File',
      confirmColor: 'orange',
      onConfirm: async () => {
        app.showLoading();
        try {
          // Clear local storage so restored DB rehydrates cleanly
          localStorage.clear();
          const res = await window.api.restoreData();
          if (res && !res.success && res.error !== 'Cancelled') {
            app.showAlert('Restore failed: ' + res.error);
          }
        } catch (err) {
          console.error(err);
          app.showAlert('Failed to restore database.');
        } finally {
          app.hideLoading();
        }
      }
    });
  },

  async clearAppData() {
    app.verifyPassword({
      title: 'Security Verification',
      message: 'Enter password to authorize clearing all app data:',
      onVerified: () => {
        app.showConfirm({
          title: 'Clear All App Data',
          message: 'Are you sure you want to delete EVERYTHING? This will permanently delete all proposals, products, expenses, and settings. The app will restart with a fresh database. This action CANNOT be undone!',
          confirmText: 'Yes, Delete Everything',
          confirmColor: 'red',
          onConfirm: async () => {
            app.showLoading();
            try {
              localStorage.clear();
              const res = await window.api.clearAppData();
              if (res && !res.success) {
                app.showAlert('Clear data failed: ' + res.error);
              }
            } catch (err) {
              console.error(err);
              app.showAlert('Failed to clear data.');
            } finally {
              app.hideLoading();
            }
          }
        });
      }
    });
  },

  togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      btn.innerHTML = '<i data-lucide="eye-off" class="w-4 h-4"></i>';
    } else {
      input.type = 'password';
      btn.innerHTML = '<i data-lucide="eye" class="w-4 h-4"></i>';
    }
    if (window.lucide) lucide.createIcons();
  },

  toggleTabDropdown(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('locked-tabs-menu');
    if (!menu) return;
    const isHidden = menu.classList.contains('hidden');
    
    if (isHidden) {
      menu.classList.remove('hidden');
      const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
          menu.classList.add('hidden');
          document.removeEventListener('click', closeMenu);
        }
      };
      setTimeout(() => {
        document.addEventListener('click', closeMenu);
      }, 0);
    } else {
      menu.classList.add('hidden');
    }
  },

  renderTabDropdown() {
    const lockedTabs = window.storage.get('locked_tabs') || [];
    const menu = document.getElementById('locked-tabs-menu');
    const btnText = document.getElementById('locked-tabs-text');
    if (!menu || !btnText) return;

    if (lockedTabs.length === 0) {
      btnText.textContent = "No Tabs Locked";
    } else {
      const names = LOCKABLE_TABS.filter(t => lockedTabs.includes(t.key)).map(t => t.name);
      btnText.textContent = names.join(', ');
    }

    menu.innerHTML = LOCKABLE_TABS.map(tab => {
      const isLocked = lockedTabs.includes(tab.key);
      return `
        <div onclick="Settings.toggleTabLock('${tab.key}', event)" class="px-4 py-2 hover:bg-slate-50 flex items-center justify-between cursor-pointer select-none">
          <span class="text-xs font-bold text-slate-700">${tab.name}</span>
          <div class="w-4 h-4 border border-slate-300 rounded flex items-center justify-center transition-colors ${isLocked ? 'bg-accent border-accent text-slate-900' : 'bg-white'}">
            ${isLocked ? '<i data-lucide="check" class="w-3 h-3 stroke-[3]"></i>' : ''}
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  async toggleTabLock(key, event) {
    if (event) event.stopPropagation();

    const password = window.storage.get('stock_password') || '';
    if (!password) {
      return app.showAlert({
        title: 'Security Required',
        message: 'Please set and save a Security Password first to lock/unlock tabs.',
        buttonText: 'OK'
      });
    }

    app.showPrompt({
      title: 'Password Required',
      message: `Enter password to lock/unlock this tab:`,
      type: 'password',
      onConfirm: (input) => {
        if (input === password) {
          let lockedTabs = window.storage.get('locked_tabs') || [];
          if (lockedTabs.includes(key)) {
            lockedTabs = lockedTabs.filter(t => t !== key);
          } else {
            lockedTabs.push(key);
          }
          window.storage.set('locked_tabs', lockedTabs);
          
          if (app.unlockedTabs) {
            delete app.unlockedTabs[key];
          }

          app.showAlert({
            title: 'Success',
            message: 'Tab security updated successfully.',
            buttonText: 'OK'
          });
          this.renderTabDropdown();
        } else {
          app.showAlert({
            title: 'Error',
            message: 'Incorrect password. Tab security unchanged.',
            buttonText: 'Try Again'
          });
        }
      }
    });
  },

  switchTab(tab) {
    this.currentTab = tab;
    const generalView = document.getElementById('settings-view-general');
    const sellersView = document.getElementById('settings-view-sellers');
    const generalBtn = document.getElementById('tab-btn-general');
    const sellersBtn = document.getElementById('tab-btn-sellers');
    const saveProfileBtn = document.getElementById('btn-save-profile');

    if (tab === 'general') {
      generalView?.classList.remove('hidden');
      sellersView?.classList.add('hidden');
      saveProfileBtn?.classList.remove('hidden');

      if (generalBtn) generalBtn.className = 'px-4 py-2 text-xs font-bold rounded-lg transition-all bg-slate-900 text-white shadow-sm flex items-center gap-2 cursor-pointer';
      if (sellersBtn) sellersBtn.className = 'px-4 py-2 text-xs font-bold rounded-lg transition-all text-slate-500 hover:text-slate-800 flex items-center gap-2 cursor-pointer';
    } else {
      generalView?.classList.add('hidden');
      sellersView?.classList.remove('hidden');
      saveProfileBtn?.classList.add('hidden');

      if (sellersBtn) sellersBtn.className = 'px-4 py-2 text-xs font-bold rounded-lg transition-all bg-slate-900 text-white shadow-sm flex items-center gap-2 cursor-pointer';
      if (generalBtn) generalBtn.className = 'px-4 py-2 text-xs font-bold rounded-lg transition-all text-slate-500 hover:text-slate-800 flex items-center gap-2 cursor-pointer';

      this.renderSellersList();
    }
    if (window.lucide) lucide.createIcons();
  },

  async loadSellers() {
    try {
      const s = await window.api.getSettings();
      let list = [];
      if (s && s.sellers_list) {
        try { list = JSON.parse(s.sellers_list); } catch(e) {}
      }
      if (!list || list.length === 0) {
        list = [
          { name: 'Ifrahim', phone: '0329-9934620' },
          { name: 'Muhammad Ali', phone: '0300-1234567' },
          { name: 'Usman Tariq', phone: '0312-7654321' },
          { name: 'Bilal Ahmed', phone: '0333-9876543' },
          { name: 'Hamza Khan', phone: '0345-5432167' },
          { name: 'Zain Malik', phone: '0321-1122334' }
        ];
        await window.api.saveSettings({ sellers_list: JSON.stringify(list) });
      }
      this.sellers = (list || []).map(x => {
        if (typeof x === 'string') return { name: x.trim(), phone: '' };
        return { name: (x.name || x.full_name || '').trim(), phone: (x.phone || '').trim() };
      }).filter(s => s.name);
    } catch (e) {
      console.error("Failed to load salesmen:", e);
      this.sellers = [
        { name: 'Ifrahim', phone: '0329-9934620' },
        { name: 'Muhammad Ali', phone: '0300-1234567' },
        { name: 'Usman Tariq', phone: '0312-7654321' },
        { name: 'Bilal Ahmed', phone: '0333-9876543' }
      ];
    }
    this.renderSellersList();
  },

  renderSellersList() {
    const tbody = document.getElementById('sellers-table-body');
    const badge = document.getElementById('seller-count-badge');
    if (badge) {
      badge.textContent = `${this.sellers.length} Salesman${this.sellers.length === 1 ? '' : 'en'}`;
    }
    if (!tbody) return;

    if (this.sellers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="px-6 py-12 text-center text-slate-400">
            <i data-lucide="user-x" class="w-12 h-12 mx-auto mb-2 opacity-30 text-slate-400"></i>
            <p class="font-bold text-sm text-slate-600">No salesmen registered yet</p>
            <p class="text-xs text-slate-400 mt-1">Type salesman name and contact number above, then click "Add".</p>
          </td>
        </tr>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    tbody.innerHTML = this.sellers.map((salesman, idx) => `
      <tr class="hover:bg-slate-50/80 transition-colors group">
        <td class="px-4 py-3 text-center text-xs font-bold text-slate-400 tabular-nums border-r border-slate-100">${idx + 1}</td>
        <td class="px-4 py-3 border-r border-slate-100">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-black text-xs shrink-0 uppercase shadow-sm">
              ${(salesman.name || 'S').charAt(0)}
            </div>
            <span class="font-black text-slate-800 text-sm">${salesman.name}</span>
          </div>
        </td>
        <td class="px-4 py-3 border-r border-slate-100 font-bold text-slate-600 tabular-nums">
          ${salesman.phone || '<span class="text-slate-300 font-normal">Not Provided</span>'}
        </td>
        <td class="px-4 py-3 text-right">
          <div class="flex items-center justify-end gap-1">
            <button type="button" onclick="Settings.editSeller(${idx})" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer" title="Edit Salesman">
              <i data-lucide="edit-2" class="w-4 h-4"></i>
            </button>
            <button type="button" onclick="Settings.deleteSeller(${idx})" class="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title="Delete Salesman">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    if (window.lucide) lucide.createIcons();
  },

  async addSeller(e) {
    if (e) e.preventDefault();
    const nameInput = document.getElementById('new-seller-input');
    const phoneInput = document.getElementById('new-seller-phone');
    if (!nameInput) return;
    const name = nameInput.value.trim();
    const phone = phoneInput ? phoneInput.value.trim() : '';
    if (!name) return;

    if (this.sellers.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      app.showAlert({ title: 'Duplicate Salesman', message: `Salesman "${name}" is already in the list.` });
      return;
    }

    this.sellers.push({ name, phone });
    await window.api.saveSettings({ sellers_list: JSON.stringify(this.sellers) });
    nameInput.value = '';
    if (phoneInput) phoneInput.value = '';
    nameInput.focus();
    this.renderSellersList();
  },

  editSeller(index) {
    const salesman = this.sellers[index];
    if (!salesman) return;

    const modal = document.getElementById('seller-modal');
    const card = document.getElementById('seller-modal-card');
    const idxInput = document.getElementById('edit-seller-index');
    const nameInput = document.getElementById('edit-seller-name');
    const phoneInput = document.getElementById('edit-seller-phone');

    if (!modal || !idxInput || !nameInput || !phoneInput) return;

    idxInput.value = index;
    nameInput.value = salesman.name || '';
    phoneInput.value = salesman.phone || '';

    modal.classList.remove('hidden', 'opacity-0');
    modal.classList.add('flex');
    if (card) card.classList.remove('scale-95');
    nameInput.focus();
    if (window.lucide) lucide.createIcons();
  },

  closeSellerModal() {
    const modal = document.getElementById('seller-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  },

  async saveSellerEdit(e) {
    if (e) e.preventDefault();
    const idxInput = document.getElementById('edit-seller-index');
    const nameInput = document.getElementById('edit-seller-name');
    const phoneInput = document.getElementById('edit-seller-phone');
    if (!idxInput || !nameInput) return;

    const index = parseInt(idxInput.value, 10);
    if (isNaN(index) || !this.sellers[index]) return;

    const name = nameInput.value.trim();
    const phone = phoneInput ? phoneInput.value.trim() : '';

    if (!name) return;

    // Check duplicate name excluding current index
    const isDuplicate = this.sellers.some((s, idx) => idx !== index && s.name.toLowerCase() === name.toLowerCase());
    if (isDuplicate) {
      app.showAlert({ title: 'Duplicate Salesman', message: `Salesman "${name}" already exists in the list.` });
      return;
    }

    this.sellers[index] = { name, phone };
    await window.api.saveSettings({ sellers_list: JSON.stringify(this.sellers) });
    this.closeSellerModal();
    this.renderSellersList();
  },

  deleteSeller(index) {
    const salesman = this.sellers[index];
    if (!salesman) return;

    app.showConfirm({
      title: 'Remove Salesman',
      message: `Are you sure you want to remove <b class="text-slate-900">${salesman.name}</b> from the salesman list?`,
      confirmText: 'Remove',
      confirmColor: 'red',
      onConfirm: async () => {
        this.sellers.splice(index, 1);
        await window.api.saveSettings({ sellers_list: JSON.stringify(this.sellers) });
        this.renderSellersList();
      }
    });
  }
};
