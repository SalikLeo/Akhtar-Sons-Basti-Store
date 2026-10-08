window.Reports = {
  reportType: 'daily', // daily, monthly, annual
  selectedDate: '',
  settings: {},

  getLocalDateStr(d = new Date()) {
    if (!d) return '';
    if (typeof d === 'string') return d.split('T')[0];
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  async render(container) {
    this.settings = await window.api.getSettings();
    
    container.innerHTML = `
      <div class="max-w-4xl mx-auto">
        <div class="mb-8">
          <h2 class="text-3xl font-black text-slate-800 tracking-tight">Financial Reports</h2>
        </div>

        <div class="mb-8">
          <!-- Report Selection Card -->
          <div class="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
            <h3 class="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <i data-lucide="settings-2" class="w-5 h-5 text-accent"></i>
              Report Configuration
            </h3>

            <div class="space-y-8">
              <!-- Type Selection -->
              <div>
                <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Select Report Type</label>
                <div class="grid grid-cols-3 gap-3">
                  <button onclick="Reports.setType('daily')" id="type-daily" class="report-type-btn flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all group active-accent bg-accent border-accent text-slate-900 font-bold">
                    <i data-lucide="calendar-days" class="w-6 h-6"></i>
                    <span>Daily Report</span>
                  </button>
                  <button onclick="Reports.setType('monthly')" id="type-monthly" class="report-type-btn flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200 transition-all group font-bold">
                    <i data-lucide="calendar-range" class="w-6 h-6"></i>
                    <span>Monthly Report</span>
                  </button>
                  <button onclick="Reports.setType('annual')" id="type-annual" class="report-type-btn flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200 transition-all group font-bold">
                    <i data-lucide="calendar" class="w-6 h-6"></i>
                    <span>Annual Report</span>
                  </button>
                </div>
              </div>

              <!-- Date Picker -->
              <div id="date-picker-container">
                <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4" id="picker-label">Select Day</label>
                <div class="relative max-w-sm">
                  <i data-lucide="calendar" class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"></i>
                  <input type="date" id="report-date-input" 
                    value="${this.selectedDate}" 
                    onchange="Reports.updateSelectedDate(this.value)"
                    class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pl-12 text-lg font-black text-slate-700 focus:bg-white focus:border-accent outline-none transition-all">
                </div>
              </div>

              <div class="pt-4 border-t border-slate-50 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onclick="Reports.exportReportPDF()" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-black py-4 rounded-2xl flex items-center justify-center gap-3 border border-slate-200 transition-all active:scale-95 group">
                  <i data-lucide="file-down" class="w-6 h-6 text-slate-600 group-hover:scale-110 transition-transform"></i>
                  GENERATE & SAVE AS PDF
                </button>
                <button onclick="Reports.generate()" class="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 group">
                  <i data-lucide="printer" class="w-6 h-6 text-accent group-hover:scale-110 transition-transform"></i>
                  GENERATE & PRINT REPORT
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Preview Area (Hidden normally, shown as preview if desired, but user asked for auto-print) -->
        <div id="report-preview" class="hidden bg-white p-8 rounded-3xl border border-dashed border-slate-300 items-center justify-center text-slate-400">
           <!-- Preview content -->
        </div>
      </div>

      <!-- Local style and container removed -->
    `;

    if (window.lucide) lucide.createIcons();
    this.setType('daily');
  },

  setType(type) {
    this.reportType = type;
    
    // Update UI
    document.querySelectorAll('.report-type-btn').forEach(btn => {
      btn.classList.remove('bg-accent', 'border-accent', 'text-slate-900');
      btn.classList.add('border-slate-100', 'bg-slate-50', 'text-slate-500');
    });

    const activeBtn = document.getElementById(`type-${type}`);
    activeBtn.classList.add('bg-accent', 'border-accent', 'text-slate-900');
    activeBtn.classList.remove('border-slate-100', 'bg-slate-50', 'text-slate-500');

    const input = document.getElementById('report-date-input');
    const label = document.getElementById('picker-label');
    
    if (type === 'daily') {
      input.type = 'date';
      label.textContent = 'Select Day';
      input.value = this.getLocalDateStr();
      this.selectedDate = input.value;
    } else if (type === 'monthly') {
      input.type = 'month';
      label.textContent = 'Select Month';
      const now = new Date();
      input.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      this.selectedDate = input.value;
    } else if (type === 'annual') {
      label.textContent = 'Select Year';
      input.type = 'number';
      input.min = '2000';
      input.max = '2100';
      input.value = new Date().getFullYear();
      this.selectedDate = input.value;
    }
  },

  updateSelectedDate(val) {
    this.selectedDate = val;
  },

  async generate() {
    app.showLoading();
    
    let filters = {};
    let periodLabel = '';
    
    const inputVal = document.getElementById('report-date-input').value;
    
    if (this.reportType === 'daily') {
      filters = { start: inputVal, end: inputVal };
      periodLabel = app.formatDate(inputVal);
    } else if (this.reportType === 'monthly') {
      const [year, month] = inputVal.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      filters = { 
        start: `${year}-${String(month).padStart(2, '0')}-01`, 
        end: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}` 
      };
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      periodLabel = `${monthNames[month - 1]} ${year}`;
    } else if (this.reportType === 'annual') {
      const year = inputVal;
      filters = { 
        start: `${year}-01-01`, 
        end: `${year}-12-31` 
      };
      periodLabel = `Year ${year}`;
    }

    const data = await window.api.getReportSummary(filters);
    
    const margin = data.sales.amount > 0 ? (data.sales.profit / data.sales.amount * 100).toFixed(2) : '0.00';
    const netProfit = data.sales.profit - data.expenses.amount;

    const printContainer = document.getElementById('report-print-container');
    const html = `
        <div class="receipt-80mm" style="width: 100%; max-width: 780px; margin: 0 auto; padding: 20px 24px; background: #fff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #000; box-sizing: border-box; font-size: 13px; line-height: 1.5; border: 1.5px solid #000; border-radius: 8px; -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 14px;">
                <h1 style="font-size: 26px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.8px; color: #000; line-height: 1.2; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${this.settings.company_name || 'Akhtar & Sons'}</h1>
                <div style="margin-top: 6px;">
                    <span style="display: inline-block; border: 1.5px solid #000; padding: 3px 18px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; border-radius: 4px; color: #000; background: #fff;">FINANCIAL REPORT &bull; ${this.reportType.toUpperCase()}</span>
                </div>
            </div>
            
            <!-- Metadata Card -->
            <div style="display: flex; justify-content: space-between; gap: 20px; font-size: 12.5px; line-height: 1.6; color: #000; margin-bottom: 14px; background: #fff; padding: 8px 12px; border-radius: 6px; border: 1px solid #000;">
                <div><span style="font-weight: 700; color: #000;">Report Period:</span> <span style="font-weight: 700; color: #000;">${periodLabel}</span></div>
                <div><span style="font-weight: 700; color: #000;">Generated At:</span> <span style="font-weight: 500; color: #000;">${app.formatDateTime(new Date().toISOString())}</span></div>
            </div>

            <!-- Sales Summary Section -->
            <div style="margin-bottom: 14px;">
                <div style="padding: 5px 8px; font-weight: 800; text-align: left; background: #fff; border: 1.5px solid #000; border-radius: 4px; margin-bottom: 6px; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px; color: #000;">SALES SUMMARY</div>
                <table style="width: 100%; font-size: 12.5px; border-collapse: collapse; color: #000; line-height: 1.7;">
                    <tr style="border-bottom: 1px solid #000;"><td style="padding: 4px 6px; color: #000;">Total Invoices:</td><td style="text-align: right; font-weight: 600; padding: 4px 6px; color: #000;">${data.sales.count}</td></tr>
                    <tr style="border-bottom: 1px solid #000;"><td style="padding: 4px 6px; color: #000;">Total Items Sold:</td><td style="text-align: right; font-weight: 600; padding: 4px 6px; color: #000;">${data.sales.itemsSold}</td></tr>
                    <tr style="border-bottom: 1px solid #000;"><td style="padding: 4px 6px; color: #000;">Total Sell Amount:</td><td style="text-align: right; font-weight: 600; padding: 4px 6px; color: #000;">${app.formatCurrency(data.sales.amount)}</td></tr>
                    <tr style="border-bottom: 1px solid #000;"><td style="padding: 4px 6px; color: #000;">Total Inventory Cost:</td><td style="text-align: right; font-weight: 600; padding: 4px 6px; color: #000;">${app.formatCurrency(data.sales.cost)}</td></tr>
                    <tr style="border-top: 1.5px solid #000; border-bottom: 1px solid #000;"><td style="padding: 5px 6px; font-weight: 800; color: #000;">Gross Profit:</td><td style="text-align: right; font-weight: 800; padding: 5px 6px; color: #000;">${app.formatCurrency(data.sales.profit)}</td></tr>
                    <tr><td style="padding: 4px 6px; color: #000;">Profit Margin:</td><td style="text-align: right; font-weight: 600; padding: 4px 6px; color: #000;">${margin}%</td></tr>
                </table>
            </div>

            <!-- Expenses Summary Section -->
            <div style="margin-bottom: 14px;">
                <div style="padding: 5px 8px; font-weight: 800; text-align: left; background: #fff; border: 1.5px solid #000; border-radius: 4px; margin-bottom: 6px; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px; color: #000;">EXPENSES & PURCHASES</div>
                <table style="width: 100%; font-size: 12.5px; border-collapse: collapse; color: #000; line-height: 1.7;">
                    <tr style="border-bottom: 1px solid #000;"><td style="padding: 4px 6px; color: #000;">Total Expense / Purchase Amount:</td><td style="text-align: right; font-weight: 600; padding: 4px 6px; color: #000;">${app.formatCurrency(data.expenses.amount)}</td></tr>
                    <tr><td style="padding: 4px 6px; color: #000;">Total Transactions:</td><td style="text-align: right; font-weight: 600; padding: 4px 6px; color: #000;">${data.expenses.count}</td></tr>
                </table>
            </div>

            <!-- Company Balances Section -->
            <div style="margin-bottom: 14px;">
                <div style="padding: 5px 8px; font-weight: 800; text-align: left; background: #fff; border: 1.5px solid #000; border-radius: 4px; margin-bottom: 6px; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px; color: #000;">SUPPLIER / COMPANY BALANCES</div>
                <table style="width: 100%; font-size: 12.5px; border-collapse: collapse; color: #000; line-height: 1.7;">
                    <tr style="border-bottom: 1px solid #000;"><td style="padding: 4px 6px; color: #000;">Total Accounts Payable:</td><td style="text-align: right; font-weight: 600; padding: 4px 6px; color: #000;">${app.formatCurrency(data.vendors.amount)}</td></tr>
                    <tr><td style="padding: 4px 6px; color: #000;">Active Companies Count:</td><td style="text-align: right; font-weight: 600; padding: 4px 6px; color: #000;">${data.vendors.count}</td></tr>
                </table>
            </div>

            <!-- Net Summary Box -->
            <div style="margin-top: 16px; border: 1.5px solid #000; border-radius: 6px; overflow: hidden; background: #fff;">
                <div style="background: #fff; color: #000; border-bottom: 1.5px solid #000; padding: 6px 12px; font-weight: 800; text-align: center; text-transform: uppercase; font-size: 13px; letter-spacing: 0.5px;">NET FINANCIAL SUMMARY</div>
                <table style="width: 100%; font-size: 13px; border-collapse: collapse; color: #000; line-height: 1.8; padding: 8px;">
                    <tr style="border-bottom: 1px solid #000;"><td style="padding: 6px 12px; color: #000;">Gross Profit:</td><td style="text-align: right; font-weight: 600; padding: 6px 12px; color: #000;">${app.formatCurrency(data.sales.profit)}</td></tr>
                    <tr style="border-bottom: 1px solid #000;"><td style="padding: 6px 12px; color: #000;">Total Operating Expenses:</td><td style="text-align: right; font-weight: 600; padding: 6px 12px; color: #000;">(${app.formatCurrency(data.expenses.amount)})</td></tr>
                    <tr style="background: #fff; border-top: 1.5px solid #000;"><td style="padding: 8px 12px; font-weight: 800; font-size: 15px; color: #000;">NET ${netProfit >= 0 ? 'PROFIT' : 'LOSS'}:</td><td style="text-align: right; font-weight: 800; font-size: 16px; padding: 8px 12px; color: #000;">${netProfit < 0 ? '(' : ''}${app.formatCurrency(Math.abs(netProfit))}${netProfit < 0 ? ')' : ''}</td></tr>
                </table>
            </div>

            <!-- Footer -->
            <div style="margin-top: 16px; border-top: 1.5px solid #000; padding-top: 8px; text-align: center; font-size: 11px; color: #000;">
                <p style="margin: 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #000;">*** END OF REPORT ***</p>
            </div>
        </div>
    `;

    app.setPrintContent('report-print-container', html);

    // Show Preview
    const previewEl = document.getElementById('preview-paper');
    if (previewEl) previewEl.innerHTML = html;
    
    document.getElementById('preview-title').textContent = 'Financial Report Preview';
    document.getElementById('preview-subtitle').textContent = `${this.reportType.toUpperCase()} SUMMARY`;
    
    const modal = document.getElementById('preview-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (window.lucide) lucide.createIcons();

    app.hideLoading();
  },

  async exportReportPDF() {
    app.showLoading();
    try {
      let filters = {};
      let periodLabel = '';
      let fileSlug = '';
      
      const inputVal = document.getElementById('report-date-input').value;
      
      if (this.reportType === 'daily') {
        filters = { start: inputVal, end: inputVal };
        periodLabel = app.formatDate(inputVal);
        fileSlug = `Daily_${inputVal ? inputVal.replace(/-/g, '') : 'today'}`;
      } else if (this.reportType === 'monthly') {
        const [year, month] = inputVal.split('-').map(Number);
        const lastDay = new Date(year, month, 0).getDate();
        filters = { 
          start: `${year}-${String(month).padStart(2, '0')}-01`, 
          end: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}` 
        };
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        periodLabel = `${monthNames[month - 1]} ${year}`;
        fileSlug = `Monthly_${year}_${month}`;
      } else if (this.reportType === 'annual') {
        const year = inputVal;
        filters = { 
          start: `${year}-01-01`, 
          end: `${year}-12-31` 
        };
        periodLabel = `Year ${year}`;
        fileSlug = `Annual_${year}`;
      }

      const data = await window.api.getReportSummary(filters);
      
      const margin = data.sales.amount > 0 ? (data.sales.profit / data.sales.amount * 100).toFixed(2) : '0.00';
      const netProfit = data.sales.profit - data.expenses.amount;

      const html = `
          <div class="receipt-80mm" style="width: 100%; max-width: 780px; margin: 0 auto; padding: 20px 24px; background: #fff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #000; box-sizing: border-box; font-size: 13px; line-height: 1.5; border: 1.5px solid #000; border-radius: 8px; -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision;">
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 14px;">
                  <h1 style="font-size: 26px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.8px; color: #000; line-height: 1.2; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${this.settings.company_name || 'Akhtar & Sons'}</h1>
                  <div style="margin-top: 6px;">
                      <span style="display: inline-block; border: 1.5px solid #000; padding: 3px 18px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; border-radius: 4px; color: #000; background: #fff;">FINANCIAL REPORT &bull; ${this.reportType.toUpperCase()}</span>
                  </div>
              </div>
              
              <!-- Metadata Card -->
              <div style="display: flex; justify-content: space-between; gap: 20px; font-size: 12.5px; line-height: 1.6; color: #000; margin-bottom: 14px; background: #fff; padding: 8px 12px; border-radius: 6px; border: 1px solid #000;">
                  <div><span style="font-weight: 700; color: #000;">Report Period:</span> <span style="font-weight: 700; color: #000;">${periodLabel}</span></div>
                  <div><span style="font-weight: 700; color: #000;">Generated At:</span> <span style="font-weight: 500; color: #000;">${app.formatDateTime(new Date().toISOString())}</span></div>
              </div>

              <!-- Sales Summary Section -->
              <div style="margin-bottom: 14px;">
                  <div style="padding: 5px 8px; font-weight: 800; text-align: left; background: #fff; border: 1.5px solid #000; border-radius: 4px; margin-bottom: 6px; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px; color: #000;">SALES SUMMARY</div>
                  <table style="width: 100%; font-size: 12.5px; border-collapse: collapse; color: #000; line-height: 1.7;">
                      <tr style="border-bottom: 1px solid #000;"><td style="padding: 4px 6px; color: #000;">Total Invoices:</td><td style="text-align: right; font-weight: 600; padding: 4px 6px; color: #000;">${data.sales.count}</td></tr>
                      <tr style="border-bottom: 1px solid #000;"><td style="padding: 4px 6px; color: #000;">Total Items Sold:</td><td style="text-align: right; font-weight: 600; padding: 4px 6px; color: #000;">${data.sales.itemsSold}</td></tr>
                      <tr style="border-bottom: 1px solid #000;"><td style="padding: 4px 6px; color: #000;">Total Sell Amount:</td><td style="text-align: right; font-weight: 600; padding: 4px 6px; color: #000;">${app.formatCurrency(data.sales.amount)}</td></tr>
                      <tr style="border-bottom: 1px solid #000;"><td style="padding: 4px 6px; color: #000;">Total Inventory Cost:</td><td style="text-align: right; font-weight: 600; padding: 4px 6px; color: #000;">${app.formatCurrency(data.sales.cost)}</td></tr>
                      <tr style="border-top: 1.5px solid #000; border-bottom: 1px solid #000;"><td style="padding: 5px 6px; font-weight: 800; color: #000;">Gross Profit:</td><td style="text-align: right; font-weight: 800; padding: 5px 6px; color: #000;">${app.formatCurrency(data.sales.profit)}</td></tr>
                      <tr><td style="padding: 4px 6px; color: #000;">Profit Margin:</td><td style="text-align: right; font-weight: 600; padding: 4px 6px; color: #000;">${margin}%</td></tr>
                  </table>
              </div>

              <!-- Expenses Summary Section -->
              <div style="margin-bottom: 14px;">
                  <div style="padding: 5px 8px; font-weight: 800; text-align: left; background: #fff; border: 1.5px solid #000; border-radius: 4px; margin-bottom: 6px; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px; color: #000;">EXPENSES & PURCHASES</div>
                  <table style="width: 100%; font-size: 12.5px; border-collapse: collapse; color: #000; line-height: 1.7;">
                      <tr style="border-bottom: 1px solid #000;"><td style="padding: 4px 6px; color: #000;">Total Expense / Purchase Amount:</td><td style="text-align: right; font-weight: 600; padding: 4px 6px; color: #000;">${app.formatCurrency(data.expenses.amount)}</td></tr>
                      <tr><td style="padding: 4px 6px; color: #000;">Total Transactions:</td><td style="text-align: right; font-weight: 600; padding: 4px 6px; color: #000;">${data.expenses.count}</td></tr>
                  </table>
              </div>

              <!-- Company Balances Section -->
              <div style="margin-bottom: 14px;">
                  <div style="padding: 5px 8px; font-weight: 800; text-align: left; background: #fff; border: 1.5px solid #000; border-radius: 4px; margin-bottom: 6px; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px; color: #000;">SUPPLIER / COMPANY BALANCES</div>
                  <table style="width: 100%; font-size: 12.5px; border-collapse: collapse; color: #000; line-height: 1.7;">
                      <tr style="border-bottom: 1px solid #000;"><td style="padding: 4px 6px; color: #000;">Total Accounts Payable:</td><td style="text-align: right; font-weight: 600; padding: 4px 6px; color: #000;">${app.formatCurrency(data.vendors.amount)}</td></tr>
                      <tr><td style="padding: 4px 6px; color: #000;">Active Companies Count:</td><td style="text-align: right; font-weight: 600; padding: 4px 6px; color: #000;">${data.vendors.count}</td></tr>
                  </table>
              </div>

              <!-- Net Summary Box -->
              <div style="margin-top: 16px; border: 1.5px solid #000; border-radius: 6px; overflow: hidden; background: #fff;">
                  <div style="background: #fff; color: #000; border-bottom: 1.5px solid #000; padding: 6px 12px; font-weight: 800; text-align: center; text-transform: uppercase; font-size: 13px; letter-spacing: 0.5px;">NET FINANCIAL SUMMARY</div>
                  <table style="width: 100%; font-size: 13px; border-collapse: collapse; color: #000; line-height: 1.8; padding: 8px;">
                      <tr style="border-bottom: 1px solid #000;"><td style="padding: 6px 12px; color: #000;">Gross Profit:</td><td style="text-align: right; font-weight: 600; padding: 6px 12px; color: #000;">${app.formatCurrency(data.sales.profit)}</td></tr>
                      <tr style="border-bottom: 1px solid #000;"><td style="padding: 6px 12px; color: #000;">Total Operating Expenses:</td><td style="text-align: right; font-weight: 600; padding: 6px 12px; color: #000;">(${app.formatCurrency(data.expenses.amount)})</td></tr>
                      <tr style="background: #fff; border-top: 1.5px solid #000;"><td style="padding: 8px 12px; font-weight: 800; font-size: 15px; color: #000;">NET ${netProfit >= 0 ? 'PROFIT' : 'LOSS'}:</td><td style="text-align: right; font-weight: 800; font-size: 16px; padding: 8px 12px; color: #000;">${netProfit < 0 ? '(' : ''}${app.formatCurrency(Math.abs(netProfit))}${netProfit < 0 ? ')' : ''}</td></tr>
                  </table>
              </div>

              <!-- Footer -->
              <div style="margin-top: 16px; border-top: 1.5px solid #000; padding-top: 8px; text-align: center; font-size: 11px; color: #000;">
                  <p style="margin: 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #000;">*** END OF REPORT ***</p>
              </div>
          </div>
      `;

      app.hideLoading();
      await app.savePDF({
        html: html,
        defaultFilename: `Financial_Report_${fileSlug}.pdf`,
        title: `Save ${this.reportType.toUpperCase()} Financial Report as PDF`
      });
    } catch (err) {
      console.error(err);
      app.hideLoading();
      app.showAlert("Failed to export Financial Report as PDF.");
    }
  }
};
