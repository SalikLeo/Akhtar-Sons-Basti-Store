const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const targetDirs = [
  path.join(process.env.APPDATA, 'akhtar-and-sons'),
  path.join(process.env.APPDATA, 'Electron')
];

const categories = [
  ['panels', 'Biscuits'],
  ['inverters', 'Cold Drinks'],
  ['structures', 'Jellies & Candies'],
  ['cables', 'Snacks & Chips'],
  ['breakers', 'Chocolates'],
  ['batteries', 'Dairy & Groceries'],
  ['misc', 'Juices & Beverages'],
  ['others', 'General Items']
];

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

const employeesData = [
  { name: 'Muhammad Ali', role: 'Senior Sales Manager', phone: '0300-1234567', email: 'ali@akhtarandsons.pk', salary: 45000, date: '2025-01-15', status: 'Active' },
  { name: 'Usman Tariq', role: 'Sales Executive', phone: '0312-7654321', email: 'usman@akhtarandsons.pk', salary: 35000, date: '2025-03-10', status: 'Active' },
  { name: 'Bilal Ahmed', role: 'Counter Cashier', phone: '0333-9876543', email: 'bilal@akhtarandsons.pk', salary: 30000, date: '2025-06-01', status: 'Active' },
  { name: 'Hamza Khan', role: 'Field Representative', phone: '0345-5432167', email: 'hamza@akhtarandsons.pk', salary: 32000, date: '2025-08-20', status: 'Active' },
  { name: 'Zain Malik', role: 'Inventory Officer', phone: '0321-1122334', email: 'zain@akhtarandsons.pk', salary: 28000, date: '2025-11-05', status: 'Active' }
];

const companiesData = [
  { name: 'Continental Biscuits Ltd (LU)', desc: 'Official Biscuits Supplier', amount: 85000, phone: '042-35876001', address: 'Industrial Area, Karachi' },
  { name: 'Coca-Cola Beverages Pakistan', desc: 'Carbonated Drinks & Beverages', amount: 120000, phone: '051-4433221', address: 'Plot 45, I-9 Industrial Area, Islamabad' },
  { name: 'PepsiCo Pakistan Dist.', desc: 'Beverages & Snacks Distributor', amount: 95000, phone: '051-5544332', address: 'GT Road, Rawalpindi' },
  { name: 'Hilal Foods Pvt Ltd', desc: 'Confectionery & Jellies', amount: 45000, phone: '021-35061122', address: 'Korangi Industrial Area, Karachi' },
  { name: 'Nestle Pakistan Ltd', desc: 'Dairy, Juices & Nutrition', amount: 160000, phone: '042-111637853', address: '308 Upper Mall, Lahore' },
  { name: 'Unilever Pakistan Foods', desc: 'General & Personal Care Products', amount: 75000, phone: '021-35681001', address: 'Avari Plaza, Fatima Jinnah Road, Karachi' }
];

const defaultShops = [
  { name: 'Parking Canteen', owner_name: 'Asif Khan', phone: '0329-9934620', address: 'Wah Cantt', city: 'Wah Cantt' },
  { name: 'Al-Madina Mart', owner_name: 'Haji Rafiq', phone: '0312-3456789', address: 'Faisal Iqbal Town', city: 'Wah Cantt' },
  { name: 'Quaid Super Store', owner_name: 'Usman Ali', phone: '0321-5554321', address: 'Quaid Avenue', city: 'Wah Cantt' },
  { name: 'Bismillah General Store', owner_name: 'Tariq Mahmood', phone: '0300-9876543', address: 'Lala Rukh', city: 'Wah Cantt' },
  { name: 'Gulshan Bakers & Mart', owner_name: 'Bilal Sheikh', phone: '0333-8889990', address: 'Gulshan Colony', city: 'Wah Cantt' },
  { name: 'New Shaheen Cash & Carry', owner_name: 'Zafar Iqbal', phone: '0315-7776655', address: 'Main Bazar', city: 'Wah Cantt' }
];

const customersData = [
  { name: 'Al-Madina General Store', desc: 'Wholesale Retailer', amount: 15000, phone: '0301-4455667', address: 'Cantt Bazaar, Wah Cantt' },
  { name: 'Bismillah Super Mart', desc: 'Supermarket Customer', amount: 0, phone: '0322-8877665', address: 'Lala Rukh, Wah Cantt' },
  { name: 'Khan Traders Wholesale', desc: 'Bulk Distributor', amount: 45000, phone: '0334-9988776', address: 'Main GT Road, Hassan Abdal' },
  { name: 'Iqbal Karyana Store', desc: 'Retail Shop', amount: 8500, phone: '0313-2233445', address: 'Model Town, Taxila' },
  { name: 'Chaudhry Sweets & Bakers', desc: 'Bakery & Confectionery', amount: 0, phone: '0300-5566778', address: 'Faisal Iqbal Town, Wah Cantt' },
  { name: 'Malik Cash & Carry', desc: 'Commercial Partner', amount: 25000, phone: '0345-6677889', address: 'Saddar, Wah Cantt' },
  { name: 'New City Mart', desc: 'Retail Branch', amount: 0, phone: '0321-7788990', address: 'New City Phase 2, Wah' },
  { name: 'Ahmed Cash Store', desc: 'Walk-in regular buyer', amount: 0, phone: '0333-1122448', address: 'Officers Colony, Wah Cantt' }
];

let logLines = [];
function log(msg) {
  logLines.push(msg);
  console.log(msg);
}

function seed(dbPath) {
  try {
    log(`\n=== Seeding DB: ${dbPath} ===`);
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const db = new Database(dbPath);
    db.pragma('foreign_keys = ON');

    // Categories
    db.exec(`CREATE TABLE IF NOT EXISTS category_labels (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE, label TEXT)`);
    const labelStmt = db.prepare('INSERT OR REPLACE INTO category_labels (slug, label) VALUES (?, ?)');
    categories.forEach(([slug, label]) => labelStmt.run(slug, label));

  // Settings
  db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('company_name', ?)").run('Akhtar & Sons');
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('address', ?)").run('B-99, Lalarukh Basti, Wah Cantt');
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('phone', ?)").run('0310-5123788');

  const defaultSalesmen = [
    { name: 'Ifrahim', phone: '0329-9934620' },
    { name: 'Muhammad Ali', phone: '0300-1234567' },
    { name: 'Usman Tariq', phone: '0312-7654321' },
    { name: 'Bilal Ahmed', phone: '0333-9876543' },
    { name: 'Hamza Khan', phone: '0345-5432167' },
    { name: 'Zain Malik', phone: '0321-1122334' }
  ];
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('sellers_list', ?)").run(JSON.stringify(defaultSalesmen));

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
  db.exec('DELETE FROM employees');
  const empStmt = db.prepare('INSERT INTO employees (full_name, role, phone, email, date_joined, salary, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
  employeesData.forEach(e => empStmt.run(e.name, e.role, e.phone, e.email, e.date, e.salary, e.status));

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
  db.exec('DELETE FROM companies');
  const compStmt = db.prepare('INSERT INTO companies (name, description, amount, phone, address) VALUES (?, ?, ?, ?, ?)');
  companiesData.forEach(c => compStmt.run(c.name, c.desc, c.amount, c.phone, c.address));

  // Shops
  db.exec(`CREATE TABLE IF NOT EXISTS shops (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    name TEXT, 
    owner_name TEXT, 
    phone TEXT, 
    address TEXT, 
    city TEXT DEFAULT 'Wah Cantt', 
    amount REAL DEFAULT 0, 
    notes TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.exec('DELETE FROM shops');
  const shopStmt = db.prepare('INSERT INTO shops (name, owner_name, phone, address, city, amount) VALUES (?, ?, ?, ?, ?, 0)');
  defaultShops.forEach(s => shopStmt.run(s.name, s.owner_name, s.phone, s.address, s.city));

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
  db.exec('DELETE FROM customers');
  const custStmt = db.prepare('INSERT INTO customers (name, description, amount, phone, address) VALUES (?, ?, ?, ?, ?)');
  customersData.forEach(c => custStmt.run(c.name, c.desc, c.amount, c.phone, c.address));

  // Units
  db.exec(`CREATE TABLE IF NOT EXISTS product_units (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)`);
  const productUnits = ['PACK', 'PCS', 'BOX', 'BOTTLE', 'CARTON', 'SET'];
  const unitStmt = db.prepare('INSERT OR IGNORE INTO product_units (name) VALUES (?)');
  productUnits.forEach(u => unitStmt.run(u));

  // Products
  const insertedProductList = [];
  Object.entries(productsMaster).forEach(([slug, list]) => {
    db.exec(`DROP TABLE IF EXISTS products_${slug}`);
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
      pieces_per_carton INTEGER DEFAULT NULL,
      company_id INTEGER DEFAULT NULL
    )`);

    const pStmt = db.prepare(`INSERT INTO products_${slug} (item_name, description, current_stock, unit, cost_price, retail_price, wholesale_cost_price, wholesale_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    list.forEach(item => {
      const info = pStmt.run(item.name, item.desc, item.stock, item.unit, item.cost, item.retail, item.wcost, item.ws);
      insertedProductList.push({
        id: info.lastInsertRowid,
        section: slug,
        item_name: item.name,
        description: item.desc,
        unit: item.unit,
        cost_price: item.cost,
        retail_price: item.retail,
        wholesale_cost_price: item.wcost,
        wholesale_price: item.ws
      });
    });
  });

  console.log(`Inserted ${insertedProductList.length} products across all categories.`);

  // Proposals & Sales
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
    booking_day TEXT,
    delivery_day TEXT,
    shop_id INTEGER,
    shop_name TEXT,
    shop_address TEXT,
    salesman_name TEXT,
    salesman_contact TEXT,
    payment_method TEXT DEFAULT 'Cash',
    tax_percent REAL DEFAULT 0.5,
    tax_amount REAL DEFAULT 0,
    subtotal REAL DEFAULT 0,
    sale_mode TEXT DEFAULT 'retail',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.exec('DELETE FROM proposal_items');
  db.exec('DELETE FROM proposals');

  const salesmenList = ['Ifrahim', 'Muhammad Ali', 'Usman Tariq', 'Bilal Ahmed', 'Hamza Khan', 'Zain Malik'];
  const dates = [
    '2026-09-15', '2026-09-18', '2026-09-20', '2026-09-22', '2026-09-25',
    '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01'
  ];

  let proposalIndex = 1;
  const propInsert = db.prepare(`INSERT INTO proposals (
    proposal_number, customer_name, location, phone, date, retail_total, cost_total, profit,
    status, received_amount, discount, seller_name, booking_day, delivery_day,
    shop_name, shop_address, salesman_name, salesman_contact, payment_method, tax_percent, tax_amount, subtotal, sale_mode
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const itemInsert = db.prepare(`INSERT INTO proposal_items (
    proposal_id, item_id, section, description, qty, unit_cost, unit_retail, line_cost, line_retail, line_profit
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  for (let dIdx = 0; dIdx < dates.length; dIdx++) {
    const saleDate = dates[dIdx];
    const numSalesToday = 4 + (dIdx % 3);

    for (let s = 0; s < numSalesToday; s++) {
      const invNum = `INV-${String(proposalIndex).padStart(5, '0')}`;
      const cust = customersData[(proposalIndex + s) % customersData.length];
      const salesman = salesmenList[(proposalIndex + s) % salesmenList.length];
      const shop = defaultShops[(proposalIndex + s) % defaultShops.length];

      const numItems = 2 + ((proposalIndex + s) % 4);
      let subtotal = 0;
      let costTotal = 0;
      const saleItems = [];

      for (let k = 0; k < numItems; k++) {
        const prod = insertedProductList[(proposalIndex * 3 + k * 7) % insertedProductList.length];
        const qty = 2 + ((k + proposalIndex) % 8) * 3;
        const lineRetail = Math.round(qty * prod.retail_price);
        const lineCost = Math.round(qty * prod.cost_price);
        const profit = lineRetail - lineCost;

        subtotal += lineRetail;
        costTotal += lineCost;

        saleItems.push({
          item_id: prod.id,
          section: prod.section,
          description: prod.item_name,
          qty: qty,
          unit_cost: prod.cost_price,
          unit_retail: prod.retail_price,
          line_cost: lineCost,
          line_retail: lineRetail,
          profit: profit
        });
      }

      const discount = Math.round((subtotal > 2000 ? 50 : 0) + (subtotal > 5000 ? 100 : 0));
      const taxAmount = Math.round((subtotal - discount) * 0.005);
      const retailTotal = Math.round(subtotal - discount + taxAmount);
      const netProfit = Math.round(retailTotal - costTotal);
      const received = (proposalIndex % 5 === 0) ? Math.round(retailTotal * 0.7) : retailTotal;
      const status = (received >= retailTotal) ? 'Paid' : 'Partially Paid';
      const payMethod = (proposalIndex % 3 === 0) ? 'Online' : 'Cash';

      const res = propInsert.run(
        invNum, cust.name, cust.address, cust.phone, saleDate,
        retailTotal, costTotal, netProfit, status, received, discount,
        salesman, 'Thursday', 'Friday',
        shop.name, shop.address, salesman, '0310-5123788', payMethod,
        0.5, taxAmount, subtotal, 'retail'
      );

      const propId = res.lastInsertRowid;
      saleItems.forEach(it => {
        itemInsert.run(propId, it.item_id, it.section, it.description, it.qty, it.unit_cost, it.unit_retail, it.line_cost, it.line_retail, it.profit);
      });

      proposalIndex++;
    }
  }

  console.log(`Inserted ${proposalIndex - 1} sales proposals with items.`);

  // Expenses
  db.exec(`CREATE TABLE IF NOT EXISTS expense_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE)`);
  db.exec(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    category TEXT, 
    description TEXT, 
    amount REAL, 
    date TEXT, 
    paid_by TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const expenseCategories = ['Office', 'Utilities', 'Transport', 'Salaries', 'Purchase', 'Refreshment', 'Maintenance', 'Other'];
  const expCatStmt = db.prepare('INSERT OR IGNORE INTO expense_categories (name) VALUES (?)');
  expenseCategories.forEach(c => expCatStmt.run(c));

  db.exec('DELETE FROM expenses');
  const expensesSample = [
    { cat: 'Utilities', desc: 'Electricity Bill (IESCO)', amount: 18500, date: '2026-09-30', paidBy: 'Cash' },
    { cat: 'Refreshment', desc: 'Staff Tea & Snacks', amount: 850, date: '2026-09-30', paidBy: 'Cash' },
    { cat: 'Transport', desc: 'Stock Delivery Fuel Charges', amount: 2500, date: '2026-09-30', paidBy: 'Cash' },
    { cat: 'Office', desc: 'Thermal Receipt Rolls & Stationery', amount: 1400, date: '2026-09-29', paidBy: 'Cash' },
    { cat: 'Refreshment', desc: 'Client Meeting Refreshments', amount: 1200, date: '2026-09-29', paidBy: 'Cash' },
    { cat: 'Maintenance', desc: 'Shop Air Conditioner Servicing', amount: 3500, date: '2026-09-28', paidBy: 'Online' },
    { cat: 'Transport', desc: 'Van Dispatch Charges', amount: 1800, date: '2026-09-27', paidBy: 'Cash' },
    { cat: 'Utilities', desc: 'PTCL Fiber Internet Bill', amount: 3200, date: '2026-09-25', paidBy: 'Online' },
    { cat: 'Office', desc: 'Printer Ink Cartridges', amount: 4200, date: '2026-09-22', paidBy: 'Cash' },
    { cat: 'Refreshment', desc: 'Daily Tea Expenses', amount: 750, date: '2026-09-20', paidBy: 'Cash' },
    { cat: 'Transport', desc: 'Vendor Pickup Freight', amount: 3000, date: '2026-09-18', paidBy: 'Cash' },
    { cat: 'Maintenance', desc: 'Counter LED Lighting Repair', amount: 1500, date: '2026-09-15', paidBy: 'Cash' },
    { cat: 'Utilities', desc: 'SNGPL Gas Bill', amount: 1200, date: '2026-09-12', paidBy: 'Online' },
    { cat: 'Office', desc: 'Packing Bags & Packaging Tape', amount: 2800, date: '2026-09-10', paidBy: 'Cash' },
    { cat: 'Salaries', desc: 'Monthly Staff Advances', amount: 20000, date: '2026-09-05', paidBy: 'Cash' },
    { cat: 'Utilities', desc: 'August Electricity Bill', amount: 22000, date: '2026-08-30', paidBy: 'Online' },
    { cat: 'Transport', desc: 'Freight Charges Lahore to Wah', amount: 6500, date: '2026-08-25', paidBy: 'Online' },
    { cat: 'Office', desc: 'Office Cleaning & Supplies', amount: 1600, date: '2026-08-18', paidBy: 'Cash' },
    { cat: 'Maintenance', desc: 'Generator Oil Change & Filters', amount: 4800, date: '2026-08-12', paidBy: 'Cash' },
    { cat: 'Salaries', desc: 'August Staff Salaries Settlement', amount: 150000, date: '2026-08-01', paidBy: 'Online' },
    { cat: 'Utilities', desc: 'July Electricity Bill', amount: 19500, date: '2026-07-30', paidBy: 'Online' },
    { cat: 'Transport', desc: 'Local Delivery Rickshaw Rent', amount: 1200, date: '2026-07-22', paidBy: 'Cash' },
    { cat: 'Office', desc: 'Cash Drawer Maintenance', amount: 900, date: '2026-07-15', paidBy: 'Cash' }
  ];

  const expStmt = db.prepare('INSERT INTO expenses (category, description, amount, date, paid_by) VALUES (?, ?, ?, ?, ?)');
  expensesSample.forEach(e => expStmt.run(e.cat, e.desc, e.amount, e.date, e.paidBy));

    log(`Inserted ${expensesSample.length} expenses.`);
    db.close();
    log(`Successfully completed seeding for ${dbPath}`);
  } catch (err) {
    log(`ERROR in seeding ${dbPath}: ${err.stack || err.message}`);
  }
}

targetDirs.forEach(dir => {
  const dbFile = path.join(dir, 'saad.db');
  seed(dbFile);
});

log('\nAll databases seeding process finished.');
fs.writeFileSync(path.join(__dirname, 'seed_output.log'), logLines.join('\n'));
process.exit(0);


