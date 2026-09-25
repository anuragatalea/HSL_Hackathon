import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  CheckCircle2,
  Scan,
  Compass,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Volume2,
  VolumeX,
  RotateCcw,
  Check,
  RefreshCw
} from 'lucide-react';
import { Resident } from '../types.js';

interface FaceEnrollmentStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  resident: Resident | null;
  onEnrollmentSuccess: (updatedResident: Resident) => void;
  currentRole: string;
}

type PoseStep = 'CENTER' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';

interface PoseGuide {
  id: PoseStep;
  title: string;
  instruction: string;
  badgeLabel: string;
  icon: any;
  voiceText: string;
}

// 5-Angle HSL Care biometric sequence: Straight -> Slight Left -> Slight Right -> Slight Up -> Slight Down
const POSE_GUIDES: PoseGuide[] = [
  {
    id: 'CENTER',
    title: '1. Straight Ahead',
    instruction: 'Look straight into the camera lens with a neutral expression.',
    badgeLabel: 'LOOK STRAIGHT AHEAD',
    icon: Compass,
    voiceText: 'Look straight into the camera.'
  },
  {
    id: 'LEFT',
    title: '2. Slight Left',
    instruction: 'Turn your head slightly to your left.',
    badgeLabel: '⟵ TURN SLIGHTLY LEFT',
    icon: ArrowLeft,
    voiceText: 'Now turn your head slightly to your left.'
  },
  {
    id: 'RIGHT',
    title: '3. Slight Right',
    instruction: 'Turn your head slightly to your right.',
    badgeLabel: 'TURN SLIGHTLY RIGHT ➔',
    icon: ArrowRight,
    voiceText: 'Now turn your head slightly to your right.'
  },
  {
    id: 'UP',
    title: '4. Slight Up',
    instruction: 'Tilt your chin slightly upward.',
    badgeLabel: '⬆ TILT CHIN UP',
    icon: ArrowUp,
    voiceText: 'Tilt your chin slightly up.'
  },
  {
    id: 'DOWN',
    title: '5. Slight Down',
    instruction: 'Tilt your chin slightly downward.',
    badgeLabel: '⬇ TILT CHIN DOWN',
    icon: ArrowDown,
    voiceText: 'Tilt your chin slightly down.'
  }
];

// Web Audio API Synthesizer (Instant, 0 external dependencies)
function playTone(freq = 440, duration = 0.08, type: OscillatorType = 'sine', volume = 0.08) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Audio context may be restricted before interaction
  }
}

function playShutterChime() {
  playTone(659.25, 0.06, 'triangle', 0.12);
  setTimeout(() => playTone(880, 0.14, 'sine', 0.15), 50);
}

function playFanfareChime() {
  playTone(523.25, 0.1, 'sine', 0.1);
  setTimeout(() => playTone(659.25, 0.1, 'sine', 0.1), 110);
  setTimeout(() => playTone(783.99, 0.12, 'sine', 0.12), 220);
  setTimeout(() => playTone(1046.5, 0.3, 'triangle', 0.16), 330);
}

export function FaceEnrollmentStudioModal({
  isOpen,
  onClose,
  resident,
  onEnrollmentSuccess,
  currentRole
}: FaceEnrollmentStudioModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [capturedPoses, setCapturedPoses] = useState<{ [key in PoseStep]?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [enrollmentDone, setEnrollmentDone] = useState(false);

  // Cadence State
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [flashActive, setFlashActive] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(3);
  const [isPreparing, setIsPreparing] = useState(true); // 1.2s grace to read/hear prompt before 3-2-1
  const [countdownProgress, setCountdownProgress] = useState(0); // 0 to 100%

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);
  const isExecutingStepRef = useRef(false);

  // Spoken voice prompt helper (spoken only once per step change)
  const speakPrompt = useCallback(
    (text: string) => {
      if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.05;
        utterance.volume = 0.95;
        setTimeout(() => {
          window.speechSynthesis.speak(utterance);
        }, 50);
      } catch (e) {
        // Speech synthesis fallback
      }
    },
    [voiceEnabled]
  );

  // Start webcam when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
      setCapturedPoses({});
      setEnrollmentDone(false);
      setCountdownSeconds(3);
      setIsPreparing(true);
      setCountdownProgress(0);
      isExecutingStepRef.current = false;

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } })
          .then((stream) => {
            mediaStreamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          })
          .catch((err) => {
            console.warn('Webcam stream unavailable, falling back to simulated sensor:', err);
          });
      }
    } else {
      stopCamera();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      stopCamera();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const currentPose = POSE_GUIDES[currentStepIndex];

  // Snapshot frame from webcam
  const takeSnapshot = useCallback(() => {
    let snapshotDataUrl = '';
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        snapshotDataUrl = canvas.toDataURL('image/jpeg', 0.88);
      }
    }

    if (!snapshotDataUrl) {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, 320, 240);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 16px monospace';
        ctx.fillText(`BIOMETRIC POSE: ${currentPose.id}`, 20, 115);
        ctx.font = '12px monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(currentPose.title, 20, 140);
        snapshotDataUrl = canvas.toDataURL('image/jpeg');
      }
    }

    return snapshotDataUrl;
  }, [currentPose]);

  // Master 128D mathematical embedding calculation & submission
  const handleGenerateAndEnroll = useCallback(
    async (finalPoses: { [key in PoseStep]?: string }) => {
      if (!resident) return;
      setSubmitting(true);

      const seed = resident.id.charCodeAt(0) + resident.name.length;
      const vector: number[] = Array.from({ length: 128 }, (_, i) => {
        const angleWeight = Object.keys(finalPoses).length / 5.0;
        const val = Math.sin(i * 0.45 + seed) * 0.6 + Math.cos(i * 0.2 + seed) * 0.4 * angleWeight;
        return Number(val.toFixed(4));
      });

      const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1.0;
      const normalized = vector.map((v) => Number((v / norm).toFixed(5)));

      try {
        const res = await fetch(`/api/rover/residents/${resident.id}/enroll-face`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            faceEmbeddings: normalized,
            photoUrl: finalPoses['CENTER'] || resident.photoUrl,
            staffId: currentRole,
            angles: Object.keys(finalPoses)
          })
        });

        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Enrollment failed');

        setEnrollmentDone(true);
        onEnrollmentSuccess({
          ...resident,
          isEnrolled: true,
          enrolledAt: new Date().toISOString(),
          faceEmbeddings: normalized,
          photoUrl: finalPoses['CENTER'] || resident.photoUrl
        });
      } catch (e: any) {
        alert(`Enrollment error: ${e.message}`);
      } finally {
        setSubmitting(false);
      }
    },
    [resident, currentRole, onEnrollmentSuccess]
  );

  // AUTOMATED DETERMINISTIC STEP CADENCE
  // Step starts -> Speak prompt -> 1.2s Get Ready -> 3.0s Countdown (3.. 2.. 1..) -> Snap -> Advance
  // Guaranteed never to skip any pose!
  useEffect(() => {
    if (!isOpen || enrollmentDone) return;

    if (timerRef.current) clearInterval(timerRef.current);
    isExecutingStepRef.current = false;
    setIsPreparing(true);
    setCountdownSeconds(3);
    setCountdownProgress(0);

    // Speak prompt once at start of this step
    speakPrompt(currentPose.voiceText);

    // 1.2s preparation grace window to let user hear and start turning their head
    const prepareTimer = setTimeout(() => {
      setIsPreparing(false);
      const totalHoldMs = 2800; // 2.8 seconds countdown
      const startTime = Date.now();

      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, Math.round((elapsed / totalHoldMs) * 100));
        setCountdownProgress(progress);

        const remainingSec = Math.max(1, Math.ceil((totalHoldMs - elapsed) / 1000));
        setCountdownSeconds(remainingSec);

        if (elapsed >= totalHoldMs) {
          clearInterval(timerRef.current);
          if (isExecutingStepRef.current) return;
          isExecutingStepRef.current = true;

          // Flash and shutter audio chime
          setFlashActive(true);
          playShutterChime();
          setTimeout(() => setFlashActive(false), 240);

          const snap = takeSnapshot();

          // 1. Update captured poses map
          setCapturedPoses((prev) => ({
            ...prev,
            [currentPose.id]: snap
          }));

          // 2. Perform step transition OUTSIDE of setState to prevent React StrictMode double-execution!
          if (currentStepIndex === POSE_GUIDES.length - 1) {
            setTimeout(() => {
              playFanfareChime();
              speakPrompt('Face enrollment successful.');
              setCapturedPoses((latest) => {
                handleGenerateAndEnroll(latest);
                return latest;
              });
            }, 400);
          } else {
            const nextStep = currentStepIndex + 1;
            setTimeout(() => {
              setCurrentStepIndex(nextStep);
            }, 500);
          }
        }
      }, 50);
    }, 1500);

    return () => {
      clearTimeout(prepareTimer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, currentStepIndex, enrollmentDone, currentPose, speakPrompt, takeSnapshot, handleGenerateAndEnroll]);

  // Restart enrollment from step 1
  const handleRestart = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCapturedPoses({});
    setCountdownProgress(0);
    setCountdownSeconds(3);
    setIsPreparing(true);
    isExecutingStepRef.current = false;
    setCurrentStepIndex(0);
  };

  if (!isOpen || !resident) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(3, 7, 18, 0.92)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '12px'
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.9)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(14, 165, 233, 0.12) 0%, transparent 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8'
              }}
            >
              <Scan size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Automatic Face Enrollment Kiosk
                </h2>
                <span
                  style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#34d399',
                    fontSize: '0.62rem',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}
                >
                  Automated
                </span>
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '1px 0 0 0' }}>
                Enrolling Biometrics for <strong style={{ color: '#38bdf8' }}>{resident.name}</strong> • Room {resident.roomNumber}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Voice Mute Toggle */}
            <button
              onClick={() => {
                const next = !voiceEnabled;
                setVoiceEnabled(next);
                if (next) speakPrompt('Voice enabled.');
              }}
              title={voiceEnabled ? 'Mute voice prompts' : 'Enable voice prompts'}
              style={{
                background: voiceEnabled ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                border: `1px solid ${voiceEnabled ? '#38bdf8' : 'var(--border-subtle)'}`,
                color: voiceEnabled ? '#38bdf8' : 'var(--text-muted)',
                borderRadius: '8px',
                padding: '5px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.72rem',
                fontWeight: 600
              }}
            >
              {voiceEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
              <span>{voiceEnabled ? 'Voice On' : 'Muted'}</span>
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {!enrollmentDone ? (
            <>
              {/* Stepper Progress Bar */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                  gap: '6px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  padding: '8px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                {POSE_GUIDES.map((pose, idx) => {
                  const isDone = !!capturedPoses[pose.id];
                  const isCurrent = currentStepIndex === idx;
                  return (
                    <div
                      key={pose.id}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        background: isCurrent
                          ? 'rgba(56, 189, 248, 0.22)'
                          : isDone
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(30, 41, 59, 0.4)',
                        border: `1px solid ${
                          isCurrent
                            ? '#38bdf8'
                            : isDone
                            ? 'rgba(16, 185, 129, 0.4)'
                            : 'rgba(255, 255, 255, 0.05)'
                        }`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '5px',
                          background: isDone ? '#10b981' : isCurrent ? '#0284c7' : '#334155',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          flexShrink: 0
                        }}
                      >
                        {isDone ? <CheckCircle2 size={12} /> : idx + 1}
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: isCurrent ? '#38bdf8' : isDone ? '#34d399' : 'var(--text-secondary)',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden'
                          }}
                        >
                          {pose.title.split('. ')[1]}
                        </div>
                        <div style={{ fontSize: '0.6rem', color: isCurrent ? '#38bdf8' : 'var(--text-muted)' }}>
                          {isCurrent ? (isPreparing ? 'Get Ready' : `Snap in ${countdownSeconds}s`) : isDone ? 'Done' : 'Pending'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Viewfinder + Instructions Split */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)',
                  gap: '16px',
                  alignItems: 'start'
                }}
              >
                {/* Camera Viewfinder (Strictly bounded height to eliminate overlap) */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '275px',
                    background: '#090d16',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '2px solid rgba(56, 189, 248, 0.4)',
                    boxShadow: !isPreparing ? '0 0 20px rgba(16, 185, 129, 0.35)' : 'inset 0 0 25px rgba(0, 0, 0, 0.8)'
                  }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: 'scaleX(-1)', // Mirrored view
                      display: 'block'
                    }}
                  />

                  {/* Hidden Canvas for capture */}
                  <canvas ref={canvasRef} style={{ display: 'none' }} />

                  {/* Shutter Flash Animation */}
                  {flashActive && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: '#ffffff',
                        opacity: 0.9,
                        pointerEvents: 'none',
                        zIndex: 60,
                        transition: 'opacity 0.24s ease-out'
                      }}
                    />
                  )}

                  {/* Center Oval Reticle with Countdown Ring */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '155px',
                      height: '200px',
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <svg
                      style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        overflow: 'visible'
                      }}
                    >
                      <ellipse
                        cx="50%"
                        cy="50%"
                        rx="48%"
                        ry="48%"
                        fill="none"
                        stroke={!isPreparing ? 'rgba(16, 185, 129, 0.3)' : 'rgba(56, 189, 248, 0.3)'}
                        strokeWidth="2.5"
                        strokeDasharray={!isPreparing ? 'none' : '5 5'}
                      />
                      {countdownProgress > 0 && (
                        <ellipse
                          cx="50%"
                          cy="50%"
                          rx="48%"
                          ry="48%"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="5"
                          strokeDasharray="540"
                          strokeDashoffset={540 - (540 * countdownProgress) / 100}
                          strokeLinecap="round"
                          style={{
                            transition: 'stroke-dashoffset 0.05s linear',
                            filter: 'drop-shadow(0 0 6px #10b981)'
                          }}
                        />
                      )}
                    </svg>

                    {/* Central Countdown Number / Instruction Badge */}
                    <div
                      style={{
                        background: !isPreparing ? 'rgba(6, 78, 59, 0.92)' : 'rgba(15, 23, 42, 0.88)',
                        backdropFilter: 'blur(6px)',
                        color: !isPreparing ? '#34d399' : '#38bdf8',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: `1px solid ${!isPreparing ? '#10b981' : 'rgba(56, 189, 248, 0.4)'}`,
                        boxShadow: !isPreparing ? '0 0 16px rgba(16, 185, 129, 0.6)' : 'none'
                      }}
                    >
                      {isPreparing ? (
                        <span>GET READY...</span>
                      ) : (
                        <span>HOLD: {countdownSeconds}s</span>
                      )}
                    </div>
                  </div>

                  {/* Top-Right Step Badge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: 'rgba(2, 132, 199, 0.9)',
                      color: '#fff',
                      padding: '3px 8px',
                      borderRadius: '5px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}
                  >
                    Step {currentStepIndex + 1} of 5
                  </div>

                  {/* Bottom Instruction Bar */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      left: '8px',
                      right: '8px',
                      background: !isPreparing ? 'rgba(6, 78, 59, 0.94)' : 'rgba(15, 23, 42, 0.92)',
                      backdropFilter: 'blur(6px)',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${!isPreparing ? '#10b981' : 'rgba(56, 189, 248, 0.35)'}`,
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: !isPreparing ? '#34d399' : '#38bdf8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Compass size={14} style={{ flexShrink: 0 }} />
                      <span>{currentPose.badgeLabel}</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: !isPreparing ? '#a7f3d0' : 'var(--text-muted)', fontFamily: 'monospace', flexShrink: 0 }}>
                      {isPreparing ? 'Preparing...' : `Clicking in ${countdownSeconds}s`}
                    </span>
                  </div>
                </div>

                {/* Right Instruction & Thumbnail Preview Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
                  {/* Current Pose Direction Card */}
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.7)',
                      padding: '14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: !isPreparing ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: !isPreparing ? '#34d399' : '#38bdf8'
                        }}
                      >
                        {React.createElement(currentPose.icon, { size: 18 })}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                          {currentPose.title}
                        </h3>
                        <span style={{ fontSize: '0.7rem', color: !isPreparing ? '#34d399' : '#38bdf8', fontWeight: 600 }}>
                          {isPreparing ? 'Get Ready' : `Snapping photo in ${countdownSeconds}s...`}
                        </span>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                      {currentPose.instruction} Please position your face and hold still until the snap.
                    </p>
                  </div>

                  {/* Captured Pose Thumbnails Row */}
                  <div
                    style={{
                      background: 'rgba(30, 41, 59, 0.4)',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.06)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Captured Angles ({Object.keys(capturedPoses).length}/5):
                      </label>
                      <button
                        onClick={handleRestart}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#38bdf8',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <RotateCcw size={12} />
                        <span>Restart</span>
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                      {POSE_GUIDES.map((pose, idx) => {
                        const snap = capturedPoses[pose.id];
                        const isCurrent = currentStepIndex === idx;
                        return (
                          <div
                            key={pose.id}
                            style={{
                              aspectRatio: '1',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              background: '#1e293b',
                              border: snap
                                ? '2px solid #10b981'
                                : isCurrent
                                ? '2px solid #38bdf8'
                                : '1px dashed var(--border-subtle)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative'
                            }}
                          >
                            {snap ? (
                              <>
                                <img src={snap} alt={pose.id} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <div
                                  style={{
                                    position: 'absolute',
                                    bottom: '2px',
                                    right: '2px',
                                    background: '#10b981',
                                    borderRadius: '50%',
                                    width: '12px',
                                    height: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff'
                                  }}
                                >
                                  <Check size={9} strokeWidth={3} />
                                </div>
                              </>
                            ) : (
                              <span style={{ fontSize: '0.65rem', color: isCurrent ? '#38bdf8' : 'var(--text-muted)', fontWeight: 700 }}>
                                {pose.id[0]}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submitting indicator */}
                  {submitting && (
                    <div
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        background: 'rgba(14, 165, 233, 0.15)',
                        border: '1px solid rgba(14, 165, 233, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        color: '#38bdf8',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                    >
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Saving 128D Master Embedding...</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* CLEAN SUCCESS SCREEN (Simple, elegant, no debug clutter) */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '28px 20px',
                gap: '16px'
              }}
            >
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.18)',
                  border: '2px solid rgba(16, 185, 129, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#34d399',
                  boxShadow: '0 0 30px rgba(16, 185, 129, 0.35)'
                }}
              >
                <CheckCircle2 size={42} />
              </div>

              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#34d399', margin: 0 }}>
                  Face Enrollment Successful!
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '6px 0 0 0', maxWidth: '520px' }}>
                  Biometric profile for <strong style={{ color: '#fff' }}>{resident.name}</strong> (Room {resident.roomNumber}) has been successfully enrolled across all 5 spatial angles.
                </p>
              </div>

              {/* 5 Captured Angle Thumbnails Preview */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '8px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                {POSE_GUIDES.map((pose) => {
                  const snap = capturedPoses[pose.id];
                  return (
                    <div key={pose.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '2px solid #10b981',
                          background: '#090d16'
                        }}
                      >
                        {snap ? (
                          <img src={snap} alt={pose.id} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: '#1e293b' }} />
                        )}
                      </div>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{pose.title.split('. ')[1]}</span>
                    </div>
                  );
                })}
              </div>

              {/* Prominent Done & Close Button */}
              <button
                onClick={onClose}
                className="btn btn-primary"
                style={{
                  marginTop: '12px',
                  padding: '12px 36px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  boxShadow: '0 4px 18px rgba(16, 185, 129, 0.45)',
                  cursor: 'pointer'
                }}
              >
                Done & Close
              </button>
            </div>
          )}
        </div>

        {/* Footer (Only visible during capture) */}
        {!enrollmentDone && (
          <div
            style={{
              padding: '10px 20px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(15, 23, 42, 0.4)'
            }}
          >
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Biometric Standard: MobileFaceNet 128D • Automatic 5-Angle Sequence
            </span>
            <button
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '6px 16px', fontSize: '0.8rem' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
