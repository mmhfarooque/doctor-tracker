// Brings MongoDB indexes in line with the schemas without touching any data.
// Run: npm run sync-indexes
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';

await mongoose.connect(process.env.MONGODB_URI);
for (const Model of [User, Doctor, Patient]) {
  const dropped = await Model.syncIndexes();
  const indexes = Object.keys(await Model.collection.indexInformation());
  console.log(`[Indexes] ${Model.modelName}: dropped [${dropped.join(', ')}] now [${indexes.join(', ')}]`);
}
await mongoose.disconnect();
