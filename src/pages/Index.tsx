import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarIcon, CreditCard, Gauge, ListChecks, Settings, TrendingUp, Users, Package } from "lucide-react";
import { useDatabaseStore } from '@/store/databaseStore';
import CreateInvoice from '@/components/CreateInvoice';
import ManageClients from '@/components/ManageClients';
import ManageItems from '@/components/ManageItems';
import ViewInvoices from '@/components/ViewInvoices';
import AppSettings from '@/components/AppSettings';
import MonthlyStatement from '@/components/MonthlyStatement';

const Index = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const { initializeDatabase, metrics, loadMetrics } = useDatabaseStore();

  useEffect(() => {
    initializeDatabase();

    // Electron: backup database on close
    if (typeof window !== 'undefined' && window.electronAPI) {
      const handleBeforeUnload = async (e: any) => {
        const dataStr = localStorage.getItem('invoicedb');
        const settings = useDatabaseStore.getState().settings;
        if (dataStr && settings.export_folder_path) {
          const exportPath = `${settings.export_folder_path}/invoice-backup-${new Date().toISOString().split('T')[0]}.json`;
          await window.electronAPI.exportDatabase(dataStr, exportPath);
        }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, []);

  const handleEditInvoice = (invoice: any) => {
    setEditingInvoice(invoice);
    setCurrentView('create-invoice');
  };

  const handleBackToDashboard = () => {
    setEditingInvoice(null);
    setCurrentView('dashboard');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'create-invoice':
        return <CreateInvoice onBack={handleBackToDashboard} editingInvoice={editingInvoice} />;
      case 'manage-clients':
        return <ManageClients onBack={() => setCurrentView('dashboard')} />;
      case 'manage-items':
        return <ManageItems onBack={() => setCurrentView('dashboard')} />;
      case 'view-invoices':
        return <ViewInvoices onBack={() => setCurrentView('dashboard')} onEditInvoice={handleEditInvoice} />;
      case 'monthly-statement':
        return <MonthlyStatement onBack={() => setCurrentView('dashboard')} />;
      case 'settings':
        return <AppSettings onBack={() => setCurrentView('dashboard')} />;
      default:
        return (
          <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-6">
            <div className="container mx-auto max-w-7xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                    Invoice Dashboard
                  </h1>
                  <p className="text-slate-600 text-lg">Manage your business invoicing with ease</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Quick Actions */}
                <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-slate-50/50 backdrop-blur">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl text-slate-800 flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <CreditCard className="h-4 w-4 text-white" />
                      </div>
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <Button 
                      onClick={() => setCurrentView('create-invoice')} 
                      className="w-full justify-start h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Create Invoice
                    </Button>
                    <Button 
                      onClick={() => setCurrentView('manage-clients')} 
                      className="w-full justify-start h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Manage Clients
                    </Button>
                    <Button 
                      onClick={() => setCurrentView('manage-items')} 
                      className="w-full justify-start h-12 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Manage Items
                    </Button>
                    <Button 
                      onClick={() => setCurrentView('view-invoices')} 
                      className="w-full justify-start h-12 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
                    >
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      View Invoices
                    </Button>
                    <Button 
                      onClick={() => setCurrentView('monthly-statement')} 
                      className="w-full justify-start h-12 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Monthly Statement
                    </Button>
                    <Button 
                      onClick={() => setCurrentView('settings')} 
                      className="w-full justify-start h-12 bg-gradient-to-r from-slate-500 to-gray-600 hover:from-slate-600 hover:to-gray-700 text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Button>
                  </CardContent>
                </Card>

                {/* Summary Stats */}
                <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-slate-50/50 backdrop-blur">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl text-slate-800 flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                        <Gauge className="h-4 w-4 text-white" />
                      </div>
                      Business Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                      <div className="space-y-1">
                        <p className="text-sm text-green-700 font-medium">Total Revenue</p>
                        <p className="text-3xl font-bold text-green-800">₹{metrics.totalRevenue.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                          <CreditCard className="h-4 w-4 text-white" />
                        </div>
                        <p className="text-2xl font-bold text-blue-800">{metrics.totalInvoices}</p>
                        <p className="text-xs text-blue-600 font-medium">Invoices</p>
                      </div>
                      
                      <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                          <Users className="h-4 w-4 text-white" />
                        </div>
                        <p className="text-2xl font-bold text-purple-800">{metrics.totalClients}</p>
                        <p className="text-xs text-purple-600 font-medium">Clients</p>
                      </div>
                      
                      <div className="text-center p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-100">
                        <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                          <CalendarIcon className="h-4 w-4 text-white" />
                        </div>
                        <p className="text-xl font-bold text-orange-800">₹{metrics.avgInvoiceValue.toLocaleString('en-IN')}</p>
                        <p className="text-xs text-orange-600 font-medium">Avg Invoice</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Footer with credits */}
              <div className="mt-12 text-center text-sm text-slate-500">
                <p>© 2025 Developed by Ranganath Saravana</p>
              </div>
            </div>
          </div>
        );
    }
  };

  return <div>{renderCurrentView()}</div>;
};

export default Index;
