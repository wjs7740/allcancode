import { FormEvent, useEffect, useState } from "react";
import { appApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { UsageRecord, UsageSummary } from "../types/models";

type Filters = {
  model: string;
  apiKeyId: string;
  startDate: string;
  endDate: string;
};

const initialSummary: UsageSummary = {
  totalRequests: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalCacheTokens: 0,
  totalTokens: 0,
  totalCost: 0,
  totalActualCost: 0,
  averageDurationMs: 0
};

function buildUsageQuery(filters: Filters, page: number, pageSize: number) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize)
  });

  if (filters.model.trim()) {
    params.set("model", filters.model.trim());
  }
  if (filters.apiKeyId.trim()) {
    params.set("apiKeyId", filters.apiKeyId.trim());
  }
  if (filters.startDate) {
    params.set("startDate", filters.startDate);
  }
  if (filters.endDate) {
    params.set("endDate", filters.endDate);
  }

  return `?${params.toString()}`;
}

export function UsagePage() {
  const { token } = useAuth();
  const [items, setItems] = useState<UsageRecord[]>([]);
  const [summary, setSummary] = useState<UsageSummary>(initialSummary);
  const [filters, setFilters] = useState<Filters>({
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
      const response = await appApi.listUsage(token, buildUsageQuery(nextFilters, nextPage, pageSize));
      setItems(response.items);
      setSummary(response.summary);
      setTotal(response.total);
      setPage(response.page);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load usage records.");
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
          <p className="eyebrow">Usage</p>
          <h2>Usage detail</h2>
          <p>The page supports user-side filters, pagination, and aggregated stats over the real `sub2api` usage domain.</p>
        </div>
      </div>

      <article className="panel">
        <form className="filter-grid" onSubmit={submitFilters}>
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
                const cleared = { model: "", apiKeyId: "", startDate: "", endDate: "" };
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
          <span>Total requests</span>
          <strong>{summary.totalRequests.toLocaleString()}</strong>
        </article>
        <article className="panel metric-panel">
          <span>Total tokens</span>
          <strong>{summary.totalTokens.toLocaleString()}</strong>
        </article>
        <article className="panel metric-panel">
          <span>Total cost</span>
          <strong>CNY {summary.totalActualCost.toFixed(2)}</strong>
        </article>
        <article className="panel metric-panel">
          <span>Average latency</span>
          <strong>{summary.averageDurationMs.toFixed(0)} ms</strong>
        </article>
      </div>

      <article className="panel">
        {error ? <div className="form-error">{error}</div> : null}
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Model</th>
                <th>Endpoint</th>
                <th>Key</th>
                <th>Status</th>
                <th>Tokens</th>
                <th>Cost</th>
                <th>Latency</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.createdAt).toLocaleString()}</td>
                  <td>{item.model}</td>
                  <td>{item.endpoint}</td>
                  <td>{item.apiKeyName ?? "-"}</td>
                  <td>{item.statusCode}</td>
                  <td>{item.requestTokens.toLocaleString()}</td>
                  <td>CNY {item.cost.toFixed(2)}</td>
                  <td>{item.latencyMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
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
