import { useAuth } from "../lib/auth";

export function AccountPage() {
  const { user } = useAuth();

  return (
    <section className="page-section">
      <div className="section-header">
        <div>
          <p className="eyebrow">Account</p>
          <h2>Account profile</h2>
          <p>Basic account data is part of the user app. Admin-only controls stay in sub2api.</p>
        </div>
      </div>

      <article className="panel account-panel">
        <div>
          <span>Username</span>
          <strong>{user?.username}</strong>
        </div>
        <div>
          <span>Email</span>
          <strong>{user?.email}</strong>
        </div>
        <div>
          <span>Balance</span>
          <strong>CNY {user?.balance.toFixed(2)}</strong>
        </div>
        <div>
          <span>Created at</span>
          <strong>{user ? new Date(user.createdAt).toLocaleString() : "-"}</strong>
        </div>
      </article>
    </section>
  );
}
