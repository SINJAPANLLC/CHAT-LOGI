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
import ForgotPassword from '@/pages/forgot-password';
import ResetPassword from '@/pages/reset-password';

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
import AdminEmailMarketing from '@/pages/admin/email-marketing';
import AdminSeo from '@/pages/admin/seo';
import AdminContacts from '@/pages/admin/contacts';

// User Extra Pages
import Contact from '@/pages/contact';
import CorporateApply from '@/pages/corporate-apply';
import Invoices from '@/pages/invoices';
import InvoiceDetail from '@/pages/invoice-detail';

// Blog (public, no auth)
import BlogIndex from '@/pages/blog/index';
import BlogArticle from '@/pages/blog/article';

// Admin: Blog
import AdminBlog from '@/pages/admin/blog';

// Public pages (no layout)
import DriverPortal from '@/pages/driver-portal';
import LP from '@/pages/lp';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* Auth */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />

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
      <Route path="/admin/email-marketing">
        <AdminLayout><AdminEmailMarketing /></AdminLayout>
      </Route>
      <Route path="/admin/seo">
        <AdminLayout><AdminSeo /></AdminLayout>
      </Route>
      <Route path="/admin/blog">
        <AdminLayout><AdminBlog /></AdminLayout>
      </Route>
      <Route path="/admin/contacts">
        <AdminLayout><AdminContacts /></AdminLayout>
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
      <Route path="/contact">
        <UserLayout><Contact /></UserLayout>
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

      {/* Blog — no auth, no layout */}
      <Route path="/blog/:slug" component={BlogArticle} />
      <Route path="/blog" component={BlogIndex} />

      {/* LP — no auth, no layout */}
      <Route path="/lp" component={LP} />

      {/* Driver portal — no auth, no layout */}
      <Route path="/driver/:token" component={DriverPortal} />

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
