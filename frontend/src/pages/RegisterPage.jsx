import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../utils/api";

function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long!");
      return;
    }

    setLoading(true);
    try {
      await registerUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      setSuccess("Account created successfully! Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed!");
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    const p = formData.password;
    if (!p) return null;
    if (p.length < 6) return { label: "Weak", color: "#ef4444", width: "33%" };
    if (p.length < 10)
      return { label: "Medium", color: "#f59e0b", width: "66%" };
    return { label: "Strong", color: "#22c55e", width: "100%" };
  };

  const strength = getPasswordStrength();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;800&family=Rajdhani:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .rp-root {
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

        .rp-bg { position: absolute; inset: 0; pointer-events: none; z-index: 0; }

        .rp-orb1 {
          position: absolute;
          top: -100px; right: -100px;
          width: 480px; height: 480px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%);
          animation: rpOrbFloat 9s ease-in-out infinite;
        }

        .rp-orb2 {
          position: absolute;
          bottom: -80px; left: -80px;
          width: 420px; height: 420px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,212,255,0.11) 0%, transparent 70%);
          animation: rpOrbFloat 11s ease-in-out infinite reverse;
        }

        .rp-orb3 {
          position: absolute;
          top: 40%; left: 50%;
          transform: translate(-50%, -50%);
          width: 700px; height: 700px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(79,70,229,0.04) 0%, transparent 65%);
        }

        @keyframes rpOrbFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-25px) scale(1.04); }
        }

        .rp-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        .rp-stars {
          position: absolute; inset: 0;
          background-image:
            radial-gradient(1px 1px at 15% 25%, rgba(255,255,255,0.4) 0%, transparent 100%),
            radial-gradient(1px 1px at 35% 65%, rgba(0,212,255,0.3) 0%, transparent 100%),
            radial-gradient(1px 1px at 60% 12%, rgba(255,255,255,0.3) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 80% 45%, rgba(124,58,237,0.4) 0%, transparent 100%),
            radial-gradient(1px 1px at 90% 80%, rgba(255,255,255,0.3) 0%, transparent 100%),
            radial-gradient(1px 1px at 25% 88%, rgba(0,212,255,0.3) 0%, transparent 100%),
            radial-gradient(1px 1px at 50% 55%, rgba(255,255,255,0.2) 0%, transparent 100%);
        }

        .rp-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 440px;
          background: rgba(8, 10, 28, 0.88);
          border: 1px solid rgba(124,58,237,0.2);
          border-radius: 24px;
          padding: 44px 40px;
          backdrop-filter: blur(32px);
          -webkit-backdrop-filter: blur(32px);
          box-shadow:
            0 0 0 1px rgba(124,58,237,0.06),
            0 24px 80px rgba(0,0,0,0.7),
            0 0 60px rgba(124,58,237,0.07),
            inset 0 1px 0 rgba(255,255,255,0.05);
          animation: rpCardIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes rpCardIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .rp-card::before {
          content: '';
          position: absolute;
          top: 0; left: 20%; right: 20%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(124,58,237,0.7), rgba(0,212,255,0.5), transparent);
        }

        .rp-card::after {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 50%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(124,58,237,0.6), transparent);
          animation: rpCardScan 5s linear infinite;
        }

        @keyframes rpCardScan {
          0% { left: -50%; }
          100% { left: 160%; }
        }

        .rp-header {
          text-align: center;
          margin-bottom: 32px;
          animation: rpFadeUp 0.5s 0.1s both;
        }

        @keyframes rpFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .rp-icon-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 60px; height: 60px;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(124,58,237,0.15), rgba(0,212,255,0.12));
          border: 1px solid rgba(124,58,237,0.3);
          margin-bottom: 18px;
          box-shadow: 0 0 24px rgba(124,58,237,0.2), inset 0 0 20px rgba(124,58,237,0.05);
          animation: rpIconPulse 3s ease-in-out infinite;
        }

        @keyframes rpIconPulse {
          0%, 100% { box-shadow: 0 0 24px rgba(124,58,237,0.2); }
          50% { box-shadow: 0 0 40px rgba(124,58,237,0.4), 0 0 80px rgba(124,58,237,0.15); }
        }

        .rp-icon {
          width: 32px; height: 32px;
          filter: drop-shadow(0 0 8px rgba(124,58,237,0.7));
        }

        .rp-title {
          font-family: 'Orbitron', monospace;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 0.04em;
          background: linear-gradient(90deg, #fff 0%, #a78bfa 50%, #00d4ff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 6px;
          filter: drop-shadow(0 0 8px rgba(124,58,237,0.2));
        }

        .rp-subtitle {
          font-size: 13.5px;
          color: rgba(255,255,255,0.32);
          letter-spacing: 0.04em;
        }

        .rp-error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.25);
          color: #f87171;
          padding: 12px 16px;
          border-radius: 10px;
          margin-bottom: 18px;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.02em;
          animation: rpFadeUp 0.3s both;
        }

        .rp-success {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(34,197,94,0.08);
          border: 1px solid rgba(34,197,94,0.25);
          color: #4ade80;
          padding: 12px 16px;
          border-radius: 10px;
          margin-bottom: 18px;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.02em;
          animation: rpFadeUp 0.3s both;
        }

        .rp-msg-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .rp-error .rp-msg-dot { background: #f87171; box-shadow: 0 0 6px rgba(248,113,113,0.8); }
        .rp-success .rp-msg-dot { background: #4ade80; box-shadow: 0 0 6px rgba(74,222,128,0.8); }

        .rp-field {
          margin-bottom: 18px;
          animation: rpFadeUp 0.5s both;
        }

        .rp-field:nth-child(1) { animation-delay: 0.12s; }
        .rp-field:nth-child(2) { animation-delay: 0.17s; }
        .rp-field:nth-child(3) { animation-delay: 0.22s; }
        .rp-field:nth-child(4) { animation-delay: 0.27s; }

        .rp-label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          color: rgba(167,139,250,0.7);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 7px;
        }

        .rp-input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 15px;
          font-weight: 500;
          color: #fff;
          outline: none;
          box-sizing: border-box;
          transition: all 0.25s ease;
          letter-spacing: 0.02em;
        }

        .rp-input::placeholder {
          color: rgba(255,255,255,0.18);
          font-size: 14px;
        }

        .rp-input:focus {
          border-color: rgba(124,58,237,0.5);
          background: rgba(124,58,237,0.04);
          box-shadow: 0 0 0 3px rgba(124,58,237,0.08), 0 0 20px rgba(124,58,237,0.1);
        }

        .rp-strength-wrap {
          margin-top: 8px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .rp-strength-track {
          flex: 1;
          height: 3px;
          background: rgba(255,255,255,0.06);
          border-radius: 2px;
          overflow: hidden;
        }

        .rp-strength-fill {
          height: 100%;
          border-radius: 2px;
          transition: all 0.4s ease;
        }

        .rp-strength-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .rp-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #7c3aed, #4f46e5, #00d4ff);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-family: 'Orbitron', monospace;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.08em;
          cursor: pointer;
          margin-top: 6px;
          position: relative;
          overflow: hidden;
          transition: all 0.25s ease;
          box-shadow: 0 0 24px rgba(124,58,237,0.35), 0 4px 16px rgba(0,0,0,0.4);
          animation: rpFadeUp 0.5s 0.3s both;
        }

        .rp-btn::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.4s ease;
        }

        .rp-btn:hover::before { left: 100%; }

        .rp-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 0 40px rgba(124,58,237,0.55), 0 8px 24px rgba(0,0,0,0.5);
        }

        .rp-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .rp-btn-loader {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        .rp-spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: rpSpin 0.7s linear infinite;
        }

        @keyframes rpSpin { to { transform: rotate(360deg); } }

        .rp-login {
          text-align: center;
          margin-top: 24px;
          font-size: 13px;
          color: rgba(255,255,255,0.28);
          letter-spacing: 0.03em;
          animation: rpFadeUp 0.5s 0.35s both;
        }

        .rp-login-link {
          color: #a78bfa;
          text-decoration: none;
          font-weight: 700;
          letter-spacing: 0.04em;
          transition: all 0.2s ease;
        }

        .rp-login-link:hover { text-shadow: 0 0 10px rgba(167,139,250,0.8); }

        .rp-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 20px;
          font-size: 10.5px;
          color: rgba(255,255,255,0.15);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          animation: rpFadeUp 0.5s 0.4s both;
          flex-wrap: wrap;
        }

        .rp-badge-dot {
          width: 3px; height: 3px;
          border-radius: 50%;
          background: rgba(167,139,250,0.4);
        }

        /* ── TABLET ── */
        @media (max-width: 600px) {
          .rp-card {
            padding: 36px 28px;
            border-radius: 20px;
          }
          .rp-title { font-size: 18px; }
        }

        /* ── MOBILE ── */
        @media (max-width: 480px) {
          .rp-root {
            padding: 16px 12px;
            align-items: center;
          }
          .rp-card {
            padding: 28px 20px;
            border-radius: 18px;
          }
          .rp-icon-wrap {
            width: 50px; height: 50px;
            border-radius: 13px;
            margin-bottom: 14px;
          }
          .rp-icon { width: 26px; height: 26px; }
          .rp-title { font-size: 16px; letter-spacing: 0.02em; }
          .rp-subtitle { font-size: 12px; }
          .rp-header { margin-bottom: 24px; }
          .rp-label { font-size: 10px; }
          .rp-input { padding: 11px 13px; font-size: 14px; }
          .rp-input::placeholder { font-size: 13px; }
          .rp-field { margin-bottom: 14px; }
          .rp-btn { padding: 12px; font-size: 11px; letter-spacing: 0.06em; }
          .rp-login { margin-top: 18px; font-size: 12px; }
          .rp-badge { font-size: 9px; margin-top: 14px; gap: 4px; }
          .rp-error, .rp-success { font-size: 12px; padding: 10px 12px; }
          .rp-strength-label { font-size: 10px; }
        }

        /* ── SMALL MOBILE ── */
        @media (max-width: 360px) {
          .rp-card { padding: 24px 16px; }
          .rp-title { font-size: 14px; }
          .rp-input { padding: 10px 11px; font-size: 13px; }
          .rp-btn { font-size: 10px; padding: 11px; }
        }
      `}</style>

      <div className="rp-root">
        <div className="rp-bg">
          <div className="rp-orb1" />
          <div className="rp-orb2" />
          <div className="rp-orb3" />
          <div className="rp-grid" />
          <div className="rp-stars" />
        </div>

        <div className="rp-card">
          <div className="rp-header">
            <div className="rp-icon-wrap">
              <svg
                className="rp-icon"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  stroke="#a78bfa"
                  strokeWidth="4"
                  fill="rgba(124,58,237,0.08)"
                />
                <path
                  d="M 63 35 C 63 29 57 25 50 25 C 43 25 37 29 37 36 C 37 43 44 46 50 48 C 56 50 63 53 63 61 C 63 68 57 75 50 75 C 43 75 37 71 37 65"
                  stroke="#a78bfa"
                  strokeWidth="7"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </div>
            <h1 className="rp-title">Create Account</h1>
            <p className="rp-subtitle">
              Join the secure authentication platform
            </p>
          </div>

          {error && (
            <div className="rp-error">
              <div className="rp-msg-dot" />
              {error}
            </div>
          )}
          {success && (
            <div className="rp-success">
              <div className="rp-msg-dot" />
              {success}
            </div>
          )}

          <form onSubmit={handleRegister}>
            <div className="rp-field">
              <label className="rp-label">Full Name</label>
              <input
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                onFocus={() => setFocusedField("name")}
                onBlur={() => setFocusedField("")}
                className="rp-input"
                required
                autoComplete="name"
              />
            </div>

            <div className="rp-field">
              <label className="rp-label">Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField("")}
                className="rp-input"
                required
                autoComplete="email"
              />
            </div>

            <div className="rp-field">
              <label className="rp-label">Password</label>
              <input
                type="password"
                name="password"
                placeholder="••••••••••"
                value={formData.password}
                onChange={handleChange}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField("")}
                className="rp-input"
                required
                autoComplete="new-password"
              />
              {strength && (
                <div className="rp-strength-wrap">
                  <div className="rp-strength-track">
                    <div
                      className="rp-strength-fill"
                      style={{
                        width: strength.width,
                        background: strength.color,
                        boxShadow: `0 0 8px ${strength.color}`,
                      }}
                    />
                  </div>
                  <span
                    className="rp-strength-label"
                    style={{ color: strength.color }}
                  >
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            <div className="rp-field">
              <label className="rp-label">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="••••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                onFocus={() => setFocusedField("confirmPassword")}
                onBlur={() => setFocusedField("")}
                className="rp-input"
                required
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="rp-btn" disabled={loading}>
              {loading ? (
                <span className="rp-btn-loader">
                  <span className="rp-spinner" />
                  Creating Account...
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="rp-login">
            Already have an account?{" "}
            <Link to="/login" className="rp-login-link">
              Sign In
            </Link>
          </p>

          <div className="rp-badge">
            <div className="rp-badge-dot" />
            End-to-End Encrypted
            <div className="rp-badge-dot" />
            Biometric Security
            <div className="rp-badge-dot" />
          </div>
        </div>
      </div>
    </>
  );
}

export default RegisterPage;
