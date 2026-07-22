import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { setAuthTokenGetter } from '@workspace/api-client-react';

// Send auth token from localStorage on every API request (bypasses cookie issues)
setAuthTokenGetter(() => localStorage.getItem('sinjapan_auth_token'));

import { UserLayout } from '@/components/layout/UserLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';

// User Pages
import Home from '@/pages/home';
import Chat from '@/pages/chat';
import Proposal from '@/pages/proposal';
import Shipment from '@/pages/shipment';
import Payment from '@/pages/payment';
import History from '@/pages/history';
import Settings from '@/pages/settings';
import Login from '@/pages/login';
import Register from '@/pages/register';

// Admin Pages
import Dashboard from '@/pages/admin/dashboard';
import AdminShipments from '@/pages/admin/shipments';
import AdminShipmentDetail from '@/pages/admin/shipment-detail';
import AdminCarriers from '@/pages/admin/carriers';
import AdminCustomers from '@/pages/admin/customers';
import AdminPricing from '@/pages/admin/pricing';
import AdminCorporate from '@/pages/admin/corporate';
import AdminInvoices from '@/pages/admin/invoices';
import AdminFinance from '@/pages/admin/finance';
import AdminNotifications from '@/pages/admin/notifications';

// User Extra Pages
import CorporateApply from '@/pages/corporate-apply';
import Invoices from '@/pages/invoices';
import InvoiceDetail from '@/pages/invoice-detail';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* Auth */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Admin */}
      <Route path="/admin">
        <AdminLayout><Dashboard /></AdminLayout>
      </Route>
      <Route path="/admin/shipments">
        <AdminLayout><AdminShipments /></AdminLayout>
      </Route>
      <Route path="/admin/shipments/:id">
        <AdminLayout><AdminShipmentDetail /></AdminLayout>
      </Route>
      <Route path="/admin/carriers">
        <AdminLayout><AdminCarriers /></AdminLayout>
      </Route>
      <Route path="/admin/customers">
        <AdminLayout><AdminCustomers /></AdminLayout>
      </Route>
      <Route path="/admin/pricing">
        <AdminLayout><AdminPricing /></AdminLayout>
      </Route>
      <Route path="/admin/corporate">
        <AdminLayout><AdminCorporate /></AdminLayout>
      </Route>
      <Route path="/admin/invoices">
        <AdminLayout><AdminInvoices /></AdminLayout>
      </Route>
      <Route path="/admin/finance">
        <AdminLayout><AdminFinance /></AdminLayout>
      </Route>
      <Route path="/admin/notifications">
        <AdminLayout><AdminNotifications /></AdminLayout>
      </Route>

      {/* User */}
      <Route path="/">
        <UserLayout><Home /></UserLayout>
      </Route>
      <Route path="/chat/:id">
        <UserLayout><Chat /></UserLayout>
      </Route>
      <Route path="/proposal/:id">
        <UserLayout><Proposal /></UserLayout>
      </Route>
      <Route path="/shipment/:id">
        <UserLayout><Shipment /></UserLayout>
      </Route>
      <Route path="/payment/:id">
        <UserLayout><Payment /></UserLayout>
      </Route>
      <Route path="/history">
        <UserLayout><History /></UserLayout>
      </Route>
      <Route path="/settings">
        <UserLayout><Settings /></UserLayout>
      </Route>
      <Route path="/corporate-apply">
        <UserLayout><CorporateApply /></UserLayout>
      </Route>
      <Route path="/invoices">
        <UserLayout><Invoices /></UserLayout>
      </Route>
      <Route path="/invoices/:id">
        <UserLayout><InvoiceDetail /></UserLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
