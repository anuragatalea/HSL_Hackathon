/**
 * HSL Care Smart Rover - Hackathon Staged Release Automation
 * 
 * Usage:
 *   node scripts/release-phase.js [phase_number]
 * 
 * Example:
 *   node scripts/release-phase.js 1
 */

const { execSync } = require('child_process');

const PHASES = [
  {
    phase: 0,
    branch: 'main',
    commitMsg: 'chore(init): setup monorepo structure with client, server, and core configs',
    description: 'Scaffold monorepo structure, release scripts, and base project config'
  },
  {
    phase: 1,
    branch: 'feat/01-database-and-seed',
    commitMsg: 'feat(db): implement prisma schema and seed demo residents, rooms, and rover-01',
    description: 'PostgreSQL schema with Prisma models and deterministic seed data for Room 102 & Mary Johnson'
  },
  {
    phase: 2,
    branch: 'feat/02-task-state-machine',
    commitMsg: 'feat(core): implement transactional task state machine, retry logic, and audit logger',
    description: 'Guarded FSM, snooze/retry engine, and transactional audit trail'
  },
  {
    phase: 3,
    branch: 'feat/03-rest-socket-api',
    commitMsg: 'feat(api): expose rest endpoints for task lifecycle and broadcast socket.io events',
    description: 'Full REST API surface and real-time Socket.io event broadcasting'
  },
  {
    phase: 4,
    branch: 'feat/04-rover-adapter',
    commitMsg: 'feat(rover): implement dual-mode rover adapter with virtual simulation and hardware hooks',
    description: 'Software rover simulator and Waveshare UGV-Beast Raspberry Pi bridge'
  },
  {
    phase: 5,
    branch: 'feat/05-caregiver-dashboard',
    commitMsg: 'feat(ui): build caregiver dashboard and delivery schedule creation interface',
    description: 'React dashboard with live metrics, rover status card, and schedule modal'
  },
  {
    phase: 6,
    branch: 'feat/06-mission-monitor',
    commitMsg: 'feat(ui): implement interactive 2d mission monitor and real-time floorplan tracking',
    description: 'Visual 2D floorplan showing rooms 101/102/103, dock, and live rover movement'
  },
  {
    phase: 7,
    branch: 'feat/07-rover-kiosk',
    commitMsg: 'feat(ui): create dedicated on-rover kiosk display with resident confirmation and snooze',
    description: 'Touch-friendly kiosk UI for resident arrival, confirmation, snooze, and assistance'
  },
  {
    phase: 8,
    branch: 'feat/08-audit-timeline',
    commitMsg: 'feat(ui): add audit log explorer, compliance timeline, and staff escalation handling',
    description: 'Institutional compliance audit timeline and staff escalation dialog'
  },
  {
    phase: 9,
    branch: 'feat/09-demo-polish',
    commitMsg: 'feat(demo): add caregiver assistance alerts, demo speedup controls, and pitch rehearsal tools',
    description: 'Presenter fast-forward toolbar, resident audio alerts, and demo reset tool'
  }
];

const targetPhaseArg = process.argv[2];

if (targetPhaseArg === undefined) {
  console.log('\n======================================================');
  console.log('🤖 HSL CARE SMART ROVER — HACKATHON STAGED RELEASE TOOL');
  console.log('======================================================\n');
  console.log('Available phases to release:\n');
  PHASES.forEach(p => {
    console.log(`  Phase ${p.phase}: [${p.branch}]`);
    console.log(`    Commit: ${p.commitMsg}`);
    console.log(`    Detail: ${p.description}\n`);
  });
  console.log('To release a phase, run:');
  console.log('  node scripts/release-phase.js <phase_number>\n');
  process.exit(0);
}

const phaseNum = parseInt(targetPhaseArg, 10);
const selected = PHASES.find(p => p.phase === phaseNum);

if (!selected) {
  console.error(`\n❌ Error: Phase ${targetPhaseArg} not found. Please choose between 0 and ${PHASES.length - 1}.\n`);
  process.exit(1);
}

console.log(`\n🚀 Releasing Phase ${selected.phase}:`);
console.log(`   Branch:     ${selected.branch}`);
console.log(`   Message:    ${selected.commitMsg}`);
console.log(`   Timestamp:  ${new Date().toISOString()}\n`);

try {
  // If not phase 0, switch to or create the feature branch
  if (selected.phase > 0) {
    try {
      execSync(`git checkout -b ${selected.branch}`, { stdio: 'inherit' });
    } catch {
      execSync(`git checkout ${selected.branch}`, { stdio: 'inherit' });
    }
  }

  // Stage changes
  execSync('git add .', { stdio: 'inherit' });

  // Commit
  execSync(`git commit -m "${selected.commitMsg}"`, { stdio: 'inherit' });

  console.log(`\n✅ Phase ${selected.phase} successfully committed with authentic timestamp!`);
  console.log('\nTo push to GitHub, run:');
  console.log(`   git push -u origin ${selected.branch}\n`);
} catch (err) {
  console.error('\n⚠️ Git command notice/error:', err.message);
}
