import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Upload, Download, Settings } from 'lucide-react';
import { useDatabaseStore, type AppSettings } from '@/store/databaseStore';
import { useToast } from '@/hooks/use-toast';

interface AppSettingsProps {
  onBack: () => void;
}

// Add this utility to detect Electron
const isElectron = () => {
  return typeof window !== 'undefined' && !!(window).electronAPI;
};

declare global {
  interface Window {
    electronAPI?: any;
  }
}

const AppSettingsComponent = ({ onBack }: AppSettingsProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<AppSettings>({
    company_name: '',
    address: '',
    gstin: '',
    phone: '',
    email: '',
    logo_base64: '',
    invoice_prefix: 'INV',
    invoice_padding: 4,
    cgst_percent: 9,
    sgst_percent: 9,
    export_folder_path: '',
  });

  const { settings, updateSettings, loadSettings } = useDatabaseStore();

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await updateSettings(formData);
      toast({
        title: "Success",
        description: "Settings updated successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setFormData({ ...formData, logo_base64: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackupData = async () => {
    if (isElectron()) {
      const { db } = useDatabaseStore.getState();
      if (!db) return;
      const data = db.export(); // Uint8Array
      const settings = useDatabaseStore.getState().settings;
      const exportFolder = settings.export_folder_path;
      if (!exportFolder) {
        toast({ title: 'Error', description: 'Export folder not set in settings.', variant: 'destructive' });
        return;
      }
      const fileName = `invoice-backup-${new Date().toISOString().split('T')[0]}.sqlite`;
      const exportPath = `${exportFolder}/${fileName}`;
      // Send as Buffer for binary write
      await window.electronAPI.exportDatabase(Array.from(data), exportPath);
      toast({ title: 'Success', description: 'Backup created successfully!' });
    } else {
      // Browser fallback: JSON
      const dataStr = localStorage.getItem('invoicedb');
      if (dataStr) {
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: 'Success', description: 'Backup created successfully!' });
      }
    }
  };

  const handleRestoreData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (isElectron()) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const uint8 = new Uint8Array(arrayBuffer);
          // Save to localStorage as JSON string for compatibility
          localStorage.setItem('invoicedb', JSON.stringify(Array.from(uint8)));
          window.location.reload();
        } catch (error) {
          toast({ title: 'Error', description: 'Failed to restore data. Invalid backup file.', variant: 'destructive' });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Browser fallback: JSON
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = event.target?.result as string;
          localStorage.setItem('invoicedb', data);
          toast({ title: 'Success', description: 'Data restored successfully! Please refresh the page.' });
        } catch (error) {
          toast({ title: 'Error', description: 'Failed to restore data. Invalid backup file.', variant: 'destructive' });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSelectFolder = async () => {
    if (window && window.electronAPI && window.electronAPI.selectFolder) {
      const folderPath = await window.electronAPI.selectFolder();
      if (folderPath) {
        setFormData({ ...formData, export_folder_path: folderPath });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={onBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Settings
          </h1>
        </div>

        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="company">Company Info</TabsTrigger>
            <TabsTrigger value="invoice">Invoice Settings</TabsTrigger>
            <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
          </TabsList>

          {/* Company Information */}
          <TabsContent value="company">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="company_name">Company Name *</Label>
                      <Input
                        id="company_name"
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        className="mt-1"
                        required
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="logo">Company Logo</Label>
                    <div className="mt-1 flex items-center gap-4">
                      <Input
                        id="logo"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="flex-1"
                      />
                      {formData.logo_base64 && (
                        <img
                          src={formData.logo_base64}
                          alt="Logo preview"
                          className="h-12 w-12 object-contain border rounded"
                        />
                      )}
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-500 to-purple-600">
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : 'Save Settings'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoice Settings */}
          <TabsContent value="invoice">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-lg text-slate-800">Invoice Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="invoice_prefix">Invoice Prefix</Label>
                      <Input
                        id="invoice_prefix"
                        value={formData.invoice_prefix}
                        onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
                        className="mt-1"
                        placeholder="INV"
                      />
                    </div>
                    <div>
                      <Label htmlFor="invoice_padding">Number Padding</Label>
                      <Input
                        id="invoice_padding"
                        type="number"
                        min="1"
                        max="10"
                        value={formData.invoice_padding}
                        onChange={(e) => setFormData({ ...formData, invoice_padding: parseInt(e.target.value) || 4 })}
                        className="mt-1"
                      />
                      <p className="text-sm text-slate-600 mt-1">
                        Example: {formData.invoice_prefix}{'0'.repeat(Math.max(0, formData.invoice_padding - 1))}1
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="cgst_percent">Default CGST %</Label>
                      <Input
                        id="cgst_percent"
                        type="number"
                        min="0"
                        max="50"
                        step="0.01"
                        value={formData.cgst_percent}
                        onChange={(e) => setFormData({ ...formData, cgst_percent: parseFloat(e.target.value) || 0 })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sgst_percent">Default SGST %</Label>
                      <Input
                        id="sgst_percent"
                        type="number"
                        min="0"
                        max="50"
                        step="0.01"
                        value={formData.sgst_percent}
                        onChange={(e) => setFormData({ ...formData, sgst_percent: parseFloat(e.target.value) || 0 })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="export_folder_path">Export Folder Path</Label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Input
                        id="export_folder_path"
                        value={formData.export_folder_path}
                        onChange={(e) => setFormData({ ...formData, export_folder_path: e.target.value })}
                        className="mt-1"
                        readOnly={isElectron()}
                      />
                      {isElectron() && (
                        <Button type="button" onClick={handleSelectFolder} className="mt-1">Select Folder</Button>
                      )}
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-green-500 to-emerald-600">
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : 'Save Settings'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backup & Restore */}
          <TabsContent value="backup">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Backup Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 mb-4">
                    Create a backup of all your invoices, clients, items, and settings.
                  </p>
                  <Button onClick={handleBackupData} className="w-full bg-gradient-to-r from-blue-500 to-cyan-600">
                    <Download className="h-4 w-4 mr-2" />
                    Download Backup
                  </Button>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Restore Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 mb-4">
                    Restore your data from a previous backup file. This will replace all current data.
                  </p>
                  <Input
                    type="file"
                    accept=".sqlite"
                    onChange={handleRestoreData}
                    className="w-full"
                  />
                  <p className="text-sm text-amber-600 mt-2">
                    ⚠️ Warning: This will overwrite all existing data.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AppSettingsComponent;
