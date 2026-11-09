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
  unavailableTitle: "Back soon",
  unavailableHeading: "Santa's sleigh is being serviced 🛷",
  unavailableText: "The site is restarting or being updated. Please try again in a minute: your wishes are safe.",
  unavailableSaving: "If you were saving your wishes, go back and save them again.",
  tryAgain: "🔄 Try again",
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
  revealGiftee: "🤫 Tap to see whom you give to",
  hideGiftee: "Hide",
  checkAgain: "🔄 Check again",
  theirWishes: (name: string) => `${name}'s wish list:`,
  noWishYet: (name: string) => `${name} hasn't added any wishes yet. Check back later!`,
  notDrawnHeading: "The draw hasn't happened yet",
  notDrawnText:
    "Santa's elves are still shuffling the names. Come back to this page later to find out whom you give a present to.",
  yourWishes: "Your wish list",
  wishesLater: "You can change your list at any time: open this page again from the link in your email.",
  wishesHelp: `Up to ${MAX_WISHES} ideas. Paste a link to a product if you have one: we look up its name, photo and price.`,
  saved: "✨ Your wish list has been saved.",
  idea: (n: number) => `Idea ${n}`,
  ideaText: "Description, or a note about the link",
  ideaLink: "Link to the product (optional)",
  lookingUp: "🔎 Looking up the product…",
  nothingFound: "Couldn't read product details from that page. Please add a description.",
  tooManyLookups: "Too many product lookups for now. Try again in an hour, or just add a description.",
  familyPolicy:
    "Keep it family-friendly: links to adult or harmful websites are refused, and the organiser can remove wishes that aren't suitable for everyone.",
  notFamilyFriendly: (host: string) => `Links to ${host} aren't allowed: the site is classed as not family-friendly.`,
  blockedLink: "That link isn't allowed: the site is classed as not family-friendly.",
  clearWishes: "Review",
  clearWishesConfirm: "Clear all their wishes",
  currency: "Currency",
  budget: "Suggested budget",
  overBudget: "Over the suggested budget",
  budgetHelp:
    "A guide for everyone, not a rule: nothing is enforced. Leave the amount empty for no budget. Other currencies are shown converted and rounded, using the European Central Bank's daily rates.",
  budgetAmount: "Amount",
  saveBudget: "Save budget",
  badBudget: "The budget must be a positive number.",
  privacy: "Privacy",
  footerController: "Data controller",
  footerHosting: "Hosted by",
  privacyTitle: "Privacy notice",
  yourData: "Your data",
  controller: "Data controller (responsible for your data):",
  groupOrganiser: "Group organiser:",
  controllerNotSet: "The data controller hasn't been named yet. Ask whoever sent you your link.",
  deletedOn: (date: string) => `All data for this group is deleted automatically after ${date}.`,
  yourDataHelp:
    "You can change or delete your wishes above at any time. To correct your name or email address, or to be removed with all your data, contact the data controller.",
  downloadData: "Download my data",
  privacyLink: "How your data is handled",
  organiserHeading: "Group organiser and data deletion",
  organiserHelp:
    "Optional: whom participants can contact about this group, if not the data controller. Within two days after the end date, the group and all its data are deleted automatically.",
  organiserLabel: "Group organiser's name and email (optional)",
  endsOnLabel: "End date",
  controllerWarning:
    "Name the data controller on the admin home page before sending links: the privacy notice must say who is responsible for participants' data.",
  controllerHeading: "Data controller",
  controllerHelp:
    "Named in the privacy notice as responsible for all participants' data (GDPR). This is normally the person or organisation running the Secret Santa: whoever uses this admin page.",
  controllerName: "Name of person or organisation",
  controllerContact: "Contact email or postal address",
  needController: "Please give the data controller's name and contact details.",
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
    `Drawn on ${date} UTC. Adding or removing someone cancels the draw, so draw again afterwards. Everyone keeps the same private link: only people you add need to be sent theirs.`,
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
  redrawConfirm: "Yes, redraw: people will get someone new to give to (their links stay the same)",
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
  organiserPageNote: "Organiser's page for this group. Keep this page's link to yourself: anyone with it can manage the group.",
  invitesHeading: "Invitation links",
  organiserLinkHeading: "Organiser's link",
  organiserLinkHelp:
    "Send this to the group's organiser: it lets them add and remove people, send them their links, open the join link and draw names, without the admin password. They can't see the circle or delete the group.",
  joinLinkHeading: "Join link",
  joinLinkHelp:
    "Share this in a group chat (Teams, say): people add their own name and email and get their private link straight away. It only works until the cut-off date, and stops once names are drawn.",
  joiningOpenUntil: (date: string) => `People can join with the link until the end of ${date} (UTC).`,
  joiningClosedDrawn: "The join link is closed: names have been drawn.",
  joiningClosedPast: "The join link is closed: the cut-off date has passed. Choose a later date to open it again.",
  joiningOff: "The join link is off. Choose a cut-off date to open it.",
  cutoffLabel: "Last day to join (cut-off)",
  cutoffHelp:
    "At the latest Christmas Eve (24 December). Names can only be drawn once the cut-off day is over, so choose a day that leaves time to buy presents. Leave the date empty to turn the join link off.",
  badCutoff: "Choose a valid cut-off date, no later than Christmas Eve (24 December) or the group's end date.",
  renewLinksHelp: "If the organiser's link or the join link got to the wrong people, make new ones: the old links stop working. Participants' private links don't change.",
  renewLinksConfirm: "Yes, replace both links",
  renewLinks: "Make new invitation links",
  selfJoined: "Joined with the join link",
  selfJoinedHelp: "Joined with the join link and already has their private link.",
  drawAfterCutoff: (date: string) =>
    `People can still join until the end of ${date}, so names can be drawn after that. To draw sooner, clear the cut-off date above, which closes the join link.`,
  joinTitle: (chain: string) => `Join ${chain}`,
  joinLead: "Add your name and email address to take part. You'll get your own private page straight away, where you can write your wish list.",
  joinUntil: (date: string) => `You can join until the end of ${date}. Names are drawn after that.`,
  joinName: "Your name (as others in the group know you)",
  joinEmail: "Your email address",
  joinButton: "Join the Secret Santa",
  joinPrivacy:
    "Everyone in the group sees your name and wishes. Your email address is seen only by the organiser and the data controller, to send you your link if you lose it.",
  joinNeedNameEmail: "Please give your name and a valid email address.",
  joinEmailListed:
    "Someone with this email address is already on the list. If that's you, you're already in: use the private link you were given, or ask the organiser to send it to you again.",
  joinNameListed: (name: string) =>
    `There's already someone called ${name} on the list. If that's you, you're already in: ask the organiser for your link rather than joining twice. If you're someone else, add a surname or initial so people can tell you apart, or tick the box to join anyway.`,
  joinSameNameConfirm: "I'm a different person with the same name",
  joinFull: "This group can't take any more people through the join link. Ask the organiser to add you.",
  joinNotOpen: "Joining isn't open. Ask the organiser if you want to take part.",
  joinClosed: "Joining is closed: the cut-off date has passed. Ask the organiser if you still want to take part.",
  joinClosedDrawn: "Joining is closed: the names have already been drawn. Ask the organiser if you still want to take part.",
  joinedHeading: "🎉 You're in!",
  joinedText:
    "This is your private page. Save its link now (bookmark it, or email it to yourself): it is the only way back here, and you'll need it to see whom you give to after the draw.",
  joinedEmailMyself: "Email this link to myself",
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
  unavailableTitle: "Volvemos pronto",
  unavailableHeading: "Estamos revisando el trineo de Santa 🛷",
  unavailableText: "El sitio se está reiniciando o actualizando. Vuelve a intentarlo en un minuto: tus deseos están a salvo.",
  unavailableSaving: "Si estabas guardando tus deseos, vuelve atrás y guárdalos de nuevo.",
  tryAgain: "🔄 Volver a intentar",
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
  revealGiftee: "🤫 Toca para ver a quién le das el regalo",
  hideGiftee: "Ocultar",
  checkAgain: "🔄 Volver a mirar",
  theirWishes: (name) => `Lista de deseos de ${name}:`,
  noWishYet: (name) => `${name} todavía no ha añadido ningún deseo. ¡Vuelve más tarde!`,
  notDrawnHeading: "Todavía no se ha hecho el sorteo",
  notDrawnText:
    "Los elfos de Papá Noel todavía están mezclando los nombres. Vuelve a esta página más tarde para saber a quién le haces un regalo.",
  yourWishes: "Tu lista de deseos",
  wishesLater: "Puedes cambiar tu lista cuando quieras: vuelve a abrir esta página desde el enlace de tu correo.",
  wishesHelp: `Hasta ${MAX_WISHES} ideas. Si tienes un enlace a un producto, pégalo: buscaremos su nombre, foto y precio.`,
  saved: "✨ Se ha guardado tu lista de deseos.",
  idea: (n) => `Idea ${n}`,
  ideaText: "Descripción, o una nota sobre el enlace",
  ideaLink: "Enlace al producto (opcional)",
  lookingUp: "🔎 Buscando el producto…",
  nothingFound: "No se han podido leer los datos del producto de esa página. Añade una descripción.",
  tooManyLookups: "Demasiadas búsquedas de productos por ahora. Vuelve a intentarlo dentro de una hora, o añade una descripción.",
  familyPolicy:
    "Que sea apto para toda la familia: se rechazan los enlaces a sitios para adultos o dañinos, y quien organiza puede quitar los deseos que no sean adecuados para todos.",
  notFamilyFriendly: (host) => `No se permiten enlaces a ${host}: el sitio está clasificado como no apto para toda la familia.`,
  blockedLink: "Ese enlace no está permitido: el sitio está clasificado como no apto para toda la familia.",
  clearWishes: "Revisar",
  clearWishesConfirm: "Borrar todos sus deseos",
  currency: "Moneda",
  budget: "Presupuesto sugerido",
  overBudget: "Supera el presupuesto sugerido",
  budgetHelp:
    "Una orientación para todos, no una norma: no se impone nada. Deja la cantidad vacía si no hay presupuesto. Las demás monedas se muestran convertidas y redondeadas con los tipos de cambio diarios del Banco Central Europeo.",
  budgetAmount: "Cantidad",
  saveBudget: "Guardar presupuesto",
  badBudget: "El presupuesto debe ser un número positivo.",
  privacy: "Privacidad",
  footerController: "Responsable del tratamiento",
  footerHosting: "Alojamiento",
  privacyTitle: "Aviso de privacidad",
  yourData: "Tus datos",
  controller: "Responsable del tratamiento (de tus datos):",
  groupOrganiser: "Quien organiza el grupo:",
  controllerNotSet: "Todavía no se ha indicado quién es el responsable del tratamiento. Pregunta a quien te envió tu enlace.",
  deletedOn: (date) => `Todos los datos de este grupo se borran automáticamente después del ${date}.`,
  yourDataHelp:
    "Puedes cambiar o borrar tus deseos arriba cuando quieras. Para corregir tu nombre o tu correo, o para que te quiten del grupo con todos tus datos, ponte en contacto con el responsable del tratamiento.",
  downloadData: "Descargar mis datos",
  privacyLink: "Cómo se tratan tus datos",
  organiserHeading: "Organización del grupo y borrado de datos",
  organiserHelp:
    "Opcional: a quién pueden dirigirse los participantes sobre este grupo, si no es el responsable del tratamiento. En los dos días siguientes a la fecha de fin, el grupo y todos sus datos se borran automáticamente.",
  organiserLabel: "Nombre y correo de quien organiza el grupo (opcional)",
  endsOnLabel: "Fecha de fin",
  controllerWarning:
    "Indica quién es el responsable del tratamiento en la página principal de administración antes de enviar los enlaces: el aviso de privacidad debe decir quién es responsable de los datos.",
  controllerHeading: "Responsable del tratamiento",
  controllerHelp:
    "Aparece en el aviso de privacidad como responsable de los datos de todos los participantes (RGPD). Normalmente es la persona u organización que organiza el Santa Secreto: quien usa esta página de administración.",
  controllerName: "Nombre de la persona u organización",
  controllerContact: "Correo o dirección postal de contacto",
  needController: "Indica el nombre y los datos de contacto del responsable del tratamiento.",
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
    `Sorteo realizado el ${date} UTC. Si añades o quitas a alguien, se anula el sorteo, así que vuelve a sortear después. Todos conservan su enlace privado: solo hay que enviárselo a las personas que añadas.`,
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
  redrawConfirm: "Sí, volver a sortear: a cada persona le tocará alguien nuevo (los enlaces no cambian)",
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
  organiserPageNote: "Página de quien organiza este grupo. No compartas el enlace de esta página: cualquiera que lo tenga puede gestionar el grupo.",
  invitesHeading: "Enlaces de invitación",
  organiserLinkHeading: "Enlace para quien organiza",
  organiserLinkHelp:
    "Envíaselo a quien organiza el grupo: le permite añadir y quitar personas, enviarles sus enlaces, abrir el enlace para unirse y hacer el sorteo, sin la contraseña de administración. No puede ver el círculo ni borrar el grupo.",
  joinLinkHeading: "Enlace para unirse",
  joinLinkHelp:
    "Compártelo en un chat del grupo (por ejemplo, en Teams): cada persona añade su nombre y su correo y recibe su enlace privado al momento. Solo funciona hasta la fecha límite y deja de funcionar al hacer el sorteo.",
  joiningOpenUntil: (date) => `Se puede unir con el enlace hasta el final del ${date} (UTC).`,
  joiningClosedDrawn: "El enlace para unirse está cerrado: ya se ha hecho el sorteo.",
  joiningClosedPast: "El enlace para unirse está cerrado: la fecha límite ya ha pasado. Elige una fecha posterior para volver a abrirlo.",
  joiningOff: "El enlace para unirse está desactivado. Elige una fecha límite para abrirlo.",
  cutoffLabel: "Último día para unirse (fecha límite)",
  cutoffHelp:
    "Como muy tarde, el 24 de diciembre (Nochebuena). El sorteo solo se puede hacer cuando termine el día límite, así que elige un día que deje tiempo para comprar los regalos. Deja la fecha vacía para desactivar el enlace para unirse.",
  badCutoff: "Elige una fecha límite válida, que no sea posterior al 24 de diciembre (Nochebuena) ni a la fecha de fin del grupo.",
  renewLinksHelp: "Si el enlace para quien organiza o el enlace para unirse ha llegado a quien no debía, crea otros nuevos: los antiguos dejan de funcionar. Los enlaces privados de los participantes no cambian.",
  renewLinksConfirm: "Sí, sustituir los dos enlaces",
  renewLinks: "Crear nuevos enlaces de invitación",
  selfJoined: "Se unió con el enlace para unirse",
  selfJoinedHelp: "Se unió con el enlace para unirse y ya tiene su enlace privado.",
  drawAfterCutoff: (date) =>
    `Todavía es posible unirse hasta el final del ${date}, así que el sorteo se podrá hacer después. Para sortear antes, borra la fecha límite de arriba, lo que cierra el enlace para unirse.`,
  joinTitle: (chain) => `Únete a ${chain}`,
  joinLead: "Añade tu nombre y tu correo para participar. Recibirás tu propia página privada al momento, donde puedes escribir tu lista de deseos.",
  joinUntil: (date) => `Puedes unirte hasta el final del ${date}. El sorteo se hace después.`,
  joinName: "Tu nombre (como te conocen en el grupo)",
  joinEmail: "Tu dirección de correo",
  joinButton: "Unirme al Santa Secreto",
  joinPrivacy:
    "Todo el grupo ve tu nombre y tus deseos. Tu correo solo lo ven quien organiza y el responsable del tratamiento, para enviarte tu enlace si lo pierdes.",
  joinNeedNameEmail: "Indica tu nombre y una dirección de correo válida.",
  joinEmailListed:
    "Ya hay alguien en la lista con esta dirección de correo. Si eres tú, ya estás dentro: usa el enlace privado que recibiste, o pide a quien organiza que te lo vuelva a enviar.",
  joinNameListed: (name) =>
    `Ya hay alguien en la lista que se llama ${name}. Si eres tú, ya estás dentro: pide tu enlace a quien organiza en lugar de unirte dos veces. Si eres otra persona, añade un apellido o una inicial para que se os distinga, o marca la casilla para unirte igualmente.`,
  joinSameNameConfirm: "Soy otra persona con el mismo nombre",
  joinFull: "Este grupo no admite más personas con el enlace para unirse. Pide a quien organiza que te añada.",
  joinNotOpen: "No está abierto para unirse. Pregunta a quien organiza si quieres participar.",
  joinClosed: "Ya no es posible unirse: la fecha límite ha pasado. Pregunta a quien organiza si todavía quieres participar.",
  joinClosedDrawn: "Ya no es posible unirse: ya se ha hecho el sorteo. Pregunta a quien organiza si todavía quieres participar.",
  joinedHeading: "🎉 ¡Ya estás dentro!",
  joinedText:
    "Esta es tu página privada. Guarda su enlace ahora (en marcadores, o envíatelo por correo): es la única forma de volver aquí, y lo necesitarás para ver a quién le haces el regalo después del sorteo.",
  joinedEmailMyself: "Enviarme este enlace por correo",
};

const nb: Dict = {
  langName: "Norsk",
  flag: "🇳🇴",
  siteTitle: "Hemmelig nisse",
  footer: "Ho ho ho! ❄️",
  language: "Språk",
  errorTitle: "Oi",
  errorHeading: "Å nei, bare kull i strømpen!",
  unavailableTitle: "Straks tilbake",
  unavailableHeading: "Nissens slede er på service 🛷",
  unavailableText: "Nettstedet starter på nytt eller blir oppdatert. Prøv igjen om et minutt: ønskene dine er trygge.",
  unavailableSaving: "Hvis du holdt på å lagre ønskene dine, gå tilbake og lagre dem på nytt.",
  tryAgain: "🔄 Prøv igjen",
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
  revealGiftee: "🤫 Trykk for å se hvem du gir til",
  hideGiftee: "Skjul",
  checkAgain: "🔄 Sjekk igjen",
  theirWishes: (name) => `Ønskelisten til ${name}:`,
  noWishYet: (name) => `${name} har ikke lagt inn noen ønsker ennå. Kom tilbake senere!`,
  notDrawnHeading: "Trekningen har ikke skjedd ennå",
  notDrawnText:
    "Nissens alver stokker fortsatt navnene. Kom tilbake hit senere for å se hvem du skal gi en gave til.",
  yourWishes: "Din ønskeliste",
  wishesLater: "Du kan endre listen når som helst: åpne denne siden igjen fra lenken i e-posten din.",
  wishesHelp: `Opptil ${MAX_WISHES} ideer. Lim inn en lenke til et produkt hvis du har en, så henter vi navn, bilde og pris.`,
  saved: "✨ Ønskelisten din er lagret.",
  idea: (n) => `Idé ${n}`,
  ideaText: "Beskrivelse, eller en merknad om lenken",
  ideaLink: "Lenke til produktet (valgfritt)",
  lookingUp: "🔎 Slår opp produktet …",
  nothingFound: "Fant ikke produktinformasjon på den siden. Skriv gjerne en beskrivelse.",
  tooManyLookups: "For mange produktoppslag akkurat nå. Prøv igjen om en time, eller skriv bare en beskrivelse.",
  familyPolicy:
    "Hold det familievennlig: lenker til nettsteder for voksne eller skadelige nettsteder avvises, og arrangøren kan fjerne ønsker som ikke passer for alle.",
  notFamilyFriendly: (host) => `Lenker til ${host} er ikke tillatt: nettstedet er klassifisert som ikke familievennlig.`,
  blockedLink: "Den lenken er ikke tillatt: nettstedet er klassifisert som ikke familievennlig.",
  clearWishes: "Gå gjennom",
  clearWishesConfirm: "Fjern alle ønskene deres",
  currency: "Valuta",
  budget: "Foreslått budsjett",
  overBudget: "Over foreslått budsjett",
  budgetHelp:
    "En rettesnor for alle, ikke en regel: ingenting håndheves. La beløpet stå tomt hvis dere ikke vil ha et budsjett. Andre valutaer vises omregnet og avrundet etter Den europeiske sentralbankens dagskurser.",
  budgetAmount: "Beløp",
  saveBudget: "Lagre budsjett",
  badBudget: "Budsjettet må være et positivt tall.",
  privacy: "Personvern",
  footerController: "Behandlingsansvarlig",
  footerHosting: "Driftet hos",
  privacyTitle: "Personvernerklæring",
  yourData: "Dine data",
  controller: "Behandlingsansvarlig (ansvarlig for dataene dine):",
  groupOrganiser: "Arrangør for gruppen:",
  controllerNotSet: "Behandlingsansvarlig er ikke oppgitt ennå. Spør den som sendte deg lenken.",
  deletedOn: (date) => `Alle data for denne gruppen slettes automatisk etter ${date}.`,
  yourDataHelp:
    "Du kan endre eller slette ønskene dine ovenfor når som helst. For å rette navnet eller e-postadressen din, eller bli fjernet med alle dataene dine, kontakt behandlingsansvarlig.",
  downloadData: "Last ned dataene mine",
  privacyLink: "Slik behandles dataene dine",
  organiserHeading: "Gruppens arrangør og sletting av data",
  organiserHelp:
    "Valgfritt: hvem deltakerne kan kontakte om denne gruppen, hvis det ikke er behandlingsansvarlig. Innen to dager etter sluttdatoen slettes gruppen og alle dataene automatisk.",
  organiserLabel: "Navn og e-post til gruppens arrangør (valgfritt)",
  endsOnLabel: "Sluttdato",
  controllerWarning:
    "Oppgi behandlingsansvarlig på startsiden for administrasjon før du sender lenkene: personvernerklæringen må si hvem som er ansvarlig for dataene.",
  controllerHeading: "Behandlingsansvarlig",
  controllerHelp:
    "Oppgis i personvernerklæringen som ansvarlig for alle deltakernes data (personvernforordningen). Vanligvis personen eller organisasjonen som arrangerer hemmelig nisse: den som bruker denne administrasjonssiden.",
  controllerName: "Navn på person eller organisasjon",
  controllerContact: "E-post eller postadresse for kontakt",
  needController: "Oppgi navn og kontaktinformasjon for behandlingsansvarlig.",
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
    `Trukket ${date} UTC. Hvis du legger til eller fjerner noen, blir trekningen annullert, så trekk på nytt etterpå. Alle beholder den samme private lenken: bare de du legger til, må få tilsendt sin.`,
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
  redrawConfirm: "Ja, trekk på nytt: folk får en ny person å gi til (lenkene er de samme)",
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
  organiserPageNote: "Arrangørens side for denne gruppen. Ikke del lenken til denne siden: alle som har den, kan administrere gruppen.",
  invitesHeading: "Invitasjonslenker",
  organiserLinkHeading: "Lenke for arrangøren",
  organiserLinkHelp:
    "Send denne til gruppens arrangør: med den kan de legge til og fjerne folk, sende dem lenkene deres, åpne påmeldingslenken og trekke navn, uten administratorpassordet. De kan ikke se sirkelen eller slette gruppen.",
  joinLinkHeading: "Påmeldingslenke",
  joinLinkHelp:
    "Del denne i en gruppechat (for eksempel i Teams): folk skriver inn navn og e-post selv og får sin private lenke med en gang. Den virker bare fram til fristen, og slutter å virke når navnene er trukket.",
  joiningOpenUntil: (date) => `Folk kan melde seg på med lenken til og med ${date} (UTC).`,
  joiningClosedDrawn: "Påmeldingslenken er stengt: navnene er trukket.",
  joiningClosedPast: "Påmeldingslenken er stengt: fristen har gått ut. Velg en senere dato for å åpne den igjen.",
  joiningOff: "Påmeldingslenken er slått av. Velg en frist for å åpne den.",
  cutoffLabel: "Siste dag for påmelding (frist)",
  cutoffHelp:
    "Senest julaften (24. desember). Navnene kan først trekkes når fristdagen er over, så velg en dag som gir tid til å kjøpe gaver. La datoen stå tom for å slå av påmeldingslenken.",
  badCutoff: "Velg en gyldig frist, ikke senere enn julaften (24. desember) eller gruppens sluttdato.",
  renewLinksHelp: "Hvis lenken for arrangøren eller påmeldingslenken har kommet til feil personer, lag nye: de gamle slutter å virke. Deltakernes private lenker endres ikke.",
  renewLinksConfirm: "Ja, erstatt begge lenkene",
  renewLinks: "Lag nye invitasjonslenker",
  selfJoined: "Meldte seg på med påmeldingslenken",
  selfJoinedHelp: "Meldte seg på med påmeldingslenken og har allerede sin private lenke.",
  drawAfterCutoff: (date) =>
    `Folk kan fortsatt melde seg på til og med ${date}, så navnene kan trekkes etter det. For å trekke tidligere, fjern fristen over, som stenger påmeldingslenken.`,
  joinTitle: (chain) => `Bli med i ${chain}`,
  joinLead: "Skriv inn navn og e-postadresse for å være med. Du får din egen private side med en gang, der du kan skrive ønskelisten din.",
  joinUntil: (date) => `Du kan melde deg på til og med ${date}. Navnene trekkes etter det.`,
  joinName: "Navnet ditt (slik de andre i gruppen kjenner deg)",
  joinEmail: "E-postadressen din",
  joinButton: "Bli med på hemmelig nisse",
  joinPrivacy:
    "Alle i gruppen ser navnet ditt og ønskene dine. E-postadressen din ser bare arrangøren og behandlingsansvarlig, for å kunne sende deg lenken hvis du mister den.",
  joinNeedNameEmail: "Skriv inn navnet ditt og en gyldig e-postadresse.",
  joinEmailListed:
    "Noen med denne e-postadressen står allerede på listen. Er det deg, er du allerede med: bruk den private lenken du fikk, eller be arrangøren sende den til deg igjen.",
  joinNameListed: (name) =>
    `Det står allerede noen som heter ${name} på listen. Er det deg, er du allerede med: be arrangøren om lenken din i stedet for å melde deg på to ganger. Er du en annen, legg til etternavn eller forbokstav så folk kan skille dere, eller kryss av i boksen for å melde deg på likevel.`,
  joinSameNameConfirm: "Jeg er en annen person med samme navn",
  joinFull: "Denne gruppen kan ikke ta inn flere via påmeldingslenken. Be arrangøren legge deg til.",
  joinNotOpen: "Påmeldingen er ikke åpen. Spør arrangøren hvis du vil være med.",
  joinClosed: "Påmeldingen er stengt: fristen har gått ut. Spør arrangøren hvis du fortsatt vil være med.",
  joinClosedDrawn: "Påmeldingen er stengt: navnene er allerede trukket. Spør arrangøren hvis du fortsatt vil være med.",
  joinedHeading: "🎉 Du er med!",
  joinedText:
    "Dette er din private side. Lagre lenken nå (som bokmerke, eller send den til deg selv på e-post): det er den eneste veien tilbake hit, og du trenger den for å se hvem du skal gi til etter trekningen.",
  joinedEmailMyself: "Send denne lenken til meg selv",
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
  /** Rendering a static page (build time): no currency switcher, no per-site footer. */
  static?: boolean;
  /** For the footer of interactive pages: who is responsible, and who hosts it. */
  dataController?: string;
  hosting?: string;
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
