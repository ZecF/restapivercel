/**
 * =======================================================
 *  Project   : Ephoto360 3D & Graphic Text Generator
 *  Desc      : Modified with Webshare US Proxy & URL-Encoded Fix for Vercel
 *  Base URL  : https://en.ephoto360.com
 * =======================================================
 */

'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const { HttpsProxyAgent } = require('https-proxy-agent');

// --- SETUP PROXY WEBSHARE US ---
const proxyUrl = 'http://eqfdkbjn:p8ben4yhprde@31.56.127.193:7684';
const proxyAgent = new HttpsProxyAgent(proxyUrl);
// -------------------------------

const BASE_URL = 'https://en.ephoto360.com';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': BASE_URL,
};

// Preset URL Efek-Efek Populer di Ephoto360
const PRESET_EFFECTS = {
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
  'water-3d': 'https://en.ephoto360.com/create-a-3d-water-pipe-text-effect-online-729.html',
  'metallic-3d': 'https://en.ephoto360.com/create-a-3d-metallic-text-effect-free-online-671.html',
  'luxury-gold': 'https://en.ephoto360.com/modern-gold-luxury-text-effect-online-754.html',
  'galaxy': 'https://en.ephoto360.com/create-galaxy-style-free-name-logo-438.html',
};

// Penggabung Cookie agar Session Ephoto tidak putus (Seperti di TextPro)
function parseCookies(cookieArray, existingCookies = '') {
  const cookieMap = new Map();
  if (existingCookies) {
    existingCookies.split('; ').forEach(c => {
      const [k, ...v] = c.split('=');
      cookieMap.set(k, v.join('='));
    });
  }
  if (cookieArray && Array.isArray(cookieArray)) {
    cookieArray.forEach(c => {
      const pair = c.split(';')[0];
      const [k, ...v] = pair.split('=');
      cookieMap.set(k, v.join('='));
    });
  }
  return Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

/**
 * Generate 3D Graphic Text Effect menggunakan Ephoto360
 */
async function generate(effectNameOrUrl, texts) {
  if (!effectNameOrUrl) throw new Error('Harap tentukan nama efek atau URL Ephoto360.');
  if (!texts || (Array.isArray(texts) && texts.length === 0)) {
    throw new Error('Harap masukkan teks yang ingin dibuat.');
  }

  let targetUrl = effectNameOrUrl;
  const lowerKey = effectNameOrUrl.toLowerCase().trim();
  if (PRESET_EFFECTS[lowerKey]) {
    targetUrl = PRESET_EFFECTS[lowerKey];
  }

  let currentCookies = '';
  const textArray = Array.isArray(texts) ? texts : [texts];

  try {
    // 1. GET Halaman Awal Menggunakan Proxy
    const pageRes = await axios.get(targetUrl, {
      headers: DEFAULT_HEADERS,
      httpsAgent: proxyAgent, // Menggunakan Webshare Proxy
      timeout: 30000,
    });

    currentCookies = parseCookies(pageRes.headers['set-cookie'], currentCookies);
    const $ = cheerio.load(pageRes.data);

    const title = $('h1.title, .title-effect, title').first().text().replace('Online', '').trim();
    const token = $('input[name="token"]').val();
    const buildServer = $('input[name="build_server"]').val() || BASE_URL;
    const buildServerId = $('input[name="build_server_id"]').val() || '1';

    if (!token) {
      throw new Error('Gagal mengekstrak form token Ephoto. Diblokir Cloudflare.');
    }

    // 2. POST form awal untuk meminta Signed Payload
    const params = new URLSearchParams();
    for (const t of textArray) {
      params.append('text[]', String(t).trim());
    }
    params.append('submit', 'Go');
    params.append('token', token);
    params.append('build_server', buildServer);
    params.append('build_server_id', buildServerId);

    const postRes = await axios.post(targetUrl, params.toString(), {
      headers: {
        ...DEFAULT_HEADERS,
        'Cookie': currentCookies,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': targetUrl,
      },
      httpsAgent: proxyAgent,
      timeout: 30000,
    });

    currentCookies = parseCookies(postRes.headers['set-cookie'], currentCookies);
    const $res = cheerio.load(postRes.data);
    let rawFormValue = $res('#form_value').first().text() || $res('#form_value').first().val() || $res('#form_value_input').val() || '';

    if (!rawFormValue) {
      const match = postRes.data.match(/<div[^>]*id="form_value"[^>]*>([\s\S]*?)<\/div>/i);
      if (match) rawFormValue = match[1];
    }

    const jsonMatch = rawFormValue ? rawFormValue.match(/\{[\s\S]*?\}/) : null;
    if (!jsonMatch) {
      throw new Error('Gagal mendapatkan signature payload Ephoto.');
    }

    const formValue = JSON.parse(jsonMatch[0]);

    // KONVERSI OBJECT JSON KE URL-ENCODED (Ini krusial untuk mencegah error Ephoto)
    const bodyParams = new URLSearchParams();
    for (const [key, value] of Object.entries(formValue)) {
      if (Array.isArray(value)) {
        value.forEach(v => bodyParams.append(`${key}[]`, v));
      } else {
        bodyParams.append(key, value);
      }
    }

    // 3. POST Endpoint Pembuatan Gambar Menggunakan Proxy
    const createRes = await axios.post(`${BASE_URL}/effect/create-image`, bodyParams.toString(), {
      headers: {
        ...DEFAULT_HEADERS,
        'Cookie': currentCookies,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Referer': targetUrl,
        'X-Requested-With': 'XMLHttpRequest',
      },
      httpsAgent: proxyAgent,
      timeout: 35000,
    });

    const resData = createRes.data;
    if (!resData || !resData.success) {
      throw new Error(resData?.info || resData?.message || 'Gagal memproses gambar pada server Ephoto360.');
    }

    const imagePath = resData.fullsize_image || resData.image;
    const serverPrefix = formValue.build_server || BASE_URL;
    const fullImageUrl = imagePath.startsWith('http') ? imagePath : `${serverPrefix}${imagePath}`;

    return {
      status: true,
      title: title || 'Ephoto360 Effect',
      imageUrl: fullImageUrl,
    };

  } catch (err) {
    return {
      status: false,
      message: err.message
    };
  }
}

// Export dengan nama ephotoMaker agar cocok dengan pemanggilan di api/ephoto.js
module.exports = { 
  ephotoMaker: generate,
  ephoto360: generate 
};
