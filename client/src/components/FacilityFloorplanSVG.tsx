import { RoverDevice, RoverTask } from '../types.js';

interface FacilityFloorplanSVGProps {
  rover: RoverDevice | null;
  activeTask: RoverTask | null;
}

export function FacilityFloorplanSVG({ rover, activeTask }: FacilityFloorplanSVGProps) {
  // Convert physical coordinates to SVG canvas (viewBox 0 0 1000 650)
  // X: 0m -> 20m  =>  svgX: 50 -> 950
  // Y: 0m -> 12m  =>  svgY: 580 -> 70 (inverted so Y=0 is bottom dock, Y=12 is top rooms)
  const toSvgX = (x: number) => 50 + (x / 20) * 900;
  const toSvgY = (y: number) => 580 - (y / 12) * 510;

  const roverX = rover ? toSvgX(rover.currentX) : toSvgX(10.0);
  const roverY = rover ? toSvgY(rover.currentY) : toSvgY(2.0);

  const isEnRoute = activeTask?.status === 'DISPATCHED' || activeTask?.status === 'EN_ROUTE';
  const isArrived = activeTask?.status === 'ARRIVED' || activeTask?.status === 'AWAITING_CONFIRMATION';
  const targetRoom = activeTask?.resident?.roomNumber || '102';

  return (
    <div style={{
      width: '100%',
      background: 'radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0.9) 0%, rgba(10, 15, 29, 0.98) 100%)',
      borderRadius: '16px',
      border: '1px solid rgba(56, 189, 248, 0.2)',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <svg
        viewBox="0 0 1000 650"
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <defs>
          {/* Neon Glow Filters */}
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-pink" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Grid Pattern */}
          <pattern id="facility-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(56, 189, 248, 0.05)" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Facility Architectural Grid Background */}
        <rect width="1000" height="650" fill="url(#facility-grid)" />

        {/* Facility Boundary (13 ft × 20 ft Taped Layout) */}
        <rect
          x="30"
          y="30"
          width="940"
          height="590"
          rx="14"
          fill="none"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="2"
          strokeDasharray="6 6"
        />

        <text x="50" y="55" fill="rgba(255, 255, 255, 0.3)" fontSize="12" fontWeight="700" letterSpacing="1">
          13 FT × 20 FT DEMO TEST FOOTPRINT
        </text>

        {/* ============================================================== */}
        {/* TAPED CORRIDOR & ROUTE NETWORK */}
        {/* ============================================================== */}
        {/* Main Central Fairway Corridor */}
        <rect
          x="440"
          y="150"
          width="120"
          height="370"
          rx="8"
          fill="rgba(56, 189, 248, 0.03)"
          stroke="rgba(56, 189, 248, 0.15)"
          strokeWidth="1"
        />
        <text x="500" y="340" textAnchor="middle" fill="rgba(56, 189, 248, 0.25)" fontSize="12" fontWeight="700" letterSpacing="2">
          CENTRAL CORRIDOR
        </text>

        {/* Taped Guide Lines on the Floor */}
        <g stroke="rgba(245, 158, 11, 0.3)" strokeWidth="2" strokeDasharray="5 5">
          {/* Center Line from Dock up to Rooms */}
          <line x1="500" y1="520" x2="500" y2="150" />
          {/* Branch to Room 101 */}
          <line x1="500" y1="150" x2="250" y2="150" />
          {/* Branch to Room 102 (Hero) */}
          <line x1="500" y1="150" x2="750" y2="150" />
          {/* Branch to Room 103 */}
          <line x1="500" y1="410" x2="250" y2="410" />
          {/* Branch to Caregiver Station */}
          <line x1="500" y1="450" x2="750" y2="450" />
        </g>

        {/* Dynamic Glowing Active Route (when en route to Room 102) */}
        {isEnRoute && targetRoom === '102' && (
          <path
            d="M 500 520 L 500 150 L 750 150"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="4"
            filter="url(#glow-cyan)"
            strokeDasharray="8 8"
            className="animate-pulse"
          />
        )}

        {/* ============================================================== */}
        {/* FACILITY ROOMS & STATIONS */}
        {/* ============================================================== */}

        {/* 1. ROOM 101 (Robert Davis) */}
        <g>
          <rect
            x="60"
            y="70"
            width="220"
            height="160"
            rx="12"
            fill={targetRoom === '101' && isArrived ? 'rgba(16, 185, 129, 0.15)' : 'rgba(15, 23, 42, 0.7)'}
            stroke={targetRoom === '101' && isArrived ? '#10b981' : 'rgba(56, 189, 248, 0.25)'}
            strokeWidth="2"
            filter={targetRoom === '101' && isArrived ? 'url(#glow-green)' : undefined}
          />
          <text x="80" y="105" fill="#f8fafc" fontSize="16" fontWeight="800">
            ROOM 101
          </text>
          <text x="80" y="125" fill="#94a3b8" fontSize="12" fontWeight="500">
            Robert Davis
          </text>
          <rect x="80" y="145" width="80" height="50" rx="6" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255, 255, 255, 0.1)" />
          <text x="120" y="175" textAnchor="middle" fill="rgba(255, 255, 255, 0.4)" fontSize="10">🛏️ BED</text>
          <circle cx="280" cy="150" r="6" fill="#38bdf8" />
          <text x="270" y="135" fill="#38bdf8" fontSize="9" textAnchor="end">WAYPOINT</text>
        </g>

        {/* 2. ROOM 102 (HERO ROOM - Mary Johnson) */}
        <g>
          <rect
            x="720"
            y="70"
            width="220"
            height="160"
            rx="12"
            fill={
              targetRoom === '102' && isArrived
                ? 'rgba(16, 185, 129, 0.2)'
                : targetRoom === '102' && isEnRoute
                ? 'rgba(56, 189, 248, 0.15)'
                : 'rgba(15, 23, 42, 0.7)'
            }
            stroke={
              targetRoom === '102' && isArrived
                ? '#10b981'
                : targetRoom === '102' && isEnRoute
                ? '#38bdf8'
                : 'rgba(56, 189, 248, 0.4)'
            }
            strokeWidth={targetRoom === '102' ? 3 : 2}
            filter={targetRoom === '102' && (isArrived || isEnRoute) ? (isArrived ? 'url(#glow-green)' : 'url(#glow-cyan)') : undefined}
          />
          <rect x="740" y="85" width="48" height="18" rx="4" fill="#38bdf8" />
          <text x="764" y="98" textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="800">
            HERO
          </text>
          <text x="740" y="125" fill="#f8fafc" fontSize="16" fontWeight="800">
            ROOM 102
          </text>
          <text x="740" y="145" fill="#38bdf8" fontSize="13" fontWeight="700">
            Mary Johnson
          </text>
          <rect x="830" y="145" width="80" height="50" rx="6" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255, 255, 255, 0.1)" />
          <text x="870" y="175" textAnchor="middle" fill="rgba(255, 255, 255, 0.4)" fontSize="10">🛏️ BED</text>
          <circle cx="720" cy="150" r="7" fill={isArrived ? '#10b981' : '#38bdf8'} />
          <text x="735" y="135" fill="#38bdf8" fontSize="9">WAYPOINT</text>
        </g>

        {/* 3. ROOM 103 (Eleanor Vance) */}
        <g>
          <rect
            x="60"
            y="330"
            width="220"
            height="150"
            rx="12"
            fill="rgba(15, 23, 42, 0.7)"
            stroke="rgba(56, 189, 248, 0.25)"
            strokeWidth="2"
          />
          <text x="80" y="365" fill="#f8fafc" fontSize="16" fontWeight="800">
            ROOM 103
          </text>
          <text x="80" y="385" fill="#94a3b8" fontSize="12" fontWeight="500">
            Eleanor Vance
          </text>
          <rect x="80" y="405" width="80" height="50" rx="6" fill="rgba(255, 255, 255, 0.05)" stroke="rgba(255, 255, 255, 0.1)" />
          <text x="120" y="435" textAnchor="middle" fill="rgba(255, 255, 255, 0.4)" fontSize="10">🛏️ BED</text>
          <circle cx="280" cy="410" r="6" fill="#38bdf8" />
        </g>

        {/* 4. MEDICINE & PHARMACY ROOM */}
        <g>
          <rect
            x="720"
            y="260"
            width="220"
            height="110"
            rx="12"
            fill="rgba(15, 23, 42, 0.7)"
            stroke="rgba(99, 102, 241, 0.3)"
            strokeWidth="2"
          />
          <text x="740" y="295" fill="#818cf8" fontSize="14" fontWeight="800">
            💊 MEDICINE PREP
          </text>
          <text x="740" y="315" fill="#94a3b8" fontSize="11">
            Chain-of-Custody Lockers
          </text>
        </g>

        {/* 5. CAREGIVER STATION (Nurse Desk) */}
        <g>
          <rect
            x="720"
            y="400"
            width="220"
            height="120"
            rx="12"
            fill="rgba(15, 23, 42, 0.85)"
            stroke="rgba(56, 189, 248, 0.35)"
            strokeWidth="2"
          />
          <text x="740" y="435" fill="#38bdf8" fontSize="15" fontWeight="800">
            👩‍⚕️ CAREGIVER STATION
          </text>
          <text x="740" y="455" fill="#94a3b8" fontSize="11">
            Nurse Sarah Jenkins (RN-402)
          </text>
          <rect x="740" y="470" width="100" height="30" rx="6" fill="rgba(56, 189, 248, 0.1)" />
          <text x="790" y="490" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="700">TABLET HUD</text>
        </g>

        {/* 6. ROVER DOCK & CHARGING BAY */}
        <g>
          <rect
            x="400"
            y="520"
            width="200"
            height="90"
            rx="12"
            fill={rover?.status === 'IDLE' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(15, 23, 42, 0.8)'}
            stroke={rover?.status === 'IDLE' ? '#38bdf8' : 'rgba(255, 255, 255, 0.2)'}
            strokeWidth="2"
          />
          <text x="500" y="555" textAnchor="middle" fill="#38bdf8" fontSize="15" fontWeight="800">
            🔋 ROVER DOCK
          </text>
          <text x="500" y="575" textAnchor="middle" fill="#94a3b8" fontSize="11">
            Base Station & Wireless Fast Charger
          </text>
        </g>

        {/* ============================================================== */}
        {/* DYNAMIC ANIMATED ROVER MARKER */}
        {/* ============================================================== */}
        <g
          transform={`translate(${roverX}, ${roverY})`}
          style={{ transition: 'transform 0.4s ease-out' }}
        >
          {/* Outer Pulsing Radar Ring */}
          <circle
            r="26"
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
            strokeWidth="2"
            filter="url(#glow-cyan)"
          />

          {/* Robot Icon */}
          <text x="0" y="6" textAnchor="middle" fontSize="18" fill="#ffffff">
            🤖
          </text>

          {/* Floating Live Telemetry Tooltip */}
          <rect
            x="-70"
            y="-46"
            width="140"
            height="22"
            rx="6"
            fill="#0f172a"
            stroke="rgba(56, 189, 248, 0.5)"
            strokeWidth="1"
          />
          <text x="0" y="-31" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="700">
            Rover-01 • {rover?.status || 'IDLE'}
          </text>
        </g>
      </svg>
    </div>
  );
}
