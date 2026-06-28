import { FormEvent, useEffect, useState } from "react";
import { appApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { ApiKeyItem } from "../types/models";

function maskKey(value: string) {
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export function KeysPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<ApiKeyItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    if (!token) {
      return;
    }
    try {
      const response = await appApi.listKeys(token);
      setItems(response.items);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load keys.");
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  async function createKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }
    setSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    try {
      await appApi.createKey(token, {
        name: String(formData.get("name") ?? ""),
        scope: String(formData.get("scope") ?? "All models"),
        quotaTokens: Number(formData.get("quotaTokens") ?? 0)
      });
      (event.currentTarget as HTMLFormElement).reset();
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to create key.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus(item: ApiKeyItem) {
    if (!token) {
      return;
    }
    await appApi.updateKey(token, item.id, {
      status: item.status === "active" ? "disabled" : "active"
    });
    await load();
  }

  async function removeKey(id: number) {
    if (!token) {
      return;
    }
    await appApi.deleteKey(token, id);
    await load();
  }

  return (
    <section className="page-section">
      <div className="section-header">
        <div>
          <p className="eyebrow">Keys</p>
          <h2>API key management</h2>
          <p>Regular users can create, disable, and delete their own keys here. Admin-only controls stay inside sub2api.</p>
        </div>
      </div>

      <div className="two-column-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <h3>Create key</h3>
              <p>The current version keeps creation simple while preserving room for later policy extensions.</p>
            </div>
          </div>
          <form className="inline-form" onSubmit={createKey}>
            <label>
              <span>Name</span>
              <input name="name" placeholder="Production Router" required />
            </label>
            <label>
              <span>Scope</span>
              <input name="scope" placeholder="Managed by sub2api group policy" defaultValue="Default group" required />
            </label>
            <label>
              <span>Quota reference</span>
              <input name="quotaTokens" type="number" min={1000} defaultValue={1000000} required />
            </label>
            {error ? <div className="form-error">{error}</div> : null}
            <button className="primary-button" type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create key"}
            </button>
          </form>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <h3>Existing keys</h3>
              <p>The list is backed by real sub2api user key data.</p>
            </div>
          </div>
          <div className="stack-list">
            {items.map((item) => (
              <div className="key-item" key={item.id}>
                <div className="key-main">
                  <strong>{item.name}</strong>
                  <span>{item.maskedKeyValue ?? maskKey(item.keyValue)}</span>
                </div>
                <div className="key-meta">
                  <span>{item.scope}</span>
                  <span>
                    Used {item.usedTokens.toLocaleString()} / {item.quotaTokens.toLocaleString()}
                  </span>
                  <span className={`status-tag status-${item.status}`}>{item.status}</span>
                </div>
                <div className="row-actions">
                  <button className="secondary-button" type="button" onClick={() => toggleStatus(item)}>
                    {item.status === "active" ? "Disable" : "Enable"}
                  </button>
                  <button className="ghost-button" type="button" onClick={() => removeKey(item.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
