import { FormEvent, useEffect, useState } from "react";
import { appApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { BillingRecord, BillingSummary } from "../types/models";

type Filters = {
  type: string;
  status: string;
  model: string;
  apiKeyId: string;
  startDate: string;
  endDate: string;
};

const initialSummary: BillingSummary = {
  totalCount: 0,
  usageSpend: 0,
  rechargeIncome: 0,
  manualAdjustments: 0,
  pendingCount: 0,
  failedCount: 0,
  usage: {
    totalRequests: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheTokens: 0,
    totalTokens: 0,
    totalCost: 0,
    totalActualCost: 0,
    averageDurationMs: 0
  }
};

function buildBillingQuery(filters: Filters, page: number, pageSize: number) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize)
  });

  for (const [key, value] of Object.entries(filters)) {
    if (value.trim()) {
      params.set(key, value.trim());
    }
  }

  return `?${params.toString()}`;
}

export function BillingPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<BillingRecord[]>([]);
  const [summary, setSummary] = useState<BillingSummary>(initialSummary);
  const [filters, setFilters] = useState<Filters>({
    type: "",
    status: "",
    model: "",
    apiKeyId: "",
    startDate: "",
    endDate: ""
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(nextFilters: Filters, nextPage: number) {
    if (!token) {
      return;
    }

    try {
      setLoading(true);
      const response = await appApi.listBilling(token, buildBillingQuery(nextFilters, nextPage, pageSize));
      setItems(response.items);
      setSummary(response.summary);
      setTotal(response.total);
      setPage(response.page);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load billing records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(filters, 1);
  }, [token]);

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    void load(filters, 1);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="page-section">
      <div className="section-header">
        <div>
          <p className="eyebrow">Billing</p>
          <h2>Billing records</h2>
          <p>The ledger view now supports user-side filtering, pagination, and summary metrics while staying backed by `sub2api` data.</p>
        </div>
      </div>

      <article className="panel">
        <form className="filter-grid" onSubmit={submitFilters}>
          <label>
            <span>Type</span>
            <select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}>
              <option value="">All</option>
              <option value="usage">Usage deduction</option>
              <option value="recharge">Recharge</option>
              <option value="balance">Balance credit</option>
              <option value="redeem">Redeem</option>
            </select>
          </label>
          <label>
            <span>Status</span>
            <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="">All</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="used">Used</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label>
            <span>Model</span>
            <input value={filters.model} onChange={(event) => setFilters((current) => ({ ...current, model: event.target.value }))} placeholder="gpt-4o" />
          </label>
          <label>
            <span>API key id</span>
            <input value={filters.apiKeyId} onChange={(event) => setFilters((current) => ({ ...current, apiKeyId: event.target.value }))} placeholder="2" />
          </label>
          <label>
            <span>Start date</span>
            <input type="date" value={filters.startDate} onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))} />
          </label>
          <label>
            <span>End date</span>
            <input type="date" value={filters.endDate} onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))} />
          </label>
          <div className="filter-actions">
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "Loading..." : "Apply filters"}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                const cleared = { type: "", status: "", model: "", apiKeyId: "", startDate: "", endDate: "" };
                setFilters(cleared);
                setPage(1);
                void load(cleared, 1);
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </article>

      <div className="card-grid">
        <article className="panel metric-panel">
          <span>Records</span>
          <strong>{summary.totalCount}</strong>
        </article>
        <article className="panel metric-panel">
          <span>Usage spend</span>
          <strong>CNY {summary.usageSpend.toFixed(2)}</strong>
        </article>
        <article className="panel metric-panel">
          <span>Recharge income</span>
          <strong>CNY {summary.rechargeIncome.toFixed(2)}</strong>
        </article>
        <article className="panel metric-panel">
          <span>Pending / failed</span>
          <strong>
            {summary.pendingCount} / {summary.failedCount}
          </strong>
        </article>
      </div>

      <article className="panel">
        {error ? <div className="form-error">{error}</div> : null}
        <div className="stack-list">
          {items.map((item) => (
            <div className="stack-row" key={item.id}>
              <div>
                <strong>{item.description}</strong>
                <span>
                  {item.type} | {item.status} | {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
              <em className={item.amount >= 0 ? "amount-positive" : "amount-negative"}>
                {item.amount >= 0 ? "+" : ""}
                CNY {item.amount.toFixed(2)}
              </em>
            </div>
          ))}
        </div>
        <div className="pagination-bar">
          <span>
            Page {page} / {totalPages} · {total} items
          </span>
          <div className="row-actions">
            <button className="secondary-button" type="button" disabled={page <= 1 || loading} onClick={() => void load(filters, page - 1)}>
              Previous
            </button>
            <button className="secondary-button" type="button" disabled={page >= totalPages || loading} onClick={() => void load(filters, page + 1)}>
              Next
            </button>
          </div>
        </div>
      </article>
    </section>
  );
}
