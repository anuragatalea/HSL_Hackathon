import { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Bot, ShieldCheck, Stethoscope, UserCheck, Lock, Mail, ArrowRight, Home } from 'lucide-react';
import { UserRole } from '../types.js';

export function LoginPage() {
  const { loginStaff, quickLoginStaff, loginResident } = useAuth();
  const [activePortal, setActivePortal] = useState<'staff' | 'resident'>('staff');
  const [staffTab, setStaffTab] = useState<'quick' | 'credentials'>('quick');

  // Staff Credentials Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('hsl2026!');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resident Form State
  const [selectedRoom, setSelectedRoom] = useState('102');

  const handleStaffCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const res = await loginStaff(email, password);
    setIsSubmitting(false);
    if (!res.success) {
      setError(res.error || 'Invalid email or password.');
    }
  };

  const handleQuickStaffLogin = async (role: UserRole) => {
    setError(null);
    setIsSubmitting(true);
    const success = await quickLoginStaff(role);
    setIsSubmitting(false);
    if (!success) {
      setError(`Failed to sign in as ${role}`);
    }
  };

  const handleResidentLogin = async (residentIdOrRoom?: string) => {
    setError(null);
    setIsSubmitting(true);
    const success = await loginResident(residentIdOrRoom || selectedRoom);
    setIsSubmitting(false);
    if (!success) {
      setError('Resident profile not found.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 20%, hsl(222, 47%, 16%) 0%, hsl(222, 47%, 7%) 100%)',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Glow Orbs */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '20%',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, transparent 70%)',
        filter: 'blur(50px)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '20%',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 70%)',
        filter: 'blur(50px)',
        pointerEvents: 'none'
      }} />

      {/* Main Login Card */}
      <div style={{
        width: '100%',
        maxWidth: '560px',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid hsl(215, 25%, 25%)',
        borderRadius: '24px',
        padding: '36px 32px',
        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.7), 0 0 40px hsla(217, 91%, 60%, 0.12)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            boxShadow: '0 0 30px rgba(56, 189, 248, 0.45)'
          }}>
            <Bot size={34} color="#ffffff" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 900, letterSpacing: '-0.03em', margin: 0 }}>
              HSL CARE
            </h1>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '999px',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              textTransform: 'uppercase'
            }}>
              Smart Rover OS
            </span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'hsl(215, 20%, 65%)', margin: '8px 0 0 0' }}>
            Green Oaks Senior Living • Autonomous Caregiver & Resident Network
          </p>
        </div>

        {/* Portal Selector (Staff vs Resident) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          background: 'hsl(217, 33%, 12%)',
          padding: '6px',
          borderRadius: '14px',
          marginBottom: '24px',
          border: '1px solid hsl(215, 25%, 22%)'
        }}>
          <button
            type="button"
            onClick={() => { setActivePortal('staff'); setError(null); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 14px',
              borderRadius: '10px',
              border: 'none',
              background: activePortal === 'staff' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'transparent',
              color: activePortal === 'staff' ? '#ffffff' : 'hsl(215, 20%, 65%)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: activePortal === 'staff' ? '0 4px 12px rgba(2, 132, 199, 0.35)' : 'none'
            }}
          >
            <Stethoscope size={16} />
            <span>Staff Portal</span>
          </button>

          <button
            type="button"
            onClick={() => { setActivePortal('resident'); setError(null); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 14px',
              borderRadius: '10px',
              border: 'none',
              background: activePortal === 'resident' ? 'linear-gradient(135deg, #10b981 0%, #047857 100%)' : 'transparent',
              color: activePortal === 'resident' ? '#ffffff' : 'hsl(215, 20%, 65%)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: activePortal === 'resident' ? '0 4px 12px rgba(16, 185, 129, 0.35)' : 'none'
            }}
          >
            <Home size={16} />
            <span>Resident Portal</span>
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            borderRadius: '10px',
            padding: '10px 14px',
            fontSize: '0.825rem',
            marginBottom: '18px'
          }}>
            {error}
          </div>
        )}

        {/* -------------------- SECTION 1: STAFF PORTAL -------------------- */}
        {activePortal === 'staff' && (
          <div>
            {/* Sub-tabs: 1-Click vs Password */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '18px' }}>
              <button
                type="button"
                onClick={() => setStaffTab('quick')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: staffTab === 'quick' ? '#38bdf8' : 'hsl(215, 20%, 55%)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  borderBottom: staffTab === 'quick' ? '2px solid #38bdf8' : '2px solid transparent',
                  paddingBottom: '4px'
                }}
              >
                ⚡ 1-Click Demo Profiles (Judges)
              </button>
              <button
                type="button"
                onClick={() => setStaffTab('credentials')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: staffTab === 'credentials' ? '#38bdf8' : 'hsl(215, 20%, 55%)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  borderBottom: staffTab === 'credentials' ? '2px solid #38bdf8' : '2px solid transparent',
                  paddingBottom: '4px'
                }}
              >
                🔑 Password Login
              </button>
            </div>

            {/* 1-Click Staff Profiles */}
            {staffTab === 'quick' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Admin Persona */}
                <div
                  onClick={() => handleQuickStaffLogin('ADMIN')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'rgba(168, 85, 247, 0.08)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <ShieldCheck size={20} color="#ffffff" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Dr. Robert Martinez</span>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(168, 85, 247, 0.2)',
                          color: '#d8b4fe'
                        }}>
                          ADMIN • ADM-001
                        </span>
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'hsl(215, 20%, 65%)' }}>
                        Full Facility Command, Rover Overrides, Audit Ledger
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={16} color="#d8b4fe" />
                </div>

                {/* Nurse Persona */}
                <div
                  onClick={() => handleQuickStaffLogin('NURSE')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Stethoscope size={20} color="#ffffff" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Nurse Sarah Jenkins</span>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(56, 189, 248, 0.2)',
                          color: '#7dd3fc'
                        }}>
                          NURSE • RN-402
                        </span>
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'hsl(215, 20%, 65%)' }}>
                        Hero Delivery Dispatch, 5-Angle Biometrics, Vitals Tracking
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={16} color="#7dd3fc" />
                </div>

                {/* Caregiver Persona */}
                <div
                  onClick={() => handleQuickStaffLogin('CAREGIVER')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'rgba(52, 211, 153, 0.08)',
                    border: '1px solid rgba(52, 211, 153, 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <UserCheck size={20} color="#ffffff" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Alex Rivera</span>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(52, 211, 153, 0.2)',
                          color: '#a7f3d0'
                        }}>
                          CAREGIVER • CG-108
                        </span>
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'hsl(215, 20%, 65%)' }}>
                        Assistance Responder, Resident Daily Activities & Meals
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={16} color="#a7f3d0" />
                </div>
              </div>
            )}

            {/* Standard Credentials Form */}
            {staffTab === 'credentials' && (
              <form onSubmit={handleStaffCredentialSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px' }}>
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
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px' }}>
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
                    marginTop: '8px',
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    opacity: isSubmitting ? 0.7 : 1
                  }}
                >
                  {isSubmitting ? 'Authenticating...' : 'Sign In as Staff'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* -------------------- SECTION 2: RESIDENT PORTAL -------------------- */}
        {activePortal === 'resident' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                Senior Resident In-Room Tablet
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'hsl(215, 20%, 65%)', margin: '4px 0 0 0' }}>
                Select your resident profile to view your personal delivery schedule and care buttons:
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Mary Johnson (Hero) */}
              <div
                onClick={() => handleResidentLogin('102')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80"
                    alt="Mary Johnson"
                    style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #34d399' }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Mary Johnson</span>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: '#34d399',
                        color: '#064e3b'
                      }}>
                        Hero Room 102
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(215, 20%, 75%)', marginTop: '2px' }}>
                      Next Rover Delivery: 10:00 AM • Morning Cardiovascular Pack
                    </div>
                  </div>
                </div>
                <ArrowRight size={18} color="#34d399" />
              </div>

              {/* Robert Davis */}
              <div
                onClick={() => handleResidentLogin('101')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid hsl(215, 25%, 22%)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                    alt="Robert Davis"
                    style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Robert Davis</div>
                    <div style={{ fontSize: '0.725rem', color: 'hsl(215, 20%, 65%)' }}>Room 101 • Afternoon Hydration Pack</div>
                  </div>
                </div>
                <ArrowRight size={16} color="hsl(215, 20%, 50%)" />
              </div>

              {/* Room Number Selector Dropdown */}
              <div style={{
                marginTop: '10px',
                padding: '12px',
                background: 'hsl(217, 33%, 12%)',
                borderRadius: '10px',
                border: '1px solid hsl(215, 25%, 20%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{ fontSize: '0.75rem', color: 'hsl(215, 20%, 65%)' }}>Or enter Room Number:</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select
                    value={selectedRoom}
                    onChange={(e) => setSelectedRoom(e.target.value)}
                    style={{
                      background: '#020617',
                      color: '#ffffff',
                      border: '1px solid hsl(215, 25%, 30%)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.8rem'
                    }}
                  >
                    <option value="102">Room 102 (Mary)</option>
                    <option value="101">Room 101 (Robert)</option>
                    <option value="103">Room 103 (Eleanor)</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleResidentLogin(selectedRoom)}
                    style={{
                      background: '#10b981',
                      border: 'none',
                      color: '#ffffff',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Open
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid hsl(215, 25%, 18%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.725rem',
          color: 'hsl(215, 20%, 55%)'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
            PostgreSQL & WebSocket Live
          </span>
          <span style={{ color: '#38bdf8' }}>JWT Token Guarded 🛡️</span>
        </div>
      </div>
    </div>
  );
}
