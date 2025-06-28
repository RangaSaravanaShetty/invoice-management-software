import { create } from 'zustand';
import initSqlJs from 'sql.js';

export interface Client {
  id?: number;
  name: string;
  address: string;
  gstin: string;
}

export interface Item {
  id?: number;
  description: string;
  hsn: string;
  unit_price: number;
}

export interface AppSettings {
  company_name: string;
  address: string;
  gstin: string;
  phone: string;
  email: string;
  logo_base64: string;
  invoice_prefix: string;
  invoice_padding: number;
  cgst_percent: number;
  sgst_percent: number;
  export_folder_path: string;
}

export interface Metrics {
  totalRevenue: number;
  totalInvoices: number;
  totalClients: number;
  avgInvoiceValue: number;
}

interface DatabaseState {
  db: any;
  clients: Client[];
  items: Item[];
  invoices: any[];
  settings: AppSettings;
  metrics: Metrics;
  
  // Actions
  initializeDatabase: () => Promise<void>;
  
  // Client operations
  addClient: (client: Omit<Client, 'id'>) => Promise<void>;
  updateClient: (id: number, client: Omit<Client, 'id'>) => Promise<void>;
  deleteClient: (id: number) => Promise<void>;
  loadClients: () => Promise<void>;
  
  // Item operations  
  addItem: (item: Omit<Item, 'id'>) => Promise<void>;
  updateItem: (id: number, item: Omit<Item, 'id'>) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
  loadItems: () => Promise<void>;
  
  // Invoice operations
  saveInvoice: (invoice: any) => Promise<void>;
  loadInvoices: () => Promise<void>;
  deleteInvoice: (id: number) => Promise<void>;
  generateInvoiceNumber: () => Promise<string>;
  
  // Settings operations
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  loadSettings: () => Promise<void>;
  
  // Metrics
  loadMetrics: () => Promise<void>;

  // Helper to persist DB after changes
  persistDb: () => Promise<void>;
}

// Utility to detect Electron
const isElectron = () => typeof window !== 'undefined' && !!window.electronAPI;

const getSqlJsLocateFile = async () => {
  if (isElectron()) {
    const wasmPath = await window.electronAPI.getSqlWasmPath();
    console.log('[sql.js] Electron mode: using WASM path', wasmPath);
    return () => wasmPath;
  } else {
    return file => {
      const cdnPath = `https://sql.js.org/dist/${file}`;
      console.log('[sql.js] Browser mode: using CDN path', cdnPath);
      return cdnPath;
    };
  }
};

export const useDatabaseStore = create<DatabaseState>((set, get) => ({
  db: null,
  clients: [],
  items: [],
  invoices: [],
  settings: {
    company_name: 'Your Company',
    address: 'Your Address',
    gstin: 'Your GSTIN',
    phone: 'Your Phone',
    email: 'your@email.com',
    logo_base64: '',
    invoice_prefix: 'INV',
    invoice_padding: 4,
    cgst_percent: 9,
    sgst_percent: 9,
    export_folder_path: '',
  },
  metrics: {
    totalRevenue: 0,
    totalInvoices: 0,
    totalClients: 0,
    avgInvoiceValue: 0,
  },

  initializeDatabase: async () => {
    try {
      const locateFile = await getSqlJsLocateFile();
      const SQL = await initSqlJs({
        locateFile
      });
      console.log('[sql.js] WASM loaded successfully');
      let db;
      if (isElectron()) {
        // Try to load from file
        console.log('[Electron] Attempting to read database file...');
        const result = await window.electronAPI.readDatabaseFile();
        console.log('[Electron] Database read result:', result);
        
        if (result.success && result.data) {
          console.log('[Electron] Database file found, size:', result.data.length, 'bytes');
          const data = new Uint8Array(result.data);
          db = new SQL.Database(data);
          console.log('[Electron] Database loaded from file successfully');
          
          // Debug: Check what's in the loaded database
          try {
            const clientsResult = db.exec('SELECT COUNT(*) as count FROM clients');
            const itemsResult = db.exec('SELECT COUNT(*) as count FROM items');
            const invoicesResult = db.exec('SELECT COUNT(*) as count FROM invoices');
            
            console.log('[Electron] Loaded database contains:');
            console.log('- Clients:', clientsResult[0]?.values[0]?.[0] || 0);
            console.log('- Items:', itemsResult[0]?.values[0]?.[0] || 0);
            console.log('- Invoices:', invoicesResult[0]?.values[0]?.[0] || 0);
          } catch (dbError) {
            console.error('[Electron] Error checking loaded database:', dbError);
          }
        } else {
          console.log('[Electron] No database file found, creating new database');
          db = new SQL.Database();
          db.exec(`
            CREATE TABLE IF NOT EXISTS clients (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              address TEXT,
              gstin TEXT
            );
            CREATE TABLE IF NOT EXISTS items (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              description TEXT NOT NULL,
              hsn TEXT,
              unit_price REAL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS invoices (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              invoice_no TEXT UNIQUE,
              bill_date TEXT,
              client_id INTEGER,
              company_name TEXT,
              base_amount REAL DEFAULT 0,
              cgst REAL DEFAULT 0,
              sgst REAL DEFAULT 0,
              total_amount REAL DEFAULT 0,
              items_json TEXT,
              FOREIGN KEY (client_id) REFERENCES clients (id)
            );
            CREATE TABLE IF NOT EXISTS settings (
              id INTEGER PRIMARY KEY DEFAULT 1,
              company_name TEXT DEFAULT 'Your Company',
              address TEXT DEFAULT 'Your Address',
              gstin TEXT DEFAULT 'Your GSTIN',
              phone TEXT DEFAULT 'Your Phone',
              email TEXT DEFAULT 'your@email.com',
              logo_base64 TEXT DEFAULT '',
              invoice_prefix TEXT DEFAULT 'INV',
              invoice_padding INTEGER DEFAULT 4,
              cgst_percent REAL DEFAULT 9,
              sgst_percent REAL DEFAULT 9,
              export_folder_path TEXT DEFAULT ''
            );
            INSERT OR IGNORE INTO settings (id) VALUES (1);
          `);
          // Save initial db to file
          const data = db.export();
          await window.electronAPI.writeDatabaseFile(Array.from(data));
          console.log('[Electron] New database created and saved to file');
        }
      } else {
        // Web: use localStorage
        console.log('[Browser] Attempting to read database from localStorage...');
        const savedDb = localStorage.getItem('swiftbill');
        if (savedDb) {
          console.log('[Browser] Database found in localStorage');
          const data = new Uint8Array(JSON.parse(savedDb));
          db = new SQL.Database(data);
          console.log('[Browser] Database loaded from localStorage successfully');
        } else {
          console.log('[Browser] No database in localStorage, creating new database');
          db = new SQL.Database();
          db.exec(`
            CREATE TABLE IF NOT EXISTS clients (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              address TEXT,
              gstin TEXT
            );
            CREATE TABLE IF NOT EXISTS items (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              description TEXT NOT NULL,
              hsn TEXT,
              unit_price REAL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS invoices (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              invoice_no TEXT UNIQUE,
              bill_date TEXT,
              client_id INTEGER,
              company_name TEXT,
              base_amount REAL DEFAULT 0,
              cgst REAL DEFAULT 0,
              sgst REAL DEFAULT 0,
              total_amount REAL DEFAULT 0,
              items_json TEXT,
              FOREIGN KEY (client_id) REFERENCES clients (id)
            );
            CREATE TABLE IF NOT EXISTS settings (
              id INTEGER PRIMARY KEY DEFAULT 1,
              company_name TEXT DEFAULT 'Your Company',
              address TEXT DEFAULT 'Your Address',
              gstin TEXT DEFAULT 'Your GSTIN',
              phone TEXT DEFAULT 'Your Phone',
              email TEXT DEFAULT 'your@email.com',
              logo_base64 TEXT DEFAULT '',
              invoice_prefix TEXT DEFAULT 'INV',
              invoice_padding INTEGER DEFAULT 4,
              cgst_percent REAL DEFAULT 9,
              sgst_percent REAL DEFAULT 9,
              export_folder_path TEXT DEFAULT ''
            );
            INSERT OR IGNORE INTO settings (id) VALUES (1);
          `);
          const data = db.export();
          localStorage.setItem('swiftbill', JSON.stringify(Array.from(data)));
          console.log('[Browser] New database created and saved to localStorage');
        }
      }
      set({ db });
      console.log('[Database] Loading data from database...');
      await get().loadClients();
      await get().loadItems();
      await get().loadInvoices();
      await get().loadSettings();
      
      // Check if there are restored settings to apply
      const restoredSettings = localStorage.getItem('appSettings');
      if (restoredSettings) {
        try {
          console.log('Found restored settings, applying them...');
          const settings = JSON.parse(restoredSettings);
          console.log('Restored settings:', settings);
          await get().updateSettings(settings);
          // Clear the restored settings after applying
          localStorage.removeItem('appSettings');
          console.log('Restored settings applied successfully');
        } catch (error) {
          console.error('Error applying restored settings:', error);
        }
      }
      
      await get().loadMetrics();
      console.log('[Database] Initialization complete');
    } catch (error) {
      console.error('[sql.js] Failed to load WASM or initialize database:', error);
      throw error;
    }
  },

  // Helper to persist DB after changes
  persistDb: async () => {
    const { db } = get();
    if (!db) return;
    const data = db.export();
    if (isElectron()) {
      await window.electronAPI.writeDatabaseFile(Array.from(data));
    } else {
      localStorage.setItem('swiftbill', JSON.stringify(Array.from(data)));
    }
  },

  // Client operations
  addClient: async (client) => {
    const { db } = get();
    if (!db) return;
    try {
      db.run(
        'INSERT INTO clients (name, address, gstin) VALUES (?, ?, ?)',
        [client.name, client.address, client.gstin]
      );
      await get().persistDb();
      await get().loadClients();
    } catch (error) {
      console.error('Error adding client:', error);
    }
  },

  updateClient: async (id, client) => {
    const { db } = get();
    if (!db) return;
    try {
      db.run(
        'UPDATE clients SET name = ?, address = ?, gstin = ? WHERE id = ?',
        [client.name, client.address, client.gstin, id]
      );
      await get().persistDb();
      await get().loadClients();
    } catch (error) {
      console.error('Error updating client:', error);
    }
  },

  deleteClient: async (id) => {
    const { db } = get();
    if (!db) return;
    try {
      db.run('DELETE FROM clients WHERE id = ?', [id]);
      await get().persistDb();
      await get().loadClients();
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  },

  loadClients: async () => {
    const { db } = get();
    if (!db) return;
    
    try {
      console.log('[loadClients] Loading clients from database...');
      const result = db.exec('SELECT * FROM clients ORDER BY name');
      const clients = result[0] ? result[0].values.map((row: any) => ({
        id: row[0],
        name: row[1],
        address: row[2],
        gstin: row[3],
      })) : [];
      
      console.log('[loadClients] Loaded', clients.length, 'clients:', clients);
      set({ clients });
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  },

  // Item operations
  addItem: async (item) => {
    const { db } = get();
    if (!db) return;
    
    try {
      db.run(
        'INSERT INTO items (description, hsn, unit_price) VALUES (?, ?, ?)',
        [item.description, item.hsn, item.unit_price]
      );
      
      await get().persistDb();
      await get().loadItems();
    } catch (error) {
      console.error('Error adding item:', error);
    }
  },

  updateItem: async (id, item) => {
    const { db } = get();
    if (!db) return;
    
    try {
      db.run(
        'UPDATE items SET description = ?, hsn = ?, unit_price = ? WHERE id = ?',
        [item.description, item.hsn, item.unit_price, id]
      );
      
      await get().persistDb();
      await get().loadItems();
    } catch (error) {
      console.error('Error updating item:', error);
    }
  },

  deleteItem: async (id) => {
    const { db } = get();
    if (!db) return;
    
    try {
      db.run('DELETE FROM items WHERE id = ?', [id]);
      
      await get().persistDb();
      await get().loadItems();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  },

  loadItems: async () => {
    const { db } = get();
    if (!db) return;
    
    try {
      console.log('[loadItems] Loading items from database...');
      const result = db.exec('SELECT * FROM items ORDER BY description');
      const items = result[0] ? result[0].values.map((row: any) => ({
        id: row[0],
        description: row[1],
        hsn: row[2],
        unit_price: row[3],
      })) : [];
      
      console.log('[loadItems] Loaded', items.length, 'items:', items);
      set({ items });
    } catch (error) {
      console.error('Error loading items:', error);
    }
  },

  // Invoice operations
  generateInvoiceNumber: async () => {
    const { db, settings } = get();
    if (!db) return 'INV0001';
    
    try {
      // Get the highest invoice number for the current prefix
      const result = db.exec(`
        SELECT invoice_no FROM invoices 
        WHERE invoice_no LIKE '${settings.invoice_prefix}%' 
        ORDER BY CAST(SUBSTR(invoice_no, ${settings.invoice_prefix.length + 1}) AS INTEGER) DESC 
        LIMIT 1
      `);
      
      let nextNumber = 1;
      
      if (result[0] && result[0].values.length > 0) {
        const lastInvoiceNo = result[0].values[0][0] as string;
        const numberPart = lastInvoiceNo.substring(settings.invoice_prefix.length);
        nextNumber = parseInt(numberPart) + 1;
      }
      
      const paddedNumber = nextNumber.toString().padStart(settings.invoice_padding, '0');
      return `${settings.invoice_prefix}${paddedNumber}`;
    } catch (error) {
      console.error('Error generating invoice number:', error);
      return `${settings.invoice_prefix}${'1'.padStart(settings.invoice_padding, '0')}`;
    }
  },

  saveInvoice: async (invoice) => {
    const { db } = get();
    if (!db) return;
    
    try {
      if (invoice.id) {
        // Update existing invoice
        db.run(`
          UPDATE invoices SET 
            invoice_no = ?, bill_date = ?, client_id = ?, company_name = ?,
            base_amount = ?, cgst = ?, sgst = ?, total_amount = ?, items_json = ?
          WHERE id = ?
        `, [
          invoice.invoice_no, invoice.bill_date, invoice.client_id, invoice.company_name,
          invoice.base_amount, invoice.cgst, invoice.sgst, invoice.total_amount, 
          invoice.items_json, invoice.id
        ]);
      } else {
        // Insert new invoice
        db.run(`
          INSERT INTO invoices 
          (invoice_no, bill_date, client_id, company_name, base_amount, cgst, sgst, total_amount, items_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          invoice.invoice_no, invoice.bill_date, invoice.client_id, invoice.company_name,
          invoice.base_amount, invoice.cgst, invoice.sgst, invoice.total_amount, invoice.items_json
        ]);
      }
      
      await get().persistDb();
      await get().loadInvoices();
      await get().loadMetrics();
    } catch (error) {
      console.error('Error saving invoice:', error);
      throw error;
    }
  },

  loadInvoices: async () => {
    const { db } = get();
    if (!db) return;
    
    try {
      console.log('[loadInvoices] Loading invoices from database...');
      const result = db.exec('SELECT * FROM invoices ORDER BY bill_date DESC');
      const invoices = result[0] ? result[0].values.map((row: any) => ({
        id: row[0],
        invoice_no: row[1],
        bill_date: row[2],
        client_id: row[3],
        company_name: row[4],
        base_amount: row[5],
        cgst: row[6],
        sgst: row[7],
        total_amount: row[8],
        items_json: row[9],
      })) : [];
      
      console.log('[loadInvoices] Loaded', invoices.length, 'invoices:', invoices);
      set({ invoices });
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  },

  deleteInvoice: async (id) => {
    const { db } = get();
    if (!db) return;
    
    try {
      db.run('DELETE FROM invoices WHERE id = ?', [id]);
      
      await get().persistDb();
      await get().loadInvoices();
      await get().loadMetrics();
    } catch (error) {
      console.error('Error deleting invoice:', error);
    }
  },

  // Settings operations
  updateSettings: async (settings) => {
    const { db } = get();
    if (!db) return;
    
    try {
      const currentSettings = get().settings;
      const newSettings = { ...currentSettings, ...settings };
      
      db.run(`
        UPDATE settings SET 
          company_name = ?, address = ?, gstin = ?, phone = ?, email = ?,
          logo_base64 = ?, invoice_prefix = ?, invoice_padding = ?,
          cgst_percent = ?, sgst_percent = ?, export_folder_path = ?
        WHERE id = 1
      `, [
        newSettings.company_name, newSettings.address, newSettings.gstin,
        newSettings.phone, newSettings.email, newSettings.logo_base64,
        newSettings.invoice_prefix, newSettings.invoice_padding,
        newSettings.cgst_percent, newSettings.sgst_percent, newSettings.export_folder_path
      ]);
      
      await get().persistDb();
      await get().loadSettings();
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  },

  loadSettings: async () => {
    const { db } = get();
    if (!db) return;
    
    try {
      const result = db.exec('SELECT * FROM settings WHERE id = 1');
      if (result[0] && result[0].values[0]) {
        const row = result[0].values[0];
        const settings = {
          company_name: row[1] || 'Your Company',
          address: row[2] || 'Your Address',
          gstin: row[3] || 'Your GSTIN',
          phone: row[4] || 'Your Phone',
          email: row[5] || 'your@email.com',
          logo_base64: row[6] || '',
          invoice_prefix: row[7] || 'INV',
          invoice_padding: row[8] || 4,
          cgst_percent: row[9] || 9,
          sgst_percent: row[10] || 9,
          export_folder_path: row[11] || '',
        };
        
        set({ settings });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  },

  // Metrics
  loadMetrics: async () => {
    const { db } = get();
    if (!db) return;
    
    try {
      // Total revenue
      const revenueResult = db.exec('SELECT SUM(total_amount) as total FROM invoices');
      const totalRevenue = revenueResult[0]?.values[0]?.[0] || 0;
      
      // Total invoices
      const invoiceCountResult = db.exec('SELECT COUNT(*) as count FROM invoices');
      const totalInvoices = invoiceCountResult[0]?.values[0]?.[0] || 0;
      
      // Total clients
      const clientCountResult = db.exec('SELECT COUNT(*) as count FROM clients');
      const totalClients = clientCountResult[0]?.values[0]?.[0] || 0;
      
      // Average invoice value
      const avgInvoiceValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;
      
      set({
        metrics: {
          totalRevenue,
          totalInvoices,
          totalClients,
          avgInvoiceValue,
        }
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  },
}));
