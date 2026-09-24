import { useState, useEffect } from 'react';
import {
  Users,
  Scan,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  Building
} from 'lucide-react';
import { Resident } from '../types.js';
import { FaceEnrollmentStudioModal } from './FaceEnrollmentStudioModal.js';
import { socket } from '../socket.js';

interface ResidentsManagementProps {
  currentRole: string;
  onNavigateToSchedules?: () => void;
}

export function ResidentsManagement({ currentRole }: ResidentsManagementProps) {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResidentForEnroll, setSelectedResidentForEnroll] = useState<Resident | null>(null);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

  const fetchResidents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/rover/residents');
      const json = await res.json();
      if (json.success) {
        setResidents(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch residents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResidents();

    socket.on('resident:enrolled', fetchResidents);
    socket.on('resident:updated', fetchResidents);

    return () => {
      socket.off('resident:enrolled', fetchResidents);
      socket.off('resident:updated', fetchResidents);
    };
  }, []);

  const filteredResidents = residents.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.roomNumber.toLowerCase().includes(q) ||
      (r.notes && r.notes.toLowerCase().includes(q))
    );
  });

  const handleOpenEnrollment = (resident: Resident) => {
    setSelectedResidentForEnroll(resident);
    setIsEnrollModalOpen(true);
  };

  const handleEnrollmentSuccess = (updated: Resident) => {
    setResidents((prev) =>
      prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
    );
  };

  const enrolledCount = residents.filter((r) => r.isEnrolled).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header Card */}
      <div
        className="glass-card"
        style={{
          padding: '24px',
          borderRadius: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8'
              }}
            >
              <Users size={20} />
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Residents & Biometric Profile Registry
            </h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Manage resident clinical profiles, room assignments, and 5-angle 128D facial embeddings for autonomous bedside verification.
          </p>
        </div>

        {/* Quick Stats Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <ShieldCheck size={20} color="#10b981" />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Biometrics Enrolled</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399' }}>
                {enrolledCount} / {residents.length} Verified
              </div>
            </div>
          </div>

          <button
            onClick={fetchResidents}
            className="btn btn-secondary"
            title="Refresh resident registry"
            style={{ padding: '10px', borderRadius: '10px' }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          background: 'rgba(15, 23, 42, 0.5)',
          padding: '12px 18px',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <Search size={18} color="var(--text-muted)" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by resident name (e.g. Mary Johnson), room number (102), or care notes..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            outline: 'none'
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Residents Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          Loading resident clinical registry...
        </div>
      ) : filteredResidents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          No residents match your search criteria.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '20px'
          }}
        >
          {filteredResidents.map((resident) => {
            const isHero = resident.roomNumber === '102';
            return (
              <div
                key={resident.id}
                className="glass-card"
                style={{
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: isHero ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--border-subtle)',
                  background: isHero
                    ? 'linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)'
                    : 'rgba(15, 23, 42, 0.6)',
                  position: 'relative'
                }}
              >
                {/* Hero Badge */}
                {isHero && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'rgba(56, 189, 248, 0.2)',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      color: '#38bdf8',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      textTransform: 'uppercase'
                    }}
                  >
                    Hero Resident
                  </div>
                )}

                <div>
                  {/* Resident Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                    <div
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        background: '#1e293b',
                        border: '2px solid rgba(56, 189, 248, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative'
                      }}
                    >
                      {resident.photoUrl ? (
                        <img
                          src={resident.photoUrl}
                          alt={resident.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#38bdf8' }}>
                          {resident.name.charAt(0)}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                        {resident.name}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Building size={12} />
                          Room {resident.roomNumber}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Wing A</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes / Clinical Context */}
                  <div
                    style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.04)'
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                      Caregiver Clinical Notes:
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {resident.notes || 'Routine assisted care resident. No special restrictions recorded.'}
                    </div>
                  </div>

                  {/* Biometric Status Pill */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Biometric Facial Embeddings:
                    </div>
                    {resident.isEnrolled ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          color: '#34d399',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle2 size={16} />
                          <span>128D Master Embedding Active</span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'rgba(52, 211, 153, 0.8)' }}>
                          5 Poses Enrolled
                        </span>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: 'rgba(245, 158, 11, 0.12)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          color: '#fbbf24',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={16} />
                          <span>Pending 5-Angle Face Capture</span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'rgba(251, 191, 36, 0.8)' }}>
                          Action Required
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Row */}
                <div style={{ display: 'flex', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                  <button
                    onClick={() => handleOpenEnrollment(resident)}
                    className="btn btn-primary"
                    style={{
                      flex: 1,
                      padding: '10px',
                      fontSize: '0.85rem',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <Scan size={16} />
                    <span>{resident.isEnrolled ? 'Re-enroll / Test Studio' : 'Enroll 5-Angle Face'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5-Angle Enrollment Studio Modal */}
      <FaceEnrollmentStudioModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        resident={selectedResidentForEnroll}
        onEnrollmentSuccess={handleEnrollmentSuccess}
        currentRole={currentRole}
      />
    </div>
  );
}
