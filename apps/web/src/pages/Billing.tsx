import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface BillingStatus {
  isSubscribed: boolean;
  subscription: { status: string; currentPeriodEnd: string } | null;
}

export default function Billing() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/billing/status")
      .then((res) => setStatus(res.data))
      .catch(() => setStatus({ isSubscribed: false, subscription: null }));
  }, []);

  async function subscribe(plan: "monthly" | "annual") {
    setLoading(plan);
    try {
      const { data } = await api.post("/billing/checkout-session", { plan });
      window.location.href = data.url; // redirect to Stripe Checkout
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Could not start checkout. Are you logged in?");
      setLoading(null);
    }
  }

  async function openPortal() {
    setLoading("portal");
    try {
      const { data } = await api.post("/billing/portal-session");
      window.location.href = data.url;
    } catch (err: any) {
      alert(err.response?.data?.error ?? "Could not open billing portal.");
      setLoading(null);
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: "20px auto" }}>
      <div className="eyebrow">MEMBERSHIP</div>
      <h1 className="display" style={{ fontSize: 40, margin: "4px 0 8px" }}>
        Go Premium
      </h1>
      <p style={{ color: "var(--text-muted)", marginBottom: 28 }}>
        Unlock every creator's premium reels and enjoy an ad-free experience.
      </p>

      {status?.isSubscribed ? (
        <div className="auth-card" style={{ margin: 0, maxWidth: "none" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            ✅ You're subscribed ({status.subscription?.status})
          </div>
          {status.subscription?.currentPeriodEnd && (
            <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
              Renews / ends: {new Date(status.subscription.currentPeriodEnd).toLocaleDateString()}
            </div>
          )}
          <button className="btn" onClick={openPortal} disabled={loading === "portal"}>
            {loading === "portal" ? "Opening…" : "Manage Billing"}
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="auth-card" style={{ margin: 0, maxWidth: "none" }}>
            <div className="eyebrow">MONTHLY</div>
            <div className="display" style={{ fontSize: 34, margin: "6px 0 16px" }}>
              ₹499 / mo
            </div>
            <button
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={() => subscribe("monthly")}
              disabled={loading === "monthly"}
            >
              {loading === "monthly" ? "Redirecting…" : "Subscribe Monthly"}
            </button>
          </div>
          <div className="auth-card" style={{ margin: 0, maxWidth: "none", borderColor: "var(--amber)" }}>
            <div className="eyebrow">ANNUAL · SAVE ~17%</div>
            <div className="display" style={{ fontSize: 34, margin: "6px 0 16px" }}>
              ₹4999 / yr
            </div>
            <button
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={() => subscribe("annual")}
              disabled={loading === "annual"}
            >
              {loading === "annual" ? "Redirecting…" : "Subscribe Annually"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
