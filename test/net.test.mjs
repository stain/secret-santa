// Unit tests for the outgoing-request guard (src/net.ts). No server needed;
// the DNS-based cases need network access.

import assert from "node:assert/strict";
import { test } from "node:test";
import { isPublicAddress, publicFetch } from "../src/net.ts";

test("private, loopback, link-local and reserved addresses are not public", () => {
  for (const a of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0",
    "::1", "::", "fe80::1", "fd00::1", "::ffff:127.0.0.1", "::ffff:169.254.169.254"]) {
    assert.equal(isPublicAddress(a), false, a);
  }
  for (const a of ["8.8.8.8", "1.1.1.1", "2a00:1450:4001::64", "::ffff:8.8.8.8"]) assert.equal(isPublicAddress(a), true, a);
});

test("names resolving to internal addresses are refused before connecting (needs network)", async () => {
  for (const url of ["http://127.0.0.1.nip.io/", "http://169.254.169.254.nip.io/latest/meta-data/", "http://10.0.0.1.nip.io/"]) {
    await assert.rejects(publicFetch(new URL(url)), (e) => /non-public address/.test(String(e?.cause?.message ?? e?.message)), url);
  }
});

test("non-standard ports and IP literals are refused", async () => {
  await assert.rejects(publicFetch(new URL("https://example.org:8443/")), /standard web ports/);
  await assert.rejects(publicFetch(new URL("http://8.8.8.8/")), /IP addresses/);
});
