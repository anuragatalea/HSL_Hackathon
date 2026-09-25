import { useState, useEffect } from 'react';
import { Bot, ShieldCheck, UserCheck, Stethoscope, Radio, Wifi, WifiOff, X, ChevronDown, LogOut } from 'lucide-react';
import { socket } from '../socket.js';
import { useAuth } from '../context/AuthContext.js';

interface HardwareStatus {
  mode: 'HARDWARE' | 'SIMULATION';
  isHardwareConnected: boolean;
  hardwareIp: string | null;
  lastHeartbeat: string | null;
  roverName: string;
  details: string;
}

interface HeaderProps {
  activeTab: 'dashboard' | 'schedules' | 'residents' | 'kiosk' | 'audit' | 'formulary';
  setActiveTab: (tab: 'dashboard' | 'schedules' | 'residents' | 'kiosk' | 'audit' | 'formulary') => void;
  onOpenSchedule?: () => void;
  currentRole: string;
  setCurrentRole: (role: string) => void;
}

export function Header({
  activeTab,
  setActiveTab,
  currentRole: _currentRole,
  setCurrentRole
}: HeaderProps) {
  const { currentUser, setIsAuthModalOpen, logout } = useAuth();
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [hardwareStatus, setHardwareStatus] = useState<HardwareStatus | null>(null);
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState(false);

  // Sync formatted staff string for legacy components
  useEffect(() => {
    if (currentUser) {
      setCurrentRole(`${currentUser.name} (${currentUser.badgeId || currentUser.role})`);
    }
  }, [currentUser, setCurrentRole]);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }
    function onDisconnect() {
      setIsConnected(false);
    }

    // Fetch initial connection status
    fetch('/api/rover/devices/connection/status')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          setHardwareStatus(json.data);
        }
      })
      .catch(console.error);

    function onHardwareStatus(data: HardwareStatus) {
      setHardwareStatus(data);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('rover:hardware_status', onHardwareStatus);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('rover:hardware_status', onHardwareStatus);
    };
  }, []);

  return (
    <header style={{
      background: 'rgba(10, 15, 29, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
      padding: '14px 28px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      flexWrap: 'wrap'
    }}>
      {/* Brand & Facility Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(56, 189, 248, 0.4)'
        }}>
          <Bot size={26} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              ALEA CARE
            </h1>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              textTransform: 'uppercase'
            }}>
              Smart Rover
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
            Green Oaks Senior Living • Wing A (13×20 ft Demo Grid)
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(15, 23, 42, 0.6)',
        padding: '4px',
        borderRadius: '10px',
        border: '1px solid var(--border-subtle)',
        gap: '4px'
      }}>
        {[
          { id: 'dashboard', label: '📊 Live Operations' },
          { id: 'schedules', label: '📅 Schedules' },
          { id: 'residents', label: '👥 Residents & Care' },
          { id: 'formulary', label: '💊 Formulary' },
          { id: 'kiosk', label: '📱 Bedside Kiosk' },
          { id: 'audit', label: '📜 Audit Log' }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                background: isActive ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? '0 2px 8px rgba(2, 132, 199, 0.3)' : 'none'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Right Controls: Connection, Role, & Schedule CTA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Rover Hardware Connection Pill */}
        <button
          onClick={() => setIsHardwareModalOpen(true)}
          title="Click to view Rover Hardware link diagnostics"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '999px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: hardwareStatus?.isHardwareConnected
              ? 'rgba(16, 185, 129, 0.15)'
              : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${
              hardwareStatus?.isHardwareConnected
                ? 'rgba(16, 185, 129, 0.4)'
                : 'rgba(239, 68, 68, 0.4)'
            }`,
            fontSize: '0.75rem',
            fontWeight: 600,
            color: hardwareStatus?.isHardwareConnected ? '#34d399' : '#f87171'
          }}
        >
          {hardwareStatus?.isHardwareConnected ? (
            <>
              <Wifi size={14} className="animate-pulse" />
              <span>UGV-Beast Online ({hardwareStatus.hardwareIp || 'Wi-Fi'})</span>
            </>
          ) : (
            <>
              <WifiOff size={14} />
              <span>UGV-Beast Offline</span>
            </>
          )}
        </button>

        {/* Server Connection status pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '999px',
          background: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          fontSize: '0.75rem',
          color: isConnected ? '#34d399' : '#f87171'
        }}>
          <Radio size={14} className={isConnected ? 'animate-pulse' : ''} />
          <span>{isConnected ? 'Socket.io Live' : 'Reconnecting...'}</span>
        </div>

        {/* Staff Identity & Role Switcher */}
        <button
          onClick={() => setIsAuthModalOpen(true)}
          title="Click to switch staff role or log in"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '5px 12px',
            borderRadius: '999px',
            border: `1px solid ${
              currentUser?.role === 'ADMIN'
                ? 'rgba(168, 85, 247, 0.4)'
                : currentUser?.role === 'NURSE'
                ? 'rgba(56, 189, 248, 0.4)'
                : 'rgba(52, 211, 153, 0.4)'
            }`,
            fontSize: '0.8rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            color: 'var(--text-primary)'
          }}
        >
          {currentUser?.role === 'ADMIN' ? (
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldCheck size={14} color="#ffffff" />
            </div>
          ) : currentUser?.role === 'NURSE' ? (
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Stethoscope size={14} color="#ffffff" />
            </div>
          ) : (
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UserCheck size={14} color="#ffffff" />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
            <span style={{ fontWeight: 700, fontSize: '0.78rem' }}>
              {currentUser?.name || 'Nurse Sarah Jenkins'}
            </span>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              color:
                currentUser?.role === 'ADMIN'
                  ? '#d8b4fe'
                  : currentUser?.role === 'NURSE'
                  ? '#7dd3fc'
                  : '#a7f3d0'
            }}>
              {currentUser?.role || 'NURSE'} • {currentUser?.badgeId || 'RN-402'}
            </span>
          </div>

          <ChevronDown size={14} color="hsl(215, 20%, 65%)" style={{ marginLeft: '4px' }} />
        </button>

        {/* Staff Sign Out Button */}
        <button
          onClick={logout}
          title="Sign out of staff portal"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <LogOut size={15} />
        </button>
      </div>

      {/* Hardware Diagnostics Modal */}
      {isHardwareModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 10, 20, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'hsl(222, 47%, 11%)',
            border: '1px solid hsl(215, 25%, 28%)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 30px hsla(217, 91%, 60%, 0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bot size={22} color="#38bdf8" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                  Rover Hardware Link Diagnostics
                </h3>
              </div>
              <button
                onClick={() => setIsHardwareModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'hsl(215, 20%, 65%)',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{
                background: 'hsl(217, 33%, 15%)',
                padding: '12px',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span style={{ color: 'hsl(215, 20%, 65%)' }}>Operation Mode:</span>
                <strong style={{ color: hardwareStatus?.mode === 'HARDWARE' ? '#38bdf8' : '#fbbf24' }}>
                  {hardwareStatus?.mode || 'SIMULATION'}
                </strong>
              </div>

              <div style={{
                background: 'hsl(217, 33%, 15%)',
                padding: '12px',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span style={{ color: 'hsl(215, 20%, 65%)' }}>Physical Robot Link:</span>
                <strong style={{
                  color: hardwareStatus?.isHardwareConnected
                    ? '#34d399'
                    : hardwareStatus?.mode === 'HARDWARE'
                    ? '#f87171'
                    : '#fbbf24'
                }}>
                  {hardwareStatus?.isHardwareConnected
                    ? 'CONNECTED (Waveshare UGV-Beast)'
                    : hardwareStatus?.mode === 'HARDWARE'
                    ? 'DISCONNECTED (Waiting for Pi)'
                    : 'VIRTUAL SIMULATOR (Kinematic Engine)'}
                </strong>
              </div>

              {hardwareStatus?.hardwareIp && (
                <div style={{
                  background: 'hsl(217, 33%, 15%)',
                  padding: '12px',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ color: 'hsl(215, 20%, 65%)' }}>Robot IP Address:</span>
                  <code style={{ color: '#38bdf8' }}>{hardwareStatus.hardwareIp}</code>
                </div>
              )}

              <div style={{
                background: 'hsl(217, 33%, 15%)',
                padding: '12px',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span style={{ color: 'hsl(215, 20%, 65%)' }}>Last Telemetry Sync:</span>
                <span style={{ color: 'hsl(210, 40%, 98%)' }}>
                  {hardwareStatus?.lastHeartbeat
                    ? new Date(hardwareStatus.lastHeartbeat).toLocaleTimeString()
                    : 'Never'}
                </span>
              </div>

              <div style={{
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                padding: '12px',
                borderRadius: '8px'
              }}>
                <div style={{ fontWeight: 600, color: '#38bdf8', marginBottom: '6px' }}>
                  💡 How to Connect the Physical Robot:
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'hsl(215, 20%, 80%)', lineHeight: '1.4' }}>
                  1. Set <code style={{ color: '#38bdf8' }}>ROVER_MODE=HARDWARE</code> in <code style={{ color: '#38bdf8' }}>server/.env</code>.<br />
                  2. SSH into your Raspberry Pi on the robot and run:
                </p>
                <div style={{
                  background: '#020617',
                  padding: '8px',
                  borderRadius: '6px',
                  marginTop: '8px',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: '#34d399'
                }}>
                  python3 rover_client.py --server http://&lt;YOUR_LAPTOP_IP&gt;:4000
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                onClick={() => setIsHardwareModalOpen(false)}
                style={{
                  background: '#38bdf8',
                  border: 'none',
                  color: '#0f172a',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Close Diagnostics
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

