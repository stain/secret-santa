// Outgoing requests to addresses that participants choose (product links and
// photos) go through `publicFetch`: it refuses to connect to private,
// loopback, link-local (including the cloud metadata service at
// 169.254.169.254) and other reserved addresses. The check runs on the
// addresses DNS returns at connection time, so names that resolve to a
// private address (127.0.0.1.nip.io) or change between checks can't get round it.

import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { BlockList, isIP } from "node:net";
import { Agent, fetch as undiciFetch } from "undici";

const blocked = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(net, prefix, "ipv4");
// No ::ffff:0:0/96 rule here: BlockList would also apply it to plain IPv4
// addresses and block all of them. IPv4-mapped addresses are unwrapped below.
for (const [net, prefix] of [
  ["::", 128], ["::1", 128], ["64:ff9b::", 96], ["100::", 64], ["2001:db8::", 32],
  ["fc00::", 7], ["fe80::", 10], ["ff00::", 8],
] as const) blocked.addSubnet(net, prefix, "ipv6");

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) return false;
  if (family === 6 && address.toLowerCase().startsWith("::ffff:")) {
    return isPublicAddress(address.slice(7)); // IPv4-mapped IPv6
  }
  return !blocked.check(address, family === 4 ? "ipv4" : "ipv6");
}

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

function publicLookup(hostname: string, options: object, callback: LookupCallback): void {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, []);
    const list = addresses as LookupAddress[];
    if (list.length === 0 || !list.every((a) => isPublicAddress(a.address))) {
      const refused: NodeJS.ErrnoException = new Error(`Refusing to connect to a non-public address for ${hostname}`);
      refused.code = "ENOTFOUND";
      return callback(refused, []);
    }
    if ((options as { all?: boolean }).all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
}

const agent = new Agent({ connect: { lookup: publicLookup as never }, connections: 8 });

/** fetch for user-supplied URLs: public addresses and the standard web ports only. */
export async function publicFetch(url: URL, init: Parameters<typeof undiciFetch>[1] = {}): Promise<Response> {
  if (url.port !== "" && url.port !== "80" && url.port !== "443") throw new Error("Only standard web ports");
  if (isIP(url.hostname.replace(/^\[|\]$/g, "")) !== 0) throw new Error("IP addresses are not fetched");
  const res = await undiciFetch(url, { ...init, dispatcher: agent });
  return res as unknown as Response;
}
