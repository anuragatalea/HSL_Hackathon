import React, { useState, useEffect } from 'react';
import { X, Clock, Pill, RotateCcw, AlertTriangle, Check, User, Plus, Trash2, Sparkles } from 'lucide-react';
import { RoverSchedule, MedicationItem } from '../types.js';

interface EditScheduleModalProps {
  schedule: RoverSchedule | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (updatedSchedule: RoverSchedule) => void;
  currentRole: string;
}

export const EditScheduleModal: React.FC<EditScheduleModalProps> = ({
  schedule,
  isOpen,
  onClose,
  onSaveSuccess,
  currentRole
}) => {
  const [itemName, setItemName] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [frequency, setFrequency] = useState('DAILY');
  const [snoozeDurationMin, setSnoozeDurationMin] = useState(10);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [isActive, setIsActive] = useState(true);
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (schedule) {
      setItemName(schedule.itemName || '');
      setScheduledTime(schedule.scheduledTime || '10:00');
      setFrequency(schedule.frequency || 'DAILY');
      setSnoozeDurationMin(schedule.snoozeDurationMin || 10);
      setMaxAttempts(schedule.maxAttempts || 3);
      setIsActive(schedule.isActive !== undefined ? schedule.isActive : true);

      if (schedule.medications && Array.isArray(schedule.medications) && schedule.medications.length > 0) {
        setMedications(schedule.medications);
      } else {
        setMedications([
          { name: schedule.itemName || 'Prescription Item', dose: '1 unit', instructions: 'Take as directed', compartment: 1 }
        ]);
      }
      setError(null);
    }
  }, [schedule]);

  if (!isOpen || !schedule) return null;

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
    const validMeds = medications.filter((m) => m.name.trim().length > 0);
    if (!itemName.trim() && validMeds.length === 0) {
      setError('Please specify at least one medication or regimen title.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/rover/schedules/${schedule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: itemName.trim() || validMeds.map((m) => m.name).join(', '),
          medications: validMeds,
          scheduledTime: scheduledTime.trim(),
          frequency,
          snoozeDurationMin: Number(snoozeDurationMin),
          maxAttempts: Number(maxAttempts),
          isActive,
          assignedStaffId: currentRole
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update schedule');
      }

      onSaveSuccess(data.data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Network error occurred while saving schedule.');
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '20px'
      }}
    >
      <div
        style={{
          background: 'linear-gradient(145deg, hsl(222, 47%, 12%), hsl(222, 47%, 8%))',
          border: '1px solid hsl(215, 25%, 28%)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '92vh',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 25px hsla(217, 91%, 60%, 0.15)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid hsl(215, 25%, 20%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase'
                }}
              >
                Caregiver Clinical Control
              </span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              ✏️ Edit Delivery Schedule & Prescriptions
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Resident Summary Banner */}
        <div
          style={{
            background: 'hsl(217, 33%, 17%)',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid hsl(215, 25%, 22%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'hsl(217, 91%, 60%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}
            >
              <User size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                {schedule.resident?.name || 'Resident'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'hsl(215, 20%, 65%)' }}>
                Room {schedule.resident?.roomNumber || schedule.roomId} • Assigned: Rover-01
              </div>
            </div>
          </div>

          {/* Active Status Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'hsl(215, 20%, 65%)' }}>Status:</span>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              style={{
                padding: '4px 10px',
                borderRadius: '999px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: isActive ? 'hsla(142, 71%, 45%, 0.2)' : 'hsla(0, 84%, 60%, 0.2)',
                color: isActive ? 'hsl(142, 71%, 55%)' : 'hsl(0, 84%, 65%)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: isActive ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)'
                }}
              />
              {isActive ? 'Active' : 'Paused'}
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div
              style={{
                background: 'hsla(0, 84%, 60%, 0.15)',
                border: '1px solid hsla(0, 84%, 60%, 0.4)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: 'hsl(0, 84%, 75%)',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Regimen Name */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'hsl(215, 20%, 75%)', marginBottom: '6px' }}>
              <Pill size={14} color="#38bdf8" /> Regimen / Delivery Title:
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Morning Cardiovascular & Metabolic Regimen"
              style={{
                width: '100%',
                background: 'hsl(222, 47%, 7%)',
                border: '1px solid hsl(215, 25%, 28%)',
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Dynamic Medication List */}
          <div
            style={{
              background: 'hsl(222, 47%, 7%)',
              padding: '14px',
              borderRadius: '12px',
              border: '1px solid hsl(215, 25%, 22%)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} /> Prescribed Medications ({medications.length} items)
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
                <span>Add Item</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {medications.map((med, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'hsl(217, 33%, 14%)',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid hsl(215, 25%, 25%)',
                    display: 'grid',
                    gridTemplateColumns: '1.4fr 1fr 1fr 26px',
                    gap: '8px',
                    alignItems: 'center'
                  }}
                >
                  <input
                    type="text"
                    placeholder="Medicine Name (Metformin)"
                    value={med.name}
                    onChange={(e) => handleUpdateMedication(idx, 'name', e.target.value)}
                    style={{
                      background: 'hsl(222, 47%, 7%)',
                      border: '1px solid hsl(215, 25%, 25%)',
                      borderRadius: '6px',
                      padding: '6px 8px',
                      color: '#fff',
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
                      background: 'hsl(222, 47%, 7%)',
                      border: '1px solid hsl(215, 25%, 25%)',
                      borderRadius: '6px',
                      padding: '6px 8px',
                      color: '#fff',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                  />
                  <select
                    value={med.compartment || 1}
                    onChange={(e) => handleUpdateMedication(idx, 'compartment', Number(e.target.value))}
                    style={{
                      background: 'hsl(222, 47%, 7%)',
                      border: '1px solid hsl(215, 25%, 25%)',
                      borderRadius: '6px',
                      padding: '6px 8px',
                      color: '#fff',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                  >
                    <option value={1}>Compartment #1</option>
                    <option value={2}>Compartment #2</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveMedication(idx)}
                    disabled={medications.length <= 1}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: medications.length <= 1 ? 'hsl(215, 20%, 40%)' : '#f87171',
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

          {/* Time & Frequency */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'hsl(215, 20%, 75%)', marginBottom: '6px' }}>
                <Clock size={14} color="#38bdf8" /> Scheduled Time:
              </label>
              <input
                type="text"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                placeholder="10:00"
                style={{
                  width: '100%',
                  background: 'hsl(222, 47%, 7%)',
                  border: '1px solid hsl(215, 25%, 28%)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'hsl(215, 20%, 75%)', marginBottom: '6px' }}>
                Frequency / Recurrence:
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                style={{
                  width: '100%',
                  background: 'hsl(222, 47%, 7%)',
                  border: '1px solid hsl(215, 25%, 28%)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              >
                <option value="DAILY">Daily (Every Day)</option>
                <option value="WEEKDAYS">Mon - Fri Only</option>
                <option value="TWICE_DAILY">Twice Daily</option>
                <option value="ONCE">One-Time Only</option>
              </select>
            </div>
          </div>

          {/* Snooze & Retries */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'hsl(215, 20%, 75%)', marginBottom: '4px' }}>
                <RotateCcw size={12} color="#fbbf24" /> Snooze Duration:
              </label>
              <select
                value={snoozeDurationMin}
                onChange={(e) => setSnoozeDurationMin(Number(e.target.value))}
                style={{
                  width: '100%',
                  background: 'hsl(222, 47%, 7%)',
                  border: '1px solid hsl(215, 25%, 28%)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              >
                <option value={5}>5 Minutes</option>
                <option value={10}>10 Minutes (Standard)</option>
                <option value={15}>15 Minutes</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'hsl(215, 20%, 75%)', marginBottom: '4px', display: 'block' }}>
                Max Retries Before Alert:
              </label>
              <select
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
                style={{
                  width: '100%',
                  background: 'hsl(222, 47%, 7%)',
                  border: '1px solid hsl(215, 25%, 28%)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              >
                <option value={2}>2 Attempts</option>
                <option value={3}>3 Attempts (Standard)</option>
                <option value={5}>5 Attempts</option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid hsl(215, 25%, 35%)',
                color: 'hsl(215, 20%, 75%)',
                padding: '10px 18px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, hsl(217, 91%, 60%) 0%, hsl(222, 89%, 45%) 100%)',
                border: 'none',
                color: '#fff',
                padding: '10px 22px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px hsla(217, 91%, 60%, 0.4)'
              }}
            >
              <Check size={16} />
              <span>{loading ? 'Saving...' : 'Update Schedule'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
