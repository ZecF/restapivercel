/**
 * =======================================================
 *  Project   : Ephoto360 Vercel Edition
 *  Engine    : Pochi's Logic + Axios 1.19.0 + Webshare US Proxy
 * =======================================================
 */
"use strict";

const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

const BASE = "https://en.ephoto360.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";

// --- PROXY WEBSHARE US (Terbukti di Textpro) ---
const proxyUrl = 'http://eqfdkbjn:p8ben4yhprde@31.56.127.193:7684';
const proxyAgent = new HttpsProxyAgent(proxyUrl);
// -----------------------------------------------

const unescapeHtml = (s) => s.replace(/&quot;/g, '"').replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#039;|&apos;/g, "'");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Modifikasi CookieJar Pochi agar cocok dengan header 'set-cookie' milik Axios
class CookieJar {
  constructor() { this.m = new Map(); }
  
  absorb(cookieArray, url) {
    if (!cookieArray || !Array.isArray(cookieArray)) return;
    try {
      const host = new URL(url).hostname;
      if (!this.m.has(host)) this.m.set(host, new Map());
      const store = this.m.get(host);
      for (const c of cookieArray) {
        const pair = c.split(";")[0];
        const i = pair.indexOf("=");
        if (i > 0) store.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
      }
    } catch (e) {
      console.error("Gagal parsing cookie:", e);
    }
  }
  
  headerFor(url) {
    try {
      const host = new URL(url).hostname;
      const parts = [];
      for (const [h, store] of this.m) {
        if (host === h || host.endsWith("." + h)) {
          for (const [k, v] of store) parts.push(`${k}=${v}`);
        }
      }
      return parts.join("; ");
    } catch (e) {
      return "";
    }
  }
}

class Ephoto360 {
  constructor() { this.jar = new CookieJar(); }

  // Custom Requester pakai Axios menggantikan Fetch
  async req(url, opts = {}) {
    const headers = Object.assign({ 
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
    }, opts.headers || {});
    
    const ck = this.jar.headerFor(url);
    if (ck) headers["Cookie"] = ck;

    try {
      const res = await axios({
        url: url,
        method: opts.method || 'GET',
        data: opts.body || null,
        headers: headers,
        httpsAgent: proxyAgent,
        proxy: false, // Wajib false agar httpsAgent bekerja
        validateStatus: () => true, // Jangan throw error walau 403
        timeout: 30000 // Timeout 30 detik
      });

      // Simpan cookie dari response
      if (res.headers['set-cookie']) {
        this.jar.absorb(res.headers['set-cookie'], url);
      }

      // Format response agar mirip dengan output fetch() Pochi
      return {
        status: res.status,
        ok: res.status >= 200 && res.status < 400,
        text: async () => typeof res.data === 'object' ? JSON.stringify(res.data) : String(res.data),
        json: async () => typeof res.data === 'string' ? JSON.parse(res.data) : res.data,
        url: url
      };
    } catch (error) {
      throw error;
    }
  }

  postForm(url, pairs, extra = {}) {
    return this.req(url, {
      method: "POST",
      body: new URLSearchParams(pairs).toString(),
      headers: Object.assign({ "Content-Type": "application/x-www-form-urlencoded" }, extra),
    });
  }

  async effectInfo(effect) {
    const url = effect.startsWith("http") ? effect : BASE + effect;
    const r = await this.req(url);
    const html = await r.text();
    const fm = /<form[^>]*class="ajax-submit"[^>]*>([\s\S]*?)<\/form>/.exec(html);
    const form = fm ? fm[1] : "";
    
    const tok = /name="token" value="([^"]+)"/.exec(form);
    const bs  = /name="build_server" value="([^"]+)"/.exec(form);
    const bsi = /name="build_server_id" value="([^"]+)"/.exec(form);
    
    const texts = [{ id: "text", label: "", placeholder: "" }];
    
    return {
      url, 
      token: tok ? tok[1] : null,
      build_server: bs ? bs[1] : BASE,
      build_server_id: bsi ? bsi[1] : "1",
      texts, images: [], radios: {},
    };
  }

  async generate(effect, { texts = [], pollMax = 40, pollWait = 1500 } = {}) {
    const info = await this.effectInfo(effect);
    if (!info.token) return { success: false, info: "Gagal ekstrak Token Ephoto. Terdeteksi Cloudflare." };

    const form = [
      ["submit", "GO"], 
      ["token", info.token],
      ["build_server", info.build_server],
      ["build_server_id", info.build_server_id]
    ];
    for (const t of texts) form.push(["text[]", t]);

    const r = await this.postForm(info.url, form, { Referer: info.url });
    const html = await r.text();
    const mv = /name="form_value_input" value="([^"]+)"/.exec(html);
    if (!mv) return { success: false, info: "Form submit gagal (token kedaluwarsa atau IP diblokir)." };
    
    const payload = JSON.parse(unescapeHtml(mv[1]));
    
    // Polling ke create-image
    const poll = [];
    for (const [k, v] of Object.entries(payload)) {
      if (Array.isArray(v)) for (const item of v) poll.push([k + "[]", item]);
      else poll.push([k, v]);
    }

    for (let a = 0; a < pollMax; a++) {
      const pr = await this.postForm(BASE + "/effect/create-image", poll, {
        "X-Requested-With": "XMLHttpRequest", Referer: info.url 
      });
      const res = await pr.json();
      
      if (res.success) {
        let finalImage = res.image;
        if (!finalImage.startsWith('http')) {
            finalImage = info.build_server + finalImage;
        }
        return {
          success: true,
          image_url: finalImage,
          image_code: res.image_code, 
        };
      }
      await sleep(pollWait); // Tunggu sebelum cek lagi
    }
    return { success: false, info: "Timeout saat generate gambar." };
  }
}

module.exports = { Ephoto360 };
