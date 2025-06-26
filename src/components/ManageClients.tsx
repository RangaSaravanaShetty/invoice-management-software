
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Edit, Trash2, Search } from 'lucide-react';
import { useDatabaseStore, type Client } from '@/store/databaseStore';
import { useToast } from '@/hooks/use-toast';

interface ManageClientsProps {
  onBack: () => void;
}

const ManageClients = ({ onBack }: ManageClientsProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<Omit<Client, 'id'>>({
    name: '',
    address: '',
    gstin: '',
  });

  const { clients, addClient, updateClient, deleteClient, loadClients } = useDatabaseStore();

  useEffect(() => {
    loadClients();
  }, []);

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.gstin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Client name is required.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingClient) {
        await updateClient(editingClient.id!, formData);
        toast({
          title: "Success",
          description: "Client updated successfully!",
        });
      } else {
        await addClient(formData);
        toast({
          title: "Success",
          description: "Client added successfully!",
        });
      }
      
      setIsDialogOpen(false);
      setEditingClient(null);
      setFormData({ name: '', address: '', gstin: '' });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save client. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      address: client.address,
      gstin: client.gstin,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (client: Client) => {
    if (window.confirm(`Are you sure you want to delete ${client.name}?`)) {
      try {
        await deleteClient(client.id!);
        toast({
          title: "Success",
          description: "Client deleted successfully!",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete client. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingClient(null);
    setFormData({ name: '', address: '', gstin: '' });
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
              Manage Clients
            </h1>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-green-500 to-emerald-600">
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingClient ? 'Edit Client' : 'Add New Client'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name">Company Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="gstin">GSTIN</Label>
                  <Input
                    id="gstin"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingClient ? 'Update' : 'Add'} Client
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
              <CardTitle className="text-lg text-slate-800">Client Directory</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredClients.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-slate-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                  <Users className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-800 mb-2">No clients found</h3>
                <p className="text-slate-600 mb-4">
                  {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first client.'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-to-r from-green-500 to-emerald-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Client
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>GSTIN</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                      <TableRow key={client.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell className="text-slate-600">
                          {client.address || 'Not provided'}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {client.gstin || 'Not provided'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(client)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(client)}
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
        {clients.length > 0 && (
          <div className="mt-6">
            <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total Clients</p>
                    <p className="text-2xl font-bold text-slate-800">{clients.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">With GSTIN</p>
                    <p className="text-2xl font-bold text-slate-800">
                      {clients.filter(c => c.gstin).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageClients;
