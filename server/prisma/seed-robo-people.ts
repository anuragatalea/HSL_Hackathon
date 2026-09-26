/**
 * seed-robo-people.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Import script for the 12 "Robo People" from "Robo people.json (Data.pdf, 2026-09-26)"
 *
 * SAFE: Upserts by name — won't wipe existing enrolled biometric data.
 * Leaves faceEmbeddings = null and isEnrolled = false for new entries.
 * Face enrollment is done separately via the rover camera UI.
 *
 * Run with:
 *   $env:DATABASE_URL="postgresql://postgres:postgres@localhost:5433/hsl_rover?schema=public"; npm run db:seed:people
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env from the server root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '..', '.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Exact 12 people from "Robo people.json (Data.pdf, 2026-09-26)" ──────────
const roboPeople = [
  {
    full_name: 'Ruchi Chauhan',
    preferred_name: 'Ruchi',
    persona_name: '',
    aliases: '',
    gender: 'Female',
    category: 'employee',
    position: 'Business Analyst - Pre Sales',
    room: '',
    organization: 'Alea IT Solutions (AleaIT)',
    introduction: 'Focuses on understanding business needs and turning them into practical solutions that create value for clients and teams.',
    interests: 'baking; listening to music; travelling',
    care_notes: '',
    how_robo_should_address_and_talk: 'friendly colleague; chat about baking, music and travel',
    is_resident: false,
    is_special_guest: false,
    face_recognition_key: 'Ruchi Chauhan',
  },
  {
    full_name: 'Abhishek Jangid',
    preferred_name: 'Abhishek',
    persona_name: '',
    aliases: '',
    gender: 'Male',
    category: 'employee',
    position: 'UI/UX Designer',
    room: '',
    organization: 'Alea IT Solutions (AleaIT)',
    introduction: 'Enjoys creating simple, user-friendly designs that make technology easier and more engaging to use.',
    interests: 'music; photography; creative ideas',
    care_notes: '',
    how_robo_should_address_and_talk: 'friendly colleague; design, photography and creative ideas',
    is_resident: false,
    is_special_guest: false,
    face_recognition_key: 'Abhishek Jangid',
  },
  {
    full_name: 'Gaurav Gour',
    preferred_name: 'Gaurav',
    persona_name: '',
    aliases: '',
    gender: 'Male',
    category: 'employee',
    position: 'AI/ML Developer',
    room: '',
    organization: 'Alea IT Solutions (AleaIT)',
    introduction: 'Works on AI-powered applications, automation and intelligent solutions that solve real-world problems.',
    interests: 'music; volleyball; table tennis; badminton; gaming',
    care_notes: '',
    how_robo_should_address_and_talk: 'friendly colleague; AI, sports and gaming',
    is_resident: false,
    is_special_guest: false,
    face_recognition_key: 'Gaurav Gour',
  },
  {
    full_name: 'Anurag Jangir',
    preferred_name: 'Anurag',
    persona_name: '',
    aliases: '',
    gender: 'Male',
    category: 'employee',
    position: 'Full Stack Developer',
    room: '',
    organization: 'Alea IT Solutions (AleaIT)',
    introduction: 'Develops reliable and scalable features across both frontend and backend systems.',
    interests: 'playing sports; travelling',
    care_notes: '',
    how_robo_should_address_and_talk: 'friendly colleague; sports and travel',
    is_resident: false,
    is_special_guest: false,
    face_recognition_key: 'Anurag Jangir',
  },
  {
    full_name: 'Kanhaiya Lal',
    preferred_name: 'Kelvin',
    persona_name: 'Kelvin Jordan',
    aliases: 'Kelvin Jordan; Kelvin; Kanhaiya',
    gender: 'Male',
    category: 'resident',
    position: 'Resident 101 - ALEA Residence Care',
    room: '101',
    organization: 'Alea IT Solutions (AleaIT)',
    introduction: 'A resident at ALEA Residence Care who enjoys maintaining a daily routine, with support from the residence-care team when needed.',
    interests: 'music; sports; gardening',
    care_notes: 'Receiving care for Type 2 Diabetes - routine care plan: medication management, diet, regular monitoring.',
    how_robo_should_address_and_talk: 'warm, patient and respectful; call him Kelvin; talk about music, sports, gardening; gentle check-ins on routine, never medical advice',
    is_resident: true,
    is_special_guest: false,
    face_recognition_key: 'Kanhaiya Lal',
  },
  {
    full_name: 'Tanmay Gupta',
    preferred_name: 'Tony',
    persona_name: 'Tony Bolt',
    aliases: 'Tony Bolt; Tony; Tanmay',
    gender: 'Male',
    category: 'resident',
    position: 'Resident 102 - ALEA Residence Care',
    room: '102',
    organization: 'Alea IT Solutions (AleaIT)',
    introduction: 'A resident at ALEA Residence Care who enjoys staying active and engaged in daily activities, with support when needed.',
    interests: 'reading; playing cards; movies',
    care_notes: 'Receiving care for arthritis - support focused on mobility, pain management and maintaining daily activities.',
    how_robo_should_address_and_talk: 'warm, patient and respectful; call him Tony; talk about books, cards and movies; gentle check-ins on mobility/comfort, never medical advice',
    is_resident: true,
    is_special_guest: false,
    face_recognition_key: 'Tanmay Gupta',
  },
  {
    full_name: 'Yogendar Jaimini',
    preferred_name: 'Jordan',
    persona_name: 'Jordan Smith',
    aliases: 'Jordan Smith; Jordan; Yogendra; Yogendar',
    gender: 'Male',
    category: 'resident',
    position: 'Resident 103 - ALEA Residence Care',
    room: '103',
    organization: 'Alea IT Solutions (AleaIT)',
    introduction: 'A resident at ALEA Residence Care who enjoys an active, independent lifestyle, with assistance when needed.',
    interests: 'photography; podcasts; walking',
    care_notes: 'Receiving care for hypertension (high blood pressure) - routine of regular blood-pressure monitoring, medication and lifestyle management.',
    how_robo_should_address_and_talk: 'warm, patient and respectful; call him Jordan; talk about photography, podcasts and walks; gentle check-ins, never medical advice',
    is_resident: true,
    is_special_guest: false,
    face_recognition_key: 'Yogendar Jaimini',
  },
  {
    full_name: 'Chestha Chauhan',
    preferred_name: 'Cherry',
    persona_name: 'Cherry',
    aliases: 'Cherry; Nurse Cherry; Chestha',
    gender: 'Female',
    category: 'nurse',
    position: 'Nursing Staff (Registered Nurse)',
    room: '',
    organization: 'Alea IT Solutions (AleaIT)',
    introduction: 'A qualified nursing professional focused on resident care, medication support, health monitoring and compassionate assistance; experienced in patient care and supporting patients with daily care needs.',
    interests: 'reading; cooking; travelling; volunteering',
    care_notes: '',
    how_robo_should_address_and_talk: 'respectful colleague; call her Cherry; she is the nurse - defer to her on care questions',
    is_resident: false,
    is_special_guest: false,
    face_recognition_key: 'Chestha Chauhan',
  },
  {
    full_name: 'Ash',
    preferred_name: 'Ash',
    persona_name: '',
    aliases: '',
    gender: 'Male',
    category: 'management',
    position: 'Founder / Management - Hackathon Organizer',
    room: '',
    organization: 'Alea IT Solutions (AleaIT)',
    introduction: 'Founded AleaIT in 2004 and steered it from a small development team into a global AI and software partner - still hands-on with the culture and craft that shaped the company from day one.',
    interests: '',
    care_notes: '',
    how_robo_should_address_and_talk: "very respectful - the founder and a hackathon organizer; greet warmly and politely, never tease; use 'aap'",
    is_resident: false,
    is_special_guest: false,
    face_recognition_key: 'Ash',
  },
  {
    full_name: 'Megha Bhatia',
    preferred_name: 'Megha',
    persona_name: '',
    aliases: '',
    gender: 'Female',
    category: 'management',
    position: 'President & CEO / Management - Hackathon Organizer',
    room: '',
    organization: 'Alea IT Solutions (AleaIT)',
    introduction: "Leads AleaIT's global operations and growth strategy, translating two decades of technical expertise into scalable partnerships across new markets and industries.",
    interests: '',
    care_notes: '',
    how_robo_should_address_and_talk: "very respectful - the President & CEO and a hackathon organizer; greet warmly and politely, never tease; use 'aap'",
    is_resident: false,
    is_special_guest: false,
    face_recognition_key: 'Megha Bhatia',
  },
  {
    full_name: 'Shweta Dubey',
    preferred_name: 'Shweta',
    persona_name: '',
    aliases: 'Sweta',
    gender: 'Female',
    category: 'management',
    position: 'Chief Marketing Officer / Management - Hackathon Organizer',
    room: '',
    organization: 'Alea IT Solutions (AleaIT)',
    introduction: 'Leads brand strategy and marketing, shaping how AleaIT shows up to the world - from brand strategy to campaigns - so the story of 22 years of work reaches the people it is meant for.',
    interests: '',
    care_notes: '',
    how_robo_should_address_and_talk: "very respectful - the CMO and a hackathon organizer; greet warmly and politely, never tease; use 'aap'",
    is_resident: false,
    is_special_guest: false,
    face_recognition_key: 'Shweta Dubey',
  },
  {
    full_name: 'Mike Haass',
    preferred_name: 'Mike',
    persona_name: '',
    aliases: 'Mr. Haass; Michael Haass',
    gender: 'Male',
    category: 'guest',
    position: 'Guest - Residence Care Expert',
    room: '',
    organization: 'Guest (residence-care domain)',
    introduction: 'An experienced residence-care owner/founder/operator based in Pennsylvania, associated with multiple residence-care facilities that support elderly residents through administrators, caregivers, cooks, housekeeping, accounting/control and other staff.',
    interests: '',
    care_notes: '',
    how_robo_should_address_and_talk: 'SPECIAL GUEST - follow the special-guest playbook: gracious host, English by default, ask about his facilities and what would help caregivers, answer his questions fully and jolly but always respectful',
    is_resident: false,
    is_special_guest: true,
    face_recognition_key: 'Mike Haass',
  },
];

// ─── Names that were incorrectly seeded before — remove them ─────────────────
const wronglySeededNames = [
  'Mansi Sharma',
  'Pankaj Baroliya',
  'Sachin Saini',
  'Dr. Robert Martinez',
  'Nurse Sarah Jenkins',
  'Alex Rivera',
];

// ─── Build rich notes string ──────────────────────────────────────────────────
function buildNotes(p: (typeof roboPeople)[0]): string {
  const parts: string[] = [];
  if (p.introduction)                    parts.push(p.introduction);
  if (p.preferred_name)                  parts.push(`Preferred name: ${p.preferred_name}`);
  if (p.persona_name)                    parts.push(`Persona: ${p.persona_name}`);
  if (p.aliases)                         parts.push(`Aliases: ${p.aliases}`);
  if (p.interests)                       parts.push(`Interests: ${p.interests}`);
  if (p.care_notes)                      parts.push(`Care notes: ${p.care_notes}`);
  if (p.how_robo_should_address_and_talk) parts.push(`Robo tone: ${p.how_robo_should_address_and_talk}`);
  if (p.organization)                    parts.push(`Org: ${p.organization}`);
  if (p.position)                        parts.push(`Role: ${p.position}`);
  if (p.face_recognition_key)            parts.push(`FaceKey: ${p.face_recognition_key}`);
  if (p.is_special_guest)               parts.push(`SPECIAL GUEST: true`);
  return parts.join(' | ');
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Importing correct Robo People (Data.pdf, 2026-09-26)...\n');

  // Step 1: Remove wrongly seeded people (skip those with biometrics enrolled)
  console.log('🧹 Cleaning up previously wrong entries...');
  for (const name of wronglySeededNames) {
    const record = await prisma.resident.findFirst({ where: { name } });
    if (!record) {
      console.log(`   skip (not found): ${name}`);
      continue;
    }
    if (record.isEnrolled) {
      console.log(`   skip (enrolled, keeping): ${name}`);
      continue;
    }
    await prisma.resident.delete({ where: { id: record.id } });
    console.log(`   🗑️  Removed: ${name}`);
  }

  console.log('');

  // Step 2: Upsert all 12 correct people
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const person of roboPeople) {
    const roomNumber = person.room?.trim().replace('Room ', '') || 'NONE';
    const notes = buildNotes(person);

    try {
      const existing = await prisma.resident.findFirst({
        where: { name: person.full_name },
      });

      if (existing) {
        // Update profile info — NEVER touch faceEmbeddings or isEnrolled
        await prisma.resident.update({
          where: { id: existing.id },
          data: { notes, roomNumber },
        });
        console.log(`  ↻  Updated : ${person.full_name} (${person.category})`);
        updated++;
      } else {
        await prisma.resident.create({
          data: {
            name: person.full_name,
            roomNumber,
            notes,
            photoUrl: null,
            faceEmbeddings: null,
            isEnrolled: false,
          },
        });
        console.log(`  ✅ Created : ${person.full_name} (${person.category}, room: ${roomNumber === 'NONE' ? 'N/A' : roomNumber})`);
        created++;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ❌ Failed  : ${person.full_name} — ${message}`);
      skipped++;
    }
  }

  console.log('\n─────────────────────────────────────────────');
  console.log('✨ Import complete!');
  console.log(`   Created : ${created}`);
  console.log(`   Updated : ${updated}`);
  console.log(`   Skipped : ${skipped}`);
  console.log('─────────────────────────────────────────────');
  console.log('\n📌 Next: Open the app → find each person → use Face Enrollment');
  console.log("   Studio to capture their face via the rover camera.\n");
}

main()
  .catch((e) => {
    console.error('❌ Fatal error during import:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
