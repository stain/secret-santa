// A streaming HTML scanner with a small CSS selector subset, standing in for
// Cloudflare's HTMLRewriter in the product lookup (preview.ts). Supported
// selectors: tag, #id, .class, [attr="value"], [attr*="value"], combined
// (e.g. img#landingImage), descendant (".a-price .a-offscreen") and lists
// ("a, b"). Text handlers receive all text inside a matching element.
// Like HTMLRewriter, attribute values and text are passed on undecoded.

import { Parser } from "htmlparser2";

export interface ScannedElement {
  getAttribute(name: string): string | null;
}

interface Handlers {
  element?: (el: ScannedElement) => void;
  text?: (chunk: { text: string }) => void;
}

interface Simple {
  tag?: string;
  id?: string;
  classes: string[];
  attrs: { name: string; op: "=" | "*="; value: string }[];
}

type Selector = Simple[]; // descendant chain, outermost first

interface Open {
  tag: string;
  attrs: Record<string, string>;
  texts: Handlers["text"][];
}

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

function parseSimple(part: string): Simple {
  const simple: Simple = { classes: [], attrs: [] };
  const re = /([a-zA-Z][\w-]*)|#([\w-]+)|\.([\w-]+)|\[([\w-]+)(\*?=)"([^"]*)"\]/g;
  for (const m of part.matchAll(re)) {
    if (m[1]) simple.tag = m[1].toLowerCase();
    else if (m[2]) simple.id = m[2];
    else if (m[3]) simple.classes.push(m[3]);
    else simple.attrs.push({ name: m[4].toLowerCase(), op: m[5] as "=" | "*=", value: m[6] });
  }
  return simple;
}

function parseSelectors(selector: string): Selector[] {
  return selector.split(",").map((s) => s.trim().split(/\s+/).map(parseSimple));
}

function matchesSimple(s: Simple, el: { tag: string; attrs: Record<string, string> }): boolean {
  if (s.tag && s.tag !== el.tag) return false;
  if (s.id && el.attrs.id !== s.id) return false;
  const classes = (el.attrs.class ?? "").split(/\s+/);
  if (!s.classes.every((c) => classes.includes(c))) return false;
  return s.attrs.every((a) => {
    const v = el.attrs[a.name];
    return v !== undefined && (a.op === "=" ? v === a.value : v.includes(a.value));
  });
}

/** Whether `el`, inside `ancestors` (outermost first), matches the descendant chain. */
function matches(chain: Selector, el: Open, ancestors: Open[]): boolean {
  if (!matchesSimple(chain[chain.length - 1], el)) return false;
  let i = chain.length - 2;
  for (let a = ancestors.length - 1; a >= 0 && i >= 0; a--) {
    if (matchesSimple(chain[i], ancestors[a])) i--;
  }
  return i < 0;
}

export class HtmlScanner {
  private rules: { selectors: Selector[]; handlers: Handlers }[] = [];

  on(selector: string, handlers: Handlers): this {
    this.rules.push({ selectors: parseSelectors(selector), handlers });
    return this;
  }

  /** Reads up to maxBytes of the body through the handlers. */
  async scan(body: ReadableStream<Uint8Array>, maxBytes: number): Promise<void> {
    const stack: Open[] = [];
    const parser = new Parser(
      {
        onopentag: (name, attrs) => {
          const el: Open = { tag: name, attrs, texts: [] };
          for (const { selectors, handlers } of this.rules) {
            if (!selectors.some((chain) => matches(chain, el, stack))) continue;
            handlers.element?.({ getAttribute: (n) => attrs[n.toLowerCase()] ?? null });
            if (handlers.text) el.texts.push(handlers.text);
          }
          if (!VOID.has(name)) stack.push(el);
        },
        ontext: (text) => {
          for (const el of stack) for (const handler of el.texts) handler?.({ text });
        },
        onclosetag: (name) => {
          if (VOID.has(name)) return;
          // Close up to the matching element, tolerating unclosed children.
          const at = stack.map((e) => e.tag).lastIndexOf(name);
          if (at >= 0) stack.length = at;
        },
      },
      { decodeEntities: false, lowerCaseTags: true, lowerCaseAttributeNames: true },
    );

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        parser.write(decoder.decode(value, { stream: true }));
        if (total > maxBytes) break; // give up on very large pages
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    parser.end();
  }
}
