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
  Sparkles,
  AlertTriangle,
  ThermometerSnowflake
} from 'lucide-react';
import { Resident, Room, MedicationItem, Medication } from '../types.js';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentRole: string;
}

export function ScheduleModal({ isOpen, onClose, onSuccess, currentRole }: ScheduleModalProps) {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [formularyMeds, setFormularyMeds] = useState<Medication[]>([]);
  const [selectedFormularyId, setSelectedFormularyId] = useState<string>('');
  const [safetyWarning, setSafetyWarning] = useState<string | null>(null);
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [regimenTitle, setRegimenTitle] = useState('Morning Prescription & Vitality Regimen');
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [frequency, setFrequency] = useState('DAILY');
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [snoozeDuration, setSnoozeDuration] = useState(10);
  const [medications, setMedications] = useState<MedicationItem[]>([
    { name: 'Metformin Hydrochloride', dose: '500 mg', instructions: 'Take with breakfast and full glass of water', compartment: 1 },
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

      fetch('/api/rover/medications')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data)) {
            setFormularyMeds(data.data);
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
          { name: 'Metformin Hydrochloride', dose: '500 mg', instructions: 'Take with breakfast and full glass of water', compartment: 1 },
          { name: 'Lisinopril', dose: '10 mg', instructions: 'Blood pressure management', compartment: 1 },
          { name: 'Aspirin', dose: '81 mg', instructions: 'Low-dose cardiac protection chewable', compartment: 2 }
        ]);
      } else if (resident.roomNumber === '101') {
        setRegimenTitle('Evening Lipid & Cardiovascular Regimen');
        setMedications([
          { name: 'Atorvastatin Calcium', dose: '20 mg', instructions: 'Cholesterol management. Evening dose.', compartment: 1 },
          { name: 'Aspirin', dose: '81 mg', instructions: 'Low-dose cardiac protection chewable', compartment: 2 }
        ]);
      }
    }
  }, [selectedResidentId, residents, rooms]);

  if (!isOpen) return null;

  const findMatchedFormulary = (name: string) => {
    if (!name) return undefined;
    const lower = name.toLowerCase().trim();
    return formularyMeds.find((fm) => {
      const fmLower = fm.name.toLowerCase().trim();
      return fmLower === lower || fmLower.startsWith(lower) || lower.startsWith(fmLower);
    });
  };

  const handleSelectMedicationForIndex = (index: number, medName: string) => {
    const med = findMatchedFormulary(medName);
    const updated = [...medications];
    if (med) {
      const compartment = med.storageTemp === 'REFRIGERATED_2_TO_8C' ? 4 : (updated[index]?.compartment || 1);
      updated[index] = {
        name: med.name,
        dose: med.standardStrength,
        instructions: med.instructions,
        compartment
      };
      if (updated.length === 1) {
        setRegimenTitle(`${med.name} (${med.standardStrength})`);
        setSelectedFormularyId(med.id);
      }
      if (med.isBeersList) {
        setSafetyWarning(
          `⚠️ Beers Criteria Precaution: ${med.name} carries significant fall and sedation risk for older adults. ${med.beersRiskNotes || ''}`
        );
      } else if (med.storageTemp === 'REFRIGERATED_2_TO_8C') {
        setSafetyWarning(`❄️ Cold Storage Notice: This medication requires refrigeration and is assigned to Compartment 4.`);
      }
    } else {
      updated[index] = {
        ...updated[index],
        name: medName
      };
    }
    setMedications(updated);
  };

  const handleSelectFormularyMed = (medId: string) => {
    setSelectedFormularyId(medId);
    setSafetyWarning(null);
    if (!medId) return;

    const med = formularyMeds.find((m) => m.id === medId);
    if (med) {
      const compartment = med.storageTemp === 'REFRIGERATED_2_TO_8C' ? 4 : 1;
      setRegimenTitle(`${med.name} (${med.standardStrength})`);
      setMedications([
        {
          name: med.name,
          dose: med.standardStrength,
          instructions: med.instructions,
          compartment
        }
      ]);

      if (med.isBeersList) {
        setSafetyWarning(
          `⚠️ Beers Criteria Precaution: ${med.name} carries significant fall and sedation risk for older adults. ${med.beersRiskNotes || ''}`
        );
      } else if (med.storageTemp === 'REFRIGERATED_2_TO_8C') {
        setSafetyWarning(`❄️ Cold Storage Notice: This medication requires refrigeration and is assigned to Compartment 4.`);
      }
    }
  };

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
          medicationId: selectedFormularyId || formularyMeds.find((fm) => fm.name.toLowerCase() === validMeds[0]?.name.toLowerCase())?.id || undefined,
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
          maxWidth: '740px',
          maxHeight: '92vh',
          padding: '28px',
          background: '#0f172a',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          position: 'relative',
          borderRadius: '16px',
          overflowY: 'auto',
          overflowX: 'hidden'
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

          {/* Quick Formulary Selector */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(2, 132, 199, 0.18) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '12px',
            padding: '12px 16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} /> Quick-Select from Master Formulary Catalog
              </label>
              <span style={{ fontSize: '0.72rem', color: '#7dd3fc', fontWeight: 600 }}>Auto-populates dosing & compartment</span>
            </div>
            <select
              value={selectedFormularyId}
              onChange={(e) => handleSelectFormularyMed(e.target.value)}
              style={{
                width: '100%',
                background: '#0f172a',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                borderRadius: '8px',
                padding: '9px 12px',
                color: '#ffffff',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            >
              <option value="">-- Choose a verified clinical drug from Formulary (e.g. Metformin, Donepezil) --</option>
              {formularyMeds.map((med) => (
                <option key={med.id} value={med.id}>
                  {med.name} ({med.standardStrength}) — {med.form} • {med.storageTemp === 'REFRIGERATED_2_TO_8C' ? '❄️ Cold Bay' : 'Dry Bay'} {med.isBeersList ? '⚠️ Beers Alert' : ''}
                </option>
              ))}
            </select>

            {/* Clinical Safety Warning Badge */}
            {safetyWarning && (
              <div style={{
                marginTop: '10px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: safetyWarning.includes('Beers') ? 'rgba(245, 158, 11, 0.2)' : 'rgba(6, 182, 212, 0.2)',
                border: `1px solid ${safetyWarning.includes('Beers') ? '#f59e0b' : '#06b6d4'}`,
                color: safetyWarning.includes('Beers') ? '#fde68a' : '#a5f3fc',
                fontSize: '0.8rem',
                lineHeight: 1.4,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {safetyWarning.includes('Beers') ? <AlertTriangle size={16} color="#fbbf24" /> : <ThermometerSnowflake size={16} color="#22d3ee" />}
                <span>{safetyWarning}</span>
              </div>
            )}
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
              {medications.map((med, idx) => {
                const matchedFormulary = findMatchedFormulary(med.name);
                const selectedValue = matchedFormulary ? matchedFormulary.name : med.name;
                return (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(30, 41, 59, 0.5)',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      minWidth: 0
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 0.9fr) minmax(0, 1.15fr) 28px',
                        gap: '8px',
                        alignItems: 'center',
                        width: '100%',
                        minWidth: 0
                      }}
                    >
                      <select
                        value={selectedValue}
                        onChange={(e) => handleSelectMedicationForIndex(idx, e.target.value)}
                        style={{
                          width: '100%',
                          minWidth: 0,
                          background: '#0f172a',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          padding: '7px 8px',
                          color: selectedValue ? 'var(--text-primary)' : 'var(--text-muted)',
                          fontSize: '0.82rem',
                          outline: 'none',
                          cursor: 'pointer',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        <option value="" style={{ background: '#0f172a' }}>-- Select from Master Formulary --</option>
                        {formularyMeds.map((fm) => (
                          <option key={fm.id} value={fm.name} style={{ background: '#0f172a' }}>
                            {fm.name} ({fm.standardStrength}) {fm.storageTemp === 'REFRIGERATED_2_TO_8C' ? '❄️ Cold' : ''} {fm.isBeersList ? '⚠️ Beers' : ''}
                          </option>
                        ))}
                        {selectedValue && !formularyMeds.some((fm) => fm.name.toLowerCase() === selectedValue.toLowerCase()) && (
                          <option value={selectedValue} style={{ background: '#0f172a' }}>{selectedValue} (Custom)</option>
                        )}
                      </select>

                      <input
                        type="text"
                        placeholder="Dose"
                        value={med.dose}
                        onChange={(e) => handleUpdateMedication(idx, 'dose', e.target.value)}
                        style={{
                          width: '100%',
                          minWidth: 0,
                          background: 'rgba(0, 0, 0, 0.3)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          padding: '7px 8px',
                          color: 'var(--text-primary)',
                          fontSize: '0.82rem',
                          outline: 'none'
                        }}
                      />

                      <select
                        value={med.compartment || 1}
                        onChange={(e) => handleUpdateMedication(idx, 'compartment', Number(e.target.value))}
                        style={{
                          width: '100%',
                          minWidth: 0,
                          background: 'rgba(0, 0, 0, 0.3)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          padding: '7px 6px',
                          color: 'var(--text-primary)',
                          fontSize: '0.82rem',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value={1} style={{ background: '#0f172a' }}>Bay #1 (Dry)</option>
                        <option value={2} style={{ background: '#0f172a' }}>Bay #2 (Dry)</option>
                        <option value={3} style={{ background: '#0f172a' }}>Bay #3 (Dry)</option>
                        <option value={4} style={{ background: '#0f172a' }}>Bay #4 (❄️ Cold)</option>
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

                    {/* Visual Clinical Alert Badges */}
                    {matchedFormulary && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {matchedFormulary.isBeersList && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'rgba(245, 158, 11, 0.15)',
                              color: '#fbbf24',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              borderRadius: '4px',
                              padding: '2px 8px',
                              fontSize: '0.7rem',
                              fontWeight: 600
                            }}
                          >
                            <AlertTriangle size={12} color="#fbbf24" />
                            Beers Criteria Alert: High Geriatric Fall & Sedation Risk
                          </span>
                        )}
                        {matchedFormulary.storageTemp === 'REFRIGERATED_2_TO_8C' && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'rgba(6, 182, 212, 0.15)',
                              color: '#38bdf8',
                              border: '1px solid rgba(6, 182, 212, 0.4)',
                              borderRadius: '4px',
                              padding: '2px 8px',
                              fontSize: '0.7rem',
                              fontWeight: 600
                            }}
                          >
                            <ThermometerSnowflake size={12} color="#38bdf8" />
                            Refrigerated (2°C–8°C) • Locked to Cold Bay #4
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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
