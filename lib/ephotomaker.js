"use strict";
const fs = require("fs");
const path = require("path");
const { ProxyAgent } = require("undici"); // Tambahan untuk Proxy di Node 18+

const BASE = "https://en.ephoto360.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

// --- INJEKSI PROXY WEBSHARE US ---
const proxyUrl = 'http://eqfdkbjn:p8ben4yhprde@31.56.127.193:7684';
const proxyAgent = new ProxyAgent(proxyUrl);
// ---------------------------------

const unescapeHtml = (s) => s.replace(/&quot;/g, '"').replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#039;|&apos;/g, "'");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function imageSize(buf) {
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf.length > 10 && buf[0] === 0x47 && buf[1] === 0x49) return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xc3) return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return { w: 0, h: 0 };
}

class CookieJar {
  constructor() { this.m = new Map(); }
  absorb(headers, url) {
    const host = new URL(url).hostname;
    const list = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
    if (!this.m.has(host)) this.m.set(host, new Map());
    const store = this.m.get(host);
    for (const c of list) {
      const pair = c.split(";")[0];
      const i = pair.indexOf("=");
      if (i > 0) store.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
    }
  }
  headerFor(url) {
    const host = new URL(url).hostname;
    const parts = [];
    for (const [h, store] of this.m) {
      if (host === h || host.endsWith("." + h)) for (const [k, v] of store) parts.push(`${k}=${v}`);
    }
    return parts.join("; ");
  }
}

class Ephoto360 {
  constructor() { this.jar = new CookieJar(); }

  async req(url, opts = {}) {
    const headers = Object.assign({ "User-Agent": UA }, opts.headers || {});
    const ck = this.jar.headerFor(url);
    if (ck) headers["Cookie"] = ck;
    
    // DISUNTIK PROXY DI SINI
    const res = await fetch(url, Object.assign({ dispatcher: proxyAgent }, opts, { headers }));
    this.jar.absorb(res.headers, res.url);
    return res;
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
    
    // Simplifikasi ekstraksi teks agar Vercel tidak pusing
    const texts = [{ id: "text", label: "", placeholder: "" }];
    
    return {
      url, 
      token: tok ? tok[1] : null,
      build_server: bs ? bs[1] : "https://e2.yotools.net",
      build_server_id: bsi ? bsi[1] : "1",
      texts, images: [], radios: {},
    };
  }

  async generate(effect, { texts = [], pollMax = 40, pollWait = 1500 } = {}) {
    const info = await this.effectInfo(effect);
    if (!info.token) return { success: false, info: "Gagal dapat token. Diblokir Cloudflare Ephoto." };

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
    if (!mv) return { success: false, info: "Form submit gagal (token kedaluwarsa?)." };
    
    const payload = JSON.parse(unescapeHtml(mv[1]));
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
        return {
          success: true,
          image_url: info.build_server + res.image,
          image_code: res.image_code, 
        };
      }
      await sleep(pollWait);
    }
    return { success: false, info: "Timeout saat generate" };
  }
}

module.exports = { Ephoto360 };
