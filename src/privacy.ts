// The privacy notice at /privacy (GDPR Articles 13 and 14), in each language.
// Keep it in step with what the app does: if you change what is stored, who
// processes it, where it is kept or how long, update all three versions.
// The data controller's name and contact are set on the admin home page.

import { getSettings, type Settings } from "./db";
import { html, type Html } from "./html";
import type { Ctx, Lang } from "./i18n";
import { page } from "./layout";

/** The opening section, naming the data controller (or saying none is named yet). */
function whoIsResponsible(lang: Lang, s: Settings): Html {
  const named = s.controllerName !== "";
  switch (lang) {
    case "en":
      return html`<h2>Who is responsible for your data</h2>
${named
  ? html`<p>The data controller is <strong>${s.controllerName}</strong>${s.controllerContact && html` (contact: ${s.controllerContact})`}. They run this Secret Santa app and decide how it is used. Contact them with any question or request about your data.</p>`
  : html`<p class="warning">The data controller has not been named yet. Ask whoever sent you your private link.</p>`}
<p>Your group may also have its own organiser, shown on your private page under "Your data", whom you can ask about the group.</p>`;
    case "es":
      return html`<h2>Quién es responsable de tus datos</h2>
${named
  ? html`<p>El responsable del tratamiento es <strong>${s.controllerName}</strong>${s.controllerContact && html` (contacto: ${s.controllerContact})`}, que gestiona esta aplicación de Santa Secreto y decide cómo se usa. Ponte en contacto con el responsable para cualquier pregunta o solicitud sobre tus datos.</p>`
  : html`<p class="warning">Todavía no se ha indicado quién es el responsable del tratamiento. Pregunta a quien te envió tu enlace privado.</p>`}
<p>Tu grupo también puede tener su propia persona organizadora, que aparece en tu página privada en «Tus datos», a quien puedes preguntar sobre el grupo.</p>`;
    case "nb":
      return html`<h2>Hvem som er ansvarlig for dataene dine</h2>
${named
  ? html`<p>Behandlingsansvarlig er <strong>${s.controllerName}</strong>${s.controllerContact && html` (kontakt: ${s.controllerContact})`}, som driver denne appen for hemmelig nisse og bestemmer hvordan den brukes. Kontakt behandlingsansvarlig med spørsmål eller forespørsler om dataene dine.</p>`
  : html`<p class="warning">Behandlingsansvarlig er ikke oppgitt ennå. Spør den som sendte deg den private lenken.</p>`}
<p>Gruppen din kan også ha sin egen arrangør, som står på din private side under «Dine data», og som du kan spørre om gruppen.</p>`;
  }
}

const REST: Record<Lang, Html> = {
  en: html`<h2>What is stored</h2>
<ul>
  <li>Your name and email address, entered by the data controller.</li>
  <li>The wish ideas you write, including any links, and the product name, photo address and price looked up from those links.</li>
  <li>Whom you give a present to.</li>
  <li>For one day, when you looked up product links, to limit how many lookups can be made.</li>
</ul>
<p>The app does not store your IP address, does not use analytics or tracking, and does not show your email address to other participants.</p>

<h2>Why, and on what legal basis</h2>
<p>Only to run the Secret Santa you take part in: drawing names, showing you whom you give to, sharing wishes within your group and sending you your private link. The legal basis is the data controller's legitimate interest in running the event (GDPR Article 6(1)(f)).</p>

<h2>Who can see it</h2>
<ul>
  <li>Everyone in your group sees your name and your wishes.</li>
  <li>Only the person who gives you a present learns that they give to you.</li>
  <li>The data controller can see all of the group's data, including email addresses and the draw.</li>
</ul>

<h2>Who else handles it</h2>
<ul>
  <li><strong>Cloudflare</strong> runs the app and its database on the data controller's behalf, under Cloudflare's data processing terms. The database is kept in the European Union.</li>
  <li>The data controller emails you your private link from their own email account, so their email provider also has your address and a copy of that message. The app itself sends no email.</li>
  <li>Product links you enter are fetched by the app's server, not your browser, and product photos are passed on by the server, so shops never see your visit.</li>
  <li>Exchange rates come from the European Central Bank (via frankfurter.dev); no personal data is sent.</li>
</ul>

<h2>How long it is kept</h2>
<p>All data for a group is deleted automatically the day after the group's end date, which is shown on your page (by default 31 January). Cloudflare's database backups can keep deleted data for up to 30 more days. Product lookups are kept for one day.</p>

<h2>Cookies</h2>
<p>The app only sets a cookie when you choose a language or currency, to remember your choice. There are no other cookies.</p>

<h2>Your rights</h2>
<ul>
  <li>See and download your data with "Download my data" on your page.</li>
  <li>Change or delete your wishes there at any time.</li>
  <li>Ask the data controller to correct your name or email address, or to remove you and all your data.</li>
  <li>Object to the processing.</li>
  <li>Complain to a data protection authority, such as the ICO (UK), the AEPD (Spain) or Datatilsynet (Norway).</li>
</ul>`,

  es: html`<h2>Qué se guarda</h2>
<ul>
  <li>Tu nombre y tu dirección de correo, introducidos por el responsable del tratamiento.</li>
  <li>Las ideas de regalo que escribes, con sus enlaces, y el nombre, la dirección de la foto y el precio del producto obtenidos de esos enlaces.</li>
  <li>A quién le haces un regalo.</li>
  <li>Durante un día, cuándo buscaste enlaces de productos, para limitar el número de búsquedas.</li>
</ul>
<p>La aplicación no guarda tu dirección IP, no usa analítica ni seguimiento y no muestra tu correo a otros participantes.</p>

<h2>Para qué y con qué base legal</h2>
<p>Solo para organizar el Santa Secreto en el que participas: hacer el sorteo, mostrarte a quién le haces un regalo, compartir los deseos dentro del grupo y enviarte tu enlace privado. La base legal es el interés legítimo del responsable del tratamiento en llevar a cabo el evento (artículo 6.1.f del RGPD).</p>

<h2>Quién puede verlos</h2>
<ul>
  <li>Todas las personas de tu grupo ven tu nombre y tus deseos.</li>
  <li>Solo quien te hace un regalo sabe que te lo hace a ti.</li>
  <li>El responsable del tratamiento puede ver todos los datos del grupo, incluidos los correos y el sorteo.</li>
</ul>

<h2>Quién más los trata</h2>
<ul>
  <li><strong>Cloudflare</strong> ejecuta la aplicación y su base de datos por cuenta del responsable del tratamiento, según las condiciones de tratamiento de datos de Cloudflare. La base de datos se guarda en la Unión Europea.</li>
  <li>El responsable del tratamiento te envía tu enlace privado desde su propia cuenta de correo, así que su proveedor de correo también tiene tu dirección y una copia de ese mensaje. La aplicación no envía correos.</li>
  <li>Los enlaces de productos que escribes los consulta el servidor de la aplicación, no tu navegador, y las fotos de los productos también pasan por el servidor, así que las tiendas nunca ven tu visita.</li>
  <li>Los tipos de cambio vienen del Banco Central Europeo (a través de frankfurter.dev); no se envía ningún dato personal.</li>
</ul>

<h2>Cuánto tiempo se guardan</h2>
<p>Todos los datos de un grupo se borran automáticamente el día después de su fecha de fin, que aparece en tu página (por defecto, el 31 de enero). Las copias de seguridad de la base de datos de Cloudflare pueden conservar los datos borrados hasta 30 días más. Las búsquedas de productos se guardan un día.</p>

<h2>Cookies</h2>
<p>La aplicación solo guarda una cookie cuando eliges un idioma o una moneda, para recordar tu elección. No hay más cookies.</p>

<h2>Tus derechos</h2>
<ul>
  <li>Ver y descargar tus datos con «Descargar mis datos» en tu página.</li>
  <li>Cambiar o borrar tus deseos allí cuando quieras.</li>
  <li>Pedir al responsable del tratamiento que corrija tu nombre o tu correo, o que te quite del grupo junto con todos tus datos.</li>
  <li>Oponerte al tratamiento.</li>
  <li>Presentar una reclamación ante una autoridad de protección de datos, como la AEPD (España), el ICO (Reino Unido) o Datatilsynet (Noruega).</li>
</ul>`,

  nb: html`<h2>Hva som lagres</h2>
<ul>
  <li>Navnet og e-postadressen din, lagt inn av behandlingsansvarlig.</li>
  <li>Ønskene du skriver, med eventuelle lenker, og produktnavn, bildeadresse og pris hentet fra disse lenkene.</li>
  <li>Hvem du skal gi en gave til.</li>
  <li>I ett døgn: når du slo opp produktlenker, for å begrense antall oppslag.</li>
</ul>
<p>Appen lagrer ikke IP-adressen din, bruker ikke analyse eller sporing, og viser ikke e-postadressen din til andre deltakere.</p>

<h2>Hvorfor, og med hvilket rettslig grunnlag</h2>
<p>Bare for å gjennomføre hemmelig nisse-gruppen du er med i: trekke navn, vise deg hvem du skal gi til, dele ønsker i gruppen og sende deg den private lenken din. Det rettslige grunnlaget er behandlingsansvarliges berettigede interesse i å gjennomføre arrangementet (personvernforordningen artikkel 6 nr. 1 bokstav f).</p>

<h2>Hvem som kan se dem</h2>
<ul>
  <li>Alle i gruppen din ser navnet ditt og ønskene dine.</li>
  <li>Bare den som skal gi deg en gave, vet at det er deg de gir til.</li>
  <li>Behandlingsansvarlig kan se alle data i gruppen, også e-postadresser og trekningen.</li>
</ul>

<h2>Hvem andre som behandler dem</h2>
<ul>
  <li><strong>Cloudflare</strong> driver appen og databasen på vegne av behandlingsansvarlig, etter Cloudflares vilkår for databehandling. Databasen lagres i EU.</li>
  <li>Behandlingsansvarlig sender deg den private lenken fra sin egen e-postkonto, så e-postleverandøren deres har også adressen din og en kopi av meldingen. Appen sender ingen e-post selv.</li>
  <li>Produktlenker du legger inn, hentes av appens server, ikke nettleseren din, og produktbilder sendes videre av serveren, så butikkene ser aldri besøket ditt.</li>
  <li>Valutakurser hentes fra Den europeiske sentralbanken (via frankfurter.dev); ingen personopplysninger sendes.</li>
</ul>

<h2>Hvor lenge de lagres</h2>
<p>Alle data for en gruppe slettes automatisk dagen etter gruppens sluttdato, som står på siden din (som standard 31. januar). Cloudflares sikkerhetskopier av databasen kan beholde slettede data i opptil 30 dager til. Produktoppslag lagres i ett døgn.</p>

<h2>Informasjonskapsler</h2>
<p>Appen setter bare en informasjonskapsel når du velger språk eller valuta, for å huske valget ditt. Det finnes ingen andre informasjonskapsler.</p>

<h2>Rettighetene dine</h2>
<ul>
  <li>Se og laste ned dataene dine med «Last ned dataene mine» på siden din.</li>
  <li>Endre eller slette ønskene dine der når som helst.</li>
  <li>Be behandlingsansvarlig rette navnet eller e-postadressen din, eller fjerne deg og alle dataene dine.</li>
  <li>Protestere mot behandlingen.</li>
  <li>Klage til en personvernmyndighet, som Datatilsynet (Norge), ICO (Storbritannia) eller AEPD (Spania).</li>
</ul>`,
};

export async function privacyPage(ctx: Ctx, env: Env): Promise<Response> {
  const settings = await getSettings(env.DB);
  return page(
    ctx,
    ctx.t.privacyTitle,
    html`<h1>${ctx.t.privacyTitle}</h1>
<section class="card notice-text">${whoIsResponsible(ctx.lang, settings)}${REST[ctx.lang]}</section>`,
  );
}
