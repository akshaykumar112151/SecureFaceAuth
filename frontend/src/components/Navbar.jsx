import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Zap, LogOut, UserCheck, Menu, X } from "lucide-react";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [time, setTime] = useState(new Date());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
    setMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;800&family=Rajdhani:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        :root {
          --cyan: #00d4ff;
          --blue: #4f46e5;
          --purple: #7c3aed;
          --glass-bg: rgba(6, 8, 24, 0.75);
          --glass-border: rgba(0, 212, 255, 0.15);
        }

        .gfx-nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 1000;
          font-family: 'Rajdhani', sans-serif;
        }

        .gfx-nav-glass {
          background: var(--glass-bg);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border-bottom: 1px solid var(--glass-border);
          box-shadow:
            0 4px 32px rgba(0, 0, 0, 0.6),
            inset 0 1px 0 rgba(0, 212, 255, 0.08),
            0 0 80px rgba(0, 212, 255, 0.04);
          position: relative;
          overflow: hidden;
        }

        .gfx-nav-glass::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 60%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.6), transparent);
          animation: scanLine 4s linear infinite;
        }

        @keyframes scanLine {
          0% { left: -60%; }
          100% { left: 160%; }
        }

        .gfx-nav-glass::after {
          content: '';
          position: absolute;
          bottom: 0; left: 15%; right: 15%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.5) 30%, rgba(79, 70, 229, 0.5) 70%, transparent);
          filter: blur(0.5px);
        }

        .gfx-nav-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          height: 66px;
          max-width: 1400px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        /* Brand */
        .gfx-brand {
          display: flex; align-items: center; gap: 12px;
          text-decoration: none;
        }

        .gfx-logo {
          width: 38px; height: 38px; flex-shrink: 0;
          filter: drop-shadow(0 0 8px rgba(0,212,255,0.6));
          animation: logoGlow 3s ease-in-out infinite;
        }

        @keyframes logoGlow {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(0,212,255,0.5)); }
          50% { filter: drop-shadow(0 0 16px rgba(0,212,255,0.9)) drop-shadow(0 0 32px rgba(0,212,255,0.3)); }
        }

        .gfx-brand-text {
          font-family: 'Orbitron', monospace;
          font-size: 15px; font-weight: 700; letter-spacing: 0.05em;
          background: linear-gradient(90deg, #fff 0%, #00d4ff 50%, #a78bfa 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 0 8px rgba(0, 212, 255, 0.4));
        }

        /* Right section — desktop */
        .gfx-right {
          display: flex; align-items: center; gap: 10px;
        }

        /* Clock */
        .gfx-clock {
          font-family: 'DM Mono', monospace; font-size: 12px;
          color: rgba(0, 212, 255, 0.5); letter-spacing: 0.12em;
          display: flex; align-items: center; gap: 6px;
          padding: 5px 12px;
          background: rgba(0, 212, 255, 0.04);
          border: 1px solid rgba(0, 212, 255, 0.08);
          border-radius: 6px;
        }

        .gfx-clock-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: #00d4ff;
          box-shadow: 0 0 6px rgba(0, 212, 255, 0.8);
          animation: blink 1s step-end infinite;
        }

        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

        /* Nav links */
        .gfx-link {
          display: flex; align-items: center; gap: 6px;
          color: rgba(255, 255, 255, 0.45); text-decoration: none;
          font-size: 13px; font-weight: 600; padding: 7px 16px;
          border-radius: 8px; letter-spacing: 0.06em; text-transform: uppercase;
          transition: all 0.25s ease; white-space: nowrap;
        }

        .gfx-link:hover { color: #fff; background: rgba(0, 212, 255, 0.08); text-shadow: 0 0 12px rgba(0, 212, 255, 0.8); }

        .gfx-link.active {
          color: #00d4ff; background: rgba(0, 212, 255, 0.1);
          box-shadow: 0 0 12px rgba(0, 212, 255, 0.2), inset 0 0 12px rgba(0, 212, 255, 0.05);
          text-shadow: 0 0 16px rgba(0, 212, 255, 0.9);
          border: 1px solid rgba(0, 212, 255, 0.2);
        }

        /* Welcome chip */
        .gfx-welcome {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 14px; border-radius: 8px;
          background: rgba(0, 212, 255, 0.05); border: 1px solid rgba(0, 212, 255, 0.12);
          font-size: 13px; font-weight: 600; color: rgba(255, 255, 255, 0.6);
          letter-spacing: 0.04em; text-transform: uppercase;
        }

        .gfx-online-dot {
          width: 7px; height: 7px; border-radius: 50%; background: #22c55e;
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.8), 0 0 16px rgba(34, 197, 94, 0.4);
          animation: onlinePulse 2s ease-in-out infinite;
        }

        @keyframes onlinePulse {
          0%, 100% { box-shadow: 0 0 8px rgba(34, 197, 94, 0.8); }
          50% { box-shadow: 0 0 14px rgba(34, 197, 94, 1), 0 0 28px rgba(34, 197, 94, 0.5); }
        }

        /* Admin link */
        .gfx-admin-link {
          display: flex; align-items: center; gap: 6px;
          color: #fbbf24; text-decoration: none;
          font-size: 13px; font-weight: 700; padding: 7px 16px; border-radius: 8px;
          background: rgba(251, 191, 36, 0.07); border: 1px solid rgba(251, 191, 36, 0.2);
          letter-spacing: 0.05em; text-transform: uppercase; transition: all 0.25s ease;
        }

        .gfx-admin-link:hover { background: rgba(251, 191, 36, 0.14); box-shadow: 0 0 20px rgba(251, 191, 36, 0.25); text-shadow: 0 0 10px rgba(251, 191, 36, 0.8); }

        /* Logout */
        .gfx-logout {
          display: flex; align-items: center; gap: 6px;
          background: rgba(239, 68, 68, 0.08); color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
          padding: 7px 18px; border-radius: 8px; cursor: pointer;
          font-size: 13px; font-weight: 700; font-family: 'Rajdhani', sans-serif;
          letter-spacing: 0.06em; text-transform: uppercase; transition: all 0.25s ease;
        }

        .gfx-logout:hover { background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.4); box-shadow: 0 0 20px rgba(239, 68, 68, 0.25); transform: translateY(-1px); }

        /* Auth buttons */
        .gfx-btn-ghost {
          display: flex; align-items: center; gap: 6px;
          color: rgba(255, 255, 255, 0.55); text-decoration: none;
          font-size: 13px; font-weight: 600; padding: 8px 18px; border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          letter-spacing: 0.04em; text-transform: uppercase; transition: all 0.25s ease;
        }

        .gfx-btn-ghost:hover { color: #fff; border-color: rgba(0, 212, 255, 0.3); background: rgba(0, 212, 255, 0.05); }

        .gfx-btn-primary {
          display: flex; align-items: center; gap: 6px;
          color: #000; text-decoration: none;
          font-size: 13px; font-weight: 700; padding: 8px 22px; border-radius: 8px;
          background: linear-gradient(135deg, #00d4ff, #4f46e5);
          letter-spacing: 0.05em; text-transform: uppercase; transition: all 0.25s ease;
          box-shadow: 0 0 20px rgba(0, 212, 255, 0.35); position: relative; overflow: hidden;
        }

        .gfx-btn-primary::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); transition: left 0.4s ease; }
        .gfx-btn-primary:hover::before { left: 100%; }
        .gfx-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 0 32px rgba(0, 212, 255, 0.55); }

        /* Divider */
        .gfx-vdiv { width: 1px; height: 22px; background: linear-gradient(180deg, transparent, rgba(0, 212, 255, 0.2), transparent); }

        /* Hamburger button */
        .gfx-hamburger {
          display: none;
          align-items: center; justify-content: center;
          width: 40px; height: 40px; border-radius: 10px;
          background: rgba(0,212,255,0.06);
          border: 1px solid rgba(0,212,255,0.15);
          color: #00d4ff; cursor: pointer;
          transition: all 0.25s ease;
        }

        .gfx-hamburger:hover { background: rgba(0,212,255,0.12); box-shadow: 0 0 14px rgba(0,212,255,0.2); }

        /* Mobile dropdown */
        .gfx-mobile-menu {
          display: none;
          flex-direction: column; gap: 8px;
          padding: 16px 20px 20px;
          border-top: 1px solid rgba(0,212,255,0.08);
          background: rgba(4,6,20,0.98);
          backdrop-filter: blur(24px);
        }

        .gfx-mobile-menu.open { display: flex; }

        .gfx-mobile-link {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; border-radius: 10px;
          font-size: 14px; font-weight: 700;
          letter-spacing: 0.06em; text-transform: uppercase;
          text-decoration: none; transition: all 0.2s ease;
          color: rgba(255,255,255,0.5);
          border: 1px solid transparent;
        }

        .gfx-mobile-link:hover, .gfx-mobile-link.active {
          color: #00d4ff; background: rgba(0,212,255,0.08);
          border-color: rgba(0,212,255,0.15);
        }

        .gfx-mobile-link.admin {
          color: #fbbf24; background: rgba(251,191,36,0.06);
          border-color: rgba(251,191,36,0.15);
        }

        .gfx-mobile-link.admin:hover {
          background: rgba(251,191,36,0.12);
          border-color: rgba(251,191,36,0.25);
        }

        .gfx-mobile-logout {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; border-radius: 10px;
          font-size: 14px; font-weight: 700;
          letter-spacing: 0.06em; text-transform: uppercase;
          background: rgba(239,68,68,0.08); color: #f87171;
          border: 1px solid rgba(239,68,68,0.2);
          cursor: pointer; font-family: 'Rajdhani', sans-serif;
          transition: all 0.2s ease; margin-top: 4px;
        }

        .gfx-mobile-logout:hover { background: rgba(239,68,68,0.14); }

        .gfx-mobile-clock {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 16px; border-radius: 10px;
          font-family: 'DM Mono', monospace; font-size: 12px;
          color: rgba(0,212,255,0.5); letter-spacing: 0.1em;
          background: rgba(0,212,255,0.04);
          border: 1px solid rgba(0,212,255,0.08);
        }

        .gfx-mobile-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0,212,255,0.1), transparent);
          margin: 4px 0;
        }

        .gfx-spacer { height: 66px; }

        /* ── RESPONSIVE BREAKPOINTS ── */

        /* Hide desktop right, show hamburger */
        @media (max-width: 768px) {
          .gfx-nav-inner { padding: 0 16px; }
          .gfx-right { display: none; }
          .gfx-hamburger { display: flex; }
          .gfx-brand-text { font-size: 13px; }
          .gfx-logo { width: 32px; height: 32px; }
        }

        @media (max-width: 400px) {
          .gfx-brand-text { font-size: 12px; letter-spacing: 0.02em; }
          .gfx-logo { width: 28px; height: 28px; }
          .gfx-nav-inner { height: 58px; }
          .gfx-spacer { height: 58px; }
        }
      `}</style>

      <nav className="gfx-nav">
        <div className="gfx-nav-glass">
          {/* Main bar */}
          <div className="gfx-nav-inner">
            {/* Brand */}
            <Link to={token ? "/dashboard" : "/login"} className="gfx-brand">
              <svg
                className="gfx-logo"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="4"
                  y="4"
                  width="92"
                  height="92"
                  rx="22"
                  fill="rgba(0,212,255,0.08)"
                  stroke="rgba(0,212,255,0.5)"
                  strokeWidth="3"
                />
                <rect
                  x="10"
                  y="10"
                  width="80"
                  height="80"
                  rx="17"
                  fill="none"
                  stroke="rgba(0,212,255,0.15)"
                  strokeWidth="1"
                />
                <path
                  d="M 63 36 C 63 29 57 24 50 24 C 43 24 37 29 37 36 C 37 43 44 47 50 49 C 56 51 63 55 63 62 C 63 69 57 76 50 76 C 43 76 37 71 37 64"
                  stroke="#00d4ff"
                  strokeWidth="8"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              <span className="gfx-brand-text">SecureFace AI</span>
            </Link>

            {/* Desktop Right */}
            <div className="gfx-right">
              <div className="gfx-clock">
                <div className="gfx-clock-dot" />
                {time.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                })}
              </div>

              {!token ? (
                <>
                  <Link to="/login" className="gfx-btn-ghost">
                    <UserCheck size={14} />
                    Sign In
                  </Link>
                  <Link to="/register" className="gfx-btn-primary">
                    Get Started
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/dashboard"
                    className={`gfx-link ${isActive("/dashboard") ? "active" : ""}`}
                  >
                    <LayoutDashboard size={14} />
                    Dashboard
                  </Link>
                  {user.role === "admin" && (
                    <Link to="/admin" className="gfx-admin-link">
                      <Zap size={14} />
                      Admin
                    </Link>
                  )}
                  <div className="gfx-vdiv" />
                  {user.role !== "admin" && (
                    <div className="gfx-welcome">
                      <div className="gfx-online-dot" />
                      {user.name}
                    </div>
                  )}
                  <button onClick={handleLogout} className="gfx-logout">
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </>
              )}
            </div>

            {/* Hamburger — mobile only */}
            <button
              className="gfx-hamburger"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Mobile Menu */}
          <div className={`gfx-mobile-menu ${menuOpen ? "open" : ""}`}>
            <div className="gfx-mobile-clock">
              <div className="gfx-clock-dot" />
              {time.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              })}
            </div>

            <div className="gfx-mobile-divider" />

            {!token ? (
              <>
                <Link to="/login" className="gfx-mobile-link">
                  <UserCheck size={16} />
                  Sign In
                </Link>
                <Link to="/register" className="gfx-mobile-link">
                  <Zap size={16} />
                  Get Started
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/dashboard"
                  className={`gfx-mobile-link ${isActive("/dashboard") ? "active" : ""}`}
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </Link>
                {user.role === "admin" && (
                  <Link to="/admin" className="gfx-mobile-link admin">
                    <Zap size={16} />
                    Admin Panel
                  </Link>
                )}
                <div className="gfx-mobile-divider" />
                <button onClick={handleLogout} className="gfx-mobile-logout">
                  <LogOut size={16} />
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="gfx-spacer" />
    </>
  );
}

export default Navbar;
