import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Scholarship } from './models/Scholarship';
import { connectDB } from './config/db';

dotenv.config();

const clearData = async () => {
  try {
    await connectDB();
    await Scholarship.deleteMany();
    console.log('All scholarships cleared from DB!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
};

clearData();
