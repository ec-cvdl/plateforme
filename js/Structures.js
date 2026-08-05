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

/* ── Flotte centralisée (structures Internes) — gérée directement depuis l'admin ── */
let flotteInterneCodeCourant = '';
const STATUTS_FLOTTE_INTERNE = ['En stock', 'Vendu', 'En SAV'];

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-structure-flotte]');
  if(!b) return;
  flotteInterneCodeCourant = b.dataset.structureFlotte;
  $('flotte-interne-nom-structure').textContent = b.dataset.structureFlotteNom;
  $('flotte-interne-contenu').innerHTML = '<p class="sous-question">Chargement…</p>';
  $('modale-flotte-interne').hidden = false;
  await chargerFlotteInterneAdmin();
});
$('flotte-interne-fermer').addEventListener('click', () => $('modale-flotte-interne').hidden = true);

async function chargerFlotteInterneAdmin(){
  try{
    const r = await jsonp({action:'flotte-lister-admin', password:motDePasse, code:flotteInterneCodeCourant});
    if(!r.ok){ $('flotte-interne-contenu').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`; return; }
    if(!r.appareils.length){
      $('flotte-interne-contenu').innerHTML = '<p class="sous-question">Aucun appareil pour le moment — ils apparaîtront automatiquement dès qu\'une commande de cette structure sera livrée.</p>';
      return;
    }
    $('flotte-interne-contenu').innerHTML = `
      <div class="scroll-tableau-flotte">
        <table class="tableau-appareils">
          <thead><tr><th>N° série</th><th>Marque</th><th>Modèle</th><th>Personne</th><th>Statut</th><th>Livré le</th><th>Date de vente</th><th>Payé</th></tr></thead>
          <tbody>${r.appareils.map(a => `
            <tr>
              <td class="mono">${echapper(a.numeroSerie)}</td>
              <td><input data-flotte-interne-ligne="${a.ligne}" data-flotte-interne-champ="marque" value="${echapper(a.marque)}" style="width:90px"></td>
              <td><input data-flotte-interne-ligne="${a.ligne}" data-flotte-interne-champ="modele" value="${echapper(a.modele)}" style="width:100px"></td>
              <td><input data-flotte-interne-ligne="${a.ligne}" data-flotte-interne-champ="personne" value="${echapper(a.personne)}" style="width:110px"></td>
              <td>
                <select data-flotte-interne-ligne="${a.ligne}" data-flotte-interne-champ="statut">
                  ${STATUTS_FLOTTE_INTERNE.map(s => `<option ${a.statut === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
              </td>
              <td>${echapper(a.dateLivraison)}</td>
              <td><input type="text" data-flotte-interne-ligne="${a.ligne}" data-flotte-interne-champ="dateVente" value="${echapper(a.dateVente)}" style="width:90px" placeholder="jj/mm/aaaa"></td>
              <td>
                <select data-flotte-interne-ligne="${a.ligne}" data-flotte-interne-champ="paye">
                  <option value="Non" ${a.paye !== 'Oui' ? 'selected' : ''}>Non</option>
                  <option value="Oui" ${a.paye === 'Oui' ? 'selected' : ''}>Oui</option>
                </select>
              </td>
            </tr>`).join('')}</tbody>
        </table>
      </div>`;
  }catch(e){
    $('flotte-interne-contenu').innerHTML = '<div class="msg msg-erreur">Chargement impossible.</div>';
  }
}

$('flotte-interne-contenu').addEventListener('change', async e => {
  const el = e.target.closest('[data-flotte-interne-ligne]');
  if(!el) return;
  el.disabled = true;
  try{
    const r = await poster({
      action:'flotte-modifier-admin', code:flotteInterneCodeCourant,
      ligne: parseInt(el.dataset.flotteInterneLigne, 10), champ: el.dataset.flotteInterneChamp, valeur: el.value,
    });
    etat(r.ok ? 'Enregistré' : (r.erreur || 'Enregistrement impossible'), r.ok ? 'succes' : 'erreur');
  }catch(err){ etat('Enregistrement impossible', 'erreur'); }
  el.disabled = false;
});

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

