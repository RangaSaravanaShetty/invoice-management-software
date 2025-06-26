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
}

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
      const SQL = await initSqlJs({
        locateFile: file => `https://sql.js.org/dist/${file}`
      });
      
      // Try to load existing database from localStorage
      const savedDb = localStorage.getItem('invoicedb');
      let db;
      
      if (savedDb) {
        const data = new Uint8Array(JSON.parse(savedDb));
        db = new SQL.Database(data);
      } else {
        db = new SQL.Database();
        
        // Create tables
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
      }
      
      set({ db });
      
      // Load initial data
      await get().loadClients();
      await get().loadItems();
      await get().loadInvoices();
      await get().loadSettings();
      await get().loadMetrics();
      
    } catch (error) {
      console.error('Failed to initialize database:', error);
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
      
      // Save to localStorage
      const data = db.export();
      localStorage.setItem('invoicedb', JSON.stringify(Array.from(data)));
      
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
      
      const data = db.export();
      localStorage.setItem('invoicedb', JSON.stringify(Array.from(data)));
      
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
      
      const data = db.export();
      localStorage.setItem('invoicedb', JSON.stringify(Array.from(data)));
      
      await get().loadClients();
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  },

  loadClients: async () => {
    const { db } = get();
    if (!db) return;
    
    try {
      const result = db.exec('SELECT * FROM clients ORDER BY name');
      const clients = result[0] ? result[0].values.map((row: any) => ({
        id: row[0],
        name: row[1],
        address: row[2],
        gstin: row[3],
      })) : [];
      
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
      
      const data = db.export();
      localStorage.setItem('invoicedb', JSON.stringify(Array.from(data)));
      
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
      
      const data = db.export();
      localStorage.setItem('invoicedb', JSON.stringify(Array.from(data)));
      
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
      
      const data = db.export();
      localStorage.setItem('invoicedb', JSON.stringify(Array.from(data)));
      
      await get().loadItems();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  },

  loadItems: async () => {
    const { db } = get();
    if (!db) return;
    
    try {
      const result = db.exec('SELECT * FROM items ORDER BY description');
      const items = result[0] ? result[0].values.map((row: any) => ({
        id: row[0],
        description: row[1],
        hsn: row[2],
        unit_price: row[3],
      })) : [];
      
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
      
      const data = db.export();
      localStorage.setItem('invoicedb', JSON.stringify(Array.from(data)));
      
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
      
      const data = db.export();
      localStorage.setItem('invoicedb', JSON.stringify(Array.from(data)));
      
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
      
      const data = db.export();
      localStorage.setItem('invoicedb', JSON.stringify(Array.from(data)));
      
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
