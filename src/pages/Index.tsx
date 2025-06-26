import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarIcon, CreditCard, Gauge, ListChecks, Settings } from "lucide-react";
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
          <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
            <div className="container mx-auto max-w-7xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Dashboard
                </h1>
              </div>

              {/* Main Content */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <Card className="shadow-lg border-0">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-800">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button onClick={() => setCurrentView('create-invoice')} className="w-full justify-start">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Create Invoice
                    </Button>
                    <Button onClick={() => setCurrentView('manage-clients')} className="w-full justify-start">
                      <ListChecks className="h-4 w-4 mr-2" />
                      Manage Clients
                    </Button>
                    <Button onClick={() => setCurrentView('manage-items')} className="w-full justify-start">
                      <ListChecks className="h-4 w-4 mr-2" />
                      Manage Items
                    </Button>
                    <Button onClick={() => setCurrentView('view-invoices')} className="w-full justify-start">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      View Invoices
                    </Button>
                    <Button onClick={() => setCurrentView('monthly-statement')} className="w-full justify-start">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Monthly Statement
                    </Button>
                    <Button onClick={() => setCurrentView('settings')} className="w-full justify-start">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Button>
                  </CardContent>
                </Card>

                {/* Summary Stats */}
                <Card className="shadow-lg border-0">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-800">Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm text-slate-600">Total Revenue</p>
                        <p className="text-2xl font-bold text-slate-800">₹{metrics.totalRevenue.toLocaleString('en-IN')}</p>
                      </div>
                      <Gauge className="h-8 w-8 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm text-slate-600">Total Invoices</p>
                        <p className="text-2xl font-bold text-slate-800">{metrics.totalInvoices}</p>
                      </div>
                      <CreditCard className="h-8 w-8 text-blue-500" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm text-slate-600">Total Clients</p>
                        <p className="text-2xl font-bold text-slate-800">{metrics.totalClients}</p>
                      </div>
                      <ListChecks className="h-8 w-8 text-orange-500" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm text-slate-600">Avg Invoice Value</p>
                        <p className="text-2xl font-bold text-slate-800">₹{metrics.avgInvoiceValue.toLocaleString('en-IN')}</p>
                      </div>
                      <CalendarIcon className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="shadow-lg border-0">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-800">User Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600">No activity to display.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        );
    }
  };

  return <div>{renderCurrentView()}</div>;
};

export default Index;
