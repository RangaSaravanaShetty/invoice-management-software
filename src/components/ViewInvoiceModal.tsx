import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { parseDateFromDDMMYYYY } from '@/lib/utils';

interface ViewInvoiceModalProps {
  invoice: any;
  isOpen: boolean;
  onClose: () => void;
}

const ViewInvoiceModal = ({ invoice, isOpen, onClose }: ViewInvoiceModalProps) => {
  if (!invoice) return null;

  const items = invoice.items_json ? JSON.parse(invoice.items_json) : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              Invoice {invoice.invoice_no}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Invoice Header */}
          <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 rounded-lg">
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Invoice Details</h3>
              <p><span className="font-medium">Invoice No:</span> {invoice.invoice_no}</p>
              <p><span className="font-medium">Date:</span> {parseDateFromDDMMYYYY(invoice.bill_date).toLocaleDateString()}</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">Client Details</h3>
              <p><span className="font-medium">Company:</span> {invoice.company_name}</p>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-4">Line Items</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>HSN</TableHead>
                    <TableHead>PO No</TableHead>
                    <TableHead>PO Date</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell>{item.hsn}</TableCell>
                      <TableCell>{item.po_no || '-'}</TableCell>
                      <TableCell>
                        {item.po_date ? parseDateFromDDMMYYYY(item.po_date).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">₹{item.unit_price.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-right">₹{item.amount.toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="max-w-md ml-auto space-y-2">
              <div className="flex justify-between">
                <span>Base Amount:</span>
                <span>₹{invoice.base_amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>CGST:</span>
                <span>₹{invoice.cgst.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST:</span>
                <span>₹{invoice.sgst.toLocaleString('en-IN')}</span>
              </div>
              <hr />
              <div className="flex justify-between font-bold text-lg">
                <span>Total Amount:</span>
                <span className="text-green-600">₹{invoice.total_amount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewInvoiceModal;
