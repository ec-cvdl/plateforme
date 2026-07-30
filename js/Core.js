/* const API est maintenant tout en haut du fichier (juste après <head>), pour être
   facile à trouver — ne la redéclare pas ici, elle est déjà accessible partout. */
let modeleFacturationUrl = 'https://docs.google.com/spreadsheets/d/1buUwl_I6t2MXw96FWbXRVF8wLkVGZwZasM4xsDIqDGw'; // repli tant que /reglages n'a pas répondu, puis mis à jour dynamiquement

const STATUTS_COMMANDE = ['Reçue','Validée','Préparée','En cours de livraison','Livrée','Annulée'];
const STATUTS_PAIEMENT = ['Non payé','Lien envoyé','Payé','Remboursé'];
const STATUTS_COMPTABLES = ['Non rapproché','Rapproché','Clôturé'];
const MOYENS_PAIEMENT = ['Paiement en ligne (CB)','Virement (RN uniquement)','Chèque','Espèces','Paiement mixte','Chorus Pro','Subventions'];

/* Chaque statut porte sa teinte */
const TEINTES = {
  'Reçue':'t-ambre',   'Validée':'t-bleu',   'Préparée':'t-violet',
  'En cours de livraison':'t-orange', 'Livrée':'t-vert',   'Annulée':'t-gris',
  'Non payé':'t-rouge','Lien envoyé':'t-ambre','Payé':'t-vert','Remboursé':'t-gris'
};

/* Icônes de statut, même style de tracé que les icônes produit */
const ICONES_STATUT = {
  'Reçue':              '<path d="M3 7.5 12 3l9 4.5M3 7.5v9L12 21l9-4.5v-9M3 7.5 12 12m0 0 9-4.5M12 12v9"/>',
  'Validée':             '<path d="M4 12.5l5.5 5.5L20 7"/>',
  'Préparée':            '<rect x="4" y="8" width="16" height="12" rx="1.2"/><path d="M4 8l8-5 8 5M9 12v4M15 12v4"/>',
  'En cours de livraison': '<rect x="1.5" y="8.5" width="12" height="8" rx="1"/><path d="M13.5 11h4l3 3v2.5h-7z"/><circle cx="6" cy="18.5" r="1.6"/><circle cx="16.5" cy="18.5" r="1.6"/>',
  'Livrée':              '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>',
  'Annulée':             '<path d="M6 6l12 12M18 6 6 18"/>',
  'Non payé':            '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v6"/><circle cx="12" cy="16.5" r="0.9" fill="currentColor" stroke="none"/>',
  'Lien envoyé':         '<path d="M9 15l6-6M10 8l1.5-1.5a3 3 0 0 1 4.2 4.2L14 12M14 16l-1.5 1.5a3 3 0 0 1-4.2-4.2L10 12"/>',
  'Payé':                '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.7a2.3 2.3 0 0 1 2.3-1.9c1.4 0 2.4 1 2.4 2.1 0 2.6-4.7 1.9-4.7 4.6 0 1.2 1 2.1 2.4 2.1a2.3 2.3 0 0 0 2.3-1.9M12 6.5v11"/>',
  'Remboursé':           '<path d="M4 8h11a5 5 0 0 1 0 10h-3"/><path d="M8 4 4 8l4 4"/>'
};
/** Mini timeline de progression pour une commande — les statuts de commande restent fixes
 *  (contrairement au SAV, entièrement paramétrable), donc une frise a du sens ici. Volontairement
 *  très légère : une simple piste avec une épingle positionnée, en bas de carte, pour ne pas
 *  perturber le reste de la fiche. */
const ETAPES_TIMELINE_COMMANDE = ['Reçue', 'Validée', 'Préparée', 'En cours de livraison', 'Livrée'];
const LIBELLES_COURTS_TIMELINE = {
  'Reçue': 'Reçue', 'Validée': 'Validée', 'Préparée': 'Préparée',
  'En cours de livraison': 'En livraison', 'Livrée': 'Livrée'
};

function construireTimelineCommande(statutActuel){
  const indexActuel = ETAPES_TIMELINE_COMMANDE.indexOf(statutActuel);
  if(indexActuel === -1) return '';
  const etapes = ETAPES_TIMELINE_COMMANDE.map((etape, i) => {
    const cls = i < indexActuel ? 'fait' : (i === indexActuel ? 'actuel' : '');
    return `<div class="tlc-etape ${cls}">
      <div class="tlc-point ${cls}"></div>
      <div class="tlc-libelle ${cls}">${echapper(LIBELLES_COURTS_TIMELINE[etape] || etape)}</div>
    </div>`;
  }).join('');
  return `<div class="timeline-commande" title="${echapper(statutActuel)}">
    <div class="tlc-piste">${etapes}</div>
  </div>`;
}

function badgeStatut(statut){
  const teinte = TEINTES[statut] || 't-gris';
  const trace = ICONES_STATUT[statut] || '';
  return `<span class="badge-statut ${teinte}">` +
    (trace ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${trace}</svg>` : '') +
    `${echapper(statut)}</span>`;
}

const $ = id => document.getElementById(id);
const $$ = sel => Array.from(document.querySelectorAll(sel));

/* ─── Nom de l'organisation (affiché en haut, configurable dans Réglages) ─── */
function appliquerNomOrganisation(nom){
  const suffixe = 'Suivi des commandes';
  const titre = nom ? (nom + ' — ' + suffixe) : suffixe;
  if($('titre-connexion')) $('titre-connexion').textContent = titre;
  if($('titre-entete')) $('titre-entete').textContent = titre;
}

function appliquerLienDossierFactures(dossierId){
  dossierFacturesPdfId = dossierId || '';
  const bouton = $('btn-ouvrir-dossier-factures');
  if(!bouton) return;
  if(dossierFacturesPdfId){
    bouton.href = 'https://drive.google.com/drive/folders/' + dossierFacturesPdfId;
    bouton.hidden = false;
  }else{
    bouton.hidden = true;
  }
}

function appliquerLienFichierNumerotation(fichierId){
  const bouton = $('btn-ouvrir-fichier-numerotation');
  if(!bouton) return;
  if(fichierId){
    bouton.href = 'https://docs.google.com/spreadsheets/d/' + fichierId + '/edit';
    bouton.hidden = false;
  }else{
    bouton.hidden = true;
  }
}
// Lu sans mot de passe (pas sensible) pour que l'écran de connexion lui-même affiche déjà le bon nom.
jsonpVersUrl(urlApiActive(), {action:'organisation'})
  .then(r => { if(r.ok) appliquerNomOrganisation(r.nomOrganisation); })
  .catch(() => {});

/* Icônes, identiques à celles du formulaire public */
const ICONES = {
  telephone: '<path d="M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path d="M11 18h2"/>',
  tablette:  '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M11 18h2"/>',
  portable:  '<rect x="3.5" y="3.5" width="17" height="11" rx="1"/><path d="M8 14.5v1.3M16 14.5v1.3"/><path d="M1 18.8h22l-1.3 1.6a1 1 0 0 1-.8.4H3.1a1 1 0 0 1-.8-.4L1 18.8z"/>',
  fixe:      '<rect x="2.5" y="4" width="7" height="16" rx="1"/><circle cx="6" cy="17.3" r="1"/><rect x="12" y="6" width="9.5" height="7.5" rx="1"/><path d="M15.2 17h4.6M16.7 13.5v3.5"/>',
  telephone_touches: '<path d="M6.6 4.5c-1.1 0-2 .9-2 2 0 8.3 6.6 14.9 14.9 14.9 1.1 0 2-.9 2-2v-2.7c0-.6-.4-1.1-1-1.2l-3-.7c-.5-.1-1 .1-1.3.5l-1 1.3c-2.1-1.1-3.9-2.9-5-5l1.3-1c.4-.3.6-.8.5-1.3l-.7-3c-.1-.6-.6-1-1.2-1H6.6z"/>',
  atelier:   '<circle cx="8.5" cy="8" r="3"/><path d="M2.5 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.3"/><path d="M14.7 20c.3-2.7 2.2-4.8 4.8-5.3"/>',
  feuille:   '<path d="M5 19c0-8 4-14 14-15 1 6-1 11-5 14-3 2.2-6.5 2.5-9 1z"/><path d="M5 19c3-4 6-7 9-10"/>',
  generique: '<rect x="3.5" y="7" width="17" height="13" rx="1.5"/><path d="M3.5 11h17M8 7V5.6A1.6 1.6 0 0 1 9.6 4h4.8A1.6 1.6 0 0 1 16 5.6V7"/>'
};
function iconePour(nom, icone){
  if(icone && ICONES[icone]) return ICONES[icone];
  const n = String(nom || '').toLowerCase();
  if (/(sensibilisation|[ée]cologi|environnement)/.test(n)) return ICONES.feuille;
  if (/(atelier|animation)/.test(n)) return ICONES.atelier;
  if (/touches?/.test(n)) return ICONES.telephone_touches;
  if (/(smartphone|t[ée]l[ée]phone|mobile)/.test(n)) return ICONES.telephone;
  if (/tablet/.test(n)) return ICONES.tablette;
  if (/(portable|laptop)/.test(n)) return ICONES.portable;
  if (/(fixe|bureau|desktop|tour)/.test(n)) return ICONES.fixe;
  return ICONES.generique;
}
function svgIcone(nom, icone){
  return '<svg class="icone-produit" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + iconePour(nom, icone) + '</svg>';
}
function svgIconePuce(nom, icone){
  return '<svg class="icone-puce" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + iconePour(nom, icone) + '</svg>';
}

/* Icônes de symptôme SAV — même principe de reconnaissance par mot-clé que les produits */
const ICONES_SYMPTOME = {
  ecran:    '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/><path d="M7 10l2-2 2 2 3-3 3 3" opacity=".5"/>',
  batterie: '<rect x="2.5" y="8" width="17" height="8" rx="1.5"/><path d="M21 10.5v3"/><path d="M6 12h1.5M9 12h1.5" opacity=".6"/>',
  clavier:  '<rect x="2.5" y="6" width="19" height="12" rx="1.5"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12" opacity=".6"/>',
  souris:   '<rect x="7" y="3.5" width="10" height="17" rx="5"/><path d="M12 3.5v6" opacity=".6"/><circle cx="12" cy="8" r=".6" fill="currentColor" stroke="none"/>',
  disque_dur: '<rect x="3" y="7" width="18" height="10" rx="1.5"/><circle cx="8" cy="12" r="2.3"/><path d="M13.5 10.5h4M13.5 13.5h4" opacity=".6"/>',
  ventilateur: '<circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><path d="M12 12c0-3.5 2-6 4.5-6 1.8 0 2.5 1.4 1.3 2.8C16.3 10.3 14 11 12 12z"/><path d="M12 12c3.5 0 6 2 6 4.5 0 1.8-1.4 2.5-2.8 1.3C13.7 16.3 13 14 12 12z"/><path d="M12 12c0 3.5-2 6-4.5 6-1.8 0-2.5-1.4-1.3-2.8C7.7 13.7 10 13 12 12z"/><path d="M12 12c-3.5 0-6-2-6-4.5 0-1.8 1.4-2.5 2.8-1.3C10.3 7.7 11 10 12 12z"/>',
  enceintes: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><circle cx="12" cy="8" r="2.2"/><circle cx="12" cy="15.5" r="3.3"/><circle cx="12" cy="15.5" r="1" fill="currentColor" stroke="none"/>',
  bruyant:  '<path d="M4 10v4h3l5 4V6l-5 4H4z"/><path d="M16 9c1.5 1 1.5 5 0 6" opacity=".7"/><path d="M18.5 7c2.5 2 2.5 8 0 10" opacity=".5"/>',
  virus: '<circle cx="12" cy="12" r="5"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" opacity=".7"/>',
  generique_sav: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><circle cx="12" cy="15.5" r=".3" fill="currentColor" stroke="none"/>'
};
function iconeSymptome(texte){
  const t = String(texte || '').toLowerCase();
  if (/virus|malveillant|logiciel espion|rançongiciel|ransomware/.test(t)) return ICONES_SYMPTOME.virus;
  if (/[ée]cran/.test(t)) return ICONES_SYMPTOME.ecran;
  if (/(charge|batterie|alimentation)/.test(t)) return ICONES_SYMPTOME.batterie;
  if (/clavier/.test(t)) return ICONES_SYMPTOME.clavier;
  if (/souris/.test(t)) return ICONES_SYMPTOME.souris;
  if (/disque(\s|-)?dur|stockage|ssd|hdd/.test(t)) return ICONES_SYMPTOME.disque_dur;
  if (/ventilateur|refroidissement|surchauffe/.test(t)) return ICONES_SYMPTOME.ventilateur;
  if (/(fort|bruyant|bruit|volume)/.test(t)) return ICONES_SYMPTOME.bruyant;
  if (/(haut(\s|-)?parleur|enceinte|son|audio)/.test(t)) return ICONES_SYMPTOME.enceintes;
  return ICONES_SYMPTOME.generique_sav;
}
function svgIconeSymptome(texte){
  return '<svg class="icone-produit" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + iconeSymptome(texte) + '</svg>';
}

let motDePasse = '';
let commandes  = [];
const LIMITE_COMMANDES_DEFAUT = 20;
let limiteCommandesActuelle = LIMITE_COMMANDES_DEFAUT; // 0 = tout l'historique, une fois demandé
let totalCommandes = 0;
let seuilAlerteImpayee = 30; // valeur de repli tant que /reglages n'a pas encore répondu
let suppressionSimple = false; // idem
let dossierFacturesPdfId = ''; // idem — sert au bouton "Ouvrir le dossier" de l'onglet Factures
let fichierNumerotationConfigure = false; // idem — conditionne l'affichage de la recherche auto de numéro
let structures = [];

/* Rappels "facture manquante" masqués par l'utilisateur — persistés pour ne pas
 * réapparaître à chaque rechargement une fois traités/vus. */
let facturesManquantesRejetees = new Set();
try{
  facturesManquantesRejetees = new Set(JSON.parse(localStorage.getItem('cvdl-factures-manquantes-rejetees') || '[]'));
}catch(e){}
function rejeterAlerteFacture(reference){
  facturesManquantesRejetees.add(reference);
  try{ localStorage.setItem('cvdl-factures-manquantes-rejetees', JSON.stringify([...facturesManquantesRejetees])); }catch(e){}
}
let filtre     = 'tout';

/* ─── Réseau ─── */
function dateLivraisonISO(dateStr){
  if(!dateStr) return '';
  const [j, m, a] = dateStr.split('/');
  if(!j || !m || !a) return '';
  return `${a}-${m}-${j}`;
}

function joursDepuis(dateStr){
  if(!dateStr) return null;
  const [j, m, a] = dateStr.split('/').map(Number);
  if(!j || !m || !a) return null;
  const date = new Date(a, m - 1, j);
  const maintenant = new Date();
  date.setHours(0,0,0,0);
  maintenant.setHours(0,0,0,0);
  return Math.round((maintenant - date) / 86400000);
}

let badgeNouvelleJours = 1.5;  // en jours ouvrés, écrasé par /reglages
let badgeNouvelleSavJours = 1.5;  // idem, réglable séparément pour le SAV
let heureFinVendredi = 17;     // le badge arrête de compter le vendredi à partir de cette heure
let heureDebutLundi = 8;       // et reprend à compter le lundi à partir de cette heure

/** Une heure donnée compte-t-elle comme "ouvrée" pour le calcul du badge NEW ? Jamais le
 *  week-end ; le vendredi, plus rien ne compte après heureFinVendredi ; le lundi, rien ne
 *  compte avant heureDebutLundi — pour que le badge tienne tout un week-end sans se faire
 *  grignoter par les dernières heures du vendredi ou les premières du lundi. */
function estHeureOuvree(date){
  const jour = date.getDay(); // 0 = dimanche … 6 = samedi
  if(jour === 0 || jour === 6) return false;
  if(jour === 5 && date.getHours() >= heureFinVendredi) return false;
  if(jour === 1 && date.getHours() < heureDebutLundi) return false;
  return true;
}

/** Une commande est "nouvelle" si moins de (badgeNouvelleJours × 24) heures ouvrées se sont
 *  écoulées depuis sa réception. Avance heure par heure depuis la réception jusqu'à
 *  maintenant — arrêt dès que le seuil est dépassé, donc jamais coûteux. */
function estNouvelleCommande(dateStr, heureStr){
  if(!dateStr) return false;
  const [j, m, a] = dateStr.split('/').map(Number);
  if(!j || !m || !a) return false;
  const [h, min] = (heureStr || '00:00').split(':').map(Number);

  let curseur = new Date(a, m - 1, j, h || 0, min || 0);
  const maintenant = new Date();
  if(curseur > maintenant) return true; // horloge légèrement décalée, on ne pénalise pas

  const seuilHeures = badgeNouvelleJours * 24;
  let heuresOuvrees = 0;
  while(curseur < maintenant){
    curseur = new Date(curseur.getTime() + 3600000);
    if(estHeureOuvree(curseur)) heuresOuvrees++;
    if(heuresOuvrees >= seuilHeures) return false;
  }
  return true;
}

/** URL réellement utilisée par ce navigateur : celle validée dans l'installateur si elle existe
 *  (mémorisée localement, pour pouvoir tester tout de suite sans attendre d'avoir édité le fichier),
 *  sinon celle codée en dur ci-dessus. */
function urlApiActive(){
  return localStorage.getItem('cvdl-url-installee') || API;
}

function jsonp(params){
  return jsonpVersUrl(urlApiActive(), params);
}
function jsonpVersUrl(url, params){
  return new Promise((ok, ko) => {
    const nom = 'cb' + Date.now() + Math.floor(Math.random()*1000);
    const balise = document.createElement('script');
    const t = setTimeout(() => { nettoyer(); ko(new Error('Délai dépassé')); }, 45000);
    function nettoyer(){
      clearTimeout(t);
      // On ne supprime jamais complètement window[nom] : la balise <script> peut avoir déjà
      // reçu sa réponse réseau au moment où on abandonne côté client (gros jeu de données,
      // redémarrage à froid d'Apps Script...) — si elle arrive après coup, elle appellera
      // quand même ce nom de fonction. Un no-op évite un "ReferenceError" bruyant en console
      // pour une réponse qu'on n'attend de toute façon plus.
      window[nom] = () => {};
      balise.remove();
    }
    window[nom] = d => { nettoyer(); ok(d); };
    balise.src = url + '?' + new URLSearchParams({...params, callback:nom});
    balise.onerror = () => { nettoyer(); ko(new Error('Connexion impossible')); };
    document.body.appendChild(balise);
  });
}

function poster(data){
  return posterVersUrl(urlApiActive(), data);
}
function posterVersUrl(url, data){
  const controleur = new AbortController();
  const delai = setTimeout(() => controleur.abort(), 25000);
  return fetch(url, {
    method:'POST',
    headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify({...data, password:motDePasse}),
    signal: controleur.signal
  })
    .then(r => r.json())
    .catch(e => {
      if(e.name === 'AbortError') throw new Error('Délai dépassé — le serveur met trop de temps à répondre');
      throw e;
    })
    .finally(() => clearTimeout(delai));
}

let minuteur;
function etat(texte, type){
  $('etat').innerHTML = (type === 'chargement' ? '<span class="spinner-etat"></span>' : '') + echapper(texte);
  $('etat').className = 'visible ' + (type || 'neutre');
  clearTimeout(minuteur);
  if(type !== 'chargement'){
    minuteur = setTimeout(() => $('etat').classList.remove('visible'), 2200);
  }
}

function echapper(s){
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/** Affiche un montant arrondi à l'euro entier, sans centimes. */
function formaterMontant(montant){
  return Math.round(parseFloat(montant) || 0) + ' €';
}

/* ─── Connexion ─── */
/* ─── Mode sombre (mémorisé) ─── */
function appliquerModeSombreAdmin(actif){
  document.body.classList.toggle('mode-sombre-admin', actif);
  $('btn-mode-sombre-admin').textContent = actif ? '☀️' : '🌙';
  try{ localStorage.setItem('cvdl-admin-sombre', actif ? '1' : '0'); }catch(e){}
}
$('btn-mode-sombre-admin').addEventListener('click', () => {
  appliquerModeSombreAdmin(!document.body.classList.contains('mode-sombre-admin'));
});
try{
  if(localStorage.getItem('cvdl-admin-sombre') === '1') appliquerModeSombreAdmin(true);
}catch(e){}

/* ─── Lien du formulaire public ───
   Calculé depuis l'URL de CETTE page (admin.html) plutôt que codé en dur : fonctionne
   tel quel en local, sur Netlify, sur un sous-dossier, ou n'importe quel hébergement,
   du moment que commande.html est déployé à côté d'admin.html. */
function urlFormulairePublic(){
  const href = window.location.href;
  if(href.includes('admin.html')) return href.split('?')[0].split('#')[0].replace('admin.html', 'portail.html');
  // Repli générique si la page n'est pas servie sous le nom admin.html (ex. redirection) :
  // remplace le dernier segment du chemin par portail.html.
  try{
    const url = new URL(href);
    const segments = url.pathname.split('/');
    segments[segments.length - 1] = 'portail.html';
    url.pathname = segments.join('/');
    url.search = ''; url.hash = '';
    return url.toString();
  }catch(e){ return href; }
}
$('btn-copier-lien-formulaire').addEventListener('click', async () => {
  const b = $('btn-copier-lien-formulaire');
  try{
    await navigator.clipboard.writeText(urlFormulairePublic());
    const html = b.innerHTML;
    b.textContent = 'Lien copié !';
    setTimeout(() => { b.innerHTML = html; }, 2000);
  }catch(e){
    prompt('Copie automatique indisponible, copie ce lien manuellement :', urlFormulairePublic());
  }
});

/* ─── Déconnexion ─── */
$('btn-deconnexion').addEventListener('click', () => {
  try{ sessionStorage.removeItem('cvdl'); }catch(e){}
  motDePasse = '';
  $('app').hidden = true;
  $('connexion').hidden = false;
  $('mdp').value = '';
  $('mdp').focus();
});

let role = 'admin';

async function connecter(){
  const mdp = $('mdp').value;
  if(!mdp) return;

  $('btn-connexion').disabled = true;
  $('btn-connexion').textContent = 'Vérification…';
  $('retour-connexion').innerHTML = '';

  try{
    const r = await jsonp({action:'login', password:mdp});
    if(r.ok){
      motDePasse = mdp;
      role = r.role;
      sessionStorage.setItem('cvdl', mdp);
      localStorage.setItem('cvdl-installation-terminee', 'true'); // toute connexion réussie prouve que l'install est faite

      if(role === 'compta'){
        // Accès restreint : uniquement la vue Comptabilité, rien d'autre à charger
        $('connexion').hidden = true;
        $('app').hidden = false;
        document.querySelectorAll('.onglets button').forEach(b => {
          b.hidden = b.dataset.vue !== 'comptabilite';
        });
        document.querySelectorAll('.separateur-onglets').forEach(s => s.hidden = true);
        $('chiffres').hidden = true;
        document.querySelector('[data-vue="comptabilite"]').click();
        chargerComptabilite();
        return;
      }

      // Préchargement complet à la connexion : tout est chargé une bonne fois pour toutes,
      // avec une barre de progression, pour que la navigation entre onglets soit ensuite
      // instantanée (plus rien à recharger au clic).
      const barre = $('barre-progression-connexion');
      const remplissage = $('barre-progression-connexion-remplissage');
      const texteProgression = $('barre-progression-connexion-texte');
      barre.hidden = false;

      const etapesChargement = [
        { label: 'Commandes', fn: () => jsonp({action:'list', password:mdp, limite:LIMITE_COMMANDES_DEFAUT}).then(res => {
            if(res.ok){ commandes = res.commandes; totalCommandes = res.total; limiteCommandesActuelle = LIMITE_COMMANDES_DEFAUT; }
          }) },
        { label: 'Réglages', fn: () => jsonp({action:'reglages', password:mdp}).then(res => {
            if(!res.ok) return;
            seuilAlerteImpayee = res.seuilAlerteImpayee;
            appliquerNomOrganisation(res.nomOrganisation);
            suppressionSimple = !!res.suppressionSimple;
            appliquerLienDossierFactures(res.dossierFacturesPdf);
            appliquerLienFichierNumerotation(res.fichierNumerotation);
            fichierNumerotationConfigure = !!res.fichierNumerotation;
            badgeNouvelleJours = res.badgeNouvelleJours || 1.5;
            badgeNouvelleSavJours = res.badgeNouvelleSavJours || 1.5;
            heureFinVendredi = res.heureFinVendredi != null ? res.heureFinVendredi : 17;
            heureDebutLundi = res.heureDebutLundi != null ? res.heureDebutLundi : 8;
            if(res.symptomesSav && res.symptomesSav.length) symptomesSav = res.symptomesSav;
            appliquerOngletsVisibles(res.ongletsMasques || '');
            if(res.modeleFacturation) modeleFacturationUrl = 'https://docs.google.com/spreadsheets/d/' + res.modeleFacturation;
          }) },
        { label: 'Structures', fn: chargerStructures },
        { label: 'Produits', fn: chargerProduits },
        { label: 'Devis', fn: chargerDevis },
        { label: 'Factures', fn: chargerFactures },
        { label: 'SAV', fn: () => chargerStatutsSav().then(() => chargerSav(true)) },
        { label: 'Comptabilité', fn: chargerComptabilite }
      ];

      let termines = 0;
      const CONCURRENCE_MAX = 3; // pas tout en même temps : Apps Script a ses propres limites d'exécutions simultanées
      let curseur = 0;
      async function lancerSuivant(){
        if(curseur >= etapesChargement.length) return;
        const etape = etapesChargement[curseur++];
        try{ await etape.fn(); }catch(e){ /* on continue malgré une étape en échec */ }
        termines++;
        const pourcentage = Math.round((termines / etapesChargement.length) * 100);
        remplissage.style.width = pourcentage + '%';
        texteProgression.textContent = 'Chargement… ' + termines + '/' + etapesChargement.length + ' (' + etape.label + ')';
        await lancerSuivant();
      }
      await Promise.all(Array.from({length: CONCURRENCE_MAX}, lancerSuivant));

      barre.hidden = true;
      $('connexion').hidden = true;
      $('app').hidden = false;
      rendre();
      $('etat').classList.remove('visible');
      if(!localStorage.getItem('cvdl-onboarding-vu')) $('modale-bienvenue').hidden = false;
      demarrerRafraichissementSilencieux();
      return;
    }
    $('retour-connexion').innerHTML = '<div class="msg msg-erreur">Mot de passe incorrect.</div>';
  }catch(e){
    $('retour-connexion').innerHTML = '<div class="msg msg-erreur">Connexion impossible. Vérifiez l\'URL du script.</div>';
  }
  $('barre-progression-connexion').hidden = true;
  $('btn-connexion').disabled = false;
  $('btn-connexion').textContent = 'Ouvrir le suivi';
}
$('btn-connexion').addEventListener('click', connecter);
$('mdp').addEventListener('keydown', e => { if(e.key === 'Enter') connecter(); });

/** Recharge commandes + SAV en tâche de fond, sans écran de chargement ni interruption,
 *  tant qu'aucune modale n'est ouverte (pour ne jamais écraser une saisie en cours). */
let intervalRafraichissementSilencieux = null;
function demarrerRafraichissementSilencieux(){
  if(intervalRafraichissementSilencieux) return;
  intervalRafraichissementSilencieux = setInterval(rafraichirSilencieusement, 4 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'visible') rafraichirSilencieusement();
  });
}
async function rafraichirSilencieusement(){
  if(document.querySelector('.voile-modale:not([hidden])')) return; // une saisie est en cours dans une modale
  const champActif = document.activeElement;
  if(champActif && ['INPUT', 'TEXTAREA', 'SELECT'].includes(champActif.tagName)) return; // idem pour un champ édité directement sur une carte
  const ongletActif = document.querySelector('.onglets button.actif')?.dataset.vue;

  try{
    const r = await jsonp({action:'list', password:motDePasse, limite:limiteCommandesActuelle});
    if(r.ok){ commandes = r.commandes; totalCommandes = r.total; rendre(); }
  }catch(e){ /* silencieux — nouvelle tentative au prochain cycle */ }
  try{
    if(statutsSav.length) await chargerSav(true);
  }catch(e){}

  // La notif ne s'affiche que si on regarde déjà l'un des deux onglets concernés — ailleurs,
  // ce serait une distraction sans intérêt pour une donnée qu'on ne consulte pas à l'instant.
  if(ongletActif === 'commandes' || ongletActif === 'sav') etat('Données actualisées', 'succes');
}

/* ─── Onglets ─── */
document.querySelector('.onglets').addEventListener('click', e => {
  const b = e.target.closest('button');
  if(!b) return;
  document.querySelectorAll('.onglets button').forEach(x => x.classList.toggle('actif', x === b));
  $('vue-commandes').hidden  = b.dataset.vue !== 'commandes';
  $('vue-structures').hidden = b.dataset.vue !== 'structures';
  $('vue-produits').hidden   = b.dataset.vue !== 'produits';
  $('vue-devis').hidden      = b.dataset.vue !== 'devis';
  $('vue-factures').hidden   = b.dataset.vue !== 'factures';
  $('vue-sav').hidden = b.dataset.vue !== 'sav';
  $('vue-comptabilite').hidden = b.dataset.vue !== 'comptabilite';
  $('vue-bilan').hidden = b.dataset.vue !== 'bilan';
  if(b.dataset.vue === 'bilan'){ rendreBilan(); rendreBilanSav(); }
  $('vue-reglages').hidden = b.dataset.vue !== 'reglages';
  if(b.dataset.vue === 'reglages') chargerReglages();
});

