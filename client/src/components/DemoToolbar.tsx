import React, { useState } from 'react';

interface DemoToolbarProps {
  onOpenPitchModal: () => void;
  onHeroResetComplete?: () => void;
}

export const DemoToolbar: React.FC<DemoToolbarProps> = ({
  onOpenPitchModal,
  onHeroResetComplete
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleHeroReset = async () => {
    try {
      setLoadingAction('reset');
      const res = await fetch('/api/rover/demo/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('⚡ Hero Reset Complete: Mary Johnson (Room 102) READY, Rover docked.');
        if (onHeroResetComplete) onHeroResetComplete();
      } else {
        showToast(`❌ Reset failed: ${data.error}`);
      }
    } catch (err: any) {
      showToast(`❌ Reset error: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleFastForwardSnooze = async () => {
    try {
      setLoadingAction('snooze');
      const res = await fetch('/api/rover/demo/fast-forward-snooze', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('⏩ Snooze Fast-Forwarded! Immediate retry dispatched to Room 102.');
      } else {
        showToast(`⚠️ ${data.error || 'No snoozed task currently active.'}`);
      }
    } catch (err: any) {
      showToast(`❌ Error: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSimulateAssistance = async () => {
    try {
      setLoadingAction('assist');
      const res = await fetch('/api/rover/demo/simulate-assistance', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('🚨 Simulated Nurse Call triggered for Room 102!');
      } else {
        showToast(`❌ Error: ${data.error}`);
      }
    } catch (err: any) {
      showToast(`❌ Error: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '18px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 900,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px'
    }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          background: 'hsl(222, 47%, 12%)',
          color: 'hsl(210, 40%, 98%)',
          border: '1px solid hsl(217, 91%, 60%)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), 0 0 16px hsla(217, 91%, 60%, 0.3)',
          borderRadius: '8px',
          padding: '8px 16px',
          fontSize: '13px',
          fontWeight: 600,
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          {toastMessage}
        </div>
      )}

      {/* Main Bar */}
      <div style={{
        background: 'linear-gradient(135deg, hsla(222, 47%, 11%, 0.94), hsla(222, 47%, 7%, 0.96))',
        backdropFilter: 'blur(12px)',
        border: '1px solid hsl(215, 25%, 26%)',
        borderRadius: '30px',
        padding: isMinimized ? '6px 14px' : '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6), 0 0 20px hsla(217, 91%, 60%, 0.15)',
        transition: 'all 0.3s ease'
      }}>
        {/* Presenter Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'hsl(142, 70%, 50%)',
            boxShadow: '0 0 8px hsl(142, 70%, 50%)'
          }} />
          <span style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'hsl(215, 20%, 75%)'
          }}>
            Presenter Dock
          </span>
        </div>

        {!isMinimized && (
          <>
            <div style={{ width: '1px', height: '18px', background: 'hsl(215, 25%, 25%)' }} />

            {/* 1-Click Hero Reset */}
            <button
              onClick={handleHeroReset}
              disabled={loadingAction === 'reset'}
              title="Resets Mary Johnson (Room 102) task to READY and docks Rover"
              style={{
                background: 'linear-gradient(135deg, hsl(217, 91%, 60%), hsl(222, 85%, 55%))',
                border: 'none',
                color: 'white',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 10px hsla(217, 91%, 60%, 0.3)',
                transition: 'transform 0.15s ease'
              }}
            >
              <span>⚡</span>
              <span>{loadingAction === 'reset' ? 'Resetting...' : '1-Click Hero Reset'}</span>
            </button>

            {/* Fast-Forward Snooze */}
            <button
              onClick={handleFastForwardSnooze}
              disabled={loadingAction === 'snooze'}
              title="Wakes up any snoozed task instantly and triggers immediate retry"
              style={{
                background: 'hsl(217, 33%, 18%)',
                border: '1px solid hsl(215, 25%, 32%)',
                color: 'hsl(210, 40%, 95%)',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>⏩</span>
              <span>Fast-Forward Snooze</span>
            </button>

            {/* Simulate Assistance */}
            <button
              onClick={handleSimulateAssistance}
              disabled={loadingAction === 'assist'}
              title="Triggers an urgent nurse assistance alert from Room 102"
              style={{
                background: 'hsl(217, 33%, 18%)',
                border: '1px solid hsl(215, 25%, 32%)',
                color: 'hsl(210, 40%, 95%)',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>🚨</span>
              <span>Test Alert</span>
            </button>

            {/* Judge Pitch Guide */}
            <button
              onClick={onOpenPitchModal}
              title="Opens step-by-step judge presentation script & ROI soundbites"
              style={{
                background: 'linear-gradient(135deg, hsl(265, 89%, 66%), hsl(285, 85%, 60%))',
                border: 'none',
                color: 'white',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 10px hsla(265, 89%, 66%, 0.3)'
              }}
            >
              <span>📋</span>
              <span>Judge Pitch Script</span>
            </button>
          </>
        )}

        {/* Minimize / Expand Toggle */}
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          title={isMinimized ? 'Expand Presenter Toolbar' : 'Minimize Toolbar'}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'hsl(215, 20%, 65%)',
            cursor: 'pointer',
            fontSize: '12px',
            padding: '4px'
          }}
        >
          {isMinimized ? '➕' : '➖'}
        </button>
      </div>
    </div>
  );
};
