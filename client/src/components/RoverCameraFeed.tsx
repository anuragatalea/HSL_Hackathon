import React, { useState, useEffect, useRef } from 'react';
import { Maximize2, Minimize2, Video, Sparkles, Globe, Download, Settings, ShieldCheck } from 'lucide-react';
import { RoverDevice, RoverTask } from '../types.js';

interface RoverCameraFeedProps {
  rover: RoverDevice | null;
  activeTask?: RoverTask | null;
  height?: string;
  isCompact?: boolean;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

export const RoverCameraFeed: React.FC<RoverCameraFeedProps> = ({
  rover,
  activeTask,
  height = '380px',
  isCompact = false,
  onToggleFullscreen,
  isFullscreen = false
}) => {
  const [streamMode, setStreamMode] = useState<'synthetic' | 'webcam' | 'hardware'>('hardware');
  const [streamUrl, setStreamUrl] = useState<string>('/api/rover/devices/stream');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempUrl, setTempUrl] = useState(streamUrl);
  const [hardwareError, setHardwareError] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [isSnapshotting, setIsSnapshotting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const gridOffsetRef = useRef<number>(0);

  // Fetch camera config from backend
  useEffect(() => {
    if (!rover?.id) return;
    fetch(`/api/rover/devices/${rover.id}/camera`)
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data?.streamUrl) {
          setStreamUrl(json.data.streamUrl);
          setTempUrl(json.data.streamUrl);
        }
      })
      .catch(console.error);
  }, [rover?.id]);

  // Handle local webcam stream
  useEffect(() => {
    let currentStream: MediaStream | null = null;
    if (streamMode === 'webcam') {
      setWebcamError(null);
      navigator.mediaDevices?.getUserMedia({ video: { width: 1280, height: 720 } })
        .then(stream => {
          currentStream = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(console.error);
          }
        })
        .catch(err => {
          console.warn('Webcam access error:', err);
          setWebcamError('Camera unavailable or permission denied. Please allow camera access or use Synthetic mode.');
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
    }

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [streamMode]);

  // Synthetic 3D corridor rendering loop
  useEffect(() => {
    if (streamMode !== 'synthetic') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;
    const isMoving = rover?.status === 'MOVING' || rover?.status === 'RETURNING';

    const render = () => {
      if (!isRunning) return;

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      // Update grid speed
      const speedFactor = isMoving ? 4.5 : 0.4;
      gridOffsetRef.current = (gridOffsetRef.current + speedFactor) % 40;

      // 1. Dark Clinical Corridor Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(0.5, '#0f172a');
      bgGrad.addColorStop(1, '#050811');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Perspective Corridor Walls
      const vpX = centerX;
      const vpY = centerY - 15;

      // Ceiling
      ctx.fillStyle = '#0b1120';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width, 0);
      ctx.lineTo(vpX + 60, vpY - 40);
      ctx.lineTo(vpX - 60, vpY - 40);
      ctx.closePath();
      ctx.fill();

      // Overhead fluorescent lights
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(centerX - 30, 0);
      ctx.lineTo(vpX - 10, vpY - 40);
      ctx.moveTo(centerX + 30, 0);
      ctx.lineTo(vpX + 10, vpY - 40);
      ctx.stroke();

      // Left Wall
      const leftWall = ctx.createLinearGradient(0, 0, vpX, 0);
      leftWall.addColorStop(0, '#111827');
      leftWall.addColorStop(1, '#1e293b');
      ctx.fillStyle = leftWall;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(vpX - 60, vpY - 40);
      ctx.lineTo(vpX - 60, vpY + 50);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

      // Right Wall
      const rightWall = ctx.createLinearGradient(width, 0, vpX, 0);
      rightWall.addColorStop(0, '#111827');
      rightWall.addColorStop(1, '#1e293b');
      ctx.fillStyle = rightWall;
      ctx.beginPath();
      ctx.moveTo(width, 0);
      ctx.lineTo(vpX + 60, vpY - 40);
      ctx.lineTo(vpX + 60, vpY + 50);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // Floor
      const floorGrad = ctx.createLinearGradient(0, vpY, 0, height);
      floorGrad.addColorStop(0, '#0f172a');
      floorGrad.addColorStop(1, '#020617');
      ctx.fillStyle = floorGrad;
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(vpX - 60, vpY + 50);
      ctx.lineTo(vpX + 60, vpY + 50);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // Moving Floor Perspective Grid Lines (Depth Cues)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
      ctx.lineWidth = 1;
      for (let d = 0; d < 8; d++) {
        const offset = (d * 30 + gridOffsetRef.current) % 240;
        const y = vpY + 50 + (offset / 240) * (height - (vpY + 50));
        const progress = (y - (vpY + 50)) / (height - (vpY + 50));
        const leftX = (vpX - 60) * (1 - progress);
        const rightX = (vpX + 60) + (width - (vpX + 60)) * progress;

        ctx.beginPath();
        ctx.moveTo(leftX, y);
        ctx.lineTo(rightX, y);
        ctx.stroke();
      }

      // Yellow Center Tape (Guidance Track)
      ctx.strokeStyle = '#f59e0b';
      ctx.setLineDash([12, 10]);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(centerX, height);
      ctx.lineTo(vpX, vpY + 50);
      ctx.stroke();
      ctx.setLineDash([]);

      // Room 102 Door Marker on Right Wall
      const doorProgress = Math.min(1, Math.max(0.2, (rover ? rover.currentX / 16.0 : 0.6)));
      const doorRightX = vpX + 50 + (width * 0.35) * doorProgress;
      const doorTopY = vpY - 20 + (height * 0.15) * doorProgress;
      const doorBottomY = vpY + 45 + (height * 0.28) * doorProgress;
      const doorWidth = 45 * doorProgress;

      ctx.fillStyle = 'rgba(14, 165, 233, 0.15)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.fillRect(doorRightX, doorTopY, doorWidth, doorBottomY - doorTopY);
      ctx.strokeRect(doorRightX, doorTopY, doorWidth, doorBottomY - doorTopY);

      // Door Label
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText('ROOM 102', doorRightX + 4, doorTopY - 6);

      // AI Target Lock Bounding Box
      const targetDist = rover ? Math.hypot(16.0 - rover.currentX, 10.0 - rover.currentY).toFixed(1) : '3.8';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      const boxX = doorRightX - 10;
      const boxY = doorTopY - 10;
      const boxW = doorWidth + 20;
      const boxH = (doorBottomY - doorTopY) + 20;

      // Draw Corner Brackets
      const cLen = 12;
      ctx.beginPath();
      // Top Left
      ctx.moveTo(boxX, boxY + cLen); ctx.lineTo(boxX, boxY); ctx.lineTo(boxX + cLen, boxY);
      // Top Right
      ctx.moveTo(boxX + boxW - cLen, boxY); ctx.lineTo(boxX + boxW, boxY); ctx.lineTo(boxX + boxW, boxY + cLen);
      // Bottom Left
      ctx.moveTo(boxX, boxY + boxH - cLen); ctx.lineTo(boxX, boxY + boxH); ctx.lineTo(boxX + cLen, boxY + boxH);
      // Bottom Right
      ctx.moveTo(boxX + boxW - cLen, boxY + boxH); ctx.lineTo(boxX + boxW, boxY + boxH); ctx.lineTo(boxX + boxW, boxY + boxH - cLen);
      ctx.stroke();

      // Target Metadata Badge
      const residentTag = activeTask?.resident?.name ? ` (${activeTask.resident.name})` : '';
      ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
      ctx.fillRect(boxX, boxY - 18, 160, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`TARGET: RM 102${residentTag} • ${targetDist}m`, boxX + 6, boxY - 6);

      // 3. Cybernetic Center Crosshairs & Horizon Line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      // Horizon line
      ctx.beginPath();
      ctx.moveTo(centerX - 40, centerY);
      ctx.lineTo(centerX - 12, centerY);
      ctx.moveTo(centerX + 12, centerY);
      ctx.lineTo(centerX + 40, centerY);
      // Vertical tick
      ctx.moveTo(centerX, centerY - 25);
      ctx.lineTo(centerX, centerY - 8);
      ctx.moveTo(centerX, centerY + 8);
      ctx.lineTo(centerX, centerY + 25);
      ctx.stroke();

      // Center ring
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
      ctx.stroke();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [streamMode, rover?.status, rover?.currentX, rover?.currentY]);

  // Capture Snapshot
  const handleSnapshot = () => {
    setIsSnapshotting(true);
    setTimeout(() => setIsSnapshotting(false), 300);

    let dataUrl: string | null = null;
    if (streamMode === 'synthetic' && canvasRef.current) {
      dataUrl = canvasRef.current.toDataURL('image/jpeg');
    } else if (streamMode === 'webcam' && videoRef.current) {
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = videoRef.current.videoWidth || 1280;
      snapCanvas.height = videoRef.current.videoHeight || 720;
      const ctx = snapCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, snapCanvas.width, snapCanvas.height);
        dataUrl = snapCanvas.toDataURL('image/jpeg');
      }
    }

    if (dataUrl) {
      const link = document.createElement('a');
      link.download = `rover_cam_snapshot_${Date.now()}.jpg`;
      link.href = dataUrl;
      link.click();
    }
  };

  const handleSaveUrl = async () => {
    setStreamUrl(tempUrl);
    setIsSettingsOpen(false);
    setHardwareError(false);
    if (rover?.id) {
      fetch(`/api/rover/devices/${rover.id}/camera`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamUrl: tempUrl })
      }).catch(console.error);
    }
  };

  const isMoving = rover?.status === 'MOVING' || rover?.status === 'RETURNING';

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: height,
        borderRadius: '14px',
        overflow: 'hidden',
        background: '#090d16',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Visual Flash Effect on Snapshot */}
      {isSnapshotting && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(255, 255, 255, 0.85)',
          zIndex: 40,
          pointerEvents: 'none',
          animation: 'flash 0.3s ease-out'
        }} />
      )}

      {/* Top HUD Overlay Bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 20,
        background: 'linear-gradient(to bottom, rgba(5, 8, 17, 0.85) 0%, rgba(5, 8, 17, 0) 100%)',
        backdropFilter: 'blur(4px)',
        fontSize: '11px',
        color: 'hsl(210, 40%, 98%)'
      }}>
        {/* Left Telemetry Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Live Recording Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            padding: '2px 8px',
            borderRadius: '12px',
            fontWeight: 800,
            letterSpacing: '0.05em'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              boxShadow: '0 0 8px #ef4444'
            }} />
            <span style={{ color: '#fca5a5' }}>LIVE FPV</span>
          </div>

          <span style={{
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            padding: '2px 8px',
            borderRadius: '12px',
            color: '#38bdf8',
            fontWeight: 600
          }}>
            1080P • 30 FPS
          </span>

          <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'monospace' }}>
            LATENCY: 22ms
          </span>
        </div>

        {/* Right Source Mode Switcher & Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Source Toggle Pills */}
          <div style={{
            display: 'flex',
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '14px',
            padding: '2px'
          }}>


            <button
              onClick={() => setStreamMode('hardware')}
              title="Stream from physical Waveshare UGV-Beast Raspberry Pi"
              style={{
                background: streamMode === 'hardware' ? '#38bdf8' : 'transparent',
                color: streamMode === 'hardware' ? '#0f172a' : '#94a3b8',
                border: 'none',
                padding: '3px 8px',
                borderRadius: '12px',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              <Globe size={11} />
              <span>Rover Pi</span>
            </button>
          </div>

          {/* Settings Button */}
          {streamMode === 'hardware' && (
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              title="Configure Raspberry Pi stream URL"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#e2e8f0',
                padding: '4px 6px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Settings size={13} />
            </button>
          )}

          {/* Snapshot Button */}
          <button
            onClick={handleSnapshot}
            title="Capture timestamped camera frame"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#e2e8f0',
              padding: '4px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 600
            }}
          >
            <Download size={12} />
            {!isCompact && <span>Snap</span>}
          </button>

          {/* Fullscreen Toggle Button */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#e2e8f0',
                padding: '4px 6px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          )}
        </div>
      </div>

      {/* Hardware URL Settings Popover */}
      {isSettingsOpen && (
        <div style={{
          position: 'absolute',
          top: '46px',
          right: '14px',
          background: 'hsl(222, 47%, 11%)',
          border: '1px solid hsl(217, 91%, 60%)',
          borderRadius: '10px',
          padding: '12px',
          zIndex: 30,
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.7)',
          width: '320px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc' }}>
            Raspberry Pi Camera MJPEG Endpoint
          </span>
          <input
            type="text"
            value={tempUrl}
            onChange={(e) => setTempUrl(e.target.value)}
            placeholder="/api/rover/devices/stream"
            style={{
              background: '#020617',
              border: '1px solid #334155',
              color: '#38bdf8',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontFamily: 'monospace'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
            <button
              onClick={() => setIsSettingsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                padding: '4px 10px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveUrl}
              style={{
                background: '#38bdf8',
                border: 'none',
                color: '#0f172a',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Apply Stream URL
            </button>
          </div>
        </div>
      )}

      {/* Main Viewport Content */}
      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
        {/* Mode 1: Synthetic 3D Canvas */}
        {streamMode === 'synthetic' && (
          <canvas
            ref={canvasRef}
            width={854}
            height={480}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block'
            }}
          />
        )}

        {/* Mode 2: Local Webcam Feed */}
        {streamMode === 'webcam' && (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {webcamError ? (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                textAlign: 'center',
                gap: '10px'
              }}>
                <Video size={36} color="#94a3b8" />
                <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0, maxWidth: '340px' }}>
                  {webcamError}
                </p>
                <button
                  onClick={() => setStreamMode('synthetic')}
                  style={{
                    background: '#38bdf8',
                    border: 'none',
                    color: '#0f172a',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginTop: '6px'
                  }}
                >
                  Switch to AI Synthetic Vision
                </button>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
            )}
          </div>
        )}

        {/* Mode 3: Physical Hardware Stream (MJPEG) */}
        {streamMode === 'hardware' && (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {hardwareError ? (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                textAlign: 'center',
                gap: '10px'
              }}>
                <Globe size={36} color="#f59e0b" />
                <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0, maxWidth: '360px' }}>
                  Unable to connect to Waveshare Rover at <code style={{ color: '#38bdf8' }}>{streamUrl}</code>. Ensure the Raspberry Pi Flask camera server is running.
                </p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <button
                    onClick={() => setHardwareError(false)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#ffffff',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Retry Connection
                  </button>
                  <button
                    onClick={() => setStreamMode('synthetic')}
                    style={{
                      background: '#38bdf8',
                      border: 'none',
                      color: '#0f172a',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Use Synthetic Feed
                  </button>
                </div>
              </div>
            ) : (
              <img
                src={streamUrl}
                alt="Rover Live Stream"
                onError={() => setHardwareError(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Bottom HUD Telemetry Status Footer */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 20,
        background: 'linear-gradient(to top, rgba(5, 8, 17, 0.88) 0%, rgba(5, 8, 17, 0) 100%)',
        backdropFilter: 'blur(4px)',
        fontSize: '11px',
        color: 'hsl(210, 40%, 98%)',
        fontFamily: 'monospace'
      }}>
        {/* Rover State Readout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span>
            <strong style={{ color: 'rgba(255, 255, 255, 0.5)' }}>POS: </strong>
            <span style={{ color: '#38bdf8' }}>
              X: {rover?.currentX.toFixed(2) ?? '10.00'}m | Y: {rover?.currentY.toFixed(2) ?? '2.00'}m
            </span>
          </span>

          <span>
            <strong style={{ color: 'rgba(255, 255, 255, 0.5)' }}>ZONE: </strong>
            <span style={{ color: '#f8fafc' }}>{rover?.currentRoom || 'DOCK'}</span>
          </span>

          <span>
            <strong style={{ color: 'rgba(255, 255, 255, 0.5)' }}>SPD: </strong>
            <span style={{ color: isMoving ? '#10b981' : '#94a3b8' }}>
              {isMoving ? '0.35 m/s' : '0.00 m/s'}
            </span>
          </span>
        </div>

        {/* Battery & Obstacle Radar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
            <ShieldCheck size={13} />
            <span>RADAR: CLEAR</span>
          </span>

          <span>
            <strong style={{ color: 'rgba(255, 255, 255, 0.5)' }}>BATT: </strong>
            <span style={{ color: (rover?.batteryLevel ?? 100) > 30 ? '#10b981' : '#ef4444' }}>
              {rover?.batteryLevel ?? 100}%
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};
