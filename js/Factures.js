/* ══════════════ FACTURES ══════════════ */

let factures = [];
let facturesChargeesUneFois = false;
let totalFactures = 0;
let montantTotalFacturesGlobal = 0;
let limiteFacturesActuelle = LIMITE_LISTES_DEFAUT;
let decalageFacturesActuel = 0;
let rechercheFacturesActive = false;
let sav = [];
const LIMITE_SAV_DEFAUT = 20;
let limiteSavActuelle = LIMITE_SAV_DEFAUT;
let decalageSavActuel = 0;
let totalSav = 0;
let filtreSav = 'tout';
let symptomesSav = ['L\'écran ne s\'allume plus', 'L\'appareil ne se charge plus', 'Le clavier ne fonctionne plus ou mal'];

async function chargerFactures(silencieux){
  if(!silencieux) etat('Chargement des factures…', 'chargement');
  try{
    const r = await jsonp({action:'factures', password:motDePasse, limite:limiteFacturesActuelle, decalage:decalageFacturesActuel});
    if(r.ok){ factures = r.factures; totalFactures = r.total; montantTotalFacturesGlobal = r.montantTotalGlobal || 0; facturesChargeesUneFois = true; rendreFactures(); }
    if(!silencieux) $('etat').classList.remove('visible');
  }catch(e){ if(!silencieux) etat('Chargement des factures impossible', 'erreur'); }
}
async function changerPageFactures(nouveauDecalage){
  decalageFacturesActuel = Math.max(0, nouveauDecalage);
  etat('Chargement…', 'chargement');
  try{
    const r = await jsonp({action:'factures', password:motDePasse, limite:limiteFacturesActuelle, decalage:decalageFacturesActuel});
    if(r.ok){ factures = r.factures; totalFactures = r.total; montantTotalFacturesGlobal = r.montantTotalGlobal || 0; rendreFactures(); }
    $('etat').classList.remove('visible');
  }catch(e){ etat('Chargement impossible', 'erreur'); }
}
$('btn-page-precedente-factures').addEventListener('click', () => changerPageFactures(decalageFacturesActuel - limiteFacturesActuelle));
$('btn-page-suivante-factures').addEventListener('click', () => changerPageFactures(decalageFacturesActuel + limiteFacturesActuelle));

$('btn-recharger-factures').addEventListener('click', () => {
  etat('Actualisation…', 'neutre');
  decalageFacturesActuel = 0;
  chargerFactures().then(() => etat('À jour', 'succes'));
});
let minuteurRechercheFactures = null;
$('recherche-factures').addEventListener('input', () => {
  clearTimeout(minuteurRechercheFactures);
  const terme = $('recherche-factures').value.trim();
  minuteurRechercheFactures = setTimeout(async () => {
    if(!terme){
      rechercheFacturesActive = false;
      await changerPageFactures(0);
      return;
    }
    etat('Recherche…', 'chargement');
    try{
      const r = await jsonp({action:'factures', password:motDePasse, recherche:terme});
      if(r.ok){ factures = r.factures; totalFactures = r.total; montantTotalFacturesGlobal = r.montantTotalGlobal || 0; rechercheFacturesActive = true; rendreFactures(); etat('À jour', 'succes'); }
    }catch(e){ etat('Recherche impossible', 'erreur'); }
  }, 350);
});

let statutsSav = [];
const COULEURS_SAV_DISPONIBLES = ['t-ambre', 't-bleu', 't-violet', 't-turquoise', 't-vert', 't-rouge', 't-gris'];

async function chargerStatutsSav(){
  etat('Chargement des statuts SAV…', 'chargement');
  try{
    const r = await jsonp({action:'sav-statuts-list', password:motDePasse});
    if(r.ok){ statutsSav = r.statuts; rendreFiltresSav(); rendreConfigStatutsSav(); }
  }catch(e){ etat('Chargement des statuts SAV impossible', 'erreur'); }
}

function statutSavInfo(nom){
  return statutsSav.find(s => s.statut === nom) || { couleur:'t-gris', colissimo:false, diagnostic:false, terminal:false, departDelai:false, ordre:0 };
}

/** Plus petite "ordre" parmi les statuts où ce drapeau est actif — Infinity si aucun,
 *  pour qu'aucun ticket ne déclenche l'affichage d'un champ que personne n'a activé. */
function seuilOrdreSav(cle){
  const correspondants = statutsSav.filter(s => s[cle]);
  return correspondants.length ? Math.min(...correspondants.map(s => s.ordre)) : Infinity;
}

function parseDateFr(dateStr){
  const [j, m, a] = (dateStr || '').split('/').map(Number);
  return (j && m && a) ? new Date(a, m - 1, j) : null;
}

/** Nombre de jours écoulés depuis le statut marqué "Départ du délai" — figé à la date de
 *  résolution une fois le ticket sur un statut "Terminal", sinon calculé jusqu'à aujourd'hui.
 *  Renvoie null si le ticket n'a jamais atteint cette étape, ou si aucun statut ne porte ce
 *  drapeau (rien à mesurer). */
function calculerDelaiSav(t){
  const statutDepart = statutsSav.find(s => s.departDelai);
  if(!statutDepart) return null;
  const entree = (t.historique || []).find(h => h.statut === statutDepart.statut);
  if(!entree) return null;
  const dateDepart = parseDateFr(entree.date);
  if(!dateDepart) return null;

  const infoActuelle = statutSavInfo(t.statut);
  const dateFin = (infoActuelle.terminal && t.dateResolution) ? parseDateFr(t.dateResolution) : new Date();
  return Math.floor((dateFin - dateDepart) / 86400000);
}

/** Même logique que estNouvelleCommande, avec la durée réglable séparément pour le SAV. */
function estNouvelleSav(dateStr, heureStr){
  if(!dateStr) return false;
  const [j, m, a] = dateStr.split('/').map(Number);
  if(!j || !m || !a) return false;
  const [h, min] = (heureStr || '00:00').split(':').map(Number);

  let curseur = new Date(a, m - 1, j, h || 0, min || 0);
  const maintenant = new Date();
  if(curseur > maintenant) return true;

  const seuilHeures = badgeNouvelleSavJours * 24;
  let heuresOuvrees = 0;
  while(curseur < maintenant){
    curseur = new Date(curseur.getTime() + 3600000);
    if(estHeureOuvree(curseur)) heuresOuvrees++;
    if(heuresOuvrees >= seuilHeures) return false;
  }
  return true;
}

/** Ancienneté en années depuis la date d'achat/don (format yyyy-mm-dd, tel qu'envoyé par
 *  un champ <input type="date">) — null si absente ou illisible. */
function anneesDepuisAchat(dateAchatStr){
  if(!dateAchatStr) return null;
  const d = new Date(dateAchatStr);
  if(isNaN(d.getTime())) return null;
  return (new Date() - d) / (365 * 86400000);
}
function badgeGarantieSav(annees){
  if(annees == null || annees < 1) return '';
  if(annees >= 2) return '<div class="tsc-garantie hors-garantie">⚠️ Hors garantie — acheté il y a plus de 2 ans</div>';
  return '<div class="tsc-garantie avertissement">Acheté il y a plus d\'un an — vérifier la garantie</div>';
}

async function chargerSav(silencieux, limiteForcee){
  if(!silencieux) etat('Chargement du SAV…', 'chargement');
  const limite = limiteForcee !== undefined ? limiteForcee : limiteSavActuelle;
  try{
    const r = await jsonp({action:'sav-list', password:motDePasse, limite:limite, decalage:decalageSavActuel});
    if(r.ok){ sav = r.tickets; totalSav = r.total; appliquerAgregatsSav(r); rendreSav(); rendreApercuGeneral(); }
    if(!silencieux) $('etat').classList.remove('visible');
  }catch(e){ if(!silencieux) etat('Chargement du SAV impossible', 'erreur'); }
}
$('btn-recharger-sav').addEventListener('click', () => {
  etat('Actualisation…', 'neutre');
  Promise.all([chargerSav(), chargerStatutsSav()]).then(() => etat('À jour', 'succes'));
});

async function changerPageSav(nouveauDecalage){
  etat('Chargement…', 'chargement');
  try{
    const r = await jsonp({action:'sav-list', password:motDePasse, limite:limiteSavActuelle, decalage:nouveauDecalage});
    if(r.ok){
      sav = r.tickets; totalSav = r.total; decalageSavActuel = nouveauDecalage; appliquerAgregatsSav(r);
      rendreSav(); rendreApercuGeneral(); etat('À jour', 'succes');
    }
  }catch(e){ etat('Chargement impossible', 'erreur'); }
}
$('btn-page-precedente-sav').addEventListener('click', () => {
  changerPageSav(Math.max(0, decalageSavActuel - limiteSavActuelle));
});
$('btn-page-suivante-sav').addEventListener('click', () => {
  changerPageSav(decalageSavActuel + limiteSavActuelle);
});
let rechercheSavActive = false;
let minuteurRechercheSav = null;
$('recherche-sav').addEventListener('input', () => {
  clearTimeout(minuteurRechercheSav);
  const terme = $('recherche-sav').value.trim();
  minuteurRechercheSav = setTimeout(async () => {
    if(!terme){
      rechercheSavActive = false;
      await changerPageSav(decalageSavActuel);
      return;
    }
    etat('Recherche…', 'chargement');
    try{
      const r = await jsonp({action:'sav-list', password:motDePasse, recherche:terme});
      if(r.ok){
        sav = r.tickets; totalSav = r.total; rechercheSavActive = true; appliquerAgregatsSav(r);
        rendreSav(); rendreApercuGeneral(); etat('À jour', 'succes');
      }
    }catch(e){ etat('Recherche impossible', 'erreur'); }
  }, 350);
});

function rendreFiltresSav(){
  $('filtres-sav').innerHTML = '<button data-fs="tout" class="actif">Tous</button>' +
    statutsSav.map(s => `<button data-fs="${echapper(s.statut)}">${echapper(s.statut)}</button>`).join('');
}
$('filtres-sav').addEventListener('click', e => {
  const b = e.target.closest('button');
  if(!b) return;
  document.querySelectorAll('#filtres-sav button').forEach(x => x.classList.toggle('actif', x === b));
  filtreSav = b.dataset.fs;
  rendreSav();
});

$('btn-config-statuts-sav').addEventListener('click', () => {
  $('config-statuts-sav').hidden = !$('config-statuts-sav').hidden;
});

function rendreConfigStatutsSav(){
  $('liste-config-statuts-sav').innerHTML = statutsSav.map((s, i) => `
    <div class="ligne-config-statut">
      <div class="fleches">
        <button type="button" data-statut-monter="${s.ligne}" ${i === 0 ? 'disabled' : ''} title="Monter"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="10" height="10"><path d="M5 15l7-7 7 7"/></svg></button>
        <button type="button" data-statut-descendre="${s.ligne}" ${i === statutsSav.length - 1 ? 'disabled' : ''} title="Descendre"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="10" height="10"><path d="M19 9l-7 7-7-7"/></svg></button>
      </div>
      <input type="text" value="${echapper(s.statut)}" data-statut-config="${s.ligne}" data-champ="statut">
      <select class="select-couleur ${s.couleur}" data-statut-config="${s.ligne}" data-champ="couleur">
        ${COULEURS_SAV_DISPONIBLES.map(c => `<option value="${c}"${c === s.couleur ? ' selected' : ''}>${c.replace('t-', '')}</option>`).join('')}
      </select>
      <label class="case-drapeau" title="Ce statut déclenche l'affichage du champ et de la pilule de suivi Colissimo, côté admin comme côté structure/bénéficiaire"><input type="checkbox" data-statut-config="${s.ligne}" data-champ="colissimo" ${s.colissimo ? 'checked' : ''}> Colissimo</label>
      <label class="case-drapeau" title="Ce statut correspond à une phase de diagnostic technique de l'appareil"><input type="checkbox" data-statut-config="${s.ligne}" data-champ="diagnostic" ${s.diagnostic ? 'checked' : ''}> Diagnostic</label>
      <label class="case-drapeau" title="Ce statut marque le point de départ du décompte du délai de traitement affiché sur le ticket"><input type="checkbox" data-statut-config="${s.ligne}" data-champ="departDelai" ${s.departDelai ? 'checked' : ''}> Départ délai</label>
      <label class="case-drapeau" title="Ce statut clôture le ticket — plus aucun changement de statut n'est possible ensuite"><input type="checkbox" data-statut-config="${s.ligne}" data-champ="terminal" ${s.terminal ? 'checked' : ''}> Terminal</label>
      <label class="case-drapeau" title="Ferme l'anneau de progression à 100% dans le suivi structure/bénéficiaire — à cocher sur le statut qui représente une résolution réussie, pas sur une sortie alternative (faux positif, hors garantie…)"><input type="checkbox" data-statut-config="${s.ligne}" data-champ="finCycle" ${s.finCycle ? 'checked' : ''}> Fin de cycle (anneau)</label>
      <button type="button" class="btn-icone-fiche danger" data-statut-supprimer="${s.ligne}" data-statut-nom="${echapper(s.statut)}" title="Supprimer ce statut" aria-label="Supprimer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7m2 0v13a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 20V7h10z"/><path d="M10 11v6M14 11v6"/></svg>
      </button>
    </div>`).join('');
}

$('liste-config-statuts-sav').addEventListener('change', async e => {
  const el = e.target;
  if(!el.matches('[data-statut-config]')) return;
  const ligne = parseInt(el.dataset.statutConfig, 10);
  const valeur = el.type === 'checkbox' ? el.checked : el.value;
  el.disabled = true;
  try{
    const r = await poster({ action:'sav-statut-modifier', password:motDePasse, ligne, champ: el.dataset.champ, valeur });
    if(r.ok){
      etat('Statut mis à jour', 'succes');
      await chargerStatutsSav();
      rendreSav(); // les couleurs/drapeaux affectent l'affichage des tickets
    }else{
      etat(r.erreur || 'Enregistrement impossible', 'erreur');
    }
  }catch(err){ etat('Enregistrement impossible', 'erreur'); }
  el.disabled = false;
});

$('liste-config-statuts-sav').addEventListener('click', async e => {
  const bMonter = e.target.closest('[data-statut-monter]');
  const bDescendre = e.target.closest('[data-statut-descendre]');
  const bSupprimer = e.target.closest('[data-statut-supprimer]');

  if(bMonter || bDescendre){
    const b = bMonter || bDescendre;
    const ligne = parseInt((bMonter ? b.dataset.statutMonter : b.dataset.statutDescendre), 10);
    try{
      const r = await poster({ action:'sav-statut-deplacer', password:motDePasse, ligne, direction: bMonter ? 'haut' : 'bas' });
      if(r.ok) await chargerStatutsSav();
      else etat(r.erreur || 'Déplacement impossible', 'erreur');
    }catch(err){ etat('Déplacement impossible', 'erreur'); }
  }

  if(bSupprimer){
    if(!confirm(`Supprimer le statut "${bSupprimer.dataset.statutNom}" ? Les tickets qui l'utilisent garderont ce texte, mais sans couleur ni comportement associé.`)) return;
    try{
      const r = await poster({ action:'sav-statut-supprimer', password:motDePasse, ligne: parseInt(bSupprimer.dataset.statutSupprimer, 10) });
      if(r.ok){ await chargerStatutsSav(); rendreSav(); etat('Statut supprimé', 'succes'); }
      else etat(r.erreur || 'Suppression impossible', 'erreur');
    }catch(err){ etat('Suppression impossible', 'erreur'); }
  }
});

$('btn-ajouter-statut-sav').addEventListener('click', async () => {
  const nom = $('nouveau-statut-sav-nom').value.trim();
  if(!nom){
    $('retour-config-statuts-sav').innerHTML = '<div class="msg msg-erreur">Indique un nom de statut.</div>';
    return;
  }
  $('btn-ajouter-statut-sav').disabled = true;
  $('retour-config-statuts-sav').innerHTML = '';
  try{
    const r = await poster({ action:'sav-statut-ajouter', password:motDePasse, statut: nom });
    if(r.ok){
      $('nouveau-statut-sav-nom').value = '';
      await chargerStatutsSav();
      etat('Statut ajouté', 'succes');
    }else{
      $('retour-config-statuts-sav').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-config-statuts-sav').innerHTML = '<div class="msg msg-erreur">Ajout impossible.</div>';
  }
  $('btn-ajouter-statut-sav').disabled = false;
});

function rendreSav(){
  const banniereHistoriqueSav = $('bandeau-pagination-sav');
  if(!rechercheSavActive && limiteSavActuelle > 0 && totalSav > limiteSavActuelle){
    const pageActuelle = Math.floor(decalageSavActuel / limiteSavActuelle) + 1;
    const nbPages = Math.ceil(totalSav / limiteSavActuelle);
    $('texte-pagination-sav').textContent = `Page ${pageActuelle} sur ${nbPages} (${totalSav} tickets au total)`;
    $('btn-page-precedente-sav').disabled = decalageSavActuel === 0;
    $('btn-page-suivante-sav').disabled = decalageSavActuel + limiteSavActuelle >= totalSav;
    banniereHistoriqueSav.hidden = false;
  }else{
    banniereHistoriqueSav.hidden = true;
  }

  const q = $('recherche-sav').value.trim().toLowerCase();
  const visibles = sav.filter(t => {
    if(filtreSav !== 'tout' && t.statut !== filtreSav) return false;
    if(!q) return true;
    return (t.reference + ' ' + t.nom + ' ' + t.numeroSerie + ' ' + t.referenceCommande + ' ' + t.referenceFacture).toLowerCase().includes(q);
  });

  if(!visibles.length){
    $('liste-sav').innerHTML = `<div class="vide">
      <strong>Aucun ticket SAV</strong>
      Les demandes créées ici, ou reçues via le formulaire, apparaîtront dans cette liste.
    </div>`;
    return;
  }

  const seuilDiagnostic = seuilOrdreSav('diagnostic');

  $('liste-sav').innerHTML = visibles.map(t => {
    const info = statutSavInfo(t.statut);
    const montrerColissimo = !!info.colissimo || !!info.terminal;
    const montrerDiagnostic = info.ordre >= seuilDiagnostic;
    const liensColissimo = (t.colissimo || '').split('\n').map(s => s.trim()).filter(Boolean);

    const historiqueHtml = (t.historique || []).length
      ? `<details class="historique-sav">
           <summary>Historique (${t.historique.length})</summary>
           <ul>${t.historique.map(h => `<li>${echapper(h.date)} — ${echapper(h.statut)}</li>`).join('')}</ul>
         </details>` : '';

    const estPremierStatut = statutsSav.length && t.statut === statutsSav[0].statut;
    const badgeNouvelleHtml = (estPremierStatut && estNouvelleSav(t.date, t.heure))
      ? '<div class="badge-nouvelle">NEW</div>' : '';

    const delai = calculerDelaiSav(t);
    const niveauDelai = (delai == null || delai < 7) ? 0 : (delai >= 21 ? 3 : (delai >= 14 ? 2 : 1));
    const delaiHtml = niveauDelai
      ? `<div class="tsc-delai niveau-${niveauDelai}">⏱ ${delai} jours depuis "${echapper(statutsSav.find(s => s.departDelai)?.statut || '')}"</div>` : '';

    const garantieHtml = badgeGarantieSav(anneesDepuisAchat(t.dateAchat));

    return `
    <div class="ticket-sav-conteneur">
      ${badgeNouvelleHtml}
      <article class="tsc-a teinte-${info.couleur}">
        <div class="tsc-a-haut">
          <div class="tsc-a-identite">
            <div class="tsc-a-icone">${svgIconeSymptome(t.symptome)}</div>
            <div class="tsc-a-entete">
              <div class="tsc-a-nom">${echapper(t.nom)}</div>
              <div class="tsc-a-ref">${echapper(t.reference)} · ${echapper(t.date)}</div>
            </div>
          </div>
          <span class="tsc-a-statut-pastille">${echapper(t.statut)}</span>
        </div>
        <p class="tsc-a-symptome">${t.symptome ? echapper(t.symptome) : 'Symptôme non précisé'}</p>
        <div class="tsc-pilules">
          <span class="pilule-info-sav type-serie${t.numeroSerie ? '' : ' vide'}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5V5a2 2 0 0 1 2-2h6.5L21 11.5a2 2 0 0 1 0 2.8L14.3 21a2 2 0 0 1-2.8 0L3 12.5z"/><circle cx="7.5" cy="7.5" r="1.1" fill="currentColor" stroke="none"/></svg>
            ${t.numeroSerie ? echapper(t.numeroSerie) : 'N° série non renseigné'}
          </span>
          ${garantieHtml ? `<span class="pilule-info-sav pilule-large">${garantieHtml}</span>` : ''}
          ${montrerColissimo && liensColissimo.length ? `<span class="tsc-pilules-colis">${liensColissimo.map(l => `
          <a class="pilule-info-sav type-colis" href="${echapper(l)}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8.5v7l-9 4.5-9-4.5v-7L12 4z"/><path d="M3.3 8.2 12 12.5l8.7-4.3M12 12.5V21"/></svg>
            Suivre le colis
          </a>`).join('')}</span>` : ''}
        </div>
        ${delaiHtml}
        ${historiqueHtml}
        <div class="tsc-a-bandeau">
          <select class="statut ${info.couleur}" data-sav-edit="${t.ligne}" data-champ="statut">
            ${statutsSav.map(s => `<option value="${echapper(s.statut)}"${s.statut === t.statut ? ' selected' : ''}>${echapper(s.statut)}</option>`).join('')}
          </select>
          <button type="button" class="action" data-sav-details="${t.ligne}">Voir le détail</button>
          <button type="button" class="btn-icone-fiche danger" data-sav-supprimer="${t.ligne}" data-sav-nom="${echapper(t.reference)}" title="Supprimer le ticket" aria-label="Supprimer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7m2 0v13a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 20V7h10z"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      </article>
    </div>`;
  }).join('');
  rendreApercuGeneral();
}

let clotureSavLigneCourante = null;
let clotureSavValeurPrecedente = null;
let clotureSavSelectCourant = null;
let colissimoSavLigneCourante = null;
let colissimoSavValeurPrecedente = null;
let colissimoSavSelectCourant = null;
let colissimoSavNouveauStatut = null;

$('liste-sav').addEventListener('change', async e => {
  const el = e.target;
  if(!el.matches('[data-sav-edit]')) return;
  const ligne = parseInt(el.dataset.savEdit, 10);

  if(el.dataset.champ === 'statut'){
    const infoNouveauStatut = statutsSav.find(s => s.statut === el.value);
    if(infoNouveauStatut && infoNouveauStatut.terminal){
      const t = sav.find(x => x.ligne === ligne);
      clotureSavLigneCourante = ligne;
      clotureSavValeurPrecedente = t ? t.statut : '';
      clotureSavSelectCourant = el;
      $('modale-cloture-sav-statut').textContent = `Nouveau statut : ${el.value}`;
      $('cloture-sav-texte').value = t ? (t.notes || '') : '';
      $('retour-cloture-sav').innerHTML = '';
      $('modale-cloture-sav').hidden = false;
      return; // rien n'est enregistré tant que la clôture n'est pas confirmée
    }
    // Statut qui exige un lien Colissimo et le ticket n'en a encore aucun : on force la saisie
    // avant d'enregistrer, plutôt que de laisser passer un statut "en livraison" sans moyen de
    // suivre le colis.
    if(infoNouveauStatut && infoNouveauStatut.colissimo){
      const t = sav.find(x => x.ligne === ligne);
      const dejaRenseigne = t && String(t.colissimo || '').trim().length > 0;
      if(!dejaRenseigne){
        colissimoSavLigneCourante = ligne;
        colissimoSavValeurPrecedente = t ? t.statut : '';
        colissimoSavSelectCourant = el;
        colissimoSavNouveauStatut = el.value;
        $('modale-colissimo-sav-statut').textContent = `Nouveau statut : ${el.value} — renseigne au moins un lien avant de continuer.`;
        $('colissimo-sav-texte').value = '';
        $('retour-colissimo-sav').innerHTML = '';
        $('modale-colissimo-sav').hidden = false;
        return;
      }
    }
  }

  el.disabled = true;
  try{
    const r = await poster({ action:'sav-update', password:motDePasse, ligne, champ: el.dataset.champ, valeur: el.value });
    if(r.ok){
      const t = sav.find(x => x.ligne === ligne);
      if(t) t[el.dataset.champ] = el.value;
      if(el.dataset.champ === 'statut'){
        await chargerSav(); // pour l'historique à jour, le badge de délai et une éventuelle date de fin
      }else{
        rendreSav(); // recalcule localement (ex. les liens colissimo qui viennent d'être collés)
      }
      etat('Enregistré', 'succes');
    }else{
      etat(r.erreur || 'Enregistrement impossible', 'erreur');
    }
  }catch(err){ etat('Enregistrement impossible', 'erreur'); }
  el.disabled = false;
});

$('cloture-sav-annuler').addEventListener('click', () => {
  if(clotureSavSelectCourant) clotureSavSelectCourant.value = clotureSavValeurPrecedente;
  $('modale-cloture-sav').hidden = true;
  clotureSavLigneCourante = null;
  clotureSavSelectCourant = null;
});

$('colissimo-sav-annuler').addEventListener('click', () => {
  if(colissimoSavSelectCourant) colissimoSavSelectCourant.value = colissimoSavValeurPrecedente;
  $('modale-colissimo-sav').hidden = true;
  colissimoSavLigneCourante = null;
  colissimoSavSelectCourant = null;
});

$('colissimo-sav-confirmer').addEventListener('click', async () => {
  const valeur = $('colissimo-sav-texte').value.split('\n').map(s => s.trim()).filter(Boolean).join('\n');
  if(!valeur){
    $('retour-colissimo-sav').innerHTML = '<div class="msg msg-erreur">Merci de renseigner au moins un lien Colissimo.</div>';
    return;
  }
  $('colissimo-sav-confirmer').disabled = true;
  $('retour-colissimo-sav').innerHTML = '';
  try{
    const rColissimo = await poster({ action:'sav-update', password:motDePasse, ligne: colissimoSavLigneCourante, champ:'colissimo', valeur });
    if(!rColissimo.ok){
      $('retour-colissimo-sav').innerHTML = `<div class="msg msg-erreur">${echapper(rColissimo.erreur)}</div>`;
      $('colissimo-sav-confirmer').disabled = false;
      return;
    }
    const rStatut = await poster({ action:'sav-update', password:motDePasse, ligne: colissimoSavLigneCourante, champ:'statut', valeur: colissimoSavNouveauStatut });
    if(!rStatut.ok){
      $('retour-colissimo-sav').innerHTML = `<div class="msg msg-erreur">${echapper(rStatut.erreur)}</div>`;
      $('colissimo-sav-confirmer').disabled = false;
      return;
    }
    $('modale-colissimo-sav').hidden = true;
    colissimoSavLigneCourante = null;
    colissimoSavSelectCourant = null;
    await chargerSav();
    etat('Enregistré', 'succes');
  }catch(e){
    $('retour-colissimo-sav').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  $('colissimo-sav-confirmer').disabled = false;
});

$('cloture-sav-confirmer').addEventListener('click', async () => {
  const texte = $('cloture-sav-texte').value.trim();
  if(!texte){
    $('retour-cloture-sav').innerHTML = '<div class="msg msg-erreur">Merci de décrire les actions réalisées avant de confirmer — ce message sera lu par la structure/le bénéficiaire.</div>';
    return;
  }
  $('cloture-sav-confirmer').disabled = true;
  $('retour-cloture-sav').innerHTML = '';
  try{
    const nouveauStatut = clotureSavSelectCourant.value;
    const rStatut = await poster({ action:'sav-update', password:motDePasse, ligne: clotureSavLigneCourante, champ:'statut', valeur: nouveauStatut });
    if(!rStatut.ok){
      $('retour-cloture-sav').innerHTML = `<div class="msg msg-erreur">${echapper(rStatut.erreur)}</div>`;
      $('cloture-sav-confirmer').disabled = false;
      return;
    }
    const rNotes = await poster({ action:'sav-update', password:motDePasse, ligne: clotureSavLigneCourante, champ:'notes', valeur: texte });
    if(!rNotes.ok){
      $('retour-cloture-sav').innerHTML = `<div class="msg msg-erreur">Statut enregistré, mais le message n'a pas pu être sauvegardé : ${echapper(rNotes.erreur)}</div>`;
      $('cloture-sav-confirmer').disabled = false;
      return;
    }
    $('modale-cloture-sav').hidden = true;
    clotureSavLigneCourante = null;
    clotureSavSelectCourant = null;
    await chargerSav();
    etat('Ticket clôturé', 'succes');
  }catch(e){
    $('retour-cloture-sav').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  $('cloture-sav-confirmer').disabled = false;
});

$('liste-sav').addEventListener('click', e => {
  const bSupprimer = e.target.closest('[data-sav-supprimer]');
  if(bSupprimer){
    demanderSuppression(`le ticket ${bSupprimer.dataset.savNom}`, 'sav-delete', parseInt(bSupprimer.dataset.savSupprimer, 10), chargerSav);
    return;
  }
  const bDetails = e.target.closest('[data-sav-details]');
  if(bDetails){
    ouvrirDetailSav(parseInt(bDetails.dataset.savDetails, 10));
  }
});

let detailSavLigneCourante = null;

function ouvrirDetailSav(ligne){
  const t = sav.find(x => x.ligne === ligne);
  if(!t) return;
  detailSavLigneCourante = ligne;

  const info = statutSavInfo(t.statut);
  const montrerColissimo = info.ordre >= seuilOrdreSav('colissimo');
  const montrerDiagnostic = info.ordre >= seuilOrdreSav('diagnostic');

  $('detail-sav-souscription').textContent = `${t.reference} — ${t.date}${t.email ? ' — ' + t.email : ''}`;
  $('detail-sav-nom').value = t.nom || '';
  $('detail-sav-numero-serie').value = t.numeroSerie || '';
  $('detail-sav-structure-origine').value = t.structureOrigine || '';
  $('detail-sav-reference-facture').value = t.referenceFacture || '';
  $('detail-sav-marque').value = t.marque || '';
  $('detail-sav-modele').value = t.modele || '';
  $('detail-sav-systeme').value = t.systeme || '';
  $('detail-sav-commentaire').value = t.commentaire || '';

  $('detail-sav-zone-colissimo').hidden = !montrerColissimo;
  $('detail-sav-reconditionneur').value = t.reconditionneur || '';
  $('detail-sav-colissimo').value = t.colissimo || '';

  $('detail-sav-zone-diagnostic').hidden = !montrerDiagnostic;
  $('detail-sav-probleme-effectif').innerHTML =
    '<option value="">— à déterminer —</option>' +
    PROBLEMES_EFFECTIFS_SAV.map(p => `<option value="${echapper(p)}"${p === t.problemeEffectif ? ' selected' : ''}>${echapper(p)}</option>`).join('');
  $('detail-sav-nouveau-numero-serie').value = t.nouveauNumeroSerie || '';
  $('detail-sav-notes').value = t.notes || '';

  $('detail-sav-historique').innerHTML = (t.historique || []).length
    ? `<details class="historique-sav" open>
         <summary>Historique (${t.historique.length})</summary>
         <ul>${t.historique.map(h => `<li>${echapper(h.date)} — ${echapper(h.statut)}</li>`).join('')}</ul>
       </details>` : '<p class="reglage-texte">Aucun historique pour l\'instant.</p>';

  $('retour-detail-sav').innerHTML = '';
  $('modale-detail-sav').hidden = false;
}
$('detail-sav-fermer').addEventListener('click', () => $('modale-detail-sav').hidden = true);

$('detail-sav-envoyer-email').addEventListener('click', async () => {
  const t = sav.find(x => x.ligne === detailSavLigneCourante);
  if(!t) return;
  if(!t.email){
    etat('Aucune adresse email connue pour ce ticket', 'erreur');
    return;
  }
  const valeurColissimo = $('detail-sav-colissimo').value.trim();
  if(!valeurColissimo){
    etat('Renseigne d\'abord un lien Colissimo avant de l\'envoyer', 'erreur');
    return;
  }
  // Enregistre d'abord la valeur affichée, pour être sûr d'envoyer exactement ce qui est saisi
  $('detail-sav-envoyer-email').disabled = true;
  try{
    const r = await poster({ action:'sav-update', password:motDePasse, ligne: detailSavLigneCourante, champ:'colissimo', valeur: valeurColissimo });
    if(!r.ok){
      etat(r.erreur || 'Enregistrement du colissimo impossible avant envoi', 'erreur');
      $('detail-sav-envoyer-email').disabled = false;
      return;
    }
    t.colissimo = valeurColissimo;
  }catch(e){
    etat('Enregistrement du colissimo impossible avant envoi', 'erreur');
    $('detail-sav-envoyer-email').disabled = false;
    return;
  }
  $('detail-sav-envoyer-email').disabled = false;
  demanderEnvoiEmail('envoyer-email-colissimo-sav', detailSavLigneCourante,
    `Envoyer le suivi Colissimo à ${t.email} pour le ticket ${t.reference} ?`);
});

$('detail-sav-enregistrer').addEventListener('click', async () => {
  if(!detailSavLigneCourante) return;
  const ligne = detailSavLigneCourante;
  $('detail-sav-enregistrer').disabled = true;
  $('retour-detail-sav').innerHTML = '';

  const champs = {
    nom: $('detail-sav-nom').value.trim(),
    numeroSerie: $('detail-sav-numero-serie').value.trim(),
    structureOrigine: $('detail-sav-structure-origine').value.trim(),
    referenceFacture: $('detail-sav-reference-facture').value.trim(),
    marque: $('detail-sav-marque').value.trim(),
    modele: $('detail-sav-modele').value.trim(),
    systeme: $('detail-sav-systeme').value.trim(),
    commentaire: $('detail-sav-commentaire').value,
    reconditionneur: $('detail-sav-reconditionneur').value.trim(),
    colissimo: $('detail-sav-colissimo').value,
    problemeEffectif: $('detail-sav-probleme-effectif').value,
    nouveauNumeroSerie: $('detail-sav-nouveau-numero-serie').value.trim(),
    notes: $('detail-sav-notes').value
  };

  try{
    const reponses = await Promise.all(
      Object.keys(champs).map(champ => poster({ action:'sav-update', password:motDePasse, ligne, champ, valeur: champs[champ] }))
    );
    const echec = reponses.find(r => !r.ok);
    if(echec){
      $('retour-detail-sav').innerHTML = `<div class="msg msg-erreur">${echapper(echec.erreur || 'Enregistrement partiel impossible.')}</div>`;
    }else{
      $('modale-detail-sav').hidden = true;
      await chargerSav();
      etat('Ticket mis à jour', 'succes');
    }
  }catch(e){
    $('retour-detail-sav').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  $('detail-sav-enregistrer').disabled = false;
});

function rendreFactures(){
  $('bandeau-total-factures').hidden = !totalFactures;
  $('bandeau-total-factures').innerHTML = totalFactures
    ? `<span class="libelle-total-factures">Montant total facturé</span><span class="valeur-total-factures">${formaterMontant(montantTotalFacturesGlobal)}</span><span class="sous-total-factures">${totalFactures} facture${totalFactures > 1 ? 's' : ''}, réglées ou en attente</span>`
    : '';

  const banniereHistorique = $('bandeau-pagination-factures');
  if(!rechercheFacturesActive && limiteFacturesActuelle > 0 && totalFactures > limiteFacturesActuelle){
    const pageActuelle = Math.floor(decalageFacturesActuel / limiteFacturesActuelle) + 1;
    const nbPages = Math.ceil(totalFactures / limiteFacturesActuelle);
    $('texte-pagination-factures').textContent = `Page ${pageActuelle} sur ${nbPages} (${totalFactures} factures au total)`;
    $('btn-page-precedente-factures').disabled = decalageFacturesActuel === 0;
    $('btn-page-suivante-factures').disabled = decalageFacturesActuel + limiteFacturesActuelle >= totalFactures;
    banniereHistorique.hidden = false;
  }else{
    banniereHistorique.hidden = true;
  }

  const visibles = factures;

  if(!visibles.length){
    $('liste-factures').innerHTML = `<div class="vide">
      <strong>Aucune facture</strong>
      Une facture se crée en convertissant un devis existant, avec un numéro saisi à la main.
    </div>`;
    return;
  }

  $('liste-factures').innerHTML = visibles.map(f => `
    <article class="facture">
      <div>
        <div class="ref">${echapper(f.referenceFacture)}</div>
        <div class="date">${echapper(f.date)}</div>
        ${f.referenceCommande ? `<div class="ref-commande-liee">Commande ${echapper(f.referenceCommande)}</div>` : ''}
      </div>
      <div>
        <div class="nom">${echapper(f.nomStructure)}</div>
        <div class="coords">${echapper(f.email)}<br>${echapper(f.adresse)}</div>
      </div>
      <div>
        <input type="text" class="edit-ligne" data-facture-edit="${f.ligne}" data-champ="produit" value="${echapper(f.produit)}">
        <div class="moyen">
          <select class="edit-ligne mini" data-facture-edit="${f.ligne}" data-champ="quantite">
            ${[1,2,3,4,5].map(n => `<option value="${n}"${n === parseInt(f.quantite,10) ? ' selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>
        <select class="edit-ligne edit-ligne-moyen" data-facture-edit="${f.ligne}" data-champ="moyenPaiement">
          ${MOYENS_PAIEMENT.map(m => `<option value="${echapper(m)}"${m === f.moyenPaiement ? ' selected' : ''}>${echapper(m)}</option>`).join('')}
        </select>
      </div>
      <div>
        <div class="montant-total" id="montant-facture-${f.ligne}">${formaterMontant(f.montantTotal)}</div>
        <input type="number" class="edit-ligne mini" data-facture-edit="${f.ligne}" data-champ="prixUnitaire" value="${f.prixUnitaire}" step="0.01" min="0">
      </div>
      <div class="pilotage" style="min-width:170px">
        <a class="action claire" href="${modeleFacturationUrl}" target="_blank" rel="noopener">Ouvrir le modèle</a>
        <button type="button" class="action" data-generer-pdf="${f.ligne}">📝 Remplir le modèle</button>
        <div id="retour-pdf-${f.ligne}"></div>
        <input type="text" class="edit-ligne" data-facture-edit="${f.ligne}" data-champ="commentaire" value="${echapper(f.commentaire)}" placeholder="Commentaire (paiement mixte…)">
        <div class="ligne-actions-icones" style="justify-self:start;margin-top:4px">
          <button type="button" class="btn-icone-fiche" data-facture-modifier="${f.ligne}" title="Modifier (les champs sont éditables directement)" aria-label="Modifier">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l11-11-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>
          </button>
          <button type="button" class="btn-icone-fiche danger" data-facture-supprimer="${f.ligne}" data-facture-nom="${echapper(f.referenceFacture)}" title="Supprimer la facture" aria-label="Supprimer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7m2 0v13a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 20V7h10z"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      </div>
    </article>`).join('');
}

$('liste-factures').addEventListener('change', async e => {
  const el = e.target;
  if(!el.matches('[data-facture-edit]')) return;
  const ligne = parseInt(el.dataset.factureEdit, 10);
  el.disabled = true;
  try{
    const r = await poster({ action:'facture-update', ligne, champ: el.dataset.champ, valeur: el.value });
    if(r.ok){
      if(typeof r.montant === 'number'){
        const cible = document.getElementById('montant-facture-' + ligne);
        if(cible) cible.textContent = formaterMontant(r.montant);
      }
      etat('Enregistré', 'succes');
    }else{
      etat(r.erreur || 'Enregistrement impossible', 'erreur');
    }
  }catch(err){ etat('Enregistrement impossible', 'erreur'); }
  el.disabled = false;
});

$('liste-factures').addEventListener('click', async e => {
  const bSup = e.target.closest('[data-facture-supprimer]');
  if(bSup){
    demanderSuppression(`la facture ${bSup.dataset.factureNom}`, 'facture-delete', parseInt(bSup.dataset.factureSupprimer, 10), chargerFactures);
    return;
  }
  const bMod = e.target.closest('[data-facture-modifier]');
  if(bMod){
    const champ = bMod.closest('article').querySelector('[data-facture-edit][data-champ="produit"]');
    if(champ){ champ.focus(); champ.select(); }
    return;
  }
  const bPdf = e.target.closest('[data-generer-pdf]');
  if(bPdf){
    const ligne = parseInt(bPdf.dataset.genererPdf, 10);
    const zoneRetour = $('retour-pdf-' + ligne);
    bPdf.disabled = true;
    bPdf.innerHTML = '<span class="spinner-etat-sombre"></span><span>Remplissage…</span>';
    zoneRetour.innerHTML = '';
    try{
      const r = await poster({action:'facture-generer-pdf', password:motDePasse, ligne});
      if(r.ok){
        window.open(r.url, '_blank');
        zoneRetour.innerHTML = `<a class="action claire" href="${echapper(r.url)}" target="_blank" rel="noopener" style="margin-top:6px">Rouvrir le modèle rempli</a>`;
      }else{
        zoneRetour.innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
      }
    }catch(err){
      zoneRetour.innerHTML = '<div class="msg msg-erreur">Remplissage impossible.</div>';
    }
    bPdf.disabled = false;
    bPdf.textContent = '📝 Remplir le modèle';
  }
});

