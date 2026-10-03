const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db;

function getDbPath() {
  const userDataPath = (app && app.getPath) ? app.getPath('userData') : (process.env.APPDATA ? path.join(process.env.APPDATA, 'akhtar-and-sons') : __dirname);
  return path.join(userDataPath, 'saad.db');
}

function init() {
  const dbPath = getDbPath();
  db = new Database(dbPath, { verbose: console.log });
  
  createTables();
  seedInitialData();

  // Auto-migrate company name setting to Akhtar & Sons
  try {
    db.prepare("UPDATE settings SET value = 'Akhtar & Sons' WHERE key = 'company_name'").run();
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('company_name', ?)").run('Akhtar & Sons');
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('address', ?)").run('B-99, Lalarukh Basti, Wah Cantt');
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('phone', ?)").run('0310-5123788');

    // Seed default salesmen if not set or empty
    const currentSalesmen = db.prepare("SELECT value FROM settings WHERE key = 'sellers_list'").get();
    if (!currentSalesmen || !currentSalesmen.value || currentSalesmen.value === '[]') {
      const defaultSalesmen = [
        { name: 'Ifrahim', phone: '0329-9934620' },
        { name: 'Muhammad Ali', phone: '0300-1234567' },
        { name: 'Usman Tariq', phone: '0312-7654321' },
        { name: 'Bilal Ahmed', phone: '0333-9876543' },
        { name: 'Hamza Khan', phone: '0345-5432167' },
        { name: 'Zain Malik', phone: '0321-1122334' }
      ];
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('sellers_list', ?)").run(JSON.stringify(defaultSalesmen));
    }

    // Seed default shops if empty
    const shopCount = db.prepare("SELECT COUNT(*) as c FROM shops").get().c;
    if (shopCount === 0) {
      const defaultShops = [
        { name: 'Parking Canteen', owner_name: 'Asif Khan', phone: '0329-9934620', address: 'Wah Cantt', city: 'Wah Cantt' },
        { name: 'Al-Madina Mart', owner_name: 'Haji Rafiq', phone: '0312-3456789', address: 'Faisal Iqbal Town', city: 'Wah Cantt' },
        { name: 'Quaid Super Store', owner_name: 'Usman Ali', phone: '0321-5554321', address: 'Quaid Avenue', city: 'Wah Cantt' },
        { name: 'Bismillah General Store', owner_name: 'Tariq Mahmood', phone: '0300-9876543', address: 'Lala Rukh', city: 'Wah Cantt' },
        { name: 'Gulshan Bakers & Mart', owner_name: 'Bilal Sheikh', phone: '0333-8889990', address: 'Gulshan Colony', city: 'Wah Cantt' },
        { name: 'New Shaheen Cash & Carry', owner_name: 'Zafar Iqbal', phone: '0315-7776655', address: 'Main Bazar', city: 'Wah Cantt' }
      ];
      const shopStmt = db.prepare("INSERT INTO shops (name, owner_name, phone, address, city, amount) VALUES (?, ?, ?, ?, ?, 0)");
      defaultShops.forEach(s => shopStmt.run(s.name, s.owner_name, s.phone, s.address, s.city));
    }

    // Auto-migrate category labels to Akhtar & Sons FMCG categories
    const defaultCategories = [
      { slug: 'panels', label: 'Biscuits' },
      { slug: 'inverters', label: 'Cold Drinks' },
      { slug: 'structures', label: 'Jellies & Candies' },
      { slug: 'cables', label: 'Snacks & Chips' },
      { slug: 'breakers', label: 'Chocolates' },
      { slug: 'batteries', label: 'Dairy & Groceries' },
      { slug: 'misc', label: 'Juices & Beverages' },
      { slug: 'others', label: 'General Items' }
    ];
    const solarKeywords = ['panel', 'solar', 'inverter', 'structure', 'cable', 'breaker', 'battery'];
    const currentLabels = db.prepare("SELECT * FROM category_labels").all();
    currentLabels.forEach(cl => {
      if (solarKeywords.some(k => (cl.label || '').toLowerCase().includes(k))) {
        const match = defaultCategories.find(dl => dl.slug === cl.slug);
        if (match) {
          db.prepare("UPDATE category_labels SET label = ? WHERE slug = ?").run(match.label, match.slug);
        }
      }
    });
    defaultCategories.forEach(l => {
      const exists = db.prepare("SELECT id FROM category_labels WHERE slug = ?").get(l.slug);
      if (!exists) {
        db.prepare("INSERT INTO category_labels (slug, label) VALUES (?, ?)").run(l.slug, l.label);
      }
    });
  } catch (e) {
    console.error("Failed to auto-update settings/shops/categories:", e);
  }
}

function createTables() {
  // Settings & App Storage
  db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
  db.exec(`CREATE TABLE IF NOT EXISTS app_kv_store (key TEXT PRIMARY KEY, value TEXT)`);
  db.exec(`CREATE TABLE IF NOT EXISTS category_labels (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE, label TEXT)`);
  db.exec(`CREATE TABLE IF NOT EXISTS product_units (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)`);

  // Check if we already have categories. If not, this is a fresh DB, create standard tables.
  const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='category_labels'").get();
  const hasCategories = tableExists && db.prepare("SELECT COUNT(*) as c FROM category_labels").get().c > 0;

  if (!hasCategories) {
    // Initial Products Tables
    db.exec(`CREATE TABLE IF NOT EXISTS products_panels (id INTEGER PRIMARY KEY AUTOINCREMENT, brand TEXT, wattage TEXT, description TEXT, current_stock INTEGER, unit TEXT, cost_price REAL, retail_price REAL, wholesale_cost_price REAL DEFAULT 0, wholesale_price REAL DEFAULT 0)`);
    db.exec(`CREATE TABLE IF NOT EXISTS products_inverters (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT, brand TEXT, model TEXT, description TEXT, current_stock INTEGER, unit TEXT, cost_price REAL, retail_price REAL, wholesale_cost_price REAL DEFAULT 0, wholesale_price REAL DEFAULT 0)`);
    db.exec(`CREATE TABLE IF NOT EXISTS products_structures (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, description TEXT, current_stock INTEGER, unit TEXT, cost_price REAL, retail_price REAL, wholesale_cost_price REAL DEFAULT 0, wholesale_price REAL DEFAULT 0)`);
    db.exec(`CREATE TABLE IF NOT EXISTS products_cables (id INTEGER PRIMARY KEY AUTOINCREMENT, brand TEXT, size TEXT, description TEXT, current_stock INTEGER, unit TEXT, cost_price REAL, retail_price REAL, wholesale_cost_price REAL DEFAULT 0, wholesale_price REAL DEFAULT 0)`);
    db.exec(`CREATE TABLE IF NOT EXISTS products_breakers (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, brand TEXT, spec TEXT, description TEXT, current_stock INTEGER, unit TEXT, cost_price REAL, retail_price REAL, wholesale_cost_price REAL DEFAULT 0, wholesale_price REAL DEFAULT 0)`);
    db.exec(`CREATE TABLE IF NOT EXISTS products_batteries (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT, brand TEXT, model TEXT, description TEXT, current_stock INTEGER, unit TEXT, cost_price REAL, retail_price REAL, wholesale_cost_price REAL DEFAULT 0, wholesale_price REAL DEFAULT 0)`);
    db.exec(`CREATE TABLE IF NOT EXISTS products_misc (id INTEGER PRIMARY KEY AUTOINCREMENT, item_name TEXT, type TEXT, description TEXT, current_stock INTEGER, unit TEXT, cost_price REAL, retail_price REAL, wholesale_cost_price REAL DEFAULT 0, wholesale_price REAL DEFAULT 0)`);
    db.exec(`CREATE TABLE IF NOT EXISTS products_others (id INTEGER PRIMARY KEY AUTOINCREMENT, item_name TEXT, description TEXT, current_stock INTEGER, unit TEXT, cost_price REAL, retail_price REAL, wholesale_cost_price REAL DEFAULT 0, wholesale_price REAL DEFAULT 0)`);
  }

  // Migration: Add columns if missing to ALL product tables
  const productTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'products_%'").all();
  productTables.forEach(row => {
    const tableName = row.name;
    const cat = tableName.replace('products_', '');

    const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const columns = tableInfo.map(c => c.name);
    
    if (!columns.includes('item_name')) {
        try { 
          db.exec(`ALTER TABLE ${tableName} ADD COLUMN item_name TEXT`);
          // Migration: Populate item_name from old fields
          if (cat === 'panels') db.exec(`UPDATE products_panels SET item_name = brand || ' ' || wattage`);
          else if (cat === 'inverters' || cat === 'batteries') db.exec(`UPDATE products_${cat} SET item_name = brand || ' ' || model`);
          else if (cat === 'structures') db.exec(`UPDATE products_structures SET item_name = type`);
          else if (cat === 'cables') db.exec(`UPDATE products_cables SET item_name = brand || ' ' || size`);
          else if (cat === 'breakers') db.exec(`UPDATE products_breakers SET item_name = type || ' ' || brand`);
        } catch(e) {}
    }
    if (columns.includes('item_name')) {
      try {
        if (cat === 'panels') db.exec(`UPDATE products_panels SET item_name = brand || ' ' || wattage WHERE item_name IS NULL`);
        else if (cat === 'inverters' || cat === 'batteries') db.exec(`UPDATE products_${cat} SET item_name = brand || ' ' || model WHERE item_name IS NULL`);
        else if (cat === 'structures') db.exec(`UPDATE products_structures SET item_name = type WHERE item_name IS NULL`);
        else if (cat === 'cables') db.exec(`UPDATE products_cables SET item_name = brand || ' ' || size WHERE item_name IS NULL`);
        else if (cat === 'breakers') db.exec(`UPDATE products_breakers SET item_name = type || ' ' || brand WHERE item_name IS NULL`);
      } catch(e) {}
    }
    if (!columns.includes('description')) {
        try { db.exec(`ALTER TABLE ${tableName} ADD COLUMN description TEXT`); } catch(e) {}
    }
    if (!columns.includes('current_stock')) {
        try { db.exec(`ALTER TABLE ${tableName} ADD COLUMN current_stock INTEGER DEFAULT 0`); } catch(e) {}
    }
    if (!columns.includes('unit')) {
        try { db.exec(`ALTER TABLE ${tableName} ADD COLUMN unit TEXT DEFAULT 'pcs'`); } catch(e) {}
    }
    if (!columns.includes('company_id')) {
        try { db.exec(`ALTER TABLE ${tableName} ADD COLUMN company_id INTEGER`); } catch(e) {}
    }
    if (!columns.includes('wholesale_cost_price')) {
        try { 
          db.exec(`ALTER TABLE ${tableName} ADD COLUMN wholesale_cost_price REAL DEFAULT 0`);
          db.exec(`UPDATE ${tableName} SET wholesale_cost_price = cost_price WHERE wholesale_cost_price IS NULL OR wholesale_cost_price = 0`);
        } catch(e) {}
    }
    if (!columns.includes('wholesale_price')) {
        try { 
          db.exec(`ALTER TABLE ${tableName} ADD COLUMN wholesale_price REAL DEFAULT 0`);
          db.exec(`UPDATE ${tableName} SET wholesale_price = retail_price WHERE wholesale_price IS NULL OR wholesale_price = 0`);
        } catch(e) {}
    }
    if (!columns.includes('pieces_per_carton')) {
        try { 
          db.exec(`ALTER TABLE ${tableName} ADD COLUMN pieces_per_carton INTEGER DEFAULT NULL`);
        } catch(e) {}
    }
  });

  db.exec(`CREATE TABLE IF NOT EXISTS product_units (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)`);
  db.exec(`DELETE FROM product_units WHERE name IN ('BAG', 'FEET', 'RUNNING FEET', 'KG', 'LITER', 'METER', 'COTTON')`);
  ['CARTON', 'PCS', 'SET'].forEach(u => {
    try { db.prepare('INSERT OR IGNORE INTO product_units (name) VALUES (?)').run(u); } catch(e) {}
  });

  // Proposals
  db.exec(`CREATE TABLE IF NOT EXISTS proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    proposal_number TEXT, 
    customer_name TEXT, 
    location TEXT, 
    phone TEXT, 
    date TEXT, 
    retail_total REAL, 
    cost_total REAL, 
    profit REAL, 
    status TEXT, 
    received_amount REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    seller_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Force columns if missing (Migrations)
  const tableInfo = db.prepare("PRAGMA table_info(proposals)").all();
  const columns = tableInfo.map(c => c.name);
  if (!columns.includes('received_amount')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN received_amount REAL DEFAULT 0'); } catch(e) { console.error("Migration failed (received_amount):", e); }
  }
  if (!columns.includes('discount')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN discount REAL DEFAULT 0'); } catch(e) { console.error("Migration failed (discount):", e); }
  }
  if (!columns.includes('seller_name')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN seller_name TEXT'); } catch(e) { console.error("Migration failed (seller_name):", e); }
  }
  if (!columns.includes('created_at')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP'); } catch(e) { console.error("Migration failed (created_at):", e); }
  }
  if (!columns.includes('booking_day')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN booking_day TEXT'); } catch(e) {}
  }
  if (!columns.includes('delivery_day')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN delivery_day TEXT'); } catch(e) {}
  }
  if (!columns.includes('shop_id')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN shop_id INTEGER'); } catch(e) {}
  }
  if (!columns.includes('shop_name')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN shop_name TEXT'); } catch(e) {}
  }
  if (!columns.includes('shop_address')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN shop_address TEXT'); } catch(e) {}
  }
  if (!columns.includes('salesman_name')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN salesman_name TEXT'); } catch(e) {}
  }
  if (!columns.includes('salesman_contact')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN salesman_contact TEXT'); } catch(e) {}
  }
  if (!columns.includes('sys_rating')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN sys_rating TEXT'); } catch(e) { console.error("Migration failed (sys_rating):", e); }
  }
  if (!columns.includes('sys_type')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN sys_type TEXT'); } catch(e) { console.error("Migration failed (sys_type):", e); }
  }
  if (!columns.includes('pv_rating')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN pv_rating TEXT'); } catch(e) { console.error("Migration failed (pv_rating):", e); }
  }
  if (!columns.includes('inverter')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN inverter TEXT'); } catch(e) { console.error("Migration failed (inverter):", e); }
  }
  if (!columns.includes('payment_method')) {
    try { db.exec("ALTER TABLE proposals ADD COLUMN payment_method TEXT DEFAULT 'Cash'"); } catch(e) { console.error("Migration failed (payment_method):", e); }
  }
  if (!columns.includes('tax_percent')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN tax_percent REAL DEFAULT 0.5'); } catch(e) {}
  }
  if (!columns.includes('tax_amount')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN tax_amount REAL DEFAULT 0'); } catch(e) {}
  }
  if (!columns.includes('subtotal')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN subtotal REAL DEFAULT 0'); } catch(e) {}
  }
  if (!columns.includes('sale_mode')) {
    try { db.exec("ALTER TABLE proposals ADD COLUMN sale_mode TEXT DEFAULT 'retail'"); } catch(e) { console.error("Migration failed (sale_mode):", e); }
  }
  if (!columns.includes('shop_previous_balance')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN shop_previous_balance REAL DEFAULT 0'); } catch(e) { console.error("Migration failed (shop_previous_balance):", e); }
  }
  if (!columns.includes('include_prev_balance')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN include_prev_balance INTEGER DEFAULT 1'); } catch(e) { console.error("Migration failed (include_prev_balance):", e); }
  }
  if (!columns.includes('cnic_ntn')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN cnic_ntn TEXT'); } catch(e) {}
  }
  if (!columns.includes('ntn')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN ntn TEXT'); } catch(e) {}
  }
  if (!columns.includes('pending_amount')) {
    try { db.exec('ALTER TABLE proposals ADD COLUMN pending_amount REAL DEFAULT 0'); } catch(e) {}
  }

  // Same for expenses
  const expInfo = db.prepare("PRAGMA table_info(expenses)").all().map(c => c.name);
  if (!expInfo.includes('created_at')) {
    try { db.exec('ALTER TABLE expenses ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP'); } catch(e) {}
  }

  // Same for employees 
  const empInfo = db.prepare("PRAGMA table_info(employees)").all().map(c => c.name);
  if (!empInfo.includes('created_at')) {
    try { db.exec('ALTER TABLE employees ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP'); } catch(e) {}
  }
  if (!empInfo.includes('date_inactive')) {
    try { db.exec('ALTER TABLE employees ADD COLUMN date_inactive TEXT'); } catch(e) {}
  }

  db.exec(`CREATE TABLE IF NOT EXISTS proposal_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    proposal_id INTEGER, 
    item_id INTEGER,
    section TEXT, 
    description TEXT, 
    qty REAL, 
    unit_cost REAL, 
    unit_retail REAL, 
    line_cost REAL, 
    line_retail REAL, 
    line_profit REAL,
    FOREIGN KEY(proposal_id) REFERENCES proposals(id) ON DELETE CASCADE
  )`);

  // Migration: Add item_id if missing
  try { db.exec('ALTER TABLE proposal_items ADD COLUMN item_id INTEGER'); } catch(e) {}
  try { db.exec('ALTER TABLE proposal_items ADD COLUMN unit_discounted REAL'); } catch(e) {}
  try { db.exec('ALTER TABLE proposal_items ADD COLUMN unit TEXT'); } catch(e) {}

  // Expenses
  db.exec(`CREATE TABLE IF NOT EXISTS expense_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)`);
  db.exec(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    date TEXT, 
    category TEXT, 
    amount REAL, 
    description TEXT, 
    paid_by TEXT, 
    notes TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Employees
  db.exec(`CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    full_name TEXT, 
    role TEXT, 
    phone TEXT, 
    email TEXT, 
    date_joined TEXT, 
    salary REAL, 
    status TEXT, 
    notes TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Companies
  db.exec(`CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    name TEXT, 
    description TEXT, 
    amount REAL DEFAULT 0, 
    phone TEXT, 
    email TEXT, 
    address TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Customers
  db.exec(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    name TEXT, 
    description TEXT, 
    amount REAL DEFAULT 0, 
    phone TEXT, 
    email TEXT, 
    address TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Shops
  db.exec(`CREATE TABLE IF NOT EXISTS shops (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    name TEXT, 
    owner_name TEXT, 
    phone TEXT, 
    ntn TEXT,
    address TEXT, 
    city TEXT DEFAULT 'Wah Cantt', 
    amount REAL DEFAULT 0, 
    notes TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Migration for shops
  try {
    const shopCols = db.prepare("PRAGMA table_info(shops)").all().map(c => c.name);
    if (!shopCols.includes('owner_name')) db.exec('ALTER TABLE shops ADD COLUMN owner_name TEXT');
    if (!shopCols.includes('city')) db.exec("ALTER TABLE shops ADD COLUMN city TEXT DEFAULT 'Wah Cantt'");
    if (!shopCols.includes('notes')) db.exec('ALTER TABLE shops ADD COLUMN notes TEXT');
    if (!shopCols.includes('amount')) db.exec('ALTER TABLE shops ADD COLUMN amount REAL DEFAULT 0');
    if (!shopCols.includes('ntn')) db.exec('ALTER TABLE shops ADD COLUMN ntn TEXT');
  } catch(e) {}

  // Favorites
  db.exec(`CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_slug TEXT,
    product_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_slug, product_id)
  )`);
}

function seedInitialData() {
  const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='products_panels'").get();
  if (!tableExists) return;
  const panelCount = db.prepare('SELECT COUNT(*) as count FROM products_panels').get().count;
  if (panelCount === 0) {
    const productsMaster = {
      panels: [
        { name: 'Prince Chocolate Biscuit', desc: 'Tiffin Pack 48g', stock: 120, unit: 'PACK', cost: 40, retail: 50, wcost: 38, ws: 45 },
        { name: 'TUC Salted Crackers', desc: 'Half Roll 40g', stock: 150, unit: 'PACK', cost: 35, retail: 45, wcost: 33, ws: 40 },
        { name: 'Oreo Original Vanilla', desc: 'Standard Pack 55g', stock: 90, unit: 'PACK', cost: 45, retail: 60, wcost: 42, ws: 52 },
        { name: 'Candi Brown Sugar', desc: 'Family Pack 65g', stock: 110, unit: 'PACK', cost: 40, retail: 50, wcost: 38, ws: 45 },
        { name: 'Sooper Egg & Milk', desc: 'Half Roll 52g', stock: 200, unit: 'PACK', cost: 42, retail: 50, wcost: 40, ws: 46 },
        { name: 'Rio Strawberry Cream', desc: 'Double Treat 50g', stock: 130, unit: 'PACK', cost: 35, retail: 45, wcost: 33, ws: 40 },
        { name: 'Zeera Plus Cumin Biscuit', desc: 'Family Pack 70g', stock: 100, unit: 'PACK', cost: 40, retail: 50, wcost: 38, ws: 45 },
        { name: 'Gala Egg Biscuit', desc: 'Half Roll 45g', stock: 95, unit: 'PACK', cost: 35, retail: 45, wcost: 33, ws: 40 }
      ],
      inverters: [
        { name: 'Coca-Cola 500ml Pet', desc: 'Regular Cold Beverage', stock: 96, unit: 'BOTTLE', cost: 65, retail: 85, wcost: 60, ws: 75 },
        { name: 'Coca-Cola 1.5L Pet', desc: 'Family Sharing Bottle', stock: 60, unit: 'BOTTLE', cost: 140, retail: 180, wcost: 130, ws: 160 },
        { name: 'Sprite 500ml Pet', desc: 'Lemon Lime Soda', stock: 84, unit: 'BOTTLE', cost: 65, retail: 85, wcost: 60, ws: 75 },
        { name: 'Sprite 1.5L Pet', desc: 'Family Lemon Lime', stock: 48, unit: 'BOTTLE', cost: 140, retail: 180, wcost: 130, ws: 160 },
        { name: 'Fanta Orange 500ml Pet', desc: 'Orange Carbonated Drink', stock: 72, unit: 'BOTTLE', cost: 65, retail: 85, wcost: 60, ws: 75 },
        { name: 'Pepsi 500ml Pet', desc: 'Chilled Cola 500ml', stock: 96, unit: 'BOTTLE', cost: 65, retail: 85, wcost: 60, ws: 75 },
        { name: 'Pepsi 1.5L Pet', desc: 'Family Pack 1.5 Litre', stock: 50, unit: 'BOTTLE', cost: 140, retail: 180, wcost: 130, ws: 160 },
        { name: 'Sting Berry Blast 300ml', desc: 'Energy Drink Pet', stock: 120, unit: 'BOTTLE', cost: 50, retail: 65, wcost: 45, ws: 58 }
      ],
      structures: [
        { name: 'Hilal Ding Dong Bubble Gum', desc: 'Cat Edition Bubblegum', stock: 300, unit: 'PCS', cost: 4, retail: 5, wcost: 3.5, ws: 4.5 },
        { name: 'Hilal Jelly Berry Strawberry', desc: 'Soft Fruit Jelly Pack', stock: 160, unit: 'PACK', cost: 20, retail: 30, wcost: 18, ws: 25 },
        { name: 'Fruity Gummy Bears Jelly', desc: 'Assorted Fruity Bears', stock: 100, unit: 'PACK', cost: 35, retail: 50, wcost: 30, ws: 42 },
        { name: 'Mitchell Milk Toffee Pouch', desc: 'Creamy Milk Toffee', stock: 70, unit: 'PACK', cost: 80, retail: 100, wcost: 75, ws: 90 },
        { name: 'Cocomo Chocolate Bites', desc: 'Filled Chocolate Biscuits', stock: 240, unit: 'PACK', cost: 18, retail: 25, wcost: 16, ws: 22 },
        { name: 'Chupa Chups Lollipop', desc: 'Assorted Fruit Flavors', stock: 200, unit: 'PCS', cost: 20, retail: 30, wcost: 18, ws: 25 },
        { name: 'Super Sour Worms Jelly', desc: 'Tangy Sour Gummy Worms', stock: 80, unit: 'PACK', cost: 40, retail: 60, wcost: 36, ws: 50 }
      ],
      cables: [
        { name: 'Lays Masala 35g', desc: 'Wavy Potato Chips', stock: 120, unit: 'PACK', cost: 40, retail: 50, wcost: 38, ws: 45 },
        { name: 'Lays French Cheese 35g', desc: 'Smooth Cheese Chips', stock: 110, unit: 'PACK', cost: 40, retail: 50, wcost: 38, ws: 45 },
        { name: 'Lays Wavy Salted 35g', desc: 'Classic Salted Chips', stock: 90, unit: 'PACK', cost: 40, retail: 50, wcost: 38, ws: 45 },
        { name: 'Kurkure Chutney Chaska', desc: 'Spicy Crispy Snacks', stock: 100, unit: 'PACK', cost: 40, retail: 50, wcost: 38, ws: 45 },
        { name: 'Kolson Slanty Jalapeno', desc: 'Salted & Spicy Rings', stock: 90, unit: 'PACK', cost: 40, retail: 50, wcost: 38, ws: 45 },
        { name: 'Cheetos Cheese Puffs', desc: 'Crunchy Puffed Corn', stock: 95, unit: 'PACK', cost: 40, retail: 50, wcost: 38, ws: 45 }
      ],
      breakers: [
        { name: 'Cadbury Dairy Milk 24g', desc: 'Pure Milk Chocolate Bar', stock: 100, unit: 'PCS', cost: 70, retail: 90, wcost: 65, ws: 80 },
        { name: 'Cadbury Dairy Milk Silk 60g', desc: 'Smooth Melt Chocolate', stock: 60, unit: 'PCS', cost: 180, retail: 230, wcost: 170, ws: 210 },
        { name: 'KitKat 4 Finger 41.5g', desc: 'Crispy Wafer Finger Bar', stock: 80, unit: 'PCS', cost: 130, retail: 160, wcost: 120, ws: 145 },
        { name: 'Snickers Classic Bar 50g', desc: 'Peanut Caramel Nougat', stock: 70, unit: 'PCS', cost: 140, retail: 180, wcost: 130, ws: 160 },
        { name: 'Mars Chocolate Bar 51g', desc: 'Caramel & Nougat Bar', stock: 65, unit: 'PCS', cost: 140, retail: 180, wcost: 130, ws: 160 },
        { name: 'Perk Chocolate Wafer', desc: 'Crisp Chocolate Wafer 18g', stock: 140, unit: 'PCS', cost: 22, retail: 30, wcost: 20, ws: 26 }
      ],
      batteries: [
        { name: 'Olpers Milk 1L Tetra Pak', desc: 'Full Cream UHT Milk', stock: 80, unit: 'PACK', cost: 270, retail: 295, wcost: 265, ws: 285 },
        { name: 'MilkPak Full Cream 1L', desc: 'Nestle Fresh Dairy Milk', stock: 70, unit: 'PACK', cost: 270, retail: 295, wcost: 265, ws: 285 },
        { name: 'Everyday Milk Powder 375g', desc: 'Tea Whitener Pouch', stock: 45, unit: 'PACK', cost: 490, retail: 560, wcost: 475, ws: 530 },
        { name: 'Dawn White Bread Large', desc: 'Fresh Sliced Daily Bread', stock: 30, unit: 'PACK', cost: 130, retail: 150, wcost: 125, ws: 140 },
        { name: 'Nurpur Butter 200g', desc: 'Pure Salted Cream Butter', stock: 40, unit: 'PACK', cost: 320, retail: 370, wcost: 310, ws: 350 }
      ],
      misc: [
        { name: 'Nestle Fruita Vitals Mango 1L', desc: 'Premium Fruit Nectar', stock: 50, unit: 'PACK', cost: 280, retail: 330, wcost: 270, ws: 310 },
        { name: 'Nestle Fruita Vitals Apple 1L', desc: 'Pure Apple Juice', stock: 45, unit: 'PACK', cost: 280, retail: 330, wcost: 270, ws: 310 },
        { name: 'Slice Mango Juice 200ml', desc: 'Thick Mango Nectar Tetra', stock: 120, unit: 'PACK', cost: 45, retail: 60, wcost: 42, ws: 52 },
        { name: 'Shezan Mango Tetra 250ml', desc: 'Chilled Mango Drink', stock: 96, unit: 'PACK', cost: 40, retail: 50, wcost: 37, ws: 45 },
        { name: 'Rooh Afza 800ml Bottle', desc: 'Herbal Summer Syrup', stock: 40, unit: 'BOTTLE', cost: 380, retail: 450, wcost: 370, ws: 420 }
      ],
      others: [
        { name: 'Tapal Danedar Tea 400g', desc: 'Premium Blend Tea Pouch', stock: 60, unit: 'PACK', cost: 620, retail: 700, wcost: 600, ws: 660 },
        { name: 'National Iodized Salt 800g', desc: 'Refined Table Salt', stock: 100, unit: 'PACK', cost: 45, retail: 60, wcost: 40, ws: 52 },
        { name: 'Surf Excel Quick Wash 500g', desc: 'Detergent Washing Powder', stock: 50, unit: 'PACK', cost: 260, retail: 300, wcost: 250, ws: 280 },
        { name: 'Lifebuoy Total Soap 115g', desc: 'Antibacterial Red Soap', stock: 120, unit: 'PCS', cost: 80, retail: 100, wcost: 75, ws: 90 },
        { name: 'Colgate Maximum Protection 100g', desc: 'Fluoride Toothpaste', stock: 55, unit: 'PACK', cost: 160, retail: 200, wcost: 150, ws: 180 }
      ]
    };

    Object.entries(productsMaster).forEach(([slug, list]) => {
      const pStmt = db.prepare(`INSERT INTO products_${slug} (item_name, description, current_stock, unit, cost_price, retail_price, wholesale_cost_price, wholesale_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      list.forEach(item => {
        pStmt.run(item.name, item.desc, item.stock, item.unit, item.cost, item.retail, item.wcost, item.ws);
      });
    });

    // Initialize default setting
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('company_name', 'Akhtar & Sons');
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('address', 'B-99, Lalarukh Basti, Wah Cantt');
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('phone', '0310-5123788');

    // Default categories
    const cats = ['Office', 'Transport', 'Utilities', 'Salaries', 'Purchase', 'Other'];
    const expenseStmt = db.prepare('INSERT OR IGNORE INTO expense_categories (name) VALUES (?)');
    cats.forEach(c => expenseStmt.run(c));

    // Default product labels (General Store)
    const productLabels = [
        { slug: 'panels', label: 'Biscuits' },
        { slug: 'inverters', label: 'Cold Drinks' },
        { slug: 'structures', label: 'Jellies & Candies' },
        { slug: 'cables', label: 'Snacks & Chips' },
        { slug: 'breakers', label: 'Chocolates' },
        { slug: 'batteries', label: 'Dairy & Groceries' },
        { slug: 'misc', label: 'Juices & Beverages' },
        { slug: 'others', label: 'General Items' }
    ];
    const labelStmt = db.prepare('INSERT OR IGNORE INTO category_labels (slug, label) VALUES (?, ?)');
    productLabels.forEach(l => labelStmt.run(l.slug, l.label));

    // Default units
    db.exec(`DELETE FROM product_units WHERE name IN ('FEET', 'RUNNING FEET', 'METER', 'COTTON')`);
    const productUnits = ['PACK', 'PCS', 'BOX', 'BOTTLE', 'CARTON', 'SET'];
    const unitStmt = db.prepare('INSERT OR IGNORE INTO product_units (name) VALUES (?)');
    productUnits.forEach(u => unitStmt.run(u));
  }
}

// ------ SETTINGS ------
function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);
  return settings;
}

function saveSettings(data) {
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const transaction = db.transaction(() => {
    for (const [key, value] of Object.entries(data)) {
      stmt.run(key, value);
    }
  });
  transaction();
}

// ------ APP KV STORAGE ------
function getAllKv() {
  try {
    return db.prepare('SELECT key, value FROM app_kv_store').all();
  } catch (e) {
    return [];
  }
}

function setKv(key, value) {
  try {
    const val = typeof value === 'string' ? value : JSON.stringify(value);
    db.prepare('INSERT OR REPLACE INTO app_kv_store (key, value) VALUES (?, ?)').run(key, val);
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

function saveAllKv(entries) {
  try {
    const stmt = db.prepare('INSERT OR REPLACE INTO app_kv_store (key, value) VALUES (?, ?)');
    const transaction = db.transaction((items) => {
      for (const [key, value] of Object.entries(items)) {
        const val = typeof value === 'string' ? value : JSON.stringify(value);
        stmt.run(key, val);
      }
    });
    transaction(entries);
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

// ------ PRODUCTS ------
function getProducts(category, companyId = null) {
  let sql = `
    SELECT p.*, c.name as company_name, (f.id IS NOT NULL) as is_favorite 
    FROM products_${category} p
    LEFT JOIN favorites f ON f.category_slug = '${category}' AND f.product_id = p.id
    LEFT JOIN companies c ON c.id = p.company_id
  `;
  
  const params = [];
  if (companyId) {
    sql += ` WHERE p.company_id = ?`;
    params.push(companyId);
  }
  
  sql += ` ORDER BY p.id DESC`;
  return db.prepare(sql).all(...params);
}

function addProduct(category, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map(() => '?').join(', ');
  const info = db.prepare(`INSERT INTO products_${category} (${keys.join(', ')}) VALUES (${placeholders})`).run(...values);
  return info.lastInsertRowid;
}

function updateProduct(category, id, data) {
  const tableInfo = db.prepare(`PRAGMA table_info(products_${category})`).all();
  const columns = tableInfo.map(c => c.name);
  const cleanData = {};
  for (const [key, value] of Object.entries(data)) {
    if (columns.includes(key) && key !== 'id') cleanData[key] = value;
  }
  const updates = Object.keys(cleanData).map(k => `${k} = ?`).join(', ');
  const values = Object.values(cleanData);
  db.prepare(`UPDATE products_${category} SET ${updates} WHERE id = ?`).run(...values, id);
}

function deleteProduct(category, id) {
  db.prepare(`DELETE FROM products_${category} WHERE id = ?`).run(id);
}

function getCategoryLabels() {
  return db.prepare('SELECT * FROM category_labels').all();
}

function updateCategoryLabel(slug, label) {
  db.prepare('UPDATE category_labels SET label = ? WHERE slug = ?').run(label, slug);
}

function searchAllProducts(query, companyId = null) {
    const labels = getCategoryLabels();
    let results = [];
    const qLower = (query || '').toLowerCase().trim();

    labels.forEach(l => {
        const cat = l.slug;
        const categoryLabel = (l.label || cat).replace(/'/g, "''");
        
        let sql = `
            SELECT p.*, c.name as company_name, (f.id IS NOT NULL) as is_favorite, '${cat}' as slug, '${categoryLabel}' as category_name
            FROM products_${cat} p 
            LEFT JOIN favorites f ON f.category_slug = '${cat}' AND f.product_id = p.id
            LEFT JOIN companies c ON c.id = p.company_id
        `;
        let params = [];

        if (qLower) {
            const pStarts = qLower + '%';
            const pWord = '% ' + qLower + '%';
            const pHyphen = '%-' + qLower + '%';
            if (qLower.length >= 3) {
                const qFuzzy = '%' + qLower + '%';
                sql += ` WHERE (LOWER(p.item_name) LIKE ? OR LOWER(p.item_name) LIKE ? OR LOWER(p.item_name) LIKE ? OR LOWER(COALESCE(p.description, '')) LIKE ? OR LOWER(COALESCE(c.name, '')) LIKE ?)`;
                params.push(pStarts, pWord, pHyphen, qFuzzy, qFuzzy);
            } else {
                sql += ` WHERE (LOWER(p.item_name) LIKE ? OR LOWER(p.item_name) LIKE ? OR LOWER(p.item_name) LIKE ?)`;
                params.push(pStarts, pWord, pHyphen);
            }
            if (companyId) {
                sql += ` AND p.company_id = ?`;
                params.push(companyId);
            }
        } else if (companyId) {
            sql += ` WHERE p.company_id = ?`;
            params.push(companyId);
        }

        try {
            const rows = db.prepare(sql).all(...params);
            results = results.concat(rows);
        } catch (err) {
            console.error(`Error querying products_${cat}:`, err);
        }
    });

    if (qLower) {
        results.sort((a, b) => {
            const aName = (a.item_name || '').toLowerCase();
            const bName = (b.item_name || '').toLowerCase();
            
            const aStarts = aName.startsWith(qLower);
            const bStarts = bName.startsWith(qLower);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;

            const aWordStarts = aName.split(/\s+/).some(w => w.startsWith(qLower));
            const bWordStarts = bName.split(/\s+/).some(w => w.startsWith(qLower));
            if (aWordStarts && !bWordStarts) return -1;
            if (!aWordStarts && bWordStarts) return 1;

            return aName.localeCompare(bName);
        });
    } else {
        results.sort((a, b) => (a.item_name || '').localeCompare(b.item_name || ''));
    }

    return results;
}

function toggleFavorite(category, id) {
  const exists = db.prepare('SELECT id FROM favorites WHERE category_slug = ? AND product_id = ?').get(category, id);
  if (exists) {
    db.prepare('DELETE FROM favorites WHERE id = ?').run(exists.id);
    return { status: 'removed' };
  } else {
    db.prepare('INSERT INTO favorites (category_slug, product_id) VALUES (?, ?)').run(category, id);
    return { status: 'added' };
  }
}

function getFavoriteProducts() {
  const labels = getCategoryLabels();
  let results = [];
  labels.forEach(l => {
    const cat = l.slug;
    const sql = `
      SELECT p.*, '${cat}' as slug, 1 as is_favorite 
      FROM products_${cat} p
      INNER JOIN favorites f ON f.category_slug = '${cat}' AND f.product_id = p.id
    `;
    const rows = db.prepare(sql).all();
    results = results.concat(rows);
  });
  return results;
}

function getCategoryStats() {
    const labels = getCategoryLabels();
    return labels.map(l => {
        const count = db.prepare(`SELECT COUNT(*) as c FROM products_${l.slug}`).get().c || 0;
        return { ...l, count };
    });
}

function addCategory(label) {
    const slug = label.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    
    // Check if exists
    const exists = db.prepare('SELECT id FROM category_labels WHERE slug = ?').get(slug);
    if (exists) return { error: 'Category already exists' };

    const transaction = db.transaction(() => {
        db.prepare('INSERT INTO category_labels (slug, label) VALUES (?, ?)').run(slug, label);
        db.exec(`CREATE TABLE products_${slug} (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            item_name TEXT, 
            description TEXT, 
            current_stock INTEGER DEFAULT 0, 
            unit TEXT DEFAULT 'pcs', 
            cost_price REAL DEFAULT 0, 
            retail_price REAL DEFAULT 0,
            wholesale_cost_price REAL DEFAULT 0,
            wholesale_price REAL DEFAULT 0,
            company_id INTEGER,
            pieces_per_carton INTEGER DEFAULT 12
        )`);
    });
    transaction();
    return { success: true, slug };
}

function deleteCategory(slug) {
    const transaction = db.transaction(() => {
        db.prepare('DELETE FROM category_labels WHERE slug = ?').run(slug);
        db.prepare('DELETE FROM favorites WHERE category_slug = ?').run(slug);
        db.exec(`DROP TABLE IF EXISTS products_${slug}`);
    });
    transaction();
    return { success: true };
}

// ------ PROPOSALS ------
function getProposals() {
  return db.prepare('SELECT * FROM proposals ORDER BY id DESC').all();
}

function getProposal(id) {
  const proposal = db.prepare('SELECT * FROM proposals WHERE id = ?').get(id);
  if (proposal) {
    proposal.items = db.prepare('SELECT * FROM proposal_items WHERE proposal_id = ?').all(id);
  }
  return proposal;
}

function getNextProposalNumber() {
  const last = db.prepare('SELECT proposal_number FROM proposals ORDER BY id DESC LIMIT 1').get();
  if (!last) return 'INV-1';
  
  // Try to match INV- first, then fallback to SE- for legacy support
  let match = last.proposal_number.match(/INV-(\d+)/);
  if (!match) match = last.proposal_number.match(/SE-(\d+)/);
  
  if (match) {
    const num = parseInt(match[1]) + 1;
    return `INV-${num}`;
  }
  return 'INV-1';
}

function getNextCustomerName() {
  const last = db.prepare("SELECT customer_name FROM proposals WHERE customer_name LIKE 'Customer-%' OR customer_name LIKE 'CST-%' ORDER BY id DESC LIMIT 1").get();
  if (!last) return 'Customer-1';
  
  const match = last.customer_name.match(/(?:Customer|CST)-(\d+)/);
  if (match) {
    const num = parseInt(match[1]) + 1;
    return `Customer-${num}`;
  }
  return 'Customer-1';
}

function getProductTable(section) {
  if (!section) return null;
  const stockMap = {
    pnl: 'panels', inv: 'inverters', str: 'structures', cab: 'cables',
    brk: 'breakers', bat: 'batteries', msc: 'misc', oth: 'others'
  };
  const tableSlug = stockMap[section] || section;
  const tableName = `products_${tableSlug}`;
  try {
    const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tableName);
    return exists ? tableName : null;
  } catch (e) {
    return null;
  }
}

function saveProposal(data) {
  const { items, ...proposalData } = data;
  let proposalId;
  const transaction = db.transaction(() => {
    // Determine existing columns in proposals table to avoid unknown column errors
    const tableInfo = db.prepare("PRAGMA table_info(proposals)").all();
    const columns = tableInfo.map(c => c.name);
    const cleanData = {};
    for (const [k, v] of Object.entries(proposalData)) {
      if (columns.includes(k)) cleanData[k] = v;
    }

    if (proposalData.id) {
      proposalId = proposalData.id;

      // 1. Restore previous items to stock before updating
      const oldItems = db.prepare('SELECT item_id, section, qty FROM proposal_items WHERE proposal_id = ?').all(proposalId);
      for (const oldItem of oldItems) {
        if (oldItem.item_id && oldItem.section) {
          const table = getProductTable(oldItem.section);
          if (table) {
            try {
              db.prepare(`UPDATE ${table} SET current_stock = current_stock + ? WHERE id = ?`).run(oldItem.qty, oldItem.item_id);
            } catch (stockErr) {
              console.error(`[STOCK RESTORE EDIT] Failed to restore for ${table}:`, stockErr);
            }
          }
        }
      }

      const updates = Object.keys(cleanData).filter(k => k !== 'id').map(k => `${k} = @${k}`).join(', ');
      db.prepare(`UPDATE proposals SET ${updates} WHERE id = @id`).run(cleanData);
      db.prepare('DELETE FROM proposal_items WHERE proposal_id = ?').run(proposalId);
    } else {
      const keys = Object.keys(cleanData);
      const placeholders = keys.map(k => `@${k}`).join(', ');
      const info = db.prepare(`INSERT INTO proposals (${keys.join(', ')}) VALUES (${placeholders})`).run(cleanData);
      proposalId = info.lastInsertRowid;
    }

    if (items && items.length > 0) {
      const stmt = db.prepare(`INSERT INTO proposal_items (proposal_id, item_id, section, description, qty, unit, unit_cost, unit_retail, unit_discounted, line_cost, line_retail, line_profit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

      for (const item of items) {
        const discPrice = (item.unit_discounted !== undefined && item.unit_discounted !== null) ? item.unit_discounted : item.unit_retail;
        stmt.run(proposalId, item.item_id, item.section, item.description, item.qty, item.unit, item.unit_cost, item.unit_retail, discPrice, item.line_cost, item.line_retail, item.line_profit);
        
        // Deduct stock for all completed/saved sales (both new and edited)
        if (item.item_id && item.section) {
            const table = getProductTable(item.section);
            if (table) {
              try {
                db.prepare(`UPDATE ${table} SET current_stock = MAX(0, current_stock - ?) WHERE id = ?`).run(item.qty, item.item_id);
              } catch(stockErr) {
                console.error(`[STOCK DEDUCT] Failed to deduct for ${table}:`, stockErr);
              }
            }
        }
      }
    }
  });
  transaction();
  return proposalId;
}

function deleteProposal(id) {
  const transaction = db.transaction(() => {
    // 1. Restore all items sold in this proposal back to current_stock
    const items = db.prepare('SELECT item_id, section, qty FROM proposal_items WHERE proposal_id = ?').all(id);
    for (const item of items) {
      if (item.item_id && item.section) {
        const table = getProductTable(item.section);
        if (table) {
          try {
            db.prepare(`UPDATE ${table} SET current_stock = current_stock + ? WHERE id = ?`).run(item.qty, item.item_id);
          } catch (stockErr) {
            console.error(`[STOCK RESTORE DELETE] Failed to restore for ${table}:`, stockErr);
          }
        }
      }
    }

    db.prepare('DELETE FROM proposal_items WHERE proposal_id = ?').run(id);
    db.prepare('DELETE FROM proposals WHERE id = ?').run(id);
  });
  transaction();
}

function updateProposalStatus(id, status) {
  db.prepare('UPDATE proposals SET status = ? WHERE id = ?').run(status, id);
}

function receivePayment(id, addedAmount, paymentMethod = 'Cash') {
  const p = db.prepare('SELECT retail_total, received_amount FROM proposals WHERE id = ?').get(id);
  if (!p) return;
  
  const newReceived = (p.received_amount || 0) + addedAmount;
  const status = newReceived >= p.retail_total ? 'Paid' : 'Pending';
  
  db.prepare('UPDATE proposals SET received_amount = ?, status = ?, payment_method = ? WHERE id = ?').run(newReceived, status, paymentMethod, id);
  return { newReceived, status };
}

// ------ EXPENSES ------
function getExpenses(filters) {
  let sql = 'SELECT * FROM expenses';
  let params = [];
  
  if (filters && filters.month !== undefined && filters.year !== undefined) {
    const monthStr = String(filters.month + 1).padStart(2, '0');
    sql += ' WHERE date LIKE ?';
    params.push(`${filters.year}-${monthStr}-%`);
  }
  
  sql += ' ORDER BY date DESC';
  return db.prepare(sql).all(...params);
}

function saveExpense(data) {
  if (data.id) {
    const { id, ...updates } = data;
    const clause = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE expenses SET ${clause} WHERE id = @id`).run(data);
  } else {
    const keys = Object.keys(data);
    const placeholders = keys.map(k => `@${k}`).join(', ');
    db.prepare(`INSERT INTO expenses (${keys.join(', ')}) VALUES (${placeholders})`).run(data);
  }
}

function deleteExpense(id) {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
}

function getExpenseCategories() {
  return db.prepare('SELECT * FROM expense_categories ORDER BY name ASC').all();
}

function addExpenseCategory(name) {
  try {
    const info = db.prepare('INSERT INTO expense_categories (name) VALUES (?)').run(name);
    return info.lastInsertRowid;
  } catch (e) {
    return { error: 'Category already exists or error occurred' };
  }
}

function deleteExpenseCategory(id) {
  db.prepare('DELETE FROM expense_categories WHERE id = ?').run(id);
}

function getExpensesSummary(filters) {
  const now = new Date();
  let m = now.getMonth();
  let y = now.getFullYear();

  if (filters && filters.month !== undefined && filters.year !== undefined) {
    m = filters.month;
    y = filters.year;
  }

  const monthStr = `${y}-${String(m + 1).padStart(2, '0')}`;
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const monthTotal = db.prepare(`SELECT SUM(amount) as s FROM expenses WHERE date LIKE '${monthStr}-%'`).get().s || 0;
  const dailyTotal = db.prepare("SELECT SUM(amount) as s FROM expenses WHERE substr(date, 1, 10) = ?").get(todayStr)?.s || 0;
  const salariesTotal = db.prepare(`SELECT SUM(amount) as s FROM expenses WHERE LOWER(category) LIKE '%salary%' AND date LIKE '${monthStr}-%'`).get().s || 0;
  
  return { selectedMonth: monthTotal, daily: dailyTotal, salaries: salariesTotal };
}

// ------ EMPLOYEES ------
function getEmployees(status) {
  if (status && status !== 'All') {
    return db.prepare('SELECT * FROM employees WHERE status = ? ORDER BY full_name').all(status);
  }
  return db.prepare('SELECT * FROM employees ORDER BY full_name').all();
}

function saveEmployee(data) {
  if (data.id) {
    const { id, ...updates } = data;
    const clause = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE employees SET ${clause} WHERE id = @id`).run(data);
  } else {
    const keys = Object.keys(data);
    const placeholders = keys.map(k => `@${k}`).join(', ');
    db.prepare(`INSERT INTO employees (${keys.join(', ')}) VALUES (${placeholders})`).run(data);
  }
}

function deleteEmployee(id) {
  db.prepare('DELETE FROM employees WHERE id = ?').run(id);
}

// ------ COMPANIES ------
function getCompanies() {
  return db.prepare('SELECT * FROM companies ORDER BY name ASC').all();
}

function saveCompany(data) {
  if (data.id) {
    const { id, ...updates } = data;
    const clause = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE companies SET ${clause} WHERE id = @id`).run(data);
  } else {
    const keys = Object.keys(data);
    const placeholders = keys.map(k => `@${k}`).join(', ');
    db.prepare(`INSERT INTO companies (${keys.join(', ')}) VALUES (${placeholders})`).run(data);
  }
}

function deleteCompany(id) {
  db.prepare('DELETE FROM companies WHERE id = ?').run(id);
}

// ------ CUSTOMERS ------
function getCustomers() {
  return db.prepare('SELECT * FROM customers ORDER BY name ASC').all();
}

function saveCustomer(data) {
  let customerId;
  const transaction = db.transaction(() => {
    if (data.id) {
      const { id, ...updates } = data;
      const clause = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
      db.prepare(`UPDATE customers SET ${clause} WHERE id = @id`).run(data);
      customerId = data.id;
    } else {
      const keys = Object.keys(data);
      const placeholders = keys.map(k => `@${k}`).join(', ');
      const info = db.prepare(`INSERT INTO customers (${keys.join(', ')}) VALUES (${placeholders})`).run(data);
      customerId = info.lastInsertRowid;
    }
  });
  transaction();
  return customerId;
}

function deleteCustomer(id) {
  db.prepare('DELETE FROM customers WHERE id = ?').run(id);
}

// ------ DASHBOARD ------
function getDashboardStats(filter = 'daily') {
  console.log('[DASHBOARD] Fetching stats with filter:', filter);
  let period = typeof filter === 'string' ? filter : (filter.period || 'daily');
  
  let propConditions = [];
  let expConditions = [];
  let propParams = [];
  let expParams = [];
  let topSoldConditions = [];
  let topSoldParams = [];

  if (period === 'daily') {
    const targetDate = (typeof filter === 'object' && filter.targetDate) ? filter.targetDate : null;
    if (targetDate) {
      propConditions.push("date(COALESCE(date, created_at), 'localtime') = ?");
      propParams.push(targetDate);
      expConditions.push("substr(COALESCE(date, date(created_at, 'localtime')), 1, 10) = ?");
      expParams.push(targetDate);
      topSoldConditions.push("date(COALESCE(p.date, p.created_at), 'localtime') = ?");
      topSoldParams.push(targetDate);
    } else {
      propConditions.push("date(COALESCE(date, created_at), 'localtime') = date('now', 'localtime')");
      expConditions.push("substr(COALESCE(date, date(created_at, 'localtime')), 1, 10) = date('now', 'localtime')");
      topSoldConditions.push("date(COALESCE(p.date, p.created_at), 'localtime') = date('now', 'localtime')");
    }
  } else if (period === 'monthly') {
    let targetMonth = null;
    if (typeof filter === 'object') {
      if (filter.targetMonth) {
        targetMonth = filter.targetMonth;
      } else if (filter.year && filter.month) {
        targetMonth = `${filter.year}-${String(filter.month).padStart(2, '0')}`;
      }
    }
    if (targetMonth) {
      propConditions.push("strftime('%Y-%m', COALESCE(date, created_at), 'localtime') = ?");
      propParams.push(targetMonth);
      expConditions.push("substr(COALESCE(date, date(created_at, 'localtime')), 1, 7) = ?");
      expParams.push(targetMonth);
      topSoldConditions.push("strftime('%Y-%m', COALESCE(p.date, p.created_at), 'localtime') = ?");
      topSoldParams.push(targetMonth);
    } else {
      propConditions.push("strftime('%Y-%m', COALESCE(date, created_at), 'localtime') = strftime('%Y-%m', 'now', 'localtime')");
      expConditions.push("substr(COALESCE(date, date(created_at, 'localtime')), 1, 7) = strftime('%Y-%m', 'now', 'localtime')");
      topSoldConditions.push("strftime('%Y-%m', COALESCE(p.date, p.created_at), 'localtime') = strftime('%Y-%m', 'now', 'localtime')");
    }
  } else if (period === 'annual') {
    let targetYear = null;
    if (typeof filter === 'object') {
      if (filter.targetYear) targetYear = String(filter.targetYear);
      else if (filter.year) targetYear = String(filter.year);
    }
    if (targetYear) {
      propConditions.push("strftime('%Y', COALESCE(date, created_at), 'localtime') = ?");
      propParams.push(targetYear);
      expConditions.push("substr(COALESCE(date, date(created_at, 'localtime')), 1, 4) = ?");
      expParams.push(targetYear);
      topSoldConditions.push("strftime('%Y', COALESCE(p.date, p.created_at), 'localtime') = ?");
      topSoldParams.push(targetYear);
    } else {
      propConditions.push("strftime('%Y', COALESCE(date, created_at), 'localtime') = strftime('%Y', 'now', 'localtime')");
      expConditions.push("substr(COALESCE(date, date(created_at, 'localtime')), 1, 4) = strftime('%Y', 'now', 'localtime')");
      topSoldConditions.push("strftime('%Y', COALESCE(p.date, p.created_at), 'localtime') = strftime('%Y', 'now', 'localtime')");
    }
  } else if (period === 'custom') {
    let start = typeof filter === 'object' && filter.startDate ? filter.startDate : '';
    let end = typeof filter === 'object' && filter.endDate ? filter.endDate : '';
    if (start && end) {
      propConditions.push("date(COALESCE(date, created_at), 'localtime') >= ? AND date(COALESCE(date, created_at), 'localtime') <= ?");
      propParams.push(start, end);
      expConditions.push("substr(COALESCE(date, date(created_at, 'localtime')), 1, 10) >= ? AND substr(COALESCE(date, date(created_at, 'localtime')), 1, 10) <= ?");
      expParams.push(start, end);
      topSoldConditions.push("date(COALESCE(p.date, p.created_at), 'localtime') >= ? AND date(COALESCE(p.date, p.created_at), 'localtime') <= ?");
      topSoldParams.push(start, end);
    } else if (start) {
      propConditions.push("date(COALESCE(date, created_at), 'localtime') >= ?");
      propParams.push(start);
      expConditions.push("substr(COALESCE(date, date(created_at, 'localtime')), 1, 10) >= ?");
      expParams.push(start);
      topSoldConditions.push("date(COALESCE(p.date, p.created_at), 'localtime') >= ?");
      topSoldParams.push(start);
    } else if (end) {
      propConditions.push("date(COALESCE(date, created_at), 'localtime') <= ?");
      propParams.push(end);
      expConditions.push("substr(COALESCE(date, date(created_at, 'localtime')), 1, 10) <= ?");
      expParams.push(end);
      topSoldConditions.push("date(COALESCE(p.date, p.created_at), 'localtime') <= ?");
      topSoldParams.push(end);
    }
  }

  const propWhereClause = propConditions.length > 0 ? "WHERE " + propConditions.join(" AND ") : "";
  const expWhereClause = expConditions.length > 0 ? "WHERE " + expConditions.join(" AND ") : "";
  const topSoldWhereClause = topSoldConditions.length > 0 ? "WHERE " + topSoldConditions.join(" AND ") : "";

  const proposalCount = db.prepare(`SELECT COUNT(*) as c FROM proposals ${propWhereClause}`).get(...propParams)?.c || 0;
  const revenueStr = db.prepare(`SELECT SUM(retail_total) as r FROM proposals ${propWhereClause}`).get(...propParams)?.r || 0;
  const profitStr = db.prepare(`SELECT SUM(profit) as p FROM proposals ${propWhereClause}`).get(...propParams)?.p || 0;
  const discountStr = db.prepare(`SELECT SUM(discount) as d FROM proposals ${propWhereClause}`).get(...propParams)?.d || 0;
  const expensesStr = db.prepare(`SELECT SUM(amount) as a FROM expenses ${expWhereClause}`).get(...expParams)?.a || 0;

  const employeesCount = db.prepare("SELECT COUNT(*) as c FROM employees WHERE status = 'Active'").get()?.c || 0;
  const totalShops = db.prepare("SELECT COUNT(*) as c FROM shops").get()?.c || 0;
  const totalVendors = db.prepare("SELECT COUNT(*) as c FROM companies").get()?.c || 0;
  const totalReceivables = db.prepare("SELECT COALESCE(SUM(amount), 0) as r FROM shops WHERE amount > 0").get()?.r || 0;

  let totalStockUnits = 0;
  let totalStockValuation = 0;
  try {
    const labels = getCategoryLabels();
    labels.forEach(l => {
      const row = db.prepare(`SELECT SUM(current_stock) as s, SUM(current_stock * cost_price) as val FROM products_${l.slug}`).get();
      totalStockUnits += (row?.s || 0);
      totalStockValuation += (row?.val || 0);
    });
  } catch(e) {}

  const recentProposals = db.prepare(`SELECT proposal_number, customer_name, shop_name, phone, date, retail_total, received_amount, status FROM proposals ${propWhereClause} ORDER BY id DESC LIMIT 5`).all(...propParams);
  const recentExpenses = db.prepare(`SELECT date, category, amount, description FROM expenses ${expWhereClause} ORDER BY id DESC LIMIT 5`).all(...expParams);

  // Top Sold for the specific period
  const topSold = db.prepare(`
    SELECT pi.description, SUM(pi.qty) as qty 
    FROM proposal_items pi 
    JOIN proposals p ON pi.proposal_id = p.id 
    ${topSoldWhereClause}
    GROUP BY pi.description 
    ORDER BY qty DESC 
    LIMIT 1
  `).get(...topSoldParams) || { description: '-', qty: 0 };

  // Handle "Name - Desc" format for Dashboard display
  let itemName = topSold.description || '-';
  if (itemName.includes(' - ')) {
    itemName = itemName.split(' - ')[0];
  }

  // Fetch available years for dashboard dropdowns
  const currentYr = new Date().getFullYear();
  const yearsSet = new Set([currentYr, currentYr - 1, currentYr - 2]);
  try {
    const yrRows = db.prepare("SELECT DISTINCT strftime('%Y', COALESCE(date, created_at), 'localtime') as yr FROM proposals WHERE yr IS NOT NULL").all();
    yrRows.forEach(r => { if (r.yr) yearsSet.add(parseInt(r.yr)); });
  } catch(e) {}
  const availableYears = Array.from(yearsSet).filter(Boolean).sort((a, b) => b - a);

  return {
    proposalCount,
    totalRevenue: revenueStr,
    totalProfit: profitStr,
    totalDiscount: discountStr,
    totalExpenses: expensesStr,
    activeEmployees: employeesCount,
    topSold: itemName,
    recentProposals,
    recentExpenses,
    totalShops,
    totalCustomers: totalShops,
    totalVendors,
    totalReceivables,
    totalStockUnits,
    totalStockValuation,
    availableYears
  };
}

// ------ SALES STATS ------
function getItemSales(section, period, targetDate = null) {
  const params = [];
  const conditions = [];

  if (section && section !== 'all') {
    const slugToCode = {
      'panels': 'pnl', 'inverters': 'inv', 'structures': 'str', 'cables': 'cab',
      'breakers': 'brk', 'batteries': 'bat', 'misc': 'msc', 'others': 'oth'
    };
    const codeToSlug = {
      'pnl': 'panels', 'inv': 'inverters', 'str': 'structures', 'cab': 'cables',
      'brk': 'breakers', 'bat': 'batteries', 'msc': 'msc', 'oth': 'others'
    };

    const alt = slugToCode[section] || codeToSlug[section];
    if (alt) {
        conditions.push("(pi.section = ? OR pi.section = ?)");
        params.push(section, alt);
    } else {
        conditions.push("pi.section = ?");
        params.push(section);
    }
  }

  if (period === 'daily') {
    if (targetDate) {
      conditions.push("date(COALESCE(p.date, p.created_at), 'localtime') = ?");
      params.push(targetDate);
    } else {
      conditions.push("date(COALESCE(p.date, p.created_at), 'localtime') = date('now', 'localtime')");
    }
  } else if (period === 'monthly') {
    if (targetDate) {
      conditions.push("strftime('%Y-%m', COALESCE(p.date, p.created_at), 'localtime') = ?");
      params.push(targetDate);
    } else {
      conditions.push("strftime('%Y-%m', COALESCE(p.date, p.created_at), 'localtime') = strftime('%Y-%m', 'now', 'localtime')");
    }
  } else if (period === 'annual') {
    if (targetDate) {
      conditions.push("strftime('%Y', COALESCE(p.date, p.created_at), 'localtime') = ?");
      params.push(String(targetDate));
    } else {
      conditions.push("strftime('%Y', COALESCE(p.date, p.created_at), 'localtime') = strftime('%Y', 'now', 'localtime')");
    }
  }

  const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
  const joinClause = "JOIN proposals p ON pi.proposal_id = p.id";

  const sql = `
    SELECT 
      pi.description,
      pi.section,
      SUM(pi.qty) as total_qty,
      SUM(pi.line_cost) as total_cost,
      SUM(pi.line_retail) as total_revenue,
      SUM(pi.line_profit) as total_profit
    FROM proposal_items pi
    ${joinClause}
    ${whereClause}
    GROUP BY pi.description, pi.section
    ORDER BY total_qty DESC
  `;

  console.log("[STATS] Executing SQL:", sql);
  console.log("[STATS] Params:", params);

  return db.prepare(sql).all(...params);
}

function getReportSummary(filters) {
  const { start, end } = filters;
  
  // Sales Summary
  const sales = db.prepare(`
    SELECT 
      COUNT(*) as count,
      SUM(retail_total) as amount,
      SUM(cost_total) as cost,
      SUM(profit) as profit
    FROM proposals 
    WHERE date(COALESCE(date, created_at), 'localtime') >= ? AND date(COALESCE(date, created_at), 'localtime') <= ?
  `).get(start, end) || { count: 0, amount: 0, cost: 0, profit: 0 };
  
  const itemsRow = db.prepare(`
    SELECT SUM(qty) as items
    FROM proposal_items pi
    JOIN proposals p ON pi.proposal_id = p.id
    WHERE date(COALESCE(p.date, p.created_at), 'localtime') >= ? AND date(COALESCE(p.date, p.created_at), 'localtime') <= ?
  `).get(start, end);
  const itemsSold = (itemsRow && itemsRow.items) || 0;

  // Expenses Summary
  const expenses = db.prepare(`
    SELECT 
      COUNT(*) as count,
      SUM(amount) as amount
    FROM expenses
    WHERE substr(COALESCE(date, date(created_at, 'localtime')), 1, 10) >= ? AND substr(COALESCE(date, date(created_at, 'localtime')), 1, 10) <= ?
  `).get(start, end) || { count: 0, amount: 0 };

  // Vendor Balances (Current total)
  const vendors = db.prepare(`
    SELECT 
      COUNT(*) as count,
      SUM(amount) as amount
    FROM companies
  `).get() || { count: 0, amount: 0 };

  return {
    sales: {
      count: sales.count || 0,
      amount: sales.amount || 0,
      cost: sales.cost || 0,
      profit: sales.profit || 0,
      itemsSold: itemsSold
    },
    expenses: {
      count: expenses.count || 0,
      amount: expenses.amount || 0
    },
    vendors: {
      count: vendors.count || 0,
      amount: vendors.amount || 0
    }
  };
}

function getAllProposalItems() {
  const sql = `
    SELECT 
      pi.id,
      pi.proposal_id,
      pi.item_id,
      pi.section,
      pi.description,
      pi.qty,
      pi.unit,
      pi.unit_cost,
      pi.unit_retail,
      pi.unit_discounted,
      pi.line_cost,
      pi.line_retail,
      pi.line_profit,
      p.proposal_number,
      p.customer_name,
      p.phone,
      p.seller_name,
      p.payment_method,
      p.sale_mode,
      p.date,
      p.created_at
    FROM proposal_items pi
    JOIN proposals p ON pi.proposal_id = p.id
    ORDER BY p.id DESC, pi.id ASC
  `;
  return db.prepare(sql).all();
}

function getShops() {
  return db.prepare('SELECT * FROM shops ORDER BY name ASC').all();
}

function getShop(id) {
  return db.prepare('SELECT * FROM shops WHERE id = ?').get(id);
}

function saveShop(data) {
  let shopId;
  const transaction = db.transaction(() => {
    if (data.id) {
      const { id, ...updates } = data;
      const clause = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
      db.prepare(`UPDATE shops SET ${clause} WHERE id = @id`).run(data);
      shopId = data.id;
    } else {
      const keys = Object.keys(data);
      const placeholders = keys.map(k => `@${k}`).join(', ');
      const info = db.prepare(`INSERT INTO shops (${keys.join(', ')}) VALUES (${placeholders})`).run(data);
      shopId = info.lastInsertRowid;
    }
  });
  transaction();
  return shopId;
}

function deleteShop(id) {
  db.prepare('DELETE FROM shops WHERE id = ?').run(id);
}

function getUnits() {
  return db.prepare('SELECT * FROM product_units ORDER BY name ASC').all();
}

function addUnit(name) {
  try {
    return db.prepare('INSERT INTO product_units (name) VALUES (?)').run(name.toUpperCase());
  } catch(e) { return { error: e.message }; }
}

function updateUnit(id, name) {
  try {
    return db.prepare('UPDATE product_units SET name = ? WHERE id = ?').run(name.toUpperCase(), id);
  } catch(e) { return { error: e.message }; }
}

function deleteUnit(id) {
  try {
    return db.prepare('DELETE FROM product_units WHERE id = ?').run(id);
  } catch(e) { return { error: e.message }; }
}

function close() {
  if (db) db.close();
}

module.exports = {
  init, getDbPath, close,
  getSettings, saveSettings,
  getProducts, addProduct, updateProduct, deleteProduct,
  getCategoryLabels, updateCategoryLabel, searchAllProducts, getCategoryStats, addCategory, deleteCategory,
  getProposals, getProposal, saveProposal, deleteProposal, updateProposalStatus, receivePayment, getNextProposalNumber, getNextCustomerName,
  getAllProposalItems,
  getExpenses, saveExpense, deleteExpense, getExpensesSummary,
  getExpenseCategories, addExpenseCategory, deleteExpenseCategory,
  getEmployees, saveEmployee, deleteEmployee,
  getCompanies, saveCompany, deleteCompany,
  getCustomers, saveCustomer, deleteCustomer,
  getShops, saveShop, deleteShop, getShop,
  getDashboardStats,
  getItemSales,
  getReportSummary,
  toggleFavorite,
  getFavoriteProducts,
  getUnits, addUnit, updateUnit, deleteUnit,
  getAllKv, setKv, saveAllKv
};
