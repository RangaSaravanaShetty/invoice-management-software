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
import { format } from 'date-fns';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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
        setBillDate(format(new Date(), 'dd-MM-yyyy'));
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
      };
      await saveInvoice(invoice);
      // PDF export logic (A4, visually appealing, less cluttered table)
      const client = clients.find(c => c.id === invoice.client_id);
      const company = settings;
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      let y = 800;
      // Standardize font sizes and alignments in handleSaveInvoice PDF export
      const leftMargin = 40;
      const sectionSpacing = 18;
      const labelFontSize = 12;
      const valueFontSize = 12;
      const headingFontSize = 22;
      const subheadingFontSize = 14;
      // Company name (centered, bold)
      const companyNameWidth = fontBold.widthOfTextAtSize(company.company_name, headingFontSize);
      page.drawText(company.company_name, { x: (595.28 - companyNameWidth) / 2, y, size: headingFontSize, font: fontBold });
      y -= headingFontSize + 6;
      // Address, GSTIN, Phone, Email (centered)
      const addressLine = company.address;
      const gstinLine = `GSTIN: ${company.gstin}`;
      const phoneEmailLine = `Phone: ${company.phone}  Email: ${company.email}`;
      const addressWidth = font.widthOfTextAtSize(addressLine, valueFontSize);
      const gstinWidth = font.widthOfTextAtSize(gstinLine, valueFontSize);
      const phoneEmailWidth = font.widthOfTextAtSize(phoneEmailLine, valueFontSize);
      page.drawText(addressLine, { x: (595.28 - addressWidth) / 2, y, size: valueFontSize, font });
      y -= valueFontSize + 2;
      page.drawText(gstinLine, { x: (595.28 - gstinWidth) / 2, y, size: valueFontSize, font });
      y -= valueFontSize + 2;
      page.drawText(phoneEmailLine, { x: (595.28 - phoneEmailWidth) / 2, y, size: valueFontSize, font });
      y -= 28; // Add +4 to previous spacing for more gap
      // Draw a line
      page.drawLine({ start: { x: leftMargin, y }, end: { x: 545, y }, thickness: 1, color: rgb(0.7,0.7,0.7) });
      y -= sectionSpacing;
      // Invoice number (left), date below (left)
      page.drawText(`Invoice No: ${invoice.invoice_no}`, { x: leftMargin, y, size: labelFontSize, font });
      y -= labelFontSize + 2;
      const formattedDate = invoice.bill_date.includes('-') && invoice.bill_date.length === 10
        ? invoice.bill_date.split('-').reverse().join('-')
        : invoice.bill_date;
      page.drawText(`Date: ${formattedDate}`, { x: leftMargin, y, size: labelFontSize, font });
      y -= sectionSpacing;
      // Bill To (bold)
      page.drawText('Bill To:', { x: leftMargin, y, size: subheadingFontSize, font: fontBold });
      y -= subheadingFontSize + 2;
      // Client name (bold)
      page.drawText(`${client?.name || ''}`, { x: leftMargin + 20, y, size: valueFontSize, font: fontBold });
      y -= valueFontSize + 2;
      // Client address (regular)
      page.drawText(`${client?.address || ''}`, { x: leftMargin + 20, y, size: valueFontSize, font });
      y -= 24;
      // Table (centered, with lines)
      const pageWidth = 595.28;
      const margin = 40;
      const tableWidth = pageWidth - margin * 2;
      const tableStartX = margin;
      const colWidths = [tableWidth * 0.16, tableWidth * 0.16, tableWidth * 0.28, tableWidth * 0.12, tableWidth * 0.14, tableWidth * 0.14];
      const headers = ['PO No', 'PO Date', 'Description', 'Qty', 'Rate', 'Amount'];
      let colX = tableStartX;
      const cellPadding = 8;
      // Table header background
      page.drawRectangle({ x: tableStartX, y: y - 4, width: tableWidth, height: 20, color: rgb(0.92,0.92,0.92) });
      // Table header
      headers.forEach((header, i) => {
        const colCenter = colX + colWidths[i] / 2;
        const textWidth = fontBold.widthOfTextAtSize(header, 12);
        page.drawText(header, { x: colCenter - textWidth / 2, y: y + 2, size: 12, font: fontBold });
        colX += colWidths[i];
      });
      y -= 20;
      // Table rows with lines
      items.forEach((item: any, idx: number) => {
        colX = tableStartX;
        const rowY = y;
        page.drawRectangle({ x: tableStartX, y: rowY - 2, width: tableWidth, height: 18, color: idx % 2 === 0 ? rgb(1,1,1) : rgb(0.97,0.98,1), opacity: idx % 2 === 0 ? 0 : 1 });
        // Center align all columns with padding
        const values = [item.po_no || '', item.po_date || '', item.description, String(item.quantity), String(item.unit_price), String(item.amount)];
        values.forEach((val, i) => {
          const colStart = colX + cellPadding;
          const colEnd = colX + colWidths[i] - cellPadding;
          const colCenter = (colStart + colEnd) / 2;
          const textWidth = font.widthOfTextAtSize(val, 12);
          page.drawText(val, { x: colCenter - textWidth / 2, y: rowY + 2, size: 12, font });
          colX += colWidths[i];
        });
        y -= 18;
      });
      // Table border
      page.drawRectangle({ x: tableStartX, y: y + 18, width: tableWidth, height: (items.length + 1) * 18, borderColor: rgb(0.7,0.7,0.7), borderWidth: 1, color: rgb(1,1,1), opacity: 0 });
      y -= 10;
      // Totals (left-aligned)
      const labelWidth = font.widthOfTextAtSize('SGST:', valueFontSize);
      let totalY = y;
      const totalLines = [
        { label: 'Base:', value: invoice.base_amount },
        { label: 'CGST:', value: invoice.cgst },
        { label: 'SGST:', value: invoice.sgst },
      ];
      totalLines.forEach(line => {
        page.drawText(line.label, { x: leftMargin, y: totalY, size: valueFontSize, font });
        page.drawText('INR', { x: leftMargin + labelWidth + 8, y: totalY, size: valueFontSize, font });
        page.drawText(String(line.value), { x: leftMargin + labelWidth + 40, y: totalY, size: valueFontSize, font });
        totalY -= valueFontSize + 6;
      });
      page.drawText('Total:', { x: leftMargin, y: totalY, size: valueFontSize, font: fontBold });
      page.drawText('INR', { x: leftMargin + labelWidth + 8, y: totalY, size: valueFontSize, font: fontBold });
      page.drawText(String(invoice.total_amount), { x: leftMargin + labelWidth + 40, y: totalY, size: valueFontSize, font: fontBold });
      y = totalY - sectionSpacing;
      // Amount in words (centered, fixed)
      const amountWords = convertToWords(Math.round(invoice.total_amount));
      const amountWordsText = `Amount in Words: ${amountWords} Rupees Only`;
      const amountWordsWidth = font.widthOfTextAtSize(amountWordsText, valueFontSize);
      page.drawText(amountWordsText, { x: (pageWidth - amountWordsWidth) / 2, y, size: valueFontSize, font });
      // After drawing amount in words
      const leftSectionY = y - 40;
      const rightSectionY = y - 40;
      // Left: Received Goods, Receiver Sign, Vehicle Number
      page.drawText('Received Goods in Good Condition', { x: leftMargin, y: leftSectionY, size: valueFontSize, font });
      page.drawText('Receiver Sign', { x: leftMargin, y: leftSectionY - 20, size: valueFontSize, font });
      page.drawText('Vehicle Number', { x: leftMargin, y: leftSectionY - 40, size: valueFontSize, font });
      // Right: For <Company Name> and Authorised Signatory, center-aligned to each other
      const forCompanyText = `For ${company.company_name}`;
      const authorisedText = 'Authorised Signatory';
      const rightBlockWidth = Math.max(
        fontBold.widthOfTextAtSize(forCompanyText, valueFontSize),
        font.widthOfTextAtSize(authorisedText, valueFontSize)
      );
      const rightBlockX = 595.28 - leftMargin - rightBlockWidth;
      page.drawText(forCompanyText, { x: rightBlockX + (rightBlockWidth - fontBold.widthOfTextAtSize(forCompanyText, valueFontSize)) / 2, y: rightSectionY, size: valueFontSize, font: fontBold });
      page.drawText(authorisedText, { x: rightBlockX + (rightBlockWidth - font.widthOfTextAtSize(authorisedText, valueFontSize)) / 2, y: rightSectionY - 20, size: valueFontSize, font });
      // Save PDF
      const pdfBytes = await pdfDoc.save();
      const fileName = `${invoice.invoice_no}.pdf`;
      const exportPath = settings.export_folder_path ? `${settings.export_folder_path}/${fileName}` : fileName;
      if (window.electronAPI) {
        await window.electronAPI.exportDatabase(pdfBytes, exportPath);
      } else {
        // Web: download
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      toast({ title: 'PDF Exported', description: 'PDF export successful!', variant: 'default' });
      resetInvoice();
      onBack();
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
                      value={billDate}
                      onChange={(e) => setBillDate(e.target.value)}
                      className="mt-1"
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
                    <Button className="bg-gradient-to-r from-blue-500 to-purple-600">
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
                          <TableHead>HSN</TableHead>
                          <TableHead>PO No</TableHead>
                          <TableHead>PO Date</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {item.description}
                            </TableCell>
                            <TableCell>
                              {item.hsn}
                            </TableCell>
                            <TableCell>
                              <Input
                                value={item.po_no}
                                onChange={(e) => handleItemChange(index, 'po_no', e.target.value)}
                                className="w-24"
                                placeholder="PO No"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="date"
                                value={item.po_date}
                                onChange={(e) => handleItemChange(index, 'po_date', e.target.value)}
                                className="w-32"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                                min="1"
                                className="w-16"
                              />
                            </TableCell>
                            <TableCell className="text-slate-600">
                              ₹{item.unit_price.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell className="font-medium">
                              ₹{item.amount.toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell>
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
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-slate-600 mb-1">Amount in Words:</p>
                  <p className="text-sm font-medium text-slate-800">
                    {convertToWords(Math.round(getTotalAmount()))} Rupees Only
                  </p>
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
          <p>© 2024 Developed by Ranganath Saravana</p>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;
