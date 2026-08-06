import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

import { Scholarship } from './models/Scholarship';
import { connectDB } from './config/db';

dotenv.config();

const specificImages = {
  'Heinrich Boell': {
    wiki: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Heinrich-B%C3%B6ll-Stiftung_Berlin.jpg/800px-Heinrich-B%C3%B6ll-Stiftung_Berlin.jpg',
    fallback: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?q=80&w=800&auto=format&fit=crop'
  },
  'ADB Japan': {
    wiki: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Asian_Development_Bank_Headquarters.jpg/800px-Asian_Development_Bank_Headquarters.jpg',
    fallback: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=800&auto=format&fit=crop'
  },
  'Sciences Po': {
    wiki: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Sciences_Po_Paris_-_Campus_de_Paris.jpg/800px-Sciences_Po_Paris_-_Campus_de_Paris.jpg',
    fallback: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=800&auto=format&fit=crop'
  },
  'Melbourne': {
    wiki: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Ormond_College_1.jpg/800px-Ormond_College_1.jpg',
    fallback: 'https://images.unsplash.com/photo-1514395462725-fb4566210144?q=80&w=800&auto=format&fit=crop'
  },
  'NUS Research': {
    wiki: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/NUS_University_Town.jpg/800px-NUS_University_Town.jpg',
    fallback: 'https://images.unsplash.com/photo-1565967511849-76a60a516170?q=80&w=800&auto=format&fit=crop'
  },
  'Leiden': {
    wiki: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Academiegebouw_Leiden.jpg/800px-Academiegebouw_Leiden.jpg',
    fallback: 'https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?q=80&w=800&auto=format&fit=crop'
  },
  'Imperial College': {
    wiki: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Imperial_College_London_Queens_Tower.jpg/800px-Imperial_College_London_Queens_Tower.jpg',
    fallback: 'https://images.unsplash.com/photo-1529655683823-dcbf3d4f9746?q=80&w=800&auto=format&fit=crop'
  },
  'Monash': {
    wiki: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Monash_University_Clayton_Campus.jpg/800px-Monash_University_Clayton_Campus.jpg',
    fallback: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?q=80&w=800&auto=format&fit=crop'
  },
  'Helmut Schmidt': {
    wiki: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Bonn_-_Altes_Rathaus_-_01.jpg/800px-Bonn_-_Altes_Rathaus_-_01.jpg',
    fallback: 'https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?q=80&w=800&auto=format&fit=crop'
  },
  'Toronto': {
    wiki: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/University_College_U_of_T.jpg/800px-University_College_U_of_T.jpg',
    fallback: 'https://images.unsplash.com/photo-1507992781348-310259076fe0?q=80&w=800&auto=format&fit=crop'
  },
  'Russian Government': {
    wiki: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Moscow_State_University_crop.jpg/800px-Moscow_State_University_crop.jpg',
    fallback: 'https://images.unsplash.com/photo-1547448415-e9f5b28e570d?q=80&w=800&auto=format&fit=crop'
  },
  'New Zealand ASEAN': {
    wiki: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/University_of_Auckland_Clock_Tower_02.jpg/800px-University_of_Auckland_Clock_Tower_02.jpg',
    fallback: 'https://images.unsplash.com/photo-1558025253-128a38ae859f?q=80&w=800&auto=format&fit=crop'
  },
  'Stanford': {
    wiki: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Stanford_University_Main_Quad.jpg/800px-Stanford_University_Main_Quad.jpg',
    fallback: 'https://images.unsplash.com/photo-1564565694-4c0e62ea0c39?q=80&w=800&auto=format&fit=crop'
  },
  'Commonwealth': {
    wiki: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Kings_College_London_Maughan_Library.jpg/800px-Kings_College_London_Maughan_Library.jpg',
    fallback: 'https://images.unsplash.com/photo-1573503814083-b89d5ac83e0d?q=80&w=800&auto=format&fit=crop'
  },
  'ETH Zurich': {
    wiki: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/ETH-Zuerich-Hauptgebaeude.jpg/800px-ETH-Zuerich-Hauptgebaeude.jpg',
    fallback: 'https://images.unsplash.com/photo-1589519160732-576f165b9aad?q=80&w=800&auto=format&fit=crop'
  },
  'Aga Khan': {
    wiki: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Aga_Khan_University_Hospital%2C_Karachi.jpg/800px-Aga_Khan_University_Hospital%2C_Karachi.jpg',
    fallback: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=800&auto=format&fit=crop'
  },
  'KAIST': {
    wiki: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/KAIST_Campus.jpg/800px-KAIST_Campus.jpg',
    fallback: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&auto=format&fit=crop'
  },
  'KAUST': {
    wiki: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/KAUST_Campus.jpg/800px-KAUST_Campus.jpg',
    fallback: 'https://images.unsplash.com/photo-1547481053-7d174f67b557?q=80&w=800&auto=format&fit=crop'
  },
  'Rotary Peace': {
    wiki: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Rotary_International_headquarters_in_Evanston.jpg/800px-Rotary_International_headquarters_in_Evanston.jpg',
    fallback: 'https://images.unsplash.com/photo-1509358271058-acd22cc93898?q=80&w=800&auto=format&fit=crop'
  },
  'Stipendium Hungaricum': {
    wiki: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/E%C3%B6tv%C3%B6s_Lor%C3%A1nd_University.jpg/800px-E%C3%B6tv%C3%B6s_Lor%C3%A1nd_University.jpg',
    fallback: 'https://images.unsplash.com/photo-1576169342067-a06c41b30a34?q=80&w=800&auto=format&fit=crop'
  },
  'Swedish Institute': {
    wiki: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Stockholm_University_Library.jpg/800px-Stockholm_University_Library.jpg',
    fallback: 'https://images.unsplash.com/photo-1508817628294-5a453fa0b8fb?q=80&w=800&auto=format&fit=crop'
  },
  'Rhodes Scholarship': {
    wiki: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Radcliffe_Camera_Oxford.jpg/800px-Radcliffe_Camera_Oxford.jpg',
    fallback: 'https://images.unsplash.com/photo-1580800434132-15b9dfb53cfe?q=80&w=800&auto=format&fit=crop'
  },
};

async function checkUrl(url: string) {
  try {
    const res = await axios.head(url, { headers: { 'User-Agent': 'ScholarNestBot/1.0' }, timeout: 5000 });
    return res.status === 200;
  } catch (err) {
    return false;
  }
}

async function run() {
  console.log('Verifying and updating images with robust checking...');
  
  const seedPath = path.join(__dirname, '../../scholarships_seed.json');
  let seedData: any[] = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

  const validUpdates = [];

  for (const [titleMatch, urls] of Object.entries(specificImages)) {
    const isWikiValid = await checkUrl(urls.wiki);
    const finalUrl = isWikiValid ? urls.wiki : urls.fallback;
    validUpdates.push({ titleMatch, url: finalUrl });
    
    console.log(`✅ Using image for ${titleMatch} (Wiki: ${isWikiValid})`);
    
    for (const s of seedData) {
      if (s.title.en.toLowerCase().includes(titleMatch.toLowerCase())) {
        s.image = finalUrl;
      }
    }
  }

  // Write back JSON
  fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2));
  console.log('✅ Updated scholarships_seed.json successfully');

  // Attempt DB update
  try {
    await connectDB();
    for (const update of validUpdates) {
      await Scholarship.updateMany(
        { "title.en": { $regex: update.titleMatch, $options: 'i' } },
        { $set: { image: update.url } }
      );
    }
    console.log('✅ Updated MongoDB database with correct images.');
  } catch (err: any) {
    console.log('⚠️ Could not update MongoDB directly, check your IP whitelist:', err.message);
  }

  process.exit(0);
}

run();
