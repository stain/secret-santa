// Currencies, exchange rates and price formatting.

import type { Database } from "./sqlite";
import { backParam, readCookie, rememberChoice } from "./cookies";
import { html, type Html } from "./html";
import { LOCALES, type Ctx, type Lang } from "./i18n";

/** Currencies people can view prices in and set a budget in. */
export const CURRENCIES = ["GBP", "NOK", "MXN"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: Record<Lang, Currency> = { en: "GBP", es: "MXN", nb: "NOK" };

/** Converted amounts are rounded to at least these steps: £1, 10 kr, MX$10. */
const ROUNDING: Record<Currency, number> = { GBP: 1, NOK: 10, MXN: 10 };
const SYMBOLS: Record<Currency, string> = { GBP: "£", NOK: "kr", MXN: "$" };

const RATES_API = "https://api.frankfurter.dev/v1/latest"; // ECB reference rates, base EUR
const RATES_MAX_AGE_MS = 24 * 60 * 60 * 1000;
// Used only if the rates have never been fetched (approximate, November 2026).
const FALLBACK_RATES: Record<string, number> = { EUR: 1, GBP: 0.83, NOK: 10.4, MXN: 20.9 };

/** Units of each currency per euro. */
export type Rates = Map<string, number>;

const COOKIE = "cur";

export function isCurrency(code: string | undefined): code is Currency {
  return (CURRENCIES as readonly string[]).includes(code ?? "");
}

export function currencyFromCookie(request: Request): Currency | undefined {
  const code = readCookie(request, COOKIE);
  return isCurrency(code) ? code : undefined;
}

/** GET /cur/<code>?back=<path>: see rememberChoice. */
export function switchCurrency(url: URL, code: string): Response {
  return rememberChoice(url, COOKIE, isCurrency(code) ? code : null);
}

/** Today's rates from D1, refreshed from the ECB once a day; stale rates beat none. */
export async function getRates(db: Database): Promise<Rates> {
  const { results } = await db
    .prepare("SELECT currency, per_eur, fetched_at FROM rates")
    .all<{ currency: string; per_eur: number; fetched_at: string }>();
  const stored: Rates = new Map(results.map((r) => [r.currency, r.per_eur]));
  // One fetch updates every row, so the newest row says when we last fetched.
  // (Checking every row would refetch on each request if the API ever
  // stopped listing a currency we have stored.)
  const lastFetched = Math.max(0, ...results.map((r) => Date.parse(r.fetched_at) || 0));
  if (Date.now() - lastFetched < RATES_MAX_AGE_MS && CURRENCIES.every((c) => stored.has(c))) return stored;

  try {
    const res = await fetch(RATES_API, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`rates: HTTP ${res.status}`);
    const data = (await res.json()) as { rates?: Record<string, unknown> };
    const rates: Rates = new Map([["EUR", 1]]);
    for (const [code, perEur] of Object.entries(data.rates ?? {})) {
      if (/^[A-Z]{3}$/.test(code) && typeof perEur === "number" && Number.isFinite(perEur) && perEur > 0) {
        rates.set(code, perEur);
      }
    }
    if (!CURRENCIES.every((c) => rates.has(c))) throw new Error("rates: a currency is missing");
    const now = new Date().toISOString();
    await db.batch(
      [...rates].map(([currency, perEur]) =>
        db
          .prepare(
            `INSERT INTO rates (currency, per_eur, fetched_at) VALUES (?, ?, ?)
             ON CONFLICT (currency) DO UPDATE SET per_eur = excluded.per_eur, fetched_at = excluded.fetched_at`,
          )
          .bind(currency, perEur, now),
      ),
    );
    return rates;
  } catch {
    return stored.size ? stored : new Map(Object.entries(FALLBACK_RATES));
  }
}

export function convert(amount: number, from: string, to: string, rates: Rates): number | null {
  if (from === to) return amount;
  const a = rates.get(from);
  const b = rates.get(to);
  return a && b ? (amount / a) * b : null;
}

/**
 * Rounds a converted amount so it doesn't look more exact than it is: to the
 * largest step of 1, 2 or 5 times a power of ten that is at most a fifth of
 * the amount (so within about 10%), but no finer than ROUNDING. 1000 kr
 * becomes £80 and MX$2,000, not £79 and MX$1,980; £25 becomes 300 kr;
 * £4.99 still becomes 60 kr.
 */
function roundFor(amount: number, currency: Currency): number {
  const fifth = amount / 5;
  const power = 10 ** Math.floor(Math.log10(fifth));
  const nice = [5, 2, 1].map((m) => m * power).find((s) => s <= fifth) ?? power;
  const step = Math.max(ROUNDING[currency], nice);
  return Math.max(step, Math.round(amount / step) * step);
}

export function formatMoney(lang: Lang, amount: number, currency: string, rounded = false): string {
  const whole = rounded || Number.isInteger(amount);
  try {
    return new Intl.NumberFormat(LOCALES[lang], {
      style: "currency",
      currency,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(whole ? 0 : 2)} ${currency}`;
  }
}

/** "≈ 120 kr": an amount converted to `to` and rounded, or "" if no rate is known. */
export function approx(ctx: Ctx, rates: Rates, amount: number, from: string, to: Currency): string {
  if (from === to) return "";
  const converted = convert(amount, from, to, rates);
  return converted === null ? "" : `≈ ${formatMoney(ctx.lang, roundFor(converted, to), to, true)}`;
}

/** A price as found, plus its rounded value in the viewer's currency: "£4.99 (≈ 70 kr)". */
export function priceText(ctx: Ctx, rates: Rates, price: number, currency: string): string {
  const exact = formatMoney(ctx.lang, price, currency);
  const converted = approx(ctx, rates, price, currency, ctx.currency);
  return converted ? `${exact} (${converted})` : exact;
}

/** The budget in its own currency, then rounded in the other two: "£25 (≈ 300 kr ≈ MX$600)". */
export function budgetText(ctx: Ctx, rates: Rates, limit: number, currency: Currency): string {
  const others = CURRENCIES.filter((c) => c !== currency)
    .map((c) => approx(ctx, rates, limit, currency, c))
    .filter(Boolean);
  const main = formatMoney(ctx.lang, limit, currency);
  return others.length ? `${main} (${others.join(" ")})` : main;
}

/** Currency links for the page header, each returning to the current page. */
export function currencySwitcher(ctx: Ctx): Html {
  const back = backParam(ctx.url);
  return html`<nav class="lang currency" aria-label="${ctx.t.currency}">${CURRENCIES.map(
    (c) =>
      html`<a href="/cur/${c}?back=${back}" title="${c}"${c === ctx.currency && html` aria-current="true"`}>${SYMBOLS[c]} ${c}</a>`,
  )}</nav>`;
}
