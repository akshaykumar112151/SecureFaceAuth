import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../utils/api";

function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await loginUser(formData);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      if (res.data.user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;800&family=Rajdhani:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .lp-root {
          min-height: 100vh;
          background: #05060f;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          position: relative;
          overflow: hidden;
          font-family: 'Rajdhani', sans-serif;
        }

        .lp-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }

        .lp-orb1 {
          position: absolute;
          top: -120px; left: -120px;
          width: 500px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,212,255,0.12) 0%, transparent 70%);
          animation: orbFloat 8s ease-in-out infinite;
        }

        .lp-orb2 {
          position: absolute;
          bottom: -100px; right: -100px;
          width: 450px; height: 450px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(79,70,229,0.14) 0%, transparent 70%);
          animation: orbFloat 10s ease-in-out infinite reverse;
        }

        .lp-orb3 {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 600px; height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 65%);
        }

        @keyframes orbFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }

        .lp-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        .lp-stars {
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.4) 0%, transparent 100%),
            radial-gradient(1px 1px at 30% 60%, rgba(0,212,255,0.3) 0%, transparent 100%),
            radial-gradient(1px 1px at 55% 15%, rgba(255,255,255,0.3) 0%, transparent 100%),
            radial-gradient(1px 1px at 75% 40%, rgba(124,58,237,0.4) 0%, transparent 100%),
            radial-gradient(1px 1px at 85% 75%, rgba(255,255,255,0.3) 0%, transparent 100%),
            radial-gradient(1px 1px at 20% 85%, rgba(0,212,255,0.3) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 65% 80%, rgba(255,255,255,0.4) 0%, transparent 100%),
            radial-gradient(1px 1px at 45% 50%, rgba(124,58,237,0.3) 0%, transparent 100%);
        }

        .lp-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          background: rgba(8, 10, 28, 0.85);
          border: 1px solid rgba(0, 212, 255, 0.15);
          border-radius: 24px;
          padding: 48px 40px;
          backdrop-filter: blur(32px);
          -webkit-backdrop-filter: blur(32px);
          box-shadow:
            0 0 0 1px rgba(0,212,255,0.05),
            0 24px 80px rgba(0,0,0,0.7),
            0 0 60px rgba(0,212,255,0.06),
            inset 0 1px 0 rgba(255,255,255,0.05);
          animation: cardIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .lp-card::before {
          content: '';
          position: absolute;
          top: 0; left: 20%; right: 20%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0,212,255,0.6), rgba(124,58,237,0.4), transparent);
          border-radius: 1px;
        }

        .lp-card::after {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 50%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0,212,255,0.5), transparent);
          animation: cardScan 5s linear infinite;
        }

        @keyframes cardScan {
          0% { left: -50%; }
          100% { left: 160%; }
        }

        .lp-header {
          text-align: center;
          margin-bottom: 36px;
          animation: fadeUp 0.5s 0.1s both;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .lp-icon-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px; height: 64px;
          border-radius: 18px;
          background: linear-gradient(135deg, rgba(0,212,255,0.12), rgba(79,70,229,0.12));
          border: 1px solid rgba(0,212,255,0.25);
          margin-bottom: 20px;
          box-shadow: 0 0 24px rgba(0,212,255,0.15), inset 0 0 20px rgba(0,212,255,0.05);
          animation: iconPulse 3s ease-in-out infinite;
        }

        @keyframes iconPulse {
          0%, 100% { box-shadow: 0 0 24px rgba(0,212,255,0.15), inset 0 0 20px rgba(0,212,255,0.05); }
          50% { box-shadow: 0 0 40px rgba(0,212,255,0.35), inset 0 0 30px rgba(0,212,255,0.1); }
        }

        .lp-icon {
          width: 36px; height: 36px;
          filter: drop-shadow(0 0 8px rgba(0,212,255,0.6));
        }

        .lp-title {
          font-family: 'Orbitron', monospace;
          font-size: 22px; font-weight: 700;
          letter-spacing: 0.04em;
          background: linear-gradient(90deg, #fff 0%, #00d4ff 60%, #a78bfa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 8px;
          filter: drop-shadow(0 0 8px rgba(0,212,255,0.2));
        }

        .lp-subtitle {
          font-size: 14px;
          color: rgba(255,255,255,0.35);
          letter-spacing: 0.04em;
        }

        .lp-error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.25);
          color: #f87171;
          padding: 12px 16px;
          border-radius: 10px;
          margin-bottom: 20px;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.02em;
          animation: fadeUp 0.3s both;
        }

        .lp-error-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #f87171;
          box-shadow: 0 0 6px rgba(248,113,113,0.8);
          flex-shrink: 0;
        }

        .lp-field {
          margin-bottom: 20px;
          animation: fadeUp 0.5s both;
        }

        .lp-field:nth-child(1) { animation-delay: 0.15s; }
        .lp-field:nth-child(2) { animation-delay: 0.2s; }

        .lp-label {
          display: block;
          font-size: 11.5px; font-weight: 700;
          color: rgba(0,212,255,0.6);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .lp-input-wrap { position: relative; }

        .lp-input {
          width: 100%;
          padding: 13px 16px;
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 15px; font-weight: 500;
          color: #fff; outline: none;
          box-sizing: border-box;
          transition: all 0.25s ease;
          letter-spacing: 0.02em;
        }

        .lp-input::placeholder {
          color: rgba(255,255,255,0.2);
          font-size: 14px;
        }

        .lp-input:focus {
          border-color: rgba(0,212,255,0.5);
          background: rgba(0,212,255,0.04);
          box-shadow: 0 0 0 3px rgba(0,212,255,0.08), 0 0 20px rgba(0,212,255,0.1);
        }

        .lp-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #00d4ff, #4f46e5);
          color: #000; border: none;
          border-radius: 10px;
          font-family: 'Orbitron', monospace;
          font-size: 13px; font-weight: 700;
          letter-spacing: 0.08em;
          cursor: pointer; margin-top: 8px;
          position: relative; overflow: hidden;
          transition: all 0.25s ease;
          box-shadow: 0 0 24px rgba(0,212,255,0.3), 0 4px 16px rgba(0,0,0,0.4);
          animation: fadeUp 0.5s 0.25s both;
        }

        .lp-btn::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
          transition: left 0.4s ease;
        }

        .lp-btn:hover::before { left: 100%; }

        .lp-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 0 40px rgba(0,212,255,0.5), 0 8px 24px rgba(0,0,0,0.5);
        }

        .lp-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .lp-btn-loader {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        .lp-spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(0,0,0,0.3);
          border-top-color: #000;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .lp-register {
          text-align: center;
          margin-top: 28px;
          font-size: 13px;
          color: rgba(255,255,255,0.3);
          letter-spacing: 0.03em;
          animation: fadeUp 0.5s 0.3s both;
        }

        .lp-register-link {
          color: #00d4ff;
          text-decoration: none;
          font-weight: 700;
          letter-spacing: 0.04em;
          transition: all 0.2s ease;
        }

        .lp-register-link:hover {
          text-shadow: 0 0 10px rgba(0,212,255,0.8);
        }

        .lp-security-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 24px;
          font-size: 11px;
          color: rgba(255,255,255,0.18);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          animation: fadeUp 0.5s 0.35s both;
        }

        .lp-security-dot {
          width: 4px; height: 4px;
          border-radius: 50%;
          background: rgba(0,212,255,0.4);
        }

        /* ── TABLET ── */
        @media (max-width: 600px) {
          .lp-card {
            padding: 36px 28px;
            border-radius: 20px;
          }
          .lp-title { font-size: 20px; }
        }

        /* ── MOBILE ── */
        @media (max-width: 480px) {
          .lp-root {
            padding: 16px 12px;
            align-items: center;
          }
          .lp-card {
            padding: 28px 20px;
            border-radius: 18px;
          }
          .lp-icon-wrap {
            width: 52px; height: 52px;
            border-radius: 14px;
            margin-bottom: 14px;
          }
          .lp-icon { width: 28px; height: 28px; }
          .lp-title { font-size: 17px; letter-spacing: 0.02em; }
          .lp-subtitle { font-size: 12px; }
          .lp-header { margin-bottom: 24px; }
          .lp-label { font-size: 10px; }
          .lp-input { padding: 11px 13px; font-size: 14px; }
          .lp-input::placeholder { font-size: 13px; }
          .lp-btn { padding: 12px; font-size: 11px; letter-spacing: 0.06em; }
          .lp-register { margin-top: 20px; font-size: 12px; }
          .lp-security-badge { font-size: 9px; margin-top: 16px; flex-wrap: wrap; text-align: center; }
          .lp-error { font-size: 12px; padding: 10px 12px; }
          .lp-field { margin-bottom: 16px; }
        }

        /* ── SMALL MOBILE ── */
        @media (max-width: 360px) {
          .lp-card { padding: 24px 16px; }
          .lp-title { font-size: 15px; }
          .lp-input { padding: 10px 11px; font-size: 13px; }
        }
      `}</style>

      <div className="lp-root">
        <div className="lp-bg">
          <div className="lp-orb1" />
          <div className="lp-orb2" />
          <div className="lp-orb3" />
          <div className="lp-grid" />
          <div className="lp-stars" />
        </div>

        <div className="lp-card">
          <div className="lp-header">
            <div className="lp-icon-wrap">
              <svg
                className="lp-icon"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  stroke="#00d4ff"
                  strokeWidth="4"
                  fill="rgba(0,212,255,0.05)"
                />
                <path
                  d="M 63 35 C 63 29 57 25 50 25 C 43 25 37 29 37 36 C 37 43 44 46 50 48 C 56 50 63 53 63 61 C 63 68 57 75 50 75 C 43 75 37 71 37 65"
                  stroke="#00d4ff"
                  strokeWidth="7"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </div>
            <h1 className="lp-title">Welcome Back</h1>
            <p className="lp-subtitle">Sign in to your secure account</p>
          </div>

          {error && (
            <div className="lp-error">
              <div className="lp-error-dot" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="lp-field">
              <label className="lp-label">Email Address</label>
              <div className="lp-input-wrap">
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField("")}
                  className={`lp-input ${focusedField === "email" ? "focused" : ""}`}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="lp-field">
              <label className="lp-label">Password</label>
              <div className="lp-input-wrap">
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField("")}
                  className={`lp-input ${focusedField === "password" ? "focused" : ""}`}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button type="submit" className="lp-btn" disabled={loading}>
              {loading ? (
                <span className="lp-btn-loader">
                  <span className="lp-spinner" />
                  Authenticating...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="lp-register">
            Don't have an account?{" "}
            <Link to="/register" className="lp-register-link">
              Create Account
            </Link>
          </p>

          <div className="lp-security-badge">
            <div className="lp-security-dot" />
            3-Layer Anti-Spoof Protection
            <div className="lp-security-dot" />
          </div>
        </div>
      </div>
    </>
  );
}

export default LoginPage;
