// Build step: renders the pages that need no server (the front page and the
// privacy notice, in each language) and copies public/ next to them, giving
// the static site nginx serves directly in production:
//   dist/www/robots.txt, dist/www/static/…, dist/www/<lang>/index.html, …/privacy.html,
//   …/unavailable.html (shown by nginx when the app is down)
// nginx picks the language from the `lang` cookie or the browser's preferences.

import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DICTS, type Ctx, type Lang } from "./i18n";
import { homePage, unavailablePage } from "./index";
import { DEFAULT_CURRENCY } from "./money";
import { privacyPage } from "./privacy";

const OUT = "dist/www";

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync("public", OUT, { recursive: true });

const pages: [string, string, (ctx: Ctx) => Response][] = [
  ["/", "index.html", homePage],
  ["/privacy", "privacy.html", privacyPage],
  ["/", "unavailable.html", unavailablePage], // nginx's page for 502/504; language links return to /
];

for (const lang of Object.keys(DICTS) as Lang[]) {
  mkdirSync(join(OUT, lang), { recursive: true });
  for (const [path, file, render] of pages) {
    const ctx: Ctx = {
      lang,
      t: DICTS[lang],
      url: new URL(path, "https://static.invalid"),
      currency: DEFAULT_CURRENCY[lang],
      static: true,
    };
    writeFileSync(join(OUT, lang, file), await render(ctx).text());
  }
}
console.log(`Static site written to ${OUT}`);
