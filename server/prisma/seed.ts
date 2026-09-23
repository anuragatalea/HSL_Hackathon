import { PrismaClient, TaskStatus, RoverStatus, ActorType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting HSL Care Smart Rover database seeding...');

  // 1. Clean existing records in reverse dependency order
  await prisma.roverAuditLog.deleteMany();
  await prisma.roverTaskAttempt.deleteMany();
  await prisma.residentAssistance.deleteMany();
  await prisma.roverTask.deleteMany();
  await prisma.roverSchedule.deleteMany();
  await prisma.roverDevice.deleteMany();
  await prisma.resident.deleteMany();
  await prisma.room.deleteMany();

  console.log('🧹 Cleaned existing tables.');

  // 2. Seed Rooms (mapped to the 13 ft × 20 ft facility layout)
  const roomDock = await prisma.room.create({
    data: {
      number: 'DOCK',
      name: 'Rover Charging Dock 🔋',
      waypointX: 10.0,
      waypointY: 2.0,
      zone: 'CHARGING_BAY'
    }
  });

  const caregiverStation = await prisma.room.create({
    data: {
      number: 'STATION',
      name: 'Caregiver Station 👩‍⚕️',
      waypointX: 16.0,
      waypointY: 3.5,
      zone: 'STAFF_DESK'
    }
  });

  const medicineRoom = await prisma.room.create({
    data: {
      number: 'MED_ROOM',
      name: 'Medicine & Pharmacy Room 💊',
      waypointX: 16.0,
      waypointY: 6.5,
      zone: 'PHARMACY'
    }
  });

  const room101 = await prisma.room.create({
    data: {
      number: '101',
      name: 'Room 101 - Robert Davis',
      waypointX: 4.0,
      waypointY: 10.0,
      zone: 'RESIDENT_WING'
    }
  });

  const room102 = await prisma.room.create({
    data: {
      number: '102',
      name: 'Room 102 - Mary Johnson (Hero Room)',
      waypointX: 16.0,
      waypointY: 10.0,
      zone: 'RESIDENT_WING'
    }
  });

  const room103 = await prisma.room.create({
    data: {
      number: '103',
      name: 'Room 103 - Eleanor Vance',
      waypointX: 4.0,
      waypointY: 4.0,
      zone: 'RESIDENT_WING'
    }
  });

  console.log('📍 Seeded 6 facility locations and waypoints.');

  // 3. Seed Residents
  const mary = await prisma.resident.create({
    data: {
      name: 'Mary Johnson',
      roomNumber: '102',
      notes: 'Hero Resident. Enjoys morning comfort items. Prefers calm voice greeting.'
    }
  });

  const robert = await prisma.resident.create({
    data: {
      name: 'Robert Davis',
      roomNumber: '101',
      notes: 'Afternoon hydration and reading materials.'
    }
  });

  const eleanor = await prisma.resident.create({
    data: {
      name: 'Eleanor Vance',
      roomNumber: '103',
      notes: 'Daily routine linen and package delivery.'
    }
  });

  console.log('👥 Seeded 3 residents (Mary Johnson in Room 102).');

  // 4. Seed Rover-01 (Waveshare UGV-Beast / Virtual Rover)
  const rover = await prisma.roverDevice.create({
    data: {
      name: 'Rover-01',
      status: RoverStatus.IDLE,
      batteryLevel: 100,
      currentRoom: 'DOCK',
      currentX: 10.0,
      currentY: 2.0,
      isActive: true
    }
  });

  console.log('🤖 Seeded Rover-01 at Dock with 100% battery.');

  // 5. Seed Delivery Schedule for Hero Demo (Mary Johnson @ 10:00 AM)
  const marySchedule = await prisma.roverSchedule.create({
    data: {
      residentId: mary.id,
      roomId: room102.id,
      itemName: 'Morning Care Pack & Comfort Blankets',
      scheduledTime: '10:00',
      frequency: 'DAILY',
      assignedStaffId: 'Nurse Sarah Jenkins (RN-402)',
      roverId: rover.id,
      maxAttempts: 3,
      snoozeDurationMin: 10,
      isActive: true
    }
  });

  const robertSchedule = await prisma.roverSchedule.create({
    data: {
      residentId: robert.id,
      roomId: room101.id,
      itemName: 'Hydration & Daily Newspaper',
      scheduledTime: '14:30',
      frequency: 'DAILY',
      assignedStaffId: 'Nurse Marcus Vance (LPN-115)',
      roverId: rover.id,
      maxAttempts: 3,
      snoozeDurationMin: 10,
      isActive: true
    }
  });

  // 6. Seed Initial Task for Mary Johnson (Ready for Immediate Demo Dispatch)
  const initialTask = await prisma.roverTask.create({
    data: {
      scheduleId: marySchedule.id,
      residentId: mary.id,
      roomId: room102.id,
      roverId: rover.id,
      status: TaskStatus.READY,
      scheduledAt: new Date(),
      attemptCount: 0
    }
  });

  // 7. Seed Initial Audit Log Record
  await prisma.roverAuditLog.create({
    data: {
      taskId: initialTask.id,
      actorType: ActorType.CAREGIVER,
      actorId: 'Nurse Sarah Jenkins (RN-402)',
      event: 'SCHEDULE_CREATED',
      metadata: {
        itemName: 'Morning Care Pack & Comfort Blankets',
        resident: 'Mary Johnson',
        room: '102',
        scheduledTime: '10:00',
        maxAttempts: 3
      }
    }
  });

  await prisma.roverAuditLog.create({
    data: {
      taskId: initialTask.id,
      actorType: ActorType.SYSTEM,
      actorId: 'ScheduleDaemon',
      event: 'TASK_MARKED_READY',
      metadata: {
        taskId: initialTask.id,
        status: 'READY',
        message: 'Delivery task activated and queued for Rover-01 dispatch'
      }
    }
  });

  console.log('📋 Seeded Hero Delivery Schedule, Ready Task, and Audit History.');
  console.log('✨ Database seeding complete successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
