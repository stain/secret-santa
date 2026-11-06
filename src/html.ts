// Tiny HTML templating: every interpolated value is escaped unless it is
// itself an Html fragment produced by the `html` tag.

export class Html {
  constructor(readonly value: string) {}
  toString(): string {
    return this.value;
  }
}

type Part = Html | string | number | null | undefined | false | Part[];

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escape(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

function render(part: Part): string {
  if (part === null || part === undefined || part === false) return "";
  if (part instanceof Html) return part.value;
  if (Array.isArray(part)) return part.map(render).join("");
  return escape(String(part));
}

export function html(strings: TemplateStringsArray, ...values: Part[]): Html {
  let out = strings[0];
  values.forEach((v, i) => {
    out += render(v) + strings[i + 1];
  });
  return new Html(out);
}

export function redirect(location: string): Response {
  return new Response(null, { status: 303, headers: { Location: location } });
}
