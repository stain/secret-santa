// The privacy notice at /privacy (GDPR Articles 13 and 14), in each language.
// Keep it in step with what the app does: if you change what is stored, who
// processes it, where it is kept or how long, update all three versions.
// The data controller's name and contact are set on the admin home page.

import { html, type Html } from "./html";
import type { Ctx, Lang } from "./i18n";
import { page } from "./layout";

// The notice is a static page (rendered at build time, served by nginx), so it
// can't name the data controller or the hosting provider: interactive pages
// show both in their footer, and the notice points there.

const WHO: Record<Lang, Html> = {
  en: html`<h2>Who is responsible for your data</h2>
<p>The person or organisation running this Secret Santa app is the data controller: they decide how it is used and are responsible for your data. Their name and contact details are shown at the bottom of your private page. Contact them with any question or request about your data.</p>
<p>Your group may also have its own organiser, shown on your private page under "Your data", whom you can ask about the group.</p>`,
  es: html`<h2>Quién es responsable de tus datos</h2>
<p>La persona u organización que gestiona esta aplicación de Santa Secreto es el responsable del tratamiento: decide cómo se usa y es responsable de tus datos. Su nombre y sus datos de contacto aparecen al pie de tu página privada. Ponte en contacto con el responsable para cualquier pregunta o solicitud sobre tus datos.</p>
<p>Tu grupo también puede tener su propia persona organizadora, que aparece en tu página privada en «Tus datos», a quien puedes preguntar sobre el grupo.</p>`,
  nb: html`<h2>Hvem som er ansvarlig for dataene dine</h2>
<p>Personen eller organisasjonen som driver denne appen for hemmelig nisse, er behandlingsansvarlig: de bestemmer hvordan den brukes og er ansvarlige for dataene dine. Navn og kontaktinformasjon står nederst på din private side. Kontakt behandlingsansvarlig med spørsmål eller forespørsler om dataene dine.</p>
<p>Gruppen din kan også ha sin egen arrangør, som står på din private side under «Dine data», og som du kan spørre om gruppen.</p>`,
};

const HOSTING: Record<Lang, Html> = {
  en: html`<li>The app and its database run on a rented server, provided on the data controller's behalf under a data processing agreement. The provider and the server's location are shown at the bottom of your private page.</li>`,
  es: html`<li>La aplicación y su base de datos funcionan en un servidor alquilado, proporcionado por cuenta del responsable del tratamiento con un acuerdo de tratamiento de datos. El proveedor y la ubicación del servidor aparecen al pie de tu página privada.</li>`,
  nb: html`<li>Appen og databasen kjører på en leid server, levert på vegne av behandlingsansvarlig under en databehandleravtale. Leverandøren og hvor serveren står, vises nederst på din private side.</li>`,
};

const REST: Record<Lang, (host: Html) => Html> = {
  en: (host) => html`<h2>What is stored</h2>
<ul>
  <li>Your name and email address, entered by the data controller.</li>
  <li>The wish ideas you write, including any links, and the product name, photo address and price looked up from those links.</li>
  <li>Whom you give a present to.</li>
  <li>For one day, when you looked up product links, to limit how many lookups can be made.</li>
</ul>
<p>The app does not store your IP address, does not use analytics or tracking, and does not show your email address to other participants.</p>
<p>To keep the site secure (the data controller's legitimate interest), the web server records the IP address, and nothing else, of any visitor who goes over its request limits, so that repeat offenders can be blocked for an hour. These records are deleted after one day.</p>

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
  ${host}
  <li>To keep links family-friendly, the names of linked websites (not the full links) are checked with Cloudflare's "1.1.1.1 for Families" service.</li>
  <li>The data controller emails you your private link from their own email account, so their email provider also has your address and a copy of that message. The app itself sends no email.</li>
  <li>Product links you enter are fetched by the app's server, not your browser, and product photos are passed on by the server, so shops never see your visit.</li>
  <li>Exchange rates come from the European Central Bank (via frankfurter.dev); no personal data is sent.</li>
</ul>

<h2>How long it is kept</h2>
<p>All data for a group is deleted automatically within two days after the group's end date, which is shown on your page (by default 31 January). Backup copies of the database are kept for 7 days, so deleted data can remain in them for up to 7 more days. Product lookups are kept for one day.</p>

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

  es: (host) => html`<h2>Qué se guarda</h2>
<ul>
  <li>Tu nombre y tu dirección de correo, introducidos por el responsable del tratamiento.</li>
  <li>Las ideas de regalo que escribes, con sus enlaces, y el nombre, la dirección de la foto y el precio del producto obtenidos de esos enlaces.</li>
  <li>A quién le haces un regalo.</li>
  <li>Durante un día, cuándo buscaste enlaces de productos, para limitar el número de búsquedas.</li>
</ul>
<p>La aplicación no guarda tu dirección IP, no usa analítica ni seguimiento y no muestra tu correo a otros participantes.</p>
<p>Para mantener el sitio seguro (interés legítimo del responsable del tratamiento), el servidor web registra la dirección IP, y nada más, de cualquier visitante que supere sus límites de peticiones, para poder bloquear durante una hora a quienes reincidan. Estos registros se borran al cabo de un día.</p>

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
  ${host}
  <li>Para que los enlaces sean aptos para toda la familia, el nombre de los sitios enlazados (no el enlace completo) se comprueba con el servicio «1.1.1.1 for Families» de Cloudflare.</li>
  <li>El responsable del tratamiento te envía tu enlace privado desde su propia cuenta de correo, así que su proveedor de correo también tiene tu dirección y una copia de ese mensaje. La aplicación no envía correos.</li>
  <li>Los enlaces de productos que escribes los consulta el servidor de la aplicación, no tu navegador, y las fotos de los productos también pasan por el servidor, así que las tiendas nunca ven tu visita.</li>
  <li>Los tipos de cambio vienen del Banco Central Europeo (a través de frankfurter.dev); no se envía ningún dato personal.</li>
</ul>

<h2>Cuánto tiempo se guardan</h2>
<p>Todos los datos de un grupo se borran automáticamente en los dos días siguientes a su fecha de fin, que aparece en tu página (por defecto, el 31 de enero). Las copias de seguridad de la base de datos se guardan 7 días, así que los datos borrados pueden permanecer en ellas hasta 7 días más. Las búsquedas de productos se guardan un día.</p>

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

  nb: (host) => html`<h2>Hva som lagres</h2>
<ul>
  <li>Navnet og e-postadressen din, lagt inn av behandlingsansvarlig.</li>
  <li>Ønskene du skriver, med eventuelle lenker, og produktnavn, bildeadresse og pris hentet fra disse lenkene.</li>
  <li>Hvem du skal gi en gave til.</li>
  <li>I ett døgn: når du slo opp produktlenker, for å begrense antall oppslag.</li>
</ul>
<p>Appen lagrer ikke IP-adressen din, bruker ikke analyse eller sporing, og viser ikke e-postadressen din til andre deltakere.</p>
<p>For å holde nettstedet sikkert (behandlingsansvarliges berettigede interesse) registrerer webserveren IP-adressen, og ingenting annet, til besøkende som går over grensene for antall forespørsler, slik at gjentatte overtramp kan blokkeres i en time. Disse registreringene slettes etter ett døgn.</p>

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
  ${host}
  <li>For at lenker skal være familievennlige, sjekkes navnet på nettstedene det lenkes til (ikke hele lenken) med Cloudflares tjeneste «1.1.1.1 for Families».</li>
  <li>Behandlingsansvarlig sender deg den private lenken fra sin egen e-postkonto, så e-postleverandøren deres har også adressen din og en kopi av meldingen. Appen sender ingen e-post selv.</li>
  <li>Produktlenker du legger inn, hentes av appens server, ikke nettleseren din, og produktbilder sendes videre av serveren, så butikkene ser aldri besøket ditt.</li>
  <li>Valutakurser hentes fra Den europeiske sentralbanken (via frankfurter.dev); ingen personopplysninger sendes.</li>
</ul>

<h2>Hvor lenge de lagres</h2>
<p>Alle data for en gruppe slettes automatisk innen to dager etter gruppens sluttdato, som står på siden din (som standard 31. januar). Sikkerhetskopier av databasen beholdes i 7 dager, så slettede data kan ligge i dem i opptil 7 dager til. Produktoppslag lagres i ett døgn.</p>

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

export function privacyPage(ctx: Ctx): Response {
  return page(
    ctx,
    ctx.t.privacyTitle,
    html`<h1>${ctx.t.privacyTitle}</h1>
<section class="card notice-text">${WHO[ctx.lang]}${REST[ctx.lang](HOSTING[ctx.lang])}</section>`,
  );
}
