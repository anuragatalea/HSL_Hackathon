import { PrismaClient, TaskStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Adding comprehensive Scheduled Care Deliveries...');

  // 1. Fetch existing residents, rooms, rovers
  const mary = await prisma.resident.findFirst({ where: { roomNumber: '102' } });
  const robert = await prisma.resident.findFirst({ where: { roomNumber: '101' } });
  const eleanor = await prisma.resident.findFirst({ where: { roomNumber: '103' } });

  const room101 = await prisma.room.findFirst({ where: { number: '101' } });
  const room102 = await prisma.room.findFirst({ where: { number: '102' } });
  const room103 = await prisma.room.findFirst({ where: { number: '103' } });

  const rover = await prisma.roverDevice.findFirst({ where: { name: 'Rover-01' } });

  if (!mary || !robert || !eleanor || !room101 || !room102 || !room103 || !rover) {
    throw new Error('Missing base facility residents or rooms. Run seed first.');
  }

  // 2. Robert Davis - Morning Hypertension & Cardiac Protection Routine
  const robertMorningMeds = [
    { name: 'Amlodipine Besylate', dose: '5 mg', instructions: 'Blood pressure control with morning breakfast', compartment: 1 },
    { name: 'CoQ10 Heart Health', dose: '100 mg', instructions: 'Cellular energy and antioxidant support', compartment: 1 },
    { name: 'Chewable Baby Aspirin', dose: '81 mg', instructions: 'Cardiovascular maintenance', compartment: 2 }
  ];

  const robertMorningSched = await prisma.roverSchedule.create({
    data: {
      residentId: robert.id,
      roomId: room101.id,
      itemName: 'Morning Hypertension & Cardiac Protection Routine',
      medications: robertMorningMeds,
      scheduledTime: '08:30',
      frequency: 'DAILY',
      assignedStaffId: 'Nurse Marcus Vance (LPN-115)',
      roverId: rover.id,
      maxAttempts: 3,
      snoozeDurationMin: 10,
      isActive: true
    }
  });

  // Create an active READY task for Robert Davis (Room 101)
  await prisma.roverTask.create({
    data: {
      residentId: robert.id,
      roomId: room101.id,
      roverId: rover.id,
      scheduleId: robertMorningSched.id,
      medications: robertMorningMeds,
      status: TaskStatus.READY,
      scheduledAt: new Date(),
      attemptCount: 0
    }
  });
  console.log('✅ Added Robert Davis (Room 101) Morning Schedule & READY Task.');

  // 3. Eleanor Vance - Daily Joint Mobility & Pain Relief Regimen
  const eleanorJointMeds = [
    { name: 'Glucosamine & Chondroitin', dose: '1500 mg', instructions: 'Cartilage and joint mobility maintenance', compartment: 1 },
    { name: 'Acetaminophen ER', dose: '650 mg', instructions: 'Extended-release arthritis pain relief', compartment: 2 },
    { name: 'Vitamin D3 & K2 Drops', dose: '2000 IU', instructions: 'Bone density and calcium absorption', compartment: 1 }
  ];

  const eleanorJointSched = await prisma.roverSchedule.create({
    data: {
      residentId: eleanor.id,
      roomId: room103.id,
      itemName: 'Daily Joint Mobility & Pain Relief Regimen',
      medications: eleanorJointMeds,
      scheduledTime: '11:30',
      frequency: 'DAILY',
      assignedStaffId: 'Caregiver James Wilson (CNA-088)',
      roverId: rover.id,
      maxAttempts: 3,
      snoozeDurationMin: 10,
      isActive: true
    }
  });

  // Create an active READY task for Eleanor Vance (Room 103)
  await prisma.roverTask.create({
    data: {
      residentId: eleanor.id,
      roomId: room103.id,
      roverId: rover.id,
      scheduleId: eleanorJointSched.id,
      medications: eleanorJointMeds,
      status: TaskStatus.READY,
      scheduledAt: new Date(),
      attemptCount: 0
    }
  });
  console.log('✅ Added Eleanor Vance (Room 103) Joint Care Schedule & READY Task.');

  // 4. Mary Johnson - Evening Sedative & Sleep Wellness Care Pack
  const maryEveningMeds = [
    { name: 'Melatonin Pure Rest', dose: '5 mg', instructions: 'Take 30 minutes before lights out', compartment: 2 },
    { name: 'Magnesium Glycinate', dose: '200 mg', instructions: 'Muscle relaxation and deep sleep aid', compartment: 1 },
    { name: 'Chamomile Infusion Sachet', dose: '1 pack', instructions: 'Steep in warm water for evening comfort', compartment: 3 }
  ];

  await prisma.roverSchedule.create({
    data: {
      residentId: mary.id,
      roomId: room102.id,
      itemName: 'Evening Sedative & Sleep Wellness Care Pack',
      medications: maryEveningMeds,
      scheduledTime: '20:00',
      frequency: 'DAILY',
      assignedStaffId: 'Nurse Sarah Jenkins (RN-402)',
      roverId: rover.id,
      maxAttempts: 3,
      snoozeDurationMin: 10,
      isActive: true
    }
  });
  console.log('✅ Added Mary Johnson (Room 102) Evening Sleep Schedule.');

  // 5. Eleanor Vance - Afternoon Cognitive Stimulation & Fresh Linens
  const eleanorCognitiveMeds = [
    { name: 'Ginkgo Biloba Extract', dose: '120 mg', instructions: 'Cognitive acuity and microcirculation', compartment: 1 },
    { name: 'Memory Word Puzzle Booklet', dose: '1 booklet', instructions: 'Daily brain stimulation activity', compartment: 3 },
    { name: 'Hypoallergenic Fresh Blanket', dose: '1 item', instructions: 'Warm afternoon resting linen', compartment: 3 }
  ];

  await prisma.roverSchedule.create({
    data: {
      residentId: eleanor.id,
      roomId: room103.id,
      itemName: 'Afternoon Cognitive Stimulation & Fresh Linens',
      medications: eleanorCognitiveMeds,
      scheduledTime: '15:00',
      frequency: 'DAILY',
      assignedStaffId: 'Nurse Sarah Jenkins (RN-402)',
      roverId: rover.id,
      maxAttempts: 3,
      snoozeDurationMin: 10,
      isActive: true
    }
  });
  console.log('✅ Added Eleanor Vance (Room 103) Afternoon Cognitive Schedule.');

  // 6. Robert Davis - Nightly Diabetic Glucose Check & Evening Snack
  const robertNightMeds = [
    { name: 'Glipizide', dose: '5 mg', instructions: 'Blood glucose regulation with light evening snack', compartment: 1 },
    { name: 'Diabetic Protein Snack Bar', dose: '1 bar', instructions: 'Sustained nighttime glycemic balance', compartment: 2 }
  ];

  await prisma.roverSchedule.create({
    data: {
      residentId: robert.id,
      roomId: room101.id,
      itemName: 'Nightly Glycemic Control & Diabetic Evening Snack',
      medications: robertNightMeds,
      scheduledTime: '21:00',
      frequency: 'DAILY',
      assignedStaffId: 'Nurse Marcus Vance (LPN-115)',
      roverId: rover.id,
      maxAttempts: 3,
      snoozeDurationMin: 10,
      isActive: true
    }
  });
  console.log('✅ Added Robert Davis (Room 101) Nightly Glycemic Schedule.');

  console.log('✨ All new Scheduled Care Deliveries seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
