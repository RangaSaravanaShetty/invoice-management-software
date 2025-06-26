
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Users, 
  Package, 
  FileText, 
  Calendar, 
  Settings, 
  TrendingUp,
  DollarSign,
  Receipt,
  Building
} from 'lucide-react';
import { useInvoiceStore } from '@/store/invoiceStore';
import { useDatabaseStore } from '@/store/databaseStore';
import CreateInvoice from '@/components/CreateInvoice';
import ManageClients from '@/components/ManageClients';
import ManageItems from '@/components/ManageItems';
import ViewInvoices from '@/components/ViewInvoices';
import MonthlyStatement from '@/components/MonthlyStatement';
import AppSettings from '@/components/AppSettings';

type ActiveView = 'dashboard' | 'create-invoice' | 'manage-clients' | 'manage-items' | 'view-invoices' | 'monthly-statement' | 'settings';

const Index = () => {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const { metrics, loadMetrics } = useDatabaseStore();
  const { initializeDatabase } = useDatabaseStore();

  useEffect(() => {
    initializeDatabase();
    loadMetrics();
  }, []);

  const quickActions = [
    {
      title: "Create Invoice",
      description: "Generate a new invoice",
      icon: Plus,
      gradient: "from-blue-500 to-purple-600",
      action: () => setActiveView('create-invoice')
    },
    {
      title: "Manage Clients",
      description: "Add or edit client information",
      icon: Users,
      gradient: "from-green-500 to-teal-600",
      action: () => setActiveView('manage-clients')
    },
    {
      title: "Manage Items",
      description: "Update your product catalog",
      icon: Package,
      gradient: "from-orange-500 to-red-600",
      action: () => setActiveView('manage-items')
    },
    {
      title: "View Invoices",
      description: "Browse all invoices",
      icon: FileText,
      gradient: "from-pink-500 to-rose-600",
      action: () => setActiveView('view-invoices')
    },
    {
      title: "Monthly Statement",
      description: "Generate monthly reports",
      icon: Calendar,
      gradient: "from-indigo-500 to-blue-600",
      action: () => setActiveView('monthly-statement')
    },
    {
      title: "Settings",
      description: "Configure application",
      icon: Settings,
      gradient: "from-gray-500 to-slate-600",
      action: () => setActiveView('settings')
    }
  ];

  const metricCards = [
    {
      title: "Total Revenue",
      value: `₹${metrics.totalRevenue?.toLocaleString('en-IN') || '0'}`,
      icon: TrendingUp,
      gradient: "from-emerald-500 to-green-600",
      change: "+12.5%"
    },
    {
      title: "Total Invoices",
      value: metrics.totalInvoices?.toString() || '0',
      icon: Receipt,
      gradient: "from-blue-500 to-cyan-600",
      change: "+3 this month"
    },
    {
      title: "Active Clients",
      value: metrics.totalClients?.toString() || '0',
      icon: Building,
      gradient: "from-purple-500 to-pink-600",
      change: "+2 new"
    },
    {
      title: "Avg Invoice Value",
      value: `₹${metrics.avgInvoiceValue?.toLocaleString('en-IN') || '0'}`,
      icon: DollarSign,
      gradient: "from-orange-500 to-yellow-600",
      change: "+8.2%"
    }
  ];

  if (activeView !== 'dashboard') {
    const components = {
      'create-invoice': <CreateInvoice onBack={() => setActiveView('dashboard')} />,
      'manage-clients': <ManageClients onBack={() => setActiveView('dashboard')} />,
      'manage-items': <ManageItems onBack={() => setActiveView('dashboard')} />,
      'view-invoices': <ViewInvoices onBack={() => setActiveView('dashboard')} />,
      'monthly-statement': <MonthlyStatement onBack={() => setActiveView('dashboard')} />,
      'settings': <AppSettings onBack={() => setActiveView('dashboard')} />
    };
    return components[activeView];
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-2">
            Invoice Manager
          </h1>
          <p className="text-slate-600 text-lg">Professional invoicing made simple</p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metricCards.map((metric, index) => (
            <Card key={index} className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className={`absolute inset-0 bg-gradient-to-br ${metric.gradient} opacity-90`} />
              <CardContent className="relative z-10 p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <metric.icon className="h-8 w-8 opacity-80" />
                  <Badge variant="secondary" className="bg-white/20 text-white border-0">
                    {metric.change}
                  </Badge>
                </div>
                <div>
                  <p className="text-white/80 text-sm mb-1">{metric.title}</p>
                  <p className="text-2xl font-bold">{metric.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-800 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <Card 
                key={index} 
                className="group cursor-pointer border-0 shadow-lg hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 bg-white/80 backdrop-blur-sm"
                onClick={action.action}
              >
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${action.gradient} mr-4 group-hover:scale-110 transition-transform duration-300`}>
                      <action.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-slate-600 text-sm">{action.description}</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="group-hover:bg-slate-100 transition-colors"
                    >
                      Get Started →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Info Tip */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-l-amber-400">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-amber-400 rounded-lg mr-4">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800 mb-1">Pro Tip</h3>
                <p className="text-amber-700">
                  Don't forget to backup your data regularly and export your latest invoices for your records.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
