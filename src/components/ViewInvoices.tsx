
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Search, Eye, Edit, Trash2, FileDown, FileText } from 'lucide-react';
import { useDatabaseStore } from '@/store/databaseStore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ViewInvoicesProps {
  onBack: () => void;
}

const ViewInvoices = ({ onBack }: ViewInvoicesProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  
  const { invoices, loadInvoices, deleteInvoice } = useDatabaseStore();

  useEffect(() => {
    loadInvoices();
  }, []);

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                          {format(new Date(invoice.bill_date), 'dd MMM yyyy')}
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
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
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
      </div>
    </div>
  );
};

export default ViewInvoices;
