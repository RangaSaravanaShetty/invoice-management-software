
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, FileDown, Calendar } from 'lucide-react';
import { useDatabaseStore } from '@/store/databaseStore';
import { format } from 'date-fns';

interface MonthlyStatementProps {
  onBack: () => void;
}

const MonthlyStatement = ({ onBack }: MonthlyStatementProps) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  
  const { invoices, loadInvoices } = useDatabaseStore();

  useEffect(() => {
    loadInvoices();
  }, []);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const filteredInvoices = invoices.filter(invoice => {
    const invoiceDate = new Date(invoice.bill_date);
    return invoiceDate.getMonth() === selectedMonth && invoiceDate.getFullYear() === selectedYear;
  });

  const totalStats = {
    baseAmount: filteredInvoices.reduce((sum, inv) => sum + inv.base_amount, 0),
    cgst: filteredInvoices.reduce((sum, inv) => sum + inv.cgst, 0),
    sgst: filteredInvoices.reduce((sum, inv) => sum + inv.sgst, 0),
    totalAmount: filteredInvoices.reduce((sum, inv) => sum + inv.total_amount, 0),
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
                disabled={filteredInvoices.length === 0}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Export PDF
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
                <p className="text-2xl font-bold">₹{totalStats.baseAmount.toLocaleString('en-IN')}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div>
                <p className="text-green-100 text-sm mb-1">CGST</p>
                <p className="text-2xl font-bold">₹{totalStats.cgst.toLocaleString('en-IN')}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div>
                <p className="text-orange-100 text-sm mb-1">SGST</p>
                <p className="text-2xl font-bold">₹{totalStats.sgst.toLocaleString('en-IN')}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div>
                <p className="text-purple-100 text-sm mb-1">Total Revenue</p>
                <p className="text-2xl font-bold">₹{totalStats.totalAmount.toLocaleString('en-IN')}</p>
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
                      <TableHead>Invoice No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Base Amount</TableHead>
                      <TableHead className="text-right">CGST</TableHead>
                      <TableHead className="text-right">SGST</TableHead>
                      <TableHead className="text-right">Total</TableHead>
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
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 border-slate-200 bg-slate-50 font-medium">
                      <TableCell colSpan={3} className="text-right font-bold">Total:</TableCell>
                      <TableCell className="text-right font-bold">
                        ₹{totalStats.baseAmount.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        ₹{totalStats.cgst.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        ₹{totalStats.sgst.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        ₹{totalStats.totalAmount.toLocaleString('en-IN')}
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
