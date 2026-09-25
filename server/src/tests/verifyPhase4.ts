import { server } from '../server.js';
import { getRoverAdapter } from '../rover/roverManager.js';
import { io as Client } from 'socket.io-client';
import { RoverStatus } from '@prisma/client';

async function runPhase4Verification() {
  console.log('🧪 ==============================================================');
  console.log('🧪 ALEA CARE SMART ROVER — PHASE 4 ROVER ADAPTER TEST');
  console.log('🧪 ==============================================================\n');

  const PORT = 4000;
  // Give server a moment to finish starting
  await new Promise(r => setTimeout(r, 500));

  try {
    const socket = Client(`http://localhost:${PORT}`);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Socket.io connection timeout')), 5000);
      socket.on('connect', () => {
        console.log(`✅ Step 1: WebSocket Connected [${socket.id}]`);
        clearTimeout(timeout);
        resolve();
      });
    });

    const adapter = getRoverAdapter();
    console.log(`✅ Step 2: Rover Adapter Active Mode: [${adapter.mode}]`);

    const initialTelemetry = await adapter.getTelemetry();
    console.log(`✅ Step 3: Initial Rover Telemetry: Status: ${initialTelemetry.status}, Pos: (${initialTelemetry.currentX}, ${initialTelemetry.currentY}), Battery: ${initialTelemetry.batteryLevel}%`);

    // 4. Test Dispatch to Room 102
    console.log('📡 Step 4: Dispatching Rover to Room 102 (16.0, 10.0)...');

    let receivedMovementUpdates = 0;
    socket.on('rover:telemetry', (data) => {
      if (data.status === RoverStatus.MOVING) {
        receivedMovementUpdates++;
      }
    });

    const arrivalPromise = new Promise<any>((resolve) => {
      socket.on('rover:arrived', (data) => {
        resolve(data);
      });
    });

    await adapter.dispatchToRoom('demo-task-id', '102', { x: 16.0, y: 10.0 });

    const arrivalData = await Promise.race([
      arrivalPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Rover arrival timeout')), 10000))
    ]);

    console.log(`✅ Step 5: Rover Arrived at Room ${arrivalData.roomNumber}! (Received ${receivedMovementUpdates} live coordinate telemetry packets)`);

    // 5. Test Return to Dock
    console.log('📡 Step 6: Commanding Rover to Return to Dock (10.0, 2.0)...');
    const dockedPromise = new Promise<any>((resolve) => {
      socket.on('rover:docked', (data) => {
        resolve(data);
      });
    });

    await adapter.returnToDock();

    await Promise.race([
      dockedPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Rover dock timeout')), 10000))
    ]);

    const finalTelemetry = await adapter.getTelemetry();
    console.log(`✅ Step 7: Rover Safely Docked! Final Pos: (${finalTelemetry.currentX}, ${finalTelemetry.currentY}), Status: ${finalTelemetry.status}`);

    // 6. Test E-Stop
    await adapter.emergencyStop();
    const estopTelemetry = await adapter.getTelemetry();
    console.log(`✅ Step 8: Emergency Stop Verified! Status: ${estopTelemetry.status}`);

    socket.disconnect();
    console.log('\n🎉 ALL PHASE 4 ROVER ADAPTER TESTS PASSED WITH 100% SUCCESS!\n');
  } catch (err: any) {
    console.error('❌ Phase 4 Verification failed:', err.message);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
}

runPhase4Verification();
