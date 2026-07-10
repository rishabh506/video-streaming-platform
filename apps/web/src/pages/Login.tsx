import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, saveToken } from "../lib/api";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const body = isRegister ? { email, password, displayName } : { email, password };
      const res = await api.post(endpoint, body);
      saveToken(res.data.token);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Something went wrong");
    }
  }

  return (
    <div className="auth-card">
      <div className="eyebrow">{isRegister ? "JOIN" : "WELCOME BACK"}</div>
      <h2 className="display" style={{ fontSize: 30, margin: "4px 0 20px" }}>
        {isRegister ? "Create an account" : "Log in"}
      </h2>
      <form onSubmit={handleSubmit} className="field-group">
        {isRegister && (
          <input
            className="field"
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        )}
        <input
          className="field"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="field"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div className="error-text">{error}</div>}
        <button type="submit" className="btn btn-primary">
          {isRegister ? "Register" : "Log in"}
        </button>
      </form>
      <button onClick={() => setIsRegister(!isRegister)} className="btn-text" style={{ marginTop: 16, fontSize: 13 }}>
        {isRegister ? "Already have an account? Log in" : "Need an account? Register"}
      </button>
    </div>
  );
}