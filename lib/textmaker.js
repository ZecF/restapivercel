'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const { HttpsProxyAgent } = require('https-proxy-agent');

// Proxy Webshare US milikmu
const proxyUrl = 'http://eqfdkbjn:p8ben4yhprde@31.56.127.193:7684';
const proxyAgent = new HttpsProxyAgent(proxyUrl);

const BASE_URL = 'https://textpro.me';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
  'Origin': BASE_URL,
};

const PRESET_EFFECTS = {
  'neon': 'https://textpro.me/neon-light-text-effect-online-882.html',
  'pornhub': 'https://textpro.me/pornhub-style-logo-online-generator-free-977.html',
  'marvel': 'https://textpro.me/create-logo-style-marvel-studios-online-971.html',
  'naruto': 'https://textpro.me/create-naruto-logo-style-text-effect-online-1125.html',
  'glitch': 'https://textpro.me/create-text-glitch-effect-style-tik-tok-983.html'
  // (Kamu bisa tambahkan preset lainnya di sini)
};

function parseCookies(cookieArray, existingCookies = '') {
  const cookieMap = new Map();
  if (existingCookies) existingCookies.split('; ').forEach(c => { const [k, ...v] = c.split('='); cookieMap.set(k, v.join('=')); });
  if (cookieArray) cookieArray.forEach(c => { const [k, ...v] = c.split(';')[0].split('='); cookieMap.set(k, v.join('=')); });
  return Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function generate(effectNameOrUrl, texts) {
  let targetUrl = PRESET_EFFECTS[effectNameOrUrl.toLowerCase().trim()] || effectNameOrUrl;
  let currentCookies = '';
  const textArray = Array.isArray(texts) ? texts : [texts];

  try {
    const pageRes = await axios.get(targetUrl, { headers: DEFAULT_HEADERS, httpsAgent: proxyAgent, timeout: 30000 });
    currentCookies = parseCookies(pageRes.headers['set-cookie'], currentCookies);
    const $ = cheerio.load(pageRes.data);
    const token = $('input[name="token"]').val();
    
    if (!token) throw new Error('Gagal mengekstrak form token. Diblokir Cloudflare.');

    const params = new URLSearchParams();
    textArray.forEach(t => params.append('text[]', String(t).trim()));
    params.append('submit', 'Go');
    params.append('token', token);
    params.append('build_server', $('input[name="build_server"]').val() || BASE_URL);
    params.append('build_server_id', $('input[name="build_server_id"]').val() || '1');

    const postRes = await axios.post(targetUrl, params.toString(), {
      headers: { ...DEFAULT_HEADERS, 'Cookie': currentCookies, 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': targetUrl },
      httpsAgent: proxyAgent, timeout: 30000
    });

    currentCookies = parseCookies(postRes.headers['set-cookie'], currentCookies);
    const $res = cheerio.load(postRes.data);
    let rawFormValue = $res('#form_value').text() || $res('#form_value').val() || $res('#form_value_input').val() || '';
    if (!rawFormValue) rawFormValue = (postRes.data.match(/<div[^>]*id="form_value"[^>]*>([\s\S]*?)<\/div>/i) || [])[1];

    const jsonMatch = rawFormValue ? rawFormValue.match(/\{[\s\S]*?\}/) : null;
    if (!jsonMatch) throw new Error('Gagal mendapatkan signature payload.');

    const formValue = JSON.parse(jsonMatch[0]);
    const bodyParams = new URLSearchParams();
    Object.entries(formValue).forEach(([k, v]) => Array.isArray(v) ? v.forEach(i => bodyParams.append(`${k}[]`, i)) : bodyParams.append(k, v));

    const createRes = await axios.post(`${BASE_URL}/effect/create-image`, bodyParams.toString(), {
      headers: { ...DEFAULT_HEADERS, 'Cookie': currentCookies, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'Referer': targetUrl, 'X-Requested-With': 'XMLHttpRequest' },
      httpsAgent: proxyAgent, timeout: 35000
    });

    if (!createRes.data || !createRes.data.success) throw new Error('Gagal memproses gambar pada server TextPro.');

    const imagePath = createRes.data.fullsize_image || createRes.data.image;
    return { status: true, imageUrl: imagePath.startsWith('http') ? imagePath : `${formValue.build_server || BASE_URL}${imagePath}` };

  } catch (err) {
    return { status: false, message: err.message };
  }
}

module.exports = { textMaker: generate };
        
