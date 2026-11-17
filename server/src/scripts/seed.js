import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import Activity from '../models/Activity.js';
import Shift from '../models/Shift.js';

dotenv.config();

const sampleDoctors = [
  {
    name: 'Dr. Sarah Jenkins',
    specialization: 'Cardiology',
    hospital: 'Metropolitan General Hospital',
    phone: '+1 (555) 234-5678',
    email: 'sarah.jenkins@metrohealth.org',
    status: 'Active',
    experienceYears: 12,
    bio: 'Chief of Interventional Cardiology with expertise in coronary artery disease and heart failure.',
  },
  {
    name: 'Dr. Marcus Vance',
    specialization: 'Neurology',
    hospital: 'St. Jude Medical Center',
    phone: '+1 (555) 345-6789',
    email: 'm.vance@stjudemed.org',
    status: 'Active',
    experienceYears: 15,
    bio: 'Board-certified Neurologist focusing on neuromuscular disorders and stroke recovery.',
  },
  {
    name: 'Dr. Emily Chen',
    specialization: 'Pediatrics',
    hospital: 'Childrens Memorial Hospital',
    phone: '+1 (555) 456-7890',
    email: 'emily.chen@childrensmemorial.org',
    status: 'Active',
    experienceYears: 9,
    bio: 'Dedicated pediatrician specializing in pediatric respiratory health and preventative wellness.',
  },
  {
    name: 'Dr. Robert Alverez',
    specialization: 'Orthopedics',
    hospital: 'Apex Sports Medicine & Surgery',
    phone: '+1 (555) 567-8901',
    email: 'robert.alverez@apexortho.com',
    status: 'Active',
    experienceYears: 14,
    bio: 'Orthopedic surgeon focusing on joint reconstruction, sports trauma, and arthroscopy.',
  },
  {
    name: 'Dr. Priya Patel',
    specialization: 'Endocrinology',
    hospital: 'University Health Institute',
    phone: '+1 (555) 678-9012',
    email: 'p.patel@uhi.edu',
    status: 'Active',
    experienceYears: 11,
    bio: 'Specialist in metabolic syndromes, thyroid disorders, and advanced diabetes management.',
  },
  {
    name: 'Dr. David Kim',
    specialization: 'Dermatology',
    hospital: 'Skin & Laser Specialty Clinic',
    phone: '+1 (555) 789-0123',
    email: 'david.kim@skinlaserclinic.com',
    status: 'Active',
    experienceYears: 8,
    bio: 'Expert in clinical dermatology, autoimmune skin conditions, and dermatosurgery.',
  },
  {
    name: 'Dr. Elena Rostova',
    specialization: 'Oncology',
    hospital: 'Comprehensive Cancer Center',
    phone: '+1 (555) 890-1234',
    email: 'e.rostova@cancercenter.org',
    status: 'Active',
    experienceYears: 18,
    bio: 'Senior Medical Oncologist specializing in targeted immunotherapy and clinical trials.',
  },
  {
    name: 'Dr. Arthur Pendelton',
    specialization: 'General Surgery',
    hospital: 'Presbyterian Hospital',
    phone: '+1 (555) 901-2345',
    email: 'a.pendelton@presbyterianmed.org',
    status: 'Active',
    experienceYears: 20,
    bio: 'Senior General and Laparoscopic Surgeon with deep clinical trauma experience.',
  },
];

const patientDataTemplates = [
  // Cardiology
  { name: 'John Doe', age: 58, gender: 'Male', condition: 'Coronary Artery Disease', status: 'Stable', phone: '+1 555-111-2233', email: 'john.doe@example.com', monthOffset: 5 },
  { name: 'Alice Freeman', age: 64, gender: 'Female', condition: 'Arrhythmia', status: 'Under Observation', phone: '+1 555-111-3344', email: 'alice.f@example.com', monthOffset: 4 },
  { name: 'Michael Ramirez', age: 52, gender: 'Male', condition: 'Hypertension', status: 'Stable', phone: '+1 555-111-4455', email: 'mramirez@example.com', monthOffset: 3 },
  { name: 'Deborah White', age: 71, gender: 'Female', condition: 'Congestive Heart Failure', status: 'Critical', phone: '+1 555-111-5566', email: 'deb.white@example.com', monthOffset: 1 },

  // Neurology
  { name: 'William Taylor', age: 46, gender: 'Male', condition: 'Chronic Migraine', status: 'Stable', phone: '+1 555-222-1122', email: 'wtaylor@example.com', monthOffset: 5 },
  { name: 'Sophia Martinez', age: 39, gender: 'Female', condition: 'Multiple Sclerosis', status: 'Under Observation', phone: '+1 555-222-3344', email: 'smartinez@example.com', monthOffset: 2 },
  { name: 'James Wilson', age: 67, gender: 'Male', condition: 'Post-Stroke Rehabilitation', status: 'Recovering', phone: '+1 555-222-5566', email: 'jwilson@example.com', monthOffset: 1 },

  // Pediatrics
  { name: 'Oliver Brown', age: 7, gender: 'Male', condition: 'Pediatric Asthma', status: 'Discharged', phone: '+1 555-333-1122', email: 'parents.brown@example.com', monthOffset: 4 },
  { name: 'Emma Johnson', age: 4, gender: 'Female', condition: 'Acute Bronchitis', status: 'Recovering', phone: '+1 555-333-3344', email: 'emma.parents@example.com', monthOffset: 2 },
  { name: 'Lucas Davis', age: 11, gender: 'Male', condition: 'Type 1 Diabetes (Juvenile)', status: 'Stable', phone: '+1 555-333-5566', email: 'davis.family@example.com', monthOffset: 0 },

  // Orthopedics
  { name: 'Daniel Miller', age: 32, gender: 'Male', condition: 'Anterior Cruciate Ligament (ACL) Tear', status: 'Discharged', phone: '+1 555-444-1122', email: 'dmiller@example.com', monthOffset: 4 },
  { name: 'Olivia Garcia', age: 61, gender: 'Female', condition: 'Severe Osteoarthritis', status: 'Stable', phone: '+1 555-444-3344', email: 'olivia.g@example.com', monthOffset: 3 },
  { name: 'Henry Thomas', age: 48, gender: 'Male', condition: 'Lumbar Disc Herniation', status: 'Under Observation', phone: '+1 555-444-5566', email: 'hthomas@example.com', monthOffset: 1 },

  // Endocrinology
  { name: 'Charlotte Harris', age: 45, gender: 'Female', condition: 'Type 2 Diabetes Mellitus', status: 'Discharged', phone: '+1 555-555-1122', email: 'charlotte.h@example.com', monthOffset: 5 },
  { name: 'Ethan Clark', age: 53, gender: 'Male', condition: 'Hypothyroidism', status: 'Stable', phone: '+1 555-555-3344', email: 'ethan.clark@example.com', monthOffset: 3 },
  { name: 'Mia Robinson', age: 38, gender: 'Female', condition: 'Hashimoto Thyroiditis', status: 'Under Observation', phone: '+1 555-555-5566', email: 'mia.robinson@example.com', monthOffset: 0 },

  // Dermatology
  { name: 'Alexander Wright', age: 29, gender: 'Male', condition: 'Severe Atopic Dermatitis', status: 'Discharged', phone: '+1 555-666-1122', email: 'awright@example.com', monthOffset: 4 },
  { name: 'Amelia King', age: 34, gender: 'Female', condition: 'Plaque Psoriasis', status: 'Stable', phone: '+1 555-666-3344', email: 'amelia.king@example.com', monthOffset: 2 },

  // Oncology
  { name: 'Benjamin Scott', age: 63, gender: 'Male', condition: 'Non-Hodgkin Lymphoma', status: 'Under Observation', phone: '+1 555-777-1122', email: 'bscott@example.com', monthOffset: 5 },
  { name: 'Harper Green', age: 56, gender: 'Female', condition: 'Early Stage Breast Carcinoma', status: 'Recovering', phone: '+1 555-777-3344', email: 'harper.green@example.com', monthOffset: 2 },
  { name: 'George Baker', age: 70, gender: 'Male', condition: 'Colorectal Neoplasm', status: 'Critical', phone: '+1 555-777-5566', email: 'gbaker@example.com', monthOffset: 1 },

  // General Surgery
  { name: 'Chloe Adams', age: 27, gender: 'Female', condition: 'Acute Appendicitis (Post-Op)', status: 'Discharged', phone: '+1 555-888-1122', email: 'chloe.adams@example.com', monthOffset: 3 },
  { name: 'Samuel Nelson', age: 50, gender: 'Male', condition: 'Inguinal Hernia Repair', status: 'Recovering', phone: '+1 555-888-3344', email: 'snelson@example.com', monthOffset: 1 },
];

const seedDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('[Seeder] Connecting to database...');
    if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
      console.error('[Seeder] Refusing to run: NODE_ENV=production and this script DELETES all users, doctors and patients.');
      console.error('[Seeder] Re-run with `npm run seed -- --force` only if you really want to reset a production database.');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[Seeder] Connected successfully.');

    // 1. Clear existing collections
    console.log('[Seeder] Clearing old records...');
    await Promise.all([User.deleteMany({}), Doctor.deleteMany({}), Patient.deleteMany({}), Activity.deleteMany({}), Shift.deleteMany({})]);

    // Make the live indexes match the schemas exactly (drops stale ones such as old text indexes)
    console.log('[Seeder] Syncing indexes...');
    await Promise.all([User.syncIndexes(), Doctor.syncIndexes(), Patient.syncIndexes(), Activity.syncIndexes(), Shift.syncIndexes()]);

    // 2. Doctors (capacity = max active patients; Cardiology is deliberately at capacity)
    const capacity = { Cardiology: 4, Neurology: 6, Pediatrics: 8, Orthopedics: 6, Endocrinology: 8, Dermatology: 10, Oncology: 5, 'General Surgery': 6 };
    const createdDoctors = await Doctor.insertMany(sampleDoctors.map((d) => ({ ...d, maxPatients: capacity[d.specialization] || 10 })));
    console.log(`[Seeder] Seeded ${createdDoctors.length} doctors.`);
    const bySpecialty = Object.fromEntries(createdDoctors.map((d) => [d.specialization, d]));

    // 3. Users: one per role. The doctor login belongs to Dr. Sarah Jenkins (Cardiology).
    const PASSWORD = 'Password123!';
    const [admin, doctorUser, nurse] = await User.create([
      { name: 'System Admin', email: 'admin@doctortracker.com', password: PASSWORD, role: 'admin' },
      { name: 'Dr. Sarah Jenkins', email: 'doctor@doctortracker.com', password: PASSWORD, role: 'doctor', doctor: bySpecialty.Cardiology._id },
      { name: 'Nina Patel', email: 'nurse@doctortracker.com', password: PASSWORD, role: 'nurse' },
    ]);
    console.log('[Seeder] Created admin, doctor and nurse logins.');

    // 4. Patients — admission dates always in the past; follow-ups spread across overdue / today / this week
    const DAY = 86400000;
    const now = new Date();
    const today = new Date(now);
    today.setHours(10, 0, 0, 0);
    const doctorFor = (i) =>
      i < 4 ? 'Cardiology' : i < 7 ? 'Neurology' : i < 10 ? 'Pediatrics' : i < 13 ? 'Orthopedics' : i < 16 ? 'Endocrinology' : i < 18 ? 'Dermatology' : i < 21 ? 'Oncology' : 'General Surgery';
    const followUpOffsets = { 0: -3, 3: 0, 4: 2, 6: -1, 9: 5, 11: 0, 14: 3, 17: 9, 19: 1, 20: -6, 22: 4 };

    const patientsToInsert = patientDataTemplates.map((p, index) => {
      const admissionDate = new Date(now.getFullYear(), now.getMonth() - p.monthOffset, 1 + ((index * 3) % 27), 9, 30);
      if (admissionDate > now) admissionDate.setTime(now.getTime() - (index + 1) * DAY);
      const discharged = p.status === 'Discharged';
      const dischargeDate = discharged ? new Date(Math.min(now.getTime() - DAY, admissionDate.getTime() + (4 + (index % 9)) * DAY)) : null;
      const offset = followUpOffsets[index];
      return {
        name: p.name,
        age: p.age,
        gender: p.gender,
        condition: p.condition,
        status: p.status,
        phone: p.phone,
        email: p.email,
        doctor: bySpecialty[doctorFor(index)]._id,
        admissionDate,
        dischargeDate,
        followUpDate: !discharged && offset !== undefined ? new Date(today.getTime() + offset * DAY) : null,
        notes: `Initial diagnosis recorded at admission. Standard care protocol initiated for ${p.condition}.`,
      };
    });
    const createdPatients = await Patient.insertMany(patientsToInsert);
    console.log(`[Seeder] Seeded ${createdPatients.length} patients.`);

    // 5. History: admission + a realistic status path for each patient, so timelines and alerts have data
    const actorAdmin = { id: admin._id, name: admin.name, role: 'admin' };
    const actorDoctor = { id: doctorUser._id, name: doctorUser.name, role: 'doctor' };
    const actorNurse = { id: nurse._id, name: nurse.name, role: 'nurse' };
    const docName = Object.fromEntries(createdDoctors.map((d) => [String(d._id), d.name]));
    const events = [];
    createdPatients.forEach((p, i) => {
      const base = p.admissionDate.getTime();
      const at = (days) => new Date(Math.min(now.getTime() - 60000 * (i + 1), base + days * DAY));
      events.push({ type: 'patient.admitted', patient: p._id, patientName: p.name, doctors: [p.doctor], actor: actorAdmin, to: 'Under Observation', note: `Admitted under ${docName[String(p.doctor)]}`, createdAt: new Date(base) });
      if (p.status !== 'Under Observation') {
        const path = p.status === 'Critical' ? ['Critical'] : p.status === 'Recovering' ? ['Stable', 'Recovering'] : p.status === 'Discharged' ? ['Stable', 'Discharged'] : ['Stable'];
        let from = 'Under Observation';
        path.forEach((to, k) => {
          const actor = String(p.doctor) === String(bySpecialty.Cardiology._id) ? actorDoctor : k % 2 ? actorAdmin : actorNurse;
          const when = to === 'Critical' ? new Date(now.getTime() - (i % 5 + 1) * 3600000) : to === 'Discharged' ? p.dischargeDate : at(2 + k * 2);
          events.push({ type: 'patient.status', patient: p._id, patientName: p.name, doctors: [p.doctor], actor, from, to, createdAt: when });
          from = to;
        });
      }
      if (p.followUpDate) {
        events.push({ type: 'patient.followup', patient: p._id, patientName: p.name, doctors: [p.doctor], actor: actorNurse, to: p.followUpDate.toISOString().slice(0, 10), note: 'Follow-up scheduled', createdAt: at(1) });
      }
    });
    await Activity.insertMany(events);
    console.log(`[Seeder] Seeded ${events.length} history events.`);

    // 6. Shifts for this week and next: rotating Day / Evening / Night / On-call so someone is always on call
    const types = { Day: [8, 8], Evening: [16, 8], Night: [0, 8], 'On-call': [8, 24] };
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const rota = ['Day', 'Evening', 'Night', 'Day', 'On-call', 'Day', 'Evening'];
    const shifts = [];
    for (let day = 0; day < 14; day++) {
      createdDoctors.forEach((doc, di) => {
        if ((day + di) % 7 === 6) return; // one day off per week
        const type = rota[(day + di) % 7];
        const [h, len] = types[type];
        const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + day, h);
        shifts.push({ doctor: doc._id, type, start, end: new Date(start.getTime() + len * 3600000) });
      });
    }
    await Shift.insertMany(shifts);
    console.log(`[Seeder] Seeded ${shifts.length} shifts.`);

    console.log('----------------------------------------------------');
    console.log(' Database seeded. Logins (password for all: Password123!):');
    console.log('   admin@doctortracker.com   — Administrator');
    console.log('   doctor@doctortracker.com  — Dr. Sarah Jenkins (sees only her patients)');
    console.log('   nurse@doctortracker.com   — Nurse (status, notes, follow-ups)');
    console.log('----------------------------------------------------');

    await mongoose.disconnect();
    process.exit(0);
  } catch {
    console.error('[Seeder] Operation failed');
    process.exit(1);
  }
};

seedDB();
