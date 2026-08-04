/* ═══ Calendrier des livraisons — dates souhaitées et réelles, mois ou semaine ═══
   Les données (légères : juste référence/nom/statut/dates) sont chargées une seule fois par
   session admin et gardées en mémoire — pas de raison de les rafraîchir à chaque changement
   de mois, la navigation dans le calendrier doit rester instantanée. */

let calendrierCommandes = null;
let calendrierChargeUneFois = false;
let calendrierDateRef = new Date();
let calendrierVueActuelle = localStorage.getItem('cvdl-calendrier-vue') || 'mois';
let calendrierAfficherSouhaitee = localStorage.getItem('cvdl-calendrier-souhaitee') !== 'non';
let calendrierAfficherReelle = localStorage.getItem('cvdl-calendrier-reelle') !== 'non';

async function chargerCalendrier(){
  $('calendrier-grille').innerHTML = '<p class="sous-question">Chargement…</p>';
  try{
    const r = await jsonp({action:'calendrier-commandes', password:motDePasse});
    if(!r.ok){ $('calendrier-grille').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur||'Chargement impossible.')}</div>`; return; }
    calendrierCommandes = r.commandes;
    rendreCalendrier();
  }catch(e){
    $('calendrier-grille').innerHTML = '<div class="msg msg-erreur">Chargement impossible — réessaie.</div>';
  }
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
    if(calendrierAfficherSouhaitee && c.dateLivraisonSouhaitee && c.dateLivraisonSouhaitee !== 'ASAP'){
      const d = parserDateCalendrier(c.dateLivraisonSouhaitee);
      if(d) ajouter(cleJour(d), c, 'souhaitee');
    }
    if(calendrierAfficherReelle && c.dateLivraison){
      const d = parserDateCalendrier(c.dateLivraison);
      if(d) ajouter(cleJour(d), c, 'reelle');
    }
  });

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
    <div class="puce-evenement-calendrier puce-${e.type}" title="${echapper(e.commande.reference)} — ${echapper(e.commande.nom)}">
      ${e.type === 'souhaitee' ? '📌' : '✅'} ${echapper(e.commande.nom)}
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
      <span class="puce-evenement-calendrier puce-${e.type}">${e.type === 'souhaitee' ? '📌 Souhaitée' : '✅ Réelle'}</span>
      <span class="mono">${echapper(e.commande.reference)}</span>
      <span>${echapper(e.commande.nom)}</span>
      <span class="pastille-statut-mini">${echapper(e.commande.statutCommande)}</span>
    </div>`).join('');
  $('modale-jour-calendrier').hidden = false;
}
$('btn-fermer-modale-jour-calendrier')?.addEventListener('click', () => $('modale-jour-calendrier').hidden = true);

/* ─── Navigation et filtres ─── */
document.querySelectorAll('#filtres-calendrier-vue button').forEach(b => b.classList.toggle('actif', b.dataset.calVue === calendrierVueActuelle));
document.querySelector('[data-cal-dates="souhaitee"]')?.classList.toggle('actif', calendrierAfficherSouhaitee);
document.querySelector('[data-cal-dates="reelle"]')?.classList.toggle('actif', calendrierAfficherReelle);

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
  else { calendrierAfficherReelle = b.classList.contains('actif'); localStorage.setItem('cvdl-calendrier-reelle', calendrierAfficherReelle ? 'oui' : 'non'); }
  rendreCalendrier();
});
