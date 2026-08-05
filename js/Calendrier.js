/* ═══ Calendrier des livraisons — dates souhaitées et réelles, mois ou semaine ═══
   Les données (légères : juste référence/nom/statut/dates) sont chargées une seule fois par
   session admin et gardées en mémoire — pas de raison de les rafraîchir à chaque changement
   de mois, la navigation dans le calendrier doit rester instantanée. */

let calendrierCommandes = null;
let calendrierLots = [];
let calendrierChargeUneFois = false;
let calendrierDateRef = new Date();
let calendrierVueActuelle = localStorage.getItem('cvdl-calendrier-vue') || 'mois';
let calendrierAfficherSouhaitee = localStorage.getItem('cvdl-calendrier-souhaitee') !== 'non';
let calendrierAfficherCible = localStorage.getItem('cvdl-calendrier-cible') !== 'non';
let calendrierAfficherReelle = localStorage.getItem('cvdl-calendrier-reelle') !== 'non';
let calendrierAfficherLots = localStorage.getItem('cvdl-calendrier-lots') !== 'non';

async function chargerCalendrier(){
  $('calendrier-grille').innerHTML = '<p class="sous-question">Chargement…</p>';
  try{
    const [r, rLots] = await Promise.all([
      jsonp({action:'calendrier-commandes', password:motDePasse}),
      jsonp({action:'calendrier-lots-distribution', password:motDePasse}).catch(() => ({ok:false})),
    ]);
    if(!r.ok){ $('calendrier-grille').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur||'Chargement impossible.')}</div>`; return; }
    calendrierCommandes = r.commandes;
    calendrierLots = rLots.ok ? rLots.lots : [];
    rendreCalendrier();
  }catch(e){
    $('calendrier-grille').innerHTML = '<div class="msg msg-erreur">Chargement impossible — réessaie.</div>';
  }
}

/** Commandes "le plus rapidement possible" pas encore livrées — "ASAP" n'étant pas une date,
 *  elles ne peuvent pas être placées sur la grille elle-même, donc un bandeau à part plutôt
 *  que de les perdre ou de les caser arbitrairement sur une case. */
function rendreBandeauUrgentesCalendrier(){
  const conteneur = $('calendrier-bandeau-urgentes');
  if(!conteneur) return;
  const urgentes = (calendrierCommandes || []).filter(c => c.dateLivraisonSouhaitee === 'ASAP' && !c.dateLivraison);
  if(!urgentes.length){ conteneur.hidden = true; conteneur.innerHTML = ''; return; }
  conteneur.hidden = false;
  conteneur.innerHTML = `
    <div class="entete-zone-prioritaires">⚡ À traiter le plus rapidement possible (${urgentes.length})</div>
    <div class="grille-pilules-urgentes">
      ${urgentes.map(c => `<span class="pilule-urgente-calendrier" title="${echapper(c.statutCommande)} — cliquer pour ouvrir la commande" data-calendrier-aller-vers="${echapper(c.reference)}" style="cursor:pointer"><span class="mono">${echapper(c.reference)}</span> · ${echapper(c.nom)}</span>`).join('')}
    </div>`;
}

/** Accepte aussi bien un format ISO (2026-08-04...) qu'un format français (04/08/2026) —
 *  les deux peuvent se croiser selon l'origine de la donnée. */
function parserDateCalendrier(valeur){
  if(!valeur) return null;
  const v = String(valeur).trim();
  if(!v) return null;
  const matchFr = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if(matchFr) return new Date(parseInt(matchFr[3],10), parseInt(matchFr[2],10)-1, parseInt(matchFr[1],10));
  const d = new Date(v);
  return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function cleJour(date){
  return date.getFullYear() + '-' + String(date.getMonth()+1).padStart(2,'0') + '-' + String(date.getDate()).padStart(2,'0');
}

function rendreCalendrier(){
  if(!calendrierCommandes) return;

  // Regroupe les commandes par jour, séparément pour souhaitée/réelle
  const parJour = {};
  function ajouter(cle, commande, type){
    if(!parJour[cle]) parJour[cle] = [];
    parJour[cle].push({ commande, type });
  }
  calendrierCommandes.forEach(c => {
    if(calendrierAfficherSouhaitee && c.statutCommande !== 'Livrée' && c.dateLivraisonSouhaitee && c.dateLivraisonSouhaitee !== 'ASAP'){
      const d = parserDateCalendrier(c.dateLivraisonSouhaitee);
      if(d) ajouter(cleJour(d), c, 'souhaitee');
    }
    // Date cible (réception + délai réglé dans Réglages) — seulement si la commande n'a pas
    // déjà une vraie date souhaitée plus précise, pour ne pas doubler l'affichage. Filtre
    // indépendant de "Souhaitées", pour pouvoir masquer l'un sans l'autre.
    if(calendrierAfficherCible && c.dateCible && !(c.dateLivraisonSouhaitee && c.dateLivraisonSouhaitee !== 'ASAP')){
      const d = parserDateCalendrier(c.dateCible);
      if(d) ajouter(cleJour(d), c, 'cible');
    }
    if(calendrierAfficherReelle && c.dateLivraison){
      const d = parserDateCalendrier(c.dateLivraison);
      if(d) ajouter(cleJour(d), c, 'reelle');
    }
  });

  if(calendrierAfficherLots){
    calendrierLots.forEach(lot => {
      const d = parserDateCalendrier(lot.dateLivraison);
      if(!d) return;
      ajouter(cleJour(d), {
        reference: lot.referenceLot, nom: `${lot.nomProjet} — ${lot.quantite} appareil${lot.quantite > 1 ? 's' : ''}`,
        statutCommande: lot.statut, dateLivraisonSouhaitee: '',
      }, 'lot');
    });
  }

  rendreBandeauUrgentesCalendrier();

  if(calendrierVueActuelle === 'semaine') rendreCalendrierSemaine(parJour);
  else rendreCalendrierMois(parJour);
}

function rendreCalendrierMois(parJour){
  const annee = calendrierDateRef.getFullYear();
  const mois = calendrierDateRef.getMonth();
  const NOMS_MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  $('calendrier-titre-periode').textContent = NOMS_MOIS[mois] + ' ' + annee;

  const premierJourMois = new Date(annee, mois, 1);
  const decalageDebut = (premierJourMois.getDay() + 6) % 7; // semaine commence lundi
  const nbJoursMois = new Date(annee, mois+1, 0).getDate();
  const aujourdHui = cleJour(new Date());

  let cellules = '';
  for(let i=0; i<decalageDebut; i++) cellules += '<div class="cellule-calendrier cellule-vide"></div>';
  for(let jour=1; jour<=nbJoursMois; jour++){
    const date = new Date(annee, mois, jour);
    const cle = cleJour(date);
    const evenements = parJour[cle] || [];
    cellules += construireCelluleCalendrier(jour, cle, evenements, cle === aujourdHui);
  }
  const totalCellules = decalageDebut + nbJoursMois;
  const resteApresDernierJour = (7 - (totalCellules % 7)) % 7;
  for(let i=0; i<resteApresDernierJour; i++) cellules += '<div class="cellule-calendrier cellule-vide"></div>';

  $('calendrier-grille').innerHTML = `
    <div class="grille-calendrier-entetes">
      <span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim</span>
    </div>
    <div class="grille-calendrier-mois">${cellules}</div>`;
  brancherClicsJoursCalendrier();
}

function rendreCalendrierSemaine(parJour){
  const debutSemaine = new Date(calendrierDateRef);
  const decalage = (debutSemaine.getDay() + 6) % 7;
  debutSemaine.setDate(debutSemaine.getDate() - decalage);
  const finSemaine = new Date(debutSemaine); finSemaine.setDate(finSemaine.getDate() + 6);

  const NOMS_MOIS_COURT = ['jan.','fév.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
  $('calendrier-titre-periode').textContent =
    debutSemaine.getDate() + ' ' + NOMS_MOIS_COURT[debutSemaine.getMonth()] + ' – ' +
    finSemaine.getDate() + ' ' + NOMS_MOIS_COURT[finSemaine.getMonth()] + ' ' + finSemaine.getFullYear();

  const aujourdHui = cleJour(new Date());
  let cellules = '';
  for(let i=0; i<7; i++){
    const date = new Date(debutSemaine); date.setDate(date.getDate() + i);
    const cle = cleJour(date);
    const evenements = parJour[cle] || [];
    cellules += construireCelluleCalendrier(date.getDate(), cle, evenements, cle === aujourdHui, true);
  }

  $('calendrier-grille').innerHTML = `
    <div class="grille-calendrier-entetes">
      <span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim</span>
    </div>
    <div class="grille-calendrier-semaine">${cellules}</div>`;
  brancherClicsJoursCalendrier();
}

function construireCelluleCalendrier(jour, cle, evenements, estAujourdhui, detaille){
  const max = detaille ? 8 : 3;
  const puces = evenements.slice(0, max).map(e => `
    <div class="puce-evenement-calendrier puce-${e.type}" title="${echapper(e.commande.reference)} — ${echapper(e.commande.nom)}${e.commande.dateLivraisonSouhaitee === 'ASAP' ? ' — Urgent' : ''}">
      ${e.type === 'lot' ? '📦' : e.type === 'cible' ? '🎯' : e.type === 'souhaitee' ? '📌' : '✅'}${e.commande.dateLivraisonSouhaitee === 'ASAP' ? '⚡' : ''} ${echapper(e.commande.nom)}
    </div>`).join('');
  const reste = evenements.length > max ? `<div class="puce-plus-calendrier">+${evenements.length - max}</div>` : '';
  return `<div class="cellule-calendrier${estAujourdhui ? ' cellule-aujourdhui' : ''}" data-jour="${cle}">
    <span class="numero-jour-calendrier">${jour}</span>
    <div class="evenements-jour-calendrier">${puces}${reste}</div>
  </div>`;
}

function brancherClicsJoursCalendrier(){
  document.querySelectorAll('.cellule-calendrier[data-jour]').forEach(cellule => {
    cellule.addEventListener('click', () => afficherDetailJourCalendrier(cellule.dataset.jour));
  });
}

function afficherDetailJourCalendrier(cle){
  const evenements = [];
  calendrierCommandes.forEach(c => {
    if(calendrierAfficherSouhaitee && c.dateLivraisonSouhaitee && c.dateLivraisonSouhaitee !== 'ASAP'){
      const d = parserDateCalendrier(c.dateLivraisonSouhaitee);
      if(d && cleJour(d) === cle) evenements.push({ commande: c, type: 'souhaitee' });
    }
    if(calendrierAfficherReelle && c.dateLivraison){
      const d = parserDateCalendrier(c.dateLivraison);
      if(d && cleJour(d) === cle) evenements.push({ commande: c, type: 'reelle' });
    }
  });
  if(!evenements.length) return;

  const [an, mo, jo] = cle.split('-');
  $('modale-jour-calendrier-titre').textContent = `${jo}/${mo}/${an}`;
  $('modale-jour-calendrier-liste').innerHTML = evenements.map(e => `
    <div class="ligne-jour-calendrier">
      <span class="puce-evenement-calendrier puce-${e.type}">${e.type === 'lot' ? '📦 Lot' : e.type === 'cible' ? '🎯 Date cible' : e.type === 'souhaitee' ? '📌 Souhaitée' : '✅ Livrée'}</span>
      <span class="mono">${echapper(e.commande.reference)}</span>
      <span>${echapper(e.commande.nom)}${e.commande.dateLivraisonSouhaitee === 'ASAP' ? ' ⚡' : ''}</span>
      <span class="pastille-statut-mini">${echapper(e.commande.statutCommande)}</span>
      <span class="materiel-jour-calendrier">${(e.commande.lignes || []).map(l => `${echapper(l.quantite)}× ${echapper(l.produit)}`).join(', ')}</span>
      ${e.type !== 'lot' ? `<button type="button" class="lien-details-calendrier" data-calendrier-aller-vers="${echapper(e.commande.reference)}">Détails →</button>` : ''}
    </div>`).join('');
  $('modale-jour-calendrier').hidden = false;
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-calendrier-aller-vers]');
  if(!b) return;
  $('modale-jour-calendrier').hidden = true;
  allerVersCommande(b.dataset.calendrierAllerVers);
});
$('btn-fermer-modale-jour-calendrier')?.addEventListener('click', () => $('modale-jour-calendrier').hidden = true);

/* ─── Navigation et filtres ─── */
document.querySelectorAll('#filtres-calendrier-vue button').forEach(b => b.classList.toggle('actif', b.dataset.calVue === calendrierVueActuelle));
document.querySelector('[data-cal-dates="souhaitee"]')?.classList.toggle('actif', calendrierAfficherSouhaitee);
document.querySelector('[data-cal-dates="cible"]')?.classList.toggle('actif', calendrierAfficherCible);
document.querySelector('[data-cal-dates="reelle"]')?.classList.toggle('actif', calendrierAfficherReelle);
document.querySelector('[data-cal-dates="lot"]')?.classList.toggle('actif', calendrierAfficherLots);

$('btn-calendrier-precedent').addEventListener('click', () => {
  if(calendrierVueActuelle === 'semaine') calendrierDateRef.setDate(calendrierDateRef.getDate() - 7);
  else calendrierDateRef.setMonth(calendrierDateRef.getMonth() - 1);
  rendreCalendrier();
});
$('btn-calendrier-suivant').addEventListener('click', () => {
  if(calendrierVueActuelle === 'semaine') calendrierDateRef.setDate(calendrierDateRef.getDate() + 7);
  else calendrierDateRef.setMonth(calendrierDateRef.getMonth() + 1);
  rendreCalendrier();
});
$('btn-calendrier-aujourdhui').addEventListener('click', () => { calendrierDateRef = new Date(); rendreCalendrier(); });

$('filtres-calendrier-vue').addEventListener('click', e => {
  const b = e.target.closest('button'); if(!b) return;
  document.querySelectorAll('#filtres-calendrier-vue button').forEach(x => x.classList.toggle('actif', x === b));
  calendrierVueActuelle = b.dataset.calVue;
  localStorage.setItem('cvdl-calendrier-vue', calendrierVueActuelle);
  rendreCalendrier();
});
$('filtres-calendrier-dates').addEventListener('click', e => {
  const b = e.target.closest('button'); if(!b) return;
  b.classList.toggle('actif');
  const type = b.dataset.calDates;
  if(type === 'souhaitee'){ calendrierAfficherSouhaitee = b.classList.contains('actif'); localStorage.setItem('cvdl-calendrier-souhaitee', calendrierAfficherSouhaitee ? 'oui' : 'non'); }
  else if(type === 'cible'){ calendrierAfficherCible = b.classList.contains('actif'); localStorage.setItem('cvdl-calendrier-cible', calendrierAfficherCible ? 'oui' : 'non'); }
  else if(type === 'lot'){ calendrierAfficherLots = b.classList.contains('actif'); localStorage.setItem('cvdl-calendrier-lots', calendrierAfficherLots ? 'oui' : 'non'); }
  else { calendrierAfficherReelle = b.classList.contains('actif'); localStorage.setItem('cvdl-calendrier-reelle', calendrierAfficherReelle ? 'oui' : 'non'); }
  rendreCalendrier();
});
