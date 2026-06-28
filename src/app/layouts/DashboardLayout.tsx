import { CreditCard, Gauge, History, KeyRound, LogOut, ReceiptText, UserRound, Wallet } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";

const navigationItems = [
  { to: "/app/overview", label: "Overview", icon: Gauge },
  { to: "/app/keys", label: "Keys", icon: KeyRound },
  { to: "/app/usage", label: "Usage", icon: History },
  { to: "/app/billing", label: "Billing", icon: Wallet },
  { to: "/app/recharge", label: "Recharge", icon: CreditCard },
  { to: "/app/orders", label: "Orders", icon: ReceiptText },
  { to: "/app/account", label: "Account", icon: UserRound }
] as const;

export function DashboardLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <NavLink className="brand" to="/app/overview">
          <span className="brand-mark">AC</span>
          <div>
            <strong>AllCanCode</strong>
            <small>User App Layer</small>
          </div>
        </NavLink>

        <nav className="sidebar-nav" aria-label="User app navigation">
          {navigationItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <span>Fresh deploy</span>
          <strong>Register user in allcancode</strong>
          <p>Ordinary users are expected to sign up in the user app, while admin operations stay in `sub2api`.</p>
        </div>
      </aside>

      <div className="content-shell">
        <header className="content-topbar">
          <div>
            <p className="eyebrow">AllCanCode App</p>
            <h1>Regular User Console</h1>
          </div>
          <div className="topbar-actions">
            <div className="user-chip">
              <span>{user?.username ?? "user"}</span>
              <strong>Balance CNY {user?.balance.toFixed(2) ?? "0.00"}</strong>
            </div>
            <button className="secondary-button" type="button" onClick={logout}>
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
