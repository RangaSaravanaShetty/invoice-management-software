
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Edit, Trash2, Search, Package } from 'lucide-react';
import { useDatabaseStore, type Item } from '@/store/databaseStore';
import { useToast } from '@/hooks/use-toast';

interface ManageItemsProps {
  onBack: () => void;
}

const ManageItems = ({ onBack }: ManageItemsProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState<Omit<Item, 'id'>>({
    description: '',
    hsn: '',
    unit_price: 0,
  });

  const { items, addItem, updateItem, deleteItem, loadItems } = useDatabaseStore();

  useEffect(() => {
    loadItems();
  }, []);

  const filteredItems = items.filter(item =>
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.hsn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Item description is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingItem) {
        await updateItem(editingItem.id!, formData);
        toast({
          title: "Success",
          description: "Item updated successfully!",
        });
      } else {
        await addItem(formData);
        toast({
          title: "Success",
          description: "Item added successfully!",
        });
      }
      
      setIsDialogOpen(false);
      setEditingItem(null);
      setFormData({ description: '', hsn: '', unit_price: 0 });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save item. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      description: item.description,
      hsn: item.hsn,
      unit_price: item.unit_price,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (item: Item) => {
    if (window.confirm(`Are you sure you want to delete "${item.description}"?`)) {
      try {
        await deleteItem(item.id!);
        toast({
          title: "Success",
          description: "Item deleted successfully!",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete item. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({ description: '', hsn: '', unit_price: 0 });
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
              Manage Items
            </h1>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-500 to-red-600">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Edit Item' : 'Add New Item'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="hsn">HSN Code</Label>
                  <Input
                    id="hsn"
                    value={formData.hsn}
                    onChange={(e) => setFormData({ ...formData, hsn: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="unit_price">Unit Price (₹) *</Label>
                  <Input
                    id="unit_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                    className="mt-1"
                    required
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingItem ? 'Update' : 'Add'} Item
                  </Button>
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Content */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-slate-800">Product Catalog</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-slate-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                  <Package className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">No items found</h3>
                <p className="text-slate-600 mb-4">
                  {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first item.'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-to-r from-orange-500 to-red-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Item
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>HSN Code</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell className="text-slate-600">
                          {item.hsn || 'Not provided'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₹{item.unit_price.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(item)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
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

        {/* Stats */}
        {items.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-0 shadow-lg bg-gradient-to-r from-orange-50 to-red-50">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm text-slate-600">Total Items</p>
                  <p className="text-2xl font-bold text-slate-800">{items.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-cyan-50">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm text-slate-600">Avg. Unit Price</p>
                  <p className="text-2xl font-bold text-slate-800">
                    ₹{items.length > 0 ? 
                      (items.reduce((sum, item) => sum + item.unit_price, 0) / items.length).toLocaleString('en-IN') : 
                      '0'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-gradient-to-r from-green-50 to-emerald-50">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm text-slate-600">With HSN Code</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {items.filter(item => item.hsn).length}
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

export default ManageItems;
