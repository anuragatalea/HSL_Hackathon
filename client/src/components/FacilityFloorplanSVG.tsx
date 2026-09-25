import { useState } from 'react';
import { RoverDevice, RoverTask } from '../types.js';

interface FacilityFloorplanSVGProps {
  rover: RoverDevice | null;
  activeTask: RoverTask | null;
  onSendToRoom?: (roomNumber: string) => void;
}

export function FacilityFloorplanSVG({ rover, activeTask, onSendToRoom }: FacilityFloorplanSVGProps) {
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);

  // Dimension constants (Scale: 4.0 pixels per inch)
  // Building external size: 138 in (11.5 ft) × 216 in (18 ft) => 552px × 864px
  const bX = 90;   // Left margin for dimension arrows
  const bY = 70;   // Top margin for dimension arrows
  const bW = 552;  // Building width (138 in * 4)
  const bH = 864;  // Building length (216 in * 4)

  const isEnRoute = activeTask?.status === 'DISPATCHED' || activeTask?.status === 'EN_ROUTE';

  // Determine current physical static room (ground truth from rover telemetry)
  const getStaticRoom = (): string => {
    const r = rover?.currentRoom?.toUpperCase();
    if (r === 'MED_ROOM' || r === 'STORE' || r === 'MEDICAL') return 'MED_ROOM';
    if (r === 'STATION' || r === 'NURSE') return 'STATION';
    if (r === '101') return '101';
    if (r === '102') return '102';
    if (r === 'DOCK' || r === 'CHARGING') return 'DOCK';

    const tr = activeTask?.roomId?.toUpperCase();
    if (tr === 'MED_ROOM' || tr === 'STORE' || tr === 'MEDICAL') return 'MED_ROOM';
    if (tr === 'STATION' || tr === 'NURSE') return 'STATION';
    if (tr === '101') return '101';
    if (tr === '102') return '102';

    if (rover?.status === 'IDLE' || rover?.status === 'RETURNING') return 'DOCK';
    return activeTask?.resident?.roomNumber || 'DOCK';
  };

  // Determine active destination room when en route
  const getTargetRoom = (): string => {
    const tr = activeTask?.roomId?.toUpperCase();
    if (tr === 'MED_ROOM' || tr === 'STORE' || tr === 'MEDICAL') return 'MED_ROOM';
    if (tr === 'STATION' || tr === 'NURSE') return 'STATION';
    if (tr === '101') return '101';
    if (tr === '102') return '102';
    return activeTask?.resident?.roomNumber || '102';
  };

  const staticRoom = getStaticRoom();
  const targetRoom = getTargetRoom();

  // Real-time Rover Position calculation
  const getRoverSvgPosition = () => {
    // 1. If currently in-flight, interpolate coordinates along the path
    if (isEnRoute) {
      const progress = Math.min(1, Math.max(0, rover ? (rover.currentY - 2) / 8 : 0.5));

      if (targetRoom === '102') {
        if (progress < 0.25) return { x: 562 - (562 - 410) * (progress / 0.25), y: 585 };
        if (progress < 0.8) return { x: 410, y: 585 - (585 - 485) * ((progress - 0.25) / 0.55) };
        return { x: 410 + (502 - 410) * ((progress - 0.8) / 0.2), y: 485 - (485 - 320) * ((progress - 0.8) / 0.2) };
      }

      if (targetRoom === '101') {
        if (progress < 0.25) return { x: 562 - (562 - 410) * (progress / 0.25), y: 585 };
        if (progress < 0.8) return { x: 410, y: 585 - (585 - 485) * ((progress - 0.25) / 0.55) };
        return { x: 410 - (410 - 226) * ((progress - 0.8) / 0.2), y: 485 - (485 - 320) * ((progress - 0.8) / 0.2) };
      }

      if (targetRoom === 'STATION') {
        if (progress < 0.25) return { x: 562 - (562 - 410) * (progress / 0.25), y: 585 };
        if (progress < 0.8) return { x: 410, y: 585 + (700 - 585) * ((progress - 0.25) / 0.55) };
        return { x: 410 - (410 - 215) * ((progress - 0.8) / 0.2), y: 700 + (720 - 700) * ((progress - 0.8) / 0.2) };
      }

      if (targetRoom === 'MED_ROOM') {
        if (progress < 0.25) return { x: 562 - (562 - 410) * (progress / 0.25), y: 585 };
        if (progress < 0.8) return { x: 410, y: 585 + (700 - 585) * ((progress - 0.25) / 0.55) };
        return { x: 410 + (562 - 410) * ((progress - 0.8) / 0.2), y: 700 + (740 - 700) * ((progress - 0.8) / 0.2) };
      }
    }

    // 2. Physical static positions mapped to exact room clear-space center coordinates
    if (staticRoom === 'MED_ROOM') return { x: 562, y: 740 }; // Medical Store (bottom right)
    if (staticRoom === 'STATION') return { x: 215, y: 720 };  // Nurse Station (bottom left)
    if (staticRoom === '101') return { x: 226, y: 320 };      // Room 101 bedside (top left)
    if (staticRoom === '102') return { x: 502, y: 320 };      // Room 102 bedside (top right)
    if (staticRoom === 'DOCK' || rover?.status === 'RETURNING') return { x: 562, y: 585 }; // Charging Dock

    // 3. Fallback normalized coordinate mapping (0..20m, 0..12m)
    const normX = rover ? Math.min(1, Math.max(0, rover.currentX / 20)) : 0.5;
    const normY = rover ? Math.min(1, Math.max(0, (12 - rover.currentY) / 12)) : 0.5;
    return {
      x: bX + normX * bW,
      y: bY + normY * bH
    };
  };

  const roverPos = getRoverSvgPosition();

  return (
    <div style={{
      width: '100%',
      background: 'radial-gradient(circle at 45% 45%, #0f172a 0%, #070d18 100%)',
      borderRadius: '16px',
      border: '1px solid rgba(56, 189, 248, 0.25)',
      boxShadow: '0 12px 48px rgba(0, 0, 0, 0.65)',
      overflow: 'hidden',
      position: 'relative',
      padding: '8px'
    }}>
      <svg
        viewBox="0 0 730 1060"
        style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '720px', margin: '0 auto' }}
      >
        <defs>
          {/* Neon Glow Filters */}
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Warm Ceramic Floor Tile Pattern */}
          <pattern id="floor-tiles" width="32" height="32" patternUnits="userSpaceOnUse">
            <rect width="32" height="32" fill="#e9d3b4" stroke="#dfc29c" strokeWidth="1" />
          </pattern>

          {/* Nurse Station Floor Tile Pattern */}
          <pattern id="nurse-tiles" width="32" height="32" patternUnits="userSpaceOnUse">
            <rect width="32" height="32" fill="#eddcc4" stroke="#e0cbb0" strokeWidth="1" />
          </pattern>

          {/* Corridor Floor Pattern */}
          <pattern id="corridor-tiles" width="36" height="36" patternUnits="userSpaceOnUse">
            <rect width="36" height="36" fill="#f0dfc8" stroke="#e4ceb2" strokeWidth="1" />
          </pattern>

          {/* Charging Station Hazard Warning Stripes (Yellow & Black diagonal) */}
          <pattern id="hazard-pattern" width="20" height="20" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width="10" height="20" fill="#f59e0b" />
            <rect x="10" width="10" height="20" fill="#18181b" />
          </pattern>

          {/* Dimension Arrow Marker */}
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#475569" />
          </marker>
        </defs>

        {/* ============================================================== */}
        {/* 1. TOP DIMENSION CALLOUTS (11.5 ft / 138 in Overall Width)     */}
        {/* ============================================================== */}
        <g stroke="#475569" strokeWidth="1.5">
          {/* Main Top Overall Line */}
          <line x1={bX} y1="30" x2={bX + bW} y2="30" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
          <line x1={bX} y1="20" x2={bX} y2="65" />
          <line x1={bX + bW} y1="20" x2={bX + bW} y2="65" />

          {/* Segment Dimension Lines (2" | 5'6" | 2" | 5'6" | 2") */}
          <line x1={bX} y1="52" x2={bX + 8} y2="52" />
          <line x1={bX + 8} y1="52" x2={bX + 8 + 264} y2="52" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
          <line x1={bX + 8 + 264} y1="52" x2={bX + 8 + 264 + 8} y2="52" />
          <line x1={bX + 8 + 264 + 8} y1="52" x2={bX + 8 + 264 + 8 + 264} y2="52" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
          <line x1={bX + bW - 8} y1="52" x2={bX + bW} y2="52" />

          <line x1={bX + 8} y1="45" x2={bX + 8} y2="65" />
          <line x1={bX + 272} y1="45" x2={bX + 272} y2="65" />
          <line x1={bX + 280} y1="45" x2={bX + 280} y2="65" />
          <line x1={bX + 544} y1="45" x2={bX + 544} y2="65" />
        </g>
        <text x={bX + bW / 2} y="22" fill="#0f172a" fontSize="13" fontWeight="800" textAnchor="middle" style={{ paintOrder: 'stroke', stroke: '#e2e8f0', strokeWidth: 3 }}>
          11.5 ft (138 in) - Overall Width
        </text>
        <text x={bX + 4} y="48" fill="#475569" fontSize="9" fontWeight="700" textAnchor="middle">2"</text>
        <text x={bX + 8 + 132} y="48" fill="#0f172a" fontSize="11" fontWeight="700" textAnchor="middle" style={{ paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: 2 }}>
          5 ft 6 in (66 in)
        </text>
        <text x={bX + 276} y="48" fill="#475569" fontSize="9" fontWeight="700" textAnchor="middle">2"</text>
        <text x={bX + 280 + 132} y="48" fill="#0f172a" fontSize="11" fontWeight="700" textAnchor="middle" style={{ paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: 2 }}>
          5 ft 6 in (66 in)
        </text>
        <text x={bX + bW - 4} y="48" fill="#475569" fontSize="9" fontWeight="700" textAnchor="middle">2"</text>

        {/* ============================================================== */}
        {/* 2. LEFT DIMENSION CALLOUTS (18 ft / 216 in Overall Length)     */}
        {/* ============================================================== */}
        <g stroke="#475569" strokeWidth="1.5">
          {/* Main Left Overall Line */}
          <line x1="26" y1={bY} x2="26" y2={bY + bH} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
          <line x1="18" y1={bY} x2={bX} y2={bY} />
          <line x1="18" y1={bY + bH} x2={bX} y2={bY + bH} />

          {/* Sub-Segments: 2" | 9 ft (108 in) | 2" | 8 ft 6 in (102 in) | 2" */}
          <line x1="62" y1={bY + 8} x2="62" y2={bY + 8 + 432} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
          <line x1="54" y1={bY + 8 + 432} x2={bX} y2={bY + 8 + 432} />
          <line x1="54" y1={bY + 8 + 432 + 8} x2={bX} y2={bY + 8 + 432 + 8} />
          <line x1="62" y1={bY + 8 + 432 + 8} x2="62" y2={bY + 8 + 432 + 8 + 408} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
        </g>
        <g transform={`rotate(-90, 20, ${bY + bH / 2})`}>
          <text x="20" y={bY + bH / 2 - 8} fill="#0f172a" fontSize="13" fontWeight="800" textAnchor="middle" style={{ paintOrder: 'stroke', stroke: '#e2e8f0', strokeWidth: 3 }}>
            18 ft (216 in) - Overall Length
          </text>
        </g>
        <g transform={`rotate(-90, 56, ${bY + 8 + 216})`}>
          <text x="56" y={bY + 8 + 216 - 6} fill="#0f172a" fontSize="11" fontWeight="700" textAnchor="middle" style={{ paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: 2 }}>
            9 ft (108 in)
          </text>
        </g>
        <g transform={`rotate(-90, 56, ${bY + 448 + 204})`}>
          <text x="56" y={bY + 448 + 204 - 6} fill="#0f172a" fontSize="11" fontWeight="700" textAnchor="middle" style={{ paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: 2 }}>
            8 ft 6 in (102 in)
          </text>
        </g>

        {/* ============================================================== */}
        {/* 3. RIGHT DIMENSION SEGMENT TICKS (Charging & Medical Store)    */}
        {/* ============================================================== */}
        <g stroke="#475569" strokeWidth="1.5">
          <line x1="656" y1={bY + 448} x2="656" y2={bY + 448 + 144} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
          <line x1={bX + bW} y1={bY + 448} x2="664" y2={bY + 448} />
          <line x1={bX + bW} y1={bY + 448 + 144} x2="664" y2={bY + 448 + 144} />

          <line x1="656" y1={bY + 448 + 144 + 8} x2="656" y2={bY + bH - 8} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
          <line x1={bX + bW} y1={bY + 448 + 144 + 8} x2="664" y2={bY + 448 + 144 + 8} />
          <line x1={bX + bW} y1={bY + bH - 8} x2="664" y2={bY + bH - 8} />
        </g>
        <g transform={`rotate(90, 668, ${bY + 448 + 72})`}>
          <text x="668" y={bY + 448 + 72} fill="#0f172a" fontSize="10" fontWeight="700" textAnchor="middle" style={{ paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: 2 }}>
            3 ft (36 in)
          </text>
        </g>
        <g transform={`rotate(90, 668, ${bY + 600 + 128})`}>
          <text x="668" y={bY + 600 + 128} fill="#0f172a" fontSize="10" fontWeight="700" textAnchor="middle" style={{ paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: 2 }}>
            5 ft 4 in (64 in)
          </text>
        </g>

        {/* ============================================================== */}
        {/* 4. MAIN BUILDING FLOOR & ROOM SURFACES                        */}
        {/* ============================================================== */}

        {/* Room 101 Floor (Robert Davis) */}
        <g>
          <rect x={bX + 8} y={bY + 8} width="264" height="432" fill="url(#floor-tiles)" />
          {/* Subtle Bed Area Rug */}
          <rect x={bX + 8 + 48} y={bY + 8 + 64} width="168" height="240" rx="4" fill="#64748b" opacity="0.4" />
          {/* Bed Base & Pillows */}
          <rect x={bX + 8 + 64} y={bY + 8 + 44} width="136" height="260" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.15))" />
          {/* Dual Pillows */}
          <rect x={bX + 8 + 76} y={bY + 8 + 54} width="48" height="32" rx="4" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <rect x={bX + 8 + 140} y={bY + 8 + 54} width="48" height="32" rx="4" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          {/* Olive Green Blanket (Bedspread) */}
          <rect x={bX + 8 + 64} y={bY + 8 + 104} width="136" height="200" rx="4" fill="#627d4d" />
          <rect x={bX + 8 + 64} y={bY + 8 + 104} width="136" height="26" fill="#ddceba" />

          {/* Room 101 Badge */}
          <rect x={bX + 8 + 56} y={bY + 8 + 16} width="152" height="26" rx="4" fill="#003882" />
          <text x={bX + 8 + 132} y={bY + 8 + 33} fill="#ffffff" fontSize="12" fontWeight="800" textAnchor="middle">
            Room 101
          </text>
          <text x={bX + 8 + 132} y={bY + 8 + 320} fill="#475569" fontSize="11" fontWeight="700" textAnchor="middle">
            Robert Davis
          </text>

          {/* Bedside Arrival Waypoint Ring */}
          <circle cx={bX + 8 + 132} cy={bY + 8 + 338} r="8" fill={staticRoom === '101' ? '#10b981' : '#38bdf8'} />

          {/* Interactive Hit Area & Hover Callout */}
          <rect
            x={bX + 8}
            y={bY + 8}
            width="264"
            height="432"
            fill={hoveredRoom === '101' ? 'rgba(56, 189, 248, 0.16)' : 'rgba(0,0,0,0.001)'}
            stroke={hoveredRoom === '101' ? '#38bdf8' : 'transparent'}
            strokeWidth="3"
            style={{ cursor: 'pointer', pointerEvents: 'all' }}
            onMouseEnter={() => setHoveredRoom('101')}
            onMouseLeave={() => setHoveredRoom(null)}
            onClick={(e) => {
              e.stopPropagation();
              onSendToRoom?.('101');
            }}
          />
          {hoveredRoom === '101' && (
            <g transform={`translate(${bX + 8 + 52}, ${bY + 8 + 355})`} pointerEvents="none">
              <rect width="160" height="28" rx="6" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.5))" />
              <text x="80" y="18" fill="#ffffff" fontSize="11" fontWeight="800" textAnchor="middle">
                🚀 Send Rover Here
              </text>
            </g>
          )}
        </g>

        {/* Room 102 Floor (Mary Johnson - HERO Room) */}
        <g>
          <rect
            x={bX + 280}
            y={bY + 8}
            width="264"
            height="432"
            fill="url(#floor-tiles)"
            style={{
              filter: staticRoom === '102' ? 'url(#glow-green)' : undefined
            }}
          />
          {/* Bed Area Rug */}
          <rect x={bX + 280 + 48} y={bY + 8 + 64} width="168" height="240" rx="4" fill="#64748b" opacity="0.4" />
          {/* Bed Base & Pillows */}
          <rect x={bX + 280 + 64} y={bY + 8 + 44} width="136" height="260" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.15))" />
          {/* Dual Pillows */}
          <rect x={bX + 280 + 76} y={bY + 8 + 54} width="48" height="32" rx="4" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <rect x={bX + 280 + 140} y={bY + 8 + 54} width="48" height="32" rx="4" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          {/* Salmon / Peach Blanket (Bedspread matching blueprint) */}
          <rect x={bX + 280 + 64} y={bY + 8 + 104} width="136" height="200" rx="4" fill="#df8b75" />
          <rect x={bX + 280 + 64} y={bY + 8 + 104} width="136" height="26" fill="#ddceba" />

          {/* Room 102 Badge */}
          <rect x={bX + 280 + 56} y={bY + 8 + 16} width="152" height="26" rx="4" fill="#003882" />
          <text x={bX + 280 + 132} y={bY + 8 + 33} fill="#ffffff" fontSize="12" fontWeight="800" textAnchor="middle">
            Room 102
          </text>
          <text x={bX + 280 + 132} y={bY + 8 + 320} fill="#df8b75" fontSize="11" fontWeight="800" textAnchor="middle">
            Mary Johnson (Hero)
          </text>

          {/* Bedside Arrival Waypoint Ring */}
          <circle cx={bX + 280 + 132} cy={bY + 8 + 338} r="8" fill={staticRoom === '102' ? '#10b981' : '#38bdf8'} />

          {/* Interactive Hit Area & Hover Callout */}
          <rect
            x={bX + 280}
            y={bY + 8}
            width="264"
            height="432"
            fill={hoveredRoom === '102' ? 'rgba(56, 189, 248, 0.16)' : 'rgba(0,0,0,0.001)'}
            stroke={hoveredRoom === '102' ? '#38bdf8' : 'transparent'}
            strokeWidth="3"
            style={{ cursor: 'pointer', pointerEvents: 'all' }}
            onMouseEnter={() => setHoveredRoom('102')}
            onMouseLeave={() => setHoveredRoom(null)}
            onClick={(e) => {
              e.stopPropagation();
              onSendToRoom?.('102');
            }}
          />
          {hoveredRoom === '102' && (
            <g transform={`translate(${bX + 280 + 52}, ${bY + 8 + 355})`} pointerEvents="none">
              <rect width="160" height="28" rx="6" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.5))" />
              <text x="80" y="18" fill="#ffffff" fontSize="11" fontWeight="800" textAnchor="middle">
                🚀 Send Rover Here
              </text>
            </g>
          )}
        </g>

        {/* Nurse Station (Bottom-Left) */}
        <g>
          <rect x={bX + 8} y={bY + 448} width="232" height="408" fill="url(#nurse-tiles)" />
          {/* Nurse Station Title Badge */}
          <rect x={bX + 8 + 38} y={bY + 448 + 68} width="156" height="26" rx="4" fill="#003882" />
          <text x={bX + 8 + 116} y={bY + 448 + 85} fill="#ffffff" fontSize="12" fontWeight="800" textAnchor="middle">
            Nurse Station
          </text>
          {/* Dimension In-Room Label */}
          <line x1={bX + 20} y1={bY + 448 + 32} x2={bX + 8 + 212} y2={bY + 448 + 32} stroke="#475569" strokeWidth="1" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
          <text x={bX + 8 + 116} y={bY + 448 + 26} fill="#0f172a" fontSize="10" fontWeight="700" textAnchor="middle">
            4 ft 10 in (58 in)
          </text>
          <g transform={`rotate(-90, ${bX + 26}, ${bY + 448 + 204})`}>
            <text x={bX + 26} y={bY + 448 + 204 - 6} fill="#0f172a" fontSize="10" fontWeight="700" textAnchor="middle">
              8 ft 6 in (102 in)
            </text>
          </g>

          {/* Station Waypoint Ring */}
          <circle cx={bX + 8 + 116} cy={bY + 448 + 260} r="8" fill={staticRoom === 'STATION' ? '#10b981' : '#38bdf8'} />

          {/* Interactive Hit Area & Hover Callout */}
          <rect
            x={bX + 8}
            y={bY + 448}
            width="232"
            height="408"
            fill={hoveredRoom === 'STATION' ? 'rgba(56, 189, 248, 0.16)' : 'rgba(0,0,0,0.001)'}
            stroke={hoveredRoom === 'STATION' ? '#38bdf8' : 'transparent'}
            strokeWidth="3"
            style={{ cursor: 'pointer', pointerEvents: 'all' }}
            onMouseEnter={() => setHoveredRoom('STATION')}
            onMouseLeave={() => setHoveredRoom(null)}
            onClick={(e) => {
              e.stopPropagation();
              onSendToRoom?.('STATION');
            }}
          />
          {hoveredRoom === 'STATION' && (
            <g transform={`translate(${bX + 8 + 36}, ${bY + 448 + 330})`} pointerEvents="none">
              <rect width="160" height="28" rx="6" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.5))" />
              <text x="80" y="18" fill="#ffffff" fontSize="11" fontWeight="800" textAnchor="middle">
                🚀 Send Rover Here
              </text>
            </g>
          )}
        </g>

        {/* Charging Station (Middle-Right) */}
        <g>
          <rect x={bX + 400} y={bY + 448} width="144" height="144" fill="#e9d3b4" />
          {/* Charging Station Title Badge */}
          <rect x={bX + 400 + 12} y={bY + 448 + 26} width="120" height="24" rx="4" fill="#003882" />
          <text x={bX + 400 + 72} y={bY + 448 + 42} fill="#ffffff" fontSize="11" fontWeight="800" textAnchor="middle">
            Charging Station
          </text>

          {/* Yellow & Black Hazard Striped Charging Perimeter */}
          <rect x={bX + 400 + 20} y={bY + 448 + 56} width="104" height="80" fill="url(#hazard-pattern)" stroke="#18181b" strokeWidth="1.5" />
          {/* Dark Charger Base Pad with Lightning Bolt */}
          <rect x={bX + 400 + 28} y={bY + 448 + 64} width="88" height="64" rx="4" fill="#27272a" stroke="#f59e0b" strokeWidth="1.5" />
          <path
            d="M 470 535 L 464 547 L 471 547 L 467 561 L 476 545 L 470 545 Z"
            fill="#ffffff"
            filter="drop-shadow(0 0 4px #38bdf8)"
          />

          {/* In-room Dimension Ticks */}
          <line x1={bX + 400 + 12} y1={bY + 448 + 14} x2={bX + 400 + 132} y2={bY + 448 + 14} stroke="#475569" strokeWidth="1" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
          <text x={bX + 400 + 72} y={bY + 448 + 10} fill="#0f172a" fontSize="9" fontWeight="700" textAnchor="middle">
            3 ft (36 in)
          </text>

          {/* Interactive Hit Area & Hover Callout */}
          <rect
            x={bX + 400}
            y={bY + 448}
            width="144"
            height="144"
            fill={hoveredRoom === 'DOCK' ? 'rgba(245, 158, 11, 0.22)' : 'rgba(0,0,0,0.001)'}
            stroke={hoveredRoom === 'DOCK' ? '#f59e0b' : 'transparent'}
            strokeWidth="3"
            style={{ cursor: 'pointer', pointerEvents: 'all' }}
            onMouseEnter={() => setHoveredRoom('DOCK')}
            onMouseLeave={() => setHoveredRoom(null)}
            onClick={(e) => {
              e.stopPropagation();
              onSendToRoom?.('DOCK');
            }}
          />
          {hoveredRoom === 'DOCK' && (
            <g transform={`translate(${bX + 400 + 4}, ${bY + 448 + 105})`} pointerEvents="none">
              <rect width="136" height="26" rx="6" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.5))" />
              <text x="68" y="17" fill="#0f172a" fontSize="10.5" fontWeight="900" textAnchor="middle">
                ⚡ Return to Dock
              </text>
            </g>
          )}
        </g>

        {/* Medical Store (Bottom-Right) */}
        <g>
          <rect x={bX + 400} y={bY + 600} width="144" height="256" fill="#e9d3b4" />
          {/* Medical Store Title Badge */}
          <rect x={bX + 400 + 16} y={bY + 600 + 28} width="112" height="24" rx="4" fill="#003882" />
          <text x={bX + 400 + 72} y={bY + 600 + 44} fill="#ffffff" fontSize="11" fontWeight="800" textAnchor="middle">
            Medical Store
          </text>

          {/* Medicine Shelves Unit (Color vials / pills boxes) */}
          <g transform={`translate(${bX + 400 + 20}, ${bY + 600 + 64})`}>
            <rect width="52" height="100" rx="3" fill="#854d0e" stroke="#451a03" strokeWidth="1.5" />
            <line x1="0" y1="25" x2="52" y2="25" stroke="#451a03" strokeWidth="1.5" />
            <line x1="0" y1="50" x2="52" y2="50" stroke="#451a03" strokeWidth="1.5" />
            <line x1="0" y1="75" x2="52" y2="75" stroke="#451a03" strokeWidth="1.5" />
            {/* Vials & Pill Packs */}
            <rect x="6" y="8" width="16" height="12" rx="2" fill="#38bdf8" />
            <rect x="28" y="8" width="16" height="12" rx="2" fill="#10b981" />
            <rect x="6" y="33" width="16" height="12" rx="2" fill="#f59e0b" />
            <rect x="28" y="33" width="16" height="12" rx="2" fill="#ef4444" />
            <rect x="6" y="58" width="16" height="12" rx="2" fill="#818cf8" />
            <rect x="28" y="58" width="16" height="12" rx="2" fill="#ec4899" />
          </g>

          {/* Preparation Desk Countertop */}
          <rect x={bX + 400 + 12} y={bY + 600 + 180} width="120" height="52" rx="4" fill="#d97706" stroke="#92400e" strokeWidth="1.5" />

          {/* Dimension In-Room Label */}
          <line x1={bX + 400 + 16} y1={bY + 600 + 14} x2={bX + 400 + 128} y2={bY + 600 + 14} stroke="#475569" strokeWidth="1" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
          <text x={bX + 400 + 72} y={bY + 600 + 10} fill="#0f172a" fontSize="9" fontWeight="700" textAnchor="middle">
            3 ft (36 in)
          </text>

          {/* Store Waypoint Ring */}
          <circle cx={bX + 400 + 72} cy={bY + 600 + 150} r="8" fill={staticRoom === 'MED_ROOM' ? '#10b981' : '#38bdf8'} />

          {/* Interactive Hit Area & Hover Callout */}
          <rect
            x={bX + 400}
            y={bY + 600}
            width="144"
            height="256"
            fill={hoveredRoom === 'MED_ROOM' ? 'rgba(56, 189, 248, 0.16)' : 'rgba(0,0,0,0.001)'}
            stroke={hoveredRoom === 'MED_ROOM' ? '#38bdf8' : 'transparent'}
            strokeWidth="3"
            style={{ cursor: 'pointer', pointerEvents: 'all' }}
            onMouseEnter={() => setHoveredRoom('MED_ROOM')}
            onMouseLeave={() => setHoveredRoom(null)}
            onClick={(e) => {
              e.stopPropagation();
              onSendToRoom?.('MED_ROOM');
            }}
          />
          {hoveredRoom === 'MED_ROOM' && (
            <g transform={`translate(${bX + 400 + 4}, ${bY + 600 + 130})`} pointerEvents="none">
              <rect width="136" height="26" rx="6" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.5))" />
              <text x="68" y="17" fill="#ffffff" fontSize="10.5" fontWeight="800" textAnchor="middle">
                🚀 Send Rover Here
              </text>
            </g>
          )}
        </g>

        {/* Central Corridor (3 ft / 36 in Rover Path) */}
        <g>
          <rect x={bX + 248} y={bY + 448} width="144" height="416" fill="url(#corridor-tiles)" />
          {/* Corridor Dimension Ticks at bottom */}
          <line x1={bX + 254} y1={bY + 840} x2={bX + 248 + 138} y2={bY + 840} stroke="#475569" strokeWidth="1" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
          <text x={bX + 248 + 72} y={bY + 834} fill="#0f172a" fontSize="10" fontWeight="700" textAnchor="middle">
            3 ft (36 in)
          </text>

          {/* Rover Path Title */}
          <text x={bX + 248 + 72} y={bY + 615} fill="#0f172a" fontSize="11" fontWeight="800" textAnchor="middle">
            Rover
          </text>
          <text x={bX + 248 + 72} y={bY + 630} fill="#0f172a" fontSize="11" fontWeight="800" textAnchor="middle">
            Path
          </text>
          <text x={bX + 248 + 72} y={bY + 646} fill="#475569" fontSize="10" fontWeight="700" textAnchor="middle">
            (3 ft / 36 in)
          </text>

          {/* Rover Path (Dashed Guide Line) */}
          <line
            x1={bX + 248 + 72}
            y1={bY + 448}
            x2={bX + 248 + 72}
            y2={bY + 864}
            stroke="#0f172a"
            strokeWidth="3"
            strokeDasharray="12 10"
          />

          {/* Branch track into Charging Station */}
          <line
            x1={bX + 248 + 72}
            y1={bY + 520}
            x2={bX + 400 + 72}
            y2={bY + 520}
            stroke="#0f172a"
            strokeWidth="2.5"
            strokeDasharray="8 6"
          />
        </g>

        {/* Dynamic Glowing Active Trajectory to Destination */}
        {isEnRoute && targetRoom === '102' && (
          <path
            d={`M 562 585 L 410 585 L 410 485 L 502 320`}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="5"
            filter="url(#glow-cyan)"
            strokeDasharray="10 8"
          />
        )}
        {isEnRoute && targetRoom === '101' && (
          <path
            d={`M 562 585 L 410 585 L 410 485 L 226 320`}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="5"
            filter="url(#glow-cyan)"
            strokeDasharray="10 8"
          />
        )}
        {isEnRoute && (targetRoom === 'STATION' || targetRoom === 'NURSE') && (
          <path
            d={`M 562 585 L 410 585 L 410 700 L 215 720`}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="5"
            filter="url(#glow-cyan)"
            strokeDasharray="10 8"
          />
        )}
        {isEnRoute && (targetRoom === 'MED_ROOM' || targetRoom === 'STORE' || targetRoom === 'MEDICAL') && (
          <path
            d={`M 562 585 L 410 585 L 410 700 L 562 740`}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="5"
            filter="url(#glow-cyan)"
            strokeDasharray="10 8"
          />
        )}
        {(rover?.status === 'RETURNING' || targetRoom === 'DOCK') && (
          <path
            d={`M 410 650 L 410 585 L 562 585`}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="5"
            filter="url(#glow-cyan)"
            strokeDasharray="10 8"
          />
        )}

        {/* ============================================================== */}
        {/* 5. ARCHITECTURAL WALLS & DOORWAY OPENINGS                     */}
        {/* ============================================================== */}
        <g fill="#1e293b" stroke="#334155" strokeWidth="1">
          {/* Outer Left Wall (2 in) */}
          <rect x={bX} y={bY} width="8" height={bH} />
          {/* Outer Right Wall (2 in) */}
          <rect x={bX + bW - 8} y={bY} width="8" height={bH} />
          {/* Outer Top Wall (2 in) */}
          <rect x={bX} y={bY} width={bW} height="8" />
          {/* Outer Bottom Wall (Left segment below Nurse Station) */}
          <rect x={bX} y={bY + bH - 8} width="248" height="8" />
          {/* Outer Bottom Wall (Right segment below Medical Store) */}
          <rect x={bX + 392} y={bY + bH - 8} width="160" height="8" />

          {/* Central Vertical Dividing Wall between Room 101 & 102 */}
          <rect x={bX + 272} y={bY} width="8" height="440" />

          {/* Horizontal Dividing Wall (Separating Bedrooms from Lower Wing) */}
          <rect x={bX} y={bY + 440} width="160" height="8" />
          <rect x={bX + 392} y={bY + 440} width="160" height="8" />

          {/* Vertical Wall: Nurse Station to Corridor (with doorway) */}
          <rect x={bX + 240} y={bY + 440} width="8" height="180" />
          <rect x={bX + 240} y={bY + 700} width="8" height="156" />

          {/* Vertical Wall: Corridor to Charging & Medical Store (with doorways) */}
          <rect x={bX + 392} y={bY + 440} width="8" height="30" />
          <rect x={bX + 392} y={bY + 540} width="8" height="120" />
          <rect x={bX + 392} y={bY + 740} width="8" height="116" />

          {/* Horizontal Dividing Wall between Charging Station & Medical Store */}
          <rect x={bX + 392} y={bY + 592} width="160" height="8" />
        </g>

        {/* ============================================================== */}
        {/* 6. BLUE ENTRANCE MAT                                           */}
        {/* ============================================================== */}
        <g>
          {/* Mat Background extending through entrance portal */}
          <rect x={bX + 248} y={bY + bH - 12} width="144" height="68" rx="6" fill="#003882" stroke="#1d4ed8" strokeWidth="2" />
          <text x={bX + 248 + 72} y={bY + bH + 28} fill="#ffffff" fontSize="13" fontWeight="900" textAnchor="middle" letterSpacing="1">
            ENTRANCE
          </text>
        </g>

        {/* ============================================================== */}
        {/* 7. REAL-TIME ANIMATED ROVER MARKER                             */}
        {/* ============================================================== */}
        <g
          transform={`translate(${roverPos.x}, ${roverPos.y})`}
          style={{ transition: 'transform 0.4s ease-out' }}
        >
          {/* Sonar Ping Ring */}
          <circle
            r="28"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2"
            opacity="0.4"
            className="animate-ping"
          />

          {/* Rover Body Shield */}
          <circle
            r="20"
            fill="linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)"
            stroke="#ffffff"
            strokeWidth="2.5"
            filter="url(#glow-cyan)"
          />

          {/* Robot Avatar Icon */}
          <text x="0" y="6" textAnchor="middle" fontSize="18" fill="#ffffff">
            🤖
          </text>

          {/* Live Floating Telemetry Tooltip Badge */}
          <rect
            x="-65"
            y="-44"
            width="130"
            height="22"
            rx="6"
            fill="#0f172a"
            stroke="rgba(56, 189, 248, 0.6)"
            strokeWidth="1.5"
          />
          <text x="0" y="-29" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="700">
            Rover-01 • {rover?.status || 'IDLE'}
          </text>
        </g>

        {/* ============================================================== */}
        {/* 8. BOTTOM PROTOTYPE TITLE PILL                                 */}
        {/* ============================================================== */}
        <g transform="translate(156, 1010)">
          <rect width="420" height="34" rx="17" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1.5" />
          <text x="210" y="22" fill="#003882" fontSize="13" fontWeight="900" textAnchor="middle" letterSpacing="0.5">
            Final Prototype Layout - Accurate Dimensions
          </text>
        </g>
      </svg>
    </div>
  );
}
