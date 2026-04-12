import { useState, useEffect, useCallback } from "react";
import {
  getStats,
  getUsers,
  getLogs,
  deleteUser,
  toggleUser,
} from "../utils/api";
import {
  Users,
  Lock,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  Zap,
  User,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts";

const COLORS = {
  success: "#4ade80",
  spoof: "#fbbf24",
  failed: "#f87171",
  cyan: "#00d4ff",
  purple: "#a78bfa",
};

const tooltipStyle = {
  backgroundColor: "rgba(8,10,28,0.95)",
  border: "1px solid rgba(0,212,255,0.2)",
  borderRadius: "10px",
  color: "#fff",
  fontFamily: "'Rajdhani', sans-serif",
  fontSize: "13px",
};

function AdminPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [countdown, setCountdown] = useState(10);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [statsRes, usersRes, logsRes] = await Promise.all([
        getStats(),
        getUsers(),
        getLogs(),
      ]);
      setStats(statsRes.data.stats);
      setUsers(usersRes.data.users);
      setLogs(logsRes.data.logs);
      setLastUpdated(new Date());
      setCountdown(10);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);
  useEffect(() => {
    const i = setInterval(() => fetchAll(true), 10000);
    return () => clearInterval(i);
  }, [fetchAll]);
  useEffect(() => {
    const t = setInterval(
      () => setCountdown((c) => (c <= 1 ? 10 : c - 1)),
      1000,
    );
    return () => clearInterval(t);
  }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ${name}? This action cannot be undone.`))
      return;
    try {
      await deleteUser(id);
      setUsers(users.filter((u) => u.id !== id));
    } catch (err) {
      alert("Delete failed!");
    }
  };

  const handleToggle = async (id) => {
    try {
      await toggleUser(id);
      setUsers(
        users.map((u) => (u.id === id ? { ...u, is_active: !u.is_active } : u)),
      );
    } catch (err) {
      alert("Toggle failed!");
    }
  };

  const formatIST = (ts) => {
    if (!ts) return "—";
    const d = new Date(ts.replace(" ", "T") + "Z");
    return d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const pieData = stats
    ? [
        {
          name: "Success",
          value: stats.successful_auths,
          color: COLORS.success,
        },
        {
          name: "Spoof Blocked",
          value: stats.spoof_attempts,
          color: COLORS.spoof,
        },
        { name: "Failed", value: stats.failed_attempts, color: COLORS.failed },
      ]
    : [];

  const timelineData = [...logs]
    .slice(0, 20)
    .reverse()
    .map((l, i) => ({
      i: i + 1,
      face: l.face_match_score ? +l.face_match_score.toFixed(1) : 0,
      live: l.liveness_score ? +l.liveness_score.toFixed(1) : 0,
      skin: l.skin_score ? +l.skin_score.toFixed(1) : 0,
    }));

  // Only non-admin users in bar chart
  const userAttempts = users
    .filter((u) => u.role !== "admin")
    .map((u) => ({
      name: u.name.split(" ")[0],
      success: logs.filter(
        (l) => l.user_name === u.name && l.status === "success",
      ).length,
      spoof: logs.filter((l) => l.user_name === u.name && l.status === "spoof")
        .length,
      failed: logs.filter(
        (l) => l.user_name === u.name && l.status === "failed",
      ).length,
    }));

  const spoofReasons = {};
  logs
    .filter((l) => l.status === "spoof")
    .forEach((l) => {
      const r = l.reason || "Unknown";
      spoofReasons[r] = (spoofReasons[r] || 0) + 1;
    });
  const spoofData = Object.entries(spoofReasons).map(([name, value]) => ({
    name,
    value,
  }));

  const userLogs = selectedUser
    ? logs.filter((l) => l.user_name === selectedUser.name)
    : [];
  const userPieData = selectedUser
    ? [
        {
          name: "Success",
          value: userLogs.filter((l) => l.status === "success").length,
          color: COLORS.success,
        },
        {
          name: "Spoof",
          value: userLogs.filter((l) => l.status === "spoof").length,
          color: COLORS.spoof,
        },
        {
          name: "Failed",
          value: userLogs.filter((l) => l.status === "failed").length,
          color: COLORS.failed,
        },
      ]
    : [];
  const userTimeline = [...userLogs]
    .slice(0, 15)
    .reverse()
    .map((l, i) => ({
      i: i + 1,
      face: l.face_match_score ? +l.face_match_score.toFixed(1) : 0,
      live: l.liveness_score ? +l.liveness_score.toFixed(1) : 0,
      skin: l.skin_score ? +l.skin_score.toFixed(1) : 0,
    }));

  const scoreClass = (v) =>
    !v ? "na" : v >= 80 ? "high" : v >= 60 ? "mid" : "low";

  const TABS = [
    { key: "dashboard", label: "Overview" },
    { key: "analytics", label: "Analytics" },
    { key: "users", label: "Users" },
    { key: "individual", label: "User Details" },
    { key: "logs", label: "Auth Logs" },
  ];

  const legendFormatter = (v) => (
    <span
      style={{
        color: "rgba(255,255,255,0.6)",
        fontFamily: "'Rajdhani',sans-serif",
        fontSize: "13px",
      }}
    >
      {v}
    </span>
  );

  // Non-admin users only (for Users tab + User Details tab)
  const nonAdminUsers = users.filter((u) => u.role !== "admin");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;800&family=Rajdhani:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .ap-root { min-height: 100vh; background: #05060f; padding: 32px 24px 80px; font-family: 'Rajdhani', sans-serif; position: relative; overflow-x: hidden; }
        .ap-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
        .ap-orb1 { position: absolute; top: -100px; left: -100px; width: 600px; height: 600px; border-radius: 50%; background: radial-gradient(circle, rgba(251,191,36,0.06) 0%, transparent 65%); }
        .ap-orb2 { position: absolute; bottom: -80px; right: -80px; width: 500px; height: 500px; border-radius: 50%; background: radial-gradient(circle, rgba(79,70,229,0.08) 0%, transparent 65%); }
        .ap-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(0,212,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.02) 1px, transparent 1px); background-size: 60px 60px; }
        .ap-content { position: relative; z-index: 1; max-width: 1300px; margin: 0 auto; }

        .ap-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; animation: apFadeUp 0.4s both; gap: 16px; flex-wrap: wrap; }
        @keyframes apFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .ap-title { font-family: 'Orbitron', monospace; font-size: 20px; font-weight: 700; letter-spacing: 0.04em; background: linear-gradient(90deg, #fff, #fbbf24); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; filter: drop-shadow(0 0 8px rgba(251,191,36,0.2)); display: flex; align-items: center; gap: 10px; }
        .ap-title-sub { font-size: 12px; font-family: 'DM Mono', monospace; color: rgba(251,191,36,0.4); letter-spacing: 0.08em; margin-top: 4px; }
        .ap-header-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .ap-countdown { font-family: 'DM Mono', monospace; font-size: 11px; color: rgba(0,212,255,0.5); letter-spacing: 0.06em; display: flex; align-items: center; gap: 6px; }
        .ap-countdown-dot { width: 6px; height: 6px; border-radius: 50%; background: #00d4ff; box-shadow: 0 0 6px rgba(0,212,255,0.8); animation: cdPulse 1s ease-in-out infinite; }
        @keyframes cdPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .ap-updated { font-family: 'DM Mono', monospace; font-size: 10px; color: rgba(255,255,255,0.2); }
        .ap-refresh { display: flex; align-items: center; gap: 8px; padding: 9px 20px; border-radius: 10px; background: rgba(0,212,255,0.06); border: 1px solid rgba(0,212,255,0.15); color: #00d4ff; cursor: pointer; font-family: 'Rajdhani', sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; transition: all 0.25s ease; white-space: nowrap; }
        .ap-refresh:hover { background: rgba(0,212,255,0.12); box-shadow: 0 0 16px rgba(0,212,255,0.2); }

        .ap-tabs { display: flex; gap: 4px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.05); padding: 5px; border-radius: 14px; margin-bottom: 28px; width: 100%; flex-wrap: wrap; animation: apFadeUp 0.4s 0.05s both; }
        .ap-tab { padding: 9px 20px; border-radius: 10px; font-family: 'Rajdhani', sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; cursor: pointer; border: none; transition: all 0.25s ease; flex: 1; white-space: nowrap; }
        .ap-tab.active { background: linear-gradient(135deg, rgba(251,191,36,0.15), rgba(79,70,229,0.15)); color: #fbbf24; border: 1px solid rgba(251,191,36,0.25); box-shadow: 0 0 16px rgba(251,191,36,0.12); text-shadow: 0 0 10px rgba(251,191,36,0.5); }
        .ap-tab.inactive { background: transparent; color: rgba(255,255,255,0.3); }
        .ap-tab.inactive:hover { color: rgba(255,255,255,0.6); }

        .ap-loading { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 60px; color: rgba(0,212,255,0.4); font-family: 'DM Mono', monospace; font-size: 12px; letter-spacing: 0.1em; }
        .ap-spinner { width: 20px; height: 20px; border: 2px solid rgba(0,212,255,0.1); border-top: 2px solid #00d4ff; border-radius: 50%; animation: apSpin 0.7s linear infinite; }
        @keyframes apSpin { to { transform: rotate(360deg); } }

        .ap-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; animation: apFadeUp 0.4s 0.1s both; margin-bottom: 24px; }
        .ap-stat { background: rgba(8,10,28,0.85); border: 1px solid rgba(255,255,255,0.06); border-radius: 18px; padding: 24px 20px; text-align: center; backdrop-filter: blur(20px); position: relative; overflow: hidden; transition: all 0.3s ease; cursor: default; }
        .ap-stat:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.4); }
        .ap-stat::before { content: ''; position: absolute; top: 0; left: 20%; right: 20%; height: 1px; opacity: 0; transition: opacity 0.3s; }
        .ap-stat:hover::before { opacity: 1; }
        .ap-stat.s-blue   { border-top: 2px solid rgba(0,212,255,0.4); }   .ap-stat.s-blue::before   { background: linear-gradient(90deg, transparent, rgba(0,212,255,0.4), transparent); }
        .ap-stat.s-purple { border-top: 2px solid rgba(124,58,237,0.4); }  .ap-stat.s-purple::before { background: linear-gradient(90deg, transparent, rgba(124,58,237,0.4), transparent); }
        .ap-stat.s-green  { border-top: 2px solid rgba(34,197,94,0.4); }   .ap-stat.s-green::before  { background: linear-gradient(90deg, transparent, rgba(34,197,94,0.4), transparent); }
        .ap-stat.s-red    { border-top: 2px solid rgba(239,68,68,0.4); }   .ap-stat.s-red::before    { background: linear-gradient(90deg, transparent, rgba(239,68,68,0.4), transparent); }
        .ap-stat.s-amber  { border-top: 2px solid rgba(251,191,36,0.4); }  .ap-stat.s-amber::before  { background: linear-gradient(90deg, transparent, rgba(251,191,36,0.4), transparent); }
        .ap-stat-icon { display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 12px; margin: 0 auto 12px; }
        .ap-stat.s-blue   .ap-stat-icon { background: rgba(0,212,255,0.1);   border: 1px solid rgba(0,212,255,0.2); }
        .ap-stat.s-purple .ap-stat-icon { background: rgba(124,58,237,0.1);  border: 1px solid rgba(124,58,237,0.2); }
        .ap-stat.s-green  .ap-stat-icon { background: rgba(34,197,94,0.1);   border: 1px solid rgba(34,197,94,0.2); }
        .ap-stat.s-red    .ap-stat-icon { background: rgba(239,68,68,0.1);   border: 1px solid rgba(239,68,68,0.2); }
        .ap-stat.s-amber  .ap-stat-icon { background: rgba(251,191,36,0.1);  border: 1px solid rgba(251,191,36,0.2); }
        .ap-stat-val { font-family: 'Orbitron', monospace; font-size: 30px; font-weight: 700; margin-bottom: 6px; line-height: 1; }
        .ap-stat.s-blue   .ap-stat-val { color: #00d4ff; text-shadow: 0 0 14px rgba(0,212,255,0.4); }
        .ap-stat.s-purple .ap-stat-val { color: #a78bfa; text-shadow: 0 0 14px rgba(167,139,250,0.4); }
        .ap-stat.s-green  .ap-stat-val { color: #4ade80; text-shadow: 0 0 14px rgba(74,222,128,0.4); }
        .ap-stat.s-red    .ap-stat-val { color: #f87171; text-shadow: 0 0 14px rgba(248,113,113,0.4); }
        .ap-stat.s-amber  .ap-stat-val { color: #fbbf24; text-shadow: 0 0 14px rgba(251,191,36,0.4); }
        .ap-stat-label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.28); letter-spacing: 0.08em; text-transform: uppercase; }

        .ap-chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        .ap-chart-full { margin-bottom: 24px; }
        .ap-chart-box { background: rgba(8,10,28,0.85); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; padding: 24px; backdrop-filter: blur(20px); position: relative; overflow: hidden; }
        .ap-chart-box::before { content: ''; position: absolute; top: 0; left: 20%; right: 20%; height: 1px; background: linear-gradient(90deg, transparent, rgba(0,212,255,0.3), transparent); }
        .ap-chart-title { font-family: 'Orbitron', monospace; font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.4); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
        .ap-chart-dot { width: 6px; height: 6px; border-radius: 50%; background: #00d4ff; box-shadow: 0 0 6px rgba(0,212,255,0.8); }

        .ap-table-wrap { background: rgba(8,10,28,0.85); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; overflow: hidden; backdrop-filter: blur(20px); box-shadow: 0 16px 48px rgba(0,0,0,0.5); animation: apFadeUp 0.4s 0.1s both; margin-bottom: 24px; }
        .ap-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .ap-table-head { padding: 16px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.3); flex-wrap: wrap; gap: 8px; }
        .ap-table-title { font-family: 'Orbitron', monospace; font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.35); letter-spacing: 0.1em; text-transform: uppercase; }
        .ap-table-count { font-family: 'DM Mono', monospace; font-size: 11px; color: rgba(0,212,255,0.4); letter-spacing: 0.08em; }
        table.ap-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 600px; }
        .ap-table thead tr { background: rgba(0,0,0,0.2); border-bottom: 1px solid rgba(255,255,255,0.05); }
        .ap-table th { padding: 12px 16px; text-align: left; font-size: 10.5px; font-weight: 700; color: rgba(255,255,255,0.25); letter-spacing: 0.1em; text-transform: uppercase; white-space: nowrap; }
        .ap-table tbody tr { border-bottom: 1px solid rgba(255,255,255,0.04); transition: background 0.15s; }
        .ap-table tbody tr:last-child { border-bottom: none; }
        .ap-table tbody tr:hover { background: rgba(0,212,255,0.02); }
        .ap-table td { padding: 12px 16px; color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 500; vertical-align: middle; }
        .ap-table td.mono { font-family: 'DM Mono', monospace; font-size: 12px; color: rgba(255,255,255,0.4); }

        .badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; white-space: nowrap; }
        .badge-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
        .badge.admin   { background: rgba(251,191,36,0.1); color: #fbbf24; border: 1px solid rgba(251,191,36,0.2); }
        .badge.user    { background: rgba(0,212,255,0.08); color: #00d4ff; border: 1px solid rgba(0,212,255,0.15); }
        .badge.active  { background: rgba(34,197,94,0.08); color: #4ade80; border: 1px solid rgba(34,197,94,0.2); }
        .badge.inactive{ background: rgba(239,68,68,0.08); color: #f87171; border: 1px solid rgba(239,68,68,0.18); }
        .badge.success { background: rgba(34,197,94,0.08); color: #4ade80; border: 1px solid rgba(34,197,94,0.2); }
        .badge.spoof   { background: rgba(251,191,36,0.08); color: #fbbf24; border: 1px solid rgba(251,191,36,0.2); }
        .badge.failed  { background: rgba(239,68,68,0.08); color: #f87171; border: 1px solid rgba(239,68,68,0.18); }
        .badge.admin .badge-dot   { background: #fbbf24; box-shadow: 0 0 4px rgba(251,191,36,0.6); }
        .badge.user .badge-dot    { background: #00d4ff; box-shadow: 0 0 4px rgba(0,212,255,0.6); }
        .badge.active .badge-dot  { background: #4ade80; box-shadow: 0 0 4px rgba(74,222,128,0.6); animation: badgePulse 2s ease-in-out infinite; }
        .badge.inactive .badge-dot{ background: #f87171; }
        .badge.success .badge-dot { background: #4ade80; box-shadow: 0 0 4px rgba(74,222,128,0.6); }
        .badge.spoof .badge-dot   { background: #fbbf24; }
        .badge.failed .badge-dot  { background: #f87171; }
        @keyframes badgePulse { 0%,100%{box-shadow:0 0 4px rgba(74,222,128,0.6)} 50%{box-shadow:0 0 8px rgba(74,222,128,1)} }

        .ap-face-yes { color: #4ade80; text-shadow: 0 0 8px rgba(74,222,128,0.4); font-weight: 700; display: inline-flex; align-items: center; gap: 4px; }
        .ap-face-no  { color: rgba(255,255,255,0.2); }
        .ap-action-btns { display: flex; gap: 6px; flex-wrap: wrap; }
        .ap-btn-toggle { display: inline-flex; align-items: center; gap: 5px; padding: 5px 14px; border-radius: 7px; font-family: 'Rajdhani', sans-serif; font-size: 11.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; cursor: pointer; transition: all 0.2s ease; border: 1px solid rgba(0,212,255,0.2); background: rgba(0,212,255,0.06); color: #00d4ff; white-space: nowrap; }
        .ap-btn-toggle:hover { background: rgba(0,212,255,0.12); box-shadow: 0 0 12px rgba(0,212,255,0.2); }
        .ap-btn-delete { display: inline-flex; align-items: center; gap: 5px; padding: 5px 14px; border-radius: 7px; font-family: 'Rajdhani', sans-serif; font-size: 11.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; cursor: pointer; transition: all 0.2s ease; border: 1px solid rgba(239,68,68,0.2); background: rgba(239,68,68,0.06); color: #f87171; white-space: nowrap; }
        .ap-btn-delete:hover { background: rgba(239,68,68,0.12); box-shadow: 0 0 12px rgba(239,68,68,0.2); }
        .ap-score { font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 500; }
        .ap-score.high { color: #4ade80; } .ap-score.mid { color: #fbbf24; } .ap-score.low { color: #f87171; } .ap-score.na { color: rgba(255,255,255,0.2); }

        .ap-user-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .ap-user-card { background: rgba(8,10,28,0.85); border: 1px solid rgba(255,255,255,0.06); border-radius: 18px; padding: 22px; backdrop-filter: blur(20px); cursor: pointer; transition: all 0.25s ease; }
        .ap-user-card:hover, .ap-user-card.sel { border-color: rgba(0,212,255,0.3); box-shadow: 0 0 24px rgba(0,212,255,0.1); transform: translateY(-2px); }
        .ap-user-card.sel { background: rgba(0,212,255,0.04); border-color: rgba(0,212,255,0.5); }
        .ap-user-avatar { width: 44px; height: 44px; border-radius: 12px; background: rgba(0,212,255,0.1); border: 1px solid rgba(0,212,255,0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
        .ap-user-name  { font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.85); margin-bottom: 3px; }
        .ap-user-email { font-family: 'DM Mono', monospace; font-size: 11px; color: rgba(255,255,255,0.3); margin-bottom: 14px; word-break: break-all; }
        .ap-user-mini  { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .ap-user-mini-stat { background: rgba(0,0,0,0.3); border-radius: 8px; padding: 8px; text-align: center; }
        .ap-user-mini-val { font-family: 'Orbitron', monospace; font-size: 15px; font-weight: 700; }
        .ap-user-mini-lbl { font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.25); letter-spacing: 0.08em; text-transform: uppercase; margin-top: 2px; }

        .ap-hint { text-align: center; padding: 40px; color: rgba(255,255,255,0.2); font-size: 14px; }
        .ap-section-lbl { font-family: 'Orbitron', monospace; font-size: 12px; font-weight: 700; color: rgba(0,212,255,0.5); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }

        .ap-live-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.9); animation: livePulse 1.5s ease-in-out infinite; flex-shrink: 0; }
        @keyframes livePulse { 0%,100%{box-shadow:0 0 6px rgba(34,197,94,0.8)} 50%{box-shadow:0 0 14px rgba(34,197,94,1)} }

        @media (max-width: 900px) {
          .ap-chart-grid { grid-template-columns: 1fr; }
          .ap-stats { grid-template-columns: repeat(3, 1fr); gap: 10px; }
        }

        @media (max-width: 640px) {
          .ap-root { padding: 16px 12px 60px; }
          .ap-header { margin-bottom: 16px; }
          .ap-title { font-size: 15px; gap: 8px; }
          .ap-title-sub { font-size: 10px; }
          .ap-header-right { gap: 8px; }
          .ap-countdown { font-size: 10px; }
          .ap-updated { display: none; }
          .ap-refresh { padding: 7px 14px; font-size: 11px; }
          .ap-tabs { gap: 3px; padding: 4px; border-radius: 12px; margin-bottom: 16px; }
          .ap-tab { padding: 8px 10px; font-size: 10px; letter-spacing: 0.04em; border-radius: 8px; }
          .ap-stats { grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
          .ap-stat { padding: 16px 10px; border-radius: 14px; }
          .ap-stat-icon { width: 36px; height: 36px; border-radius: 10px; margin-bottom: 8px; }
          .ap-stat-val { font-size: 22px; }
          .ap-stat-label { font-size: 9px; letter-spacing: 0.05em; }
          .ap-chart-grid { gap: 12px; margin-bottom: 16px; }
          .ap-chart-full { margin-bottom: 16px; }
          .ap-chart-box { padding: 16px; border-radius: 16px; }
          .ap-chart-title { font-size: 10px; margin-bottom: 14px; }
          .ap-table-wrap { border-radius: 16px; margin-bottom: 16px; }
          .ap-table-head { padding: 12px 16px; }
          .ap-table-title { font-size: 10px; }
          .ap-table th { padding: 10px 12px; font-size: 9.5px; }
          .ap-table td { padding: 10px 12px; font-size: 12px; }
          .ap-table td.mono { font-size: 11px; }
          .ap-user-cards { grid-template-columns: 1fr; gap: 12px; }
          .ap-user-card { padding: 16px; border-radius: 14px; }
          .ap-user-name { font-size: 14px; }
          .ap-user-email { font-size: 10px; }
          .ap-section-lbl { font-size: 10px; }
          .ap-hint { padding: 24px 16px; font-size: 13px; }
        }

        @media (max-width: 400px) {
          .ap-stats { grid-template-columns: repeat(3, 1fr); gap: 6px; }
          .ap-stat { padding: 12px 6px; }
          .ap-stat-val { font-size: 18px; }
          .ap-stat-label { font-size: 8px; }
          .ap-stat-icon { width: 30px; height: 30px; }
          .ap-tab { padding: 7px 6px; font-size: 9px; }
          .ap-title { font-size: 13px; }
        }
      `}</style>

      <div className="ap-root">
        <div className="ap-bg">
          <div className="ap-orb1" />
          <div className="ap-orb2" />
          <div className="ap-grid" />
        </div>

        <div className="ap-content">
          {/* Header */}
          <div className="ap-header">
            <div>
              <div className="ap-title">
                <Zap size={20} color="#fbbf24" />
                Admin Control Panel
              </div>
              <div className="ap-title-sub">
                SECURE FACE AUTH — REAL-TIME ANALYTICS
              </div>
            </div>
            <div className="ap-header-right">
              <div className="ap-countdown">
                <div className="ap-countdown-dot" />
                Refresh in {countdown}s
              </div>
              <div className="ap-updated">
                {lastUpdated.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                })}
              </div>
              <button className="ap-refresh" onClick={() => fetchAll()}>
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="ap-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`ap-tab ${activeTab === t.key ? "active" : "inactive"}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading && (
            <div className="ap-loading">
              <div className="ap-spinner" />
              Loading system data...
            </div>
          )}

          {/* OVERVIEW */}
          {!loading && activeTab === "dashboard" && stats && (
            <>
              <div className="ap-stats">
                <div className="ap-stat s-blue">
                  <div className="ap-stat-icon">
                    <Users size={20} color="#00d4ff" />
                  </div>
                  <div className="ap-stat-val">{stats.total_users}</div>
                  <div className="ap-stat-label">Total Users</div>
                </div>
                <div className="ap-stat s-purple">
                  <div className="ap-stat-icon">
                    <Lock size={20} color="#a78bfa" />
                  </div>
                  <div className="ap-stat-val">{stats.total_attempts}</div>
                  <div className="ap-stat-label">Total Attempts</div>
                </div>
                <div className="ap-stat s-green">
                  <div className="ap-stat-icon">
                    <Check size={20} color="#4ade80" />
                  </div>
                  <div className="ap-stat-val">{stats.successful_auths}</div>
                  <div className="ap-stat-label">Successful</div>
                </div>
                <div className="ap-stat s-red">
                  <div className="ap-stat-icon">
                    <X size={20} color="#f87171" />
                  </div>
                  <div className="ap-stat-val">{stats.failed_attempts}</div>
                  <div className="ap-stat-label">Failed</div>
                </div>
                <div className="ap-stat s-amber">
                  <div className="ap-stat-icon">
                    <AlertTriangle size={20} color="#fbbf24" />
                  </div>
                  <div className="ap-stat-val">{stats.spoof_attempts}</div>
                  <div className="ap-stat-label">Spoof Blocked</div>
                </div>
              </div>
              <div className="ap-chart-grid">
                <div className="ap-chart-box">
                  <div className="ap-chart-title">
                    <div className="ap-chart-dot" />
                    Auth Status Distribution
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((e, i) => (
                          <Cell key={i} fill={e.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend formatter={legendFormatter} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="ap-chart-box">
                  <div className="ap-chart-title">
                    <div className="ap-chart-dot" />
                    Attempts Per User
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={userAttempts}
                      margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.04)"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{
                          fill: "rgba(255,255,255,0.4)",
                          fontSize: 12,
                          fontFamily: "'Rajdhani',sans-serif",
                        }}
                      />
                      <YAxis
                        tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                      />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend formatter={legendFormatter} />
                      <Bar
                        dataKey="success"
                        name="Success"
                        fill={COLORS.success}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="spoof"
                        name="Spoof"
                        fill={COLORS.spoof}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="failed"
                        name="Failed"
                        fill={COLORS.failed}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="ap-chart-full">
                <div className="ap-chart-box">
                  <div className="ap-chart-title">
                    <div className="ap-chart-dot" />
                    Last 20 Auth — Score Trends
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart
                      data={timelineData}
                      margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="gFace" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="#00d4ff"
                            stopOpacity={0.2}
                          />
                          <stop
                            offset="95%"
                            stopColor="#00d4ff"
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient id="gLive" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="#4ade80"
                            stopOpacity={0.2}
                          />
                          <stop
                            offset="95%"
                            stopColor="#4ade80"
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient id="gSkin" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="#a78bfa"
                            stopOpacity={0.2}
                          />
                          <stop
                            offset="95%"
                            stopColor="#a78bfa"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.04)"
                      />
                      <XAxis
                        dataKey="i"
                        tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                      />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend formatter={legendFormatter} />
                      <Area
                        type="monotone"
                        dataKey="face"
                        name="Face Match"
                        stroke="#00d4ff"
                        fill="url(#gFace)"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="live"
                        name="Liveness"
                        stroke="#4ade80"
                        fill="url(#gLive)"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="skin"
                        name="Skin"
                        stroke="#a78bfa"
                        fill="url(#gSkin)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* ANALYTICS */}
          {!loading && activeTab === "analytics" && (
            <>
              <div className="ap-chart-grid">
                <div className="ap-chart-box">
                  <div className="ap-chart-title">
                    <div className="ap-chart-dot" />
                    Spoof Detection Breakdown
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={spoofData}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.04)"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={150}
                        tick={{
                          fill: "rgba(255,255,255,0.5)",
                          fontSize: 11,
                          fontFamily: "'Rajdhani',sans-serif",
                        }}
                      />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar
                        dataKey="value"
                        name="Count"
                        fill={COLORS.spoof}
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="ap-chart-box">
                  <div className="ap-chart-title">
                    <div className="ap-chart-dot" />
                    Overall Auth Outcome
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {pieData.map((e, i) => (
                          <Cell key={i} fill={e.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="ap-chart-full">
                <div className="ap-chart-box">
                  <div className="ap-chart-title">
                    <div className="ap-chart-dot" />
                    Score Comparison — Last 20 Attempts
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart
                      data={timelineData}
                      margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.04)"
                      />
                      <XAxis
                        dataKey="i"
                        tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                      />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend formatter={legendFormatter} />
                      <Line
                        type="monotone"
                        dataKey="face"
                        name="Face Match"
                        stroke="#00d4ff"
                        strokeWidth={2}
                        dot={{ fill: "#00d4ff", r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="live"
                        name="Liveness"
                        stroke="#4ade80"
                        strokeWidth={2}
                        dot={{ fill: "#4ade80", r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="skin"
                        name="Skin"
                        stroke="#a78bfa"
                        strokeWidth={2}
                        dot={{ fill: "#a78bfa", r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* USERS — admin hidden */}
          {!loading && activeTab === "users" && (
            <div className="ap-table-wrap">
              <div className="ap-table-head">
                <div className="ap-table-title">Registered Users</div>
                <div className="ap-table-count">
                  {nonAdminUsers.length} records
                </div>
              </div>
              <div className="ap-table-scroll">
                <table className="ap-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Face</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nonAdminUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="mono">#{user.id}</td>
                        <td
                          style={{
                            color: "rgba(255,255,255,0.85)",
                            fontWeight: 600,
                          }}
                        >
                          {user.name}
                        </td>
                        <td className="mono">{user.email}</td>
                        <td>
                          <span className={`badge ${user.role}`}>
                            <span className="badge-dot" />
                            {user.role}
                          </span>
                        </td>
                        <td>
                          {user.is_face_enrolled ? (
                            <span className="ap-face-yes">
                              <Check size={13} />
                              Enrolled
                            </span>
                          ) : (
                            <span className="ap-face-no">Not enrolled</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`badge ${user.is_active ? "active" : "inactive"}`}
                          >
                            <span className="badge-dot" />
                            {user.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          <div className="ap-action-btns">
                            <button
                              className="ap-btn-toggle"
                              onClick={() => handleToggle(user.id)}
                            >
                              {user.is_active ? "Disable" : "Enable"}
                            </button>
                            <button
                              className="ap-btn-delete"
                              onClick={() => handleDelete(user.id, user.name)}
                            >
                              <X size={11} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* INDIVIDUAL USER — admin hidden */}
          {!loading && activeTab === "individual" && (
            <>
              <div className="ap-section-lbl">
                <User size={14} />
                Select a User
              </div>
              <div className="ap-user-cards">
                {nonAdminUsers.map((u) => {
                  const uL = logs.filter((l) => l.user_name === u.name);
                  return (
                    <div
                      key={u.id}
                      className={`ap-user-card ${selectedUser?.id === u.id ? "sel" : ""}`}
                      onClick={() => setSelectedUser(u)}
                    >
                      <div className="ap-user-avatar">
                        <User size={20} color="#00d4ff" />
                      </div>
                      <div className="ap-user-name">{u.name}</div>
                      <div className="ap-user-email">{u.email}</div>
                      <div className="ap-user-mini">
                        <div className="ap-user-mini-stat">
                          <div
                            className="ap-user-mini-val"
                            style={{ color: "#4ade80" }}
                          >
                            {uL.filter((l) => l.status === "success").length}
                          </div>
                          <div className="ap-user-mini-lbl">Success</div>
                        </div>
                        <div className="ap-user-mini-stat">
                          <div
                            className="ap-user-mini-val"
                            style={{ color: "#fbbf24" }}
                          >
                            {uL.filter((l) => l.status === "spoof").length}
                          </div>
                          <div className="ap-user-mini-lbl">Spoof</div>
                        </div>
                        <div className="ap-user-mini-stat">
                          <div
                            className="ap-user-mini-val"
                            style={{ color: "#f87171" }}
                          >
                            {uL.filter((l) => l.status === "failed").length}
                          </div>
                          <div className="ap-user-mini-lbl">Failed</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {selectedUser ? (
                <>
                  <div className="ap-chart-grid">
                    <div className="ap-chart-box">
                      <div className="ap-chart-title">
                        <div className="ap-chart-dot" />
                        {selectedUser.name} — Auth Outcome
                      </div>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={userPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={85}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {userPieData.map((e, i) => (
                              <Cell
                                key={i}
                                fill={e.color}
                                stroke="transparent"
                              />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                          <Legend formatter={legendFormatter} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="ap-chart-box">
                      <div className="ap-chart-title">
                        <div className="ap-chart-dot" />
                        {selectedUser.name} — Score Timeline
                      </div>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart
                          data={userTimeline}
                          margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.04)"
                          />
                          <XAxis
                            dataKey="i"
                            tick={{
                              fill: "rgba(255,255,255,0.3)",
                              fontSize: 11,
                            }}
                          />
                          <YAxis
                            domain={[0, 100]}
                            tick={{
                              fill: "rgba(255,255,255,0.3)",
                              fontSize: 11,
                            }}
                          />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Legend formatter={legendFormatter} />
                          <Line
                            type="monotone"
                            dataKey="face"
                            name="Face"
                            stroke="#00d4ff"
                            strokeWidth={2}
                            dot={{ fill: "#00d4ff", r: 3 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="live"
                            name="Live"
                            stroke="#4ade80"
                            strokeWidth={2}
                            dot={{ fill: "#4ade80", r: 3 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="skin"
                            name="Skin"
                            stroke="#a78bfa"
                            strokeWidth={2}
                            dot={{ fill: "#a78bfa", r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="ap-table-wrap">
                    <div className="ap-table-head">
                      <div className="ap-table-title">
                        {selectedUser.name} — Full History
                      </div>
                      <div className="ap-table-count">
                        {userLogs.length} attempts
                      </div>
                    </div>
                    <div className="ap-table-scroll">
                      <table className="ap-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Status</th>
                            <th>Reason</th>
                            <th>Face %</th>
                            <th>Live %</th>
                            <th>Skin %</th>
                            <th>Timestamp (IST)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userLogs.slice(0, 25).map((l) => (
                            <tr key={l.id}>
                              <td className="mono">#{l.id}</td>
                              <td>
                                <span className={`badge ${l.status}`}>
                                  <span className="badge-dot" />
                                  {l.status}
                                </span>
                              </td>
                              <td
                                style={{
                                  color: "rgba(255,255,255,0.4)",
                                  fontSize: "12px",
                                }}
                              >
                                {l.reason || "—"}
                              </td>
                              <td>
                                <span
                                  className={`ap-score ${scoreClass(l.face_match_score)}`}
                                >
                                  {l.face_match_score
                                    ? l.face_match_score.toFixed(1) + "%"
                                    : "—"}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`ap-score ${scoreClass(l.liveness_score)}`}
                                >
                                  {l.liveness_score
                                    ? l.liveness_score.toFixed(1) + "%"
                                    : "—"}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`ap-score ${scoreClass(l.skin_score)}`}
                                >
                                  {l.skin_score
                                    ? l.skin_score.toFixed(1) + "%"
                                    : "—"}
                                </span>
                              </td>
                              <td
                                className="mono"
                                style={{
                                  fontSize: "11px",
                                  color: "rgba(255,255,255,0.25)",
                                }}
                              >
                                {formatIST(l.timestamp)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="ap-hint">
                  Click on a user card above to view their detailed analytics
                </div>
              )}
            </>
          )}

          {/* AUTH LOGS */}
          {!loading && activeTab === "logs" && (
            <div className="ap-table-wrap">
              <div className="ap-table-head">
                <div
                  className="ap-table-title"
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <div className="ap-live-dot" />
                  Real-Time Auth Feed
                </div>
                <div className="ap-table-count">{logs.length} events</div>
              </div>
              <div className="ap-table-scroll">
                <table className="ap-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>User</th>
                      <th>Status</th>
                      <th>Reason</th>
                      <th>Face %</th>
                      <th>Live %</th>
                      <th>Skin %</th>
                      <th>Timestamp (IST)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const fScore = log.face_match_score;
                      const lScore = log.liveness_score;
                      const sScore = log.skin_score;
                      return (
                        <tr key={log.id}>
                          <td className="mono">#{log.id}</td>
                          <td
                            style={{
                              color: "rgba(255,255,255,0.8)",
                              fontWeight: 600,
                            }}
                          >
                            {log.user_name}
                          </td>
                          <td>
                            <span className={`badge ${log.status}`}>
                              <span className="badge-dot" />
                              {log.status}
                            </span>
                          </td>
                          <td
                            style={{
                              color: "rgba(255,255,255,0.4)",
                              fontSize: "12px",
                              maxWidth: "160px",
                            }}
                          >
                            {log.reason || "—"}
                          </td>
                          <td>
                            <span className={`ap-score ${scoreClass(fScore)}`}>
                              {fScore ? fScore.toFixed(1) + "%" : "—"}
                            </span>
                          </td>
                          <td>
                            <span className={`ap-score ${scoreClass(lScore)}`}>
                              {lScore ? lScore.toFixed(1) + "%" : "—"}
                            </span>
                          </td>
                          <td>
                            <span className={`ap-score ${scoreClass(sScore)}`}>
                              {sScore ? sScore.toFixed(1) + "%" : "—"}
                            </span>
                          </td>
                          <td
                            className="mono"
                            style={{
                              fontSize: "11px",
                              color: "rgba(255,255,255,0.25)",
                            }}
                          >
                            {formatIST(log.timestamp)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default AdminPage;
