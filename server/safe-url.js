// safe-url.js — SSRF guard for tenant-supplied delivery URLs.
//
// A tenant types their own webhook endpoint into the portal. Without this, that
// field is a request forgery primitive pointed at our own infrastructure.
// Ported from the dchub api-server's outbound webhook guard and tightened:
// HTTPS only, no credentials in the URL, and no private/link-local/loopback
// destinations, including via IPv4-mapped IPv6 and decimal-encoded literals.

const PRIVATE_V4 = [
  [0, 0, 0, 0, 8],          // 0.0.0.0/8      "this network"
  [10, 0, 0, 0, 8],         // 10.0.0.0/8     private
  [100, 64, 0, 0, 10],      // 100.64.0.0/10  carrier-grade NAT
  [127, 0, 0, 0, 8],        // 127.0.0.0/8    loopback
  [169, 254, 0, 0, 16],     // 169.254.0.0/16 link-local (cloud metadata)
  [172, 16, 0, 0, 12],      // 172.16.0.0/12  private
  [192, 0, 0, 0, 24],       // 192.0.0.0/24   IETF protocol assignments
  [192, 168, 0, 0, 16],     // 192.168.0.0/16 private
  [198, 18, 0, 0, 15],      // 198.18.0.0/15  benchmarking
  [224, 0, 0, 0, 4],        // 224.0.0.0/4    multicast
  [240, 0, 0, 0, 4],        // 240.0.0.0/4    reserved
];

/** Allow http:// for these hosts only, and only when explicitly opted in. */
const DEV_HOSTS = new Set(['localhost', '127.0.0.1']);

export function isSafeDeliveryUrl(raw, { allowLocalhost = false } = {}) {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2048) return false;

  let url;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }

  if (url.username || url.password) return false;

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (allowLocalhost && DEV_HOSTS.has(host)) return url.protocol === 'http:' || url.protocol === 'https:';
  if (url.protocol !== 'https:') return false;
  if (DEV_HOSTS.has(host) || host === '::1' || host.endsWith('.localhost')) return false;
  if (host.endsWith('.internal') || host.endsWith('.local')) return false;

  const v4 = parseIpv4(host) ?? parseMappedV6(host);
  if (v4) return !isPrivateV4(v4);

  // A bare IPv6 literal that is not a mapped v4: refuse rather than guess.
  if (host.includes(':')) return false;

  // A hostname. DNS can still resolve to a private address — the dispatcher
  // pins that with a post-resolution check; this is the cheap first gate.
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(host);
}

/** Accepts dotted-quad only. Decimal/octal/hex forms are refused by returning null. */
function parseIpv4(host) {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return /^\d+$/.test(host) ? [0, 0, 0, 0] : null; // bare decimal → treat as 0.0.0.0/8, refused
  const parts = m.slice(1).map(Number);
  return parts.every((n) => n <= 255) ? parts : null;
}

function parseMappedV6(host) {
  const m = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i.exec(host);
  return m ? parseIpv4(m[1]) : null;
}

function isPrivateV4(parts) {
  const ip = ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
  return PRIVATE_V4.some(([a, b, c, d, bits]) => {
    const base = ((a << 24) >>> 0) + (b << 16) + (c << 8) + d;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (ip & mask) === (base & mask);
  });
}
