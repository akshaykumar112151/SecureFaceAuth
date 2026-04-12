import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";
import {
  ShieldCheck,
  Camera,
  Shield,
  ScanFace,
  UserRoundCheck,
  Zap,
  ArrowRight,
  Eye,
  Fingerprint,
  Brain,
  Mic,
} from "lucide-react";

function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user") || "{}"),
  );
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchEnrollStatus = async () => {
      try {
        const res = await API.get("/auth/enroll-status");
        const updatedUser = {
          ...user,
          is_face_enrolled: res.data.is_complete,
          face_encodings_count: res.data.count,
        };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
      } catch (err) {
        console.log("Using cached data");
      }
    };
    fetchEnrollStatus();
  }, []);

  const formatDate = (date) =>
    date.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  const formatTime = (date) =>
    date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;800&family=Rajdhani:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .dp-root { min-height: 100vh; background: #05060f; padding: 32px 24px 60px; font-family: 'Rajdhani', sans-serif; position: relative; overflow-x: hidden; }
        .dp-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
        .dp-orb1 { position: absolute; top: -150px; left: -150px; width: 700px; height: 700px; border-radius: 50%; background: radial-gradient(circle, rgba(0,212,255,0.07) 0%, transparent 65%); }
        .dp-orb2 { position: absolute; bottom: -100px; right: -100px; width: 600px; height: 600px; border-radius: 50%; background: radial-gradient(circle, rgba(124,58,237,0.09) 0%, transparent 65%); }
        .dp-orb3 { position: absolute; top: 40%; left: 50%; transform: translate(-50%,-50%); width: 400px; height: 400px; border-radius: 50%; background: radial-gradient(circle, rgba(34,197,94,0.03) 0%, transparent 70%); }
        .dp-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(0,212,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.02) 1px, transparent 1px); background-size: 60px 60px; }
        .dp-content { position: relative; z-index: 1; max-width: 1000px; margin: 0 auto; }

        @keyframes dpFadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dpPulse { 0%,100% { box-shadow: 0 0 8px rgba(34,197,94,0.8); } 50% { box-shadow: 0 0 20px rgba(34,197,94,1), 0 0 40px rgba(34,197,94,0.3); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }

        /* ── HEADER ── */
        .dp-header { display: flex; align-items: center; justify-content: space-between; background: linear-gradient(135deg, rgba(8,10,28,0.95), rgba(12,15,35,0.95)); border: 1px solid rgba(0,212,255,0.15); border-radius: 22px; padding: 26px 36px; margin-bottom: 20px; backdrop-filter: blur(32px); box-shadow: 0 4px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px rgba(0,212,255,0.03); position: relative; overflow: hidden; animation: dpFadeUp 0.5s 0.05s both; gap: 16px; }
        .dp-header::before { content: ''; position: absolute; top: 0; left: 10%; right: 10%; height: 1px; background: linear-gradient(90deg, transparent, rgba(0,212,255,0.6), rgba(124,58,237,0.4), transparent); }
        .dp-header::after { content: ''; position: absolute; bottom: 0; left: 20%; right: 20%; height: 1px; background: linear-gradient(90deg, transparent, rgba(0,212,255,0.1), transparent); }
        .dp-greet { font-family: 'Orbitron', monospace; font-size: 22px; font-weight: 700; background: linear-gradient(90deg, #fff 0%, #00d4ff 50%, #a78bfa 100%); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 8px; letter-spacing: 0.02em; animation: shimmer 4s linear infinite; }
        .dp-datetime { font-family: 'DM Mono', monospace; font-size: 12px; color: rgba(0,212,255,0.5); letter-spacing: 0.08em; }
        .dp-role-badge { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 100px; border: 1px solid rgba(0,212,255,0.25); background: linear-gradient(135deg, rgba(0,212,255,0.08), rgba(79,70,229,0.06)); font-family: 'Rajdhani', sans-serif; font-size: 13px; font-weight: 700; color: #00d4ff; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; flex-shrink: 0; box-shadow: 0 0 20px rgba(0,212,255,0.08); }
        .dp-role-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.8); animation: dpPulse 2s ease-in-out infinite; }

        /* ── STAT CARDS ── */
        .dp-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
        .dp-card { background: linear-gradient(145deg, rgba(8,10,28,0.9), rgba(12,15,38,0.9)); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; padding: 28px 20px; backdrop-filter: blur(24px); text-align: center; position: relative; overflow: hidden; cursor: default; transition: all 0.35s cubic-bezier(0.16,1,0.3,1); animation: dpFadeUp 0.5s both; }
        .dp-card:nth-child(1) { animation-delay: 0.1s; }
        .dp-card:nth-child(2) { animation-delay: 0.15s; }
        .dp-card:nth-child(3) { animation-delay: 0.2s; }
        .dp-card:hover { transform: translateY(-6px) scale(1.01); }
        .dp-card::before { content: ''; position: absolute; top: 0; left: 20%; right: 20%; height: 1px; background: linear-gradient(90deg, transparent, var(--card-color, rgba(0,212,255,0.4)), transparent); }
        .dp-card::after { content: ''; position: absolute; inset: 0; border-radius: 20px; opacity: 0; transition: opacity 0.35s; background: radial-gradient(circle at 50% 0%, var(--card-glow, rgba(0,212,255,0.06)) 0%, transparent 60%); }
        .dp-card:hover::after { opacity: 1; }
        .dp-card.cyan { --card-color: rgba(0,212,255,0.5); --card-glow: rgba(0,212,255,0.08); }
        .dp-card.cyan:hover { border-color: rgba(0,212,255,0.25); box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,212,255,0.1), 0 0 40px rgba(0,212,255,0.06); }
        .dp-card.green { --card-color: rgba(34,197,94,0.5); --card-glow: rgba(34,197,94,0.08); }
        .dp-card.green:hover { border-color: rgba(34,197,94,0.25); box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(34,197,94,0.1), 0 0 40px rgba(34,197,94,0.06); }
        .dp-card.purple { --card-color: rgba(167,139,250,0.5); --card-glow: rgba(167,139,250,0.08); }
        .dp-card.purple:hover { border-color: rgba(167,139,250,0.25); box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(167,139,250,0.1), 0 0 40px rgba(167,139,250,0.06); }
        .dp-card-icon { display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; width: 52px; height: 52px; border-radius: 16px; position: relative; z-index: 1; }
        .dp-card-label { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.25); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 10px; }
        .dp-card-value { font-family: 'Orbitron', monospace; font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 6px; letter-spacing: 0.02em; position: relative; z-index: 1; }
        .dp-card-value.enrolled { color: #4ade80; text-shadow: 0 0 20px rgba(74,222,128,0.6); }
        .dp-card-value.not-enrolled { color: #f87171; text-shadow: 0 0 16px rgba(248,113,113,0.5); }
        .dp-card-sub { font-size: 11px; color: rgba(255,255,255,0.2); letter-spacing: 0.05em; position: relative; z-index: 1; }

        /* ── QUICK ACTIONS ── */
        .dp-actions { background: linear-gradient(145deg, rgba(8,10,28,0.92), rgba(10,12,30,0.92)); border: 1px solid rgba(255,255,255,0.06); border-radius: 22px; padding: 28px 28px; margin-bottom: 20px; backdrop-filter: blur(28px); position: relative; overflow: hidden; animation: dpFadeUp 0.5s 0.25s both; }
        .dp-actions::before { content: ''; position: absolute; top: 0; left: 10%; right: 10%; height: 1px; background: linear-gradient(90deg, transparent, rgba(124,58,237,0.5), rgba(0,212,255,0.3), transparent); }
        .dp-actions-title { font-family: 'Orbitron', monospace; font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.25); letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 16px; }

        .dp-action-row { display: flex; align-items: center; gap: 16px; padding: 16px 18px; background: rgba(0,0,0,0.2); border-radius: 16px; cursor: pointer; margin-bottom: 10px; transition: all 0.3s cubic-bezier(0.16,1,0.3,1); position: relative; overflow: hidden; border: 1px solid transparent; }
        .dp-action-row:last-child { margin-bottom: 0; }
        .dp-action-row::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; border-radius: 3px 0 0 3px; opacity: 0; transition: opacity 0.3s; }
        .dp-action-row::after { content: ''; position: absolute; inset: 0; opacity: 0; transition: opacity 0.3s; }
        .dp-action-row:hover { transform: translateX(6px); }
        .dp-action-row:hover::before { opacity: 1; }
        .dp-action-row:hover::after { opacity: 1; }

        .dp-action-row.face-row::before { background: linear-gradient(180deg, #4ade80, #16a34a); }
        .dp-action-row.face-row::after { background: linear-gradient(90deg, rgba(34,197,94,0.07) 0%, transparent 50%); }
        .dp-action-row.face-row:hover { border-color: rgba(34,197,94,0.2); box-shadow: 0 4px 24px rgba(34,197,94,0.08), inset 0 0 0 1px rgba(34,197,94,0.05); }
        .dp-action-row.face-row .dp-action-icon { background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.25); color: #4ade80; }
        .dp-action-row.face-row:hover .dp-action-icon { background: rgba(34,197,94,0.18); box-shadow: 0 0 20px rgba(34,197,94,0.3); }
        .dp-action-row.face-row .dp-action-badge { background: rgba(34,197,94,0.12); color: #4ade80; border: 1px solid rgba(34,197,94,0.25); }
        .dp-action-row.face-row .dp-action-arrow { color: rgba(34,197,94,0.5); }
        .dp-action-row.face-row:hover .dp-action-arrow { color: #4ade80; filter: drop-shadow(0 0 6px rgba(74,222,128,0.7)); }

        .dp-action-row.voice-row::before { background: linear-gradient(180deg, #c084fc, #7c3aed); }
        .dp-action-row.voice-row::after { background: linear-gradient(90deg, rgba(167,139,250,0.07) 0%, transparent 50%); }
        .dp-action-row.voice-row:hover { border-color: rgba(167,139,250,0.2); box-shadow: 0 4px 24px rgba(167,139,250,0.08), inset 0 0 0 1px rgba(167,139,250,0.05); }
        .dp-action-row.voice-row .dp-action-icon { background: rgba(167,139,250,0.1); border: 1px solid rgba(167,139,250,0.25); color: #c084fc; }
        .dp-action-row.voice-row:hover .dp-action-icon { background: rgba(167,139,250,0.18); box-shadow: 0 0 20px rgba(167,139,250,0.3); }
        .dp-action-row.voice-row .dp-action-badge { background: rgba(167,139,250,0.12); color: #c084fc; border: 1px solid rgba(167,139,250,0.25); }
        .dp-action-row.voice-row .dp-action-arrow { color: rgba(167,139,250,0.5); }
        .dp-action-row.voice-row:hover .dp-action-arrow { color: #c084fc; filter: drop-shadow(0 0 6px rgba(192,132,252,0.7)); }

        .dp-action-row.auth-row::before { background: linear-gradient(180deg, #22d3ee, #4f46e5); }
        .dp-action-row.auth-row::after { background: linear-gradient(90deg, rgba(0,212,255,0.07) 0%, transparent 50%); }
        .dp-action-row.auth-row:hover { border-color: rgba(0,212,255,0.2); box-shadow: 0 4px 24px rgba(0,212,255,0.08), inset 0 0 0 1px rgba(0,212,255,0.05); }
        .dp-action-row.auth-row .dp-action-icon { background: rgba(0,212,255,0.1); border: 1px solid rgba(0,212,255,0.25); color: #22d3ee; }
        .dp-action-row.auth-row:hover .dp-action-icon { background: rgba(0,212,255,0.18); box-shadow: 0 0 20px rgba(0,212,255,0.3); }
        .dp-action-row.auth-row .dp-action-badge { background: rgba(0,212,255,0.12); color: #22d3ee; border: 1px solid rgba(0,212,255,0.25); }
        .dp-action-row.auth-row .dp-action-arrow { color: rgba(0,212,255,0.5); }
        .dp-action-row.auth-row:hover .dp-action-arrow { color: #22d3ee; filter: drop-shadow(0 0 6px rgba(34,211,238,0.7)); }

        .dp-action-row.admin-row::before { background: linear-gradient(180deg, #fbbf24, #d97706); }
        .dp-action-row.admin-row::after { background: linear-gradient(90deg, rgba(251,191,36,0.07) 0%, transparent 50%); }
        .dp-action-row.admin-row:hover { border-color: rgba(251,191,36,0.2); box-shadow: 0 4px 24px rgba(251,191,36,0.08); }
        .dp-action-row.admin-row .dp-action-icon { background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.25); color: #fbbf24; }
        .dp-action-row.admin-row:hover .dp-action-icon { background: rgba(251,191,36,0.18); box-shadow: 0 0 20px rgba(251,191,36,0.3); }
        .dp-action-row.admin-row .dp-action-arrow { color: rgba(251,191,36,0.5); }
        .dp-action-row.admin-row:hover .dp-action-arrow { color: #fbbf24; filter: drop-shadow(0 0 6px rgba(251,191,36,0.7)); }

        .dp-action-icon { width: 46px; height: 46px; border-radius: 13px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.3s ease; position: relative; z-index: 1; }
        .dp-action-text { flex: 1; font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.65); letter-spacing: 0.03em; transition: color 0.25s; position: relative; z-index: 1; }
        .dp-action-row:hover .dp-action-text { color: #fff; }
        .dp-action-badge { font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 100px; letter-spacing: 0.07em; text-transform: uppercase; margin-right: 4px; flex-shrink: 0; position: relative; z-index: 1; }
        .dp-action-arrow { transition: all 0.3s ease; flex-shrink: 0; position: relative; z-index: 1; }
        .dp-action-row:hover .dp-action-arrow { transform: translateX(3px); }

        /* ── SECURITY INFO ── */
        .dp-info { background: linear-gradient(145deg, rgba(4,6,18,0.95), rgba(8,10,25,0.95)); border: 1px solid rgba(0,212,255,0.08); border-radius: 22px; padding: 28px 28px; position: relative; overflow: hidden; animation: dpFadeUp 0.5s 0.3s both; }
        .dp-info::before { content: ''; position: absolute; top: 0; left: 8%; right: 8%; height: 1px; background: linear-gradient(90deg, transparent, rgba(0,212,255,0.5), rgba(124,58,237,0.4), transparent); }
        .dp-info-title { font-family: 'Orbitron', monospace; font-size: 11px; font-weight: 700; color: #00d4ff; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
        .dp-info-title-dot { width: 7px; height: 7px; border-radius: 50%; background: #00d4ff; box-shadow: 0 0 10px rgba(0,212,255,0.9); animation: dpPulse 2s ease-in-out infinite; }

        .dp-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .dp-step { display: flex; flex-direction: column; gap: 12px; padding: 20px 18px; background: rgba(0,212,255,0.02); border: 1px solid rgba(0,212,255,0.07); border-radius: 16px; transition: all 0.3s ease; position: relative; overflow: hidden; }
        .dp-step::before { content: ''; position: absolute; top: 0; left: 20%; right: 20%; height: 1px; background: linear-gradient(90deg, transparent, rgba(0,212,255,0.2), transparent); opacity: 0; transition: opacity 0.3s; }
        .dp-step:hover { background: rgba(0,212,255,0.04); border-color: rgba(0,212,255,0.15); transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
        .dp-step:hover::before { opacity: 1; }
        .dp-step-num { width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, rgba(0,212,255,0.15), rgba(79,70,229,0.15)); border: 1px solid rgba(0,212,255,0.25); display: flex; align-items: center; justify-content: center; color: #00d4ff; flex-shrink: 0; box-shadow: 0 0 16px rgba(0,212,255,0.12); }
        .dp-step-body { flex: 1; }
        .dp-step-title { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.85); margin-bottom: 5px; letter-spacing: 0.02em; }
        .dp-step-desc { font-size: 12px; color: rgba(255,255,255,0.3); line-height: 1.6; letter-spacing: 0.01em; margin: 0; }

        /* ── RESPONSIVE ── */
        @media (max-width: 768px) {
          .dp-root { padding: 20px 14px 50px; }
          .dp-header { padding: 20px 20px; border-radius: 18px; flex-wrap: wrap; }
          .dp-greet { font-size: 18px; }
          .dp-cards { grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .dp-card { padding: 20px 12px; }
          .dp-card-value { font-size: 14px; }
          .dp-actions { padding: 20px; border-radius: 18px; }
          .dp-info { padding: 20px; border-radius: 18px; }
          .dp-steps { grid-template-columns: 1fr; gap: 10px; }
          .dp-step { flex-direction: row; align-items: flex-start; padding: 14px 16px; }
        }
        @media (max-width: 540px) {
          .dp-root { padding: 14px 10px 40px; }
          .dp-header { padding: 16px; border-radius: 16px; flex-direction: column; align-items: flex-start; gap: 10px; }
          .dp-greet { font-size: 15px; }
          .dp-cards { gap: 8px; }
          .dp-card { padding: 14px 8px; border-radius: 14px; }
          .dp-card-icon { width: 42px; height: 42px; border-radius: 12px; }
          .dp-card-value { font-size: 12px; }
          .dp-action-row { padding: 12px 14px; gap: 12px; }
          .dp-action-icon { width: 40px; height: 40px; border-radius: 11px; }
          .dp-action-text { font-size: 13px; }
          .dp-action-badge { display: none; }
          .dp-steps { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="dp-root">
        <div className="dp-bg">
          <div className="dp-orb1" />
          <div className="dp-orb2" />
          <div className="dp-orb3" />
          <div className="dp-grid" />
        </div>

        <div className="dp-content">
          {/* ── Header ── */}
          <div className="dp-header">
            <div>
              <div className="dp-greet">Welcome back, {user.name}</div>
              <div className="dp-datetime">
                {formatDate(currentTime)} &nbsp;·&nbsp;{" "}
                {formatTime(currentTime)}
              </div>
            </div>
            <div className="dp-role-badge">
              <div className="dp-role-dot" />
              {user.role === "admin" ? "Administrator" : "User"}
            </div>
          </div>

          {/* ── Stat Cards ── */}
          <div className="dp-cards">
            {/* Auth */}
            <div className="dp-card cyan">
              <div
                className="dp-card-icon"
                style={{
                  background: "rgba(0,212,255,0.1)",
                  border: "1px solid rgba(0,212,255,0.2)",
                  boxShadow: "0 0 20px rgba(0,212,255,0.1)",
                }}
              >
                <ShieldCheck size={24} color="#22d3ee" />
              </div>
              <div className="dp-card-label">Authentication</div>
              <div
                className="dp-card-value"
                style={{
                  color: "#22d3ee",
                  textShadow: "0 0 20px rgba(34,211,238,0.5)",
                }}
              >
                Active
              </div>
              <div className="dp-card-sub">Account secured</div>
            </div>

            {/* Face */}
            <div className="dp-card green">
              <div
                className="dp-card-icon"
                style={{
                  background: user.is_face_enrolled
                    ? "rgba(34,197,94,0.1)"
                    : "rgba(248,113,113,0.1)",
                  border: user.is_face_enrolled
                    ? "1px solid rgba(34,197,94,0.25)"
                    : "1px solid rgba(248,113,113,0.25)",
                  boxShadow: user.is_face_enrolled
                    ? "0 0 20px rgba(34,197,94,0.12)"
                    : "0 0 20px rgba(248,113,113,0.1)",
                }}
              >
                <Camera
                  size={24}
                  color={user.is_face_enrolled ? "#4ade80" : "#f87171"}
                />
              </div>
              <div className="dp-card-label">Face Status</div>
              <div
                className={`dp-card-value ${user.is_face_enrolled ? "enrolled" : "not-enrolled"}`}
              >
                {user.is_face_enrolled ? "Enrolled ✓" : "Not Enrolled"}
              </div>
              <div className="dp-card-sub">
                {user.is_face_enrolled
                  ? `${user.face_encodings_count || 5}/5 angles`
                  : "Enroll to continue"}
              </div>
            </div>

            {/* Security */}
            <div className="dp-card purple">
              <div
                className="dp-card-icon"
                style={{
                  background: "rgba(124,58,237,0.1)",
                  border: "1px solid rgba(167,139,250,0.25)",
                  boxShadow: "0 0 20px rgba(124,58,237,0.1)",
                }}
              >
                <Shield size={24} color="#c084fc" />
              </div>
              <div className="dp-card-label">Security Layer</div>
              <div
                className="dp-card-value"
                style={{
                  color: "#c084fc",
                  textShadow: "0 0 20px rgba(192,132,252,0.5)",
                }}
              >
                3-Layer
              </div>
              <div className="dp-card-sub">Anti-spoof active</div>
            </div>
          </div>

          {/* ── Quick Actions ── */}
          <div className="dp-actions">
            <div className="dp-actions-title">Quick Actions</div>

            <div
              className="dp-action-row face-row"
              onClick={() => navigate("/face-auth?mode=enroll")}
            >
              <div className="dp-action-icon">
                <ScanFace size={20} />
              </div>
              <span className="dp-action-text">Enroll Face</span>
              <span className="dp-action-badge">5 Angles</span>
              <ArrowRight size={18} className="dp-action-arrow" />
            </div>

            <div
              className="dp-action-row voice-row"
              onClick={() => navigate("/face-auth?mode=voice")}
            >
              <div className="dp-action-icon">
                <Mic size={20} />
              </div>
              <span className="dp-action-text">Enroll Voice</span>
              <span className="dp-action-badge">3 Samples</span>
              <ArrowRight size={18} className="dp-action-arrow" />
            </div>

            <div
              className="dp-action-row auth-row"
              onClick={() => navigate("/face-auth?mode=auth")}
            >
              <div className="dp-action-icon">
                <Fingerprint size={20} />
              </div>
              <span className="dp-action-text">3 Process Authentication</span>
              <span className="dp-action-badge">Step 1-3</span>
              <ArrowRight size={18} className="dp-action-arrow" />
            </div>

            {user.role === "admin" && (
              <div
                className="dp-action-row admin-row"
                onClick={() => navigate("/admin")}
              >
                <div className="dp-action-icon">
                  <Zap size={20} />
                </div>
                <span className="dp-action-text">Admin Panel</span>
                <ArrowRight size={18} className="dp-action-arrow" />
              </div>
            )}
          </div>

          {/* ── Security Info ── */}
          <div className="dp-info">
            <div className="dp-info-title">
              <div className="dp-info-title-dot" />
              How Your Account Is Protected
            </div>
            <div className="dp-steps">
              <div className="dp-step">
                <div className="dp-step-num">
                  <Eye size={18} />
                </div>
                <div className="dp-step-body">
                  <div className="dp-step-title">Face Detection</div>
                  <p className="dp-step-desc">
                    Your face is detected using multi-cascade algorithms
                    supporting multiple angles.
                  </p>
                </div>
              </div>
              <div className="dp-step">
                <div className="dp-step-num">
                  <UserRoundCheck size={18} />
                </div>
                <div className="dp-step-body">
                  <div className="dp-step-title">Liveness Check</div>
                  <p className="dp-step-desc">
                    Real-time blink sequence detection confirms you are a live
                    person, not a photo or screen.
                  </p>
                </div>
              </div>
              <div className="dp-step">
                <div className="dp-step-num">
                  <Brain size={18} />
                </div>
                <div className="dp-step-body">
                  <div className="dp-step-title">CNN Skin Analysis</div>
                  <p className="dp-step-desc">
                    A 5-layer spoof detector analyzes skin texture, color, and
                    frequency to block all spoofing attacks.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default DashboardPage;
