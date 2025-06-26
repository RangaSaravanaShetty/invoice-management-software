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
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleExportPDF = async (invoice: any) => {
    setPdfExportLoadingId(invoice.id);
    try {
      const client = clients.find(c => c.id === invoice.client_id);
      const company = settings;
      const items = JSON.parse(invoice.items_json);
      // Create PDF
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      let y = 800;
      // Standardize font sizes and alignments in handleExportPDF PDF export
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
      y -= 10;
      // Draw a line
      page.drawLine({ start: { x: leftMargin, y }, end: { x: 545, y }, thickness: 1, color: rgb(0.7,0.7,0.7) });
      y -= 24; // Increase the gap for more space
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
      y -= 28; // Add +4 to previous spacing for more gap
      // Table (centered, with lines)
      const pageWidth = 595.28;
      const margin = 40;
      const tableWidth = pageWidth - margin * 2;
      const tableStartX = margin;
      const colWidths = [tableWidth * 0.16, tableWidth * 0.16, tableWidth * 0.28, tableWidth * 0.12, tableWidth * 0.14, tableWidth * 0.14];
      const headers = ['PO No', 'PO Date', 'Description', 'Qty', 'Rate', 'Amount'];
      let colX = tableStartX;
      const cellPadding = 10;
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
    } catch (err) {
      toast({ title: 'PDF Export Error', description: String(err), variant: 'destructive' });
    } finally {
      setPdfExportLoadingId(null);
    }
  };

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
                          {(() => { const d = invoice.bill_date.split('-'); return `${d[2]}-${d[1]}-${d[0]}`; })()}
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
                      const invDate = new Date(inv.bill_date);
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
