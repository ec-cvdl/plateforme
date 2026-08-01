/* ══════════════ COMMANDES ══════════════ */

/* ─── Style de carte commande (couleur par défaut, mémorisé sur cet appareil) ─── */
function appliquerStyleCarteCommande(style){
  if(style === 'terminal') style = 'couleur'; // style retiré : on rabat une préférence déjà mémorisée sur cet appareil
  document.body.classList.remove('carte-style-couleur', 'carte-style-pastille', 'carte-style-meteo');
  document.body.classList.add('carte-style-' + style);
  document.querySelectorAll('#selecteur-style-carte button').forEach(b => b.classList.toggle('actif', b.dataset.styleCarte === style));
  try{ localStorage.setItem('cvdl-style-carte-commande', style); }catch(e){}
}
$('selecteur-style-carte').addEventListener('click', e => {
  const b = e.target.closest('[data-style-carte]');
  if(!b) return;
  appliquerStyleCarteCommande(b.dataset.styleCarte);
});
try{
  appliquerStyleCarteCommande(localStorage.getItem('cvdl-style-carte-commande') || 'couleur');
}catch(e){
  appliquerStyleCarteCommande('couleur');
}

function appliquerGrilleCarteCommande(nb){
  $('liste').classList.remove('grille-2', 'grille-3');
  if(nb === '2') $('liste').classList.add('grille-2');
  if(nb === '3') $('liste').classList.add('grille-3');
  document.querySelectorAll('#selecteur-grille-carte button').forEach(b => b.classList.toggle('actif', b.dataset.grilleCarte === nb));
  try{ localStorage.setItem('cvdl-grille-carte-commande', nb); }catch(e){}
}
$('selecteur-grille-carte').addEventListener('click', e => {
  const b = e.target.closest('[data-grille-carte]');
  if(!b) return;
  appliquerGrilleCarteCommande(b.dataset.grilleCarte);
});
try{
  appliquerGrilleCarteCommande(localStorage.getItem('cvdl-grille-carte-commande') || '1');
}catch(e){
  appliquerGrilleCarteCommande('1');
}

async function recharger(){
  etat('Actualisation…', 'neutre');
  try{
    const r = await jsonp({action:'list', password:motDePasse, limite:limiteCommandesActuelle, decalage:decalageCommandesActuel});
    if(r.ok){ commandes = r.commandes; totalCommandes = r.total; appliquerAgregatsCommandes(r); rendre(); etat('À jour', 'succes'); }
  }catch(e){ etat('Actualisation impossible', 'erreur'); }
}
$('btn-recharger').addEventListener('click', recharger);

async function changerPageCommandes(nouveauDecalage){
  etat('Chargement…', 'chargement');
  try{
    const r = await jsonp({action:'list', password:motDePasse, limite:limiteCommandesActuelle, decalage:nouveauDecalage});
    if(r.ok){
      commandes = r.commandes; totalCommandes = r.total; decalageCommandesActuel = nouveauDecalage; appliquerAgregatsCommandes(r);
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
        commandes = r.commandes; totalCommandes = r.total; rechercheCommandesActive = true; appliquerAgregatsCommandes(r);
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
    if(filtre === 'urgent' && c.dateLivraisonSouhaitee !== 'ASAP') return false;
    if(filtre !== 'tout' && filtre !== 'impaye' && filtre !== 'urgent' && c.statutCommande !== filtre) return false;
    if(!q) return true;
    return (c.reference + ' ' + c.nom + ' ' + c.email + ' ' + c.produit + ' ' + (c.numerosSerie || '')).toLowerCase().includes(q);
  });
}

/** Petit aperçu global — calculé uniquement à partir des données déjà en mémoire
 *  (commandes, sav), donc sans le moindre appel réseau supplémentaire. */
function rendreApercuGeneral(){
  const el = $('apercu-general');
  if(!el) return;

  const nouvelles = nombreNouvellesGlobal;
  const impayees = nombreImpayeesGlobal;
  const savEnAttente = nombreSavEnAttenteGlobal;

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

  const aLivrer = chiffresLivraisonGlobal;

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
    const structureCommande = structures.find(s => s.code === c.code);
    const estEsnCommande = !!(structureCommande && (structureCommande.esn || structureCommande.interne));
    const estAnnulee = c.statutCommande === 'Annulée';
    const teinte = estAnnulee ? 't-gris' : (TEINTES[c.statutCommande] || 't-gris');
    const materielResume = (c.lignes || []).map(l => {
      const infoProduit = produits.find(p => p.nom === l.produit);
      const icone = svgIconePuce(l.produit, infoProduit ? infoProduit.icone : '');
      return `<span class="ccm-materiel-item">${icone}${echapper(l.quantite)}× ${echapper(l.produit)}</span>`;
    }).join('<span class="ccm-materiel-sep">│</span>');

    const joursImpaye = (!estEsnCommande && c.statutCommande === 'Livrée' && c.statutPaiement !== 'Payé' && c.statutPaiement !== 'Remboursé')
      ? joursDepuis(c.dateLivraison) : null;
    const alerteImpayee = (joursImpaye !== null && joursImpaye >= seuilAlerteImpayee)
      ? `<div class="ccm-alerte">Impayée depuis ${joursImpaye} jour${joursImpaye > 1 ? 's' : ''}</div>` : '';

    const facturationOubliee = !estEsnCommande && c.statutCommande === 'Livrée' && c.statutPaiement === 'Payé' && !c.referenceFacture
      && !facturesManquantesRejetees.has(c.reference);
    const alerteFactureManquante = facturationOubliee
      ? `<div class="ccm-alerte">Livrée et payée, mais aucune facture liée</div>` : '';

    const alerteDoublon = (String(c.commentaire || '').startsWith('⚠️ DOUBLON POTENTIEL DÉTECTÉ') && !doublonsRejetes.has(c.reference))
      ? `<div class="ccm-alerte ccm-alerte-fermable">⚠️ Doublon potentiel détecté — vérifier les précédentes commandes de cette structure
          <button type="button" class="ccm-alerte-fermer" data-rejeter-alerte-doublon="${echapper(c.reference)}" aria-label="Fermer cette alerte" title="Fermer">×</button>
        </div>` : '';

    const alerteLienPaiementClique = (!estEsnCommande && c.dernierClicLienPaiement && c.statutPaiement !== 'Payé' && c.statutPaiement !== 'Remboursé')
      ? `<div class="ccm-alerte">Lien de paiement consulté le ${echapper(c.dernierClicLienPaiement)} — vérifier le statut du paiement</div>` : '';

    const badgeNouvelle = (c.statutCommande === 'Reçue' && estNouvelleCommande(c.date, c.heure))
      ? '<div class="badge-nouvelle">NEW</div>' : '';

    const premierProduitNom = (c.lignes && c.lignes[0]) ? c.lignes[0].produit : c.produit;
    const infoPremierProduit = produits.find(p => p.nom === premierProduitNom);
    const iconeMeteo = emojiPour(premierProduitNom || '', infoPremierProduit ? infoPremierProduit.icone : '');
    const iconeStatutPastille = ICONES_STATUT[c.statutCommande]
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONES_STATUT[c.statutCommande]}</svg>`
      : '';

    const zoneEtapeSuivante = estAnnulee ? '' : construireZoneEtapeSuivante(c);

    const pilule = (classe, svgPath, libelle, remplie, dataAttr, nombre, pointNotif) => `
      <button type="button" class="ccm-pilule-mini ${classe}${remplie ? ' pilule-remplie' : ''}" ${dataAttr}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgPath}</svg>
        <span>${libelle}</span>
        ${nombre ? `<span class="ccm-pilule-badge">${nombre}</span>` : ''}
        ${pointNotif ? '<span class="point-notif-mini"></span>' : ''}
      </button>`;
    const nbSeriesCarte = (c.numerosSerie || '').split('\n').map(s => s.trim()).filter(Boolean).length;
    const nbColissimoCarte = (c.colissimo || '').split('\n').map(s => s.trim()).filter(Boolean).length;
    const aCommentaire = !!(c.commentaire || '').trim();
    const pilulesBas = estAnnulee ? '' : `
      <div class="ccm-pilules-bas">
        ${pilule('ccm-pilule-commentaire', '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>', 'Commentaire', aCommentaire, `data-commentaire-ligne="${c.ligne}" data-commentaire-valeur="${echapper(c.commentaire)}"`, null, aCommentaire)}
        ${pilule('ccm-pilule-serie', '<path d="M4 7h13l3 3.5-3 3.5H4z"/><circle cx="8" cy="10.5" r="0.9" fill="currentColor" stroke="none"/>', 'N° série', !!nbSeriesCarte, `data-serie-ligne="${c.ligne}" data-serie-valeur="${echapper(c.numerosSerie)}"`, nbSeriesCarte)}
        ${pilule('ccm-pilule-colissimo', '<path d="M21 8.5v7l-9 4.5-9-4.5v-7L12 4z"/><path d="M3.3 8.2 12 12.5l8.7-4.3M12 12.5V21"/>', c.livraisonSansEnvoi ? 'Sans envoi' : 'Colissimo', !!nbColissimoCarte || !!c.livraisonSansEnvoi, `data-colissimo-ligne="${c.ligne}" data-colissimo-valeur="${echapper(c.colissimo)}"`, nbColissimoCarte)}
      </div>`;


    return `
    <div class="fiche-conteneur">
      ${badgeNouvelle}
      <article class="carte-cmd-mini ${teinte}${estAnnulee ? ' annulee' : ''}">
        <div class="ccm-topbar">
          <div class="ccm-statut-label">
            <div class="ccm-pastille ${teinte}">${iconeStatutPastille}</div>
            <span class="ccm-statut">${echapper(c.statutCommande)}</span>
            ${c.dateLivraisonSouhaitee === 'ASAP' ? '<span class="ccm-badge-urgent" title="Livraison la plus rapide possible">⚡</span>' : ''}
          </div>
          ${zoneEtapeSuivante}
        </div>
        ${estAnnulee ? '<div class="ruban-annule">Commande annulée</div>' : ''}
        ${alerteImpayee}${alerteFactureManquante}${alerteDoublon}${alerteLienPaiementClique}
        <div class="ccm-meteo">${iconeMeteo}</div>
        <div class="ccm-haut">
          <span class="ccm-ref">${echapper(c.reference)}</span>
          <span class="ccm-date">${echapper(c.date)}</span>
        </div>
        <div class="ccm-nom">${echapper(c.nom)}</div>
        <div class="ccm-materiel">${materielResume}</div>
        ${c.devisDemande === 'Oui' ? '<div class="ccm-devis">Devis demandé</div>' : ''}
        ${!estAnnulee ? construireBarreProgressionCommande(c.statutCommande) : ''}
        ${pilulesBas}
        <div class="ccm-pied">
          <button type="button" class="ccm-details" data-ouvrir-details-commande="${c.ligne}">Détails</button>
        </div>
      </article>
    </div>`;
  }).join('');
  rendreApercuGeneral();
}

/** Construit le contenu de la modale Détails à la demande (jamais mis en cache : on relit
 *  toujours l'état courant de la commande, pour ne jamais montrer une info périmée). */
function construireDetailsCommande(ligne){
  const c = commandes.find(x => x.ligne === ligne);
  if(!c) return '';
  const structureCommande = structures.find(s => s.code === c.code);
  const estEsnCommande = !!(structureCommande && (structureCommande.esn || structureCommande.interne));
  const nbFichiers = parseInt(c.nombreFichiers, 10) || 0;
  const liensColissimoCommande = (c.colissimo || '').split('\n').map(s => s.trim()).filter(Boolean);

  $('details-commande-titre').textContent = `${c.reference} — ${c.nom}`;

  return `
      <div class="fiche-badges-statut" style="flex-direction:row;flex-wrap:wrap;margin-bottom:16px">
        ${badgeStatut(c.statutCommande)}
        ${estEsnCommande ? '' : badgeStatut(c.statutPaiement)}
        ${estEsnCommande ? '' : `<div class="rappel-montant-commande">${formaterMontant(c.montantFacture != null ? c.montantFacture : c.montantEstime)}</div>`}
      </div>

      <div class="fiche-materiel-structure" style="display:block">
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
        <div class="bloc-structure" style="margin-top:10px">
          <span class="coords-resume">
            <a href="mailto:${echapper(c.email)}">${echapper(c.email)}</a> · ${echapper(c.telephone)}
          </span>
        </div>
      </div>

      <div class="fiche-actions-rapides" style="margin-top:16px">
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

        ${c.bonLivraison
          ? `<a class="pilule-action pilule-remplie" href="${echapper(c.bonLivraison)}" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h6M9 16h6M9 8h2"/><path d="M6 3h9l3 3v15H6z"/></svg>
              <span>Bon de livraison</span>
            </a>`
          : `<button type="button" class="pilule-action pilule-bon-livraison" data-bon-livraison-ligne="${c.ligne}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h6M9 16h6M9 8h2"/><path d="M6 3h9l3 3v15H6z"/></svg>
              <span>Générer le bon de livraison</span>
            </button>`}
        ${c.personnes ? (c.dossier
          ? `<a class="pilule-action pilule-remplie" href="${echapper(c.dossier)}" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V7l8-4 8 4v14"/><path d="M9 21v-6h6v6"/></svg>
              <span>Bon d'orientation</span>
            </a>`
          : `<button type="button" class="pilule-action pilule-bon-orientation" data-bon-orientation-ligne="${c.ligne}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V7l8-4 8 4v14"/><path d="M9 21v-6h6v6"/></svg>
              <span>Générer le bon d'orientation</span>
            </button>`) : ''}
        ${c.personnes ? `<button type="button" class="pilule-action pilule-attestations" data-attestations-ligne="${c.ligne}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>
              <span>Générer les attestations</span>
            </button>` : ''}
      </div>
      <div id="resultat-attestations-${c.ligne}"></div>

      <div class="fiche-boutons-modales" style="margin-top:16px">
        <button type="button" class="btn-ouvrir-modale" data-ouvrir-date-souhaitee="${c.ligne}">
          Date de livraison souhaitée
          <span class="sous-statut">${c.dateLivraisonSouhaitee === 'ASAP' ? '⚡ Le plus rapidement possible' : (c.dateLivraisonSouhaitee ? echapper(c.dateLivraisonSouhaitee) : 'Non renseignée')}</span>
        </button>
        ${c.dateLivraison ? `<p class="sous-statut" style="margin:0 0 4px">Livrée le ${echapper(c.dateLivraison)}</p>` : ''}
        ${estEsnCommande ? '' : `<button type="button" class="btn-ouvrir-modale style-paiement" data-ouvrir-modale-paiement="${c.ligne}">
          Paiement &amp; facturation
          <span class="sous-statut">${echapper(c.statutPaiement)}${typeof c.montantFacture === 'number' ? ' · ' + formaterMontant(c.montantFacture) : ''}</span>
        </button>`}
      </div>

      <div class="fiche-pied" style="margin-top:16px">
        <div style="flex:1"></div>
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
      </div>`;
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-annuler-commande]');
  if(!b) return;
  demanderRaisonAnnulation(parseInt(b.dataset.annulerCommande, 10));
});

document.addEventListener('click', e => {
  const b = e.target.closest('[data-demander-validation]');
  if(!b) return;
  ouvrirModaleDateSouhaitee(parseInt(b.dataset.demanderValidation, 10), true);
});

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-renvoyer-validation]');
  if(!b) return;
  const ligne = parseInt(b.dataset.renvoyerValidation, 10);
  const c = commandes.find(x => x.ligne === ligne);
  if(!c) return;
  if(!confirm(`Renvoyer le mail de validation logistique pour la commande ${c.reference} ?`)) return;

  b.disabled = true;
  try{
    const r = await poster({ action:'demander-validation-logistique', ligne });
    if(r.ok){
      c.validationLogistiqueEnAttente = true;
      etat('Mail de validation envoyé', 'succes');
      rendre();
    }else{
      etat(r.erreur || 'Envoi impossible', 'erreur');
    }
  }catch(err){
    etat('Envoi impossible', 'erreur');
  }
  b.disabled = false;
});

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-etape-suivante]');
  if(!b) return;
  const ligne = parseInt(b.dataset.etapeSuivante, 10);
  const c = commandes.find(x => x.ligne === ligne);
  if(!c) return;

  // La date de livraison n'a pas de pilule dédiée sur la carte (contrairement au n° de série,
  // au bon de livraison ou au Colissimo) : on ouvre directement la modale plutôt que de
  // juste afficher un message d'erreur qui laisserait la personne chercher où la renseigner.
  if(c.statutCommande === 'En cours de livraison' && !c.dateLivraison){
    etat('Renseigne d\'abord la date de livraison', 'erreur');
    ouvrirModaleStatut(ligne);
    return;
  }

  const structureCommande = structures.find(s => s.code === c.code);
  const estInterne = !!(structureCommande && structureCommande.interne);
  const blocage = conditionBloquanteEtapeSuivante(c, estInterne);
  if(blocage){ etat(blocage, 'erreur'); return; }

  const indexActuel = ETAPES_TIMELINE_COMMANDE.indexOf(c.statutCommande);
  const suivant = ETAPES_TIMELINE_COMMANDE[indexActuel + 1];
  if(!suivant) return;
  if(!confirm(`Faire passer la commande ${c.reference} au statut « ${suivant} » ?`)) return;

  b.disabled = true;
  try{
    const r = await poster({ action:'update', ligne, champ:'statutCommande', valeur: suivant });
    if(r.ok){
      c.statutCommande = suivant;
      if(r.devis) etat(`Devis ${r.devis} généré — ${formaterMontant(r.montant)}`, 'succes');
      else etat('Étape suivante validée', 'succes');
      rendre();
    }else{
      etat(r.erreur || 'Impossible de passer à l\'étape suivante', 'erreur');
    }
  }catch(err){
    etat('Impossible de passer à l\'étape suivante', 'erreur');
  }
  b.disabled = false;
});

document.addEventListener('click', e => {
  const b = e.target.closest('[data-ouvrir-details-commande]');
  if(!b) return;
  const ligne = parseInt(b.dataset.ouvrirDetailsCommande, 10);
  $('details-commande-corps').innerHTML = construireDetailsCommande(ligne);
  $('modale-details-commande').hidden = false;
});
$('details-commande-fermer').addEventListener('click', () => $('modale-details-commande').hidden = true);

let annulationSelectCourant = null;

function demanderRaisonAnnulation(ligne){
  // Élément synthétique (jamais inséré dans le DOM) pour pouvoir réutiliser enregistrer(),
  // qui attend un contrôle avec .dataset.ligne/.champ/.value — plus de <select> lié depuis
  // que les statuts ne sont plus modifiables librement.
  const el = document.createElement('input');
  el.type = 'hidden';
  el.dataset.ligne = ligne;
  el.dataset.champ = 'statutCommande';
  el.value = 'Annulée';
  annulationSelectCourant = el;
  $('raison-annulation-texte').value = '';
  $('retour-raison-annulation').innerHTML = '';
  $('modale-raison-annulation').hidden = false;
}
$('raison-annulation-annuler').addEventListener('click', () => {
  $('modale-raison-annulation').hidden = true;
  annulationSelectCourant = null;
});
$('raison-annulation-confirmer').addEventListener('click', async () => {
  const raison = $('raison-annulation-texte').value.trim();
  if(!raison){
    $('retour-raison-annulation').innerHTML = '<div class="msg msg-erreur">Merci d\'indiquer une raison avant de confirmer.</div>';
    return;
  }
  const ligne = parseInt(annulationSelectCourant.dataset.ligne, 10);
  $('raison-annulation-confirmer').disabled = true;
  $('retour-raison-annulation').innerHTML = '';
  const c = commandes.find(x => x.ligne === ligne);
  const commentaireExistant = c ? String(c.commentaire || '') : '';
  const nouveauCommentaire = 'Raison de l\'annulation : ' + raison + (commentaireExistant ? ('\n\n' + commentaireExistant) : '');
  try{
    const rCommentaire = await poster({ action:'update', ligne, champ:'commentaire', valeur: nouveauCommentaire });
    if(!rCommentaire.ok){
      $('retour-raison-annulation').innerHTML = `<div class="msg msg-erreur">${echapper(rCommentaire.erreur)}</div>`;
      $('raison-annulation-confirmer').disabled = false;
      return;
    }
    if(c) c.commentaire = nouveauCommentaire;
    $('modale-raison-annulation').hidden = true;
    await enregistrer(annulationSelectCourant);
    annulationSelectCourant = null;
  }catch(e){
    $('retour-raison-annulation').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  $('raison-annulation-confirmer').disabled = false;
});

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

document.addEventListener('change', e => {
  const el = e.target;
  if(!el.matches('select[data-ligne], input[data-ligne]')) return;

  // Une annulation est irréversible sur le stock : on demande une raison avant d'appliquer
  if(el.dataset.champ === 'statutCommande' && el.value === 'Annulée'){
    demanderRaisonAnnulation(parseInt(el.dataset.ligne, 10));
    return;
  }
  enregistrer(el);
});

/* ══════════════ Modale Date de livraison ══════════════ */

let statutModaleLigneCourante = null;

function ouvrirModaleStatut(ligne){
  const c = commandes.find(x => x.ligne === ligne);
  if(!c) return;
  statutModaleLigneCourante = ligne;
  $('modale-statut-ref').textContent = c.reference + ' — ' + c.nom;

  $('modale-statut-date-livraison').value = dateLivraisonISO(c.dateLivraison);
  $('modale-statut-date-livraison').dataset.ligne = ligne;
  $('modale-statut-date-livraison').dataset.champ = 'dateLivraison';

  $('modale-statut').hidden = false;
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-ouvrir-modale-statut]');
  if(!b) return;
  ouvrirModaleStatut(parseInt(b.dataset.ouvrirModaleStatut, 10));
});

document.addEventListener('click', e => {
  const b = e.target.closest('[data-rejeter-alerte-doublon]');
  if(!b) return;
  rejeterAlerteDoublon(b.dataset.rejeterAlerteDoublon);
  b.closest('.ccm-alerte').remove();
});

document.addEventListener('click', e => {
  const b = e.target.closest('[data-rejeter-alerte-facture]');
  if(!b) return;
  rejeterAlerteFacture(b.dataset.rejeterAlerteFacture);
  b.closest('.alerte-facture-manquante').remove();
});

document.addEventListener('click', async e => {
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

document.addEventListener('click', e => {
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

document.addEventListener('click', e => {
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

let lienPaiementValeurPrecedente = '';

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
  const personnesListe = (c.personnes || '').split('\n').map(p => p.trim()).filter(Boolean);
  if(c.paiementSepare && personnesListe.length > 1){
    $('modale-paiement-lien-label').textContent = 'Liens de paiement (un par ligne, dans l\'ordre ci-dessous)';
    $('modale-paiement-lien-aide').textContent = 'Un lien par bénéficiaire, à distribuer par la structure : ' + personnesListe.join(' · ');
    $('modale-paiement-lien').rows = Math.max(2, personnesListe.length);
  }else{
    $('modale-paiement-lien-label').textContent = 'Lien de paiement';
    $('modale-paiement-lien-aide').textContent = '';
    $('modale-paiement-lien').rows = 2;
  }
  $('modale-paiement-lien').value = c.lienPaiement || '';
  $('modale-paiement-lien').disabled = !cb;
  $('modale-paiement-lien').dataset.ligne = ligne;
  $('modale-paiement-lien').dataset.champ = 'lienPaiement';
  lienPaiementValeurPrecedente = (c.lienPaiement || '').trim();

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

document.addEventListener('click', e => {
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
$('modale-paiement-lien').addEventListener('change', async e => {
  const nouvelleValeur = e.target.value.trim();
  const ligne = parseInt(e.target.dataset.ligne, 10);
  await enregistrer(e.target);

  // On ne propose l'envoi du mail que si un lien vient d'être ajouté ou changé (pas retiré,
  // pas juste rouvert sans y toucher) — comparé à la valeur qu'il avait à l'ouverture de la modale.
  if(nouvelleValeur && nouvelleValeur !== lienPaiementValeurPrecedente){
    const c = commandes.find(x => x.ligne === ligne);
    if(confirm(`Envoyer un mail à ${c ? c.nom : 'la structure'} pour l'informer que le paiement en ligne est disponible ?`)){
      try{
        const r = await poster({ action:'notifier-lien-paiement', ligne });
        etat(r.ok ? 'Mail envoyé à la structure' : (r.erreur || 'Envoi impossible'), r.ok ? 'succes' : 'erreur');
      }catch(err){
        etat('Envoi impossible', 'erreur');
      }
    }
  }
  lienPaiementValeurPrecedente = nouvelleValeur;
});

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
    bDevis.innerHTML = '<span class="spinner-etat-sombre"></span><span>Génération…</span>';
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

