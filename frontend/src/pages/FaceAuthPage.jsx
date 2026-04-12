import { useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CameraFeed from "../components/CameraFeed";
import {
  enrollFace,
  enrollVoice,
  stepBlink,
  stepChallenge,
  stepVoice,
  stepFinal,
} from "../utils/api";
import axios from "axios";
import {
  ScanFace,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  PartyPopper,
  LayoutDashboard,
  RefreshCw,
  Smile,
  Mic,
  MicOff,
  Volume2,
  AlertTriangle,
} from "lucide-react";

const ANGLES = [
  {
    key: "front",
    label: "Face Forward",
    Icon: ScanFace,
    instruction: "Look straight at the camera",
  },
  {
    key: "left",
    label: "Turn Left",
    Icon: ArrowLeft,
    instruction: "Slowly turn your face to the left",
  },
  {
    key: "right",
    label: "Turn Right",
    Icon: ArrowRight,
    instruction: "Slowly turn your face to the right",
  },
  {
    key: "up",
    label: "Look Up",
    Icon: ArrowUp,
    instruction: "Tilt your face slightly upward",
  },
  {
    key: "down",
    label: "Look Down",
    Icon: ArrowDown,
    instruction: "Tilt your face slightly downward",
  },
];

const VOICE_PHRASE = "My voice is my password, verify me now";
const VOICE_SAMPLES_NEEDED = 3;
const VOICE_RECORD_MS = 5000; // ✅ 5 seconds recording
const VOICE_COUNTDOWN_START = 5; // ✅ Countdown: 5,4,3,2,1

// Step definitions — shown in order
const ALL_STEPS = [
  { key: "face_match", label: "Face Match" },
  { key: "liveness", label: "Liveness" },
  { key: "challenge", label: "Challenge" },
  { key: "voice_match", label: "Voice Match" },
  { key: "skin_check", label: "Skin Analysis" },
];

function FaceAuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const urlMode = searchParams.get("mode") || "auth";
  const showToggle = !searchParams.get("mode");

  // ── Auth state ─────────────────────────────────────
  const [email, setEmail] = useState(storedUser.email || "");
  const [mode, setMode] = useState(urlMode);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("");

  // Phase: "blink" | "challenge" | "voice" | "final" | "done" | "failed"
  const [phase, setPhase] = useState("blink");
  const [failedStep, setFailedStep] = useState(null);
  const [passedSteps, setPassedSteps] = useState([]);

  // Scores collected across steps
  const [scores, setScores] = useState({
    face_score: 0,
    liveness_score: 0,
    voice_score: 0,
  });

  // Blink step data
  const [blinkImage, setBlinkImage] = useState(null);
  const [blinkFrames, setBlinkFrames] = useState([]);
  const [isVoiceEnrolled, setIsVoiceEnrolled] = useState(
    storedUser.is_voice_enrolled || false,
  );

  // Challenge step data
  const [challengeKey, setChallengeKey] = useState("");
  const [challengeLabel, setChallengeLabel] = useState("");
  const [challengeFrames, setChallengeFrames] = useState([]);

  // Voice auth step
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceCountdown, setVoiceCountdown] = useState(0);
  const [voiceReady, setVoiceReady] = useState(false);
  const [voiceData, setVoiceData] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Auth done
  const [authDone, setAuthDone] = useState(false);
  const [authResult, setAuthResult] = useState(null);

  // ── Enroll state ───────────────────────────────────
  const [enrollStep, setEnrollStep] = useState(0);
  const [enrolledAngles, setEnrolledAngles] = useState([]);
  const [enrollComplete, setEnrollComplete] = useState(false);
  const [voiceSamples, setVoiceSamples] = useState([]);
  const [voiceEnrollRecording, setVoiceEnrollRecording] = useState(false);
  const [voiceEnrollCountdown, setVoiceEnrollCountdown] = useState(0);
  const [voiceEnrolled, setVoiceEnrolled] = useState(
    storedUser.is_voice_enrolled || false,
  );
  const enrollMediaRef = useRef(null);
  const enrollChunksRef = useRef([]);

  const showStatus = (msg, type) => {
    setStatus(msg);
    setStatusType(type);
  };

  const markPassed = (stepKey) => setPassedSteps((prev) => [...prev, stepKey]);

  // ── RESET ──────────────────────────────────────────
  const resetAuth = () => {
    setPhase("blink");
    setFailedStep(null);
    setPassedSteps([]);
    setScores({ face_score: 0, liveness_score: 0, voice_score: 0 });
    setBlinkImage(null);
    setBlinkFrames([]);
    setChallengeKey("");
    setChallengeLabel("");
    setChallengeFrames([]);
    setVoiceData(null);
    setVoiceReady(false);
    setVoiceRecording(false);
    setVoiceCountdown(0);
    setAuthDone(false);
    setAuthResult(null);
    setStatus("");
  };

  // ══════════════════════════════════════════════════
  // STEP 1: Blink captured → call /step/blink
  // ══════════════════════════════════════════════════
  const handleBlinkCapture = async (imageSrc, frames = []) => {
    if (!email) {
      showStatus("Please enter your email address.", "error");
      return;
    }
    setBlinkImage(imageSrc);
    setBlinkFrames(frames);
    setLoading(true);
    showStatus("Verifying face & liveness...", "info");
    try {
      const res = await stepBlink({ email, image: imageSrc, frames });
      const data = res.data;

      const newScores = {
        face_score: data.face_score,
        liveness_score: data.liveness_score,
        voice_score: 0,
      };
      setPassedSteps(["face_match", "liveness"]);
      setScores(newScores);
      setIsVoiceEnrolled(data.is_voice_enrolled);

      try {
        const token = localStorage.getItem("token");
        const cRes = await axios.get(
          "http://localhost:5000/api/auth/get-challenge",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setChallengeKey(cRes.data.challenge_key);
        setChallengeLabel(cRes.data.challenge_label);
      } catch {
        setChallengeKey("look_left");
        setChallengeLabel("👈 Look Left!");
      }
      setPhase("challenge");
      showStatus(
        `✅ Face verified (${data.face_score}%) — Now: ${challengeLabel || "Perform challenge"}`,
        "success",
      );
    } catch (err) {
      const msg = err.response?.data?.message || "Verification failed";
      const stepKey = err.response?.data?.step || "face_match";
      setFailedStep(stepKey);
      setPhase("failed");
      showStatus(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  // ══════════════════════════════════════════════════
  // STEP 2: Challenge captured → call /step/challenge
  // ══════════════════════════════════════════════════
  const handleChallengeCapture = async (imageSrc, frames = []) => {
    setChallengeFrames(frames);
    setLoading(true);
    showStatus("Verifying challenge...", "info");
    try {
      const res = await stepChallenge({
        email,
        challenge_key: challengeKey,
        challenge_frames: frames,
      });

      markPassed("challenge");

      if (isVoiceEnrolled) {
        setPhase("voice");
        showStatus(
          `✅ Challenge passed — Now say "${VOICE_PHRASE}"`,
          "success",
        );
      } else {
        await runFinalStep(imageSrc, scores);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Challenge failed";
      const stepKey = err.response?.data?.step || "challenge";
      setFailedStep(stepKey);
      setPhase("failed");
      showStatus(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  // ══════════════════════════════════════════════════
  // STEP 3: Voice recording — 8 seconds
  // ══════════════════════════════════════════════════
  const recordVoice = async () => {
    if (voiceRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const ab = await blob.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(ab)));
        setVoiceData(b64);
        setVoiceReady(true);
        setVoiceRecording(false);
        setVoiceCountdown(0);
        showStatus("Voice recorded — click Submit to authenticate", "success");
      };

      setVoiceRecording(true);
      showStatus(`Say "${VOICE_PHRASE}" clearly...`, "info");

      // ✅ Recording starts WITH countdown — no extra wait after
      mr.start();
      for (let i = VOICE_COUNTDOWN_START; i >= 1; i--) {
        setVoiceCountdown(i);
        await new Promise((r) => setTimeout(r, 800));
      }
      setVoiceCountdown(0);
      mr.stop();
    } catch {
      setVoiceRecording(false);
      setVoiceCountdown(0);
      showStatus("Microphone access denied", "error");
    }
  };

  const submitVoice = async () => {
    setLoading(true);
    showStatus("Verifying voice...", "info");
    try {
      const res = await stepVoice({ email, voice: voiceData });
      const vScore = res.data.score || 0;
      markPassed("voice_match");
      const updatedScores = { ...scores, voice_score: vScore };
      setScores(updatedScores);
      showStatus(`✅ Voice verified (${vScore}%) — Final check...`, "success");
      await runFinalStep(blinkImage, updatedScores);
    } catch (err) {
      const msg = err.response?.data?.message || "Voice not recognized";
      setFailedStep("voice_match");
      setPhase("failed");
      showStatus(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  // ══════════════════════════════════════════════════
  // STEP 4: Final — Skin check + grant token
  // ══════════════════════════════════════════════════
  const runFinalStep = async (imageForSkin, currentScores) => {
    const s = currentScores || scores;
    setLoading(true);
    showStatus("Running skin analysis...", "info");
    try {
      const res = await stepFinal({
        email,
        image: imageForSkin || blinkImage,
        face_score: s.face_score,
        liveness_score: s.liveness_score,
        voice_score: s.voice_score,
      });
      const data = res.data;
      markPassed("skin_check");
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setAuthResult(data.scores);
      setAuthDone(true);
      setPhase("done");
      showStatus(`🎉 Access Granted — Welcome, ${data.user.name}!`, "success");
    } catch (err) {
      const msg = err.response?.data?.message || "Skin check failed";
      setFailedStep("skin_check");
      setPhase("failed");
      showStatus(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Step indicator logic ───────────────────────────
  const visibleSteps = ALL_STEPS.filter((s) => {
    if (s.key === "voice_match" && !isVoiceEnrolled) return false;
    return true;
  });

  const getStepClass = (stepKey) => {
    if (failedStep === stepKey) return "fail";
    if (passedSteps.includes(stepKey)) return "done";
    return "inactive";
  };

  const showStepBar = passedSteps.length > 0 || failedStep !== null;

  // ── ENROLL FACE ────────────────────────────────────
  const handleEnroll = async (imageSrc) => {
    const currentAngle = ANGLES[enrollStep];
    setLoading(true);
    showStatus(`Capturing ${currentAngle.label}...`, "info");
    try {
      const res = await enrollFace({
        image: imageSrc,
        angle: currentAngle.key,
      });
      setEnrolledAngles(res.data.enrolled_angles || []);
      if (res.data.is_complete || enrollStep >= ANGLES.length - 1) {
        setEnrollComplete(true);
        showStatus("All angles enrolled!", "success");
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        u.is_face_enrolled = true;
        localStorage.setItem("user", JSON.stringify(u));
      } else {
        const next = enrollStep + 1;
        setEnrollStep(next);
        showStatus(
          `${currentAngle.label} captured! Next: ${ANGLES[next].label}`,
          "success",
        );
        setTimeout(() => showStatus(ANGLES[next].instruction, "info"), 1500);
      }
    } catch (err) {
      showStatus(err.response?.data?.message || "Capture failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const resetEnroll = () => {
    setEnrollStep(0);
    setEnrolledAngles([]);
    setEnrollComplete(false);
    setStatus("");
  };

  // ── ENROLL VOICE — 8 seconds ───────────────────────
  const recordVoiceSample = async () => {
    if (voiceEnrollRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      enrollChunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      enrollMediaRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) enrollChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(enrollChunksRef.current, { type: "audio/webm" });
        const ab = await blob.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(ab)));
        setVoiceSamples((prev) => {
          const updated = [...prev, b64];
          if (updated.length >= VOICE_SAMPLES_NEEDED)
            submitVoiceEnrollment(updated);
          else
            showStatus(
              `Sample ${updated.length}/${VOICE_SAMPLES_NEEDED} recorded!`,
              "success",
            );
          return updated;
        });
        setVoiceEnrollRecording(false);
        setVoiceEnrollCountdown(0);
      };

      setVoiceEnrollRecording(true);
      showStatus(
        `Recording sample ${voiceSamples.length + 1}/${VOICE_SAMPLES_NEEDED} — Say "${VOICE_PHRASE}"`,
        "info",
      );

      // ✅ Recording starts WITH countdown — no extra wait after
      mr.start();
      for (let i = VOICE_COUNTDOWN_START; i >= 1; i--) {
        setVoiceEnrollCountdown(i);
        await new Promise((r) => setTimeout(r, 800));
      }
      setVoiceEnrollCountdown(0);
      mr.stop();
    } catch {
      setVoiceEnrollRecording(false);
      setVoiceEnrollCountdown(0);
      showStatus("Microphone access denied", "error");
    }
  };

  const submitVoiceEnrollment = async (samples) => {
    setLoading(true);
    showStatus("Enrolling voice profile...", "info");
    try {
      const res = await enrollVoice({ audio_samples: samples });
      setVoiceEnrolled(true);
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      u.is_voice_enrolled = true;
      localStorage.setItem("user", JSON.stringify(u));
      showStatus(
        `Voice enrolled! ${res.data.samples_used} samples used.`,
        "success",
      );
    } catch (err) {
      showStatus(
        err.response?.data?.message || "Voice enrollment failed",
        "error",
      );
      setVoiceSamples([]);
    } finally {
      setLoading(false);
    }
  };

  const resetVoiceEnroll = () => {
    setVoiceSamples([]);
    setVoiceEnrolled(false);
    setStatus("");
  };

  const goToDashboard = () => {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    navigate(u.role === "admin" ? "/admin" : "/dashboard");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;800&family=Rajdhani:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        .fap-root{min-height:100vh;background:#05060f;display:flex;align-items:flex-start;justify-content:center;padding:32px 20px 60px;position:relative;overflow-x:hidden;font-family:'Rajdhani',sans-serif}
        .fap-bg{position:fixed;inset:0;pointer-events:none;z-index:0}
        .fap-orb1{position:absolute;top:-120px;left:-120px;width:550px;height:550px;border-radius:50%;background:radial-gradient(circle,rgba(0,212,255,.09) 0%,transparent 65%)}
        .fap-orb2{position:absolute;bottom:-80px;right:-80px;width:480px;height:480px;border-radius:50%;background:radial-gradient(circle,rgba(124,58,237,.1) 0%,transparent 65%)}
        .fap-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(0,212,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,.025) 1px,transparent 1px);background-size:60px 60px}
        .fap-card{position:relative;z-index:1;width:100%;max-width:620px;background:rgba(8,10,28,.88);border:1px solid rgba(0,212,255,.12);border-radius:24px;padding:36px;backdrop-filter:blur(32px);box-shadow:0 0 0 1px rgba(0,212,255,.04),0 24px 80px rgba(0,0,0,.7);animation:fapIn .5s cubic-bezier(.16,1,.3,1) both}
        @keyframes fapIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .fap-card::before{content:'';position:absolute;top:0;left:20%;right:20%;height:1px;background:linear-gradient(90deg,transparent,rgba(0,212,255,.5),transparent)}
        .fap-title{font-family:'Orbitron',monospace;font-size:18px;font-weight:700;letter-spacing:.04em;background:linear-gradient(90deg,#fff,#00d4ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;text-align:center;margin-bottom:24px}
        .fap-toggle{display:flex;gap:6px;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.06);padding:5px;border-radius:12px;margin-bottom:24px}
        .fap-toggle-btn{flex:1;padding:10px;border:none;border-radius:8px;font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:all .25s ease}
        .fap-toggle-btn.active{background:linear-gradient(135deg,rgba(0,212,255,.2),rgba(79,70,229,.2));color:#00d4ff;border:1px solid rgba(0,212,255,.3);box-shadow:0 0 16px rgba(0,212,255,.15)}
        .fap-toggle-btn.inactive{background:transparent;color:rgba(255,255,255,.3)}
        .fap-toggle-btn.inactive:hover{color:rgba(255,255,255,.6)}
        .fap-label{display:block;font-size:11px;font-weight:700;color:rgba(0,212,255,.55);letter-spacing:.1em;text-transform:uppercase;margin-bottom:7px}
        .fap-input{width:100%;padding:12px 16px;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.07);border-radius:10px;font-family:'Rajdhani',sans-serif;font-size:15px;font-weight:500;color:#fff;outline:none;box-sizing:border-box;transition:all .25s ease;margin-bottom:20px}
        .fap-input::placeholder{color:rgba(255,255,255,.2)}
        .fap-input:focus{border-color:rgba(0,212,255,.4);background:rgba(0,212,255,.03)}
        .fap-steps{display:flex;gap:5px;margin-bottom:18px;flex-wrap:wrap}
        .fap-step{flex:1;min-width:60px;padding:8px 4px;border-radius:8px;font-size:10px;font-weight:700;text-align:center;letter-spacing:.03em;text-transform:uppercase;transition:all .3s ease;display:flex;align-items:center;justify-content:center;gap:4px;white-space:nowrap}
        .fap-step.done{background:rgba(34,197,94,.12);color:#4ade80;border:1px solid rgba(34,197,94,.25)}
        .fap-step.fail{background:rgba(239,68,68,.12);color:#f87171;border:1px solid rgba(239,68,68,.25);animation:failShake .4s ease}
        .fap-step.inactive{background:rgba(255,255,255,.03);color:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.05)}
        @keyframes failShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
        .fap-spoof-box{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);border-radius:16px;padding:20px 20px;margin-bottom:18px;text-align:center;position:relative;overflow:hidden;animation:fapIn .3s ease}
        .fap-spoof-box::before{content:'';position:absolute;top:0;left:20%;right:20%;height:1px;background:linear-gradient(90deg,transparent,rgba(239,68,68,.5),transparent)}
        .fap-spoof-icon{display:flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:16px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);margin:0 auto 12px}
        .fap-spoof-title{font-family:'Orbitron',monospace;font-size:15px;font-weight:700;color:#f87171;margin-bottom:6px}
        .fap-spoof-sub{font-size:12px;color:rgba(255,255,255,.35);font-family:'DM Mono',monospace}
        .fap-phase-indicator{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:16px;flex-wrap:wrap}
        .fap-phase-dot{width:8px;height:8px;border-radius:50%;transition:all .3s ease}
        .fap-phase-dot.active{background:#00d4ff;box-shadow:0 0 8px rgba(0,212,255,.8)}
        .fap-phase-dot.done{background:#4ade80;box-shadow:0 0 8px rgba(74,222,128,.6)}
        .fap-phase-dot.pending{background:rgba(255,255,255,.15)}
        .fap-phase-label{font-family:'DM Mono',monospace;font-size:10px;color:rgba(255,255,255,.3);letter-spacing:.08em;text-transform:uppercase}
        .fap-challenge-box{text-align:center;background:rgba(167,139,250,.06);border:1px solid rgba(167,139,250,.25);border-radius:16px;padding:22px 20px;margin-bottom:18px;position:relative;overflow:hidden}
        .fap-challenge-box::before{content:'';position:absolute;top:0;left:20%;right:20%;height:1px;background:linear-gradient(90deg,transparent,rgba(167,139,250,.6),transparent)}
        .fap-challenge-icon{display:flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:16px;background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.25);margin:0 auto 12px;animation:challengePulse 1.5s ease-in-out infinite}
        @keyframes challengePulse{0%,100%{box-shadow:0 0 20px rgba(167,139,250,.2)}50%{box-shadow:0 0 36px rgba(167,139,250,.5)}}
        .fap-challenge-label{font-family:'Orbitron',monospace;font-size:20px;font-weight:700;color:#a78bfa;text-shadow:0 0 16px rgba(167,139,250,.6);margin-bottom:6px}
        .fap-challenge-sub{font-size:12px;color:rgba(255,255,255,.3);font-family:'DM Mono',monospace}
        .fap-results{background:rgba(0,0,0,.3);border:1px solid rgba(0,212,255,.1);border-radius:14px;padding:18px 20px;margin-bottom:18px}
        .fap-result-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05)}
        .fap-result-row:last-child{border-bottom:none}
        .fap-result-label{color:rgba(255,255,255,.45);font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase}
        .fap-result-score{font-family:'DM Mono',monospace;font-size:15px;font-weight:500;color:#4ade80}
        .fap-proceed-btn{width:100%;padding:14px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;border-radius:10px;font-family:'Orbitron',monospace;font-size:13px;font-weight:700;letter-spacing:.06em;cursor:pointer;margin-bottom:14px;transition:all .25s ease;box-shadow:0 0 24px rgba(34,197,94,.3);display:flex;align-items:center;justify-content:center;gap:8px}
        .fap-proceed-btn:hover{transform:translateY(-2px)}
        .fap-retry-btn{width:100%;padding:12px;background:rgba(0,212,255,.05);color:#00d4ff;border:1px solid rgba(0,212,255,.2);border-radius:10px;font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;margin-top:10px;transition:all .25s ease;display:flex;align-items:center;justify-content:center;gap:8px}
        .fap-retry-btn:hover{background:rgba(0,212,255,.1)}
        .fap-status{padding:12px 16px;border-radius:10px;margin-bottom:16px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px}
        .fap-status.success{background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);color:#4ade80}
        .fap-status.error{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);color:#f87171}
        .fap-status.info{background:rgba(0,212,255,.06);border:1px solid rgba(0,212,255,.15);color:#00d4ff}
        .fap-status-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
        .fap-status.success .fap-status-dot{background:#4ade80}
        .fap-status.error .fap-status-dot{background:#f87171}
        .fap-status.info .fap-status-dot{background:#00d4ff;animation:infoBlink 1s step-end infinite}
        @keyframes infoBlink{0%,100%{opacity:1}50%{opacity:.3}}
        .fap-angle-row{display:flex;gap:6px;justify-content:center;margin-bottom:20px;flex-wrap:wrap}
        .fap-angle-dot{display:flex;flex-direction:column;align-items:center;gap:5px;padding:10px 8px;border-radius:12px;min-width:60px;border:1px solid transparent;transition:all .3s ease}
        .fap-angle-dot.done{background:rgba(34,197,94,.1);border-color:rgba(34,197,94,.3)}
        .fap-angle-dot.current{background:rgba(0,212,255,.1);border-color:rgba(0,212,255,.35);animation:dotPulse 2s ease-in-out infinite}
        .fap-angle-dot.pending{background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.07)}
        @keyframes dotPulse{0%,100%{box-shadow:0 0 14px rgba(0,212,255,.2)}50%{box-shadow:0 0 24px rgba(0,212,255,.4)}}
        .fap-angle-label{font-size:9.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;text-align:center}
        .fap-angle-dot.done .fap-angle-label{color:#4ade80}
        .fap-angle-dot.current .fap-angle-label{color:#00d4ff}
        .fap-angle-dot.pending .fap-angle-label{color:rgba(255,255,255,.25)}
        .fap-instruction{text-align:center;background:rgba(0,212,255,.05);border:1px solid rgba(0,212,255,.12);border-radius:14px;padding:20px;margin-bottom:18px}
        .fap-instr-icon{display:flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:16px;background:rgba(0,212,255,.1);border:1px solid rgba(0,212,255,.2);margin:0 auto 12px}
        .fap-instr-text{font-size:15px;font-weight:600;color:rgba(255,255,255,.7);margin-bottom:6px;line-height:1.5}
        .fap-instr-step{font-family:'DM Mono',monospace;font-size:11px;color:rgba(0,212,255,.45);letter-spacing:.08em}
        .fap-complete{text-align:center;background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.2);border-radius:16px;padding:28px 24px;margin-bottom:18px;position:relative;overflow:hidden}
        .fap-complete::before{content:'';position:absolute;top:0;left:20%;right:20%;height:1px;background:linear-gradient(90deg,transparent,rgba(34,197,94,.5),transparent)}
        .fap-complete-icon{display:flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:20px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.25);margin:0 auto 16px}
        .fap-complete-title{font-family:'Orbitron',monospace;font-size:16px;font-weight:700;color:#4ade80;margin-bottom:6px}
        .fap-complete-sub{font-size:13px;color:rgba(255,255,255,.35);margin-bottom:18px}
        .fap-re-enroll{display:inline-flex;align-items:center;gap:6px;padding:9px 24px;background:rgba(0,0,0,.3);color:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.1);border-radius:8px;font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;transition:all .2s ease}
        .fap-re-enroll:hover{background:rgba(255,255,255,.06);color:rgba(255,255,255,.7)}
        .fap-loading{display:flex;flex-direction:column;align-items:center;gap:14px;padding:40px 20px}
        .fap-spinner{width:40px;height:40px;border:3px solid rgba(0,212,255,.1);border-top:3px solid #00d4ff;border-radius:50%;animation:fapSpin .8s linear infinite}
        @keyframes fapSpin{to{transform:rotate(360deg)}}
        .fap-loading-text{font-family:'DM Mono',monospace;font-size:12px;color:rgba(0,212,255,.5);letter-spacing:.1em;text-transform:uppercase}
        .voice-box{background:rgba(16,185,129,.05);border:1px solid rgba(16,185,129,.2);border-radius:20px;padding:28px 24px;margin-bottom:18px;text-align:center;position:relative;overflow:hidden}
        .voice-box::before{content:'';position:absolute;top:0;left:20%;right:20%;height:1px;background:linear-gradient(90deg,transparent,rgba(16,185,129,.5),transparent)}
        .voice-phrase-label{font-family:'DM Mono',monospace;font-size:10px;color:rgba(255,255,255,.3);letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px}
        .voice-phrase{font-family:'Orbitron',monospace;font-size:16px;font-weight:700;color:#34d399;text-shadow:0 0 20px rgba(52,211,153,.5);margin-bottom:20px;letter-spacing:.04em}
        .voice-samples-row{display:flex;justify-content:center;gap:10px;margin-bottom:24px}
        .voice-sample-dot{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-family:'Orbitron',monospace;font-size:16px;font-weight:700;transition:all .3s ease}
        .voice-sample-dot.done{background:rgba(52,211,153,.15);border:1px solid rgba(52,211,153,.4);color:#34d399}
        .voice-sample-dot.current{background:rgba(0,212,255,.1);border:1px solid rgba(0,212,255,.4);color:#00d4ff;animation:dotPulse 1.5s ease-in-out infinite}
        .voice-sample-dot.pending{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.2)}
        .voice-mic-btn{display:flex;align-items:center;justify-content:center;gap:10px;padding:16px 40px;border:none;border-radius:14px;font-family:'Rajdhani',sans-serif;font-size:15px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;transition:all .25s ease}
        .voice-mic-btn.idle{background:linear-gradient(135deg,rgba(16,185,129,.2),rgba(5,150,105,.2));color:#34d399;border:1px solid rgba(16,185,129,.35)}
        .voice-mic-btn.idle:hover{background:linear-gradient(135deg,rgba(16,185,129,.3),rgba(5,150,105,.3));transform:translateY(-1px)}
        .voice-mic-btn.recording{background:rgba(239,68,68,.15);color:#f87171;border:1px solid rgba(239,68,68,.3);animation:recPulse 1s ease-in-out infinite}
        .voice-mic-btn:disabled{opacity:.4;cursor:not-allowed;transform:none!important}
        @keyframes recPulse{0%,100%{box-shadow:0 0 20px rgba(239,68,68,.2)}50%{box-shadow:0 0 36px rgba(239,68,68,.5)}}
        .voice-countdown{font-family:'Orbitron',monospace;font-size:48px;font-weight:800;color:#00d4ff;text-shadow:0 0 30px rgba(0,212,255,.8);margin:16px 0;animation:cfCountPulse .8s ease-in-out}
        @keyframes cfCountPulse{0%{transform:scale(1.3);opacity:.5}100%{transform:scale(1);opacity:1}}
        .voice-hint{font-family:'DM Mono',monospace;font-size:11px;color:rgba(255,255,255,.25);margin-top:12px;letter-spacing:.06em}
        .voice-submit-btn{width:100%;padding:14px;background:linear-gradient(135deg,#00d4ff,#4f46e5);color:#fff;border:none;border-radius:10px;font-family:'Orbitron',monospace;font-size:13px;font-weight:700;letter-spacing:.06em;cursor:pointer;margin-top:12px;transition:all .25s ease;display:flex;align-items:center;justify-content:center;gap:8px}
        .voice-submit-btn:hover{transform:translateY(-2px);box-shadow:0 0 24px rgba(0,212,255,.3)}
        @media(max-width:480px){.fap-root{padding:14px 10px 40px}.fap-card{padding:22px 16px;border-radius:18px}.fap-title{font-size:14px;margin-bottom:16px}.fap-toggle-btn{padding:9px 6px;font-size:11px}.voice-phrase{font-size:14px}.voice-mic-btn{padding:14px 28px;font-size:13px}}
      `}</style>

      <div className="fap-root">
        <div className="fap-bg">
          <div className="fap-orb1" />
          <div className="fap-orb2" />
          <div className="fap-grid" />
        </div>

        <div className="fap-card">
          <h2 className="fap-title">
            {mode === "auth"
              ? "Face Authentication"
              : mode === "enroll"
                ? "Face Enrollment"
                : "Voice Enrollment"}
          </h2>

          {showToggle && (
            <div className="fap-toggle">
              <button
                className={`fap-toggle-btn ${mode === "auth" ? "active" : "inactive"}`}
                onClick={() => {
                  setMode("auth");
                  resetAuth();
                }}
              >
                Authenticate
              </button>
              <button
                className={`fap-toggle-btn ${mode === "enroll" ? "active" : "inactive"}`}
                onClick={() => {
                  setMode("enroll");
                  setStatus("");
                }}
              >
                Enroll Face
              </button>
              <button
                className={`fap-toggle-btn ${mode === "voice" ? "active" : "inactive"}`}
                onClick={() => {
                  setMode("voice");
                  setStatus("");
                }}
              >
                Enroll Voice
              </button>
            </div>
          )}

          {/* ══════════════ AUTH MODE ══════════════ */}
          {mode === "auth" && (
            <>
              <label className="fap-label">Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="fap-input"
              />

              {phase !== "done" && phase !== "failed" && (
                <div className="fap-phase-indicator">
                  <div
                    className={`fap-phase-dot ${phase === "blink" ? "active" : "done"}`}
                  />
                  <span className="fap-phase-label">
                    {phase === "blink" ? "Step 1: Blink" : "✓ Blink"}
                  </span>
                  <span
                    style={{
                      color: "rgba(255,255,255,0.15)",
                      fontSize: "10px",
                    }}
                  >
                    →
                  </span>
                  <div
                    className={`fap-phase-dot ${phase === "challenge" ? "active" : ["voice", "final", "done"].includes(phase) ? "done" : "pending"}`}
                  />
                  <span className="fap-phase-label">
                    {["voice", "final", "done"].includes(phase)
                      ? "✓ Challenge"
                      : "Step 2: Challenge"}
                  </span>
                  {isVoiceEnrolled && (
                    <>
                      <span
                        style={{
                          color: "rgba(255,255,255,0.15)",
                          fontSize: "10px",
                        }}
                      >
                        →
                      </span>
                      <div
                        className={`fap-phase-dot ${phase === "voice" ? "active" : "pending"}`}
                      />
                      <span className="fap-phase-label">Step 3: Voice</span>
                    </>
                  )}
                </div>
              )}

              {showStepBar && (
                <div className="fap-steps">
                  {visibleSteps.map((s) => (
                    <div
                      key={s.key}
                      className={`fap-step ${getStepClass(s.key)}`}
                    >
                      {getStepClass(s.key) === "done" ? (
                        <Check size={11} />
                      ) : getStepClass(s.key) === "fail" ? (
                        <X size={11} />
                      ) : (
                        <span>{visibleSteps.indexOf(s) + 1}</span>
                      )}
                      {s.label}
                    </div>
                  ))}
                </div>
              )}

              {phase === "failed" && failedStep && (
                <div className="fap-spoof-box">
                  <div className="fap-spoof-icon">
                    <AlertTriangle size={26} color="#f87171" />
                  </div>
                  <div className="fap-spoof-title">🚨 Spoof Alert</div>
                  <div className="fap-spoof-sub">{status}</div>
                </div>
              )}

              {phase === "challenge" && !loading && (
                <div className="fap-challenge-box">
                  <div className="fap-challenge-icon">
                    <Smile size={26} color="#a78bfa" />
                  </div>
                  <div className="fap-challenge-label">
                    {challengeLabel || "Perform Challenge!"}
                  </div>
                  <div className="fap-challenge-sub">
                    Perform this action in front of the camera
                  </div>
                </div>
              )}

              {/* ── VOICE STEP — 8 second countdown ── */}
              {phase === "voice" && !loading && (
                <div className="voice-box">
                  <p className="voice-phrase-label">Say this phrase clearly</p>
                  <div className="voice-phrase">"{VOICE_PHRASE}"</div>
                  {voiceCountdown > 0 && (
                    <div
                      style={{
                        fontFamily: "'Orbitron',monospace",
                        fontSize: "48px",
                        fontWeight: 800,
                        color: "#00d4ff",
                        textAlign: "center",
                        margin: "16px 0",
                      }}
                      key={voiceCountdown}
                    >
                      {voiceCountdown}
                    </div>
                  )}
                  {!voiceReady && (
                    <button
                      onClick={recordVoice}
                      disabled={voiceRecording}
                      className={`voice-mic-btn ${voiceRecording ? "recording" : "idle"}`}
                    >
                      {voiceRecording ? (
                        <>
                          <MicOff size={18} /> Recording...
                        </>
                      ) : (
                        <>
                          <Mic size={18} /> Record Voice
                        </>
                      )}
                    </button>
                  )}
                  {voiceReady && (
                    <>
                      <button
                        onClick={recordVoice}
                        className="voice-mic-btn idle"
                        style={{ marginBottom: "8px" }}
                      >
                        <Mic size={18} /> Re-record
                      </button>
                      <button
                        onClick={submitVoice}
                        className="voice-submit-btn"
                      >
                        <Check size={16} /> Submit & Authenticate
                      </button>
                    </>
                  )}
                  <p className="voice-hint">
                    {voiceRecording
                      ? "🎤 Speak clearly now..."
                      : voiceReady
                        ? "✅ Voice recorded — submit or re-record"
                        : "Press Record, then say the phrase"}
                  </p>
                </div>
              )}

              {phase === "done" && authResult && (
                <div className="fap-results">
                  <div className="fap-result-row">
                    <span className="fap-result-label">Face Match</span>
                    <span className="fap-result-score">
                      {authResult.face_match}%
                    </span>
                  </div>
                  <div className="fap-result-row">
                    <span className="fap-result-label">Liveness</span>
                    <span className="fap-result-score">
                      {authResult.liveness}%
                    </span>
                  </div>
                  <div className="fap-result-row">
                    <span className="fap-result-label">Skin Analysis</span>
                    <span className="fap-result-score">{authResult.skin}%</span>
                  </div>
                  {authResult.voice > 0 && (
                    <div className="fap-result-row">
                      <span className="fap-result-label">Voice Match</span>
                      <span className="fap-result-score">
                        {authResult.voice}%
                      </span>
                    </div>
                  )}
                </div>
              )}

              {phase === "done" && (
                <button onClick={goToDashboard} className="fap-proceed-btn">
                  <LayoutDashboard size={16} /> Go to Dashboard
                </button>
              )}
            </>
          )}

          {/* ══════════════ ENROLL FACE ══════════════ */}
          {mode === "enroll" && (
            <>
              <div className="fap-angle-row">
                {ANGLES.map((a, i) => {
                  const isDone = enrolledAngles.includes(a.key);
                  const isCurrent = i === enrollStep;
                  return (
                    <div
                      key={a.key}
                      className={`fap-angle-dot ${isDone ? "done" : isCurrent ? "current" : "pending"}`}
                    >
                      {isDone ? (
                        <Check size={20} color="#4ade80" />
                      ) : (
                        <a.Icon
                          size={20}
                          color={
                            isCurrent ? "#00d4ff" : "rgba(255,255,255,0.25)"
                          }
                        />
                      )}
                      <span className="fap-angle-label">{a.label}</span>
                    </div>
                  );
                })}
              </div>
              {!enrollComplete && (
                <div className="fap-instruction">
                  <div className="fap-instr-icon">
                    {(() => {
                      const A = ANGLES[enrollStep];
                      return <A.Icon size={24} color="#00d4ff" />;
                    })()}
                  </div>
                  <p className="fap-instr-text">
                    {ANGLES[enrollStep].instruction}
                  </p>
                  <p className="fap-instr-step">
                    Step {enrollStep + 1} of {ANGLES.length}
                  </p>
                </div>
              )}
              {enrollComplete && (
                <div className="fap-complete">
                  <div className="fap-complete-icon">
                    <PartyPopper size={32} color="#4ade80" />
                  </div>
                  <div className="fap-complete-title">Enrollment Complete</div>
                  <p className="fap-complete-sub">
                    All 5 angles captured — Face authentication is now active.
                  </p>
                  <button onClick={resetEnroll} className="fap-re-enroll">
                    <RefreshCw size={13} /> Re-enroll
                  </button>
                </div>
              )}
            </>
          )}

          {/* ══════════════ ENROLL VOICE ══════════════ */}
          {mode === "voice" && (
            <>
              {voiceEnrolled ? (
                <div className="fap-complete">
                  <div className="fap-complete-icon">
                    <Volume2 size={32} color="#4ade80" />
                  </div>
                  <div className="fap-complete-title">Voice Enrolled!</div>
                  <p className="fap-complete-sub">
                    Your voice profile is active.
                  </p>
                  <button onClick={resetVoiceEnroll} className="fap-re-enroll">
                    <RefreshCw size={13} /> Re-enroll Voice
                  </button>
                </div>
              ) : (
                <div className="voice-box">
                  <p className="voice-phrase-label">Say this phrase clearly</p>
                  <div className="voice-phrase">"{VOICE_PHRASE}"</div>
                  <div className="voice-samples-row">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className={`voice-sample-dot ${voiceSamples.length >= n ? "done" : voiceSamples.length + 1 === n ? "current" : "pending"}`}
                      >
                        {voiceSamples.length >= n ? <Check size={18} /> : n}
                      </div>
                    ))}
                  </div>
                  {/* ✅ 8 second countdown for enrollment */}
                  {voiceEnrollCountdown > 0 && (
                    <div
                      style={{
                        fontFamily: "'Orbitron',monospace",
                        fontSize: "48px",
                        fontWeight: 800,
                        color: "#00d4ff",
                        textAlign: "center",
                        margin: "16px 0",
                      }}
                      key={voiceEnrollCountdown}
                    >
                      {voiceEnrollCountdown}
                    </div>
                  )}
                  {!loading && voiceSamples.length < VOICE_SAMPLES_NEEDED && (
                    <button
                      onClick={recordVoiceSample}
                      disabled={voiceEnrollRecording}
                      className={`voice-mic-btn ${voiceEnrollRecording ? "recording" : "idle"}`}
                    >
                      {voiceEnrollRecording ? (
                        <>
                          <MicOff size={18} /> Recording...
                        </>
                      ) : (
                        <>
                          <Mic size={18} />{" "}
                          {voiceSamples.length === 0
                            ? "Start Recording"
                            : `Record Sample ${voiceSamples.length + 1}`}
                        </>
                      )}
                    </button>
                  )}
                  <p className="voice-hint">
                    {voiceEnrollRecording
                      ? "🎤 Speak clearly now..."
                      : `${VOICE_SAMPLES_NEEDED - voiceSamples.length} sample${VOICE_SAMPLES_NEEDED - voiceSamples.length !== 1 ? "s" : ""} remaining`}
                  </p>
                </div>
              )}
            </>
          )}

          {status && phase !== "failed" && (
            <div className={`fap-status ${statusType}`}>
              <div className="fap-status-dot" />
              {status}
            </div>
          )}

          {!loading &&
            mode !== "voice" &&
            !enrollComplete &&
            phase !== "done" &&
            phase !== "failed" &&
            phase !== "voice" && (
              <CameraFeed
                key={phase}
                onCapture={
                  mode === "enroll"
                    ? handleEnroll
                    : phase === "blink"
                      ? handleBlinkCapture
                      : handleChallengeCapture
                }
                buttonText={
                  mode === "enroll"
                    ? `Capture — ${ANGLES[enrollStep]?.label}`
                    : phase === "blink"
                      ? "Step 1 — Blink & Capture"
                      : "Step 2 — Capture Challenge"
                }
                captureFrames={mode === "auth"}
                countdownMessage={
                  phase === "blink"
                    ? "Blink Now!"
                    : challengeLabel || "Perform Challenge!"
                }
                instructionText={
                  mode === "enroll"
                    ? null
                    : phase === "blink"
                      ? "Press button → Blink within 3 seconds → System will verify liveness"
                      : `Press button → ${challengeLabel || "Perform challenge"} within 3 seconds`
                }
              />
            )}

          {phase === "failed" && (
            <button onClick={resetAuth} className="fap-retry-btn">
              <RefreshCw size={14} /> Try Again
            </button>
          )}

          {loading && (
            <div className="fap-loading">
              <div className="fap-spinner" />
              <p className="fap-loading-text">
                {mode === "voice"
                  ? "Enrolling voice profile..."
                  : "Processing biometrics..."}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default FaceAuthPage;
