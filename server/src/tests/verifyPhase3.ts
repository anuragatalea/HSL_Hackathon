import { server } from '../server.js';
import { io as Client } from 'socket.io-client';

async function runPhase3Verification() {
  console.log('🧪 ==============================================================');
  console.log('🧪 HSL CARE SMART ROVER — PHASE 3 REST & SOCKET.IO API TEST');
  console.log('🧪 ==============================================================\n');

  const PORT = 4000;
  // Give server a moment to finish starting
  await new Promise(r => setTimeout(r, 500));

  try {
    // 1. Verify Socket.io client connection
    const socket = Client(`http://localhost:${PORT}`);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Socket.io connection timeout')), 5000);
      socket.on('connect', () => {
        console.log(`✅ Step 1: Socket.io Client connected successfully [${socket.id}]`);
        clearTimeout(timeout);
        resolve();
      });
    });

    // 2. Health check
    const healthRes = await fetch(`http://localhost:${PORT}/api/health`);
    const healthJson = (await healthRes.json()) as any;
    console.log(`✅ Step 2: GET /api/health -> Status: ${healthJson.status}, Mode: ${healthJson.roverMode}`);

    // 3. GET Schedules
    const schedulesRes = await fetch(`http://localhost:${PORT}/api/rover/schedules`);
    const schedulesJson = (await schedulesRes.json()) as any;
    console.log(`✅ Step 3: GET /api/rover/schedules -> Found ${schedulesJson.data.length} delivery schedules.`);

    // 4. GET Devices
    const devicesRes = await fetch(`http://localhost:${PORT}/api/rover/devices`);
    const devicesJson = (await devicesRes.json()) as any;
    console.log(`✅ Step 4: GET /api/rover/devices -> Found Rover: ${devicesJson.data[0]?.name} (Battery: ${devicesJson.data[0]?.batteryLevel}%)`);

    // 5. GET Tasks
    const tasksRes = await fetch(`http://localhost:${PORT}/api/rover/tasks`);
    const tasksJson = (await tasksRes.json()) as any;
    const readyTask = tasksJson.data[0];
    console.log(`✅ Step 5: GET /api/rover/tasks -> Task ID [${readyTask?.id.slice(0, 8)}...] Status: ${readyTask?.status}`);

    // 6. Test Socket.io real-time alert with Resident Assistance POST
    const socketEventPromise = new Promise<any>((resolve) => {
      socket.on('assistance:alert', (data) => {
        resolve(data);
      });
    });

    const assistRes = await fetch(`http://localhost:${PORT}/api/rover/assistance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        residentId: readyTask.residentId,
        roomId: readyTask.roomId,
        requestType: 'WATER_AND_COMFORT',
        notes: 'Resident requested fresh water via Rover touch screen'
      })
    });
    const assistJson = (await assistRes.json()) as any;
    console.log(`✅ Step 6: POST /api/rover/assistance -> Created request [${assistJson.data.id.slice(0, 8)}...]`);

    const receivedAlert = await Promise.race([
      socketEventPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Socket.io event not received')), 5000))
    ]);

    console.log(`✅ Step 7: Received real-time 'assistance:alert' via WebSocket! Type: ${receivedAlert.requestType}`);

    socket.disconnect();

    console.log('\n🎉 ALL PHASE 3 REST & SOCKET.IO API TESTS PASSED WITH 100% SUCCESS!\n');
  } catch (err: any) {
    console.error('❌ Phase 3 Verification failed:', err.message);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
}

runPhase3Verification();
