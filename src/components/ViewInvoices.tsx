import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Search, Eye, Edit, Trash2, FileDown, FileText } from 'lucide-react';
import { useDatabaseStore } from '@/store/databaseStore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import ViewInvoiceModal from './ViewInvoiceModal';
import pdfMake from 'pdfmake/build/pdfmake';
import vfsFonts from 'pdfmake/build/vfs_fonts';
import { parseDateFromDDMMYYYY, formatDateToDDMMYYYY } from '@/lib/utils';
pdfMake.vfs = vfsFonts.vfs;

interface ViewInvoicesProps {
  onBack: () => void;
  onEditInvoice: (invoice: any) => void;
}

const ViewInvoices = ({ onBack, onEditInvoice }: ViewInvoicesProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [pdfExportLoadingId, setPdfExportLoadingId] = useState<number | null>(null);
  
  const { invoices, loadInvoices, deleteInvoice, settings, clients } = useDatabaseStore();

  useEffect(() => {
    loadInvoices();
  }, []);

  const filteredInvoices = invoices
    .filter(invoice =>
      invoice.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.company_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Extract numeric part for comparison
      const numA = parseInt(a.invoice_no.replace(/\D/g, ''));
      const numB = parseInt(b.invoice_no.replace(/\D/g, ''));
      return numB - numA;
    });

  const handleView = (invoice: any) => {
    setSelectedInvoice(invoice);
    setViewModalOpen(true);
  };

  const handleEdit = (invoice: any) => {
    onEditInvoice(invoice);
  };

  const handleDelete = async (invoice: any) => {
    if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoice_no}?`)) {
      try {
        await deleteInvoice(invoice.id);
        toast({
          title: "Success",
          description: "Invoice deleted successfully!",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete invoice. Please try again.",
          variant: "destructive",
        });
      }
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

  const cellPadding = 10;

  const handleExportPDF = async (invoice: any) => {
    setPdfExportLoadingId(invoice.id);
    try {
      const client = clients.find(c => c.id === invoice.client_id);
      const company = settings;
      const items = JSON.parse(invoice.items_json);
      // Prepare table body with new columns
      const tableBody = [
        [
          { text: 'Sl No.', style: 'tableHeader', alignment: 'center' },
          { text: 'PO No.', style: 'tableHeader', alignment: 'center' },
          { text: 'PO Date', style: 'tableHeader', alignment: 'center' },
          { text: 'Description', style: 'tableHeader' },
          { text: 'HSN', style: 'tableHeader', alignment: 'center' },
          { text: 'Qty', style: 'tableHeader', alignment: 'center' },
          { text: 'Rate', style: 'tableHeader', alignment: 'center' },
          { text: 'Amount', style: 'tableHeader', alignment: 'center' },
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
      const baseAmount = round2(invoice.base_amount).toFixed(2);
      const cgst = round2(invoice.cgst).toFixed(2);
      const sgst = round2(invoice.sgst).toFixed(2);
      const grandTotal = round2(invoice.total_amount).toFixed(2);
      // Prepare document definition
      const docDefinition = {
        content: [
          { text: company.company_name, style: 'header' },
          { text: company.address, style: 'subheader' },
          { text: `Phone: ${company.phone} | Email: ${company.email}`, style: 'subheader' },
          { text: `GSTIN: ${company.gstin}`, style: 'gstinLine' },
          { canvas: [ { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#cccccc' } ] },
          { text: 'INVOICE', style: 'invoiceTitle' },
          {
            columns: [
              {
                width: '50%',
                stack: [
                  { text: 'Bill To:', style: 'billToLabel' },
                  { text: `    ${client?.name || ''}`, style: 'clientName' },
                  { text: `    ${client?.address || ''}`, style: 'clientAddress' },
                  { text: `    GSTIN: ${client?.gstin || ''}`, style: 'clientGstin' },
                ],
                alignment: 'left',
              },
              {
                width: '50%',
                stack: [
                  { text: `Invoice No: ${invoice.invoice_no}`, style: 'invoiceNumber' },
                  { text: `Date: ${formatDateToDDMMYYYY(parseDateFromDDMMYYYY(invoice.bill_date))}`, style: 'invoiceDate' },
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
                  { text: 'Sl No.', style: 'tableHeader', alignment: 'center' },
                  { text: 'PO No.', style: 'tableHeader', alignment: 'center' },
                  { text: 'PO Date', style: 'tableHeader', alignment: 'center' },
                  { text: 'Description', style: 'tableHeader' },
                  { text: 'HSN', style: 'tableHeader', alignment: 'center' },
                  { text: 'Qty', style: 'tableHeader', alignment: 'center' },
                  { text: 'Rate', style: 'tableHeader', alignment: 'center' },
                  { text: 'Amount', style: 'tableHeader', alignment: 'center' },
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
              { text: `Amount in words: ${convertToWordsWithPaise(invoice.total_amount)} Only`, style: 'totalLabel', bold: true, alignment: 'left', width: '*' },
              {
                table: {
                  widths: ['*', 'auto'],
                  body: [
                    [ { text: 'Base Amount', style: 'totalLabel' }, { text: `₹${baseAmount}`, style: 'totalValue' } ],
                    [ { text: `CGST @${invoice.cgst_percent ?? 9}%`, style: 'totalLabel' }, { text: `₹${cgst}`, style: 'totalValue' } ],
                    [ { text: `SGST @${invoice.sgst_percent ?? 9}%`, style: 'totalLabel' }, { text: `₹${sgst}`, style: 'totalValue' } ],
                    [ { text: `Total Tax @${(invoice.cgst_percent ?? 9) + (invoice.sgst_percent ?? 9)}%`, style: 'totalLabel' }, { text: `₹${(round2(invoice.cgst) + round2(invoice.sgst)).toFixed(2)}`, style: 'totalValue' } ],
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
                      { text: `Vehicle number: ${invoice.vehicle_number || '__________'}`, margin: [0, 0, 0, 8], style: 'footerNote', alignment: 'left' },
                    ],
                    alignment: 'left',
                    border: [false, false, false, false],
                  },
                  {
                    stack: [
                      { text: `For ${company.company_name}`, margin: [0, 0, 30, 8], style: 'footerNote', alignment: 'right' },
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
          setPdfExportLoadingId(null);
          return;
        }
        const exportPath = `${settings.export_folder_path}/${invoice.invoice_no}.pdf`;
        pdfMake.createPdf(docDefinition).getBuffer((buffer) => {
          window.electronAPI.exportDatabase(buffer, exportPath);
          toast({ title: 'PDF Exported', description: `PDF saved to: ${exportPath}`, variant: 'default' });
        });
      } else {
        pdfMake.createPdf(docDefinition).download(`${invoice.invoice_no}.pdf`);
        toast({ title: 'PDF Exported', description: 'PDF export successful!', variant: 'default' });
      }
    } catch (err) {
      toast({ title: 'PDF Export Error', description: String(err), variant: 'destructive' });
    } finally {
      setPdfExportLoadingId(null);
    }
  };

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

  function formatDateDDMMYYYY(dateStr: string) {
    if (!dateStr) return '';
    if (dateStr.includes('-') && dateStr.length === 10) {
      const parts = dateStr.split('-');
      if (parts[0].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`; // yyyy-MM-dd -> dd-MM-yyyy
      if (parts[2].length === 4) return dateStr; // already dd-MM-yyyy
    }
    return dateStr;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button variant="ghost" onClick={onBack} className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              View Invoices
            </h1>
          </div>
        </div>

        {/* Content */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-slate-800">Invoice History</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-slate-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">No invoices found</h3>
                <p className="text-slate-600 mb-4">
                  {searchTerm ? 'Try adjusting your search terms.' : 'You haven\'t created any invoices yet.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Base Amount</TableHead>
                      <TableHead className="text-right">CGST</TableHead>
                      <TableHead className="text-right">SGST</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium">{invoice.invoice_no}</TableCell>
                        <TableCell>
                          {parseDateFromDDMMYYYY(invoice.bill_date) ? formatDateToDDMMYYYY(parseDateFromDDMMYYYY(invoice.bill_date)) : ''}
                        </TableCell>
                        <TableCell className="text-slate-600">{invoice.company_name}</TableCell>
                        <TableCell className="text-right">
                          ₹{invoice.base_amount.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{invoice.cgst.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{invoice.sgst.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          ₹{invoice.total_amount.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(invoice)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(invoice)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Edit Invoice"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              title="Export PDF"
                              onClick={() => handleExportPDF(invoice)}
                              disabled={pdfExportLoadingId === invoice.id}
                            >
                              <FileDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(invoice)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete Invoice"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Stats */}
        {invoices.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-cyan-50">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm text-slate-600">Total Invoices</p>
                  <p className="text-2xl font-bold text-slate-800">{invoices.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-gradient-to-r from-green-50 to-emerald-50">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm text-slate-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-slate-800">
                    ₹{invoices.reduce((sum, inv) => sum + inv.total_amount, 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-gradient-to-r from-orange-50 to-red-50">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm text-slate-600">Avg Invoice Value</p>
                  <p className="text-2xl font-bold text-slate-800">
                    ₹{(invoices.reduce((sum, inv) => sum + inv.total_amount, 0) / invoices.length).toLocaleString('en-IN')}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-50 to-pink-50">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm text-slate-600">This Month</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {invoices.filter(inv => {
                      const invDate = parseDateFromDDMMYYYY(inv.bill_date);
                      const now = new Date();
                      return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
                    }).length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* View Invoice Modal */}
        <ViewInvoiceModal 
          invoice={selectedInvoice}
          isOpen={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedInvoice(null);
          }}
        />
      </div>
    </div>
  );
};

export default ViewInvoices;
