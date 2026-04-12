import { useRef, useCallback, useState } from "react";
import Webcam from "react-webcam";
import { Camera, Loader2 } from "lucide-react";

function CameraFeed({
  onCapture,
  buttonText = "Capture",
  showCapture = true,
  captureFrames = false,
  countdownMessage = "Blink Now!", // ← NEW prop
  instructionText = null, // ← NEW prop
}) {
  const webcamRef = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const videoConstraints = { width: 520, height: 420, facingMode: "user" };

  const captureSingle = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc && onCapture) onCapture(imageSrc, []);
  }, [onCapture]);

  const captureWithFrames = useCallback(async () => {
    if (capturing) return;
    setCapturing(true);
    const frames = [];
    for (let i = 3; i >= 1; i--) {
      setCountdown(i);
      await new Promise((r) => setTimeout(r, 800));
    }
    setCountdown(0);
    for (let i = 0; i < 10; i++) {
      const frame = webcamRef.current?.getScreenshot();
      if (frame) frames.push(frame);
      await new Promise((r) => setTimeout(r, 200));
    }
    const mainFrame = frames[Math.floor(frames.length / 2)] || frames[0];
    setCapturing(false);
    if (mainFrame && onCapture) onCapture(mainFrame, frames);
  }, [capturing, onCapture]);

  const handleCapture = captureFrames ? captureWithFrames : captureSingle;

  // Default instruction based on mode
  const defaultInstruction = captureFrames
    ? "Press the button → perform action within 3 seconds → System will verify"
    : "Position your face inside the frame and look directly at the camera";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700&family=Rajdhani:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .cf-container {
          display: flex; flex-direction: column;
          align-items: center; gap: 16px;
          font-family: 'Rajdhani', sans-serif;
          width: 100%;
        }

        .cf-wrapper {
          position: relative; width: 100%; max-width: 520px;
          aspect-ratio: 520 / 420;
          border-radius: 16px; overflow: hidden;
          border: 1px solid rgba(0, 212, 255, 0.3);
          box-shadow: 0 0 0 1px rgba(0,212,255,0.08), 0 0 32px rgba(0,212,255,0.15), 0 0 80px rgba(0,212,255,0.06), inset 0 0 32px rgba(0,0,0,0.5);
          animation: cfBorderGlow 3s ease-in-out infinite;
        }

        @keyframes cfBorderGlow {
          0%, 100% { border-color: rgba(0,212,255,0.3); box-shadow: 0 0 32px rgba(0,212,255,0.15), 0 0 80px rgba(0,212,255,0.06); }
          50% { border-color: rgba(0,212,255,0.6); box-shadow: 0 0 48px rgba(0,212,255,0.3), 0 0 100px rgba(0,212,255,0.12); }
        }

        .cf-video { width: 100%; height: 100%; object-fit: cover; display: block; }

        .cf-overlay {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          pointer-events: none;
        }

        .cf-guide {
          width: 50%; height: 76%; border-radius: 12px;
          box-shadow: 0 0 0 9999px rgba(0,0,0,0.42);
          position: relative;
        }

        .cf-corner { position: absolute; width: 22px; height: 22px; }
        .cf-corner.tl { top: -2px; left: -2px; border-top: 3px solid #00d4ff; border-left: 3px solid #00d4ff; border-radius: 6px 0 0 0; box-shadow: -2px -2px 8px rgba(0,212,255,0.5); }
        .cf-corner.tr { top: -2px; right: -2px; border-top: 3px solid #00d4ff; border-right: 3px solid #00d4ff; border-radius: 0 6px 0 0; box-shadow: 2px -2px 8px rgba(0,212,255,0.5); }
        .cf-corner.bl { bottom: -2px; left: -2px; border-bottom: 3px solid #00d4ff; border-left: 3px solid #00d4ff; border-radius: 0 0 0 6px; box-shadow: -2px 2px 8px rgba(0,212,255,0.5); }
        .cf-corner.br { bottom: -2px; right: -2px; border-bottom: 3px solid #00d4ff; border-right: 3px solid #00d4ff; border-radius: 0 0 6px 0; box-shadow: 2px 2px 8px rgba(0,212,255,0.5); }

        .cf-scan {
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(0,212,255,0.8), transparent);
          animation: cfScan 2.5s linear infinite;
          box-shadow: 0 0 8px rgba(0,212,255,0.6);
        }

        @keyframes cfScan {
          0%   { top: 0%;   opacity: 1; }
          90%  { top: 100%; opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }

        .cf-status-badge {
          position: absolute; top: 10px; left: 10px;
          display: flex; align-items: center; gap: 6px;
          background: rgba(0,0,0,0.6); border: 1px solid rgba(0,212,255,0.2);
          border-radius: 100px; padding: 4px 10px; backdrop-filter: blur(8px);
        }

        .cf-status-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #22c55e;
          box-shadow: 0 0 8px rgba(34,197,94,0.9);
          animation: cfLivePulse 1.5s ease-in-out infinite;
        }

        @keyframes cfLivePulse {
          0%, 100% { box-shadow: 0 0 6px rgba(34,197,94,0.8); }
          50% { box-shadow: 0 0 12px rgba(34,197,94,1), 0 0 24px rgba(34,197,94,0.4); }
        }

        .cf-status-text { font-family: 'DM Mono', monospace; font-size: 9px; color: rgba(255,255,255,0.6); letter-spacing: 0.08em; text-transform: uppercase; }

        .cf-countdown {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.72);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          backdrop-filter: blur(2px);
        }

        .cf-countdown-num {
          font-family: 'Orbitron', monospace; font-size: 80px; font-weight: 800;
          color: #00d4ff; line-height: 1;
          text-shadow: 0 0 40px rgba(0,212,255,0.8), 0 0 80px rgba(0,212,255,0.4);
          animation: cfCountPulse 0.8s ease-in-out;
        }

        @keyframes cfCountPulse {
          0%   { transform: scale(1.3); opacity: 0.5; }
          100% { transform: scale(1);   opacity: 1; }
        }

        .cf-countdown-msg { font-family: 'Rajdhani', sans-serif; font-size: 20px; font-weight: 700; color: #a78bfa; letter-spacing: 0.04em; margin-top: 12px; text-align: center; padding: 0 16px; text-shadow: 0 0 16px rgba(167,139,250,0.6); }
        .cf-countdown-sub { font-family: 'DM Mono', monospace; font-size: 10px; color: rgba(0,212,255,0.5); letter-spacing: 0.1em; margin-top: 6px; }

        .cf-recording {
          position: absolute; top: 10px; right: 10px;
          display: flex; align-items: center; gap: 6px;
          background: rgba(0,0,0,0.65); border: 1px solid rgba(239,68,68,0.3);
          border-radius: 100px; padding: 4px 10px; backdrop-filter: blur(8px);
        }

        .cf-rec-dot { width: 7px; height: 7px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 8px rgba(239,68,68,0.9); animation: cfRecBlink 0.8s step-end infinite; }
        @keyframes cfRecBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }
        .cf-rec-text { font-family: 'DM Mono', monospace; font-size: 9px; color: #f87171; letter-spacing: 0.1em; text-transform: uppercase; }

        .cf-instruction {
          font-family: 'Rajdhani', sans-serif; font-size: 13px; font-weight: 500;
          color: rgba(255,255,255,0.3); text-align: center; max-width: 420px;
          letter-spacing: 0.04em; line-height: 1.5;
          padding: 0 8px;
        }

        .cf-capture-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 13px 36px; width: 100%; max-width: 360px;
          background: linear-gradient(135deg, rgba(0,212,255,0.15), rgba(79,70,229,0.15));
          color: #00d4ff; border: 1px solid rgba(0,212,255,0.35); border-radius: 10px;
          font-family: 'Rajdhani', sans-serif; font-size: 14px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          cursor: pointer; transition: all 0.25s ease;
          position: relative; overflow: hidden;
          box-shadow: 0 0 20px rgba(0,212,255,0.15);
        }

        .cf-capture-btn::before {
          content: '';
          position: absolute; top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(0,212,255,0.15), transparent);
          transition: left 0.4s ease;
        }

        .cf-capture-btn:hover::before { left: 100%; }
        .cf-capture-btn:hover { background: linear-gradient(135deg, rgba(0,212,255,0.22), rgba(79,70,229,0.22)); border-color: rgba(0,212,255,0.6); box-shadow: 0 0 32px rgba(0,212,255,0.3); transform: translateY(-1px); }
        .cf-capture-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
        .cf-capture-btn.recording { border-color: rgba(239,68,68,0.3); color: #f87171; background: rgba(239,68,68,0.08); box-shadow: 0 0 20px rgba(239,68,68,0.15); }

        .cf-spin { animation: cfSpinIcon 1s linear infinite; }
        @keyframes cfSpinIcon { to { transform: rotate(360deg); } }

        @media (max-width: 480px) {
          .cf-container { gap: 12px; }
          .cf-wrapper { border-radius: 12px; }
          .cf-countdown-num { font-size: 60px; }
          .cf-countdown-msg { font-size: 16px; }
          .cf-instruction { font-size: 12px; }
          .cf-capture-btn { padding: 12px 24px; font-size: 13px; letter-spacing: 0.05em; }
          .cf-corner { width: 18px; height: 18px; }
        }

        @media (max-width: 360px) {
          .cf-countdown-num { font-size: 48px; }
          .cf-capture-btn { padding: 11px 20px; font-size: 12px; }
          .cf-instruction { font-size: 11px; }
        }
      `}</style>

      <div className="cf-container">
        <div className="cf-wrapper">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            className="cf-video"
            mirrored={true}
          />

          <div className="cf-overlay">
            <div className="cf-guide">
              <div className="cf-corner tl" />
              <div className="cf-corner tr" />
              <div className="cf-corner bl" />
              <div className="cf-corner br" />
              <div className="cf-scan" />
            </div>
          </div>

          {!capturing && countdown === 0 && (
            <div className="cf-status-badge">
              <div className="cf-status-dot" />
              <span className="cf-status-text">Live</span>
            </div>
          )}

          {/* Countdown overlay — shows countdownMessage prop */}
          {countdown > 0 && (
            <div className="cf-countdown">
              <div className="cf-countdown-num" key={countdown}>
                {countdown}
              </div>
              <div className="cf-countdown-msg">{countdownMessage}</div>
              <div className="cf-countdown-sub">
                Keep your face inside the frame
              </div>
            </div>
          )}

          {capturing && countdown === 0 && (
            <div className="cf-recording">
              <div className="cf-rec-dot" />
              <span className="cf-rec-text">Recording</span>
            </div>
          )}
        </div>

        <p className="cf-instruction">
          {instructionText || defaultInstruction}
        </p>

        {showCapture && !capturing && (
          <button onClick={handleCapture} className="cf-capture-btn">
            <Camera size={15} />
            {buttonText}
          </button>
        )}

        {capturing && (
          <button className="cf-capture-btn recording" disabled>
            <Loader2 size={15} className="cf-spin" />
            Recording...
          </button>
        )}
      </div>
    </>
  );
}

export default CameraFeed;
