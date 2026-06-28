import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { AccountPage } from "./pages/AccountPage";
import { AuthPage } from "./pages/AuthPage";
import { BillingPage } from "./pages/BillingPage";
import { DashboardOverviewPage } from "./pages/DashboardOverviewPage";
import { KeysPage } from "./pages/KeysPage";
import { LandingPage } from "./pages/LandingPage";
import { OrdersPage } from "./pages/OrdersPage";
import { PaymentResultPage } from "./pages/PaymentResultPage";
import { RechargePage } from "./pages/RechargePage";
import { UsagePage } from "./pages/UsagePage";

function ProtectedRoute() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="fullscreen-state">
        <div className="spinner" />
        <p>Syncing account state...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function PublicOnlyRoute() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="fullscreen-state">
        <div className="spinner" />
        <p>Preparing page...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/app/overview" replace />;
  }

  return <Outlet />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<DashboardLayout />}>
              <Route index element={<Navigate to="/app/overview" replace />} />
              <Route path="overview" element={<DashboardOverviewPage />} />
              <Route path="keys" element={<KeysPage />} />
              <Route path="usage" element={<UsagePage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="recharge" element={<RechargePage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="account" element={<AccountPage />} />
            </Route>
            <Route path="/payment/result" element={<PaymentResultPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
