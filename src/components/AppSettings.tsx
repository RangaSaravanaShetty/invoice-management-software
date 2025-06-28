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

// Helper function to compress database data for better performance
const compressDatabaseData = (data: Uint8Array): string => {
  // Convert to base64 for more efficient storage
  const binaryString = Array.from(data).map(byte => String.fromCharCode(byte)).join('');
  return btoa(binaryString);
};

// Helper function to decompress database data
const decompressDatabaseData = (compressedData: string): Uint8Array => {
  const binaryString = atob(compressedData);
  return new Uint8Array(binaryString.split('').map(char => char.charCodeAt(0)));
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
      try {
        const settings = useDatabaseStore.getState().settings;
        const exportFolder = settings.export_folder_path;
        if (!exportFolder) {
          toast({ title: 'Error', description: 'Export folder not set in settings.', variant: 'destructive' });
          return;
        }
        
        const timestamp = new Date().toISOString().split('T')[0];
        const fileName = `swiftbill-backup-${timestamp}.bin`;
        const backupPath = `${exportFolder}/backups/${fileName}`;
        
        console.log('Creating simple backup...');
        console.log('Source database path:', await window.electronAPI.getDatabasePath());
        console.log('Backup path:', backupPath);
        
        const result = await window.electronAPI.createSimpleBackup(backupPath);
        console.log('Backup result:', result);
        
        if (result.success) {
          toast({ title: 'Success', description: 'Backup created successfully!' });
        } else {
          throw new Error(result.error || 'Backup failed');
        }
      } catch (error) {
        console.error('Backup error:', error);
        toast({ title: 'Error', description: 'Failed to create backup.', variant: 'destructive' });
      }
    } else {
      // Browser fallback: Use the old compressed format
      try {
        const { db } = useDatabaseStore.getState();
        if (!db) return;
        
        const data = db.export();
        
        const timestamp = new Date().toISOString().split('T')[0];
        
        // Create backup with compressed database (settings are already in the database)
        const backupData = {
          database: compressDatabaseData(data), // Compressed binary data
          timestamp: new Date().toISOString(),
          version: '1.4',
          format: 'compressed',
          originalSize: data.length
        };
        
        console.log('Creating browser backup with original size:', data.length, 'bytes');
        console.log('Compressed size:', backupData.database.length, 'characters');
        console.log('Compression ratio:', ((1 - backupData.database.length / (data.length * 1.33)) * 100).toFixed(1) + '%');
        
        const blob = new Blob([JSON.stringify(backupData)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `swiftbill-backup-${timestamp}.backup`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: 'Success', description: 'Backup created successfully!' });
      } catch (error) {
        console.error('Backup error:', error);
        toast({ title: 'Error', description: 'Failed to create backup.', variant: 'destructive' });
      }
    }
  };

  const handleRestoreData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (isElectron()) {
      // Electron: Simple file copy restore
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          console.log('Restoring from file:', file.name);
          
          // For Electron, we'll read the file as ArrayBuffer and write it directly
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const uint8 = new Uint8Array(arrayBuffer);
          
          console.log('Restoring database file, size:', uint8.length, 'bytes');
          
          // Write the database file directly
          await window.electronAPI.writeDatabaseFile(Array.from(uint8));
          
          console.log('Database restored successfully');
          toast({ 
            title: 'Success', 
            description: 'Backup restored successfully! The application will reload in 2 seconds.' 
          });
          
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } catch (error) {
          console.error('Restore error:', error);
          toast({ 
            title: 'Error', 
            description: error.message || 'Failed to restore backup.', 
            variant: 'destructive' 
          });
        }
      };
      
      reader.readAsArrayBuffer(file);
    } else {
      // Browser: Use the simplified restore logic
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = event.target?.result as string;
          
          // Check file type and handle accordingly
          if (file.name.endsWith('.backup')) {
            // New simplified backup format (browser)
            const backupData = JSON.parse(data);
            
            console.log('Restoring from simplified backup format:', backupData);
            
            if (backupData.version === '1.4' && backupData.format === 'compressed') {
              // New simplified compressed format
              if (!backupData.database) {
                throw new Error('Invalid simplified backup file format.');
              }
              
              try {
                // Decompress the database data
                const decompressedData = decompressDatabaseData(backupData.database);
                console.log('Decompressed database size:', decompressedData.length, 'bytes');
                
                // Store the decompressed data (settings are already in the database)
                localStorage.setItem('swiftbill', JSON.stringify(Array.from(decompressedData)));
                
                console.log('Simplified backup data restored successfully');
              } catch (decompressError) {
                throw new Error('Failed to decompress database data.');
              }
            } else if (backupData.version === '1.2' && backupData.format === 'compressed') {
              // Old format with separate settings
              if (!backupData.database || !backupData.settings) {
                throw new Error('Invalid old backup file format.');
              }
              
              try {
                // Decompress the database data
                const decompressedData = decompressDatabaseData(backupData.database);
                console.log('Decompressed database size:', decompressedData.length, 'bytes');
                
                // Store the decompressed data
                localStorage.setItem('swiftbill', JSON.stringify(Array.from(decompressedData)));
                localStorage.setItem('appSettings', JSON.stringify(backupData.settings));
                
                console.log('Old backup format data restored successfully');
              } catch (decompressError) {
                throw new Error('Failed to decompress database data.');
              }
            } else {
              throw new Error('Unsupported backup file format.');
            }
            
            // Show success message and reload
            toast({ 
              title: 'Success', 
              description: 'Data restored successfully! The application will reload in 2 seconds.' 
            });
            
            // Reload after a short delay to ensure data is saved
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } else {
            throw new Error('Unsupported file format for browser. Please use .backup files.');
          }
        } catch (error) {
          console.error('Restore error:', error);
          toast({ 
            title: 'Error', 
            description: error.message || 'Failed to restore data. Invalid backup file.', 
            variant: 'destructive' 
          });
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

  // Function to get current database statistics
  const getDatabaseStats = () => {
    const { clients, items, invoices, settings } = useDatabaseStore.getState();
    return {
      clients: clients.length,
      items: items.length,
      invoices: invoices.length,
      settings: settings.company_name
    };
  };

  // Function to estimate backup size
  const estimateBackupSize = () => {
    const { db } = useDatabaseStore.getState();
    if (!db) return null;
    
    const data = db.export();
    const originalSize = data.length;
    const compressedSize = compressDatabaseData(data).length;
    const compressionRatio = ((1 - compressedSize / (originalSize * 1.33)) * 100).toFixed(1);
    
    return {
      originalSize: (originalSize / 1024).toFixed(1) + ' KB',
      compressedSize: (compressedSize / 1024).toFixed(1) + ' KB',
      compressionRatio: compressionRatio + '%'
    };
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
                  <div className="space-y-3">
                    <Button onClick={handleBackupData} className="w-full bg-gradient-to-r from-blue-500 to-cyan-600">
                      <Download className="h-4 w-4 mr-2" />
                      Download Backup
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const stats = getDatabaseStats();
                        console.log('Current database stats:', stats);
                        toast({
                          title: 'Database Statistics',
                          description: `Clients: ${stats.clients}, Items: ${stats.items}, Invoices: ${stats.invoices}, Company: ${stats.settings}`,
                        });
                      }}
                      className="w-full"
                    >
                      Show Current Stats
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const sizeInfo = estimateBackupSize();
                        if (sizeInfo) {
                          console.log('Backup size estimation:', sizeInfo);
                          toast({
                            title: 'Backup Size Estimation',
                            description: `Original: ${sizeInfo.originalSize}, Compressed: ${sizeInfo.compressedSize} (${sizeInfo.compressionRatio} smaller)`,
                          });
                        } else {
                          toast({
                            title: 'Error',
                            description: 'Could not estimate backup size.',
                            variant: 'destructive'
                          });
                        }
                      }}
                      className="w-full"
                    >
                      Estimate Backup Size
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const { db } = useDatabaseStore.getState();
                        if (db) {
                          try {
                            const clientsResult = db.exec('SELECT COUNT(*) as count FROM clients');
                            const itemsResult = db.exec('SELECT COUNT(*) as count FROM items');
                            const invoicesResult = db.exec('SELECT COUNT(*) as count FROM invoices');
                            
                            const clientCount = clientsResult[0]?.values[0]?.[0] || 0;
                            const itemCount = itemsResult[0]?.values[0]?.[0] || 0;
                            const invoiceCount = invoicesResult[0]?.values[0]?.[0] || 0;
                            
                            console.log('Current database state:');
                            console.log('- Clients:', clientCount);
                            console.log('- Items:', itemCount);
                            console.log('- Invoices:', invoiceCount);
                            
                            toast({
                              title: 'Current Database State',
                              description: `Clients: ${clientCount}, Items: ${itemCount}, Invoices: ${invoiceCount}`,
                            });
                          } catch (error) {
                            console.error('Error checking database state:', error);
                            toast({
                              title: 'Error',
                              description: 'Could not check database state.',
                              variant: 'destructive'
                            });
                          }
                        } else {
                          toast({
                            title: 'Error',
                            description: 'Database not initialized.',
                            variant: 'destructive'
                          });
                        }
                      }}
                      className="w-full"
                    >
                      Check Database State
                    </Button>
                    {isElectron() && (
                      <>
                        <Button 
                          variant="outline" 
                          onClick={async () => {
                            try {
                              const dbPath = await window.electronAPI.getDatabasePath();
                              console.log('Database file path:', dbPath);
                              toast({
                                title: 'Database File Path',
                                description: dbPath,
                              });
                            } catch (error) {
                              console.error('Error getting database path:', error);
                              toast({
                                title: 'Error',
                                description: 'Could not get database path.',
                                variant: 'destructive'
                              });
                            }
                          }}
                          className="w-full"
                        >
                          Show Database Path
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={async () => {
                            try {
                              const result = await window.electronAPI.clearDatabase();
                              console.log('Clear database result:', result);
                              if (result.success) {
                                toast({
                                  title: 'Success',
                                  description: result.message,
                                });
                                // Reload after clearing
                                setTimeout(() => {
                                  window.location.reload();
                                }, 2000);
                              } else {
                                toast({
                                  title: 'Error',
                                  description: result.error,
                                  variant: 'destructive'
                                });
                              }
                            } catch (error) {
                              console.error('Error clearing database:', error);
                              toast({
                                title: 'Error',
                                description: 'Could not clear database.',
                                variant: 'destructive'
                              });
                            }
                          }}
                          className="w-full"
                        >
                          Clear Database (Test)
                        </Button>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    Backup includes: SQLite Database (clients, invoices, items) + Application Settings
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    💡 Electron: Direct .bin copy | Browser: Compressed .backup file
                  </p>
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
                    accept=".bin,.backup"
                    onChange={handleRestoreData}
                    className="w-full"
                  />
                  <p className="text-sm text-amber-600 mt-2">
                    ⚠️ Warning: This will overwrite all existing data.
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Supported formats: .bin (Electron), .backup (browser)
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    💡 Direct database copies - no conversion needed
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
