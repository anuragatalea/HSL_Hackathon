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

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(185, 28, 28, 0.25) 100%)',
      border: '1px solid rgba(239, 68, 68, 0.5)',
      borderRadius: '12px',
      padding: '16px 24px',
      marginBottom: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 0 30px rgba(239, 68, 68, 0.25)',
      animation: 'pulse-glow 2s infinite ease-in-out'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '10px',
          background: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px rgba(239, 68, 68, 0.5)'
        }}>
          <BellRing size={22} color="#ffffff" className="animate-bounce" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Urgent Resident Assistance Call
            </span>
            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '999px', background: '#ef4444', color: '#ffffff', fontWeight: 700 }}>
              Live Alert
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#fecaca', margin: '4px 0 0 0' }}>
            <strong>{activeAlert.resident?.name || 'Resident'}</strong> in Room {activeAlert.roomId} has requested caregiver help from Rover-01.
            {activeAlert.notes && <span style={{ opacity: 0.85 }}> ({activeAlert.notes})</span>}
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
          <span>Acknowledge & Attend</span>
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
