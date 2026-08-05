import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { Scholarship } from './models/Scholarship';
import { User } from './models/User';
import { connectDB } from './config/db';

dotenv.config();

const scholarships = Array.from({ length: 50 }).map((_, i) => ({
  title: {
    en: `Global Excellence Scholarship ${i + 1}`,
    ar: `منحة التميز العالمية ${i + 1}`,
  },
  description: {
    en: `This is a fully funded scholarship for outstanding students in the field of Science and Technology. Covers tuition, accommodation, and a monthly stipend.`,
    ar: `هذه منحة ممولة بالكامل للطلاب المتميزين في مجال العلوم والتكنولوجيا. تغطي الرسوم الدراسية والسكن وراتب شهري.`,
  },
  country: {
    en: ['USA', 'UK', 'Canada', 'Germany', 'Australia', 'Japan', 'Turkey', 'Egypt', 'Qatar'][i % 9],
    ar: ['الولايات المتحدة', 'المملكة المتحدة', 'كندا', 'ألمانيا', 'أستراليا', 'اليابان', 'تركيا', 'مصر', 'قطر'][i % 9],
  },
  university: {
    en: `University of Excellence ${i + 1}`,
    ar: `جامعة التميز ${i + 1}`,
  },
  degree: ['Bachelor', 'Master', 'PhD', 'Other'][i % 4],
  fundingType: i % 3 === 0 ? 'Partially Funded' : 'Fully Funded',
  majors: ['Computer Science', 'Medicine', 'Engineering', 'Business', 'Arts'].slice(0, (i % 3) + 1),
  deadline: new Date(Date.now() + Math.random() * 10000000000),
  link: `https://example.com/scholarship-${i + 1}`,
  image: `https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop`,
  keywords: ['Science', 'Technology', 'Global', 'Excellence', 'Funded'],
}));

const seedData = async () => {
  try {
    await connectDB();
    await Scholarship.deleteMany();
    await Scholarship.insertMany(scholarships);
    console.log('Scholarships Imported to DB!');

    // Create Admin User
    await User.deleteMany();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    await User.create({
      name: 'Admin User',
      email: 'admin@scholarnest.com',
      password: hashedPassword,
      role: 'admin',
    });
    console.log('Admin user created: admin@scholarnest.com / admin123');

    // Write to scholarships.json as requested
    const filePath = path.join(__dirname, '../../scholarships.json');
    fs.writeFileSync(filePath, JSON.stringify(scholarships, null, 2));
    console.log(`Generated JSON file with 50 scholarships at ${filePath}`);

    process.exit();
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
};

seedData();
