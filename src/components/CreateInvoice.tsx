
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Trash2, Save, FileDown } from 'lucide-react';
import { useInvoiceStore } from '@/store/invoiceStore';
import { useDatabaseStore } from '@/store/databaseStore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface CreateInvoiceProps {
  onBack: () => void;
}

const CreateInvoice = ({ onBack }: CreateInvoiceProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
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
  } = useInvoiceStore();

  const { clients, items: itemsDb, settings, saveInvoice, loadClients, loadItems } = useDatabaseStore();

  useEffect(() => {
    loadClients();
    loadItems();
    
    // Generate invoice number
    if (!invoiceNo) {
      const nextNumber = String(Date.now()).slice(-4);
      setInvoiceNo(`${settings.invoice_prefix}${nextNumber.padStart(settings.invoice_padding, '0')}`);
    }
    
    // Set default date
    if (!billDate) {
      setBillDate(format(new Date(), 'yyyy-MM-dd'));
    }
    
    // Set default tax rates
    setCgstPercent(settings.cgst_percent);
    setSgstPercent(settings.sgst_percent);
  }, []);

  const handleClientChange = (clientIdStr: string) => {
    const selectedClientId = parseInt(clientIdStr);
    const selectedClient = clients.find(c => c.id === selectedClientId);
    
    setClientId(selectedClientId);
    if (selectedClient) {
      setCompanyName(selectedClient.name);
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    if (field === 'item_id' && value) {
      const selectedItem = itemsDb.find(item => item.id === parseInt(value));
      if (selectedItem) {
        updateItem(index, {
          item_id: selectedItem.id!,
          description: selectedItem.description,
          hsn: selectedItem.hsn,
          unit_price: selectedItem.unit_price,
        });
      }
    } else {
      updateItem(index, { [field]: value });
    }
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
      
      toast({
        title: "Success",
        description: "Invoice saved successfully!",
      });
      
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

  const convertToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    
    let result = '';
    
    // Crores
    if (num >= 10000000) {
      result += convertToWords(Math.floor(num / 10000000)) + ' Crore ';
      num %= 10000000;
    }
    
    // Lakhs
    if (num >= 100000) {
      result += convertToWords(Math.floor(num / 100000)) + ' Lakh ';
      num %= 100000;
    }
    
    // Thousands
    if (num >= 1000) {
      result += convertToWords(Math.floor(num / 1000)) + ' Thousand ';
      num %= 1000;
    }
    
    // Hundreds
    if (num >= 100) {
      result += ones[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    
    // Tens and ones
    if (num >= 20) {
      result += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    } else if (num >= 10) {
      result += teens[num - 10] + ' ';
      return result.trim();
    }
    
    if (num > 0) {
      result += ones[num] + ' ';
    }
    
    return result.trim();
  };

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
            Create Invoice
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
                <Button onClick={addItem} className="bg-gradient-to-r from-blue-500 to-purple-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No items added yet. Click "Add Item" to get started.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
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
                            <TableCell>
                              <Select
                                value={item.item_id?.toString()}
                                onValueChange={(value) => handleItemChange(index, 'item_id', value)}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select item" />
                                </SelectTrigger>
                                <SelectContent>
                                  {itemsDb.map((dbItem) => (
                                    <SelectItem key={dbItem.id} value={dbItem.id!.toString()}>
                                      {dbItem.description}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={item.hsn}
                                onChange={(e) => handleItemChange(index, 'hsn', e.target.value)}
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={item.po_no}
                                onChange={(e) => handleItemChange(index, 'po_no', e.target.value)}
                                className="w-24"
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
                            <TableCell>
                              <Input
                                type="number"
                                value={item.unit_price}
                                onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                min="0"
                                step="0.01"
                                className="w-24"
                              />
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
                    {loading ? 'Saving...' : 'Save Invoice'}
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className="w-full"
                    disabled={items.length === 0}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;
