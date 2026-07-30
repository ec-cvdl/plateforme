/* ══════════════ COMMANDES ══════════════ */

async function recharger(){
  etat('Actualisation…', 'neutre');
  try{
    const r = await jsonp({action:'list', password:motDePasse, limite:limiteCommandesActuelle, decalage:decalageCommandesActuel});
    if(r.ok){ commandes = r.commandes; totalCommandes = r.total; rendre(); etat('À jour', 'succes'); }
  }catch(e){ etat('Actualisation impossible', 'erreur'); }
}
$('btn-recharger').addEventListener('click', recharger);

async function changerPageCommandes(nouveauDecalage){
  etat('Chargement…', 'chargement');
  try{
    const r = await jsonp({action:'list', password:motDePasse, limite:limiteCommandesActuelle, decalage:nouveauDecalage});
    if(r.ok){
      commandes = r.commandes; totalCommandes = r.total; decalageCommandesActuel = nouveauDecalage;
      rendre(); etat('À jour', 'succes');
    }
  }catch(e){ etat('Chargement impossible', 'erreur'); }
}
$('btn-page-precedente').addEventListener('click', () => {
  changerPageCommandes(Math.max(0, decalageCommandesActuel - limiteCommandesActuelle));
});
$('btn-page-suivante').addEventListener('click', () => {
  changerPageCommandes(decalageCommandesActuel + limiteCommandesActuelle);
});

$('filtres').addEventListener('click', e => {
  const b = e.target.closest('button');
  if(!b) return;
  filtre = b.dataset.f;
  document.querySelectorAll('#filtres button').forEach(x => x.classList.toggle('actif', x === b));
  rendre();
});
let rechercheCommandesActive = false;
let minuteurRechercheCommandes = null;
$('recherche').addEventListener('input', () => {
  clearTimeout(minuteurRechercheCommandes);
  const terme = $('recherche').value.trim();
  minuteurRechercheCommandes = setTimeout(async () => {
    if(!terme){
      rechercheCommandesActive = false;
      await changerPageCommandes(decalageCommandesActuel);
      return;
    }
    etat('Recherche…', 'chargement');
    try{
      const r = await jsonp({action:'list', password:motDePasse, recherche:terme});
      if(r.ok){
        commandes = r.commandes; totalCommandes = r.total; rechercheCommandesActive = true;
        rendre(); etat('À jour', 'succes');
      }
    }catch(e){ etat('Recherche impossible', 'erreur'); }
  }, 350);
});

function filtrer(){
  const q = $('recherche').value.trim().toLowerCase();
  return commandes.filter(c => {
    if(filtre === 'impaye'){
      if(c.statutPaiement === 'Payé') return false;
      if(c.statutCommande === 'Reçue' || c.statutCommande === 'Validée') return false;
      const structureFiltre = structures.find(s => s.code === c.code);
      if(structureFiltre && (structureFiltre.esn || structureFiltre.interne)) return false;
    }
    if(filtre !== 'tout' && filtre !== 'impaye' && c.statutCommande !== filtre) return false;
    if(!q) return true;
    return (c.reference + ' ' + c.nom + ' ' + c.email + ' ' + c.produit + ' ' + (c.numerosSerie || '')).toLowerCase().includes(q);
  });
}

function selectStatut(liste, courant, ligne, champ, libelle){
  const options = liste.map(v =>
    `<option value="${echapper(v)}"${v === courant ? ' selected' : ''}>${echapper(v)}</option>`
  ).join('');
  const teinte = TEINTES[courant] || 't-gris';
  return `<div class="champ-pilote"><span class="legende-pilotage">${libelle}</span>
    <select class="statut ${teinte}" data-ligne="${ligne}" data-champ="${champ}">${options}</select></div>`;
}

/** Petit aperçu global — calculé uniquement à partir des données déjà en mémoire
 *  (commandes, sav), donc sans le moindre appel réseau supplémentaire. */
function rendreApercuGeneral(){
  const el = $('apercu-general');
  if(!el) return;

  const nouvelles = commandes.filter(c => c.statutCommande === 'Reçue').length;

  const impayees = commandes.filter(c => {
    if(c.statutCommande !== 'Livrée') return false;
    if(c.statutPaiement === 'Payé' || c.statutPaiement === 'Remboursé') return false;
    const structureCmd = structures.find(s => s.code === c.code);
    return !(structureCmd && (structureCmd.esn || structureCmd.interne));
  }).length;

  const premierStatutSav = statutsSav.length ? statutsSav[0].statut : null;
  const savEnAttente = premierStatutSav ? sav.filter(t => t.statut === premierStatutSav).length : 0;

  const puces = [];
  if(nouvelles) puces.push({ n: nouvelles, l: nouvelles > 1 ? 'nouvelles commandes' : 'nouvelle commande', vue:'commandes', filtre:'Reçue' });
  if(savEnAttente) puces.push({ n: savEnAttente, l: savEnAttente > 1 ? 'tickets SAV en attente' : 'ticket SAV en attente', vue:'sav' });
  if(impayees) puces.push({ n: impayees, l: impayees > 1 ? 'commandes impayées' : 'commande impayée', vue:'commandes', filtre:'impaye', alerte:true });

  el.innerHTML = puces.map(p =>
    `<button type="button" class="puce-apercu${p.alerte ? ' niveau-alerte' : ''}" data-apercu-vue="${p.vue}" data-apercu-filtre="${p.filtre || ''}">
      <span class="n">${p.n}</span><span class="l">${echapper(p.l)}</span>
    </button>`
  ).join('');
  $('separateur-entete-pilules').hidden = !puces.length;
}
$('apercu-general').addEventListener('click', e => {
  const b = e.target.closest('[data-apercu-vue]');
  if(!b) return;
  document.querySelector(`.onglets [data-vue="${b.dataset.apercuVue}"]`)?.click();
  if(b.dataset.apercuFiltre){
    filtre = b.dataset.apercuFiltre;
    document.querySelectorAll('#filtres button').forEach(x => x.classList.toggle('actif', x.dataset.f === filtre));
    rendre();
  }
});

function rendre(){
  const banniereHistorique = $('bandeau-pagination');
  if(!rechercheCommandesActive && limiteCommandesActuelle > 0 && totalCommandes > limiteCommandesActuelle){
    const pageActuelle = Math.floor(decalageCommandesActuel / limiteCommandesActuelle) + 1;
    const nbPages = Math.ceil(totalCommandes / limiteCommandesActuelle);
    $('texte-pagination').textContent = `Page ${pageActuelle} sur ${nbPages} (${totalCommandes} commandes au total)`;
    $('btn-page-precedente').disabled = decalageCommandesActuel === 0;
    $('btn-page-suivante').disabled = decalageCommandesActuel + limiteCommandesActuelle >= totalCommandes;
    banniereHistorique.hidden = false;
  }else{
    banniereHistorique.hidden = true;
  }

  const aLivrer = {};
  commandes.forEach(c => {
    if (!['Reçue', 'Validée'].includes(c.statutCommande)) return;
    (c.lignes || []).forEach(l => {
      const qte = parseInt(l.quantite, 10) || 0;
      if (!qte || !l.produit) return;
      if (!aLivrer[l.produit]) aLivrer[l.produit] = 0;
      aLivrer[l.produit] += qte;
    });
  });

  const produitsAvecIcone = Object.keys(aLivrer).map(nom => {
    const info = produits.find(p => p.nom === nom);
    return { nom, quantite: aLivrer[nom], icone: info ? info.icone : '' };
  }).sort((a, b) => b.quantite - a.quantite);

  $('chiffres').innerHTML = produitsAvecIcone.length
    ? produitsAvecIcone.map(p => `
        <div class="puce-livraison">
          ${svgIconePuce(p.nom, p.icone)}
          <span class="n">${p.quantite}</span>
          <span class="l">${echapper(p.nom)}</span>
        </div>`).join('')
    : `<div class="puce-livraison"><span class="l">Rien à livrer actuellement</span></div>`;

  const visibles = filtrer();

  if(!visibles.length){
    $('liste').innerHTML = `<div class="vide">
      <strong>Aucune commande ici</strong>
      Ajustez le filtre ou la recherche pour en voir d'autres.
    </div>`;
    return;
  }

  $('liste').innerHTML = visibles.map(c => {
    const cb = c.moyenPaiement === 'Paiement en ligne (CB)';
    const structureCommande = structures.find(s => s.code === c.code);
    const estEsnCommande = !!(structureCommande && (structureCommande.esn || structureCommande.interne));
    const classe = c.statutCommande === 'Annulée' ? 'annulee'
                 : c.statutCommande === 'Reçue' ? 'en-attente'
                 : c.statutCommande === 'Préparée' ? 'preparee'
                 : c.statutCommande === 'En cours de livraison' ? 'en-livraison'
                 : (c.statutCommande === 'Livrée' && c.statutPaiement === 'Payé') ? 'close'
                 : 'cours';
    const nbFichiers = parseInt(c.nombreFichiers, 10) || 0;
    const nbSeries = (c.numerosSerie || '').split('\n').map(s => s.trim()).filter(Boolean).length;
    const liensColissimoCommande = (c.colissimo || '').split('\n').map(s => s.trim()).filter(Boolean);
    const nbColissimo = liensColissimoCommande.length;
    const produitInfo = produits.find(p => p.nom === c.produit);
    const nbCommentaire = (c.commentaire || '').trim().length;
    const devisDemandeBadge = c.devisDemande === 'Oui'
      ? `<span class="badge-devis-demande"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 22 20.5H2z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.5" r="0.6" fill="currentColor" stroke="none"/></svg>Devis demandé
          <button type="button" data-rejeter-devis-demande="${c.ligne}" title="Masquer ce rappel">✕</button>
        </span>`
      : '';
    const joursImpaye = (!estEsnCommande && c.statutCommande === 'Livrée' && c.statutPaiement !== 'Payé' && c.statutPaiement !== 'Remboursé')
      ? joursDepuis(c.dateLivraison) : null;
    const alerteImpayee = (joursImpaye !== null && joursImpaye >= seuilAlerteImpayee)
      ? `<div class="alerte-impayee">Impayée depuis ${joursImpaye} jour${joursImpaye > 1 ? 's' : ''}</div>` : '';

    const facturationOubliee = !estEsnCommande && c.statutCommande === 'Livrée' && c.statutPaiement === 'Payé' && !c.referenceFacture
      && !facturesManquantesRejetees.has(c.reference);
    const alerteFactureManquante = facturationOubliee
      ? `<div class="alerte-facture-manquante">
           Livrée et payée, mais aucune facture liée
           <button type="button" data-rejeter-alerte-facture="${echapper(c.reference)}" title="Masquer ce rappel">✕</button>
         </div>` : '';

    const badgeNouvelle = (c.statutCommande === 'Reçue' && estNouvelleCommande(c.date, c.heure))
      ? '<div class="badge-nouvelle">NEW</div>' : '';

    return `
    <div class="fiche-conteneur">
      ${badgeNouvelle}
      <article class="fiche ${classe}">
      ${classe === 'annulee' ? '<div class="ruban-annule">Commande annulée</div>' : ''}
      ${alerteImpayee}
      ${alerteFactureManquante}

      <div class="fiche-entete">
        <div class="fiche-entete-gauche">
          <div class="ref">${echapper(c.reference)}</div>
          <div class="date">${echapper(c.date)} <span class="heure">${echapper(c.heure)}</span></div>
          ${devisDemandeBadge}
        </div>
        <div class="fiche-badges-statut">
          ${badgeStatut(c.statutCommande)}
          ${estEsnCommande ? '' : badgeStatut(c.statutPaiement)}
          ${estEsnCommande ? '' : `<div class="rappel-montant-commande">${formaterMontant(c.montantFacture != null ? c.montantFacture : c.montantEstime)}</div>`}
        </div>
      </div>


      <div class="fiche-materiel-structure">
        <div class="materiel-lignes">
          ${(c.lignes || []).map(l => {
            const infoL = produits.find(p => p.nom === l.produit);
            return `<div class="materiel-ligne">
              ${svgIcone(l.produit, infoL ? infoL.icone : '')}
              <span class="q">${echapper(l.quantite)}×</span> ${echapper(l.produit)}
              <button type="button" class="btn-modifier-ligne-produit" data-commande-ligne="${c.ligne}" data-ligne-detail="${l.ligne || ''}" data-produit-actuel="${echapper(l.produit)}" data-quantite-actuelle="${l.quantite}" title="Modifier ce produit">✏️</button>
              ${(c.lignes.length > 1 && l.ligne) ? `<button type="button" class="btn-retirer-ligne-produit" data-commande-ligne="${c.ligne}" data-ligne-detail="${l.ligne}" title="Retirer ce produit">✕</button>` : ''}
            </div>`;
          }).join('')}
          <button type="button" class="btn-ajouter-ligne-produit" data-commande-ligne="${c.ligne}">+ Ajouter un produit</button>
        </div>
        <div class="bloc-structure">
          <span class="nom">${echapper(c.nom)}</span>
          <span class="coords-resume">
            <a href="mailto:${echapper(c.email)}">${echapper(c.email)}</a> · ${echapper(c.telephone)}
          </span>
        </div>
      </div>

      <div class="fiche-actions-rapides">
        ${c.dossier
          ? `<a class="pilule-action pilule-remplie" href="${echapper(c.dossier)}" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8A2 2 0 0 1 21 9.5V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>
              <span>Fichiers</span>
              ${nbFichiers ? `<span class="pilule-badge">${nbFichiers}</span>` : ''}
            </a>`
          : `<span class="pilule-action pilule-vide">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8A2 2 0 0 1 21 9.5V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>
              <span>Aucun fichier</span>
            </span>`}
        <button type="button" class="pilule-action pilule-notif ${nbCommentaire ? 'pilule-remplie' : ''}" data-commentaire-ligne="${c.ligne}" data-commentaire-valeur="${echapper(c.commentaire)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          <span>Commentaire</span>
          ${nbCommentaire ? '<span class="point-notif"></span>' : ''}
        </button>
        <button type="button" class="pilule-action pilule-colissimo ${nbColissimo ? 'pilule-remplie' : ''}" data-colissimo-ligne="${c.ligne}" data-colissimo-valeur="${echapper(c.colissimo)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8.5v7l-9 4.5-9-4.5v-7L12 4z"/><path d="M3.3 8.2 12 12.5l8.7-4.3M12 12.5V21"/></svg>
          <span>Colissimo</span>
          ${nbColissimo ? `<span class="pilule-badge pilule-badge-colissimo">${nbColissimo}</span>` : ''}
        </button>
        <button type="button" class="pilule-action pilule-serie ${nbSeries ? 'pilule-remplie' : ''}" data-serie-ligne="${c.ligne}" data-serie-valeur="${echapper(c.numerosSerie)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h13l3 3.5-3 3.5H4z"/><circle cx="8" cy="10.5" r="0.9" fill="currentColor" stroke="none"/></svg>
          <span>N° série</span>
          ${nbSeries ? `<span class="pilule-badge pilule-badge-serie">${nbSeries}</span>` : ''}
        </button>
      </div>

      <div class="fiche-boutons-modales">
        <button type="button" class="btn-ouvrir-modale" data-ouvrir-modale-statut="${c.ligne}">
          Statut &amp; livraison
          <span class="sous-statut">${echapper(c.statutCommande)}${c.dateLivraison ? ' · ' + echapper(c.dateLivraison) : ''}</span>
        </button>
        ${estEsnCommande ? '' : `<button type="button" class="btn-ouvrir-modale style-paiement" data-ouvrir-modale-paiement="${c.ligne}">
          Paiement &amp; facturation
          <span class="sous-statut">${echapper(c.statutPaiement)}${typeof c.montantFacture === 'number' ? ' · ' + formaterMontant(c.montantFacture) : ''}</span>
        </button>`}
      </div>

      <div class="fiche-pied">
        ${classe !== 'annulee' ? construireTimelineCommande(c.statutCommande) : '<div style="flex:1"></div>'}
        ${(c.statutCommande === 'En cours de livraison' && liensColissimoCommande.length)
          ? `<button type="button" class="btn-icone-fiche" data-suivre-colis="${echapper(JSON.stringify(liensColissimoCommande))}" title="Suivre le colis" aria-label="Suivre le colis">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8.5v7l-9 4.5-9-4.5v-7L12 4z"/><path d="M3.3 8.2 12 12.5l8.7-4.3M12 12.5V21"/></svg>
            </button>` : ''}
        <button type="button" class="btn-icone-fiche" data-modifier-commande="${c.ligne}" title="Modifier la commande" aria-label="Modifier la commande">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l11-11-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>
        </button>
        <button type="button" class="btn-icone-fiche danger" data-commande-supprimer="${c.ligne}" data-ref="${echapper(c.reference)}" title="Supprimer la commande" aria-label="Supprimer la commande">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7m2 0v13a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 20V7h10z"/><path d="M10 11v6M14 11v6"/></svg>
        </button>
      </div>
    </article>
    </div>`;
  }).join('');
  rendreApercuGeneral();
}

async function enregistrer(el){
  const ligne  = parseInt(el.dataset.ligne, 10);
  const champ  = el.dataset.champ;
  const valeur = el.value;

  // La teinte suit le nouveau statut sans attendre le rechargement
  if(el.matches('select.statut')){
    el.className = 'statut ' + (TEINTES[valeur] || 't-gris');
  }

  el.disabled = true;
  try{
    const r = await poster({action:'update', ligne, champ, valeur});
    if(r.ok){
      const c = commandes.find(x => x.ligne === ligne);
      if(c) c[champ] = (champ === 'dateLivraison' && valeur) ? valeur.split('-').reverse().join('/') : valeur;
      if(r.devis){
        etat(`Devis ${r.devis} généré — ${formaterMontant(r.montant)}`, 'succes');
        chargerDevis();
      }else if(r.avertissement){
        etat('Statut enregistré — devis non généré : ' + r.avertissement, 'erreur');
      }else{
        etat('Enregistré', 'succes');
      }
      if(champ.startsWith('statut') || champ === 'moyenPaiement' || champ === 'dateLivraison') rendre();
    }else{
      etat(r.erreur || 'Enregistrement impossible', 'erreur');
    }
  }catch(e){
    etat('Enregistrement impossible', 'erreur');
  }
  el.disabled = false;
}

$('liste').addEventListener('change', e => {
  const el = e.target;
  if(!el.matches('select[data-ligne], input[data-ligne]')) return;

  // Une annulation est irréversible sur le stock : on le confirme avant d'appliquer
  if(el.dataset.champ === 'statutCommande' && el.value === 'Annulée'){
    if(!confirm('Confirmer l\'annulation de cette commande ? Le stock du produit sera automatiquement recrédité.')){
      const c = commandes.find(x => x.ligne === parseInt(el.dataset.ligne, 10));
      if(c) el.value = c.statutCommande;
      return;
    }
  }
  enregistrer(el);
});

/* ══════════════ Modale Statut & livraison ══════════════ */

let statutModaleLigneCourante = null;

function ouvrirModaleStatut(ligne){
  const c = commandes.find(x => x.ligne === ligne);
  if(!c) return;
  statutModaleLigneCourante = ligne;
  $('modale-statut-ref').textContent = c.reference + ' — ' + c.nom;

  $('modale-statut-select').innerHTML = STATUTS_COMMANDE.map(s =>
    `<option value="${echapper(s)}"${s === c.statutCommande ? ' selected' : ''}>${echapper(s)}</option>`).join('');
  $('modale-statut-select').className = 'statut ' + (TEINTES[c.statutCommande] || 't-gris');
  $('modale-statut-select').dataset.ligne = ligne;
  $('modale-statut-select').dataset.champ = 'statutCommande';

  $('modale-statut-date-livraison').value = dateLivraisonISO(c.dateLivraison);
  $('modale-statut-date-livraison').dataset.ligne = ligne;
  $('modale-statut-date-livraison').dataset.champ = 'dateLivraison';
  $('bloc-date-livraison').hidden = c.statutCommande !== 'Livrée';

  $('modale-statut').hidden = false;
}

$('liste').addEventListener('click', e => {
  const b = e.target.closest('[data-ouvrir-modale-statut]');
  if(!b) return;
  ouvrirModaleStatut(parseInt(b.dataset.ouvrirModaleStatut, 10));
});

$('liste').addEventListener('click', e => {
  const b = e.target.closest('[data-rejeter-alerte-facture]');
  if(!b) return;
  rejeterAlerteFacture(b.dataset.rejeterAlerteFacture);
  b.closest('.alerte-facture-manquante').remove();
});

$('liste').addEventListener('click', async e => {
  const b = e.target.closest('[data-rejeter-devis-demande]');
  if(!b) return;
  const ligne = parseInt(b.dataset.rejeterDevisDemande, 10);
  b.disabled = true;
  try{
    const r = await poster({ action:'update', ligne, champ:'devisDemande', valeur:'' });
    if(r.ok){
      const c = commandes.find(x => x.ligne === ligne);
      if(c) c.devisDemande = '';
      b.closest('.badge-devis-demande').remove();
    }else{
      etat(r.erreur || 'Opération impossible', 'erreur');
      b.disabled = false;
    }
  }catch(err){ etat('Opération impossible', 'erreur'); b.disabled = false; }
});
$('modale-statut-fermer').addEventListener('click', () => $('modale-statut').hidden = true);

/* ══════════════ Modale : ajouter/modifier une ligne de produit sur une commande ══════════════ */
let ligneProduitContexte = null; // { commandeLigne, ligneDetail }

function remplirSelectProduitsModaleLigne(produitActuel){
  $('ligne-produit-select').innerHTML = produits.map(p =>
    `<option value="${echapper(p.nom)}" ${p.nom === produitActuel ? 'selected' : ''}>${echapper(p.nom)}</option>`).join('');
}

$('liste').addEventListener('click', e => {
  const bAjouter = e.target.closest('.btn-ajouter-ligne-produit');
  if(bAjouter){
    ligneProduitContexte = { commandeLigne: parseInt(bAjouter.dataset.commandeLigne, 10), ligneDetail: null };
    $('titre-modale-ligne-produit').textContent = 'Ajouter un produit';
    remplirSelectProduitsModaleLigne(null);
    $('ligne-produit-quantite').value = 1;
    $('retour-ligne-produit').innerHTML = '';
    $('modale-ligne-produit').hidden = false;
    return;
  }
  const bModifier = e.target.closest('.btn-modifier-ligne-produit');
  if(bModifier){
    ligneProduitContexte = {
      commandeLigne: parseInt(bModifier.dataset.commandeLigne, 10),
      ligneDetail: bModifier.dataset.ligneDetail ? parseInt(bModifier.dataset.ligneDetail, 10) : null
    };
    $('titre-modale-ligne-produit').textContent = 'Modifier ce produit';
    remplirSelectProduitsModaleLigne(bModifier.dataset.produitActuel);
    $('ligne-produit-quantite').value = bModifier.dataset.quantiteActuelle;
    $('retour-ligne-produit').innerHTML = '';
    $('modale-ligne-produit').hidden = false;
    return;
  }
  const bRetirer = e.target.closest('.btn-retirer-ligne-produit');
  if(bRetirer){
    if(!confirm('Retirer ce produit de la commande ?')) return;
    const commandeLigne = parseInt(bRetirer.dataset.commandeLigne, 10);
    const ligneDetail = parseInt(bRetirer.dataset.ligneDetail, 10);
    bRetirer.disabled = true;
    poster({ action:'commande-ligne-supprimer', password: motDePasse, ligneCommande: commandeLigne, ligne: ligneDetail })
      .then(async r => {
        if(r.ok){ await recharger(); etat('Produit retiré', 'succes'); }
        else{ etat(r.erreur || 'Suppression impossible', 'erreur'); bRetirer.disabled = false; }
      })
      .catch(() => { etat('Suppression impossible', 'erreur'); bRetirer.disabled = false; });
    return;
  }
});

$('ligne-produit-annuler').addEventListener('click', () => $('modale-ligne-produit').hidden = true);

$('ligne-produit-enregistrer').addEventListener('click', async () => {
  if(!ligneProduitContexte) return;
  const produit = $('ligne-produit-select').value;
  const quantite = parseInt($('ligne-produit-quantite').value, 10);
  if(!produit || !quantite || quantite < 1){
    $('retour-ligne-produit').innerHTML = '<div class="msg msg-erreur">Choisis un produit et une quantité valide.</div>';
    return;
  }

  $('ligne-produit-enregistrer').disabled = true;
  $('retour-ligne-produit').innerHTML = '';
  try{
    const action = ligneProduitContexte.ligneDetail ? 'commande-ligne-modifier' : 'commande-ligne-ajouter';
    const r = await poster({
      action, password: motDePasse,
      ligneCommande: ligneProduitContexte.commandeLigne,
      ligne: ligneProduitContexte.ligneDetail,
      produit, quantite
    });
    if(r.ok){
      $('modale-ligne-produit').hidden = true;
      await recharger();
      etat('Produit enregistré', 'succes');
    }else{
      $('retour-ligne-produit').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-ligne-produit').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  $('ligne-produit-enregistrer').disabled = false;
});

$('modale-statut-select').addEventListener('change', async e => {
  // Même confirmation d'annulation que sur la fiche
  if(e.target.value === 'Annulée'){
    const c = commandes.find(x => x.ligne === statutModaleLigneCourante);
    if(!confirm('Confirmer l\'annulation de cette commande ? Le stock du produit sera automatiquement recrédité.')){
      e.target.value = c ? c.statutCommande : e.target.value;
      return;
    }
  }
  $('bloc-date-livraison').hidden = e.target.value !== 'Livrée';
  await enregistrer(e.target);
  // Reste ouverte : juste rafraîchie une fois la confirmation serveur reçue (commandes[]
  // mis à jour dans enregistrer()). La fermeture reste un geste manuel de la personne.
  ouvrirModaleStatut(statutModaleLigneCourante);
});
$('modale-statut-date-livraison').addEventListener('change', e => enregistrer(e.target));

/* ══════════════ Modale Modifier la commande (produit, quantité, paiement, commentaire) ══════════════ */

let modifierCommandeLigneCourante = null;

function ouvrirModaleModifierCommande(ligne){
  const c = commandes.find(x => x.ligne === ligne);
  if(!c) return;
  modifierCommandeLigneCourante = ligne;
  $('modale-modifier-ref').textContent = c.reference + ' — ' + c.nom;

  $('modale-modifier-produit').innerHTML = produits.map(p =>
    `<option value="${echapper(p.nom)}"${p.nom === c.produit ? ' selected' : ''}>${echapper(p.nom)}</option>`).join('');

  $('modale-modifier-quantite').value = c.quantite;

  $('modale-modifier-paiement').innerHTML = MOYENS_PAIEMENT.map(m =>
    `<option value="${echapper(m)}"${m === c.moyenPaiement ? ' selected' : ''}>${echapper(m)}</option>`).join('');

  const structureModifier = structures.find(s => s.code === c.code);
  $('bloc-modifier-paiement').hidden = !!(structureModifier && (structureModifier.esn || structureModifier.interne));

  $('modale-modifier-commentaire').value = c.commentaire || '';

  $('modale-modifier-avertissement-stock').style.display = 'none';
  $('retour-modifier-commande').innerHTML = '';
  $('modale-modifier-commande').hidden = false;
}

$('liste').addEventListener('click', e => {
  const bSuivre = e.target.closest('[data-suivre-colis]');
  if(bSuivre){
    try{
      const liens = JSON.parse(bSuivre.dataset.suivreColis);
      liens.forEach(l => window.open(l, '_blank', 'noopener'));
    }catch(e){}
    return;
  }
  const b = e.target.closest('[data-modifier-commande]');
  if(!b) return;
  ouvrirModaleModifierCommande(parseInt(b.dataset.modifierCommande, 10));
});
$('modale-modifier-annuler').addEventListener('click', () => $('modale-modifier-commande').hidden = true);

$('modale-modifier-enregistrer').addEventListener('click', async () => {
  const c = commandes.find(x => x.ligne === modifierCommandeLigneCourante);
  if(!c) return;

  const nouveauProduit = $('modale-modifier-produit').value;
  const nouvelleQuantite = parseInt($('modale-modifier-quantite').value, 10);
  const nouveauMoyenPaiement = $('modale-modifier-paiement').value;
  const nouveauCommentaire = $('modale-modifier-commentaire').value;

  $('modale-modifier-enregistrer').disabled = true;
  $('retour-modifier-commande').innerHTML = '';

  try{
    // Le produit/quantité ne bougent que si vraiment modifiés, pour ne pas déclencher
    // un mouvement de stock inutile.
    if(nouveauProduit !== c.produit || nouvelleQuantite !== parseInt(c.quantite, 10)){
      const r = await poster({
        action: 'commande-modifier-produit',
        ligne: modifierCommandeLigneCourante,
        produit: nouveauProduit,
        quantite: nouvelleQuantite
      });
      if(!r.ok){
        $('retour-modifier-commande').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
        $('modale-modifier-enregistrer').disabled = false;
        return;
      }
      c.produit = nouveauProduit;
      c.quantite = nouvelleQuantite;
      chargerProduits(); // le stock affiché ailleurs doit refléter le mouvement
    }

    if(nouveauMoyenPaiement !== c.moyenPaiement){
      await poster({ action:'update', ligne: modifierCommandeLigneCourante, champ:'moyenPaiement', valeur: nouveauMoyenPaiement });
      c.moyenPaiement = nouveauMoyenPaiement;
    }
    if(nouveauCommentaire !== (c.commentaire || '')){
      await poster({ action:'update', ligne: modifierCommandeLigneCourante, champ:'commentaire', valeur: nouveauCommentaire });
      c.commentaire = nouveauCommentaire;
    }

    $('modale-modifier-commande').hidden = true;
    etat('Commande modifiée', 'succes');
    rendre();
  }catch(e){
    $('retour-modifier-commande').innerHTML = '<div class="msg msg-erreur">Modification impossible.</div>';
  }
  $('modale-modifier-enregistrer').disabled = false;
});

/* ══════════════ Modale Paiement & facturation ══════════════ */

let paiementModaleLigneCourante = null;

function ouvrirModalePaiement(ligne){
  const c = commandes.find(x => x.ligne === ligne);
  if(!c) return;
  paiementModaleLigneCourante = ligne;
  $('modale-paiement-ref').textContent = c.reference + ' — ' + c.nom;

  $('modale-paiement-statut').innerHTML = STATUTS_PAIEMENT.map(s =>
    `<option value="${echapper(s)}"${s === c.statutPaiement ? ' selected' : ''}>${echapper(s)}</option>`).join('');
  $('modale-paiement-statut').className = 'statut ' + (TEINTES[c.statutPaiement] || 't-gris');
  $('modale-paiement-statut').dataset.ligne = ligne;
  $('modale-paiement-statut').dataset.champ = 'statutPaiement';

  $('modale-paiement-moyen').innerHTML = MOYENS_PAIEMENT.map(m =>
    `<option value="${echapper(m)}"${m === c.moyenPaiement ? ' selected' : ''}>${echapper(m)}</option>`).join('');
  $('modale-paiement-moyen').dataset.ligne = ligne;
  $('modale-paiement-moyen').dataset.champ = 'moyenPaiement';

  const cb = c.moyenPaiement === 'Paiement en ligne (CB)';
  $('modale-paiement-lien').value = c.lienPaiement || '';
  $('modale-paiement-lien').disabled = !cb;
  $('modale-paiement-lien').dataset.ligne = ligne;
  $('modale-paiement-lien').dataset.champ = 'lienPaiement';

  $('modale-paiement-devis-zone').innerHTML = c.referenceDevis
    ? `<label for="modale-paiement-devis">Référence devis</label>
       <input type="text" class="mono" id="modale-paiement-devis" data-ligne="${ligne}" data-champ="referenceDevis" value="${echapper(c.referenceDevis)}">`
    : `<button type="button" class="btn-facturer-direct" style="width:100%;margin-top:10px" data-devis-direct-ligne="${ligne}">Faire un devis</button>`;

  $('modale-paiement-facture-zone').innerHTML = c.referenceFacture
    ? `<label for="modale-paiement-facture">Référence facture</label>
       <input type="text" class="mono" id="modale-paiement-facture" data-ligne="${ligne}" data-champ="referenceFacture" value="${echapper(c.referenceFacture)}">`
    : `<button type="button" class="btn-facturer-direct" style="width:100%;margin-top:10px" data-facturer-ligne="${ligne}" data-facturer-ref="${echapper(c.reference)}">Facturer directement</button>`;

  // Structure ESN : ni devis, ni facture — la commande vit uniquement dans l'onglet Commandes
  const structureCommande = structures.find(s => s.code === c.code);
  if(structureCommande && (structureCommande.esn || structureCommande.interne)){
    const messageEsn = '<p class="reglage-texte" style="margin-top:10px">Structure ESN — aucun devis ni facture pour cette commande.</p>';
    if(!c.referenceDevis) $('modale-paiement-devis-zone').innerHTML = messageEsn;
    if(!c.referenceFacture) $('modale-paiement-facture-zone').innerHTML = messageEsn;
  }

  $('modale-paiement').hidden = false;
}

$('liste').addEventListener('click', e => {
  const b = e.target.closest('[data-ouvrir-modale-paiement]');
  if(!b) return;
  ouvrirModalePaiement(parseInt(b.dataset.ouvrirModalePaiement, 10));
});
$('modale-paiement-fermer').addEventListener('click', () => $('modale-paiement').hidden = true);

$('modale-paiement-statut').addEventListener('change', e => enregistrer(e.target));
$('modale-paiement-moyen').addEventListener('change', e => {
  enregistrer(e.target);
  $('modale-paiement-lien').disabled = e.target.value !== 'Paiement en ligne (CB)';
});
$('modale-paiement-lien').addEventListener('change', e => enregistrer(e.target));

// Le bouton "Facturer directement"/"Faire un devis" et les champs de référence sont injectés
// dynamiquement dans #modale-paiement-devis-zone / #modale-paiement-facture-zone —
// délégation nécessaire sur le conteneur de la modale.
$('modale-paiement').addEventListener('change', e => {
  if(e.target.matches('#modale-paiement-facture') || e.target.matches('#modale-paiement-devis')) enregistrer(e.target);
});
$('modale-paiement').addEventListener('click', async e => {
  const bDevis = e.target.closest('[data-devis-direct-ligne]');
  if(bDevis){
    const ligne = parseInt(bDevis.dataset.devisDirectLigne, 10);
    bDevis.disabled = true;
    bDevis.textContent = 'Génération…';
    try{
      const r = await poster({ action:'commande-devis-direct', ligne });
      if(r.ok){
        const c = commandes.find(x => x.ligne === ligne);
        if(c) c.referenceDevis = r.devis;
        ouvrirModalePaiement(ligne); // réaffiche la modale avec le champ référence, maintenant rempli
        etat('Devis créé', 'succes');
      }else{
        etat(r.erreur || 'Création du devis impossible', 'erreur');
        bDevis.disabled = false;
        bDevis.textContent = 'Faire un devis';
      }
    }catch(err){
      etat('Création du devis impossible', 'erreur');
      bDevis.disabled = false;
      bDevis.textContent = 'Faire un devis';
    }
    return;
  }

  const b = e.target.closest('[data-facturer-ligne]');
  if(!b) return;
  ouvrirModaleFacturerDirect(parseInt(b.dataset.facturerLigne, 10));
});

