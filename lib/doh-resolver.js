/**
 * ================================
 *  Project   : Omnify Core — DNS over HTTPS (DoH) & Anti-ISP Poisoning Resolver
 *  Category  : Native
 *  Desc      : Resolves genuine Anycast IPs (Cloudflare, R2, AWS, etc.) without ISP DNS hijacking / Internet Positif blocks.
 *  Channel   : https://whatsapp.com/channel/0029VbD95WTBlHpf7WV82D0M
 *  Author    : OmnifyLabs
 * ================================
 */

/**
 * Omnify Core — DNS over HTTPS (DoH) & Anti-ISP Poisoning Resolver
 * Resolves genuine Anycast IPs (Cloudflare, R2, AWS, etc.) without ISP DNS hijacking / Internet Positif blocks.
 */

const https = require("https");
const dns = require("dns");

const dnsCache = new Map();

// Known static Anycast IP fallbacks for critical infrastructure
const KNOWN_STATIC_IPS = {
  "r2.dev": ["104.18.50.34", "104.18.54.45", "172.64.149.246"],
  "cloudflare.com": ["104.16.132.229", "104.16.133.229"],
  "imagefree.org": ["104.21.78.196", "172.67.198.157"],
};

/**
 * Resolve hostname via Cloudflare 1.1.1.1 DoH (DNS over HTTPS)
 * @param {string} hostname
 * @returns {Promise<string[]>} List of IPv4 addresses
 */
function resolveDoH(hostname) {
  return new Promise((resolve) => {
    // Check in-memory cache first
    const cached = dnsCache.get(hostname);
    if (cached && Date.now() - cached.timestamp < 300000) {
      return resolve(cached.ips);
    }

    // Check domain pattern for instant Anycast IP
    for (const [domain, ips] of Object.entries(KNOWN_STATIC_IPS)) {
      if (hostname.endsWith(domain) || hostname === domain) {
        dnsCache.set(hostname, { ips, timestamp: Date.now() });
        return resolve(ips);
      }
    }

    const req = https.get(
      `https://1.1.1.1/dns-query?name=${encodeURIComponent(hostname)}&type=A`,
      {
        headers: { accept: "application/dns-json" },
        rejectUnauthorized: false,
        timeout: 4000,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const data = JSON.parse(body);
            if (data.Answer && Array.isArray(data.Answer)) {
              const aRecords = data.Answer.filter((ans) => ans.type === 1).map(
                (ans) => ans.data,
              );
              if (aRecords.length > 0) {
                dnsCache.set(hostname, {
                  ips: aRecords,
                  timestamp: Date.now(),
                });
                return resolve(aRecords);
              }
            }
          } catch (_) {}
          resolve([]);
        });
      },
    );

    req.on("error", () => resolve([]));
    req.on("timeout", () => {
      req.destroy();
      resolve([]);
    });
  });
}

/**
 * Custom DNS lookup handler compatible with Node.js http/https Agent
 * @param {string} hostname
 * @param {Object|Function} options
 * @param {Function} callback
 */
function secureLookup(hostname, options, callback) {
  let cb = callback;
  let opts = options;
  if (typeof options === "function") {
    cb = options;
    opts = {};
  }

  // If matches critical known domains or blocked services, resolve directly via DoH / static Anycast
  for (const [domain, ips] of Object.entries(KNOWN_STATIC_IPS)) {
    if (hostname.endsWith(domain) || hostname === domain) {
      const selectedIp = ips[Math.floor(Math.random() * ips.length)];
      if (opts && opts.all) {
        return cb(null, [{ address: selectedIp, family: 4 }]);
      }
      return cb(null, selectedIp, 4);
    }
  }

  // Fallback to system dns.lookup
  dns.lookup(hostname, opts, (err, address, family) => {
    // If ISP DNS poisoned IP detected (Internet Positif / Telkom range: 36.86.x, 118.97.x, 180.250.x)
    const ipStr = Array.isArray(address) ? address[0]?.address : address;
    const isPoisoned =
      ipStr &&
      (ipStr.startsWith("36.86.") ||
        ipStr.startsWith("118.97.") ||
        ipStr.startsWith("180.250.") ||
        ipStr.startsWith("10.10."));

    if (err || isPoisoned) {
      resolveDoH(hostname).then((dohIps) => {
        if (dohIps.length > 0) {
          const dohIp = dohIps[Math.floor(Math.random() * dohIps.length)];
          if (opts && opts.all) {
            return cb(null, [{ address: dohIp, family: 4 }]);
          }
          return cb(null, dohIp, 4);
        }
        cb(
          err || new Error(`DNS resolution failed for ${hostname}`),
          address,
          family,
        );
      });
      return;
    }

    cb(null, address, family);
  });
}

/**
 * Create an HTTPS Agent with DoH resolution & Anti-ISP Poisoning
 * @param {Object} [options]
 * @returns {https.Agent}
 */
function createSecureHttpsAgent(options = {}) {
  return new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
    lookup: secureLookup,
    ...options,
  });
}

module.exports = {
  secureLookup,
  resolveDoH,
  createSecureHttpsAgent,
  secureHttpsAgent: createSecureHttpsAgent(),
};
        
