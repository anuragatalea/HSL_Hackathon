import { useState, useEffect } from 'react';
import { Bot, MapPin, Gauge, ShieldAlert, RotateCcw, Zap, Video } from 'lucide-react';
import { RoverDevice, RoverTask } from '../types.js';
import { RoverCameraFeed } from './RoverCameraFeed.js';
import { socket } from '../socket.js';

interface RoverHeroCardProps {
  rover: RoverDevice | null;
  activeTask: RoverTask | null;
  onRefresh: () => void;
}

export function RoverHeroCard({ rover, activeTask, onRefresh }: RoverHeroCardProps) {
  const [loading, setLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [hardwareStatus, setHardwareStatus] = useState<any>(null);

  useEffect(() => {
    fetch('/api/rover/devices/connection/status')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) setHardwareStatus(json.data);
      })
      .catch(console.error);

    function onHwStatus(data: any) {
      setHardwareStatus(data);
    }

    socket.on('rover:hardware_status', onHwStatus);
    return () => {
      socket.off('rover:hardware_status', onHwStatus);
    };
  }, []);

  const handleReturnToDock = async () => {
    if (!rover) return;
    setLoading(true);
    try {
      await fetch(`/api/rover/devices/${rover.id}/return-to-dock`, { method: 'POST' });
      onRefresh();
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
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const isMoving = rover?.status === 'MOVING' || rover?.status === 'RETURNING';

  return (
    <div className="glass-panel" style={{
      padding: '24px',
      marginBottom: '24px',
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)',
      border: '1px solid rgba(56, 189, 248, 0.2)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Left: Rover Info & Live Telemetry */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 25px rgba(56, 189, 248, 0.35)'
          }}>
            <Bot size={32} color="#ffffff" className={isMoving ? 'animate-pulse' : ''} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
                {rover?.name || 'Rover-01'}
              </h2>
              <span className={`badge ${
                rover?.status === 'MOVING' ? 'badge-moving' :
                rover?.status === 'ARRIVED' ? 'badge-arrived' :
                rover?.status === 'RETURNING' ? 'badge-moving' :
                rover?.status === 'ESTOP' ? 'badge-escalated' : 'badge-docked'
              }`}>
                {rover?.status || 'IDLE'}
              </span>

              {/* Hardware Connection Link Badge */}
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background:
                  hardwareStatus?.mode === 'HARDWARE'
                    ? hardwareStatus.isHardwareConnected
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(239, 68, 68, 0.15)'
                    : 'rgba(245, 158, 11, 0.15)',
                border: `1px solid ${
                  hardwareStatus?.mode === 'HARDWARE'
                    ? hardwareStatus.isHardwareConnected
                      ? 'rgba(16, 185, 129, 0.4)'
                      : 'rgba(239, 68, 68, 0.4)'
                    : 'rgba(245, 158, 11, 0.35)'
                }`,
                color:
                  hardwareStatus?.mode === 'HARDWARE'
                    ? hardwareStatus.isHardwareConnected
                      ? '#34d399'
                      : '#f87171'
                    : '#fbbf24'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor:
                    hardwareStatus?.mode === 'HARDWARE'
                      ? hardwareStatus.isHardwareConnected
                        ? '#10b981'
                        : '#ef4444'
                      : '#f59e0b',
                  boxShadow:
                    hardwareStatus?.mode === 'HARDWARE' && hardwareStatus.isHardwareConnected
                      ? '0 0 6px #10b981'
                      : 'none'
                }} />
                <span>
                  {hardwareStatus?.mode === 'HARDWARE'
                    ? hardwareStatus.isHardwareConnected
                      ? `UGV-Beast Connected (${hardwareStatus.hardwareIp || 'Online'})`
                      : 'UGV-Beast Offline'
                    : 'Virtual Twin (Sim Mode)'}
                </span>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={14} color="#38bdf8" />
                <span>Pos: ({rover?.currentX.toFixed(1)}m, {rover?.currentY.toFixed(1)}m) • {rover?.currentRoom || 'DOCK'}</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Gauge size={14} color="#10b981" />
                <span>Speed: {isMoving ? '0.35 m/s' : '0.00 m/s'}</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Zap size={14} color="#f59e0b" />
                <span>Battery: {rover?.batteryLevel ?? 100}%</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Live Rover Camera Toggle Button */}
          <button
            onClick={() => setIsCameraOpen(!isCameraOpen)}
            className="btn btn-primary"
            style={{
              padding: '8px 16px',
              fontSize: '0.85rem',
              background: isCameraOpen ? 'hsl(217, 91%, 60%)' : 'rgba(56, 189, 248, 0.15)',
              border: '1px solid #38bdf8',
              color: '#ffffff',
              boxShadow: isCameraOpen ? '0 0 15px rgba(56, 189, 248, 0.4)' : 'none'
            }}
          >
            <Video size={16} />
            <span>{isCameraOpen ? 'Hide Camera' : 'Live Rover Cam'}</span>
          </button>

          <button
            onClick={handleReturnToDock}
            disabled={loading || rover?.status === 'IDLE'}
            className="btn btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <RotateCcw size={16} />
            <span>Return to Dock</span>
          </button>

          <button
            onClick={handleEstop}
            disabled={loading || rover?.status === 'ESTOP'}
            className="btn btn-danger"
            style={{ padding: '8px 16px', fontSize: '0.85rem', boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)' }}
          >
            <ShieldAlert size={16} />
            <span>Emergency Stop</span>
          </button>
        </div>
      </div>

      {/* Expandable Live Camera Feed Drawer */}
      {isCameraOpen && (
        <div style={{ marginTop: '20px', animation: 'fadeIn 0.25s ease-in-out' }}>
          <RoverCameraFeed
            rover={rover}
            activeTask={activeTask}
            height="360px"
          />
        </div>
      )}


      {/* Active Mission Banner (if executing a delivery) */}
      {activeTask && (
        <div style={{
          marginTop: '18px',
          padding: '12px 18px',
          borderRadius: '10px',
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="ping-indicator">
              <span className="ping" style={{ backgroundColor: '#38bdf8' }} />
              <span className="dot" style={{ backgroundColor: '#38bdf8' }} />
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Active Care Mission: <span style={{ color: '#38bdf8' }}>{activeTask.resident.name}</span> in Room {activeTask.resident.roomNumber}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              ({activeTask.schedule?.itemName || 'Medical Package'})
            </span>
          </div>

          <span className="badge badge-ready">
            {activeTask.status}
          </span>
        </div>
      )}
    </div>
  );
}
