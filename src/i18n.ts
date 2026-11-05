// User interface strings in English, Spanish and Norwegian (Bokmål).
// The language comes from the `lang` cookie (set by the flag links), then
// the browser's Accept-Language header, then English.

import { MAX_WISHES } from "./db";
import { html, type Html } from "./html";

const en = {
  langName: "English",
  flag: "🇬🇧",
  siteTitle: "Secret Santa",
  footer: "Ho ho ho! ❄️",
  language: "Language",
  errorTitle: "Oops",
  errorHeading: "Oh no, a lump of coal!",
  notFound: "Page not found.",
  methodNotAllowed: "Method not allowed.",
  crossSite: "Cross-site request refused.",

  welcomeTitle: "Welcome",
  welcomeHeading: "Ho ho ho!",
  welcomeText: "Your organiser will email you a private link to your Secret Santa page.",
  welcomeLost: "Lost it? Ask them to send it again.",

  badLink: "This link isn't valid. Check you copied the whole link from your email.",
  hello: (name: string) => `Hello, ${name}!`,
  lead: (chain: string): Html =>
    html`Welcome to <strong>${chain}</strong>. Keep this page's link to yourself: it is your private key.`,
  youAreSantaFor: "You are Secret Santa for…",
  theirWishes: (name: string) => `${name}'s wish list:`,
  noWishYet: (name: string) => `${name} hasn't added any wishes yet. Check back later!`,
  notDrawnHeading: "The draw hasn't happened yet",
  notDrawnText:
    "Santa's elves are still shuffling the names. Come back to this page later to find out whom you give a present to.",
  yourWishes: "Your wish list",
  wishesHelp: `Up to ${MAX_WISHES} ideas. Add a link if you like, for example to a shop: we look up the product name and photo.`,
  saved: "✨ Your wish list has been saved.",
  idea: (n: number) => `Idea ${n}`,
  ideaText: "Description",
  ideaLink: "Link (optional)",
  foundPreview: "🔎 Found:",
  saveWishes: "Send to the North Pole",
  everyonesWishes: "Everyone's wishes",
  you: "(you)",
  noWishes: "No wishes yet",
  badUrl: (url: string) => `"${url}" isn't a web address. Links must start with http:// or https://.`,

  adminTitle: "Admin",
  workshop: "Santa's workshop",
  groups: "Groups",
  groupSummary: (n: number, drawn: boolean) =>
    `${n} ${n === 1 ? "person" : "people"} · ${drawn ? "drawn" : "not drawn yet"}`,
  noGroups: "No groups yet.",
  newGroup: "New group",
  groupName: "Group name",
  groupPlaceholder: "Office party 2026",
  createGroup: "Create group",
  needGroupName: "Please give the group a name.",
  groupMissing: "That group doesn't exist.",
  allGroups: "← All groups",
  added: (n: number, skipped: number) =>
    `Added ${n} ${n === 1 ? "person" : "people"}` +
    (skipped ? `; skipped ${skipped} already in the group` : "") +
    ".",
  namesDrawn: "🎲 The names have been drawn!",
  participants: (n: number) => `Participants (${n})`,
  drawnWarning: (date: string) =>
    `Drawn on ${date} UTC. Adding or removing someone cancels the draw, and you will need to draw and send the links again.`,
  thName: "Name",
  thEmail: "Email",
  thWishes: "Wishes",
  thLink: "Private link",
  emailLink: "✉️ Email link",
  copyLink: "Copy link",
  remove: "Remove",
  nobody: "Nobody yet. Add people below.",
  addPeople: "Add people",
  addPeopleHelp: html`One person per line, as <code>Name, email</code> or <code>Name &lt;email&gt;</code>`,
  addButton: "Add to the list",
  badLines: (lines: string) => `These lines need a name and an email address: ${lines}`,
  drawHeading: "Draw names",
  needAtLeast: (n: number) => `You need at least ${n} people to draw.`,
  drawHelp: "Shuffles everyone into one circle: each person gives to the next, and the last gives to the first.",
  redrawConfirm: "Yes, redraw: everyone's assignment will change",
  redraw: "Redraw names",
  draw: "Draw names",
  showCircle: "Show the circle (spoilers!)",
  deleteHeading: "Delete group",
  deleteConfirm: (name: string) => `Delete "${name}", its participants and their wishes`,
  deleteButton: "Delete group",
  mailSubject: (chain: string) => `Your Secret Santa link: ${chain}`,
  mailBody: (name: string, chain: string, link: string) =>
    `Hi ${name},\n\nHere is your private Secret Santa page for "${chain}". ` +
    `Open it to see whom you give a present to and to add your own wishes:\n\n${link}\n\n` +
    `Don't share this link: anyone with it can see your page.\n\nHo ho ho!`,
};

export type Dict = typeof en;

const es: Dict = {
  langName: "Español",
  flag: "🇪🇸",
  siteTitle: "Amigo invisible",
  footer: "¡Jo, jo, jo! ❄️",
  language: "Idioma",
  errorTitle: "¡Ups!",
  errorHeading: "¡Oh, no, carbón!",
  notFound: "Página no encontrada.",
  methodNotAllowed: "Método no permitido.",
  crossSite: "Se ha rechazado una petición de otro sitio.",

  welcomeTitle: "Bienvenida",
  welcomeHeading: "¡Jo, jo, jo!",
  welcomeText: "Quien organiza te enviará por correo un enlace privado a tu página del amigo invisible.",
  welcomeLost: "¿Lo has perdido? Pide que te lo vuelvan a enviar.",

  badLink: "Este enlace no es válido. Comprueba que has copiado el enlace completo del correo.",
  hello: (name) => `¡Hola, ${name}!`,
  lead: (chain) =>
    html`Te damos la bienvenida a <strong>${chain}</strong>. No compartas el enlace de esta página: es tu llave privada.`,
  youAreSantaFor: "Eres el amigo invisible de…",
  theirWishes: (name) => `Lista de deseos de ${name}:`,
  noWishYet: (name) => `${name} todavía no ha añadido ningún deseo. ¡Vuelve más tarde!`,
  notDrawnHeading: "Todavía no se ha hecho el sorteo",
  notDrawnText:
    "Los elfos de Papá Noel todavía están mezclando los nombres. Vuelve a esta página más tarde para saber a quién le haces un regalo.",
  yourWishes: "Tu lista de deseos",
  wishesHelp: `Hasta ${MAX_WISHES} ideas. Si quieres, añade un enlace, por ejemplo a una tienda: buscaremos el nombre y la foto del producto.`,
  saved: "✨ Se ha guardado tu lista de deseos.",
  idea: (n) => `Idea ${n}`,
  ideaText: "Descripción",
  ideaLink: "Enlace (opcional)",
  foundPreview: "🔎 Encontrado:",
  saveWishes: "Enviar al Polo Norte",
  everyonesWishes: "Los deseos de todos",
  you: "(tú)",
  noWishes: "Aún no hay deseos",
  badUrl: (url) => `«${url}» no es una dirección web. Los enlaces deben empezar por http:// o https://.`,

  adminTitle: "Administración",
  workshop: "El taller de Papá Noel",
  groups: "Grupos",
  groupSummary: (n, drawn) =>
    `${n} ${n === 1 ? "persona" : "personas"} · ${drawn ? "sorteado" : "sin sortear"}`,
  noGroups: "Todavía no hay grupos.",
  newGroup: "Nuevo grupo",
  groupName: "Nombre del grupo",
  groupPlaceholder: "Cena de empresa 2026",
  createGroup: "Crear grupo",
  needGroupName: "Ponle un nombre al grupo.",
  groupMissing: "Ese grupo no existe.",
  allGroups: "← Todos los grupos",
  added: (n, skipped) =>
    (n === 1 ? "Se ha añadido 1 persona" : `Se han añadido ${n} personas`) +
    (skipped ? `; se han omitido ${skipped} que ya estaban en el grupo` : "") +
    ".",
  namesDrawn: "🎲 ¡Ya se ha hecho el sorteo!",
  participants: (n) => `Participantes (${n})`,
  drawnWarning: (date) =>
    `Sorteo realizado el ${date} UTC. Si añades o quitas a alguien, se anula el sorteo y tendrás que volver a sortear y enviar los enlaces.`,
  thName: "Nombre",
  thEmail: "Correo",
  thWishes: "Deseos",
  thLink: "Enlace privado",
  emailLink: "✉️ Enviar enlace",
  copyLink: "Copiar enlace",
  remove: "Quitar",
  nobody: "Todavía no hay nadie. Añade personas abajo.",
  addPeople: "Añadir personas",
  addPeopleHelp: html`Una persona por línea, como <code>Nombre, correo</code> o <code>Nombre &lt;correo&gt;</code>`,
  addButton: "Añadir a la lista",
  badLines: (lines) => `A estas líneas les falta un nombre o una dirección de correo: ${lines}`,
  drawHeading: "Sorteo",
  needAtLeast: (n) => `Hacen falta al menos ${n} personas para el sorteo.`,
  drawHelp: "Coloca a todos en un círculo al azar: cada persona regala a la siguiente y la última, a la primera.",
  redrawConfirm: "Sí, volver a sortear: todos recibirán una persona nueva",
  redraw: "Volver a sortear",
  draw: "Sortear",
  showCircle: "Mostrar el círculo (¡spoiler!)",
  deleteHeading: "Eliminar grupo",
  deleteConfirm: (name) => `Eliminar «${name}», sus participantes y sus deseos`,
  deleteButton: "Eliminar grupo",
  mailSubject: (chain) => `Tu enlace del amigo invisible: ${chain}`,
  mailBody: (name, chain, link) =>
    `Hola, ${name}:\n\nEsta es tu página privada del amigo invisible para «${chain}». ` +
    `Ábrela para ver a quién le haces un regalo y para añadir tus propios deseos:\n\n${link}\n\n` +
    `No compartas este enlace: cualquiera que lo tenga puede ver tu página.\n\n¡Jo, jo, jo!`,
};

const nb: Dict = {
  langName: "Norsk",
  flag: "🇳🇴",
  siteTitle: "Hemmelig nisse",
  footer: "Ho ho ho! ❄️",
  language: "Språk",
  errorTitle: "Oi",
  errorHeading: "Å nei, bare kull i strømpen!",
  notFound: "Fant ikke siden.",
  methodNotAllowed: "Metoden er ikke tillatt.",
  crossSite: "Forespørsel fra et annet nettsted ble avvist.",

  welcomeTitle: "Velkommen",
  welcomeHeading: "Ho ho ho!",
  welcomeText: "Arrangøren sender deg en privat lenke til din side på e-post.",
  welcomeLost: "Mistet den? Be arrangøren sende den på nytt.",

  badLink: "Denne lenken er ikke gyldig. Sjekk at du kopierte hele lenken fra e-posten.",
  hello: (name) => `Hei, ${name}!`,
  lead: (chain) =>
    html`Velkommen til <strong>${chain}</strong>. Ikke del lenken til denne siden: den er din private nøkkel.`,
  youAreSantaFor: "Du er hemmelig nisse for …",
  theirWishes: (name) => `Ønskelisten til ${name}:`,
  noWishYet: (name) => `${name} har ikke lagt inn noen ønsker ennå. Kom tilbake senere!`,
  notDrawnHeading: "Trekningen har ikke skjedd ennå",
  notDrawnText:
    "Nissens alver stokker fortsatt navnene. Kom tilbake hit senere for å se hvem du skal gi en gave til.",
  yourWishes: "Din ønskeliste",
  wishesHelp: `Opptil ${MAX_WISHES} ideer. Legg gjerne til en lenke, for eksempel til en nettbutikk, så henter vi produktnavn og bilde.`,
  saved: "✨ Ønskelisten din er lagret.",
  idea: (n) => `Idé ${n}`,
  ideaText: "Beskrivelse",
  ideaLink: "Lenke (valgfritt)",
  foundPreview: "🔎 Fant:",
  saveWishes: "Send til Nordpolen",
  everyonesWishes: "Alles ønsker",
  you: "(deg)",
  noWishes: "Ingen ønsker ennå",
  badUrl: (url) => `«${url}» er ikke en nettadresse. Lenker må begynne med http:// eller https://.`,

  adminTitle: "Administrasjon",
  workshop: "Nissens verksted",
  groups: "Grupper",
  groupSummary: (n, drawn) =>
    `${n} ${n === 1 ? "person" : "personer"} · ${drawn ? "trukket" : "ikke trukket ennå"}`,
  noGroups: "Ingen grupper ennå.",
  newGroup: "Ny gruppe",
  groupName: "Gruppenavn",
  groupPlaceholder: "Julebord 2026",
  createGroup: "Opprett gruppe",
  needGroupName: "Gi gruppen et navn.",
  groupMissing: "Den gruppen finnes ikke.",
  allGroups: "← Alle grupper",
  added: (n, skipped) =>
    `La til ${n} ${n === 1 ? "person" : "personer"}` +
    (skipped ? `; hoppet over ${skipped} som allerede er med` : "") +
    ".",
  namesDrawn: "🎲 Navnene er trukket!",
  participants: (n) => `Deltakere (${n})`,
  drawnWarning: (date) =>
    `Trukket ${date} UTC. Hvis du legger til eller fjerner noen, blir trekningen annullert, og du må trekke og sende lenkene på nytt.`,
  thName: "Navn",
  thEmail: "E-post",
  thWishes: "Ønsker",
  thLink: "Privat lenke",
  emailLink: "✉️ Send lenke",
  copyLink: "Kopier lenke",
  remove: "Fjern",
  nobody: "Ingen ennå. Legg til folk nedenfor.",
  addPeople: "Legg til folk",
  addPeopleHelp: html`Én person per linje, som <code>Navn, e-post</code> eller <code>Navn &lt;e-post&gt;</code>`,
  addButton: "Legg til på listen",
  badLines: (lines) => `Disse linjene mangler navn eller e-postadresse: ${lines}`,
  drawHeading: "Trekk navn",
  needAtLeast: (n) => `Det trengs minst ${n} personer for å trekke.`,
  drawHelp: "Stokker alle i én ring: hver person gir til den neste, og den siste gir til den første.",
  redrawConfirm: "Ja, trekk på nytt: alle får en ny person",
  redraw: "Trekk på nytt",
  draw: "Trekk navn",
  showCircle: "Vis ringen (avsløring!)",
  deleteHeading: "Slett gruppe",
  deleteConfirm: (name) => `Slett «${name}», deltakerne og ønskene deres`,
  deleteButton: "Slett gruppe",
  mailSubject: (chain) => `Din lenke til hemmelig nisse: ${chain}`,
  mailBody: (name, chain, link) =>
    `Hei ${name},\n\nHer er din private side for hemmelig nisse i «${chain}». ` +
    `Åpne den for å se hvem du skal gi en gave til, og for å legge inn dine egne ønsker:\n\n${link}\n\n` +
    `Ikke del lenken: alle som har den, kan se siden din.\n\nHo ho ho!`,
};

export const DICTS = { en, es, nb } as const;
export type Lang = keyof typeof DICTS;

/** Per-request context: the chosen language and the request URL. */
export interface Ctx {
  lang: Lang;
  t: Dict;
  url: URL;
}

const COOKIE = "lang";

function isLang(code: string | undefined): code is Lang {
  return code !== undefined && Object.hasOwn(DICTS, code);
}

/** Maps a BCP 47 tag such as "es-MX" or "no" to a supported language. */
function matchTag(tag: string): Lang | undefined {
  const base = tag.trim().toLowerCase().split("-")[0];
  if (base === "no" || base === "nn" || base === "nb") return "nb";
  return isLang(base) ? base : undefined;
}

function fromAcceptLanguage(header: string): Lang | undefined {
  return header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { tag, q: q ? Number(q.slice(2)) || 0 : 1 };
    })
    .filter((x) => x.q > 0)
    .sort((a, b) => b.q - a.q)
    .map((x) => matchTag(x.tag))
    .find((lang) => lang !== undefined);
}

export function resolveContext(request: Request): Ctx {
  const cookie = (request.headers.get("Cookie") ?? "")
    .split(";")
    .map((c) => c.trim().split("="))
    .find(([k]) => k === COOKIE)?.[1];
  const lang = isLang(cookie)
    ? cookie
    : (fromAcceptLanguage(request.headers.get("Accept-Language") ?? "") ?? "en");
  return { lang, t: DICTS[lang], url: new URL(request.url) };
}

/**
 * GET /lang/<code>?back=<path>: remember the choice in a cookie and return to
 * the page the flag was clicked on. Only same-site paths are accepted for back.
 */
export function switchLanguage(url: URL, code: string): Response {
  const back = url.searchParams.get("back") ?? "/";
  const location = back.startsWith("/") && !back.startsWith("//") && !back.startsWith("/\\") ? back : "/";
  const headers = new Headers({ Location: location });
  if (isLang(code)) {
    const secure = url.protocol === "https:" ? "; Secure" : "";
    headers.set("Set-Cookie", `${COOKIE}=${code}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`);
  }
  return new Response(null, { status: 303, headers });
}

/** Flag links for the page header, each returning to the current page. */
export function languageSwitcher(ctx: Ctx): Html {
  const back = encodeURIComponent(ctx.url.pathname + ctx.url.search);
  return html`<nav class="lang" aria-label="${ctx.t.language}">${Object.entries(DICTS).map(
    ([code, d]) =>
      html`<a href="/lang/${code}?back=${back}" hreflang="${code}" lang="${code}" title="${d.langName}"${
        code === ctx.lang && html` aria-current="true"`
      }><span aria-hidden="true">${d.flag}</span> ${d.langName}</a>`,
  )}</nav>`;
}
