import { Routes, Route, Link, useNavigate } from "react-router-dom";
import Home from "./pages/Home";
import Watch from "./pages/Watch";
import WatchParty from "./pages/WatchParty";
import Login from "./pages/Login";
import Upload from "./pages/Upload";
import Billing from "./pages/Billing";
import BillingResult from "./pages/BillingResult";
import { clearToken, getToken } from "./lib/api";

export default function App() {
  const navigate = useNavigate();
  const loggedIn = Boolean(getToken());

  function handleLogout() {
    clearToken();
    navigate("/login");
  }

  return (
    <div className="shell">
      <nav className="navbar">
        <Link to="/" className="brand">
          <span className="brand-dot" />
          REELCAST
        </Link>
        <div className="nav-links">
          <Link to="/billing">Premium</Link>
          <Link to="/upload">Upload</Link>
          {loggedIn ? (
            <button className="btn-text" onClick={handleLogout}>
              Log out
            </button>
          ) : (
            <Link to="/login">Log in</Link>
          )}
        </div>
      </nav>

      <div className="sprocket-divider">
        {Array.from({ length: 40 }).map((_, i) => (
          <span key={i} />
        ))}
      </div>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/watch/:id" element={<Watch />} />
        <Route path="/party/:roomCode" element={<WatchParty />} />
        <Route path="/login" element={<Login />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/billing/success" element={<BillingResult />} />
        <Route path="/billing/cancelled" element={<BillingResult />} />
      </Routes>
    </div>
  );
}
