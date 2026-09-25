import { useState, useEffect } from 'react';
import { 
  Pill, 
  Search, 
  Plus, 
  AlertTriangle, 
  ThermometerSnowflake, 
  Sparkles, 
  Check, 
  X, 
  Lock
} from 'lucide-react';
import { Medication, MedicationCategory, AgeGroup, StorageRequirement, DosageForm } from '../types.js';

interface MedicationCatalogProps {
  currentRole: string;
}

export function MedicationCatalog({ currentRole }: MedicationCatalogProps) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showBeersOnly, setShowBeersOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [enrichQuery, setEnrichQuery] = useState('');
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichSuccess, setEnrichSuccess] = useState(false);

  // Form State for Adding Medication
  const [formData, setFormData] = useState<Partial<Medication>>({
    name: '',
    brandName: '',
    ndcCode: '',
    category: 'CARDIOVASCULAR',
    form: 'TABLET',
    standardStrength: '10 mg',
    targetAgeGroup: 'ALL_ADULTS',
    minAgeYears: 18,
    isBeersList: false,
    beersRiskNotes: '',
    recommendedFrequency: 'ONCE_DAILY_QD',
    maxTimesPerDay: 1,
    minHoursBetweenDoses: 8,
    instructions: 'Take once daily with water as directed.',
    requiresFood: false,
    storageTemp: 'ROOM_TEMP',
    isControlledSubstance: false,
    contraindications: '',
    sideEffects: ''
  });

  const fetchMedications = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/rover/medications');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMedications(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch medications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedications();
  }, []);

  const handleEnrich = async () => {
    if (!enrichQuery.trim()) return;
    setIsEnriching(true);
    setEnrichSuccess(false);
    try {
      const res = await fetch('/api/rover/medications/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: enrichQuery.trim() })
      });
      const result = await res.json();
      if (result.success && result.data) {
        setFormData(prev => ({
          ...prev,
          ...result.data
        }));
        setEnrichSuccess(true);
      }
    } catch (err) {
      console.error('Auto-enrichment error:', err);
    } finally {
      setIsEnriching(false);
    }
  };

  const handleSaveMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/rover/medications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setEnrichQuery('');
        setEnrichSuccess(false);
        fetchMedications();
      } else {
        alert(data.error || 'Failed to add medication.');
      }
    } catch (err) {
      console.error('Save medication error:', err);
    }
  };

  const filteredMeds = medications.filter(med => {
    const matchesSearch = 
      med.name.toLowerCase().includes(search.toLowerCase()) ||
      (med.brandName && med.brandName.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategory === 'ALL' || med.category === selectedCategory;
    const matchesBeers = !showBeersOnly || med.isBeersList;
    return matchesSearch && matchesCategory && matchesBeers;
  });

  const categories = [
    'ALL',
    'CARDIOVASCULAR',
    'ANTIDIABETIC',
    'ANALGESIC_PAIN',
    'ANTIBIOTIC',
    'PSYCHIATRIC_NEUROLOGIC',
    'SUPPLEMENT_VITAMIN'
  ];

  return (
    <div>
      {/* Top Banner & Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.9) 100%)',
        border: '1px solid hsl(215, 25%, 22%)',
        borderRadius: '20px',
        padding: '24px 32px',
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            padding: '14px',
            borderRadius: '16px',
            color: '#ffffff',
            boxShadow: '0 0 20px rgba(14, 165, 233, 0.4)'
          }}>
            <Pill size={32} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0 }}>
                Master Medication Formulary
              </h1>
              <span style={{
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '999px'
              }}>
                eMAR Clinical Registry
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', color: 'hsl(215, 20%, 75%)', fontSize: '0.9rem' }}>
              Standardized pharmacology catalog with Beers Criteria geriatric safety, thermal storage, and automated dosing ceilings. Logged in: <span style={{ color: '#38bdf8', fontWeight: 600 }}>{currentRole}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setFormData({
              name: '',
              brandName: '',
              ndcCode: '',
              category: 'CARDIOVASCULAR',
              form: 'TABLET',
              standardStrength: '10 mg',
              targetAgeGroup: 'ALL_ADULTS',
              minAgeYears: 18,
              isBeersList: false,
              beersRiskNotes: '',
              recommendedFrequency: 'ONCE_DAILY_QD',
              maxTimesPerDay: 1,
              minHoursBetweenDoses: 8,
              instructions: 'Take once daily with water as directed.',
              requiresFood: false,
              storageTemp: 'ROOM_TEMP',
              isControlledSubstance: false,
              contraindications: '',
              sideEffects: ''
            });
            setEnrichQuery('');
            setEnrichSuccess(false);
            setIsModalOpen(true);
          }}
          style={{
            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 20px',
            fontSize: '0.95rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 6px 20px rgba(14, 165, 233, 0.4)'
          }}
        >
          <Plus size={18} />
          <span>Add Medication with AI / OpenFDA</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'hsl(217, 33%, 12%)', padding: '18px', borderRadius: '16px', border: '1px solid hsl(215, 25%, 22%)' }}>
          <div style={{ fontSize: '0.8rem', color: 'hsl(215, 20%, 65%)', fontWeight: 600 }}>Total Formulary Drugs</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#38bdf8', marginTop: '4px' }}>{medications.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '2px' }}>Verified Clinical Catalog</div>
        </div>

        <div style={{ background: 'hsl(217, 33%, 12%)', padding: '18px', borderRadius: '16px', border: '1px solid hsl(215, 25%, 22%)' }}>
          <div style={{ fontSize: '0.8rem', color: 'hsl(215, 20%, 65%)', fontWeight: 600 }}>Beers Criteria Monitored</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fbbf24', marginTop: '4px' }}>
            {medications.filter(m => m.isBeersList).length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '2px' }}>Elderly Fall/Sedation Risk</div>
        </div>

        <div style={{ background: 'hsl(217, 33%, 12%)', padding: '18px', borderRadius: '16px', border: '1px solid hsl(215, 25%, 22%)' }}>
          <div style={{ fontSize: '0.8rem', color: 'hsl(215, 20%, 65%)', fontWeight: 600 }}>Thermal Bay Required</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#67e8f9', marginTop: '4px' }}>
            {medications.filter(m => m.storageTemp === 'REFRIGERATED_2_TO_8C').length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#06b6d4', marginTop: '2px' }}>Refrigerated 2°C–8°C (Bay 4)</div>
        </div>

        <div style={{ background: 'hsl(217, 33%, 12%)', padding: '18px', borderRadius: '16px', border: '1px solid hsl(215, 25%, 22%)' }}>
          <div style={{ fontSize: '0.8rem', color: 'hsl(215, 20%, 65%)', fontWeight: 600 }}>Geriatric Target</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#a78bfa', marginTop: '4px' }}>
            {medications.filter(m => m.targetAgeGroup === 'GERIATRIC_65_PLUS').length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#c084fc', marginTop: '2px' }}>Optimized for 65+ Seniors</div>
        </div>
      </div>

      {/* Search & Category Filter Toolbar */}
      <div style={{
        background: 'hsl(217, 33%, 12%)',
        border: '1px solid hsl(215, 25%, 22%)',
        borderRadius: '16px',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', minWidth: '260px' }}>
          <Search size={18} color="hsl(215, 20%, 65%)" />
          <input
            type="text"
            placeholder="Search medications by name or brand (e.g. Metformin, Lipitor)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Category Pills & Beers Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowBeersOnly(!showBeersOnly)}
            style={{
              background: showBeersOnly ? 'rgba(245, 158, 11, 0.25)' : 'hsl(217, 33%, 15%)',
              border: `1px solid ${showBeersOnly ? '#f59e0b' : 'hsl(215, 25%, 25%)'}`,
              color: showBeersOnly ? '#fcd34d' : 'hsl(215, 20%, 75%)',
              borderRadius: '999px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <AlertTriangle size={14} color={showBeersOnly ? '#f59e0b' : 'hsl(215, 20%, 70%)'} />
            <span>Beers Criteria Alert</span>
          </button>

          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                background: selectedCategory === cat ? '#0284c7' : 'hsl(217, 33%, 15%)',
                color: selectedCategory === cat ? '#ffffff' : 'hsl(215, 20%, 75%)',
                border: selectedCategory === cat ? '1px solid #38bdf8' : '1px solid hsl(215, 25%, 25%)',
                borderRadius: '999px',
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Medication Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#38bdf8', fontWeight: 700 }}>
          Loading Master Formulary...
        </div>
      ) : filteredMeds.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px',
          background: 'hsl(217, 33%, 12%)',
          borderRadius: '16px',
          border: '1px solid hsl(215, 25%, 22%)',
          color: 'hsl(215, 20%, 65%)'
        }}>
          No medications found matching your search. Click "Add Medication with AI" to add one!
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {filteredMeds.map(med => (
            <div
              key={med.id}
              style={{
                background: 'hsl(217, 33%, 12%)',
                border: `1px solid ${med.isBeersList ? 'rgba(245, 158, 11, 0.4)' : 'hsl(215, 25%, 22%)'}`,
                borderRadius: '18px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: med.isBeersList ? '0 0 20px rgba(245, 158, 11, 0.15)' : 'none'
              }}
            >
              <div>
                {/* Header: Name, Brand, Badges */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
                      {med.name}
                    </h3>
                    {med.brandName && (
                      <div style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: 600 }}>
                        {med.brandName}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'hsl(217, 33%, 18%)',
                    color: 'hsl(215, 20%, 75%)',
                    border: '1px solid hsl(215, 25%, 28%)'
                  }}>
                    {med.category.replace('_', ' ')}
                  </span>
                </div>

                {/* Form & Strength Pill Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  <span style={{
                    background: 'rgba(14, 165, 233, 0.15)',
                    color: '#38bdf8',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}>
                    {med.form} • {med.standardStrength}
                  </span>

                  {med.storageTemp === 'REFRIGERATED_2_TO_8C' && (
                    <span style={{
                      background: 'rgba(6, 182, 212, 0.15)',
                      color: '#22d3ee',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <ThermometerSnowflake size={12} />
                      <span>Cold Bay (2°–8°C)</span>
                    </span>
                  )}

                  {med.isControlledSubstance && (
                    <span style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#f87171',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Lock size={12} />
                      <span>Controlled PIN Lock</span>
                    </span>
                  )}
                </div>

                {/* Beers Criteria Warning (if applicable) */}
                {med.isBeersList && (
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    marginBottom: '14px',
                    fontSize: '0.8rem',
                    color: '#fde68a',
                    lineHeight: 1.4
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, marginBottom: '2px', color: '#fbbf24' }}>
                      <AlertTriangle size={15} />
                      <span>Beers Criteria Geriatric Precaution</span>
                    </div>
                    <div>{med.beersRiskNotes || 'High anticholinergic risk in senior living residents.'}</div>
                  </div>
                )}

                {/* Clinical Specifications Box */}
                <div style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid hsl(215, 25%, 20%)',
                  marginBottom: '14px',
                  fontSize: '0.82rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(215, 20%, 75%)' }}>
                    <span>Target Age Group:</span>
                    <strong style={{ color: '#ffffff' }}>
                      {med.targetAgeGroup === 'GERIATRIC_65_PLUS' ? '👴 Geriatric (65+)' : med.targetAgeGroup.replace('_', ' ')}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(215, 20%, 75%)' }}>
                    <span>Dosing Frequency:</span>
                    <strong style={{ color: '#38bdf8' }}>
                      {med.recommendedFrequency.replace(/_/g, ' ')} (Max {med.maxTimesPerDay}x/day)
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(215, 20%, 75%)' }}>
                    <span>Min Dose Lockout:</span>
                    <strong style={{ color: '#ffffff' }}>{med.minHoursBetweenDoses} hours apart</strong>
                  </div>
                </div>

                {/* Administration Instructions */}
                <p style={{ fontSize: '0.82rem', color: 'hsl(215, 20%, 75%)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                  <strong>Instructions:</strong> {med.instructions}
                </p>

                {med.contraindications && (
                  <p style={{ fontSize: '0.78rem', color: '#fca5a5', margin: '0', lineHeight: 1.4 }}>
                    <strong>Contraindications:</strong> {med.contraindications}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add Medication with AI / OpenFDA */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'hsl(222, 47%, 11%)',
            border: '1px solid hsl(215, 25%, 28%)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#0284c7', padding: '10px', borderRadius: '12px', color: '#ffffff' }}>
                  <Pill size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>Add New Medication</h2>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'hsl(215, 20%, 65%)' }}>
                    Auto-fill verified clinical pharmacology with AI & OpenFDA
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'hsl(215, 20%, 65%)', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* AI Auto-Enrichment Search Bar */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(56, 189, 248, 0.05) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38bdf8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} />
                <span>1-Click Clinical Auto-Fill (OpenFDA & AI Engine)</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Enter drug name & strength (e.g. Amlodipine 10mg, Glipizide 5mg)..."
                  value={enrichQuery}
                  onChange={(e) => setEnrichQuery(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'hsl(217, 33%, 15%)',
                    border: '1px solid hsl(215, 25%, 30%)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={handleEnrich}
                  disabled={isEnriching || !enrichQuery.trim()}
                  style={{
                    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 18px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: isEnriching ? 0.7 : 1
                  }}
                >
                  <Sparkles size={16} />
                  <span>{isEnriching ? 'Querying FDA...' : 'Auto-Fill'}</span>
                </button>
              </div>
              {enrichSuccess && (
                <div style={{ marginTop: '10px', color: '#34d399', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                  <Check size={14} />
                  <span>Pharmacology fields auto-populated from official drug insert! Review below:</span>
                </div>
              )}
            </div>

            {/* Manual Form */}
            <form onSubmit={handleSaveMedication}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'hsl(215, 20%, 75%)', fontWeight: 700, marginBottom: '6px' }}>
                    Generic Drug Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'hsl(217, 33%, 15%)',
                      border: '1px solid hsl(215, 25%, 30%)',
                      borderRadius: '8px',
                      padding: '10px',
                      color: '#ffffff',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'hsl(215, 20%, 75%)', fontWeight: 700, marginBottom: '6px' }}>
                    Brand Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.brandName || ''}
                    onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'hsl(217, 33%, 15%)',
                      border: '1px solid hsl(215, 25%, 30%)',
                      borderRadius: '8px',
                      padding: '10px',
                      color: '#ffffff',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'hsl(215, 20%, 75%)', fontWeight: 700, marginBottom: '6px' }}>
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as MedicationCategory })}
                    style={{
                      width: '100%',
                      background: 'hsl(217, 33%, 15%)',
                      border: '1px solid hsl(215, 25%, 30%)',
                      borderRadius: '8px',
                      padding: '10px',
                      color: '#ffffff',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="CARDIOVASCULAR">Cardiovascular</option>
                    <option value="ANTIDIABETIC">Antidiabetic</option>
                    <option value="ANALGESIC_PAIN">Pain / Analgesic</option>
                    <option value="ANTIBIOTIC">Antibiotic</option>
                    <option value="PSYCHIATRIC_NEUROLOGIC">Neurologic / Psychiatric</option>
                    <option value="RESPIRATORY">Respiratory</option>
                    <option value="GASTROINTESTINAL">Gastrointestinal</option>
                    <option value="SUPPLEMENT_VITAMIN">Vitamin / Supplement</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'hsl(215, 20%, 75%)', fontWeight: 700, marginBottom: '6px' }}>
                    Form *
                  </label>
                  <select
                    value={formData.form}
                    onChange={(e) => setFormData({ ...formData, form: e.target.value as DosageForm })}
                    style={{
                      width: '100%',
                      background: 'hsl(217, 33%, 15%)',
                      border: '1px solid hsl(215, 25%, 30%)',
                      borderRadius: '8px',
                      padding: '10px',
                      color: '#ffffff',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="TABLET">Tablet</option>
                    <option value="CAPSULE">Capsule</option>
                    <option value="LIQUID_ORAL">Oral Liquid</option>
                    <option value="TRANSDERMAL_PATCH">Transdermal Patch</option>
                    <option value="INJECTION">Injection Pen</option>
                    <option value="INHALER">Inhaler</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'hsl(215, 20%, 75%)', fontWeight: 700, marginBottom: '6px' }}>
                    Strength *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 500 mg"
                    value={formData.standardStrength || ''}
                    onChange={(e) => setFormData({ ...formData, standardStrength: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'hsl(217, 33%, 15%)',
                      border: '1px solid hsl(215, 25%, 30%)',
                      borderRadius: '8px',
                      padding: '10px',
                      color: '#ffffff',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>
              </div>

              {/* Age Limits & Beers Criteria */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.25)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid hsl(215, 25%, 22%)',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'hsl(215, 20%, 75%)', fontWeight: 700, marginBottom: '6px' }}>
                      Target Age Group
                    </label>
                    <select
                      value={formData.targetAgeGroup}
                      onChange={(e) => setFormData({ ...formData, targetAgeGroup: e.target.value as AgeGroup })}
                      style={{
                        width: '100%',
                        background: 'hsl(217, 33%, 15%)',
                        border: '1px solid hsl(215, 25%, 30%)',
                        borderRadius: '8px',
                        padding: '8px',
                        color: '#ffffff',
                        fontSize: '0.85rem'
                      }}
                    >
                      <option value="ALL_ADULTS">All Adults (18+)</option>
                      <option value="GERIATRIC_65_PLUS">Geriatric (65+)</option>
                      <option value="ADULT_18_64">Adults (18–64)</option>
                      <option value="PEDIATRIC_UNDER_18">Pediatric (&lt;18)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'hsl(215, 20%, 75%)', fontWeight: 700, marginBottom: '6px' }}>
                      Min Age (Years)
                    </label>
                    <input
                      type="number"
                      value={formData.minAgeYears ?? 18}
                      onChange={(e) => setFormData({ ...formData, minAgeYears: Number(e.target.value) })}
                      style={{
                        width: '100%',
                        background: 'hsl(217, 33%, 15%)',
                        border: '1px solid hsl(215, 25%, 30%)',
                        borderRadius: '8px',
                        padding: '8px',
                        color: '#ffffff',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="beersListCheck"
                    checked={formData.isBeersList || false}
                    onChange={(e) => setFormData({ ...formData, isBeersList: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#f59e0b' }}
                  />
                  <label htmlFor="beersListCheck" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fcd34d' }}>
                    Flag on Beers Criteria (High fall risk / sedative for seniors)
                  </label>
                </div>
              </div>

              {/* Dosing Frequency & Rover Bay Storage */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'hsl(215, 20%, 75%)', fontWeight: 700, marginBottom: '6px' }}>
                    Max Doses Per Day (Ceiling) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={formData.maxTimesPerDay || 1}
                    onChange={(e) => setFormData({ ...formData, maxTimesPerDay: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      background: 'hsl(217, 33%, 15%)',
                      border: '1px solid hsl(215, 25%, 30%)',
                      borderRadius: '8px',
                      padding: '10px',
                      color: '#ffffff',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'hsl(215, 20%, 75%)', fontWeight: 700, marginBottom: '6px' }}>
                    Rover Compartment Storage *
                  </label>
                  <select
                    value={formData.storageTemp}
                    onChange={(e) => setFormData({ ...formData, storageTemp: e.target.value as StorageRequirement })}
                    style={{
                      width: '100%',
                      background: 'hsl(217, 33%, 15%)',
                      border: '1px solid hsl(215, 25%, 30%)',
                      borderRadius: '8px',
                      padding: '10px',
                      color: '#ffffff',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="ROOM_TEMP">Standard Dry Bay (Room Temp)</option>
                    <option value="REFRIGERATED_2_TO_8C">❄️ Cold Thermal Bay (2°C–8°C)</option>
                  </select>
                </div>
              </div>

              {/* Instructions */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'hsl(215, 20%, 75%)', fontWeight: 700, marginBottom: '6px' }}>
                  Administration Instructions *
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.instructions || ''}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'hsl(217, 33%, 15%)',
                    border: '1px solid hsl(215, 25%, 30%)',
                    borderRadius: '8px',
                    padding: '10px',
                    color: '#ffffff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid hsl(215, 25%, 30%)',
                    color: '#ffffff',
                    borderRadius: '10px',
                    padding: '10px 18px',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 24px',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
                  }}
                >
                  Save to Formulary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
