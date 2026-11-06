// Family-friendly check for wish links: asks Cloudflare's "1.1.1.1 for
// Families" resolver, which answers 0.0.0.0 (with extended DNS error 17,
// "Filtered") for domains it classes as adult content or malware.
// It judges whole sites only: an unsuitable product on a general shop gets
// through, which is why the admin can also clear a participant's wishes.

const RESOLVER = "https://family.cloudflare-dns.com/dns-query";
const CACHE_MS = 60 * 60 * 1000;
const verdicts = new Map<string, { allowed: boolean; at: number }>();

interface DnsJson {
  Status: number;
  Answer?: { type: number; data: string }[];
  Comment?: string | string[];
}

/**
 * Whether the family resolver lets this host through. If the resolver can't
 * be reached the answer is "allowed", so an outage doesn't block every wish.
 */
export async function isFamilyFriendly(hostname: string): Promise<boolean> {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  const cached = verdicts.get(host);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.allowed;
  try {
    const res = await fetch(`${RESOLVER}?name=${encodeURIComponent(host)}&type=A`, {
      headers: { Accept: "application/dns-json" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return true;
    const dns = (await res.json()) as DnsJson;
    const comment = [dns.Comment ?? []].flat().join(" ");
    const filtered = /Filtered/i.test(comment) || (dns.Answer ?? []).some((a) => a.type === 1 && a.data === "0.0.0.0");
    verdicts.set(host, { allowed: !filtered, at: Date.now() });
    return !filtered;
  } catch {
    return true;
  }
}
