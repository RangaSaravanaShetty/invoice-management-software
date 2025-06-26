
import { create } from 'zustand';

export interface InvoiceItem {
  item_id: number;
  description: string;
  hsn: string;
  unit_price: number;
  quantity: number;
  po_no: string;
  po_date: string;
  amount: number;
}

export interface Invoice {
  id?: number;
  invoice_no: string;
  bill_date: string;
  client_id: number;
  company_name: string;
  base_amount: number;
  cgst: number;
  sgst: number;
  total_amount: number;
  items_json: string;
}

interface InvoiceState {
  items: InvoiceItem[];
  clientId: number | null;
  billDate: string;
  invoiceNo: string;
  companyName: string;
  cgstPercent: number;
  sgstPercent: number;
  
  // Actions
  updateItem: (index: number, item: Partial<InvoiceItem>) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
  setClientId: (id: number) => void;
  setBillDate: (date: string) => void;
  setInvoiceNo: (no: string) => void;
  setCompanyName: (name: string) => void;
  setCgstPercent: (percent: number) => void;
  setSgstPercent: (percent: number) => void;
  resetInvoice: () => void;
  
  // Computed values
  getBaseAmount: () => number;
  getCgstAmount: () => number;
  getSgstAmount: () => number;
  getTotalAmount: () => number;
}

export const useInvoiceStore = create<InvoiceState>((set, get) => ({
  items: [],
  clientId: null,
  billDate: '',
  invoiceNo: '',
  companyName: '',
  cgstPercent: 9,
  sgstPercent: 9,

  updateItem: (index, item) =>
    set((state) => {
      const newItems = [...state.items];
      newItems[index] = { ...newItems[index], ...item };
      // Recalculate amount
      newItems[index].amount = newItems[index].quantity * newItems[index].unit_price;
      return { items: newItems };
    }),

  addItem: () =>
    set((state) => ({
      items: [
        ...state.items,
        {
          item_id: 0,
          description: '',
          hsn: '',
          unit_price: 0,
          quantity: 1,
          po_no: '',
          po_date: '',
          amount: 0,
        },
      ],
    })),

  removeItem: (index) =>
    set((state) => ({
      items: state.items.filter((_, i) => i !== index),
    })),

  setClientId: (id) => set({ clientId: id }),
  setBillDate: (date) => set({ billDate: date }),
  setInvoiceNo: (no) => set({ invoiceNo: no }),
  setCompanyName: (name) => set({ companyName: name }),
  setCgstPercent: (percent) => set({ cgstPercent: percent }),
  setSgstPercent: (percent) => set({ sgstPercent: percent }),

  resetInvoice: () =>
    set({
      items: [],
      clientId: null,
      billDate: '',
      invoiceNo: '',
      companyName: '',
    }),

  getBaseAmount: () => {
    const { items } = get();
    return items.reduce((sum, item) => sum + item.amount, 0);
  },

  getCgstAmount: () => {
    const { getBaseAmount, cgstPercent } = get();
    return (getBaseAmount() * cgstPercent) / 100;
  },

  getSgstAmount: () => {
    const { getBaseAmount, sgstPercent } = get();
    return (getBaseAmount() * sgstPercent) / 100;
  },

  getTotalAmount: () => {
    const { getBaseAmount, getCgstAmount, getSgstAmount } = get();
    return getBaseAmount() + getCgstAmount() + getSgstAmount();
  },
}));
