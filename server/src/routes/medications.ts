import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { enrichMedication } from '../services/pharmacologyService.js';
import { validateClinicalSafety } from '../services/clinicalSafetyService.js';

export const medicationsRouter = Router();

// GET all medications (with optional search and category filters)
medicationsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { search, category, isBeersList } = req.query;
    const where: any = {};

    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { brandName: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (category && typeof category === 'string') {
      where.category = category;
    }

    if (isBeersList !== undefined) {
      where.isBeersList = isBeersList === 'true';
    }

    const medications = await prisma.medication.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: medications });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single medication by ID
medicationsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const medication = await prisma.medication.findUnique({
      where: { id },
      include: {
        schedules: {
          where: { isActive: true },
          include: { resident: true }
        }
      }
    });

    if (!medication) {
      res.status(404).json({ success: false, error: 'Medication not found' });
      return;
    }

    res.json({ success: true, data: medication });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST auto-enrich medication details from drug name (OpenFDA + AI pharmacology)
medicationsRouter.post('/enrich', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      res.status(400).json({ success: false, error: 'Query string is required (e.g. "Metformin 500mg").' });
      return;
    }

    const enriched = await enrichMedication(query);
    res.json({ success: true, data: enriched });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST real-time clinical safety pre-check for schedule creation
medicationsRouter.post('/validate-schedule', async (req: Request, res: Response) => {
  try {
    const { residentId, medicationId, scheduledTime } = req.body;
    if (!residentId || !medicationId || !scheduledTime) {
      res.status(400).json({ success: false, error: 'residentId, medicationId, and scheduledTime are required.' });
      return;
    }

    const check = await validateClinicalSafety(prisma, residentId, medicationId, scheduledTime);
    res.json({ success: true, data: check });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create medication in master formulary
medicationsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      brandName,
      ndcCode,
      category,
      form,
      standardStrength,
      targetAgeGroup = 'ALL_ADULTS',
      minAgeYears = 18,
      maxAgeYears,
      isBeersList = false,
      beersRiskNotes,
      recommendedFrequency = 'ONCE_DAILY_QD',
      maxTimesPerDay = 1,
      minHoursBetweenDoses = 4,
      maxDailyDoseMg,
      instructions,
      requiresFood = false,
      storageTemp = 'ROOM_TEMP',
      isControlledSubstance = false,
      contraindications,
      sideEffects
    } = req.body;

    if (!name || !category || !form || !standardStrength || !instructions) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: name, category, form, standardStrength, and instructions are required.'
      });
      return;
    }

    const medication = await prisma.medication.create({
      data: {
        name,
        brandName,
        ndcCode,
        category,
        form,
        standardStrength,
        targetAgeGroup,
        minAgeYears: minAgeYears ? Number(minAgeYears) : 18,
        maxAgeYears: maxAgeYears ? Number(maxAgeYears) : null,
        isBeersList: Boolean(isBeersList),
        beersRiskNotes,
        recommendedFrequency,
        maxTimesPerDay: Number(maxTimesPerDay),
        minHoursBetweenDoses: Number(minHoursBetweenDoses),
        maxDailyDoseMg: maxDailyDoseMg ? Number(maxDailyDoseMg) : null,
        instructions,
        requiresFood: Boolean(requiresFood),
        storageTemp,
        isControlledSubstance: Boolean(isControlledSubstance),
        contraindications,
        sideEffects
      }
    });

    res.status(201).json({ success: true, data: medication });
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(400).json({ success: false, error: `A medication with the name "${req.body.name}" already exists in the formulary.` });
      return;
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE medication from formulary (if not used by active schedules)
medicationsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const activeUses = await prisma.roverSchedule.count({
      where: { medicationId: id, isActive: true }
    });

    if (activeUses > 0) {
      res.status(400).json({
        success: false,
        error: `Cannot delete: Medication is assigned to ${activeUses} active resident schedule(s).`
      });
      return;
    }

    await prisma.medication.delete({ where: { id } });
    res.json({ success: true, message: 'Medication removed from formulary.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
