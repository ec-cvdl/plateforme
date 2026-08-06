/* ══════════════ STRUCTURES ══════════════ */

async function chargerStructures(){
  try{
    const r = await jsonp({action:'structures', password:motDePasse});
    if(r.ok){
      structures = r.structures;
      rendreStructures();
      $('nc-structures-liste').innerHTML = structures.map(s =>
        `<option value="${echapper(s.code)}">${echapper(s.nom)}</option>`).join('');
    }
  }catch(e){ etat('Chargement des structures impossible', 'erreur'); }
}
$('btn-recharger-structures').addEventListener('click', () => {
  etat('Actualisation…', 'neutre');
  chargerStructures().then(() => etat('À jour', 'succes'));
});

function rendreStructures(){
  if(!structures.length){
    $('liste-structures').innerHTML = `<div class="vide">
      <strong>Aucune structure enregistrée</strong>
      Ajoutez la première avec le formulaire ci-dessus.
    </div>`;
    return;
  }

  $('liste-structures').innerHTML = structures.map(s => `
    <div class="structure">
      <input class="mono" value="${echapper(s.code)}"      data-ligne="${s.ligne}" data-champ="code">
      <input          value="${echapper(s.nom)}"       data-ligne="${s.ligne}" data-champ="nom">
      <input          value="${echapper(s.email)}"     data-ligne="${s.ligne}" data-champ="email">
      <input          value="${echapper(s.emailFacturation || '')}" data-ligne="${s.ligne}" data-champ="emailFacturation" placeholder="Si différent">
      <input          value="${echapper(s.telephone)}" data-ligne="${s.ligne}" data-champ="telephone">
      <textarea rows="2" data-ligne="${s.ligne}" data-champ="adresse" placeholder="Retour à la ligne possible (Entrée)">${echapper(s.adresse)}</textarea>
      <input type="checkbox" data-ligne="${s.ligne}" data-champ="rn" ${s.rn ? 'checked' : ''}>
      <input type="checkbox" data-ligne="${s.ligne}" data-champ="esn" ${s.esn ? 'checked' : ''} title="ESN : aucun prix affiché, aucune facturation générée pour cette structure">
      <input type="checkbox" data-ligne="${s.ligne}" data-champ="interne" ${s.interne ? 'checked' : ''} title="Interne : mêmes principes que ESN, destinés à des commandes pour les territoires (ex : le Loiret commande 10 PC pour une vente itinérante à venir)">
      <input type="checkbox" data-ligne="${s.ligne}" data-champ="autres" ${s.autres ? 'checked' : ''} title="BO : pas de demande de devis ni d'attestations à la commande, comme Interne. Dédiée aux structures qui doivent remplir un bon d'orientation uniquement">
      <div class="ligne-actions-icones">
        <button type="button" class="btn-icone-fiche" data-structure-modifier="${s.ligne}" title="Modifier (les champs sont éditables directement)" aria-label="Modifier">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l11-11-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>
        </button>
        <button type="button" class="btn-icone-fiche" data-structure-comptabilite="${echapper(s.nom)}" title="Voir la comptabilité de cette structure" aria-label="Comptabilité">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M8 15h4"/></svg>
        </button>
        ${s.interne ? `<button type="button" class="btn-icone-fiche" data-structure-flotte="${echapper(s.code)}" data-structure-flotte-nom="${echapper(s.nom)}" title="Gérer la flotte de cette structure Interne" aria-label="Flotte">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="7" height="7" rx="1.2"/><rect x="14" y="6" width="7" height="7" rx="1.2"/><rect x="3" y="17" width="7" height="4" rx="1"/><rect x="14" y="17" width="7" height="4" rx="1"/></svg>
        </button>
        <button type="button" class="btn-icone-fiche" data-structure-stats="${echapper(s.code)}" data-structure-stats-nom="${echapper(s.nom)}" title="Statistiques de cette structure Interne" aria-label="Statistiques">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M12 20V4M20 20v-7"/></svg>
        </button>` : ''}
        <button type="button" class="btn-icone-fiche danger" data-supprimer="${s.ligne}" data-nom="${echapper(s.nom)}" title="Supprimer la structure" aria-label="Supprimer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7m2 0v13a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 20V7h10z"/><path d="M10 11v6M14 11v6"/></svg>
        </button>
      </div>
    </div>`).join('');
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-structure-comptabilite]');
  if(!b) return;
  document.querySelector('[data-vue="comptabilite"]')?.click();
  setTimeout(() => {
    $('recherche-compta').value = b.dataset.structureComptabilite;
    $('recherche-compta').dispatchEvent(new Event('input'));
  }, 50);
});

/* ── Flotte centralisée (structures Internes) — gérée directement depuis l'admin ──
   Vue Saisie : ce qui se remplit au jour le jour (statut, stockage, vente, personne).
   Vue Comptabilité : ce qui sert au rapprochement bancaire. Matériel et prix viennent
   toujours de la commande d'origine — jamais modifiables ici. */
let flotteInterneCodeCourant = '';
let flotteInterneAppareilsCourants = [];
let flotteInterneFiltreRapprochement = 'tout';
let flotteInterneVue = 'saisie';
const STATUTS_FLOTTE_INTERNE = ['En stock', 'Remis', 'SAV', 'D3E'];
const STATUTS_RAPPROCHEMENT = ['À traiter', 'Rapproché', 'Clôturé'];
const GENRES_FLOTTE = ['', 'Homme', 'Femme'];
const TYPES_PAIEMENT_FLOTTE = ['', 'Chèque x1', 'Chèque x2', 'CB', 'Monétaire', 'Mixte'];
let listesPersoFlotte = { lieux: [], vendeurs: [] };

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-structure-flotte]');
  if(!b) return;
  flotteInterneCodeCourant = b.dataset.structureFlotte;
  $('flotte-interne-nom-structure').textContent = b.dataset.structureFlotteNom;
  $('flotte-interne-contenu').innerHTML = '<p class="sous-question">Chargement…</p>';
  $('modale-flotte-interne').hidden = false;
  const rListes = await jsonp({action:'flotte-listes-perso', password:motDePasse}).catch(() => null);
  if(rListes && rListes.ok) listesPersoFlotte = rListes;
  flotteInterneFiltreRapprochement = 'tout';
  flotteInterneVue = 'saisie';
  await chargerFlotteInterneAdmin();
});
$('flotte-interne-fermer').addEventListener('click', () => $('modale-flotte-interne').hidden = true);

async function chargerFlotteInterneAdmin(){
  try{
    const r = await jsonp({action:'flotte-lister-admin', password:motDePasse, code:flotteInterneCodeCourant});
    if(!r.ok){ $('flotte-interne-contenu').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`; return; }
    flotteInterneAppareilsCourants = r.appareils;
    rendreFlotteInterneAdmin();
  }catch(e){
    $('flotte-interne-contenu').innerHTML = '<div class="msg msg-erreur">Chargement impossible.</div>';
  }
}

function classeLigneFlotte(a){
  if(a.statut === 'D3E') return 'ligne-flotte-d3e';
  if(a.statut === 'Remis') return 'ligne-flotte-remis';
  if(a.statut === 'En stock' && a.alerte2Mois) return 'ligne-flotte-alerte';
  return '';
}

function classeLigneFlotteCompta(a){
  if(a.statutRapprochement === 'Clôturé') return 'ligne-flotte-cloture';
  if(a.statutRapprochement === 'Rapproché') return 'ligne-flotte-remis';
  return 'ligne-flotte-alerte'; // "À traiter"
}

function rendreFlotteInterneAdmin(){
  if(!flotteInterneAppareilsCourants.length){
    $('flotte-interne-contenu').innerHTML = '<p class="sous-question">Aucun appareil pour le moment — ils apparaîtront automatiquement dès qu\'une commande de cette structure sera livrée.</p>';
    return;
  }

  const vendus = flotteInterneAppareilsCourants.filter(a => a.statut === 'Remis' || a.dateVente);
  const montantNonEncaisse = vendus.filter(a => a.statutRapprochement === 'À traiter').reduce((s, a) => s + (parseFloat(a.prix) || 0), 0);

  const appareilsAffiches = flotteInterneAppareilsCourants.filter(a => {
    if(flotteInterneFiltreRapprochement === 'tout') return true;
    return a.statutRapprochement === flotteInterneFiltreRapprochement;
  });

  $('flotte-interne-contenu').innerHTML = `
    <div class="bandeau-flotte-interne" style="grid-template-columns:repeat(2,1fr)">
      <div class="stat-flotte"><div class="n">${vendus.length}</div><div class="l">Appareils remis</div></div>
      <div class="stat-flotte"><div class="n" style="color:var(--t-rouge-t,#c0364a)">${formaterMontant(montantNonEncaisse)}</div><div class="l">Non encaissé</div></div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px">
      <div class="filtres" id="flotte-interne-vue-toggle">
        <button data-flotte-vue="saisie" class="${flotteInterneVue === 'saisie' ? 'actif' : ''}">📝 Saisie</button>
        <button data-flotte-vue="compta" class="${flotteInterneVue === 'compta' ? 'actif' : ''}">💶 Comptabilité</button>
      </div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        ${flotteInterneVue === 'saisie' ? `<button type="button" class="action claire" id="btn-nouveau-lieu-stockage" style="font-size:12px;padding:6px 12px">📍 Nouveau lieu de stockage</button>` : ''}
        <button type="button" class="action claire" id="btn-export-csv-salesforce" style="font-size:12px;padding:6px 12px">⬇️ Export CSV Salesforce</button>
        ${flotteInterneVue === 'compta' ? `
        <div class="filtres">
          <button data-flotte-filtre-rapprochement="tout" class="${flotteInterneFiltreRapprochement === 'tout' ? 'actif' : ''}">Tout</button>
          ${STATUTS_RAPPROCHEMENT.map(s => `<button data-flotte-filtre-rapprochement="${s}" class="${flotteInterneFiltreRapprochement === s ? 'actif' : ''}">${s}</button>`).join('')}
        </div>` : ''}
      </div>
    </div>
    <div class="scroll-tableau-flotte">
      <table class="tableau-appareils tableau-pleine-largeur">
        <thead><tr>${flotteInterneVue === 'compta'
          ? '<th>N° série</th><th>Personne</th><th>Prix</th><th>Paiement</th><th>Vendeur</th><th>Attestation</th><th>Commentaire</th><th>Rapprochement</th><th>Statut rapprochement</th>'
          : '<th>N° série</th><th></th><th>Matériel</th><th>Prix</th><th>Statut</th><th>Stockage</th><th>Vente</th><th>Personne</th><th>SF</th>'}</tr></thead>
        <tbody>${appareilsAffiches.map(a => flotteInterneVue === 'compta' ? ligneFlotteInterneComptaHtml(a) : ligneFlotteInterneHtml(a)).join('')}</tbody>
      </table>
    </div>`;
}

function ligneFlotteInterneHtml(a){
  const optionsLieu = ['', ...listesPersoFlotte.lieux].map(v => `<option value="${echapper(v)}" ${a.lieuStockage === v ? 'selected' : ''}>${v || '—'}</option>`).join('') + '<option value="__nouveau__">+ Nouveau lieu…</option>';
  return `
    <tr class="${classeLigneFlotte(a)}" data-ligne-flotte="${a.ligne}">
      <td class="mono">${echapper(a.numeroSerie)}</td>
      <td><a href="passeport.html?sn=${encodeURIComponent(a.numeroSerie)}" target="_blank" rel="noopener" class="btn-icone-mini-tableau" title="Ouvrir le passeport de cet appareil">🛂</a></td>
      <td style="font-weight:700;font-size:13.5px">${echapper(a.produit || '—')}</td>
      <td class="mono">${a.prix !== '' && a.prix != null ? formaterMontant(a.prix) : '—'}</td>
      <td>
        <select data-flotte-interne-ligne="${a.ligne}" data-flotte-interne-champ="statut" class="${a.statut === 'D3E' ? 'select-d3e' : ''}">
          ${STATUTS_FLOTTE_INTERNE.map(s => `<option ${a.statut === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
      <td><select data-flotte-interne-ligne="${a.ligne}" data-flotte-interne-champ="lieuStockage">${optionsLieu}</select></td>
      <td><input type="text" data-flotte-interne-ligne="${a.ligne}" data-flotte-interne-champ="dateVente" value="${echapper(a.dateVente)}" style="width:90px" placeholder="jj/mm/aaaa"></td>
      <td><button type="button" class="btn-icone-mini-tableau${a.personne ? ' rempli' : ''}" data-flotte-personne-ligne="${a.ligne}" title="Voir/modifier les infos de la personne">👤 ${a.personne ? echapper(a.personne) : '+'}</button></td>
      <td style="text-align:center"><input type="checkbox" data-flotte-interne-ligne="${a.ligne}" data-flotte-interne-champ="saisieSalesforce" data-flotte-interne-checkbox="1" ${a.saisieSalesforce === 'Oui' ? 'checked' : ''} title="Saisie Salesforce faite"></td>
    </tr>`;
}

function ligneFlotteInterneComptaHtml(a){
  const optionsVendeur = ['', ...listesPersoFlotte.vendeurs].map(v => `<option value="${echapper(v)}" ${a.vendeur === v ? 'selected' : ''}>${v || '—'}</option>`).join('') + '<option value="__nouveau__">+ Nouveau vendeur…</option>';
  return `
    <tr class="${classeLigneFlotteCompta(a)}" data-ligne-flotte="${a.ligne}">
      <td class="mono">${echapper(a.numeroSerie)}</td>
      <td>${echapper(a.personne || '—')}</td>
      <td class="mono">${a.prix !== '' && a.prix != null ? formaterMontant(a.prix) : '—'}</td>
      <td>
        <select data-flotte-interne-ligne="${a.ligne}" data-flotte-interne-champ="typePaiement">
          ${TYPES_PAIEMENT_FLOTTE.map(t => `<option value="${t}" ${a.typePaiement === t ? 'selected' : ''}>${t || '—'}</option>`).join('')}
        </select>
      </td>
      <td><select data-flotte-interne-ligne="${a.ligne}" data-flotte-interne-champ="vendeur">${optionsVendeur}</select></td>
      <td><input data-flotte-interne-ligne="${a.ligne}" data-flotte-interne-champ="numeroAttestation" value="${echapper(a.numeroAttestation)}" style="width:90px"></td>
      <td><input data-flotte-interne-ligne="${a.ligne}" data-flotte-interne-champ="commentaire" value="${echapper(a.commentaire)}" style="width:130px"></td>
      <td><input data-flotte-interne-ligne="${a.ligne}" data-flotte-interne-champ="numeroRapprochement" value="${echapper(a.numeroRapprochement)}" style="width:110px" placeholder="Zettle / dépôt"></td>
      <td>
        <select data-flotte-interne-ligne="${a.ligne}" data-flotte-interne-champ="statutRapprochement">
          ${STATUTS_RAPPROCHEMENT.map(s => `<option ${a.statutRapprochement === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
    </tr>`;
}

$('flotte-interne-contenu').addEventListener('click', e => {
  const bVue = e.target.closest('[data-flotte-vue]');
  if(bVue){ flotteInterneVue = bVue.dataset.flotteVue; rendreFlotteInterneAdmin(); return; }
  if(e.target.closest('#btn-export-csv-salesforce')){ exporterCsvSalesforce(); return; }
  if(e.target.closest('#btn-nouveau-lieu-stockage')){
    const nouvelle = prompt('Nom du nouveau lieu de stockage :');
    if(!nouvelle || !nouvelle.trim()) return;
    poster({ action:'flotte-liste-perso-ajouter', liste:'lieu', valeur: nouvelle.trim() }).then(r => {
      if(r.ok){ listesPersoFlotte.lieux = r.liste; etat('Lieu ajouté', 'succes'); rendreFlotteInterneAdmin(); }
      else etat(r.erreur || 'Ajout impossible', 'erreur');
    }).catch(() => etat('Ajout impossible', 'erreur'));
    return;
  }
  const bPersonne = e.target.closest('[data-flotte-personne-ligne]');
  if(bPersonne){ ouvrirModalePersonneFlotte(parseInt(bPersonne.dataset.flottePersonneLigne, 10)); return; }
  const b = e.target.closest('[data-flotte-filtre-rapprochement]');
  if(!b) return;
  flotteInterneFiltreRapprochement = b.dataset.flotteFiltreRapprochement;
  rendreFlotteInterneAdmin();
});

function exporterCsvSalesforce(){
  const entetes = ['Numero_Serie__c','Materiel__c','Prenom_Nom__c','Genre__c','Date_Naissance__c','Type_Paiement__c','Prix__c','Date_Vente__c','Vendeur__c','Numero_Attestation__c'];
  const lignesCsv = flotteInterneAppareilsCourants
    .filter(a => a.personne)
    .map(a => [a.numeroSerie, a.produit, a.personne, a.genre, a.dateNaissance, a.typePaiement, a.prix, a.dateVente, a.vendeur, a.numeroAttestation]
      .map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));
  const csv = [entetes.join(','), ...lignesCsv].join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url; lien.download = `export-salesforce-${flotteInterneCodeCourant}-${Date.now()}.csv`;
  document.body.appendChild(lien); lien.click(); lien.remove();
  URL.revokeObjectURL(url);
}

$('flotte-interne-contenu').addEventListener('change', async e => {
  const el = e.target.closest('[data-flotte-interne-ligne]');
  if(!el) return;
  const ligne = parseInt(el.dataset.flotteInterneLigne, 10);
  const champ = el.dataset.flotteInterneChamp;
  let valeur = el.dataset.flotteInterneCheckbox ? (el.checked ? 'Oui' : 'Non') : el.value;

  if(valeur === '__nouveau__' && (champ === 'lieuStockage' || champ === 'vendeur')){
    const label = champ === 'lieuStockage' ? 'lieu de stockage' : 'vendeur';
    const nouvelle = prompt(`Nom du nouveau ${label} :`);
    if(!nouvelle || !nouvelle.trim()){ rendreFlotteInterneAdmin(); return; }
    const r = await poster({ action:'flotte-liste-perso-ajouter', liste: champ === 'lieuStockage' ? 'lieu' : 'vendeur', valeur: nouvelle.trim() });
    if(r.ok){
      if(champ === 'lieuStockage') listesPersoFlotte.lieux = r.liste; else listesPersoFlotte.vendeurs = r.liste;
      valeur = nouvelle.trim();
    }else{
      etat(r.erreur || 'Ajout impossible', 'erreur');
      rendreFlotteInterneAdmin();
      return;
    }
  }

  if(champ === 'statut' && valeur === 'D3E'){
    if(!confirm('Confirmer le passage de cet appareil en D3E (déchet électronique) ? Cette action est à valider consciemment.')){
      rendreFlotteInterneAdmin();
      return;
    }
  }

  el.disabled = true;
  try{
    const r = await poster({ action:'flotte-modifier-admin', code:flotteInterneCodeCourant, ligne, champ, valeur });
    if(r.ok){
      const a = flotteInterneAppareilsCourants.find(x => x.ligne === ligne);
      if(a) a[champ] = valeur;
      etat('Enregistré', 'succes');
      if(['statut','lieuStockage','vendeur','statutRapprochement'].includes(champ)) rendreFlotteInterneAdmin();
    }else{
      etat(r.erreur || 'Enregistrement impossible', 'erreur');
    }
  }catch(err){ etat('Enregistrement impossible', 'erreur'); }
  el.disabled = false;
});

/* ── Modale "Personne" — tout ce qui concerne le bénéficiaire d'un appareil, à part pour
   ne pas surcharger le tableau. Génération d'attestation directement depuis ici. ── */
let flottePersonneLigneCourante = null;

function ouvrirModalePersonneFlotte(ligne){
  const a = flotteInterneAppareilsCourants.find(x => x.ligne === ligne);
  if(!a) return;
  flottePersonneLigneCourante = ligne;

  $('flotte-personne-titre').textContent = `${a.numeroSerie} — ${a.produit || ''}`.trim();
  $('flotte-personne-contenu').innerHTML = `
    <div class="grille-cases-structure" style="grid-template-columns:1fr 1fr;gap:10px">
      <label>Nom<input data-fp-champ="personne" value="${echapper(a.personne)}"></label>
      <label>Genre
        <select data-fp-champ="genre">
          ${GENRES_FLOTTE.map(g => `<option value="${g}" ${a.genre === g ? 'selected' : ''}>${g || '—'}</option>`).join('')}
        </select>
      </label>
      <label>Date de naissance<input data-fp-champ="dateNaissance" value="${echapper(a.dateNaissance)}" placeholder="jj/mm/aaaa"></label>
      <label>Type de paiement
        <select data-fp-champ="typePaiement">
          ${TYPES_PAIEMENT_FLOTTE.map(t => `<option value="${t}" ${a.typePaiement === t ? 'selected' : ''}>${t || '—'}</option>`).join('')}
        </select>
      </label>
      <label>Vendeur
        <select data-fp-champ="vendeur">${['', ...listesPersoFlotte.vendeurs].map(v => `<option value="${echapper(v)}" ${a.vendeur === v ? 'selected' : ''}>${v || '—'}</option>`).join('')}<option value="__nouveau__">+ Nouveau…</option></select>
      </label>
      <label>N° attestation<input data-fp-champ="numeroAttestation" value="${echapper(a.numeroAttestation)}"></label>
      <label>N° rapprochement<input data-fp-champ="numeroRapprochement" value="${echapper(a.numeroRapprochement)}" placeholder="Zettle / dépôt"></label>
      <label style="grid-column:1/-1">Commentaire<textarea data-fp-champ="commentaire" rows="2">${echapper(a.commentaire)}</textarea></label>
    </div>
    <div id="retour-generer-attestation-flotte" style="margin-top:10px"></div>
    <button type="button" class="action" id="btn-generer-attestation-flotte-interne" style="width:100%;margin-top:8px">🧾 Générer l'attestation de paiement</button>`;
  $('modale-flotte-personne').hidden = false;
}
$('flotte-personne-fermer')?.addEventListener('click', () => $('modale-flotte-personne').hidden = true);

$('flotte-personne-contenu')?.addEventListener('click', async e => {
  if(!e.target.closest('#btn-generer-attestation-flotte-interne')) return;
  const a = flotteInterneAppareilsCourants.find(x => x.ligne === flottePersonneLigneCourante);
  if(!a || !a.personne){ $('retour-generer-attestation-flotte').innerHTML = '<div class="msg msg-erreur">Le nom de la personne est obligatoire avant de générer.</div>'; return; }

  const bouton = $('btn-generer-attestation-flotte-interne');
  bouton.disabled = true;
  $('retour-generer-attestation-flotte').innerHTML = '<div class="msg msg-info">Génération en cours…</div>';
  try{
    const r = await poster({
      action:'flotte-generer-attestation', code: flotteInterneCodeCourant,
      numeroSerie: a.numeroSerie, nomComplet: a.personne, dateNaissance: a.dateNaissance,
    });
    $('retour-generer-attestation-flotte').innerHTML = r.ok
      ? `<div class="msg msg-succes">Prête — <a href="${echapper(r.url)}" target="_blank" rel="noopener">l'ouvrir ↗</a></div>`
      : `<div class="msg msg-erreur">${echapper(r.erreur || 'Génération impossible.')}</div>`;
  }catch(err){
    $('retour-generer-attestation-flotte').innerHTML = '<div class="msg msg-erreur">Génération impossible — réessaie.</div>';
  }
  bouton.disabled = false;
});

$('flotte-personne-contenu')?.addEventListener('change', async e => {
  const el = e.target.closest('[data-fp-champ]');
  if(!el) return;
  const champ = el.dataset.fpChamp;
  let valeur = el.value;

  if(valeur === '__nouveau__'){
    const nouvelle = prompt('Nom du nouveau vendeur :');
    if(!nouvelle || !nouvelle.trim()){ ouvrirModalePersonneFlotte(flottePersonneLigneCourante); return; }
    const r = await poster({ action:'flotte-liste-perso-ajouter', liste:'vendeur', valeur: nouvelle.trim() });
    if(r.ok){ listesPersoFlotte.vendeurs = r.liste; valeur = nouvelle.trim(); }
    else{ etat(r.erreur || 'Ajout impossible', 'erreur'); ouvrirModalePersonneFlotte(flottePersonneLigneCourante); return; }
  }

  el.disabled = true;
  try{
    const r = await poster({ action:'flotte-modifier-admin', code:flotteInterneCodeCourant, ligne: flottePersonneLigneCourante, champ, valeur });
    if(r.ok){
      const a = flotteInterneAppareilsCourants.find(x => x.ligne === flottePersonneLigneCourante);
      if(a) a[champ] = valeur;
      etat('Enregistré', 'succes');
    }else{
      etat(r.erreur || 'Enregistrement impossible', 'erreur');
    }
  }catch(err){ etat('Enregistrement impossible', 'erreur'); }
  el.disabled = false;
});

document.addEventListener('click', async e => {
  const bStats = e.target.closest('[data-structure-stats]');
  if(!bStats) return;
  $('modale-stats-structure-interne').hidden = false;
  $('stats-structure-interne-nom').textContent = bStats.dataset.structureStatsNom;
  $('stats-structure-interne-contenu').innerHTML = '<p class="sous-question">Chargement…</p>';
  try{
    const r = await jsonp({action:'flotte-statistiques-admin', password:motDePasse, code:bStats.dataset.structureStats});
    if(!r.ok){ $('stats-structure-interne-contenu').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`; return; }
    $('stats-structure-interne-contenu').innerHTML = `
      <div class="bandeau-flotte-interne" style="grid-template-columns:repeat(3,1fr)">
        <div class="stat-flotte"><div class="n">${r.totalAppareils}</div><div class="l">Appareils au total</div></div>
        <div class="stat-flotte"><div class="n">${r.totalRemis}</div><div class="l">Distribués (Remis)</div></div>
        <div class="stat-flotte"><div class="n">${formaterMontant(r.montantTotal)}</div><div class="l">Montant facturé (distribués)</div></div>
      </div>
      <table class="tableau-appareils" style="margin-top:14px">
        <thead><tr><th>Produit</th><th>Total</th><th>Distribués</th><th>Montant</th></tr></thead>
        <tbody>${r.parProduit.map(p => `
          <tr><td style="font-weight:600">${echapper(p.produit)}</td><td class="mono">${p.quantite}</td><td class="mono">${p.remis}</td><td class="mono">${formaterMontant(p.montant)}</td></tr>
        `).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--steel)">Aucun appareil pour le moment</td></tr>'}</tbody>
      </table>`;
  }catch(err){
    $('stats-structure-interne-contenu').innerHTML = '<div class="msg msg-erreur">Chargement impossible.</div>';
  }
});
$('stats-structure-interne-fermer')?.addEventListener('click', () => $('modale-stats-structure-interne').hidden = true);

$('btn-nouvelle-structure').addEventListener('click', () => {
  ['s-code','s-nom','s-email','s-email-facturation','s-tel','s-adresse'].forEach(i => $(i).value = '');
  $('s-rn').checked = false;
  $('s-esn').checked = false;
  $('s-interne').checked = false;
  $('s-autres').checked = false;
  $('retour-ajout').innerHTML = '';
  $('modale-nouvelle-structure').hidden = false;
  setTimeout(() => $('s-nom').focus(), 50);
});

// RN/ESN/Interne/BO sont mutuellement exclusifs — une structure ne peut être que d'un seul
// type à la fois, cocher l'un décoche automatiquement les autres.
['s-rn','s-esn','s-interne','s-autres'].forEach(id => {
  $(id).addEventListener('change', () => {
    if($(id).checked){
      ['s-rn','s-esn','s-interne','s-autres'].filter(autre => autre !== id).forEach(autre => { $(autre).checked = false; });
    }
  });
});
$('s-annuler').addEventListener('click', () => $('modale-nouvelle-structure').hidden = true);

/* Génération d'un code lisible mais non devinable — 4 groupes de 4 caractères */
$('btn-generer').addEventListener('click', () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans I, O, 0, 1
  const tirage = n => Array.from(crypto.getRandomValues(new Uint8Array(n)))
    .map(o => alphabet[o % alphabet.length]).join('');
  $('s-code').value = tirage(4) + '-' + tirage(4) + '-' + tirage(4) + '-' + tirage(4);
});

$('btn-ajouter').addEventListener('click', async () => {
  const donnees = {
    action:'structure-create',
    code:      $('s-code').value.trim(),
    nom:       $('s-nom').value.trim(),
    email:     $('s-email').value.trim(),
    emailFacturation: $('s-email-facturation').value.trim(),
    telephone: $('s-tel').value.trim(),
    adresse:   $('s-adresse').value.trim(),
    rn:        $('s-rn').checked,
    esn:       $('s-esn').checked,
    interne:   $('s-interne').checked,
    autres:    $('s-autres').checked
  };

  if(!donnees.code || !donnees.nom){
    $('retour-ajout').innerHTML = '<div class="msg msg-erreur">Le code et le nom sont obligatoires.</div>';
    return;
  }

  $('btn-ajouter').disabled = true;
  $('btn-ajouter').textContent = 'Ajout…';
  $('retour-ajout').innerHTML = '';

  try{
    const r = await poster(donnees);
    if(r.ok){
      $('modale-nouvelle-structure').hidden = true;
      await chargerStructures();
      etat('Structure ajoutée', 'succes');
    }else{
      $('retour-ajout').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-ajout').innerHTML = '<div class="msg msg-erreur">Ajout impossible.</div>';
  }

  $('btn-ajouter').disabled = false;
  $('btn-ajouter').textContent = 'Ajouter la structure';
});

$('liste-structures').addEventListener('change', async e => {
  const el = e.target;
  if(!el.matches('input[data-ligne], textarea[data-ligne]')) return;

  const champsExclusifs = ['rn','esn','interne','autres'];
  // RN/ESN/Interne/BO sont mutuellement exclusifs — cocher l'un décoche (et sauvegarde) les
  // autres pour cette même structure, pour ne jamais se retrouver avec deux statuts à la fois.
  if(el.type === 'checkbox' && el.checked && champsExclusifs.includes(el.dataset.champ)){
    const ligne = el.dataset.ligne;
    const autresChamps = champsExclusifs.filter(c => c !== el.dataset.champ);
    for(const champ of autresChamps){
      const autreInput = document.querySelector(`#liste-structures input[data-ligne="${ligne}"][data-champ="${champ}"]`);
      if(autreInput && autreInput.checked){
        autreInput.checked = false;
        try{ await poster({ action:'structure-update', ligne: parseInt(ligne, 10), champ, valeur: false }); }catch(err){ /* pas bloquant */ }
      }
    }
  }

  const valeur = el.type === 'checkbox' ? el.checked : el.value;
  el.disabled = true;
  try{
    const r = await poster({
      action:'structure-update',
      ligne: parseInt(el.dataset.ligne, 10),
      champ: el.dataset.champ,
      valeur: valeur
    });
    etat(r.ok ? 'Enregistré' : (r.erreur || 'Enregistrement impossible'), r.ok ? 'succes' : 'erreur');
    if(!r.ok) chargerStructures();
  }catch(err){ etat('Enregistrement impossible', 'erreur'); }
  el.disabled = false;
});

$('liste-structures').addEventListener('click', async e => {
  const b = e.target.closest('[data-supprimer]');
  if(!b) return;
  demanderSuppression(`la structure « ${b.dataset.nom} » (son code cessera de fonctionner, les commandes déjà passées sont conservées)`, 'structure-delete', parseInt(b.dataset.supprimer, 10), chargerStructures);
});

$('liste-structures').addEventListener('click', e => {
  const b = e.target.closest('[data-structure-modifier]');
  if(!b) return;
  const champ = b.closest('.structure').querySelector('input[data-champ="nom"]');
  if(champ){ champ.focus(); champ.select(); }
});

/* ═══ Carte de répartition géographique ═══ */
let carteLeaflet = null;
let carteChargeeUneFois = false;

async function chargerCarteStructures(){
  $('carte-info').textContent = 'Chargement…';
  try{
    const r = await jsonp({action:'structures-coordonnees', password:motDePasse});
    if(!r.ok){ $('carte-info').textContent = r.erreur || 'Chargement impossible.'; return; }

    if(!carteLeaflet){
      carteLeaflet = L.map('carte-structures').setView([46.6, 2.4], 6); // France, vue par défaut
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 18
      }).addTo(carteLeaflet);
    }
    // On repart d'une carte vierge à chaque actualisation, plutôt que d'empiler les marqueurs
    carteLeaflet.eachLayer(function(couche){
      if(couche instanceof L.Marker) carteLeaflet.removeLayer(couche);
    });

    if(!r.structures.length){
      $('carte-info').textContent = 'Aucune structure géolocalisable pour le moment (adresse manquante ou introuvable).';
      return;
    }

    const points = [];
    r.structures.forEach(s => {
      const marqueur = L.marker([s.lat, s.lng]).addTo(carteLeaflet);
      marqueur.bindPopup(`<strong>${echapper(s.nom)}</strong><br>${echapper(s.code)}<br><span style="color:#5C6D7C">${echapper(s.adresse)}</span>`);
      points.push([s.lat, s.lng]);
    });
    if(points.length > 1) carteLeaflet.fitBounds(points, {padding:[30,30]});
    else if(points.length === 1) carteLeaflet.setView(points[0], 13);

    setTimeout(() => carteLeaflet.invalidateSize(), 100); // le conteneur était caché (display:none) au moment de l'init

    $('carte-info').textContent = `${r.structures.length} structure${r.structures.length > 1 ? 's' : ''} géolocalisée${r.structures.length > 1 ? 's' : ''}`
      + (r.nouvellesGeocodees ? ` (dont ${r.nouvellesGeocodees} nouvelle${r.nouvellesGeocodees > 1 ? 's' : ''} géocodée${r.nouvellesGeocodees > 1 ? 's' : ''} à l'instant)` : '');
  }catch(e){
    $('carte-info').textContent = 'Chargement impossible — réessaie.';
  }
}

$('btn-actualiser-carte').addEventListener('click', chargerCarteStructures);

