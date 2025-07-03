import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, Plus, Trash2, Save, FileDown, Search } from 'lucide-react';
import { useInvoiceStore } from '@/store/invoiceStore';
import { useDatabaseStore } from '@/store/databaseStore';
import { useToast } from '@/hooks/use-toast';
import { format as formatDate, parseISO } from 'date-fns';
import pdfMake from 'pdfmake/build/pdfmake';
import vfsFonts from 'pdfmake/build/vfs_fonts';
import { parseDateFromDDMMYYYY, formatDateToDDMMYYYY } from '@/lib/utils';
import { version } from '@/version';
pdfMake.vfs = vfsFonts.vfs;

interface CreateInvoiceProps {
  onBack: () => void;
  editingInvoice?: any;
}

const CreateInvoice = ({ onBack, editingInvoice }: CreateInvoiceProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [pdfExportLoading, setPdfExportLoading] = useState(false);
  const [lastSavedInvoice, setLastSavedInvoice] = useState<any>(null);
  const [vehicleNumber, setVehicleNumber] = useState('');
  
  const {
    items,
    clientId,
    billDate,
    invoiceNo,
    companyName,
    cgstPercent,
    sgstPercent,
    addItem,
    removeItem,
    updateItem,
    setClientId,
    setBillDate,
    setInvoiceNo,
    setCompanyName,
    setCgstPercent,
    setSgstPercent,
    resetInvoice,
    getBaseAmount,
    getCgstAmount,
    getSgstAmount,
    getTotalAmount,
    loadInvoiceForEditing,
  } = useInvoiceStore();

  const { clients, items: itemsDb, settings, saveInvoice, loadClients, loadItems, generateInvoiceNumber } = useDatabaseStore();

  useEffect(() => {
    loadClients();
    loadItems();
    
    if (editingInvoice) {
      // Load existing invoice for editing
      loadInvoiceForEditing(editingInvoice);
    } else {
      // Generate proper sequential invoice number for new invoice
      if (!invoiceNo) {
        generateInvoiceNumber().then(setInvoiceNo);
      }
      
      // Set default date
      if (!billDate) {
        setBillDate(formatDate(new Date(), 'dd-MM-yyyy'));
      }
    }
    
    // Set default tax rates
    setCgstPercent(settings.cgst_percent);
    setSgstPercent(settings.sgst_percent);
  }, [editingInvoice]);

  const handleClientChange = (clientIdStr: string) => {
    const selectedClientId = parseInt(clientIdStr);
    const selectedClient = clients.find(c => c.id === selectedClientId);
    
    setClientId(selectedClientId);
    if (selectedClient) {
      setCompanyName(selectedClient.name);
    }
  };

  const handleAddItemFromSearch = (selectedItem: any) => {
    addItem();
    const newIndex = items.length;
    updateItem(newIndex, {
      item_id: selectedItem.id!,
      description: selectedItem.description,
      hsn: selectedItem.hsn,
      unit_price: selectedItem.unit_price,
      quantity: 1,
      po_no: '',
      po_date: '',
    });
    setSearchOpen(false);
    setSearchValue('');
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    updateItem(index, { [field]: value });
  };

  const handleSaveInvoice = async () => {
    if (!clientId || !billDate || !invoiceNo || items.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields and add at least one item.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const invoice = {
        id: editingInvoice?.id,
        invoice_no: invoiceNo,
        bill_date: billDate,
        client_id: clientId,
        company_name: companyName,
        base_amount: getBaseAmount(),
        cgst: getCgstAmount(),
        sgst: getSgstAmount(),
        total_amount: getTotalAmount(),
        items_json: JSON.stringify(items),
        vehicle_number: vehicleNumber,
      };
      await saveInvoice(invoice);
      // Prepare table body with new columns
      const tableBody = [
        [
          { text: 'Sl No.', style: 'tableHeader' },
          { text: 'PO No.', style: 'tableHeader' },
          { text: 'PO Date', style: 'tableHeader' },
          { text: 'Description', style: 'tableHeader' },
          { text: 'HSN', style: 'tableHeader' },
          { text: 'Qty', style: 'tableHeader' },
          { text: 'Rate', style: 'tableHeader' },
          { text: 'Amount', style: 'tableHeader' },
        ],
        ...items.map((item, idx) => [
          { text: idx + 1, alignment: 'center' },
          { text: item.po_no || '', alignment: 'center' },
          { text: item.po_date ? formatDateToDDMMYYYY(parseDateFromDDMMYYYY(item.po_date)) : '', alignment: 'center' },
          { text: item.description || '' },
          { text: item.hsn || '', alignment: 'center' },
          { text: item.quantity ?? '', alignment: 'center' },
          { text: item.unit_price ?? '', alignment: 'center' },
          { text: round2(item.amount ?? 0).toFixed(2), alignment: 'center' },
        ]),
      ];
      // Calculate totals
      const totalQuantity = items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
      const baseAmount = round2(getBaseAmount()).toFixed(2);
      const cgst = round2(getCgstAmount()).toFixed(2);
      const sgst = round2(getSgstAmount()).toFixed(2);
      const grandTotal = round2(getTotalAmount()).toFixed(2);
      // Prepare document definition
      const docDefinition = {
        content: [
          { text: settings.company_name, style: 'header' },
          { text: settings.address, style: 'subheader' },
          { text: `Phone: ${settings.phone} | Email: ${settings.email}`, style: 'subheader' },
          { text: `GSTIN: ${settings.gstin}`, style: 'gstinLine' },
          { canvas: [ { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#cccccc' } ] },
          { text: 'INVOICE', style: 'invoiceTitle' },
          {
            columns: [
              {
                width: '50%',
                stack: [
                  { text: 'Bill To:', style: 'billToLabel' },
                  { text: `    ${clients.find(c => c.id === clientId)?.name || ''}`, style: 'clientName' },
                  { text: `    ${clients.find(c => c.id === clientId)?.address || ''}`, style: 'clientAddress' },
                  { text: `    GSTIN: ${clients.find(c => c.id === clientId)?.gstin || ''}`, style: 'clientGstin' },
                ],
                alignment: 'left',
              },
              {
                width: '50%',
                stack: [
                  { text: `Invoice No: ${invoiceNo}`, style: 'invoiceNumber' },
                  { text: `Date: ${formatDateToDDMMYYYY(parseDateFromDDMMYYYY(billDate))}`, style: 'invoiceDate' },
                ],
                alignment: 'right',
              },
            ],
            columnGap: 10,
          },
          { text: '\n' },
          {
            table: {
              headerRows: 1,
              // Column widths: [Sl No, PO No, PO Date, Description, HSN, Quantity, Rate, Amount]
              widths: [24, 48, 60, '*', 40, 20, 36, 60],
              body: [
                [
                  { text: 'Sl No.', style: 'tableHeader' },
                  { text: 'PO No.', style: 'tableHeader' },
                  { text: 'PO Date', style: 'tableHeader' },
                  { text: 'Description', style: 'tableHeader' },
                  { text: 'HSN', style: 'tableHeader' },
                  { text: 'Qty', style: 'tableHeader' },
                  { text: 'Rate', style: 'tableHeader' },
                  { text: 'Amount', style: 'tableHeader' },
                ],
                ...items.map((item, idx) => [
                  { text: idx + 1, alignment: 'center' },
                  { text: item.po_no || '', alignment: 'center' },
                  { text: item.po_date ? formatDateToDDMMYYYY(parseDateFromDDMMYYYY(item.po_date)) : '', alignment: 'center' },
                  { text: item.description || '' },
                  { text: item.hsn || '', alignment: 'center' },
                  { text: item.quantity ?? '', alignment: 'center' },
                  { text: item.unit_price ?? '', alignment: 'center' },
                  { text: round2(item.amount ?? 0).toFixed(2), alignment: 'center' },
                ]),
                [
                  { text: 'Total Quantity:', style: 'tableFooter', colSpan: 5, alignment: 'right' },
                  '', '', '', '',
                  { text: `${totalQuantity}`, style: 'tableFooter', alignment: 'center' },
                  { text: 'Total Amt', style: 'tableFooter', alignment: 'right' },
                  { text: `₹${baseAmount}`, style: 'tableFooter', alignment: 'center' },
                ],
              ],
            },
            layout: {
              fillColor: (rowIndex) => (rowIndex === 0 ? '#e3e8f0' : rowIndex % 2 === 0 ? '#f8fafc' : null),
              hLineColor: () => '#d1d5db',
              vLineColor: () => '#d1d5db',
              hLineWidth: () => 0.7,
              vLineWidth: () => 0.7,
              paddingTop: () => 6,
              paddingBottom: () => 6,
              paddingLeft: () => 4,
              paddingRight: () => 4,
            },
          },
          { text: '\n' },
          {
            columns: [
              { text: `Amount in words: ${convertToWordsWithPaise(getTotalAmount())} Only`, style: 'totalLabel', bold: true, alignment: 'left', width: '*' },
              {
                table: {
                  widths: ['*', 'auto'],
                  body: [
                    [ { text: 'Base Amount', style: 'totalLabel' }, { text: `₹${baseAmount}`, style: 'totalValue' } ],
                    [ { text: `CGST @${cgstPercent}%`, style: 'totalLabel' }, { text: `₹${cgst}`, style: 'totalValue' } ],
                    [ { text: `SGST @${sgstPercent}%`, style: 'totalLabel' }, { text: `₹${sgst}`, style: 'totalValue' } ],
                    [ { text: `Total Tax @${(cgstPercent + sgstPercent)}%`, style: 'totalLabel' }, { text: `₹${(round2(getCgstAmount()) + round2(getSgstAmount())).toFixed(2)}`, style: 'totalValue' } ],
                    [ { text: 'Grand Total', style: 'grandTotalLabel' }, { text: `₹${grandTotal}`, style: 'grandTotalValue', margin: [8, 0, 0, 0] } ],
                  ],
                },
                layout: {
                  hLineWidth: () => 0,
                  vLineWidth: () => 0,
                  paddingTop: () => 4,
                  paddingBottom: () => 4,
                  paddingLeft: () => 0,
                  paddingRight: () => 0,
                },
                alignment: 'right',
                margin: [0, 0, 0, 0],
                width: 240,
              }
            ],
            columnGap: 20,
            margin: [0, 10, 0, 24],
          },
        ],
        footer: function(currentPage, pageCount) {
          return [
            {
              table: {
                widths: ['*', '*'],
                body: [[
                  {
                    stack: [
                      { text: 'SUGAM number :', margin: [0, 0, 0, 8], style: 'footerNote', alignment: 'left' },
                      { text: 'Received goods in good condition', margin: [0, 0, 0, 8], style: 'footerNote', alignment: 'left' },
                      { text: 'Receiver sign', margin: [0, 0, 0, 8], style: 'footerNote', alignment: 'left' },
                      { text: `Vehicle number: ${vehicleNumber || '__________'}`, margin: [0, 0, 0, 8], style: 'footerNote', alignment: 'left' },
                    ],
                    alignment: 'left',
                    border: [false, false, false, false],
                  },
                  {
                    stack: [
                      { text: `For ${settings.company_name}`, margin: [0, 0, 30, 8], style: 'footerNote', alignment: 'right' },
                      { text: 'Authorised signature', margin: [0, 0, 30, 8], style: 'footerNote', alignment: 'right' },
                    ],
                    alignment: 'right',
                    border: [false, false, false, false],
                  }
                ]]
              },
              layout: 'noBorders',
              margin: [30, 0, 0, 0]
            }
          ];
        },
        styles: {
          header: { fontSize: 22, bold: true, alignment: 'center', margin: [0, 0, 0, 10], color: '#1e293b' },
          subheader: { fontSize: 9, alignment: 'center', margin: [0, 0, 0, 2], color: '#334155' },
          gstinLine: { fontSize: 9, alignment: 'center', margin: [0, 0, 0, 2], color: '#334155' },
          invoiceTitle: { fontSize: 12, bold: true, alignment: 'center', margin: [0, 12, 0, 12], color: '#0f172a' },
          billToLabel: { fontSize: 10, bold: true, margin: [0, 0, 0, 4], color: '#334155' },
          clientName: { fontSize: 10, bold: true, margin: [0, 0, 0, 2], color: '#0f172a' },
          clientAddress: { fontSize: 9, margin: [0, 0, 0, 2], color: '#334155' },
          clientGstin: { fontSize: 9, bold: true, margin: [0, 0, 0, 2], color: '#0f172a' },
          invoiceNumber: { fontSize: 10, bold: true, margin: [0, 0, 0, 2], color: '#334155' },
          invoiceDate: { fontSize: 10, margin: [0, 0, 0, 2], color: '#334155' },
          tableHeader: { bold: true, fontSize: 10, color: '#0f172a', fillColor: '#e3e8f0', alignment: 'center' },
          tableFooter: { bold: true, fontSize: 10, color: '#0f172a', fillColor: '#f1f5f9', alignment: 'center' },
          totals: { fontSize: 9, bold: true, margin: [0, 4, 0, 0], color: '#0f172a' },
          amountWords: { fontSize: 8, italics: true, color: '#64748b', margin: [0, 8, 0, 0], alignment: 'center' },
          footerNote: { fontSize: 10, color: '#64748b' },
          totalLabel: { fontSize: 10, bold: true, color: '#0f172a', alignment: 'right' },
          totalValue: { fontSize: 10, bold: true, color: '#0f172a', alignment: 'right' },
          grandTotalLabel: { fontSize: 10.8, bold: true, color: '#0f172a', alignment: 'right' },
          grandTotalValue: { fontSize: 10.8, bold: true, color: '#0f172a', alignment: 'right' },
        },
        defaultStyle: { fontSize: 8, characterSpacing: 1 },
        pageSize: 'A4',
        pageMargins: [30, 40, 30, 120],
      };

      // Generate PDF and save (Electron or browser)
      if (window.electronAPI && window.electronAPI.exportDatabase) {
        if (!settings.export_folder_path) {
          toast({ title: 'Export Folder Not Set', description: 'Please set the export folder in settings before exporting PDF.', variant: 'destructive' });
          setLoading(false);
          return;
        }
        const exportPath = `${settings.export_folder_path}/${invoiceNo}.pdf`;
        pdfMake.createPdf(docDefinition).getBuffer((buffer) => {
          window.electronAPI.exportDatabase(buffer, exportPath);
          toast({ title: 'PDF Exported', description: `PDF saved to: ${exportPath}`, variant: 'default' });
          resetInvoice();
          setVehicleNumber('');
          onBack();
        });
      } else {
        pdfMake.createPdf(docDefinition).download(`${invoiceNo}.pdf`);
        toast({ title: 'PDF Exported', description: 'PDF export successful!', variant: 'default' });
        resetInvoice();
        setVehicleNumber('');
        onBack();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add a local function for amount in words
  function convertToWords(num: number): string {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    if (num === 0) return 'Zero';
    let result = '';
    if (num >= 10000000) { result += convertToWords(Math.floor(num / 10000000)) + ' Crore '; num %= 10000000; }
    if (num >= 100000) { result += convertToWords(Math.floor(num / 100000)) + ' Lakh '; num %= 100000; }
    if (num >= 1000) { result += convertToWords(Math.floor(num / 1000)) + ' Thousand '; num %= 1000; }
    if (num >= 100) { result += ones[Math.floor(num / 100)] + ' Hundred '; num %= 100; }
    if (num >= 20) { result += tens[Math.floor(num / 10)] + ' '; num %= 10; }
    else if (num >= 10) { result += teens[num - 10] + ' '; return result.trim(); }
    if (num > 0) { result += ones[num] + ' '; }
    return result.trim();
  }

  // Helper to robustly round to 2 decimal places
  function round2(val: any) {
    // Handles numbers and numeric strings, avoids floating point issues
    const num = typeof val === 'string' ? parseFloat(val) : Number(val);
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  // Helper to wrap text for PDF table cells
  function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
    if (!text) return [''];
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // Add this helper function below convertToWords
  function convertToWordsWithPaise(amount: number): string {
    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);
    let words = convertToWords(rupees) + ' Rupees';
    if (paise > 0) {
      words += ' and ' + convertToWords(paise) + ' Paise';
    }
    return words;
  }

  // For date input, add helpers:
  function toInputDate(ddmmyyyy: string) {
    if (!ddmmyyyy) return '';
    const [dd, mm, yyyy] = ddmmyyyy.split('-');
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  function fromInputDate(yyyymmdd: string) {
    if (!yyyymmdd) return '';
    const [yyyy, mm, dd] = yyyymmdd.split('-');
    return `${dd}-${mm}-${yyyy}`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={onBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            {editingInvoice ? 'Edit Invoice' : 'Create Invoice'}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoice Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-lg text-slate-800">Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="invoiceNo">Invoice Number *</Label>
                    <Input
                      id="invoiceNo"
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="billDate">Bill Date *</Label>
                    <Input
                      id="billDate"
                      type="date"
                      value={toInputDate(billDate)}
                      onChange={(e) => setBillDate(fromInputDate(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                    <Input
                      id="vehicleNumber"
                      value={vehicleNumber}
                      onChange={e => setVehicleNumber(e.target.value)}
                      className="mt-1"
                      placeholder="Enter vehicle number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="client">Client *</Label>
                    <Select value={clientId?.toString()} onValueChange={handleClientChange}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id!.toString()}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cgst">CGST % *</Label>
                    <Input
                      id="cgst"
                      type="number"
                      value={cgstPercent}
                      onChange={(e) => setCgstPercent(parseFloat(e.target.value))}
                      min="0"
                      step="0.01"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sgst">SGST % *</Label>
                    <Input
                      id="sgst"
                      type="number"
                      value={sgstPercent}
                      onChange={(e) => setSgstPercent(parseFloat(e.target.value))}
                      min="0"
                      step="0.01"
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card className="shadow-lg border-0">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg text-slate-800">Line Items</CardTitle>
                <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button className="bg-gradient-to-r from-blue-500 to-purple-600" disabled={items.length >= 10}>
                      <Search className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Search items..." 
                        value={searchValue}
                        onValueChange={setSearchValue}
                      />
                      <CommandList>
                        <CommandEmpty>No items found.</CommandEmpty>
                        <CommandGroup>
                          {itemsDb
                            .filter(item => 
                              item.description.toLowerCase().includes(searchValue.toLowerCase())
                            )
                            .map((item) => (
                            <CommandItem
                              key={item.id}
                              onSelect={() => handleAddItemFromSearch(item)}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{item.description}</span>
                                <span className="text-sm text-slate-500">
                                  HSN: {item.hsn} | ₹{item.unit_price}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No items added yet. Search and add items to get started.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-center">HSN</TableHead>
                          <TableHead className="text-center">PO No</TableHead>
                          <TableHead className="text-center">PO Date</TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          <TableHead className="text-center">Rate</TableHead>
                          <TableHead className="text-center">Amount</TableHead>
                          <TableHead className="text-center"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {item.description}
                            </TableCell>
                            <TableCell className="text-center">
                              {item.hsn}
                            </TableCell>
                            <TableCell className="text-center">
                              <Input
                                value={item.po_no}
                                onChange={(e) => handleItemChange(index, 'po_no', e.target.value)}
                                className="w-24 text-center"
                                placeholder="PO No"
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Input
                                type="date"
                                value={item.po_date}
                                onChange={(e) => handleItemChange(index, 'po_date', e.target.value)}
                                className="w-36 text-center"
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                                min="1"
                                className="w-16 text-center"
                              />
                            </TableCell>
                            <TableCell className="text-center text-slate-600">
                              ₹{item.unit_price.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              ₹{item.amount.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <div className="space-y-6">
            <Card className="shadow-lg border-0 bg-gradient-to-br from-slate-50 to-slate-100">
              <CardHeader>
                <CardTitle className="text-lg text-slate-800">Invoice Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Base Amount:</span>
                    <span className="font-medium">₹{getBaseAmount().toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">CGST ({cgstPercent}%):</span>
                    <span className="font-medium">₹{getCgstAmount().toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">SGST ({sgstPercent}%):</span>
                    <span className="font-medium">₹{getSgstAmount().toLocaleString('en-IN')}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Amount:</span>
                    <span className="text-green-600">₹{getTotalAmount().toLocaleString('en-IN')}</span>
                  </div>
                </div>
                
                <div className="space-y-3 mt-6">
                  <Button 
                    onClick={handleSaveInvoice}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : editingInvoice ? 'Update Invoice' : 'Save Invoice'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer with credits */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>© 2025 SwiftBill v{version} - Developed by Ranganath Saravana</p>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;
