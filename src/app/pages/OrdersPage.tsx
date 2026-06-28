import { useEffect, useState } from "react";
import { appApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Order } from "../types/models";

export function OrdersPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Order[]>([]);
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
        const response = await appApi.listOrders(token, "?page=1&pageSize=20");
        setItems(response.items);
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load orders.");
      }
    }

    void load();
  }, [token]);

  return (
    <section className="page-section">
      <div className="section-header">
        <div>
          <p className="eyebrow">Orders</p>
          <h2>Order history</h2>
          <p>Recharge order status is shown here and is backed by the sub2api payment order domain.</p>
        </div>
      </div>

      <article className="panel">
        {error ? <div className="form-error">{error}</div> : null}
        <div className="stack-list">
          {items.map((item) => (
            <div className="stack-row" key={item.id}>
              <div>
                <strong>{item.packageName}</strong>
                <span>
                  {item.orderNo} | {item.methodCode} | {item.status} | {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
              <em>CNY {(item.amount + item.bonusAmount).toFixed(2)}</em>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
