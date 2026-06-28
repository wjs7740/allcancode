import { ArrowRight, CreditCard, Database, KeyRound, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

const featureCards = [
  {
    icon: Database,
    title: "Separate user surface",
    description:
      "Regular users stay inside AllCanCode. The app owns overview, keys, billing, orders, and payment without exposing sub2api admin pages."
  },
  {
    icon: KeyRound,
    title: "Usage-first product shape",
    description:
      "The base structure centers on daily overview, API key lifecycle, request details, and billing records so later upgrades stay additive."
  },
  {
    icon: CreditCard,
    title: "Modular payment layer",
    description:
      "The frontend only sees payment methods. Backend bindings map those methods to provider instances, which keeps future Qirun integration flexible."
  },
  {
    icon: ShieldCheck,
    title: "Simple deployment",
    description:
      "The repo is organized for local Docker deployment first, with clear service boundaries for web, api, and database."
  }
];

export function LandingPage() {
  return (
    <div className="landing-shell">
      <header className="landing-topbar">
        <div className="brand">
          <span className="brand-mark">AC</span>
          <div>
            <strong>AllCanCode</strong>
            <small>Enhanced user app for sub2api</small>
          </div>
        </div>
        <div className="hero-actions">
          <Link className="secondary-button" to="/login">
            Sign in
          </Link>
          <Link className="primary-button" to="/register">
            Register
            <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      <section className="hero-panel">
        <div>
          <p className="eyebrow">Fresh Deploy Architecture</p>
          <h1>Move regular-user features out of sub2api admin</h1>
          <p className="hero-copy">
            This build targets a clean redeploy. AllCanCode takes ownership of dashboard, key management, usage detail, billing,
            recharge, and order history. Admin workflows and gateway forwarding remain in sub2api.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" to="/login">
              Open user console
              <ArrowRight size={16} />
            </Link>
            <Link className="secondary-button" to="/register">
              Create account
            </Link>
          </div>
        </div>

        <div className="hero-metrics">
          <div className="metric-card">
            <span>Local deploy</span>
            <strong>Docker Compose</strong>
            <p>web + api + postgres + nginx reverse proxy</p>
          </div>
          <div className="metric-card">
            <span>Demo account</span>
            <strong>demo</strong>
            <p>Password is `demo123456`, with seeded keys, usage rows, and orders.</p>
          </div>
          <div className="metric-card">
            <span>Payment abstraction</span>
            <strong>Method Catalog</strong>
            <p>Frontend stays stable while provider bindings evolve toward Qirun-compatible payment flows.</p>
          </div>
        </div>
      </section>

      <section className="feature-grid">
        {featureCards.map(({ icon: Icon, title, description }) => (
          <article className="feature-card" key={title}>
            <Icon size={20} />
            <h2>{title}</h2>
            <p>{description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
