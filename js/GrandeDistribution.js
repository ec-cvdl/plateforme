/* ═══ Grande distribution — prévisionnel de grosses opérations, en lots datés, jamais
   décompté du stock des Produits (contrairement aux commandes normales). ═══ */

let grandeDistributionChargeeUneFois = false;
let grandeDistributionListe = [];
let grandeDistributionLots = [];

async function chargerGrandeDistribution(){
  $('liste-grande-distribution').innerHTML = '<p class="sous-question">Chargement…</p>';
  try{
    const r = await jsonp({action:'grande-distribution-list', password:motDePasse});
    if(!r.ok){ $('liste-grande-distribution').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur||'Chargement impossible.')}</div>`; return; }
    grandeDistributionListe = r.distributions;
    grandeDistributionLots = r.lots;
    rendreGrandeDistribution();
  }catch(e){
    $('liste-grande-distribution').innerHTML = '<div class="msg msg-erreur">Chargement impossible — réessaie.</div>';
  }
}
$('btn-recharger-grande-distribution').addEventListener('click', chargerGrandeDistribution);

function rendreGrandeDistribution(){
  if(!grandeDistributionListe.length){
    $('liste-grande-distribution').innerHTML = `<div class="vide">
      <strong>Aucun projet de grande distribution</strong>
      Un don en nombre, un appel d'offres... — crée un projet, il n'affecte jamais le stock des Produits.
    </div>`;
    return;
  }

  $('liste-grande-distribution').innerHTML = grandeDistributionListe.map(d => {
    const lots = grandeDistributionLots.filter(l => l.referenceDistribution === d.reference)
      .sort((a, b) => (parserDateCalendrier(a.dateLivraison) || 0) - (parserDateCalendrier(b.dateLivraison) || 0));
    const quantiteLots = lots.reduce((s, l) => s + l.quantite, 0);

    return `
    <div class="carte-projet-distribution">
      <div class="entete-projet-distribution">
        <div>
          <div class="mono" style="font-size:11.5px;color:var(--steel)">${echapper(d.reference)}</div>
          <div style="font-weight:700;font-size:15px">${echapper(d.nom)}</div>
          <div class="sous-question" style="margin:2px 0 0">${echapper(d.produit || 'Produit non précisé')} · ${quantiteLots} / ${d.quantiteTotale} planifiés${d.commentaire ? ' · ' + echapper(d.commentaire) : ''}</div>
        </div>
        <button type="button" class="action claire" data-gd-ajouter-lot="${echapper(d.reference)}" data-gd-nom-projet="${echapper(d.nom)}">+ Ajouter un lot</button>
      </div>
      <div class="grille-lots-distribution">
        ${lots.length ? lots.map(l => `
          <div class="lot-distribution">
            <div class="mono" style="font-size:11px;color:var(--steel)">${echapper(l.referenceLot)}</div>
            <div style="font-weight:600">${echapper(l.dateLivraison)}</div>
            <div class="sous-question" style="margin:2px 0 8px">${l.quantite} appareil${l.quantite > 1 ? 's' : ''} · ${echapper(l.statut)}</div>
            ${l.numerosSerie ? `<div class="sous-question" style="color:var(--ok)">✓ Numéros associés (${l.numerosSerie.split('\\n').filter(Boolean).length})</div>` : ''}
            <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
              <button type="button" class="action claire" style="font-size:12px;padding:6px 10px" data-gd-associer-lot="${l.ligne}" data-gd-lot-quantite="${l.quantite}" data-gd-lot-ref="${echapper(l.referenceLot)}">🎲 Associer</button>
              <button type="button" class="action claire" style="font-size:12px;padding:6px 10px" data-gd-supprimer-lot="${l.ligne}">Supprimer</button>
            </div>
          </div>`).join('') : '<p class="sous-question">Aucun lot pour le moment.</p>'}
      </div>
    </div>`;
  }).join('');
}

/* ─── Nouveau projet ─── */
$('btn-nouveau-projet-distribution').addEventListener('click', () => {
  $('gd-nom').value = ''; $('gd-quantite-totale').value = ''; $('gd-commentaire').value = '';
  $('gd-lot1-date').value = ''; $('gd-lot1-quantite').value = '';
  $('gd-produit').innerHTML = '<option value="">—</option>' + produits.map(p => `<option value="${echapper(p.nom)}">${echapper(p.nom)}</option>`).join('');
  $('retour-nouveau-projet-distribution').innerHTML = '';
  $('modale-nouveau-projet-distribution').hidden = false;
});
$('gd-nouveau-projet-annuler').addEventListener('click', () => $('modale-nouveau-projet-distribution').hidden = true);

$('gd-nouveau-projet-confirmer').addEventListener('click', async () => {
  const nom = $('gd-nom').value.trim();
  if(!nom){ $('retour-nouveau-projet-distribution').innerHTML = '<div class="msg msg-erreur">Le nom du projet est obligatoire.</div>'; return; }

  $('gd-nouveau-projet-confirmer').disabled = true;
  $('retour-nouveau-projet-distribution').innerHTML = '';
  try{
    const r = await poster({
      action:'grande-distribution-create', nom, produit: $('gd-produit').value,
      quantiteTotale: $('gd-quantite-totale').value,
      commentaire: $('gd-commentaire').value.trim(),
      premierLotDate: $('gd-lot1-date').value ? $('gd-lot1-date').value.split('-').reverse().join('/') : '',
      premierLotQuantite: $('gd-lot1-quantite').value,
    });
    if(r.ok){
      $('modale-nouveau-projet-distribution').hidden = true;
      etat('Projet créé', 'succes');
      await chargerGrandeDistribution();
    }else{
      $('retour-nouveau-projet-distribution').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-nouveau-projet-distribution').innerHTML = '<div class="msg msg-erreur">Création impossible.</div>';
  }
  $('gd-nouveau-projet-confirmer').disabled = false;
});

/* ─── Ajouter un lot ─── */
let gdReferenceProjetCourant = '';
document.addEventListener('click', e => {
  const b = e.target.closest('[data-gd-ajouter-lot]');
  if(!b) return;
  gdReferenceProjetCourant = b.dataset.gdAjouterLot;
  $('gd-ajouter-lot-projet').textContent = b.dataset.gdNomProjet;
  $('gd-nouveau-lot-date').value = ''; $('gd-nouveau-lot-quantite').value = '';
  $('retour-ajouter-lot-distribution').innerHTML = '';
  $('modale-ajouter-lot-distribution').hidden = false;
});
$('gd-ajouter-lot-annuler').addEventListener('click', () => $('modale-ajouter-lot-distribution').hidden = true);

$('gd-ajouter-lot-confirmer').addEventListener('click', async () => {
  const date = $('gd-nouveau-lot-date').value;
  const quantite = $('gd-nouveau-lot-quantite').value;
  if(!date || !quantite){ $('retour-ajouter-lot-distribution').innerHTML = '<div class="msg msg-erreur">Date et quantité sont obligatoires.</div>'; return; }

  $('gd-ajouter-lot-confirmer').disabled = true;
  try{
    const r = await poster({
      action:'grande-distribution-lot-ajouter', referenceDistribution: gdReferenceProjetCourant,
      dateLivraison: date.split('-').reverse().join('/'), quantite,
    });
    if(r.ok){
      $('modale-ajouter-lot-distribution').hidden = true;
      etat('Lot ajouté', 'succes');
      await chargerGrandeDistribution();
    }else{
      $('retour-ajouter-lot-distribution').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-ajouter-lot-distribution').innerHTML = '<div class="msg msg-erreur">Ajout impossible.</div>';
  }
  $('gd-ajouter-lot-confirmer').disabled = false;
});

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-gd-supprimer-lot]');
  if(!b) return;
  if(!confirm('Supprimer ce lot ?')) return;
  try{
    const r = await poster({ action:'grande-distribution-lot-supprimer', ligne: parseInt(b.dataset.gdSupprimerLot, 10) });
    if(r.ok) await chargerGrandeDistribution();
    else etat(r.erreur || 'Suppression impossible', 'erreur');
  }catch(e){ etat('Suppression impossible', 'erreur'); }
});

/* ─── Association aléatoire personnes ↔ numéros de série (SheetJS, tout côté navigateur) ─── */
let gdLigneLotCourante = null;
let gdNomsImportes = [];
let gdResultatAssociation = null;

document.addEventListener('click', e => {
  const b = e.target.closest('[data-gd-associer-lot]');
  if(!b) return;
  gdLigneLotCourante = parseInt(b.dataset.gdAssocierLot, 10);
  gdNomsImportes = [];
  gdResultatAssociation = null;
  $('gd-associer-lot-titre').textContent = `Lot ${b.dataset.gdLotRef} — ${b.dataset.gdLotQuantite} appareil(s) attendus`;
  $('gd-fichier-noms').value = '';
  $('gd-apercu-noms').textContent = '';
  $('gd-numeros-serie').value = '';
  $('retour-associer-lot-distribution').innerHTML = '';
  $('gd-apercu-association').innerHTML = '';
  $('gd-associer-lot-telecharger').hidden = true;
  $('modale-associer-lot-distribution').hidden = false;
});
$('gd-associer-lot-fermer').addEventListener('click', () => $('modale-associer-lot-distribution').hidden = true);

$('gd-fichier-noms').addEventListener('change', async () => {
  const fichier = $('gd-fichier-noms').files[0];
  if(!fichier) return;
  try{
    const donnees = await fichier.arrayBuffer();
    const classeur = XLSX.read(donnees, { type:'array' });
    const premiereFeuille = classeur.Sheets[classeur.SheetNames[0]];
    const lignes = XLSX.utils.sheet_to_json(premiereFeuille, { header:1 });
    // Une colonne, un nom par ligne — en-tête ignoré s'il ne ressemble pas à un vrai nom
    // (pas d'espace ni de virgule, ex. "Nom", "Prénom Nom"...).
    gdNomsImportes = lignes.map(l => String(l[0] || '').trim()).filter(Boolean);
    if(gdNomsImportes.length && /^(nom|prénom|prenom|name)/i.test(gdNomsImportes[0]) && !gdNomsImportes[0].includes(' ')){
      gdNomsImportes.shift();
    }
    $('gd-apercu-noms').textContent = `${gdNomsImportes.length} nom${gdNomsImportes.length > 1 ? 's' : ''} détecté${gdNomsImportes.length > 1 ? 's' : ''}.`;
  }catch(e){
    $('gd-apercu-noms').textContent = '';
    $('retour-associer-lot-distribution').innerHTML = '<div class="msg msg-erreur">Fichier illisible — vérifie que c\'est bien un .xlsx ou .ods.</div>';
  }
});

$('gd-associer-lot-melanger').addEventListener('click', () => {
  const numeros = $('gd-numeros-serie').value.split('\n').map(s => s.trim()).filter(Boolean);
  if(!gdNomsImportes.length){ $('retour-associer-lot-distribution').innerHTML = '<div class="msg msg-erreur">Importe d\'abord une liste de personnes.</div>'; return; }
  if(!numeros.length){ $('retour-associer-lot-distribution').innerHTML = '<div class="msg msg-erreur">Renseigne les numéros de série.</div>'; return; }
  if(numeros.length !== gdNomsImportes.length){
    $('retour-associer-lot-distribution').innerHTML = `<div class="msg msg-erreur">${gdNomsImportes.length} personne(s) mais ${numeros.length} numéro(s) de série — les deux listes doivent avoir la même taille.</div>`;
    return;
  }

  const numerosMelanges = [...numeros];
  for(let i = numerosMelanges.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [numerosMelanges[i], numerosMelanges[j]] = [numerosMelanges[j], numerosMelanges[i]];
  }
  gdResultatAssociation = gdNomsImportes.map((nom, i) => ({ nom, numeroSerie: numerosMelanges[i] }));

  $('retour-associer-lot-distribution').innerHTML = '<div class="msg msg-succes">Association faite — vérifie l\'aperçu ci-dessous avant de télécharger.</div>';
  $('gd-apercu-association').innerHTML = `
    <div style="max-height:220px;overflow:auto;border:1px solid var(--line);border-radius:8px">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:var(--paper)"><th style="text-align:left;padding:6px 10px">Personne</th><th style="text-align:left;padding:6px 10px">Numéro de série</th></tr></thead>
        <tbody>${gdResultatAssociation.map(r => `<tr><td style="padding:5px 10px;border-top:1px solid var(--line)">${echapper(r.nom)}</td><td style="padding:5px 10px;border-top:1px solid var(--line)" class="mono">${echapper(r.numeroSerie)}</td></tr>`).join('')}</tbody>
      </table>
    </div>`;
  $('gd-associer-lot-telecharger').hidden = false;
});

$('gd-associer-lot-telecharger').addEventListener('click', async () => {
  if(!gdResultatAssociation) return;
  $('gd-associer-lot-telecharger').disabled = true;

  try{
    const rModele = await jsonp({action:'grande-distribution-modele', password:motDePasse});
    let classeur, nomFeuille;

    if(rModele.ok){
      // Modèle configuré : en-tête/mise en forme de la ligne 1 conservés, les données
      // remplissent à partir de la ligne 2 dans le premier onglet.
      const binaire = Uint8Array.from(atob(rModele.base64), c => c.charCodeAt(0));
      classeur = XLSX.read(binaire, { type:'array' });
      nomFeuille = classeur.SheetNames[0];
      const feuille = classeur.Sheets[nomFeuille];
      const plage = XLSX.utils.decode_range(feuille['!ref'] || 'A1:B1');
      gdResultatAssociation.forEach((r, i) => {
        XLSX.utils.sheet_add_aoa(feuille, [[r.nom, r.numeroSerie]], { origin: { r: 1 + i, c: 0 } });
      });
      const nouvelleFin = Math.max(plage.e.r, gdResultatAssociation.length);
      feuille['!ref'] = XLSX.utils.encode_range({ s: plage.s, e: { r: nouvelleFin, c: Math.max(plage.e.c, 1) } });
    }else{
      // Pas de modèle configuré (ou introuvable) : export simple par défaut.
      const feuille = XLSX.utils.json_to_sheet(gdResultatAssociation.map(r => ({ 'Nom': r.nom, 'Numéro de série': r.numeroSerie })));
      feuille['!cols'] = [{ wch: 28 }, { wch: 20 }];
      classeur = XLSX.utils.book_new();
      nomFeuille = 'Association';
      XLSX.utils.book_append_sheet(classeur, feuille, nomFeuille);
    }

    XLSX.writeFile(classeur, `association-${Date.now()}.xlsx`);
  }catch(e){
    etat('Modèle illisible — export par défaut utilisé à la place', 'erreur');
    const feuille = XLSX.utils.json_to_sheet(gdResultatAssociation.map(r => ({ 'Nom': r.nom, 'Numéro de série': r.numeroSerie })));
    const classeur = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(classeur, feuille, 'Association');
    XLSX.writeFile(classeur, `association-${Date.now()}.xlsx`);
  }
  $('gd-associer-lot-telecharger').disabled = false;

  // Sauvegarde côté serveur aussi, pour que le lot garde une trace de l'association faite.
  try{
    await poster({
      action:'grande-distribution-lot-modifier', ligne: gdLigneLotCourante, champ:'numerosSerie',
      valeur: gdResultatAssociation.map(r => r.numeroSerie).join('\n'),
    });
    await poster({
      action:'grande-distribution-lot-modifier', ligne: gdLigneLotCourante, champ:'nomsAssocies',
      valeur: gdResultatAssociation.map(r => r.nom).join('\n'),
    });
    await chargerGrandeDistribution();
  }catch(e){ /* le téléchargement a déjà eu lieu — pas bloquant si la sauvegarde échoue */ }
});
