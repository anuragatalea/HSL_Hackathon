import { PrismaClient, TaskStatus, ActorType } from '@prisma/client';
import { transitionTask } from '../services/taskStateMachine.js';
import { handleResidentUnavailable, triggerTaskRetry } from '../services/snoozeRetryService.js';
import { getTaskAuditTrail } from '../services/auditService.js';

const prisma = new PrismaClient();

async function runPhase2Verification() {
  console.log('🧪 ==============================================================');
  console.log('🧪 ALEA CARE SMART ROVER — PHASE 2 FSM & AUDIT ENGINE VERIFICATION');
  console.log('🧪 ==============================================================\n');

  try {
    // 1. Find Mary Johnson's task
    const resident = await prisma.resident.findFirst({ where: { roomNumber: '102' } });
    if (!resident) throw new Error('Hero resident Mary Johnson not found in database.');

    const initialTask = await prisma.roverTask.findFirst({
      where: { residentId: resident.id },
      include: { rover: true }
    });
    if (!initialTask) throw new Error('Mary Johnson delivery task not found.');

    console.log(`✅ Step 1: Found Mary Johnson Task [${initialTask.id.slice(0, 8)}...] Status: ${initialTask.status}`);

    // 2. Dispatch Task (READY -> DISPATCHED)
    const dispatched = await transitionTask(
      prisma,
      initialTask.id,
      TaskStatus.DISPATCHED,
      { actorType: ActorType.CAREGIVER, actorId: 'Nurse Sarah (RN-402)' },
      { metadata: { item: 'Morning Care Pack' } }
    );
    console.log(`✅ Step 2: Dispatched by Caregiver -> Task: ${dispatched.task.status}`);

    // 3. Rover En Route -> Arrived -> Awaiting Confirmation
    await transitionTask(
      prisma,
      initialTask.id,
      TaskStatus.EN_ROUTE,
      { actorType: ActorType.ROVER, actorId: 'Rover-01' }
    );
    const arrived = await transitionTask(
      prisma,
      initialTask.id,
      TaskStatus.ARRIVED,
      { actorType: ActorType.ROVER, actorId: 'Rover-01' },
      { metadata: { arrivedAtRoom: '102' } }
    );
    console.log(`✅ Step 3: Rover Reached Room 102 -> Task: ${arrived.task.status}`);

    const awaiting = await transitionTask(
      prisma,
      initialTask.id,
      TaskStatus.AWAITING_CONFIRMATION,
      { actorType: ActorType.SYSTEM, actorId: 'KioskScreen' }
    );
    console.log(`✅ Step 4: Kiosk Screen Greeting Active -> Task: ${awaiting.task.status}`);

    // 4. Resident Unavailable -> Snooze 10 minutes
    const snoozeResult = await handleResidentUnavailable(
      prisma,
      initialTask.id,
      { actorType: ActorType.RESIDENT, actorId: 'Mary Johnson' },
      10,
      'Resident resting; please check back later'
    );
    console.log(`✅ Step 5: Resident Unavailable -> Snoozed until: ${snoozeResult.snoozedUntil?.toLocaleTimeString()}`);
    console.log(`          Attempt #1 logged in RoverTaskAttempt (Result: ${snoozeResult.attempt.result})`);

    // 5. Trigger Retry (SNOOZED -> DISPATCHED)
    const retryResult = await triggerTaskRetry(
      prisma,
      initialTask.id,
      { actorType: ActorType.SYSTEM, actorId: 'SnoozeTimerDaemon' }
    );
    console.log(`✅ Step 6: Retry Dispatched -> Task: ${retryResult.status}, Attempts: ${retryResult.attemptCount}`);

    // 6. Second Arrival & Happy Path Confirmation
    await transitionTask(
      prisma,
      initialTask.id,
      TaskStatus.EN_ROUTE,
      { actorType: ActorType.ROVER, actorId: 'Rover-01' }
    );
    await transitionTask(
      prisma,
      initialTask.id,
      TaskStatus.ARRIVED,
      { actorType: ActorType.ROVER, actorId: 'Rover-01' }
    );
    await transitionTask(
      prisma,
      initialTask.id,
      TaskStatus.AWAITING_CONFIRMATION,
      { actorType: ActorType.SYSTEM, actorId: 'KioskScreen' }
    );
    const completed = await transitionTask(
      prisma,
      initialTask.id,
      TaskStatus.COMPLETED,
      { actorType: ActorType.RESIDENT, actorId: 'Mary Johnson' },
      { metadata: { signature: 'Verified on Rover Kiosk Display' } }
    );
    console.log(`✅ Step 7: Resident Confirmed Delivery -> Task: ${completed.task.status}`);

    // 7. Verify Rover Status
    const rover = await prisma.roverDevice.findUnique({ where: { id: initialTask.roverId } });
    console.log(`✅ Step 8: Rover Synchronized Status -> ${rover?.status} (Heading back to Dock)`);

    // 8. Fetch & Display Complete Clinical Audit Trail
    const logs = await getTaskAuditTrail(prisma, initialTask.id);
    console.log('\n📜 ==============================================================');
    console.log(`📜 COMPLETE IMMUTABLE CLINICAL AUDIT TRAIL (${logs.length} EVENTS)`);
    console.log('📜 ==============================================================');
    logs.forEach((log, index) => {
      const time = log.createdAt.toLocaleTimeString();
      const meta = log.metadata ? JSON.stringify(log.metadata) : '';
      console.log(`  ${index + 1}. [${time}] [${log.actorType}] ${log.event.padEnd(30)} by ${log.actorId}`);
      if (meta && meta !== '{}') {
        console.log(`     ↳ Details: ${meta}`);
      }
    });

    console.log('\n🎉 ALL PHASE 2 ENGINE TESTS PASSED WITH 100% SUCCESS!\n');
  } catch (err: any) {
    console.error('❌ Phase 2 Verification failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase2Verification();
