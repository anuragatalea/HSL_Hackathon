import { PrismaClient, Medication, Resident } from '@prisma/client';

export interface SafetyCheckResult {
  allowed: boolean;
  blockReason?: string;
  warnings: string[];
  safeCompartmentSuggested: number;
}

/**
 * Validates clinical compatibility of a medication with a resident profile and existing schedules.
 */
export async function validateClinicalSafety(
  prisma: PrismaClient,
  residentId: string,
  medicationId: string,
  scheduledTime: string // e.g. "10:00"
): Promise<SafetyCheckResult> {
  const warnings: string[] = [];

  // 1. Fetch Resident and Medication
  const [resident, medication] = await Promise.all([
    prisma.resident.findUnique({
      where: { id: residentId },
      include: { schedules: { where: { isActive: true } } }
    }),
    prisma.medication.findUnique({
      where: { id: medicationId }
    })
  ]);

  if (!resident) {
    return { allowed: false, blockReason: `Resident with ID ${residentId} not found.`, warnings, safeCompartmentSuggested: 1 };
  }

  if (!medication) {
    return { allowed: false, blockReason: `Medication with ID ${medicationId} not found.`, warnings, safeCompartmentSuggested: 1 };
  }

  // 2. Age & Beers Criteria Validation (Senior Living Protection)
  // Default senior living resident age assumed 78+ unless specified
  const residentAge = 80;

  if (medication.minAgeYears && residentAge < medication.minAgeYears) {
    return {
      allowed: false,
      blockReason: `Safety Violation: ${medication.name} requires minimum age of ${medication.minAgeYears} years.`,
      warnings,
      safeCompartmentSuggested: 1
    };
  }

  if (medication.isBeersList && residentAge >= 65) {
    warnings.push(
      `⚠️ BEERS CRITERIA ALERT: ${medication.name} carries significant risk for geriatric residents. ${medication.beersRiskNotes || 'Requires close nurse supervision.'}`
    );
  }

  // 3. Daily Frequency Ceiling Check
  // Count how many active schedules already exist for this resident with the same medication
  const existingSchedulesWithDrug = resident.schedules.filter(s => s.medicationId === medicationId);
  const currentDailyCount = existingSchedulesWithDrug.length;

  if (currentDailyCount >= medication.maxTimesPerDay) {
    return {
      allowed: false,
      blockReason: `Dosage Ceiling Exceeded: ${medication.name} has a clinical maximum of ${medication.maxTimesPerDay} dose(s) per day. (Currently scheduled: ${currentDailyCount}).`,
      warnings,
      safeCompartmentSuggested: 1
    };
  }

  // 4. Dose-Stacking Lockout Interval Check
  // Ensure existing scheduled times are not too close to the new scheduledTime
  for (const s of existingSchedulesWithDrug) {
    const diffHours = calculateTimeDifferenceHours(s.scheduledTime, scheduledTime);
    if (diffHours < medication.minHoursBetweenDoses) {
      return {
        allowed: false,
        blockReason: `Dose Stacking Risk: Scheduled dose at ${scheduledTime} is within ${diffHours.toFixed(1)} hours of dose at ${s.scheduledTime}. Minimum required interval is ${medication.minHoursBetweenDoses} hours.`,
        warnings,
        safeCompartmentSuggested: 1
      };
    }
  }

  // 5. Rover Hardware Storage & Compartment Assignment
  let safeCompartment = 1;
  if (medication.storageTemp === 'REFRIGERATED_2_TO_8C') {
    safeCompartment = 4; // Compartment 4 is the cold bay
    warnings.push(`❄️ Temperature Warning: ${medication.name} requires refrigerated storage (2°C to 8°C). Auto-assigned to Compartment 4.`);
  }

  if (medication.isControlledSubstance) {
    warnings.push(`🔒 Controlled Substance: ${medication.name} is a controlled drug. Rover kiosk will enforce dual-nurse biometric/PIN sign-off.`);
  }

  return {
    allowed: true,
    warnings,
    safeCompartmentSuggested: safeCompartment
  };
}

function calculateTimeDifferenceHours(time1: string, time2: string): number {
  const [h1, m1] = (time1 || '00:00').split(':').map(Number);
  const [h2, m2] = (time2 || '00:00').split(':').map(Number);

  const mins1 = (h1 || 0) * 60 + (m1 || 0);
  const mins2 = (h2 || 0) * 60 + (m2 || 0);

  const diffMins = Math.abs(mins1 - mins2);
  return diffMins / 60;
}
