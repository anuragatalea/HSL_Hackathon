import { PrismaClient, TaskStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Creating comprehensive care delivery schedules and tasks for today (2026-09-26)...');

  // 1. Fetch existing residents, rooms, rovers, and medications
  const mary = await prisma.resident.findFirst({ where: { roomNumber: '102' } });
  const robert = await prisma.resident.findFirst({ where: { roomNumber: '101' } });
  const eleanor = await prisma.resident.findFirst({ where: { roomNumber: '103' } });

  const room101 = await prisma.room.findFirst({ where: { number: '101' } });
  const room102 = await prisma.room.findFirst({ where: { number: '102' } });
  const room103 = await prisma.room.findFirst({ where: { number: '103' } });

  const rover = await prisma.roverDevice.findFirst({ where: { name: 'Rover-01' } });

  if (!mary || !robert || !eleanor || !room101 || !room102 || !room103 || !rover) {
    throw new Error('Missing base facility residents, rooms, or rovers in database.');
  }

  const metformin = await prisma.medication.findFirst({ where: { name: 'Metformin Hydrochloride' } });
  const lisinopril = await prisma.medication.findFirst({ where: { name: 'Lisinopril' } });
  const aspirin = await prisma.medication.findFirst({ where: { name: 'Aspirin Low-Dose' } });
  const atorvastatin = await prisma.medication.findFirst({ where: { name: 'Atorvastatin Calcium' } });
  const donepezil = await prisma.medication.findFirst({ where: { name: 'Donepezil Hydrochloride' } });
  const diphenhydramine = await prisma.medication.findFirst({ where: { name: 'Diphenhydramine Hydrochloride' } });

  const today = new Date('2026-09-26T00:00:00.000Z');

  // Helper to construct today's Date at specific HH:mm
  function getTodayAt(hours: number, minutes: number): Date {
    const d = new Date('2026-09-26T00:00:00.000Z');
    // Adjust to local +05:30 offset
    d.setUTCHours(hours - 5, minutes - 30, 0, 0);
    return d;
  }

  // Define today's schedule items
  const scheduleData = [
    // 1. Mary Johnson (Room 102) - 13:00 Afternoon Glucose & Hydration Care
    {
      residentId: mary.id,
      roomId: room102.id,
      roomNumber: '102',
      itemName: 'Afternoon Diabetic Management & Hydration Pack',
      medicationId: metformin?.id,
      medications: [
        { name: 'Metformin Hydrochloride', dose: '500 mg', instructions: 'Take with post-lunch hydration', compartment: 1 },
        { name: 'Electrolyte Mineral Hydration', dose: '1 packet', instructions: 'Dissolve in 250ml water', compartment: 2 }
      ],
      scheduledTime: '13:00',
      frequency: 'DAILY',
      assignedStaffId: 'Nurse Sarah Jenkins (RN-042)',
      scheduledAt: getTodayAt(13, 0),
      status: TaskStatus.READY
    },

    // 2. Robert Davis (Room 101) - 13:30 Post-Lunch Cardioprotective Care
    {
      residentId: robert.id,
      roomId: room101.id,
      roomNumber: '101',
      itemName: 'Cardioprotective Lisinopril & Low-Dose Aspirin Regimen',
      medicationId: lisinopril?.id,
      medications: [
        { name: 'Lisinopril', dose: '10 mg', instructions: 'Blood pressure maintenance', compartment: 1 },
        { name: 'Aspirin Low-Dose', dose: '81 mg', instructions: 'Cardiovascular maintenance', compartment: 2 }
      ],
      scheduledTime: '13:30',
      frequency: 'DAILY',
      assignedStaffId: 'Nurse Marcus Vance (LPN-115)',
      scheduledAt: getTodayAt(13, 30),
      status: TaskStatus.READY
    },

    // 3. Eleanor Vance (Room 103) - 14:00 Joint Mobility & Pain Relief
    {
      residentId: eleanor.id,
      roomId: room103.id,
      roomNumber: '103',
      itemName: 'Daily Joint Mobility & Pain Relief Routine',
      medicationId: null,
      medications: [
        { name: 'Glucosamine & Chondroitin Complex', dose: '1500 mg', instructions: 'Joint mobility support', compartment: 1 },
        { name: 'Acetaminophen ER Arthritis', dose: '650 mg', instructions: 'Extended relief for joint stiffness', compartment: 2 }
      ],
      scheduledTime: '14:00',
      frequency: 'DAILY',
      assignedStaffId: 'Caregiver Elena Rostova (CNA-204)',
      scheduledAt: getTodayAt(14, 0),
      status: TaskStatus.READY
    },

    // 4. Mary Johnson (Room 102) - 17:30 Evening Cardiovascular & Cognitive Regimen
    {
      residentId: mary.id,
      roomId: room102.id,
      roomNumber: '102',
      itemName: 'Evening Atorvastatin & Memory Support Regimen',
      medicationId: atorvastatin?.id,
      medications: [
        { name: 'Atorvastatin Calcium', dose: '20 mg', instructions: 'Cholesterol & lipid regulation', compartment: 1 },
        { name: 'Donepezil Hydrochloride', dose: '5 mg', instructions: 'Cognitive & memory maintenance', compartment: 2 }
      ],
      scheduledTime: '17:30',
      frequency: 'DAILY',
      assignedStaffId: 'Nurse Sarah Jenkins (RN-042)',
      scheduledAt: getTodayAt(17, 30),
      status: TaskStatus.SCHEDULED
    },

    // 5. Robert Davis (Room 101) - 18:45 Evening Mineral & Vitality Pack
    {
      residentId: robert.id,
      roomId: room101.id,
      roomNumber: '101',
      itemName: 'Evening Mineral & Circulation Vitality Pack',
      medicationId: null,
      medications: [
        { name: 'Magnesium Glycinate', dose: '200 mg', instructions: 'Muscle relaxation and vascular tone', compartment: 1 },
        { name: 'Multivitamin Silver 65+', dose: '1 tablet', instructions: 'Antioxidant & metabolic balance', compartment: 2 }
      ],
      scheduledTime: '18:45',
      frequency: 'DAILY',
      assignedStaffId: 'Caregiver James Wilson (CNA-088)',
      scheduledAt: getTodayAt(18, 45),
      status: TaskStatus.SCHEDULED
    },

    // 6. Eleanor Vance (Room 103) - 19:30 Bone Health & Calcium Maintenance
    {
      residentId: eleanor.id,
      roomId: room103.id,
      roomNumber: '103',
      itemName: 'Evening Calcium Citrate & Vitamin D3 Maintenance',
      medicationId: null,
      medications: [
        { name: 'Calcium Citrate + Vitamin D3', dose: '500 mg', instructions: 'Bone density support with dinner', compartment: 1 },
        { name: 'Melatonin Gentle Sleep', dose: '3 mg', instructions: 'Circadian rhythm support', compartment: 2 }
      ],
      scheduledTime: '19:30',
      frequency: 'DAILY',
      assignedStaffId: 'Caregiver Elena Rostova (CNA-204)',
      scheduledAt: getTodayAt(19, 30),
      status: TaskStatus.SCHEDULED
    },

    // 7. Mary Johnson (Room 102) - 21:00 Nighttime Sleep & Bedside Comfort Pack
    {
      residentId: mary.id,
      roomId: room102.id,
      roomNumber: '102',
      itemName: 'Nighttime Sleep Comfort & Calming Herbal Pack',
      medicationId: diphenhydramine?.id,
      medications: [
        { name: 'Diphenhydramine Hydrochloride', dose: '25 mg', instructions: 'Bedtime relaxation and mild allergy relief', compartment: 1 },
        { name: 'Chamomile Sleep Infusion Packet', dose: '1 unit', instructions: 'Warm bedside herbal beverage', compartment: 3 }
      ],
      scheduledTime: '21:00',
      frequency: 'DAILY',
      assignedStaffId: 'Nurse Marcus Vance (LPN-115)',
      scheduledAt: getTodayAt(21, 0),
      status: TaskStatus.SCHEDULED
    }
  ];

  console.log(`Creating ${scheduleData.length} schedules and associated delivery tasks for today...`);

  for (const item of scheduleData) {
    const schedule = await prisma.roverSchedule.create({
      data: {
        residentId: item.residentId,
        roomId: item.roomId,
        itemName: item.itemName,
        medicationId: item.medicationId,
        medications: item.medications,
        scheduledTime: item.scheduledTime,
        frequency: item.frequency,
        assignedStaffId: item.assignedStaffId,
        roverId: rover.id,
        maxAttempts: 3,
        snoozeDurationMin: 10,
        isActive: true
      }
    });

    const task = await prisma.roverTask.create({
      data: {
        scheduleId: schedule.id,
        residentId: item.residentId,
        roomId: item.roomNumber,
        roverId: rover.id,
        medicationId: item.medicationId,
        medications: item.medications,
        status: item.status,
        scheduledAt: item.scheduledAt,
        attemptCount: 0
      }
    });

    console.log(`✅ [${item.scheduledTime}] ${item.itemName} (${item.status}) -> Room ${item.roomNumber}`);
  }

  console.log('🎉 Successfully created all schedules and tasks for today!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
