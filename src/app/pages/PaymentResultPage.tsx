import { Link, useSearchParams } from "react-router-dom";

function statusText(status: string) {
  switch (status) {
    case "success":
    case "paid":
      return "Payment completed";
    case "pending":
      return "Payment pending";
    case "failed":
      return "Payment failed";
    default:
      return "Payment result";
  }
}

export function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const status = (searchParams.get("status") ?? "success").toLowerCase();
  const outTradeNo = searchParams.get("out_trade_no") ?? "";
  const orderId = searchParams.get("order_id") ?? "";
  const resumeToken = searchParams.get("resume_token") ?? "";

  return (
    <section className="page-section">
      <article className="panel" style={{ maxWidth: "720px", margin: "0 auto" }}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Payment Result</p>
            <h2>{statusText(status)}</h2>
            <p>This page is the canonical return target used by `sub2api` payment order creation.</p>
          </div>
        </div>

        <div className="stack-list">
          <div className="stack-row">
            <div>
              <strong>Status</strong>
              <span>{status}</span>
            </div>
          </div>
          {outTradeNo ? (
            <div className="stack-row">
              <div>
                <strong>Out trade no</strong>
                <span>{outTradeNo}</span>
              </div>
            </div>
          ) : null}
          {orderId ? (
            <div className="stack-row">
              <div>
                <strong>Order id</strong>
                <span>{orderId}</span>
              </div>
            </div>
          ) : null}
          {resumeToken ? (
            <div className="stack-row">
              <div>
                <strong>Resume token</strong>
                <span>{resumeToken}</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="row-actions" style={{ marginTop: "1.5rem" }}>
          <Link className="primary-button" to="/app/orders">
            Open orders
          </Link>
          <Link className="secondary-button" to="/app/recharge">
            Create another order
          </Link>
        </div>
      </article>
    </section>
  );
}
