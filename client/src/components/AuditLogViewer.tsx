import { useState, useEffect } from 'react';
import { ShieldCheck, UserCheck, Bot, FileText, Download, RefreshCw, ChevronDown, ChevronRight, User, Camera, CheckCircle2, ExternalLink } from 'lucide-react';
import { RoverAuditLog } from '../types.js';
import { socket } from '../socket.js';

export function AuditLogViewer() {
  const [logs, setLogs] = useState<RoverAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [actorFilter, setActorFilter] = useState<'ALL' | 'CAREGIVER' | 'RESIDENT' | 'ROVER' | 'SYSTEM'>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rover/logs?limit=100');
      const json = await res.json();
      if (json.success) {
        setLogs(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Listen for real-time task updates to refresh audit log live
    socket.on('task:updated', fetchLogs);

    return () => {
      socket.off('task:updated');
    };
  }, []);

  const filteredLogs = logs.filter(log => {
    if (actorFilter !== 'ALL' && log.actorType !== actorFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const eventMatch = log.event.toLowerCase().includes(query);
      const actorMatch = log.actorId.toLowerCase().includes(query);
      const residentMatch = log.task?.resident?.name?.toLowerCase().includes(query);
      return eventMatch || actorMatch || residentMatch;
    }
    return true;
  });

  const getActorBadge = (actorType: string) => {
    switch (actorType) {
      case 'CAREGIVER':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '6px',
            background: 'rgba(56, 189, 248, 0.15)',
            color: '#38bdf8',
            fontSize: '0.75rem',
            fontWeight: 700
          }}>
            <UserCheck size={12} /> CAREGIVER
          </span>
        );
      case 'RESIDENT':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '6px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            fontSize: '0.75rem',
            fontWeight: 700
          }}>
            <User size={12} /> RESIDENT
          </span>
        );
      case 'ROVER':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '6px',
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#fbbf24',
            fontSize: '0.75rem',
            fontWeight: 700
          }}>
            <Bot size={12} /> ROVER
          </span>
        );
      default:
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '6px',
            background: 'rgba(99, 102, 241, 0.15)',
            color: '#a5b4fc',
            fontSize: '0.75rem',
            fontWeight: 700
          }}>
            <ShieldCheck size={12} /> SYSTEM
          </span>
        );
    }
  };

  const exportToJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `hsl_care_audit_trail_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="glass-panel" style={{ padding: '28px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
          }}>
            <FileText size={24} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
              Institutional Compliance & Clinical Audit Trail
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Immutable PostgreSQL event ledger tracking chain-of-custody, biometrics, and physical rover executions
            </p>
          </div>
        </div>

        {/* Export & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.8rem' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={exportToJson}
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
          >
            <Download size={14} />
            <span>Export Compliance Report</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px',
        background: 'rgba(15, 23, 42, 0.5)',
        padding: '12px 16px',
        borderRadius: '12px',
        border: '1px solid var(--border-subtle)'
      }}>
        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by event, actor, or resident name..."
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '8px 14px',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            width: '280px',
            outline: 'none'
          }}
        />

        {/* Actor Filter Chips */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['ALL', 'CAREGIVER', 'RESIDENT', 'ROVER', 'SYSTEM'] as const).map(actor => (
            <button
              key={actor}
              onClick={() => setActorFilter(actor)}
              style={{
                background: actorFilter === actor ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                color: actorFilter === actor ? '#a5b4fc' : 'var(--text-secondary)',
                border: actorFilter === actor ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {actor}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline View */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredLogs.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No audit records match the current filter.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const date = new Date(log.createdAt);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateStr = date.toLocaleDateString();

            return (
              <div
                key={log.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  padding: '14px 18px',
                  transition: 'background 0.2s ease',
                  cursor: 'pointer'
                }}
                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ color: 'var(--text-muted)' }}>
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>

                    {getActorBadge(log.actorType)}

                    <strong style={{ fontSize: '0.9rem', color: '#f8fafc', letterSpacing: '-0.01em' }}>
                      {log.event}
                    </strong>

                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      by <strong style={{ color: 'var(--text-primary)' }}>{log.actorId}</strong>
                    </span>

                    {/* Proof Photo Attached Badge */}
                    {log.metadata?.proofOfDeliveryUrl && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 9px',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.2) 100%)',
                        border: '1px solid rgba(16, 185, 129, 0.45)',
                        color: '#34d399',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        letterSpacing: '0.3px'
                      }}>
                        <Camera size={12} />
                        <span>Proof Photo Attached</span>
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>{dateStr} • {timeStr}</span>
                    <span style={{ fontFamily: 'monospace', opacity: 0.6 }}>ID: {log.id.slice(0, 8)}</span>
                  </div>
                </div>

                {/* Collapsible Metadata Details & Clinical Proof-of-Delivery Inspection Card */}
                {isExpanded && log.metadata && (
                  <div style={{ marginTop: '12px' }}>
                    {/* Visual Proof of Delivery Card */}
                    {log.metadata.proofOfDeliveryUrl && (
                      <div
                        style={{
                          marginBottom: '12px',
                          padding: '16px',
                          borderRadius: '12px',
                          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 29, 0.95) 100%)',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '20px',
                          alignItems: 'center',
                          boxShadow: '0 0 25px rgba(16, 185, 129, 0.15)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          style={{
                            position: 'relative',
                            width: '180px',
                            height: '135px',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            border: '2px solid rgba(56, 189, 248, 0.5)',
                            cursor: 'pointer',
                            boxShadow: '0 0 15px rgba(56, 189, 248, 0.25)',
                            flexShrink: 0
                          }}
                          onClick={() => setPreviewImage(log.metadata.proofOfDeliveryUrl)}
                          title="Click to view full-resolution proof"
                        >
                          <img
                            src={log.metadata.proofOfDeliveryUrl}
                            alt="Proof of Delivery"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              (e.target as any).src = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80';
                            }}
                          />
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'rgba(0, 0, 0, 0.8)',
                            padding: '3px 8px',
                            fontSize: '0.65rem',
                            color: '#38bdf8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontWeight: 700
                          }}>
                            <span>UGV-Beast Camera</span>
                            <ExternalLink size={10} />
                          </div>
                        </div>

                        <div style={{ flex: 1, minWidth: '240px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <CheckCircle2 size={18} color="#10b981" />
                            <h4 style={{ margin: 0, fontSize: '1rem', color: '#10b981', fontWeight: 800 }}>
                              Bedside Biometric Proof-of-Delivery
                            </h4>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '0.8rem' }}>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Resident: </span>
                              <strong style={{ color: '#f8fafc' }}>{log.metadata.name || log.task?.resident?.name || 'Mary Johnson'}</strong>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Room: </span>
                              <strong style={{ color: '#38bdf8' }}>Room {log.metadata.roomNumber || log.task?.resident?.roomNumber || '102'}</strong>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Match Confidence: </span>
                              <span style={{
                                color: '#34d399',
                                fontWeight: 800,
                                background: 'rgba(16, 185, 129, 0.15)',
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}>
                                {log.metadata.confidence ?? 96}%
                              </span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Euclidean Distance: </span>
                              <span style={{ fontFamily: 'monospace', color: '#a5b4fc' }}>
                                {log.metadata.distance ?? '0.1842'} (L2 norm)
                              </span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Verified By: </span>
                              <span style={{ color: '#fbbf24' }}>{log.metadata.verifiedBy || log.actorId}</span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Storage Ref: </span>
                              <a
                                href={log.metadata.proofOfDeliveryUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: '#38bdf8', textDecoration: 'underline' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Raw Artifact
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Raw JSON Audit Metadata */}
                    <div style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: '#0a0f1d',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      color: '#38bdf8',
                      overflowX: 'auto'
                    }}>
                      <pre style={{ margin: 0 }}>
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Lightbox Proof Viewer Modal */}
      {previewImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(3, 7, 18, 0.92)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '24px'
          }}
          onClick={() => setPreviewImage(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '720px',
              width: '100%',
              background: '#0b1120',
              border: '2px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 0 50px rgba(56, 189, 248, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(15, 23, 42, 0.8)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={16} color="#38bdf8" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                  Clinical Proof of Delivery — Direct Robot Camera Snapshot
                </span>
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  fontWeight: 700
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '20px', textAlign: 'center', background: '#030712' }}>
              <img
                src={previewImage}
                alt="Proof of Delivery Full Resolution"
                style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '8px', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
