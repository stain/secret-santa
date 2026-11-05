// Cookies for remembered choices (language, currency).

export function readCookie(request: Request, name: string): string | undefined {
  return (request.headers.get("Cookie") ?? "")
    .split(";")
    .map((c) => c.trim().split("="))
    .find(([k]) => k === name)?.[1];
}

/**
 * GET /<kind>/<value>?back=<path>: remember the choice for a year and return
 * to the page it was made on. Only same-site paths are accepted for back.
 */
export function rememberChoice(url: URL, name: string, value: string | null): Response {
  const back = url.searchParams.get("back") ?? "/";
  const location = back.startsWith("/") && !back.startsWith("//") && !back.startsWith("/\\") ? back : "/";
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
