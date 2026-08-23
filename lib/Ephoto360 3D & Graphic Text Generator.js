/**
 * =======================================================
 *  Project   : Ephoto360 3D & Graphic Text Generator
 *  Category  : Scrapers / Image Effects
 *  Desc      : High-speed Native API & Generator for en.ephoto360.com (720+ Effects & 22 Categories)
 *  Channel   : https://whatsapp.com/channel/0029VbD95WTBlHpf7WV82D0M
 *  Base URL  : https://en.ephoto360.com
 *  Author    : OmnifyLabs
 * =======================================================
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { createSecureHttpsAgent } = require('./doh-resolver');

const BASE_URL = 'https://en.ephoto360.com';

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  'Accept':
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': BASE_URL,
};

// Preset URL Efek-Efek Populer di Ephoto360
const PRESET_EFFECTS = {
  // Pop Culture, Anime & Gaming
  'deadpool': 'https://en.ephoto360.com/create-text-effects-in-the-style-of-the-deadpool-logo-818.html',
  'dragon-ball': 'https://en.ephoto360.com/create-dragon-ball-style-text-effects-online-809.html',
  '3d-comic': 'https://en.ephoto360.com/create-online-3d-comic-style-text-effects-817.html',
  'naruto': 'https://en.ephoto360.com/naruto-shippuden-logo-style-text-effect-online-808.html',
  'glitch-cyberpunk': 'https://en.ephoto360.com/create-a-glitch-cyberpunk-text-effect-online-787.html',
  'neon-devil': 'https://en.ephoto360.com/neon-devil-wings-text-effect-online-683.html',
  'pubg-logo': 'https://en.ephoto360.com/pubg-logo-maker-online-free-557.html',
  'free-fire': 'https://en.ephoto360.com/free-fire-avatar-logo-maker-561.html',
  'blackpink': 'https://en.ephoto360.com/online-blackpink-style-logo-maker-effect-511.html',
  'marvel': 'https://en.ephoto360.com/create-logo-style-marvel-studios-online-ver-2-404.html',
  'hacker': 'https://en.ephoto360.com/anonymous-hacker-avatar-maker-577.html',
  'gaming-mascot': 'https://en.ephoto360.com/create-cute-anime-mascot-logo-online-639.html',

  // 3D, Metallic & Luxury
  'water-3d': 'https://en.ephoto360.com/create-a-3d-water-pipe-text-effect-online-729.html',
  'metallic-3d': 'https://en.ephoto360.com/create-a-3d-metallic-text-effect-free-online-671.html',
  'luxury-gold': 'https://en.ephoto360.com/modern-gold-luxury-text-effect-online-754.html',
  'gold-metal': 'https://en.ephoto360.com/luxury-gold-text-effect-online-free-611.html',
  'galaxy': 'https://en.ephoto360.com/create-galaxy-style-free-name-logo-438.html',
  'thunder': 'https://en.ephoto360.com/online-thunder-text-effect-generator-103.html',
  'matrix': 'https://en.ephoto360.com/matrix-text-effect-154.html',
  'graffiti': 'https://en.ephoto360.com/create-graffiti-text-on-the-wall-online-665.html',
  'pixel-glitch': 'https://en.ephoto360.com/create-pixel-glitch-text-effect-online-769.html',
  'neon-light': 'https://en.ephoto360.com/neon-light-text-effect-online-882.html',
  'sand-beach': 'https://en.ephoto360.com/write-in-sand-summer-beach-free-online-991.html',
  'dragon-steel': 'https://en.ephoto360.com/dragon-steel-text-effect-online-347.html',
  'smoke-typography': 'https://en.ephoto360.com/smoke-typography-text-effect-online-569.html',
  'light-bulb': 'https://en.ephoto360.com/create-realistic-vintage-light-bulb-text-effect-online-708.html',
  'blood-horror': 'https://en.ephoto360.com/horror-blood-text-effect-online-883.html',
  'transformer': 'https://en.ephoto360.com/create-a-transformer-text-effect-online-1035.html',
  'halloween': 'https://en.ephoto360.com/halloween-fire-text-effect-940.html',
  'glossy-chrome': 'https://en.ephoto360.com/glossy-metallic-chrome-3d-text-effect-1185.html',

  // Category Shortcuts
  'christmas': 'https://en.ephoto360.com/merry-christmas-c19',
  'new-year': 'https://en.ephoto360.com/new-year-c20',
  '3d-effect': 'https://en.ephoto360.com/3d-effect-c21',
  'text-effects': 'https://en.ephoto360.com/text-effects-c6',
  'game-effect': 'https://en.ephoto360.com/game-effect-c9',
  'love': 'https://en.ephoto360.com/love-c7',
  'artistic': 'https://en.ephoto360.com/artistic-effect-c5',
  'birthday': 'https://en.ephoto360.com/happy-birthday-c13',
  'drawing': 'https://en.ephoto360.com/drawing-effects-c1',
  'cup': 'https://en.ephoto360.com/cup-effects-c2',
  'fire': 'https://en.ephoto360.com/fire-effects-c3',
  'coins': 'https://en.ephoto360.com/coins-effects-c4',
  'festival': 'https://en.ephoto360.com/festival-c8',
  'shirt': 'https://en.ephoto360.com/shirt-effect-c10',
  'glass': 'https://en.ephoto360.com/glass-effect-c12',
  'cover-fb': 'https://en.ephoto360.com/cover-facebook-c14',
  'technology': 'https://en.ephoto360.com/technology-c18',
  'animations': 'https://en.ephoto360.com/animations-c15',
  'tattoo': 'https://en.ephoto360.com/tattoo-effcts-c16',
  'sport': 'https://en.ephoto360.com/sport-effects-c17',
  'video': 'https://en.ephoto360.com/video-effect-c22',
};

/**
 * Ekstrak item efek dari elemen HTML cheerio
 */
function parseEffectItems($, selector = '.grid-item, .col-md-4, .thumbnail, .title-effect-item, .item-effect') {
  const items = [];
  $(selector).each((_, el) => {
    const link = $(el).find('a').attr('href');
    const title = $(el).find('.title, h3, a').text().trim();
    const img = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');
    if (link && link.includes('.html')) {
      const fullUrl = link.startsWith('http') ? link : `${BASE_URL}${link}`;
      const match = fullUrl.match(/\/([^\/]+)-(\d+)\.html/);
      const slug = match ? match[1].replace(/-online|-effect|-generator|-free/g, '') : '';
      if (!items.some((item) => item.url === fullUrl)) {
        items.push({
          title,
          url: fullUrl,
          slug,
          id: match ? match[2] : null,
          thumbnail: img ? (img.startsWith('http') ? img : `${BASE_URL}${img}`) : null,
        });
      }
    }
  });
  return items;
}

/**
 * 1. Ambil daftar semua 22+ kategori di Ephoto360
 * @returns {Promise<Array<{ name: string, slug: string, url: string }>>}
 */
async function getCategories() {
  const res = await axios.get(`${BASE_URL}/`, {
    headers: DEFAULT_HEADERS,
    httpsAgent: createSecureHttpsAgent(),
  });

  const $ = cheerio.load(res.data);
  const categories = [];

  $('a[href*="-c"], a[href*="/category/"]').each((_, el) => {
    const href = $(el).attr('href');
    const name = $(el).text().trim();
    if (href && (href.match(/-c\d+/) || href.includes('/category/'))) {
      const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
      if (!categories.some((c) => c.url === fullUrl) && name) {
        categories.push({
          name: name.replace(/\s+/g, ' ').trim(),
          slug: href.replace(/^\//, '').replace(/\.html$/, ''),
          url: fullUrl,
        });
      }
    }
  });

  return categories;
}

/**
 * 2. Scrape daftar efek berdasarkan Kategori (cth: '3d-effect-c21', 'text-effects-c6', 'game-effect-c9')
 * Mendukung pagination multi-halaman (-p2, -p3, dll.)
 * 
 * @param {string} categorySlugOrUrl 
 * @param {number} page 
 * @returns {Promise<{ category: string, url: string, page: number, total: number, results: Array }>}
 */
async function getByCategory(categorySlugOrUrl, page = 1) {
  if (!categorySlugOrUrl) throw new Error('Parameter kategori harus ditentukan.');

  let cleanSlug = categorySlugOrUrl.replace(/^https?:\/\/[^\/]+\/?/, '').replace(/^\//, '').replace(/-p\d+$/, '');
  let targetUrl = `${BASE_URL}/${cleanSlug}`;

  if (page > 1) {
    targetUrl = `${BASE_URL}/${cleanSlug}-p${page}`;
  }

  const res = await axios.get(targetUrl, {
    headers: DEFAULT_HEADERS,
    httpsAgent: createSecureHttpsAgent(),
  });

  const $ = cheerio.load(res.data);
  const categoryTitle = $('h1, .title, title').first().text().replace('Online', '').trim();
  const results = parseEffectItems($);

  return {
    category: categoryTitle || cleanSlug,
    url: targetUrl,
    page: Number(page),
    total: results.length,
    results,
  };
}

/**
 * 3. Cari efek teks berdasarkan keyword di seluruh 720+ database Ephoto360
 * @param {string} query 
 * @param {number} page
 * @returns {Promise<Array<{ title: string, url: string, thumbnail: string, slug: string }>>}
 */
async function searchEffects(query, page = 1) {
  if (!query || !query.trim()) throw new Error('Parameter query pencarian harus diisi.');

  const pageSuffix = page > 1 ? `&page=${page}` : '';
  const searchUrl = `${BASE_URL}/index/search?q=${encodeURIComponent(query.trim())}${pageSuffix}`;
  const res = await axios.get(searchUrl, {
    headers: DEFAULT_HEADERS,
    httpsAgent: createSecureHttpsAgent(),
  });

  const $ = cheerio.load(res.data);
  return parseEffectItems($);
}

/**
 * 4. Browse seluruh 720+ efek Ephoto360 (Halaman 1 sampai 40)
 * Format URL: /home-p1 ... /home-p40
 * 
 * @param {number} page - Nomor halaman (1 - 40)
 * @returns {Promise<{ page: number, total_pages: number, total: number, results: Array }>}
 */
async function listEffects(page = 1) {
  const pageNum = parseInt(page, 10) || 1;
  const targetUrl = pageNum > 1 ? `${BASE_URL}/home-p${pageNum}` : `${BASE_URL}/`;
  
  const res = await axios.get(targetUrl, {
    headers: DEFAULT_HEADERS,
    httpsAgent: createSecureHttpsAgent(),
  });

  const $ = cheerio.load(res.data);
  const results = parseEffectItems($);

  return {
    page: pageNum,
    total_pages: 40,
    url: targetUrl,
    total: results.length,
    results,
  };
}

/**
 * 5. Generate 3D Graphic Text Effect menggunakan Ephoto360
 *
 * @param {string} effectNameOrUrl - Nama preset (cth: 'deadpool', 'naruto'), kategori, atau URL efek lengkap
 * @param {string|string[]} texts - Teks yang akan digenerate (string atau array of string untuk multi-text split)
 * @param {Object} options - { buffer?: boolean, radio?: string|number }
 * @returns {Promise<{ status: string, title: string, effectUrl: string, imageUrl: string, imageCode: string, buffer?: Buffer }>}
 */
async function generate(effectNameOrUrl, texts, options = {}) {
  if (!effectNameOrUrl) throw new Error('Harap tentukan nama efek atau URL Ephoto360.');
  if (!texts || (Array.isArray(texts) && texts.length === 0)) {
    throw new Error('Harap masukkan teks yang ingin dibuat.');
  }

  const startTime = Date.now();

  // 1. Tentukan target effect URL
  let targetUrl = effectNameOrUrl;
  const lowerKey = effectNameOrUrl.toLowerCase().trim();

  if (PRESET_EFFECTS[lowerKey]) {
    targetUrl = PRESET_EFFECTS[lowerKey];
  }

  // Jika target URL berupa kategori, ambil item efek pertama di dalamnya
  if (targetUrl.includes('-c') && !targetUrl.includes('.html')) {
    const catData = await getByCategory(targetUrl);
    if (catData.results.length > 0) {
      targetUrl = catData.results[0].url;
    }
  } else if (!targetUrl.startsWith('http')) {
    // Coba cari jika bukan URL langsung
    const searchRes = await searchEffects(effectNameOrUrl);
    if (searchRes.length > 0) {
      targetUrl = searchRes[0].url;
    } else {
      throw new Error(`Efek "${effectNameOrUrl}" tidak ditemukan di preset maupun pencarian Ephoto360.`);
    }
  }

  const agent = createSecureHttpsAgent();

  // 2. Fetch Halaman Efek untuk ambil Token & Build Server
  const pageRes = await axios.get(targetUrl, {
    headers: DEFAULT_HEADERS,
    httpsAgent: agent,
    timeout: 20000,
  });

  const cookies = pageRes.headers['set-cookie']?.map((c) => c.split(';')[0]).join('; ') || '';
  const $ = cheerio.load(pageRes.data);

  const title = $('h1.title, .title-effect, title').first().text().replace('Online', '').trim();
  const token = $('input[name="token"]').val();
  const buildServer = $('input[name="build_server"]').val() || BASE_URL;
  const buildServerId = $('input[name="build_server_id"]').val() || '1';

  if (!token) {
    throw new Error('Gagal mengekstrak form token dari halaman efek Ephoto360.');
  }

  // Format array text
  const textArray = Array.isArray(texts) ? texts : [texts];

  // 3. POST form awal untuk meminta Signed Payload
  const params = new URLSearchParams();
  for (const t of textArray) {
    params.append('text[]', String(t).trim());
  }

  // Radio / Style selection jika tersedia
  if (options.radio !== undefined) {
    params.append('radio0[radio]', String(options.radio));
  }

  params.append('submit', 'Go');
  params.append('token', token);
  params.append('build_server', buildServer);
  params.append('build_server_id', buildServerId);

  const postRes = await axios.post(targetUrl, params.toString(), {
    headers: {
      ...DEFAULT_HEADERS,
      'Cookie': cookies,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': targetUrl,
    },
    httpsAgent: agent,
    timeout: 25000,
  });

  const $res = cheerio.load(postRes.data);
  let rawFormValue =
    $res('#form_value').first().text() ||
    $res('#form_value').first().val() ||
    $res('#form_value_input').val() ||
    '';

  if (!rawFormValue) {
    const match = postRes.data.match(/<div[^>]*id="form_value"[^>]*>([\s\S]*?)<\/div>/i);
    if (match) rawFormValue = match[1];
  }

  const jsonMatch = rawFormValue ? rawFormValue.match(/\{[\s\S]*?\}/) : null;
  if (!jsonMatch) {
    throw new Error('Gagal mendapatkan signature payload dari Ephoto360 server.');
  }

  const formValue = JSON.parse(jsonMatch[0]);

  // 4. Submit Signed Payload ke Endpoint Pembuatan Gambar (/effect/create-image)
  const createRes = await axios.post(`${BASE_URL}/effect/create-image`, formValue, {
    headers: {
      ...DEFAULT_HEADERS,
      'Cookie': cookies,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Referer': targetUrl,
      'X-Requested-With': 'XMLHttpRequest',
    },
    httpsAgent: agent,
    timeout: 30000,
  });

  const resData = createRes.data;
  if (!resData || !resData.success) {
    throw new Error(resData?.info || resData?.message || 'Gagal memproses gambar pada server Ephoto360.');
  }

  const imagePath = resData.fullsize_image || resData.image;
  const serverPrefix = formValue.build_server || BASE_URL;
  const fullImageUrl = imagePath.startsWith('http') ? imagePath : `${serverPrefix}${imagePath}`;
  const duration = `${((Date.now() - startTime) / 1000).toFixed(2)} detik`;

  const result = {
    status: 'success',
    engine: 'Ephoto360 3D Text & Graphic Generator',
    title: title || 'Ephoto360 Effect',
    effectUrl: targetUrl,
    text: textArray.length === 1 ? textArray[0] : textArray,
    imageUrl: fullImageUrl,
    imageCode: resData.image_code || null,
    sessionId: resData.session_id || null,
    duration,
    timestamp: new Date().toISOString(),
  };

  // Optional auto-download image buffer
  if (options.buffer) {
    const imgRes = await axios.get(fullImageUrl, {
      responseType: 'arraybuffer',
      headers: DEFAULT_HEADERS,
      httpsAgent: agent,
    });
    result.buffer = Buffer.from(imgRes.data);
  }

  return result;
}

/**
 * CLI Runner
 */
async function main() {
  const args = process.argv.slice(2);
  const isJson = args.includes('--json') || process.env.OUTPUT_JSON === 'true';

  let effectArg = 'deadpool';
  let searchArg = '';
  let categoryArg = '';
  let showCategories = args.includes('--categories') || args.includes('-c');
  let listArg = args.includes('--list') || args.includes('-l');
  let pageArg = 1;
  const texts = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--json' || arg === '--list' || arg === '-l' || arg === '--categories' || arg === '-c') continue;
    if (arg.startsWith('--effect=')) {
      effectArg = arg.split('=')[1];
    } else if (arg === '--effect' || arg === '-e') {
      effectArg = args[++i];
    } else if (arg.startsWith('--search=')) {
      searchArg = arg.split('=')[1];
    } else if (arg === '--search' || arg === '-s') {
      searchArg = args[++i];
    } else if (arg.startsWith('--category=')) {
      categoryArg = arg.split('=')[1];
    } else if (arg === '--category') {
      categoryArg = args[++i];
    } else if (arg.startsWith('--page=')) {
      pageArg = parseInt(arg.split('=')[1], 10) || 1;
    } else if (arg === '--page' || arg === '-p') {
      pageArg = parseInt(args[++i], 10) || 1;
    } else if (arg.startsWith('-e=')) {
      effectArg = arg.split('=')[1];
    } else if (arg.startsWith('-s=')) {
      searchArg = arg.split('=')[1];
    } else if (!arg.startsWith('--') && !arg.startsWith('-')) {
      texts.push(arg);
    }
  }

  try {
    // 1. Mode Daftar Semua Kategori
    if (showCategories) {
      if (!isJson) console.log(`\x1b[35m[Ephoto360 Categories]\x1b[0m Mengambil daftar 22+ kategori...`);
      const cats = await getCategories();
      if (isJson) {
        console.log(JSON.stringify({ status: 'success', total: cats.length, categories: cats }, null, 2));
      } else {
        console.log(`\n\x1b[32m=== DAFTAR 22+ KATEGORI EPHOTO360.COM ===\x1b[0m\n`);
        cats.forEach((c, i) => {
          console.log(`  ${String(i + 1).padStart(2, ' ')}. \x1b[1m${c.name}\x1b[0m (\x1b[33m${c.slug}\x1b[0m)`);
          console.log(`      URL: \x1b[34m${c.url}\x1b[0m`);
        });
        console.log(`\n\x1b[90mGunakan --category=<slug> untuk melihat efek di dalam kategori.\x1b[0m\n`);
      }
      return;
    }

    // 2. Mode Filter by Category
    if (categoryArg) {
      if (!isJson) console.log(`\x1b[35m[Ephoto360 Category]\x1b[0m Mengambil efek kategori: \x1b[1m"${categoryArg}"\x1b[0m (Hal: ${pageArg})...`);
      const catData = await getByCategory(categoryArg, pageArg);
      if (isJson) {
        console.log(JSON.stringify({ status: 'success', ...catData }, null, 2));
      } else {
        console.log(`\n\x1b[32m[✓] Kategori: ${catData.category} (${catData.total} efek ditemukan di Hal ${catData.page}):\x1b[0m\n`);
        catData.results.forEach((r, i) => {
          console.log(`  ${String(i + 1).padStart(2, ' ')}. \x1b[1m${r.title}\x1b[0m`);
          console.log(`      Slug: \x1b[33m${r.slug}\x1b[0m`);
          console.log(`      URL : \x1b[34m${r.url}\x1b[0m\n`);
        });
      }
      return;
    }

    // 3. Mode Browse All 720+ Effects
    if (listArg) {
      if (!isJson) console.log(`\x1b[35m[Ephoto360 Browse]\x1b[0m Mengambil daftar efek Halaman ${pageArg} dari 40...`);
      const listData = await listEffects(pageArg);
      if (isJson) {
        console.log(JSON.stringify({ status: 'success', ...listData }, null, 2));
      } else {
        console.log(`\n\x1b[32m=== DAFTAR EFEK EPHOTO360 (Halaman ${listData.page} / ${listData.total_pages}) ===\x1b[0m\n`);
        listData.results.forEach((r, i) => {
          console.log(`  ${String(i + 1).padStart(2, ' ')}. \x1b[1m${r.title}\x1b[0m`);
          console.log(`      Slug: \x1b[33m${r.slug}\x1b[0m`);
          console.log(`      URL : \x1b[34m${r.url}\x1b[0m\n`);
        });
        console.log(`\x1b[90mGunakan flag --page=${pageArg < 40 ? pageArg + 1 : 1} untuk halaman berikutnya (Total 40 halaman / 720 efek).\x1b[0m\n`);
      }
      return;
    }

    // 4. Mode Search
    if (searchArg) {
      if (!isJson) console.log(`\x1b[35m[Ephoto360 Search]\x1b[0m Mencari efek dengan keyword: \x1b[1m"${searchArg}"\x1b[0m...`);
      const results = await searchEffects(searchArg, pageArg);
      if (isJson) {
        console.log(JSON.stringify({ status: 'success', total: results.length, results }, null, 2));
      } else {
        console.log(`\n\x1b[32m[✓] Ditemukan ${results.length} efek Ephoto360:\x1b[0m\n`);
        results.forEach((r, i) => {
          console.log(`  ${i + 1}. \x1b[1m${r.title}\x1b[0m`);
          console.log(`     Slug / ID : \x1b[33m${r.slug}\x1b[0m`);
          console.log(`     URL       : \x1b[34m${r.url}\x1b[0m\n`);
        });
      }
      return;
    }

    // 5. Mode Generate Teks
    const inputTexts = texts.length > 0 ? texts : ['Omnify', 'Ephoto'];
    if (!isJson) {
      console.log(`\x1b[35m[Ephoto360 Generator]\x1b[0m Membuat teks 3D...`);
      console.log(`  Efek : \x1b[33m${effectArg}\x1b[0m`);
      console.log(`  Teks : \x1b[1m${inputTexts.join(' | ')}\x1b[0m\n`);
    }

    const res = await generate(effectArg, inputTexts);

    if (isJson) {
      console.log(JSON.stringify(res, null, 2));
    } else {
      console.log(`\x1b[32m[✓] Gambar Berhasil Dibuat dalam ${res.duration}!\x1b[0m`);
      console.log(`  Judul Efek : \x1b[1m${res.title}\x1b[0m`);
      console.log(`  Gambar HD  : \x1b[34m\x1b[4m${res.imageUrl}\x1b[0m\n`);
    }
  } catch (err) {
    if (isJson) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(`\n\x1b[31m[Error Ephoto360]\x1b[0m ${err.message}\n`);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  PRESET_EFFECTS,
  getCategories,
  getByCategory,
  searchEffects,
  listEffects,
  generate,
  ephoto360: generate,
};
