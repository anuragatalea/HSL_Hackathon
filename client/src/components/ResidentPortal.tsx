import { useState, useEffect } from 'react';
import { Resident } from '../types.js';
import { Bot, BellRing, Activity, Clock, LogOut, CheckCircle2, ShieldCheck, PhoneCall } from 'lucide-react';
import { socket } from '../socket.js';

interface ResidentPortalProps {
  resident: Resident;
  onLogout: () => void;
}

export function ResidentPortal({ resident, onLogout }: ResidentPortalProps) {
  const [assistanceStatus, setAssistanceStatus] = useState<string | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen for assistance acknowledgement via socket
  useEffect(() => {
    function onAssistanceUpdate(data: any) {
      if (data?.residentId === resident.id) {
        if (data.status === 'ACKNOWLEDGED') {
          setAssistanceStatus('A caregiver has acknowledged your call and is responding!');
        } else if (data.status === 'RESOLVED') {
          setAssistanceStatus(null);
        }
      }
    }

    socket.on('assistance:acknowledged', onAssistanceUpdate);
    socket.on('assistance:resolved', onAssistanceUpdate);

    return () => {
      socket.off('assistance:acknowledged', onAssistanceUpdate);
      socket.off('assistance:resolved', onAssistanceUpdate);
    };
  }, [resident.id]);

  const handleRequestAssistance = async () => {
    setIsCalling(true);
    try {
      const res = await fetch('/api/rover/assistance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residentId: resident.id,
          roomId: resident.roomNumber,
          requestType: 'IN_ROOM_ASSISTANCE',
          notes: `Requested via In-Room Resident Tablet by ${resident.name}`
        })
      });
      const data = await res.json();
      if (data.success) {
        setAssistanceStatus('Call Sent! Rover & Caregivers alerted.');
      }
    } catch (err) {
      console.error('Assistance call error:', err);
    } finally {
      setIsCalling(false);
    }
  };

  const activeSchedule = resident.schedules && resident.schedules.length > 0 ? resident.schedules[0] : null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'hsl(222, 47%, 9%)',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Top Tablet Header */}
      <header style={{
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid hsl(215, 25%, 22%)',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src={resident.photoUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80'}
            alt={resident.name}
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid #38bdf8'
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
                Welcome, {resident.name}
              </h1>
              <span style={{
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '999px'
              }}>
                Room {resident.roomNumber}
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'hsl(215, 20%, 65%)' }}>
              Green Oaks Senior Living • In-Room Resident Companion
            </p>
          </div>
        </div>

        {/* Right Info: Clock & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'hsl(217, 33%, 14%)',
            padding: '8px 16px',
            borderRadius: '999px',
            border: '1px solid hsl(215, 25%, 25%)',
            fontSize: '1rem',
            fontWeight: 700
          }}>
            <Clock size={18} color="#38bdf8" />
            <span>{currentTime}</span>
          </div>

          <button
            onClick={onLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <LogOut size={16} />
            <span>Exit Portal</span>
          </button>
        </div>
      </header>

      {/* Main Tablet Content */}
      <main style={{ flex: 1, padding: '32px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Assistance Alert Status Banner */}
        {assistanceStatus && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.2) 100%)',
            border: '2px solid #10b981',
            borderRadius: '16px',
            padding: '18px 24px',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 0 25px rgba(16, 185, 129, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                background: '#10b981',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle2 size={24} color="#064e3b" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
                  {assistanceStatus}
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#a7f3d0' }}>
                  A caregiver and Smart Rover have received your notification and are on the way.
                </p>
              </div>
            </div>
            <button
              onClick={() => setAssistanceStatus(null)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#ffffff',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          {/* Card 1: Rover Delivery Status */}
          <div style={{
            background: 'hsl(217, 33%, 12%)',
            border: '1px solid hsl(215, 25%, 25%)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
                  padding: '8px',
                  borderRadius: '10px'
                }}>
                  <Bot size={22} color="#ffffff" />
                </div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                  Upcoming Rover Delivery
                </h2>
              </div>
              <span style={{
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '999px',
                border: '1px solid rgba(56, 189, 248, 0.3)'
              }}>
                Rover-01 Assigned
              </span>
            </div>

            {activeSchedule ? (
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8', marginBottom: '6px' }}>
                  {activeSchedule.itemName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'hsl(215, 20%, 75%)', fontSize: '0.9rem', marginBottom: '16px' }}>
                  <Clock size={16} />
                  <span>Scheduled Time: <strong>{activeSchedule.scheduledTime} AM</strong> (Every morning)</span>
                </div>

                <div style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid hsl(215, 25%, 20%)',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'hsl(215, 20%, 65%)', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Package Contents
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={16} color="#34d399" />
                      <span>Metformin 500 mg (Breakfast blister)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={16} color="#34d399" />
                      <span>Lisinopril 10 mg (Blood pressure)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={16} color="#34d399" />
                      <span>Aspirin 81 mg (Chewable cardiac dose)</span>
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.8rem',
                  color: '#34d399',
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(16, 185, 129, 0.25)'
                }}>
                  <ShieldCheck size={16} />
                  <span>Biometrics verified: Face recognition opens compartment upon arrival</span>
                </div>
              </div>
            ) : (
              <p style={{ color: 'hsl(215, 20%, 65%)', fontSize: '0.9rem' }}>
                No active delivery scheduled at this hour.
              </p>
            )}
          </div>

          {/* Card 2: 🚨 Call Caregiver & Assistance */}
          <div style={{
            background: 'hsl(217, 33%, 12%)',
            border: '1px solid hsl(215, 25%, 25%)',
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                  padding: '8px',
                  borderRadius: '10px'
                }}>
                  <BellRing size={22} color="#ffffff" />
                </div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                  Caregiver & Rover Assistance
                </h2>
              </div>
              <p style={{ color: 'hsl(215, 20%, 75%)', fontSize: '0.875rem', lineHeight: 1.5, margin: '0 0 20px 0' }}>
                Need help with mobility, water refill, comfort items, or clinical attention? Press below to alert Nurse Sarah and Rover-01 to your room.
              </p>
            </div>

            <button
              onClick={handleRequestAssistance}
              disabled={isCalling}
              style={{
                width: '100%',
                padding: '20px',
                borderRadius: '16px',
                border: 'none',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#ffffff',
                fontSize: '1.1rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                boxShadow: '0 8px 25px rgba(239, 68, 68, 0.45)',
                transition: 'transform 0.15s ease',
                opacity: isCalling ? 0.7 : 1
              }}
            >
              <PhoneCall size={26} />
              <span>{isCalling ? 'Sending Alert...' : 'Call Caregiver to Room 102'}</span>
            </button>
          </div>
        </div>

        {/* Section 2: Health Vitals & Daily Routine */}
        <div style={{ marginTop: '28px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="#34d399" />
            <span>My Health Vitals Recorded by Staff</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{
              background: 'hsl(217, 33%, 12%)',
              padding: '18px',
              borderRadius: '14px',
              border: '1px solid hsl(215, 25%, 22%)'
            }}>
              <div style={{ fontSize: '0.75rem', color: 'hsl(215, 20%, 65%)', fontWeight: 600 }}>Blood Pressure</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#38bdf8', marginTop: '4px' }}>122 / 78</div>
              <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '2px' }}>Normal Range (mmHg)</div>
            </div>

            <div style={{
              background: 'hsl(217, 33%, 12%)',
              padding: '18px',
              borderRadius: '14px',
              border: '1px solid hsl(215, 25%, 22%)'
            }}>
              <div style={{ fontSize: '0.75rem', color: 'hsl(215, 20%, 65%)', fontWeight: 600 }}>Heart Rate</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f43f5e', marginTop: '4px' }}>72 bpm</div>
              <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '2px' }}>Resting Rhythm Stable</div>
            </div>

            <div style={{
              background: 'hsl(217, 33%, 12%)',
              padding: '18px',
              borderRadius: '14px',
              border: '1px solid hsl(215, 25%, 22%)'
            }}>
              <div style={{ fontSize: '0.75rem', color: 'hsl(215, 20%, 65%)', fontWeight: 600 }}>Oxygen Level</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981', marginTop: '4px' }}>98%</div>
              <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '2px' }}>Optimal SpO2</div>
            </div>

            <div style={{
              background: 'hsl(217, 33%, 12%)',
              padding: '18px',
              borderRadius: '14px',
              border: '1px solid hsl(215, 25%, 22%)'
            }}>
              <div style={{ fontSize: '0.75rem', color: 'hsl(215, 20%, 65%)', fontWeight: 600 }}>Blood Sugar</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fbbf24', marginTop: '4px' }}>104 mg/dL</div>
              <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '2px' }}>Post-Breakfast Stable</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
