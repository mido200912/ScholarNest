import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import mongoose from 'mongoose';
import { runScholarshipHunt } from './src/services/scholarshipHunterService';

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('Connected to DB. Running hunt directly from local file...');
    await runScholarshipHunt();
    console.log('Hunt finished. Exiting...');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
