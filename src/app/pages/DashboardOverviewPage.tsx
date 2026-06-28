import { Activity, CreditCard, KeyRound, TrendingUp, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { appApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { DashboardData } from "../types/models";

export function DashboardOverviewPage() {
  const { token, refreshUser } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    async function load() {
      if (!token) {
        return;
      }
      try {
        const response = await appApi.getDashboard(token);
        setData(response);
        setError(null);
        await refreshUser();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard.");
      }
    }

    void load();
  }, [refreshUser, token]);

  if (!data) {
    return (
      <section className="page-section">
        <div className="panel">
          <div className="spinner" />
          <p>{error ?? "Loading daily overview..."}</p>
        </div>
      </section>
    );
  }

  const metrics = [
    { icon: Wallet, label: "Balance", value: `CNY ${data.summary.balance.toFixed(2)}` },
    { icon: CreditCard, label: "Spend today", value: `CNY ${data.summary.todaySpend.toFixed(2)}` },
    { icon: Activity, label: "Requests today", value: data.summary.todayRequests.toString() },
    { icon: KeyRound, label: "Active keys", value: `${data.summary.activeKeys}/${data.summary.totalKeys}` }
  ];

  return (
    <section className="page-section">
      <div className="section-header">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>Daily usage summary</h2>
          <p>This dashboard now aggregates the core ordinary-user view over real sub2api data.</p>
        </div>
      </div>

      <div className="card-grid">
        {metrics.map(({ icon: Icon, label, value }) => (
          <article className="panel metric-panel" key={label}>
            <Icon size={18} />
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <div className="two-column-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <h3>7-day trend</h3>
              <p>Daily spend and request volume.</p>
            </div>
            <TrendingUp size={18} />
          </div>
          <div className="trend-list">
            {data.trend.map((point) => (
              <div className="trend-row" key={point.label}>
                <div>
                  <strong>{point.label}</strong>
                  <span>{point.requests} requests</span>
                </div>
                <em>CNY {point.spend.toFixed(2)}</em>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <h3>Recent orders</h3>
              <p>Useful for checking recharge status without leaving the user app.</p>
            </div>
          </div>
          <div className="stack-list">
            {data.recentOrders.map((order) => (
              <div className="stack-row" key={order.id}>
                <div>
                  <strong>{order.packageName}</strong>
                  <span>
                    {order.orderNo} | {order.methodCode} | {order.status}
                  </span>
                </div>
                <em>CNY {(order.amount + order.bonusAmount).toFixed(2)}</em>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="panel">
        <div className="panel-heading">
          <div>
            <h3>Recent activity</h3>
            <p>These records are aggregated in the backend and can later be replaced by richer event streams.</p>
          </div>
        </div>
        <div className="activity-list">
          {data.recentActivity.map((item) => (
            <div className="activity-item" key={item}>
              <span className="activity-dot" />
              <p>{item}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
