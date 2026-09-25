import { useState, useEffect, useCallback } from 'react';
import { FacilityFloorplanSVG } from './FacilityFloorplanSVG.js';
import { RoverDevice, RoverTask } from '../types.js';
import { socket } from '../socket.js';
import { Play, RotateCcw, ShieldAlert, CheckCircle2, Circle, Navigation, Activity, LayoutGrid, Map, Video, PictureInPicture } from 'lucide-react';
import { RoverCameraFeed } from './RoverCameraFeed.js';

interface MissionMonitorProps {
  currentRole: string;
}

export function MissionMonitor({ currentRole }: MissionMonitorProps) {
  const [rover, setRover] = useState<RoverDevice | null>(null);
  const [tasks, setTasks] = useState<RoverTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewLayout, setViewLayout] = useState<'split' | 'map' | 'cam' | 'pip'>('split');

  const fetchData = useCallback(async () => {
    try {
      const [devRes, taskRes] = await Promise.all([
        fetch('/api/rover/devices'),
        fetch('/api/rover/tasks')
      ]);
      const devJson = await devRes.json();
      const taskJson = await taskRes.json();
      if (devJson.success && devJson.data.length > 0) setRover(devJson.data[0]);
      if (taskJson.success) setTasks(taskJson.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchData();

    function onTelemetry(updatedRover: RoverDevice) {
      setRover(prev => (prev?.id === updatedRover.id ? { ...prev, ...updatedRover } : updatedRover));
    }

    function onTaskUpdated(updatedTask: RoverTask) {
      setTasks(prev => {
        const index = prev.findIndex(t => t.id === updatedTask.id);
        if (index >= 0) {
          const clone = [...prev];
          clone[index] = { ...clone[index], ...updatedTask };
          return clone;
        }
        return [updatedTask, ...prev];
      });
    }

    socket.on('rover:telemetry', onTelemetry);
    socket.on('task:updated', onTaskUpdated);

    return () => {
      socket.off('rover:telemetry', onTelemetry);
      socket.off('task:updated', onTaskUpdated);
    };
  }, [fetchData]);

  // Find active task or Hero task
  const activeTask = tasks.find(
    t => t.status === 'DISPATCHED' || t.status === 'EN_ROUTE' || t.status === 'ARRIVED' || t.status === 'AWAITING_CONFIRMATION'
  ) || tasks.find(t => t.resident?.roomNumber === '102') || tasks[0] || null;

  const handleDispatchHero = async () => {
    if (!activeTask) return;
    setLoading(true);
    try {
      await fetch(`/api/rover/tasks/${activeTask.id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: currentRole })
      });
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToDock = async () => {
    if (!rover) return;
    setLoading(true);
    try {
      await fetch(`/api/rover/devices/${rover.id}/return-to-dock`, { method: 'POST' });
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEstop = async () => {
    if (!rover) return;
    setLoading(true);
    try {
      await fetch(`/api/rover/devices/${rover.id}/estop`, { method: 'POST' });
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Determine active progression step
  const getStepStatus = (stepIndex: number) => {
    if (!activeTask) return 'pending';
    const s = activeTask.status;

    if (stepIndex === 1) {
      // Step 1: Dispatched
      return s !== 'READY' && s !== 'SCHEDULED' ? 'completed' : 'active';
    }
    if (stepIndex === 2) {
      // Step 2: En Route
      if (s === 'EN_ROUTE') return 'active';
      if (s === 'ARRIVED' || s === 'AWAITING_CONFIRMATION' || s === 'COMPLETED' || s === 'SNOOZED') return 'completed';
      return 'pending';
    }
    if (stepIndex === 3) {
      // Step 3: Arrived
      if (s === 'ARRIVED' || s === 'AWAITING_CONFIRMATION') return 'active';
      if (s === 'COMPLETED' || s === 'SNOOZED') return 'completed';
      return 'pending';
    }
    if (stepIndex === 4) {
      // Step 4: Confirmed
      if (s === 'COMPLETED') return 'completed';
      return 'pending';
    }
    return 'pending';
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '24px', alignItems: 'start' }}>
      {/* Left Canvas: Interactive 2D Digital Twin & FPV Camera */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '14px'
        }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
              Live Facility Digital Twin
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Real-time spatial telemetry across taped corridor & room waypoints
            </p>
          </div>

          {/* View Mode Layout Switcher */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '12px',
            padding: '3px',
            gap: '3px'
          }}>
            <button
              onClick={() => setViewLayout('split')}
              style={{
                background: viewLayout === 'split' ? '#38bdf8' : 'transparent',
                color: viewLayout === 'split' ? '#0f172a' : '#94a3b8',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <LayoutGrid size={13} />
              <span>Split View</span>
            </button>

            <button
              onClick={() => setViewLayout('map')}
              style={{
                background: viewLayout === 'map' ? '#38bdf8' : 'transparent',
                color: viewLayout === 'map' ? '#0f172a' : '#94a3b8',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Map size={13} />
              <span>2D CAD Map</span>
            </button>

            <button
              onClick={() => setViewLayout('cam')}
              style={{
                background: viewLayout === 'cam' ? '#38bdf8' : 'transparent',
                color: viewLayout === 'cam' ? '#0f172a' : '#94a3b8',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Video size={13} />
              <span>FPV Cam</span>
            </button>

            <button
              onClick={() => setViewLayout('pip')}
              style={{
                background: viewLayout === 'pip' ? '#38bdf8' : 'transparent',
                color: viewLayout === 'pip' ? '#0f172a' : '#94a3b8',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <PictureInPicture size={13} />
              <span>PIP</span>
            </button>
          </div>
        </div>

        {/* Dynamic Display based on viewLayout */}
        <div style={{ position: 'relative' }}>
          {viewLayout === 'split' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <FacilityFloorplanSVG rover={rover} activeTask={activeTask} />
              <RoverCameraFeed rover={rover} activeTask={activeTask} height="320px" />
            </div>
          )}

          {viewLayout === 'map' && (
            <FacilityFloorplanSVG rover={rover} activeTask={activeTask} />
          )}

          {viewLayout === 'cam' && (
            <RoverCameraFeed rover={rover} activeTask={activeTask} height="520px" />
          )}

          {viewLayout === 'pip' && (
            <div style={{ position: 'relative' }}>
              <FacilityFloorplanSVG rover={rover} activeTask={activeTask} />
              <div style={{
                position: 'absolute',
                bottom: '16px',
                right: '16px',
                width: '320px',
                zIndex: 30,
                boxShadow: '0 12px 35px rgba(0, 0, 0, 0.7)',
                borderRadius: '14px',
                border: '1px solid #38bdf8'
              }}>
                <RoverCameraFeed rover={rover} activeTask={activeTask} height="190px" isCompact />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right HUD: Telemetry & Mission Progression */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Active Mission HUD Card */}
        <div className="glass-panel" style={{ padding: '20px', borderTop: '3px solid #38bdf8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Navigation size={18} color="#38bdf8" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Mission Status</h3>
          </div>

          {activeTask ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Target Resident</span>
                <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.9rem' }}>
                  {activeTask.resident.name}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Destination</span>
                <span style={{ fontWeight: 700, color: '#38bdf8' }}>
                  Room {activeTask.resident.roomNumber}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Package</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', maxWidth: '160px', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeTask.schedule?.itemName || 'Daily Care Pack'}
                </span>
              </div>

              {/* Mission Progression Stepper */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>
                  Delivery Progress
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { step: 1, title: 'Dispatched from Dock' },
                    { step: 2, title: 'Navigating Corridor' },
                    { step: 3, title: 'Arrived at Resident Room' },
                    { step: 4, title: 'Confirmed & Complete' }
                  ].map(item => {
                    const status = getStepStatus(item.step);
                    return (
                      <div key={item.step} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {status === 'completed' ? (
                          <CheckCircle2 size={16} color="#10b981" />
                        ) : status === 'active' ? (
                          <Activity size={16} color="#38bdf8" className="animate-pulse" />
                        ) : (
                          <Circle size={16} color="#475569" />
                        )}
                        <span style={{
                          fontSize: '0.8rem',
                          fontWeight: status === 'active' ? 700 : 500,
                          color: status === 'completed' ? '#94a3b8' : status === 'active' ? '#38bdf8' : '#64748b'
                        }}>
                          {item.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No active task.</p>
          )}
        </div>

        {/* Live Spatial Telemetry HUD */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px' }}>
            Spatial Telemetry HUD
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.8rem' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>X-COORDINATE</span>
              <strong style={{ fontSize: '1rem', color: '#38bdf8' }}>{rover?.currentX.toFixed(2)} m</strong>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Y-COORDINATE</span>
              <strong style={{ fontSize: '1rem', color: '#38bdf8' }}>{rover?.currentY.toFixed(2)} m</strong>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>VELOCITY</span>
              <strong style={{ fontSize: '1rem', color: '#10b981' }}>
                {rover?.status === 'MOVING' || rover?.status === 'RETURNING' ? '0.35 m/s' : '0.00 m/s'}
              </strong>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>BATTERY</span>
              <strong style={{ fontSize: '1rem', color: '#f59e0b' }}>{rover?.batteryLevel ?? 100}%</strong>
            </div>
          </div>
        </div>

        {/* Live Presentation Override Actions */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0 }}>
            Judge Presentation Controls
          </p>

          <button
            onClick={handleDispatchHero}
            disabled={loading || !activeTask || activeTask.status !== 'READY'}
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
          >
            <Play size={16} />
            <span>Dispatch to Room 102 (Hero)</span>
          </button>

          <button
            onClick={handleReturnToDock}
            disabled={loading || rover?.status === 'IDLE'}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
          >
            <RotateCcw size={16} />
            <span>Force Return to Dock</span>
          </button>

          <button
            onClick={handleEstop}
            disabled={loading || rover?.status === 'ESTOP'}
            className="btn btn-danger"
            style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
          >
            <ShieldAlert size={16} />
            <span>Emergency Stop</span>
          </button>
        </div>
      </div>
    </div>
  );
}
