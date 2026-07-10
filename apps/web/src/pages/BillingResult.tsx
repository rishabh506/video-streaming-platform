import { Link, useLocation } from "react-router-dom";

export default function BillingResult() {
  const isSuccess = useLocation().pathname.includes("success");

  return (
    <div className="empty-state">
      <div className="display" style={{ fontSize: 34, marginBottom: 10 }}>
        {isSuccess ? "YOU'RE IN 🎬" : "CHECKOUT CANCELLED"}
      </div>
      <p>
        {isSuccess
          ? "Your subscription is active. Premium reels are now unlocked."
          : "No charge was made — you can subscribe anytime."}
      </p>
      <Link to="/" className="btn btn-primary" style={{ display: "inline-block", marginTop: 16, textDecoration: "none" }}>
        Back to the Feed
      </Link>
    </div>
  );
}
