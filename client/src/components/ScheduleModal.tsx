import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  User,
  MapPin,
  Pill,
  Clock,
  Plus,
  Trash2,
  Sparkles
} from 'lucide-react';
import { Resident, Room, MedicationItem } from '../types.js';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentRole: string;
}

export function ScheduleModal({ isOpen, onClose, onSuccess, currentRole }: ScheduleModalProps) {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [regimenTitle, setRegimenTitle] = useState('Morning Prescription & Vitality Regimen');
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [frequency, setFrequency] = useState('DAILY');
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [snoozeDuration, setSnoozeDuration] = useState(10);
  const [medications, setMedications] = useState<MedicationItem[]>([
    { name: 'Metformin', dose: '500 mg', instructions: 'Take with breakfast and full glass of water', compartment: 1 },
    { name: 'Lisinopril', dose: '10 mg', instructions: 'Blood pressure management', compartment: 1 }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/rover/locations/residents')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data.length > 0) {
            setResidents(data.data);
            setSelectedResidentId(data.data[0].id);
          }
        })
        .catch(console.error);

      fetch('/api/rover/locations/rooms')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data.length > 0) {
            setRooms(data.data);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  // Auto-sync room when resident changes
  useEffect(() => {
    const resident = residents.find((r) => r.id === selectedResidentId);
    if (resident && rooms.length > 0) {
      const room = rooms.find((rm) => rm.number === resident.roomNumber);
      if (room) {
        setSelectedRoomId(room.id);
      }
      if (resident.roomNumber === '102') {
        setRegimenTitle('Morning Cardiovascular & Metabolic Regimen');
        setMedications([
          { name: 'Metformin', dose: '500 mg', instructions: 'Take with breakfast and full glass of water', compartment: 1 },
          { name: 'Lisinopril', dose: '10 mg', instructions: 'Blood pressure management', compartment: 1 },
          { name: 'Aspirin', dose: '81 mg', instructions: 'Low-dose cardiac protection chewable', compartment: 2 }
        ]);
      } else if (resident.roomNumber === '101') {
        setRegimenTitle('Afternoon Hydration & Vitality Pack');
        setMedications([
          { name: 'Multivitamin Silver', dose: '1 tablet', instructions: 'Take with afternoon meal', compartment: 1 },
          { name: 'Electrolyte Hydration Pack', dose: '1 sachet', instructions: 'Dissolve in 400ml water', compartment: 2 }
        ]);
      }
    }
  }, [selectedResidentId, residents, rooms]);

  if (!isOpen) return null;

  const handleAddMedication = () => {
    setMedications([
      ...medications,
      { name: '', dose: '', instructions: '', compartment: (medications.length % 2) + 1 }
    ]);
  };

  const handleRemoveMedication = (index: number) => {
    if (medications.length <= 1) return;
    setMedications(medications.filter((_, idx) => idx !== index));
  };

  const handleUpdateMedication = (index: number, field: keyof MedicationItem, value: any) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate at least one medication has a name
    const validMeds = medications.filter((m) => m.name.trim().length > 0);
    if (validMeds.length === 0) {
      setError('Please add at least one medication name.');
      setLoading(false);
      return;
    }

    try {
      // Find Rover-01 ID
      const devicesRes = await fetch('/api/rover/devices');
      const devicesJson = await devicesRes.json();
      const roverId = devicesJson.data?.[0]?.id;

      if (!roverId) throw new Error('No active rover device found.');

      const res = await fetch('/api/rover/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residentId: selectedResidentId,
          roomId: selectedRoomId,
          itemName: regimenTitle || validMeds.map((m) => m.name).join(', '),
          medications: validMeds,
          scheduledTime,
          frequency,
          assignedStaffId: currentRole,
          roverId,
          maxAttempts,
          snoozeDurationMin: snoozeDuration
        })
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to create schedule');

      // Also create an immediate ready task so it shows in today's demo table right away!
      await fetch('/api/rover/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residentId: selectedResidentId,
          roomId: selectedRoomId,
          roverId,
          scheduleId: json.data.id,
          medications: validMeds
        })
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(5, 10, 20, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          padding: '28px',
          background: '#0f172a',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          position: 'relative',
          borderRadius: '16px',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Calendar size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Create Clinical Delivery Regimen
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                Configure multi-medication prescriptions for autonomous rover delivery
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              marginBottom: '16px'
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Resident & Room Selectors */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <User size={14} /> Resident
              </label>
              <select
                value={selectedResidentId}
                onChange={(e) => setSelectedResidentId(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '10px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              >
                {residents.map((r) => (
                  <option key={r.id} value={r.id} style={{ background: '#0f172a' }}>
                    {r.name} — Room {r.roomNumber}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <MapPin size={14} /> Destination Room
              </label>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '10px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              >
                {rooms.map((rm) => (
                  <option key={rm.id} value={rm.id} style={{ background: '#0f172a' }}>
                    {rm.name} (Rm {rm.number})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Regimen Title */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              <Pill size={14} /> Regimen / Delivery Title
            </label>
            <input
              type="text"
              value={regimenTitle}
              onChange={(e) => setRegimenTitle(e.target.value)}
              placeholder="e.g. Morning Cardiovascular & Metabolic Regimen"
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '10px',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Multi-Medication Prescription Items List */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              padding: '14px',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} /> Prescription Medication List ({medications.length} items)
              </label>
              <button
                type="button"
                onClick={handleAddMedication}
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  color: '#38bdf8',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={12} />
                <span>Add Medication</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {medications.map((med, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(30, 41, 59, 0.4)',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 1fr 1fr 28px',
                    gap: '8px',
                    alignItems: 'center'
                  }}
                >
                  <input
                    type="text"
                    placeholder="Medicine Name (e.g. Metformin)"
                    value={med.name}
                    onChange={(e) => handleUpdateMedication(idx, 'name', e.target.value)}
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      padding: '6px 8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Dosage (500mg)"
                    value={med.dose}
                    onChange={(e) => handleUpdateMedication(idx, 'dose', e.target.value)}
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      padding: '6px 8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                  />
                  <select
                    value={med.compartment || 1}
                    onChange={(e) => handleUpdateMedication(idx, 'compartment', Number(e.target.value))}
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      padding: '6px 8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                  >
                    <option value={1} style={{ background: '#0f172a' }}>Compartment #1</option>
                    <option value={2} style={{ background: '#0f172a' }}>Compartment #2</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveMedication(idx)}
                    disabled={medications.length <= 1}
                    title="Remove item"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: medications.length <= 1 ? 'var(--text-muted)' : '#f87171',
                      cursor: medications.length <= 1 ? 'not-allowed' : 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Time & Recurrence */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <Clock size={14} /> Scheduled Delivery Time
              </label>
              <input
                type="text"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                placeholder="10:00"
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '10px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <Calendar size={14} /> Recurrence Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '10px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              >
                <option value="DAILY" style={{ background: '#0f172a' }}>Daily (Every Day)</option>
                <option value="WEEKDAYS" style={{ background: '#0f172a' }}>Mon - Fri Only</option>
                <option value="TWICE_DAILY" style={{ background: '#0f172a' }}>Twice Daily (Morning & Evening)</option>
                <option value="ONCE" style={{ background: '#0f172a' }}>One-off Delivery</option>
              </select>
            </div>
          </div>

          {/* Snooze & Retries */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                Snooze Duration:
              </label>
              <select
                value={snoozeDuration}
                onChange={(e) => setSnoozeDuration(Number(e.target.value))}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                  outline: 'none'
                }}
              >
                <option value={5} style={{ background: '#0f172a' }}>5 Minutes</option>
                <option value={10} style={{ background: '#0f172a' }}>10 Minutes (Standard)</option>
                <option value={15} style={{ background: '#0f172a' }}>15 Minutes</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                Max Retries Before Nurse Alert:
              </label>
              <select
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                  outline: 'none'
                }}
              >
                <option value={2} style={{ background: '#0f172a' }}>2 Attempts</option>
                <option value={3} style={{ background: '#0f172a' }}>3 Attempts (Standard)</option>
                <option value={5} style={{ background: '#0f172a' }}>5 Attempts</option>
              </select>
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '10px 18px', fontSize: '0.85rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ padding: '10px 22px', fontSize: '0.85rem' }}
            >
              {loading ? 'Authorizing...' : 'Authorize & Save Regimen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
