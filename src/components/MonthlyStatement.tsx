import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, FileDown, Calendar } from 'lucide-react';
import { useDatabaseStore } from '@/store/databaseStore';
import { format } from 'date-fns';
import pdfMake from 'pdfmake/build/pdfmake';
import vfsFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = vfsFonts.vfs;
import { toast } from '@/components/ui/use-toast';

interface MonthlyStatementProps {
  onBack: () => void;
}

const MonthlyStatement = ({ onBack }: MonthlyStatementProps) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  
  const { invoices, loadInvoices, settings } = useDatabaseStore();
  const [pdfExportLoading, setPdfExportLoading] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, []);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Helper function to parse date from dd-MM-yyyy format
  const parseDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed in Date constructor
  };

  const filteredInvoices = invoices
    .filter(invoice => {
      // Parse date from dd-MM-yyyy format
      const invoiceDate = parseDate(invoice.bill_date);
      const invoiceMonth = invoiceDate.getMonth();
      const invoiceYear = invoiceDate.getFullYear();
      return invoiceMonth === selectedMonth && invoiceYear === selectedYear;
    })
    .sort((a, b) => {
      // Extract numeric part for comparison
      const numA = parseInt(a.invoice_no.replace(/\D/g, ''));
      const numB = parseInt(b.invoice_no.replace(/\D/g, ''));
      return numA - numB;
    });

  const totalStats = {
    baseAmount: filteredInvoices.reduce((sum, inv) => sum + inv.base_amount, 0),
    cgst: filteredInvoices.reduce((sum, inv) => sum + inv.cgst, 0),
    sgst: filteredInvoices.reduce((sum, inv) => sum + inv.sgst, 0),
    totalAmount: filteredInvoices.reduce((sum, inv) => sum + inv.total_amount, 0),
  };

  const handleExportPDF = async () => {
    setPdfExportLoading(true);
    try {
      const company = settings;
      // Prepare table body
      const tableBody = [
        [
          { text: 'Sl No', style: 'tableHeader' },
          { text: 'Invoice No', style: 'tableHeader' },
          { text: 'Date', style: 'tableHeader' },
          { text: 'Client Name', style: 'tableHeader' },
          { text: 'Amount', style: 'tableHeader' },
          { text: 'CGST', style: 'tableHeader' },
          { text: 'SGST', style: 'tableHeader' },
          { text: 'Total', style: 'tableHeader' },
        ],
        ...filteredInvoices.map((item, idx) => [
          { text: (idx + 1).toString(), alignment: 'center', fontSize: 8 },
          { text: item.invoice_no || '', alignment: 'center', fontSize: 8 },
          { text: parseDate(item.bill_date).toLocaleDateString(), alignment: 'center', fontSize: 8 },
          { text: item.company_name || '', alignment: 'center', fontSize: 8 },
          { text: item.base_amount?.toLocaleString('en-IN') ?? '', alignment: 'center', fontSize: 8 },
          { text: item.cgst?.toLocaleString('en-IN') ?? '', alignment: 'center', fontSize: 8 },
          { text: item.sgst?.toLocaleString('en-IN') ?? '', alignment: 'center', fontSize: 8 },
          { text: item.total_amount?.toLocaleString('en-IN') ?? '', alignment: 'center', fontSize: 8 },
        ]),
      ];

      // Prepare document definition with professional invoice styling
      const docDefinition = {
        content: [
          { text: company.company_name, style: 'header' },
          { text: company.address, style: 'subheader' },
          { text: `GSTIN: ${company.gstin} | Phone: ${company.phone} | Email: ${company.email}`, style: 'subheader' },
          { canvas: [ { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#cccccc' } ] },
          { text: 'MONTHLY STATEMENT', style: 'invoiceTitle' },
          { text: `Month: ${months[selectedMonth]}`, style: 'details' },
          { text: `Year: ${selectedYear}`, style: 'details' },
          { text: '\n' },
          {
            table: {
              headerRows: 1,
              widths: [30, 60, 50, '*', 60, 45, 45, 60],
              body: tableBody,
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
            text: [
              { text: 'Total Quantity: ', bold: true, fontSize: 9 },
              { text: `${filteredInvoices.length}`, fontSize: 9 },
              { text: '\n' },
              { text: 'Base Amount: ', bold: true, fontSize: 9 },
              { text: `₹${totalStats.baseAmount.toLocaleString('en-IN')}`, fontSize: 9 },
              { text: '\n' },
              { text: 'CGST: ', bold: true, fontSize: 9 },
              { text: `₹${totalStats.cgst.toLocaleString('en-IN')}`, fontSize: 9 },
              { text: '\n' },
              { text: 'SGST: ', bold: true, fontSize: 9 },
              { text: `₹${totalStats.sgst.toLocaleString('en-IN')}`, fontSize: 9 },
              { text: '\n' },
              { text: 'Grand Total: ', bold: true, fontSize: 10, color: '#0f172a' },
              { text: `₹${totalStats.totalAmount.toLocaleString('en-IN')}`, fontSize: 10, bold: true, color: '#0f172a' },
            ],
            alignment: 'left',
            margin: [0, 10, 0, 10],
          },
          { text: '\n' },
          { text: 'End of Statement', style: 'endStatement' },
          { text: '\n' },
          { canvas: [ { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#cccccc' } ] },
        ],
        styles: {
          header: { fontSize: 22, bold: true, alignment: 'center', margin: [0, 0, 0, 10], color: '#1e293b' },
          subheader: { fontSize: 11, alignment: 'center', margin: [0, 0, 0, 2], color: '#334155' },
          invoiceTitle: { fontSize: 15, bold: true, alignment: 'center', margin: [0, 12, 0, 12], color: '#0f172a' },
          details: { fontSize: 10, margin: [0, 0, 0, 2], color: '#334155' },
          tableHeader: { bold: true, fontSize: 10, color: '#0f172a', fillColor: '#e3e8f0', alignment: 'center' },
          totals: { fontSize: 11, bold: true, margin: [0, 4, 0, 0], color: '#0f172a' },
          amountWords: { fontSize: 10, italics: true, color: '#64748b', margin: [0, 8, 0, 0] },
          endStatement: { fontSize: 12, bold: true, alignment: 'center', margin: [0, 10, 0, 10], color: '#0f172a' },
        },
        defaultStyle: { fontSize: 10 },
        pageSize: 'A4',
        pageMargins: [30, 40, 30, 40],
      };

      // Generate PDF and save (Electron or browser)
      if (window.electronAPI && window.electronAPI.exportDatabase) {
        if (!settings.export_folder_path) {
          toast({ title: 'Export Folder Not Set', description: 'Please set the export folder in settings before exporting PDF.', variant: 'destructive' });
          setPdfExportLoading(false);
          return;
        }
        const exportPath = `${settings.export_folder_path}/statements/MonthlyStatement-${months[selectedMonth]}-${selectedYear}.pdf`;
        pdfMake.createPdf(docDefinition).getBuffer((buffer) => {
          window.electronAPI.exportDatabase(buffer, exportPath);
          toast({ title: 'PDF exported successfully!', description: `Saved to: ${exportPath}` });
          setPdfExportLoading(false);
        });
      } else {
        pdfMake.createPdf(docDefinition).download(`MonthlyStatement-${months[selectedMonth]}-${selectedYear}.pdf`);
        toast({ title: 'PDF exported successfully!', description: `Saved to: MonthlyStatement-${months[selectedMonth]}-${selectedYear}.pdf` });
        setPdfExportLoading(false);
      }
    } catch (err) {
      setPdfExportLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button variant="ghost" onClick={onBack} className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Monthly Statement
            </h1>
          </div>
        </div>

        {/* Filters */}
        <Card className="shadow-lg border-0 mb-6">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Select Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div>
                <label className="text-sm font-medium text-slate-600 mb-2 block">Month</label>
                <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-600 mb-2 block">Year</label>
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                className="bg-gradient-to-r from-indigo-500 to-blue-600"
                disabled={filteredInvoices.length === 0 || pdfExportLoading}
                onClick={handleExportPDF}
              >
                <FileDown className="h-4 w-4 mr-2" />
                {pdfExportLoading ? 'Exporting...' : 'Export PDF'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div>
                <p className="text-blue-100 text-sm mb-1">Base Amount</p>
                <p className="text-2xl font-bold">INR {totalStats.baseAmount.toLocaleString('en-IN')}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div>
                <p className="text-green-100 text-sm mb-1">CGST</p>
                <p className="text-2xl font-bold">INR {totalStats.cgst.toLocaleString('en-IN')}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div>
                <p className="text-orange-100 text-sm mb-1">SGST</p>
                <p className="text-2xl font-bold">INR {totalStats.sgst.toLocaleString('en-IN')}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div>
                <p className="text-purple-100 text-sm mb-1">Total Revenue</p>
                <p className="text-2xl font-bold">INR {totalStats.totalAmount.toLocaleString('en-IN')}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice Details */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800">
              Invoice Details - {months[selectedMonth]} {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-slate-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                  <Calendar className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">No invoices found</h3>
                <p className="text-slate-600">
                  No invoices were created in {months[selectedMonth]} {selectedYear}.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Invoice No</TableHead>
                      <TableHead className="text-center">Date</TableHead>
                      <TableHead className="text-center">Client</TableHead>
                      <TableHead className="text-center">Base Amount</TableHead>
                      <TableHead className="text-center">CGST</TableHead>
                      <TableHead className="text-center">SGST</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium text-center">{invoice.invoice_no}</TableCell>
                        <TableCell className="text-center">
                          {parseDate(invoice.bill_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-slate-600 text-center">{invoice.company_name}</TableCell>
                        <TableCell className="text-center">
                          {invoice.base_amount.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-center">
                          {invoice.cgst.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-center">
                          {invoice.sgst.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-center font-medium text-green-600">
                          {invoice.total_amount.toLocaleString('en-IN')}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 border-slate-200 bg-slate-50 font-medium">
                      <TableCell colSpan={3} className="text-center font-bold">Total:</TableCell>
                      <TableCell className="text-center font-bold">
                        {totalStats.baseAmount.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {totalStats.cgst.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {totalStats.sgst.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-center font-bold text-green-600">
                        {totalStats.totalAmount.toLocaleString('en-IN')}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MonthlyStatement;

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
