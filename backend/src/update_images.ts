import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

import { Scholarship } from './models/Scholarship';
import { connectDB } from './config/db';

dotenv.config();

const updates = [
  { titleMatch: 'Heinrich Boell', wikiTitle: 'Heinrich_Böll_Foundation' },
  { titleMatch: 'ADB Japan', wikiTitle: 'Asian_Development_Bank' },
  { titleMatch: 'Sciences Po', wikiTitle: 'Sciences_Po' },
  { titleMatch: 'Melbourne', wikiTitle: 'University_of_Melbourne' },
  { titleMatch: 'NUS Research', wikiTitle: 'National_University_of_Singapore' },
  { titleMatch: 'Leiden', wikiTitle: 'Leiden_University' },
  { titleMatch: 'Imperial College', wikiTitle: 'Imperial_College_London' },
  { titleMatch: 'Monash', wikiTitle: 'Monash_University' },
  { titleMatch: 'Helmut Schmidt', wikiTitle: 'University_of_Bonn' },
  { titleMatch: 'Toronto', wikiTitle: 'University_of_Toronto' },
  { titleMatch: 'Russian Government', wikiTitle: 'Moscow_State_University' },
  { titleMatch: 'New Zealand ASEAN', wikiTitle: 'University_of_Auckland' },
  { titleMatch: 'Stanford', wikiTitle: 'Stanford_University' },
  { titleMatch: 'Commonwealth', wikiTitle: 'King\'s_College_London' },
  { titleMatch: 'ETH Zurich', wikiTitle: 'ETH_Zurich' },
  { titleMatch: 'Aga Khan', wikiTitle: 'Aga_Khan_University' },
  { titleMatch: 'KAIST', wikiTitle: 'KAIST' },
  { titleMatch: 'KAUST', wikiTitle: 'King_Abdullah_University_of_Science_and_Technology' },
  { titleMatch: 'Rotary Peace', wikiTitle: 'Rotary_International' },
  { titleMatch: 'Stipendium Hungaricum', wikiTitle: 'Budapest_University_of_Technology_and_Economics' },
  { titleMatch: 'Swedish Institute', wikiTitle: 'Stockholm_University' },
  { titleMatch: 'Rhodes Scholarship', wikiTitle: 'University_of_Oxford' },
];

async function getWikiImage(title: string) {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&pithumbsize=800&format=json`;
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'ScholarNestBot/1.0 (admin@scholarnest.com)'
      }
    });
    const pages = res.data.query.pages;
    const pageId = Object.keys(pages)[0];
    if (pages[pageId] && pages[pageId].thumbnail) {
      return pages[pageId].thumbnail.source;
    }
  } catch (err: any) {
    console.error('Error fetching wiki image for', title, err?.message);
  }
  return null;
}

async function run() {
  console.log('Fetching official university images from Wikipedia...');
  
  const seedPath = path.join(__dirname, '../../scholarships_seed.json');
  let seedData: any[] = [];
  try {
    seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  } catch (e) {
    console.log('Could not read seed json from', seedPath);
  }

  const dbUpdates = [];

  for (const item of updates) {
    const imgUrl = await getWikiImage(item.wikiTitle);
    if (imgUrl) {
      console.log(`Found image for ${item.titleMatch}: ${imgUrl}`);
      dbUpdates.push({ titleMatch: item.titleMatch, imgUrl });
      
      for (const s of seedData) {
        if (s.title.en.toLowerCase().includes(item.titleMatch.toLowerCase())) {
          s.image = imgUrl;
        }
      }
    } else {
      console.log(`No image found for ${item.wikiTitle}`);
    }
  }

  if (seedData.length > 0) {
    fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2));
    console.log('✅ Updated scholarships_seed.json with correct images');
  }

  try {
    console.log('Connecting to DB to update images directly...');
    await connectDB();
    for (const update of dbUpdates) {
      const result = await Scholarship.updateMany(
        { "title.en": { $regex: update.titleMatch, $options: 'i' } },
        { $set: { image: update.imgUrl } }
      );
      if (result.modifiedCount > 0) {
        console.log(`✅ Updated DB for: ${update.titleMatch}`);
      }
    }
  } catch (error) {
    console.error('❌ Failed to update DB directly. If connection timed out, ensure IP is whitelisted in Atlas.');
  }

  console.log('Done!');
  process.exit(0);
}

run();
