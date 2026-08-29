require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

(async () => {
  const allResults = [];
  const debug = [];

  // ── STEP 1: Scrape ScholarshipROAR ──
  const PAGES = [
    'https://scholarshiproar.com/masters-scholarships/',
    'https://scholarshiproar.com/phd-scholarships/',
  ];

  for (const pageUrl of PAGES) {
    try {
      const section = pageUrl.split('/').slice(-2, -1)[0];
      debug.push(`🔍 Scraping ${section}...`);
      const r = await axios.get(pageUrl, { headers: HEADERS, timeout: 20000 });
      const $ = cheerio.load(r.data);

      let found = 0;
      $('h3').each((_, el) => {
        let h3Text = $(el).text().trim().replace(/^\d+\.\s*/, '');
        if (h3Text.length < 5 || h3Text.includes('POPULAR') || h3Text.includes('Follow') || h3Text.includes('CATEGORY')) return;

        let officialUrl = '';
        let roarUrl = '';

        const parentA = $(el).parent('a').attr('href');
        if (parentA) {
          if (parentA.includes('scholarshiproar.com')) roarUrl = parentA;
          else officialUrl = parentA;
        }

        $(el).find('a').each((_, a) => {
          const href = $(a).attr('href') || '';
          if (href.startsWith('http')) {
            if (href.includes('scholarshiproar.com')) roarUrl = href;
            else officialUrl = href;
          }
        });

        if (!officialUrl) {
          $(el).nextAll().slice(0, 3).each((_, sib) => {
            if (officialUrl) return;
            $(sib).find('a').each((_, a) => {
              if (officialUrl) return;
              const href = $(a).attr('href') || '';
              if (href.startsWith('http') && !href.includes('scholarshiproar.com')) officialUrl = href;
            });
          });
        }

        const finalUrl = officialUrl || roarUrl;
        if (finalUrl && h3Text) {
          allResults.push({ title: h3Text, description: `Scholarship: ${h3Text}`, url: finalUrl, source: section });
          found++;
        }
      });
      debug.push(`   ✅ ${found} scholarships`);
    } catch (e) {
      debug.push(`   ❌ ${(e.message || '').substring(0, 80)}`);
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // ── STEP 2: Bing Search ──
  try {
    debug.push('🔍 Searching Bing...');
    const r = await axios.get('https://www.bing.com/search', {
      params: { q: '"fully funded" "scholarship" "2026" OR "2027" "apply now" international students', count: 15 },
      headers: HEADERS, timeout: 15000,
    });
    const $ = cheerio.load(r.data);
    let bingCount = 0;
    $('li.b_algo').each((_, el) => {
      const title = $(el).find('h2 a').text().trim();
      const url = $(el).find('h2 a').attr('href');
      const snippet = $(el).find('.b_caption p, .b_algoSlug').text().trim();
      if (title && url && !url.startsWith('https://www.bing.com') && !url.includes('bing.com/ck')) {
        allResults.push({ title: title.substring(0, 150), description: snippet.substring(0, 300), url, source: 'Bing' });
        bingCount++;
      }
    });
    debug.push(`   ✅ ${bingCount} Bing results`);
  } catch (e) {
    debug.push(`   ❌ Bing: ${(e.message || '').substring(0, 80)}`);
  }

  // ── Dedupe ──
  const seen = new Set();
  const unique = allResults.filter(r => { if (seen.has(r.url)) return false; seen.add(r.url); return true; });
  debug.push(`📊 Total unique: ${unique.length}`);

  console.log('\n========== SCRAPE RESULTS ==========');
  debug.forEach(d => console.log(d));
  console.log(`\n📋 Sample (first 5):`);
  unique.slice(0, 5).forEach((r, i) => console.log(`  ${i+1}. ${r.title} → ${r.url}`));

  // ── STEP 3: AI Evaluation ──
  if (unique.length === 0) {
    console.log('\n❌ No results to evaluate');
    return;
  }

  console.log('\n========== AI EVALUATION ==========');
  const Groq = require('groq-sdk');
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `You are an expert scholarship researcher. Extract structured data from these results.

FOR EACH VALID SCHOLARSHIP, return JSON:
{
  "titleEn": "English title",
  "titleAr": "Arabic translation", 
  "descriptionEn": "2-3 sentences",
  "descriptionAr": "Arabic translation",
  "countryEn": "Country",
  "countryAr": "Arabic country",
  "universityEn": "University/org",
  "universityAr": "Arabic translation",
  "degree": "Bachelor"|"Master"|"PhD"|"Other",
  "fundingType": "Fully Funded"|"Partially Funded",
  "majors": ["fields"],
  "deadline": "2026-12-31",
  "link": "application URL",
  "keywords": ["k1","k2"],
  "isValid": true
}

RULES:
- ONLY real, currently open scholarships
- Valid URL required
- If deadline unknown, use 6 months from now
- Return JSON array ONLY

RESULTS:
${JSON.stringify(unique.slice(0, 20), null, 2)}`;

  try {
    const r = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4000,
    });
    let cleaned = r.choices[0].message.content.trim();
    if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (jsonMatch) cleaned = jsonMatch[0];
    const parsed = JSON.parse(cleaned);

    const valid = parsed.filter(s => s.isValid && s.titleEn && s.link);
    console.log(`\n✅ AI extracted ${parsed.length} scholarships, ${valid.length} valid`);
    console.log('\n📋 Results:');
    valid.forEach((s, i) => {
      console.log(`\n  ${i+1}. ${s.titleEn} / ${s.titleAr}`);
      console.log(`     🏛 ${s.universityEn}`);
      console.log(`     🌍 ${s.countryEn}`);
      console.log(`     💰 ${s.fundingType} | 📚 ${s.degree}`);
      console.log(`     🔗 ${s.link}`);
      console.log(`     📝 ${(s.descriptionEn || '').substring(0, 100)}...`);
    });

    // Save to file for reference
    const fs = require('fs');
    fs.writeFileSync('test_results.json', JSON.stringify(valid, null, 2));
    console.log('\n💾 Saved to test_results.json');
  } catch (err) {
    console.error('\n❌ AI Error:', err.response?.data?.error?.message || err.message);
  }
})();
