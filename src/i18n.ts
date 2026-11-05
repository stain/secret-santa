// User interface strings in English, Spanish and Norwegian (Bokmål).
// The language comes from the `lang` cookie (set by the flag links), then
// the browser's Accept-Language header, then English. The display currency
// comes from the `cur` cookie, else it follows the language.

import { backParam, readCookie, rememberChoice } from "./cookies";
import { MAX_WISHES } from "./db";
import { html, type Html } from "./html";
import { DEFAULT_CURRENCY, currencyFromCookie, type Currency } from "./money";

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
  wishesHelp: `Up to ${MAX_WISHES} ideas. Paste a link to a product if you have one: we look up its name, photo and price.`,
  saved: "✨ Your wish list has been saved.",
  idea: (n: number) => `Idea ${n}`,
  ideaText: "Description, or a note about the link",
  ideaLink: "Link to the product (optional)",
  lookingUp: "🔎 Looking up the product…",
  nothingFound: "Couldn't read product details from that page. Please add a description.",
  tooManyLookups: "Too many product lookups for now. Try again in an hour, or just add a description.",
  currency: "Currency",
  budget: "Suggested budget",
  overBudget: "Over the suggested budget",
  budgetHelp:
    "A guide for everyone, not a rule: nothing is enforced. Leave the amount empty for no budget. Other currencies are shown converted and rounded, using the European Central Bank's daily rates.",
  budgetAmount: "Amount",
  saveBudget: "Save budget",
  badBudget: "The budget must be a positive number.",
  privacy: "Privacy",
  privacyTitle: "Privacy notice",
  yourData: "Your data",
  organiserContact: "Responsible for your data (the organiser):",
  organiserMissing: "The organiser hasn't added their contact details yet.",
  deletedOn: (date: string) => `All data for this group is deleted automatically after ${date}.`,
  yourDataHelp:
    "You can change or delete your wishes above at any time. To correct your name or email address, or to be removed with all your data, contact the organiser.",
  downloadData: "Download my data",
  privacyLink: "How your data is handled",
  organiserHeading: "Organiser and data deletion",
  organiserHelp:
    "Participants see this on their page as the person responsible for their data (GDPR). Give a name and an email address. On the day after the end date, the group and all its data are deleted automatically.",
  organiserLabel: "Organiser's name and email",
  endsOnLabel: "End date",
  organiserWarning: "Add the organiser's contact details before sending the links: participants need to know whom to ask about their data.",
  badDate: "Choose a valid end date.",
  save: "Save",
  edit: "Edit",
  emailTaken: "Someone in this group already has that email address.",
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
  mailBody: (name: string, chain: string, link: string, privacy: string) =>
    `Hi ${name},\n\nHere is your private Secret Santa page for "${chain}". ` +
    `Open it to see whom you give a present to and to add your own wishes:\n\n${link}\n\n` +
    `Don't share this link: anyone with it can see your page.\n\n` +
    `How your data is handled: ${privacy}\n\nHo ho ho!`,
};

export type Dict = typeof en;

const es: Dict = {
  langName: "Español",
  flag: "🇪🇸",
  siteTitle: "Santa Secreto",
  footer: "¡Jo, jo, jo! ❄️",
  language: "Idioma",
  errorTitle: "¡Ups!",
  errorHeading: "¡Oh, no, carbón!",
  notFound: "Página no encontrada.",
  methodNotAllowed: "Método no permitido.",
  crossSite: "Se ha rechazado una petición de otro sitio.",

  welcomeTitle: "Bienvenida",
  welcomeHeading: "¡Jo, jo, jo!",
  welcomeText: "Quien organiza te enviará por correo un enlace privado a tu página de Santa Secreto.",
  welcomeLost: "¿Lo has perdido? Pide que te lo vuelvan a enviar.",

  badLink: "Este enlace no es válido. Comprueba que has copiado el enlace completo del correo.",
  hello: (name) => `¡Hola, ${name}!`,
  lead: (chain) =>
    html`Te damos la bienvenida a <strong>${chain}</strong>. No compartas el enlace de esta página: es tu llave privada.`,
  youAreSantaFor: "Eres el Santa Secreto de…",
  theirWishes: (name) => `Lista de deseos de ${name}:`,
  noWishYet: (name) => `${name} todavía no ha añadido ningún deseo. ¡Vuelve más tarde!`,
  notDrawnHeading: "Todavía no se ha hecho el sorteo",
  notDrawnText:
    "Los elfos de Papá Noel todavía están mezclando los nombres. Vuelve a esta página más tarde para saber a quién le haces un regalo.",
  yourWishes: "Tu lista de deseos",
  wishesHelp: `Hasta ${MAX_WISHES} ideas. Si tienes un enlace a un producto, pégalo: buscaremos su nombre, foto y precio.`,
  saved: "✨ Se ha guardado tu lista de deseos.",
  idea: (n) => `Idea ${n}`,
  ideaText: "Descripción, o una nota sobre el enlace",
  ideaLink: "Enlace al producto (opcional)",
  lookingUp: "🔎 Buscando el producto…",
  nothingFound: "No se han podido leer los datos del producto de esa página. Añade una descripción.",
  tooManyLookups: "Demasiadas búsquedas de productos por ahora. Vuelve a intentarlo dentro de una hora, o añade una descripción.",
  currency: "Moneda",
  budget: "Presupuesto sugerido",
  overBudget: "Supera el presupuesto sugerido",
  budgetHelp:
    "Una orientación para todos, no una norma: no se impone nada. Deja la cantidad vacía si no hay presupuesto. Las demás monedas se muestran convertidas y redondeadas con los tipos de cambio diarios del Banco Central Europeo.",
  budgetAmount: "Cantidad",
  saveBudget: "Guardar presupuesto",
  badBudget: "El presupuesto debe ser un número positivo.",
  privacy: "Privacidad",
  privacyTitle: "Aviso de privacidad",
  yourData: "Tus datos",
  organiserContact: "Responsable de tus datos (quien organiza):",
  organiserMissing: "Quien organiza todavía no ha añadido sus datos de contacto.",
  deletedOn: (date) => `Todos los datos de este grupo se borran automáticamente después del ${date}.`,
  yourDataHelp:
    "Puedes cambiar o borrar tus deseos arriba cuando quieras. Para corregir tu nombre o tu correo, o para que te quiten del grupo con todos tus datos, ponte en contacto con quien organiza.",
  downloadData: "Descargar mis datos",
  privacyLink: "Cómo se tratan tus datos",
  organiserHeading: "Organización y borrado de datos",
  organiserHelp:
    "Los participantes ven esto en su página como la persona responsable de sus datos (RGPD). Indica un nombre y un correo. El día después de la fecha de fin, el grupo y todos sus datos se borran automáticamente.",
  organiserLabel: "Nombre y correo de quien organiza",
  endsOnLabel: "Fecha de fin",
  organiserWarning: "Añade los datos de contacto de quien organiza antes de enviar los enlaces: los participantes deben saber a quién preguntar por sus datos.",
  badDate: "Elige una fecha de fin válida.",
  save: "Guardar",
  edit: "Editar",
  emailTaken: "Alguien de este grupo ya tiene esa dirección de correo.",
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
  mailSubject: (chain) => `Tu enlace de Santa Secreto: ${chain}`,
  mailBody: (name, chain, link, privacy) =>
    `Hola, ${name}:\n\nEsta es tu página privada de Santa Secreto para «${chain}». ` +
    `Ábrela para ver a quién le haces un regalo y para añadir tus propios deseos:\n\n${link}\n\n` +
    `No compartas este enlace: cualquiera que lo tenga puede ver tu página.\n\n` +
    `Cómo se tratan tus datos: ${privacy}\n\n¡Jo, jo, jo!`,
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
  wishesHelp: `Opptil ${MAX_WISHES} ideer. Lim inn en lenke til et produkt hvis du har en, så henter vi navn, bilde og pris.`,
  saved: "✨ Ønskelisten din er lagret.",
  idea: (n) => `Idé ${n}`,
  ideaText: "Beskrivelse, eller en merknad om lenken",
  ideaLink: "Lenke til produktet (valgfritt)",
  lookingUp: "🔎 Slår opp produktet …",
  nothingFound: "Fant ikke produktinformasjon på den siden. Skriv gjerne en beskrivelse.",
  tooManyLookups: "For mange produktoppslag akkurat nå. Prøv igjen om en time, eller skriv bare en beskrivelse.",
  currency: "Valuta",
  budget: "Foreslått budsjett",
  overBudget: "Over foreslått budsjett",
  budgetHelp:
    "En rettesnor for alle, ikke en regel: ingenting håndheves. La beløpet stå tomt hvis dere ikke vil ha et budsjett. Andre valutaer vises omregnet og avrundet etter Den europeiske sentralbankens dagskurser.",
  budgetAmount: "Beløp",
  saveBudget: "Lagre budsjett",
  badBudget: "Budsjettet må være et positivt tall.",
  privacy: "Personvern",
  privacyTitle: "Personvernerklæring",
  yourData: "Dine data",
  organiserContact: "Ansvarlig for dataene dine (arrangøren):",
  organiserMissing: "Arrangøren har ikke lagt inn kontaktinformasjon ennå.",
  deletedOn: (date) => `Alle data for denne gruppen slettes automatisk etter ${date}.`,
  yourDataHelp:
    "Du kan endre eller slette ønskene dine ovenfor når som helst. For å rette navnet eller e-postadressen din, eller bli fjernet med alle dataene dine, kontakt arrangøren.",
  downloadData: "Last ned dataene mine",
  privacyLink: "Slik behandles dataene dine",
  organiserHeading: "Arrangør og sletting av data",
  organiserHelp:
    "Deltakerne ser dette på siden sin som den som er ansvarlig for dataene deres (personvernforordningen). Oppgi navn og e-postadresse. Dagen etter sluttdatoen slettes gruppen og alle dataene automatisk.",
  organiserLabel: "Arrangørens navn og e-post",
  endsOnLabel: "Sluttdato",
  organiserWarning: "Legg inn arrangørens kontaktinformasjon før du sender lenkene: deltakerne må vite hvem de kan spørre om dataene sine.",
  badDate: "Velg en gyldig sluttdato.",
  save: "Lagre",
  edit: "Endre",
  emailTaken: "Noen i denne gruppen har allerede den e-postadressen.",
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
  mailBody: (name, chain, link, privacy) =>
    `Hei ${name},\n\nHer er din private side for hemmelig nisse i «${chain}». ` +
    `Åpne den for å se hvem du skal gi en gave til, og for å legge inn dine egne ønsker:\n\n${link}\n\n` +
    `Ikke del lenken: alle som har den, kan se siden din.\n\n` +
    `Slik behandles dataene dine: ${privacy}\n\nHo ho ho!`,
};

export const DICTS = { en, es, nb } as const;
export type Lang = keyof typeof DICTS;

export const LOCALES: Record<Lang, string> = { en: "en-GB", es: "es-MX", nb: "nb-NO" };

/** "31 January 2027" from "2027-01-31", in the page's language. */
export function formatDate(ctx: Ctx, isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  return Number.isNaN(date.getTime())
    ? isoDate
    : new Intl.DateTimeFormat(LOCALES[ctx.lang], { dateStyle: "long", timeZone: "UTC" }).format(date);
}

/** Per-request context: the chosen language and the request URL. */
export interface Ctx {
  lang: Lang;
  t: Dict;
  url: URL;
  currency: Currency;
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
  const cookie = readCookie(request, COOKIE);
  const lang = isLang(cookie)
    ? cookie
    : (fromAcceptLanguage(request.headers.get("Accept-Language") ?? "") ?? "en");
  return {
    lang,
    t: DICTS[lang],
    url: new URL(request.url),
    currency: currencyFromCookie(request) ?? DEFAULT_CURRENCY[lang],
  };
}

/** GET /lang/<code>?back=<path>: see rememberChoice. */
export function switchLanguage(url: URL, code: string): Response {
  return rememberChoice(url, COOKIE, isLang(code) ? code : null);
}

/** Flag links for the page header, each returning to the current page. */
export function languageSwitcher(ctx: Ctx): Html {
  const back = backParam(ctx.url);
  return html`<nav class="lang" aria-label="${ctx.t.language}">${Object.entries(DICTS).map(
    ([code, d]) =>
      html`<a href="/lang/${code}?back=${back}" hreflang="${code}" lang="${code}" title="${d.langName}"${
        code === ctx.lang && html` aria-current="true"`
      }><span aria-hidden="true">${d.flag}</span> ${d.langName}</a>`,
  )}</nav>`;
}
