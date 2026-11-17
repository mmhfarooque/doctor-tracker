import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';

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
  { name: 'Oliver Brown', age: 7, gender: 'Male', condition: 'Pediatric Asthma', status: 'Stable', phone: '+1 555-333-1122', email: 'parents.brown@example.com', monthOffset: 4 },
  { name: 'Emma Johnson', age: 4, gender: 'Female', condition: 'Acute Bronchitis', status: 'Recovering', phone: '+1 555-333-3344', email: 'emma.parents@example.com', monthOffset: 2 },
  { name: 'Lucas Davis', age: 11, gender: 'Male', condition: 'Type 1 Diabetes (Juvenile)', status: 'Stable', phone: '+1 555-333-5566', email: 'davis.family@example.com', monthOffset: 0 },

  // Orthopedics
  { name: 'Daniel Miller', age: 32, gender: 'Male', condition: 'Anterior Cruciate Ligament (ACL) Tear', status: 'Recovering', phone: '+1 555-444-1122', email: 'dmiller@example.com', monthOffset: 4 },
  { name: 'Olivia Garcia', age: 61, gender: 'Female', condition: 'Severe Osteoarthritis', status: 'Stable', phone: '+1 555-444-3344', email: 'olivia.g@example.com', monthOffset: 3 },
  { name: 'Henry Thomas', age: 48, gender: 'Male', condition: 'Lumbar Disc Herniation', status: 'Under Observation', phone: '+1 555-444-5566', email: 'hthomas@example.com', monthOffset: 1 },

  // Endocrinology
  { name: 'Charlotte Harris', age: 45, gender: 'Female', condition: 'Type 2 Diabetes Mellitus', status: 'Stable', phone: '+1 555-555-1122', email: 'charlotte.h@example.com', monthOffset: 5 },
  { name: 'Ethan Clark', age: 53, gender: 'Male', condition: 'Hypothyroidism', status: 'Stable', phone: '+1 555-555-3344', email: 'ethan.clark@example.com', monthOffset: 3 },
  { name: 'Mia Robinson', age: 38, gender: 'Female', condition: 'Hashimoto Thyroiditis', status: 'Under Observation', phone: '+1 555-555-5566', email: 'mia.robinson@example.com', monthOffset: 0 },

  // Dermatology
  { name: 'Alexander Wright', age: 29, gender: 'Male', condition: 'Severe Atopic Dermatitis', status: 'Stable', phone: '+1 555-666-1122', email: 'awright@example.com', monthOffset: 4 },
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
    await Promise.all([
      User.deleteMany({}),
      Doctor.deleteMany({}),
      Patient.deleteMany({}),
    ]);

    // Make the live indexes match the schemas exactly (drops stale ones such as old text indexes)
    console.log('[Seeder] Syncing indexes...');
    await Promise.all([User.syncIndexes(), Doctor.syncIndexes(), Patient.syncIndexes()]);

    // 2. Create Admin user
    console.log('[Seeder] Creating admin user...');
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@doctortracker.com',
      password: 'Password123!',
      role: 'admin',
    });
    console.log(`[Seeder] Admin created: ${admin.email} (Password: Password123!)`);

    // 3. Create Doctors
    console.log('[Seeder] Seeding doctors...');
    const createdDoctors = await Doctor.insertMany(sampleDoctors);
    console.log(`[Seeder] Seeded ${createdDoctors.length} doctors.`);

    // 4. Map and seed patients
    console.log('[Seeder] Seeding patients with realistic timelines...');
    const specialtyDoctorMap = {};
    createdDoctors.forEach((doc) => {
      specialtyDoctorMap[doc.specialization] = doc._id;
    });

    const now = new Date();
    const patientsToInsert = patientDataTemplates.map((p, index) => {
      // Find doctor by matching specialty or round robin
      let assignedDoctorId;
      if (index < 4) assignedDoctorId = specialtyDoctorMap['Cardiology'];
      else if (index < 7) assignedDoctorId = specialtyDoctorMap['Neurology'];
      else if (index < 10) assignedDoctorId = specialtyDoctorMap['Pediatrics'];
      else if (index < 13) assignedDoctorId = specialtyDoctorMap['Orthopedics'];
      else if (index < 16) assignedDoctorId = specialtyDoctorMap['Endocrinology'];
      else if (index < 18) assignedDoctorId = specialtyDoctorMap['Dermatology'];
      else if (index < 21) assignedDoctorId = specialtyDoctorMap['Oncology'];
      else assignedDoctorId = specialtyDoctorMap['General Surgery'];

      // Calculate realistic past admission date based on monthOffset
      const admissionDate = new Date(now);
      admissionDate.setMonth(admissionDate.getMonth() - p.monthOffset);
      admissionDate.setDate(Math.max(1, (index * 3) % 28 + 1));

      return {
        name: p.name,
        age: p.age,
        gender: p.gender,
        condition: p.condition,
        status: p.status,
        phone: p.phone,
        email: p.email,
        doctor: assignedDoctorId,
        admissionDate,
        notes: `Initial diagnosis recorded at admission. Standard care protocol initiated for ${p.condition}.`,
      };
    });

    const createdPatients = await Patient.insertMany(patientsToInsert);
    console.log(`[Seeder] Seeded ${createdPatients.length} patients.`);

    console.log('----------------------------------------------------');
    console.log(' Database seeded successfully!');
    console.log(' Admin Credentials:');
    console.log('   Email:    admin@doctortracker.com');
    console.log('   Password: Password123!');
    console.log('----------------------------------------------------');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`[Seeder Error]: ${error.message}`);
    process.exit(1);
  }
};

seedDB();
