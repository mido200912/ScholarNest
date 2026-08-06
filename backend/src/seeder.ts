import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { Scholarship } from './models/Scholarship';
import { User } from './models/User';
import { connectDB } from './config/db';

dotenv.config();

// Load real scholarship data from the seed JSON file
const seedFilePath = path.join(__dirname, '../../scholarships_seed.json');
const rawData = JSON.parse(fs.readFileSync(seedFilePath, 'utf-8'));

// Map to the schema format (convert deadline string to Date)
const scholarships = rawData.map((s: any) => ({
  title: s.title,
  description: s.description,
  country: s.country,
  university: s.university,
  degree: s.degree,
  fundingType: s.fundingType,
  majors: s.majors,
  deadline: new Date(s.deadline),
  link: s.link,
  image: s.image,
  keywords: s.keywords,
  status: s.status || 'approved',
}));

const seedData = async () => {
  try {
    await connectDB();

    // Create Admin User First (or find existing)
    let admin = await User.findOne({ email: 'admin@scholarnest.com' });
    if (!admin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      admin = await User.create({
        name: 'Admin User',
        email: 'admin@scholarnest.com',
        password: hashedPassword,
        role: 'admin',
      });
      console.log('✅ Admin user created: admin@scholarnest.com / admin123');
    } else {
      console.log('ℹ️  Admin user already exists, using existing admin.');
    }

    // Assign admin ID to all scholarships
    const scholarshipsWithAdmin = scholarships.map((s: any) => ({
      ...s,
      submittedBy: admin._id,
    }));

    // Seed Scholarships
    await Scholarship.deleteMany();
    await Scholarship.insertMany(scholarshipsWithAdmin);
    console.log(`✅ ${scholarships.length} real scholarships imported to DB!`);

    process.exit();
  } catch (error) {
    console.error(`❌ Error: ${error}`);
    process.exit(1);
  }
};

seedData();
