import { useState, useEffect } from 'react';
import { CheckCircle, BellRing } from 'lucide-react';
import { socket } from '../socket.js';
import { ResidentAssistance } from '../types.js';

export function AssistanceAlertBanner() {
  const [activeAlert, setActiveAlert] = useState<ResidentAssistance | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Listen for real-time WebSocket alerts
    socket.on('assistance:alert', (alert: ResidentAssistance) => {
      setActiveAlert(alert);
      console.log('🚨 Caregiver Station received real-time resident alert:', alert);
    });

    return () => {
      socket.off('assistance:alert');
    };
  }, []);

  const handleAcknowledge = async () => {
    if (!activeAlert) return;
    setLoading(true);
    try {
      await fetch(`/api/rover/assistance/${activeAlert.id}/acknowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: 'Nurse Sarah Jenkins (RN-402)' })
      });
      setActiveAlert(null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!activeAlert) return null;

  const isRoverDispatched = activeAlert.roverDispatched === true;

  return (
    <div style={{
      background: isRoverDispatched
        ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.18) 0%, rgba(2, 132, 199, 0.25) 100%)'
        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(185, 28, 28, 0.3) 100%)',
      border: `1px solid ${isRoverDispatched ? 'rgba(56, 189, 248, 0.6)' : 'rgba(239, 68, 68, 0.6)'}`,
      borderRadius: '14px',
      padding: '16px 24px',
      marginBottom: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: isRoverDispatched
        ? '0 0 25px rgba(56, 189, 248, 0.2)'
        : '0 0 35px rgba(239, 68, 68, 0.3)',
      animation: isRoverDispatched ? 'none' : 'pulse-glow 1.8s infinite ease-in-out'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: isRoverDispatched ? '#0284c7' : '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isRoverDispatched ? '0 0 15px rgba(56, 189, 248, 0.5)' : '0 0 15px rgba(239, 68, 68, 0.6)'
        }}>
          <BellRing size={22} color="#ffffff" className={isRoverDispatched ? '' : 'animate-bounce'} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '0.95rem',
              fontWeight: 800,
              color: isRoverDispatched ? '#7dd3fc' : '#fca5a5',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              {isRoverDispatched
                ? `Room ${activeAlert.roomId} Assistance Call — Rover-01 Dispatched`
                : `🚨 Urgent: Rover Busy — Nurse Response Required!`}
            </span>
            <span style={{
              fontSize: '0.72rem',
              padding: '2px 8px',
              borderRadius: '999px',
              background: isRoverDispatched ? 'rgba(56, 189, 248, 0.3)' : '#ef4444',
              color: isRoverDispatched ? '#38bdf8' : '#ffffff',
              fontWeight: 700,
              border: isRoverDispatched ? '1px solid rgba(56, 189, 248, 0.5)' : 'none'
            }}>
              {isRoverDispatched ? 'Autonomous First Responder' : 'High Priority Staff Escalation'}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: isRoverDispatched ? '#e0f2fe' : '#fecaca', margin: '4px 0 0 0' }}>
            {isRoverDispatched ? (
              <>
                <strong>{activeAlert.resident?.name || 'Resident'}</strong> in Room {activeAlert.roomId} called for help. 
                Rover-01 is actively navigating to the room to provide visual check-in and audio presence.
              </>
            ) : (
              <>
                <strong>{activeAlert.resident?.name || 'Resident'}</strong> in Room {activeAlert.roomId} requested assistance! 
                <span style={{ fontWeight: 700, color: '#fef08a' }}> {activeAlert.busyReason || 'Rover is busy with another patient'}</span>. 
                Physical nurse response is required immediately!
              </>
            )}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={handleAcknowledge}
          disabled={loading}
          className="btn btn-primary"
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
            padding: '8px 16px',
            fontSize: '0.85rem'
          }}
        >
          <CheckCircle size={16} />
          <span>{isRoverDispatched ? 'Acknowledge Mission' : 'Acknowledge & Respond'}</span>
        </button>
        <button
          onClick={() => setActiveAlert(null)}
          className="btn btn-secondary"
          style={{ padding: '8px 12px', fontSize: '0.85rem' }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
