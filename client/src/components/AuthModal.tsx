import { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { ShieldCheck, UserCheck, Stethoscope, Lock, Mail, ArrowRight, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { UserRole } from '../types.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { currentUser, quickLogin, login } = useAuth();
  const [activeTab, setActiveTab] = useState<'quick' | 'credentials'>('quick');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('hsl2026!');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await login(email, password);
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error || 'Login failed. Please check credentials.');
    } else {
      onClose();
    }
  };

  const handleQuickSwitch = async (role: UserRole) => {
    setError(null);
    setIsSubmitting(true);
    const success = await quickLogin(role);
    setIsSubmitting(false);
    if (success) {
      onClose();
    } else {
      setError(`Failed to switch to role ${role}`);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 10, 20, 0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'linear-gradient(180deg, hsl(222, 47%, 13%) 0%, hsl(222, 47%, 9%) 100%)',
        border: '1px solid hsl(215, 25%, 28%)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '560px',
        padding: '28px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px hsla(217, 91%, 60%, 0.15)',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShieldCheck size={20} color="#ffffff" />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Staff Authentication & Role Switcher
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: '0.825rem', color: 'hsl(215, 20%, 65%)' }}>
              ALEA Care Smart Rover Facility Operating System
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '8px',
              color: 'hsl(215, 20%, 65%)',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Buttons */}
        <div style={{
          display: 'flex',
          background: 'rgba(15, 23, 42, 0.6)',
          padding: '4px',
          borderRadius: '10px',
          marginBottom: '20px',
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('quick')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'quick' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'transparent',
              color: activeTab === 'quick' ? '#ffffff' : 'hsl(215, 20%, 65%)',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Sparkles size={14} />
            <span>1-Click Demo Profiles</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('credentials')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'credentials' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'transparent',
              color: activeTab === 'credentials' ? '#ffffff' : 'hsl(215, 20%, 65%)',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Lock size={14} />
            <span>Password Sign-In</span>
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '0.8rem',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        {/* Tab 1: 1-Click Role Switcher */}
        {activeTab === 'quick' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '0.75rem', color: 'hsl(215, 20%, 65%)', marginBottom: '2px' }}>
              Select a staff persona for live judging & demo dispatching:
            </div>

            {/* Admin Profile */}
            <div
              onClick={() => handleQuickSwitch('ADMIN')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '12px',
                background: currentUser?.role === 'ADMIN' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${currentUser?.role === 'ADMIN' ? '#a855f7' : 'hsl(215, 25%, 22%)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 15px rgba(168, 85, 247, 0.3)'
                }}>
                  <ShieldCheck size={22} color="#ffffff" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Dr. Robert Martinez</span>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(168, 85, 247, 0.2)',
                      color: '#d8b4fe',
                      border: '1px solid rgba(168, 85, 247, 0.3)'
                    }}>
                      ADMIN • ADM-001
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(215, 20%, 65%)', marginTop: '2px' }}>
                    Full Rover Estop/Overrides, Ledger Audits, System Settings
                  </div>
                </div>
              </div>
              {currentUser?.role === 'ADMIN' ? (
                <CheckCircle2 size={20} color="#a855f7" />
              ) : (
                <ArrowRight size={18} color="hsl(215, 20%, 50%)" />
              )}
            </div>

            {/* Nurse Profile */}
            <div
              onClick={() => handleQuickSwitch('NURSE')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '12px',
                background: currentUser?.role === 'NURSE' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${currentUser?.role === 'NURSE' ? '#38bdf8' : 'hsl(215, 25%, 22%)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 15px rgba(56, 189, 248, 0.3)'
                }}>
                  <Stethoscope size={22} color="#ffffff" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Nurse Sarah Jenkins</span>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(56, 189, 248, 0.2)',
                      color: '#7dd3fc',
                      border: '1px solid rgba(56, 189, 248, 0.3)'
                    }}>
                      NURSE • RN-402
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(215, 20%, 65%)', marginTop: '2px' }}>
                    Hero Delivery Dispatch, 5-Angle Biometrics, Vitals Tracking
                  </div>
                </div>
              </div>
              {currentUser?.role === 'NURSE' ? (
                <CheckCircle2 size={20} color="#38bdf8" />
              ) : (
                <ArrowRight size={18} color="hsl(215, 20%, 50%)" />
              )}
            </div>

            {/* Caregiver Profile */}
            <div
              onClick={() => handleQuickSwitch('CAREGIVER')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '12px',
                background: currentUser?.role === 'CAREGIVER' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${currentUser?.role === 'CAREGIVER' ? '#34d399' : 'hsl(215, 25%, 22%)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 15px rgba(52, 211, 153, 0.3)'
                }}>
                  <UserCheck size={22} color="#ffffff" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Alex Rivera</span>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(52, 211, 153, 0.2)',
                      color: '#a7f3d0',
                      border: '1px solid rgba(52, 211, 153, 0.3)'
                    }}>
                      CAREGIVER • CG-108
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(215, 20%, 65%)', marginTop: '2px' }}>
                    Assistance Responder, Resident Meals & Daily Activities
                  </div>
                </div>
              </div>
              {currentUser?.role === 'CAREGIVER' ? (
                <CheckCircle2 size={20} color="#34d399" />
              ) : (
                <ArrowRight size={18} color="hsl(215, 20%, 50%)" />
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Traditional Password Form */}
        {activeTab === 'credentials' && (
          <form onSubmit={handleCredentialLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                Staff Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="hsl(215, 20%, 50%)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@hsl.care or nurse@hsl.care"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    borderRadius: '8px',
                    border: '1px solid hsl(215, 25%, 25%)',
                    background: 'hsl(217, 33%, 12%)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="hsl(215, 20%, 50%)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    borderRadius: '8px',
                    border: '1px solid hsl(215, 25%, 25%)',
                    background: 'hsl(217, 33%, 12%)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>
              <span style={{ fontSize: '0.7rem', color: 'hsl(215, 20%, 55%)', marginTop: '4px', display: 'block' }}>
                Demo Master Password: <code style={{ color: '#38bdf8' }}>hsl2026!</code>
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                marginTop: '10px',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In with Credentials'}
            </button>
          </form>
        )}

        <div style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid hsl(215, 25%, 20%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: 'hsl(215, 20%, 55%)'
        }}>
          <span>Active Session: <strong style={{ color: '#ffffff' }}>{currentUser?.name || 'Guest'}</strong></span>
          <span style={{ color: '#38bdf8' }}>JWT Token Guarded 🛡️</span>
        </div>
      </div>
    </div>
  );
}
