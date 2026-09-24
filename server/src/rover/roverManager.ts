import { IRoverAdapter } from './roverAdapter.js';
import { VirtualRoverAdapter } from './virtualRover.js';
import { HardwareRoverAdapter } from './hardwareRover.js';

let adapterInstance: IRoverAdapter | null = null;

export function getRoverAdapter(): IRoverAdapter {
  if (!adapterInstance) {
    const mode = (process.env.ROVER_MODE || 'SIMULATION').toUpperCase();
    if (mode === 'HARDWARE') {
      console.log('🔌 Initializing Rover Adapter in [HARDWARE] Mode (Waveshare UGV-Beast).');
      adapterInstance = new HardwareRoverAdapter();
    } else {
      console.log('🎮 Initializing Rover Adapter in [SIMULATION] Mode (Virtual Physics).');
      adapterInstance = new VirtualRoverAdapter();
    }
  }
  return adapterInstance;
}

export function getRoverConnectionInfo() {
  const adapter = getRoverAdapter();
  if (adapter.mode === 'HARDWARE') {
    return (adapter as HardwareRoverAdapter).getConnectionStatus();
  } else {
    return {
      mode: 'SIMULATION' as const,
      isHardwareConnected: false,
      hardwareIp: null,
      lastHeartbeat: new Date().toISOString(),
      roverName: 'Rover-01 (Virtual Simulator)',
      details: 'Simulation Mode: Virtual Kinematic Engine Active'
    };
  }
}

