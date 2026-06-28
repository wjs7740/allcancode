import { ArrowRight } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

type AuthPageProps = {
  mode: "login" | "register";
};

export function AuthPage({ mode }: AuthPageProps) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    try {
      if (mode === "login") {
        await login({
          identifier: String(formData.get("identifier") ?? ""),
          password: String(formData.get("password") ?? "")
        });
      } else {
        await register({
          username: String(formData.get("username") ?? ""),
          email: String(formData.get("email") ?? ""),
          password: String(formData.get("password") ?? "")
        });
      }

      navigate("/app/overview", { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="brand">
          <span className="brand-mark">AC</span>
          <div>
            <strong>AllCanCode</strong>
            <small>Regular user access</small>
          </div>
        </div>

        <div className="auth-heading">
          <p className="eyebrow">{isLogin ? "Account Access" : "Create Account"}</p>
          <h1>{isLogin ? "Sign in to the user console" : "Create a regular user account"}</h1>
          <p>
            {isLogin
              ? "After sign-in you can view overview, keys, usage detail, billing, recharge, and orders."
              : "Creating an account signs you in immediately and opens the console."}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isLogin ? (
            <label>
              <span>Email</span>
              <input name="identifier" type="email" placeholder="admin@allcancode.local" required />
            </label>
          ) : (
            <>
              <label>
                <span>Username</span>
                <input name="username" placeholder="Enter username" minLength={3} required />
              </label>
              <label>
                <span>Email</span>
                <input name="email" type="email" placeholder="you@example.com" required />
              </label>
            </>
          )}

          <label>
            <span>Password</span>
            <input name="password" type="password" minLength={6} placeholder="At least 6 characters" required />
          </label>

          {error ? <div className="form-error">{error}</div> : null}

          <button className="primary-button" type="submit" disabled={submitting}>
            <span>{submitting ? "Working..." : isLogin ? "Sign in" : "Register"}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="auth-footer">
          <span>{isLogin ? "No account yet?" : "Already have an account?"}</span>
          <Link to={isLogin ? "/register" : "/login"}>{isLogin ? "Register" : "Sign in"}</Link>
        </div>
        <p className="auth-hint">Use a real sub2api user account email to sign in.</p>
      </div>
    </div>
  );
}
