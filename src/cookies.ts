// Cookies for remembered choices (language, currency).

export function readCookie(request: Request, name: string): string | undefined {
  return (request.headers.get("Cookie") ?? "")
    .split(";")
    .map((c) => c.trim().split("="))
    .find(([k]) => k === name)?.[1];
}

/**
 * GET /<kind>/<value>?back=<path>: remember the choice for a year and return
 * to the page it was made on. `back` is resolved the way a browser would
 * (which drops tabs and newlines, so "/\t/evil.example" means
 * "//evil.example") and must stay on this site.
 */
export function rememberChoice(url: URL, name: string, value: string | null): Response {
  let location = "/";
  try {
    const back = new URL(url.searchParams.get("back") ?? "/", url.origin);
    if (back.origin === url.origin) location = back.pathname + back.search;
  } catch {
    // Not a URL at all: go to the home page.
  }
  const headers = new Headers({ Location: location });
  if (value !== null) {
    const secure = url.protocol === "https:" ? "; Secure" : "";
    headers.set("Set-Cookie", `${name}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`);
  }
  return new Response(null, { status: 303, headers });
}

/** The current page, for a choice link to return to. */
export function backParam(url: URL): string {
  return encodeURIComponent(url.pathname + url.search);
}
