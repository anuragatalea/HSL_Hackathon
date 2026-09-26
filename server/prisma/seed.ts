import { 
  PrismaClient, 
  TaskStatus, 
  RoverStatus, 
  ActorType, 
  UserRole,
  MedicationCategory,
  DosageForm,
  AgeGroup,
  FrequencyCode,
  StorageRequirement 
} from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('🌱 Checking ALEA Care Smart Rover database state...');

  const isForce = process.argv.includes('--force');

  // Check if database has already been initialized with existing records
  const residentCount = await prisma.resident.count();
  const userCount = await prisma.user.count();

  if (!isForce && (residentCount > 0 || userCount > 0)) {
    console.log(`🛡️ Database already initialized (${residentCount} residents, ${userCount} users found).`);
    console.log('🔒 Skipping destructive table wipe to preserve enrolled biometric face embeddings & patient data.');
    console.log('💡 Tip: To force a complete reset to factory seed defaults, run: npm run db:seed:force');
    return;
  }

  if (isForce) {
    console.log('⚠️ --force flag detected: proceeding with complete database reset...');
  } else {
    console.log('🚀 First-time database setup detected. Seeding initial facility data...');
  }

  // 1. Clean existing records in reverse dependency order
  await prisma.roverAuditLog.deleteMany();
  await prisma.roverTaskAttempt.deleteMany();
  await prisma.residentAssistance.deleteMany();
  await prisma.roverTask.deleteMany();
  await prisma.roverSchedule.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.roverDevice.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.healthLog.deleteMany();
  await prisma.resident.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing tables.');

  // 2. Seed Facility Staff & Multi-role Users
  const defaultPasswordHash = hashPassword('hsl2026!');

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@hsl.care',
      name: 'Dr. Robert Martinez',
      passwordHash: defaultPasswordHash,
      role: UserRole.ADMIN,
      badgeId: 'ADM-001',
      avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'
    }
  });

  const nurseUser = await prisma.user.create({
    data: {
      email: 'nurse@hsl.care',
      name: 'Nurse Sarah Jenkins',
      passwordHash: defaultPasswordHash,
      role: UserRole.NURSE,
      badgeId: 'RN-402',
      avatarUrl: 'https://images.unsplash.com/photo-1594824813633-4f056b46487e?w=150&auto=format&fit=crop&q=80'
    }
  });

  const caregiverUser = await prisma.user.create({
    data: {
      email: 'caregiver@hsl.care',
      name: 'Alex Rivera',
      passwordHash: defaultPasswordHash,
      role: UserRole.CAREGIVER,
      badgeId: 'CG-108',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    }
  });

  console.log('👤 Seeded 3 Staff Users (Admin, Nurse, Caregiver).');

  // 3. Seed Rooms (mapped to the 13 ft × 20 ft facility layout)
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

  // 128D biometric vector template for Mary Johnson
  const maryEmbeddings = Array.from({ length: 128 }, (_, i) => {
    const val = Math.sin(i * 0.45 + 102) * 0.6 + Math.cos(i * 0.2 + 102) * 0.4;
    return Number(val.toFixed(4));
  });
  const mNorm = Math.sqrt(maryEmbeddings.reduce((s, v) => s + v * v, 0)) || 1.0;
  const maryNormalized = maryEmbeddings.map(v => Number((v / mNorm).toFixed(5)));

  // 4. Seed Residents
  const mary = await prisma.resident.create({
    data: {
      name: 'Mary Johnson',
      roomNumber: '102',
      notes: 'Hero Resident. Enjoys morning comfort items. Prefers calm voice greeting.',
      photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
      faceEmbeddings: maryNormalized,
      isEnrolled: true,
      enrolledAt: new Date(Date.now() - 86400000 * 2) // Enrolled 2 days ago
    }
  });

  const robert = await prisma.resident.create({
    data: {
      name: 'Robert Davis',
      roomNumber: '101',
      notes: 'Afternoon hydration and reading materials. Mild hypertension.',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      isEnrolled: false
    }
  });

  const eleanor = await prisma.resident.create({
    data: {
      name: 'Eleanor Vance',
      roomNumber: '103',
      notes: 'Daily routine linen and package delivery.',
      isEnrolled: false
    }
  });

  console.log('👥 Seeded 3 residents (Mary Johnson in Room 102).');

  // 5. Seed Activities
  const now = new Date();
  await prisma.activity.createMany({
    data: [
      {
        residentId: mary.id,
        type: 'MEAL',
        title: 'Nutritious Breakfast Finished',
        notes: 'Ate 100% of morning oats and fresh fruits with warm tea.',
        loggedBy: nurseUser.name,
        timestamp: new Date(now.getTime() - 1000 * 60 * 120) // 2 hrs ago
      },
      {
        residentId: mary.id,
        type: 'CHECK_IN',
        title: 'Morning Wellness & Mood Check',
        notes: 'Resident in cheerful mood, reported good sleep quality.',
        loggedBy: caregiverUser.name,
        timestamp: new Date(now.getTime() - 1000 * 60 * 90) // 1.5 hrs ago
      },
      {
        residentId: mary.id,
        type: 'EXERCISE',
        title: 'Assisted Hallway Walk',
        notes: 'Completed 15 minutes of light physical mobility exercise with walker.',
        loggedBy: caregiverUser.name,
        timestamp: new Date(now.getTime() - 1000 * 60 * 45) // 45 mins ago
      },
      {
        residentId: robert.id,
        type: 'MEAL',
        title: 'Hydration & Herbal Tea',
        notes: 'Finished 300ml chamomile tea with honey.',
        loggedBy: caregiverUser.name,
        timestamp: new Date(now.getTime() - 1000 * 60 * 150) // 2.5 hrs ago
      }
    ]
  });

  console.log('📋 Seeded sample Resident Activities.');

  // 6. Seed Health Logs / Vitals
  await prisma.healthLog.createMany({
    data: [
      {
        residentId: mary.id,
        systolic: 122,
        diastolic: 78,
        heartRate: 72,
        bloodSugar: 104,
        temperature: 98.4,
        oxygenLevel: 98,
        notes: 'Vitals stable post-breakfast. Normal sinus rhythm.',
        loggedBy: nurseUser.name,
        timestamp: new Date(now.getTime() - 1000 * 60 * 110)
      },
      {
        residentId: mary.id,
        systolic: 126,
        diastolic: 80,
        heartRate: 75,
        bloodSugar: 112,
        temperature: 98.6,
        oxygenLevel: 97,
        notes: 'Pre-breakfast baseline vitals assessment.',
        loggedBy: nurseUser.name,
        timestamp: new Date(now.getTime() - 1000 * 60 * 240)
      },
      {
        residentId: robert.id,
        systolic: 132,
        diastolic: 84,
        heartRate: 68,
        bloodSugar: 118,
        temperature: 98.2,
        oxygenLevel: 96,
        notes: 'Mildly elevated BP; encouraged hydration.',
        loggedBy: nurseUser.name,
        timestamp: new Date(now.getTime() - 1000 * 60 * 180)
      }
    ]
  });

  console.log('🩺 Seeded Resident Vitals & Health Logs.');

  // 7. Seed Media Assets
  await prisma.mediaAsset.createMany({
    data: [
      {
        residentId: mary.id,
        url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80',
        type: 'PHOTO',
        caption: 'Enrolled Biometric Profile — Mary Johnson',
        source: 'KIOSK'
      },
      {
        residentId: robert.id,
        url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
        type: 'PHOTO',
        caption: 'Resident Admission Photo — Robert Davis',
        source: 'UPLOAD'
      }
    ]
  });

  console.log('📸 Seeded Resident Media Assets.');

  // 8. Seed Rover-01 (Waveshare UGV-Beast / Virtual Rover)
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

  // 9. Seed Master Medication Formulary (Clinical Catalog)
  const metformin = await prisma.medication.create({
    data: {
      name: 'Metformin Hydrochloride',
      brandName: 'Glucophage',
      ndcCode: '0087-6060-05',
      category: MedicationCategory.ANTIDIABETIC,
      form: DosageForm.TABLET,
      standardStrength: '500 mg',
      targetAgeGroup: AgeGroup.ALL_ADULTS,
      minAgeYears: 18,
      isBeersList: false,
      recommendedFrequency: FrequencyCode.TWICE_DAILY_BID,
      maxTimesPerDay: 3,
      minHoursBetweenDoses: 6,
      maxDailyDoseMg: 2550,
      instructions: 'Take with breakfast or meals and a full glass of water. Do not crush or chew.',
      requiresFood: true,
      storageTemp: StorageRequirement.ROOM_TEMP,
      isControlledSubstance: false,
      contraindications: 'Severe renal impairment (eGFR < 30 mL/min), acute metabolic acidosis.',
      sideEffects: 'Mild nausea, abdominal discomfort, diarrhea.'
    }
  });

  const lisinopril = await prisma.medication.create({
    data: {
      name: 'Lisinopril',
      brandName: 'Prinivil / Zestril',
      ndcCode: '0006-0207-58',
      category: MedicationCategory.CARDIOVASCULAR,
      form: DosageForm.TABLET,
      standardStrength: '10 mg',
      targetAgeGroup: AgeGroup.ALL_ADULTS,
      minAgeYears: 18,
      isBeersList: false,
      recommendedFrequency: FrequencyCode.ONCE_DAILY_QD,
      maxTimesPerDay: 1,
      minHoursBetweenDoses: 20,
      maxDailyDoseMg: 40,
      instructions: 'Take once daily in the morning for blood pressure management.',
      requiresFood: false,
      storageTemp: StorageRequirement.ROOM_TEMP,
      isControlledSubstance: false,
      contraindications: 'History of angioedema, pregnancy.',
      sideEffects: 'Dry persistent cough, dizziness upon standing, hyperkalemia.'
    }
  });

  const aspirin = await prisma.medication.create({
    data: {
      name: 'Aspirin Low-Dose',
      brandName: 'Bayer Cardio Chewable',
      ndcCode: '0280-2100-36',
      category: MedicationCategory.CARDIOVASCULAR,
      form: DosageForm.TABLET,
      standardStrength: '81 mg',
      targetAgeGroup: AgeGroup.GERIATRIC_65_PLUS,
      minAgeYears: 50,
      isBeersList: false,
      recommendedFrequency: FrequencyCode.ONCE_DAILY_QD,
      maxTimesPerDay: 1,
      minHoursBetweenDoses: 24,
      maxDailyDoseMg: 325,
      instructions: 'Cardioprotective antiplatelet. Chew or swallow with food to avoid gastric irritation.',
      requiresFood: true,
      storageTemp: StorageRequirement.ROOM_TEMP,
      isControlledSubstance: false,
      contraindications: 'Active bleeding ulcer, hemophilia, severe hepatic failure.',
      sideEffects: 'Mild dyspepsia, increased tendency to bruise.'
    }
  });

  await prisma.medication.create({
    data: {
      name: 'Atorvastatin Calcium',
      brandName: 'Lipitor',
      ndcCode: '0071-0155-23',
      category: MedicationCategory.CARDIOVASCULAR,
      form: DosageForm.TABLET,
      standardStrength: '20 mg',
      targetAgeGroup: AgeGroup.ALL_ADULTS,
      minAgeYears: 18,
      isBeersList: false,
      recommendedFrequency: FrequencyCode.ONCE_DAILY_QD,
      maxTimesPerDay: 1,
      minHoursBetweenDoses: 20,
      maxDailyDoseMg: 80,
      instructions: 'Cholesterol management. Best taken in the evening with water.',
      requiresFood: false,
      storageTemp: StorageRequirement.ROOM_TEMP,
      isControlledSubstance: false,
      contraindications: 'Active liver disease, unexplained persistent elevation of hepatic transaminases.',
      sideEffects: 'Myalgia (muscle aches), mild fatigue.'
    }
  });

  await prisma.medication.create({
    data: {
      name: 'Donepezil Hydrochloride',
      brandName: 'Aricept',
      ndcCode: '62856-245-30',
      category: MedicationCategory.PSYCHIATRIC_NEUROLOGIC,
      form: DosageForm.TABLET,
      standardStrength: '5 mg',
      targetAgeGroup: AgeGroup.GERIATRIC_65_PLUS,
      minAgeYears: 60,
      isBeersList: false,
      recommendedFrequency: FrequencyCode.ONCE_DAILY_QD,
      maxTimesPerDay: 1,
      minHoursBetweenDoses: 24,
      maxDailyDoseMg: 10,
      instructions: 'Cognitive & memory support. Take at bedtime with or without food.',
      requiresFood: false,
      storageTemp: StorageRequirement.ROOM_TEMP,
      isControlledSubstance: false,
      contraindications: 'Known hypersensitivity to donepezil or piperidine derivatives.',
      sideEffects: 'Vivid dreams, mild nausea, bradycardia risk.'
    }
  });

  await prisma.medication.create({
    data: {
      name: 'Insulin Glargine',
      brandName: 'Lantus SoloStar',
      ndcCode: '0088-2219-05',
      category: MedicationCategory.ANTIDIABETIC,
      form: DosageForm.INJECTION,
      standardStrength: '100 units/mL',
      targetAgeGroup: AgeGroup.ALL_ADULTS,
      minAgeYears: 18,
      isBeersList: false,
      recommendedFrequency: FrequencyCode.ONCE_DAILY_QD,
      maxTimesPerDay: 1,
      minHoursBetweenDoses: 24,
      instructions: 'Long-acting 24h basal insulin. Must be kept refrigerated (2°C to 8°C). Do not freeze.',
      requiresFood: false,
      storageTemp: StorageRequirement.REFRIGERATED_2_TO_8C,
      isControlledSubstance: false,
      contraindications: 'During acute episodes of hypoglycemia.',
      sideEffects: 'Hypoglycemia, injection site lipodystrophy.'
    }
  });

  await prisma.medication.create({
    data: {
      name: 'Diphenhydramine Hydrochloride',
      brandName: 'Benadryl',
      ndcCode: '50580-506-24',
      category: MedicationCategory.ANALGESIC_PAIN,
      form: DosageForm.CAPSULE,
      standardStrength: '25 mg',
      targetAgeGroup: AgeGroup.ADULT_18_64,
      minAgeYears: 12,
      maxAgeYears: 64,
      isBeersList: true,
      beersRiskNotes: 'Strong anticholinergic properties: Extreme fall risk, acute delirium/confusion, and urinary retention in older adults (Beers Criteria).',
      recommendedFrequency: FrequencyCode.ONCE_DAILY_QD,
      maxTimesPerDay: 2,
      minHoursBetweenDoses: 8,
      instructions: 'Nighttime allergy/pruritus. Strictly avoid or flag warning for seniors over 65.',
      requiresFood: false,
      storageTemp: StorageRequirement.ROOM_TEMP,
      isControlledSubstance: false,
      contraindications: 'Narrow-angle glaucoma, prostatic hypertrophy, acute asthma attack.',
      sideEffects: 'Severe sedation, cognitive impairment, dry mouth.'
    }
  });

  console.log('💊 Seeded Master Medication Formulary (7 Clinical Drugs with Beers List & Age Limits).');

  // 10. Seed Delivery Schedule for Hero Demo (Mary Johnson @ 10:00 AM)
  const maryMeds = [
    { name: 'Metformin', dose: '500 mg', instructions: 'Take with breakfast and full glass of water', compartment: 1 },
    { name: 'Lisinopril', dose: '10 mg', instructions: 'Blood pressure management', compartment: 1 },
    { name: 'Aspirin', dose: '81 mg', instructions: 'Low-dose cardiac protection chewable', compartment: 2 }
  ];

  const marySchedule = await prisma.roverSchedule.create({
    data: {
      residentId: mary.id,
      roomId: room102.id,
      itemName: 'Morning Cardiovascular & Metabolic Regimen',
      medicationId: metformin.id,
      medications: maryMeds,
      scheduledTime: '10:00',
      frequency: 'DAILY',
      assignedStaffId: 'Nurse Sarah Jenkins (RN-402)',
      roverId: rover.id,
      maxAttempts: 3,
      snoozeDurationMin: 10,
      isActive: true
    }
  });

  const robertMeds = [
    { name: 'Multivitamin Silver', dose: '1 tablet', instructions: 'Take with afternoon meal', compartment: 1 },
    { name: 'Electrolyte Hydration Pack', dose: '1 sachet', instructions: 'Dissolve in 400ml water', compartment: 2 }
  ];

  const robertSchedule = await prisma.roverSchedule.create({
    data: {
      residentId: robert.id,
      roomId: room101.id,
      itemName: 'Afternoon Hydration & Vitality Pack',
      medications: robertMeds,
      scheduledTime: '14:30',
      frequency: 'DAILY',
      assignedStaffId: 'Nurse Marcus Vance (LPN-115)',
      roverId: rover.id,
      maxAttempts: 3,
      snoozeDurationMin: 10,
      isActive: true
    }
  });

  // 10. Seed Initial Task for Mary Johnson (Ready for Immediate Demo Dispatch)
  const initialTask = await prisma.roverTask.create({
    data: {
      scheduleId: marySchedule.id,
      residentId: mary.id,
      roomId: room102.id,
      roverId: rover.id,
      medications: maryMeds,
      status: TaskStatus.READY,
      scheduledAt: new Date(),
      attemptCount: 0
    }
  });

  // 11. Seed Initial Audit Log Records
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
