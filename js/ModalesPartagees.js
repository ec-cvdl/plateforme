/* ══════════════ MODALE : NUMÉROS DE SÉRIE ══════════════ */

let serieLigneCourante = null;

$('liste').addEventListener('click', e => {
  const b = e.target.closest('[data-serie-ligne]');
  if(!b) return;
  serieLigneCourante = parseInt(b.dataset.serieLigne, 10);
  const valeur = b.dataset.serieValeur || '';
  $('serie-texte').value = valeur;
  majCompteurSerie();
  $('serie-fichier-csv').value = '';
  $('btn-serie-importer-csv').disabled = true;
  $('retour-import-csv').innerHTML = '';
  const c = commandes.find(x => x.ligne === serieLigneCourante);
  $('serie-lien-csv-existant').innerHTML = (c && c.csvTectech)
    ? `<a href="${echapper(c.csvTectech)}" target="_blank" rel="noopener">📄 Ouvrir le fichier CSV déjà importé</a>` : '';
  $('modale-serie').hidden = false;
  setTimeout(() => $('serie-texte').focus(), 50);
});

function listeSerieNettoyee(){
  return $('serie-texte').value.split('\n').map(s => s.trim()).filter(Boolean);
}
function majCompteurSerie(){
  const n = listeSerieNettoyee().length;
  $('serie-compte').textContent = n + (n > 1 ? ' numéros' : ' numéro');
}
$('serie-texte').addEventListener('input', majCompteurSerie);
$('serie-annuler').addEventListener('click', () => $('modale-serie').hidden = true);

/* Import CSV tec.tech : extraction locale de la colonne G + upload vers le dossier Drive dédié */
function lireFichierTexte(fichier){
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onload = () => resolve(String(lecteur.result || ''));
    lecteur.onerror = () => reject(lecteur.error);
    lecteur.readAsText(fichier, 'utf-8');
  });
}
function lireFichierBase64(fichier){
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onload = () => resolve(String(lecteur.result || '').split(',')[1] || '');
    lecteur.onerror = () => reject(lecteur.error);
    lecteur.readAsDataURL(fichier);
  });
}
/** Extrait la colonne G (7e colonne) d'un CSV tec.tech — délimiteur , ou ; détecté au vol. */
function extraireColonneGCsv(texteCsv){
  const lignes = texteCsv.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if(!lignes.length) return [];
  const delimiteur = (lignes[0].split(';').length > lignes[0].split(',').length) ? ';' : ',';
  return lignes
    .map(l => (l.split(delimiteur)[6] || '').trim().replace(/^"|"$/g, ''))
    .filter(Boolean)
    .filter(v => v.toLowerCase() !== 'numéro de série' && v.toLowerCase() !== 'numero de serie'); // écarte un éventuel en-tête
}

$('serie-fichier-csv').addEventListener('change', () => {
  $('btn-serie-importer-csv').disabled = !$('serie-fichier-csv').files.length;
  $('retour-import-csv').innerHTML = '';
});

$('btn-serie-importer-csv').addEventListener('click', async () => {
  const fichier = $('serie-fichier-csv').files[0];
  if(!fichier) return;

  $('btn-serie-importer-csv').disabled = true;
  $('retour-import-csv').innerHTML = '<div class="msg msg-info">Import en cours…</div>';

  try{
    const [texte, base64] = await Promise.all([lireFichierTexte(fichier), lireFichierBase64(fichier)]);
    const numerosExtraits = extraireColonneGCsv(texte);

    const r = await poster({
      action: 'commande-importer-csv-tectech', password: motDePasse,
      ligne: serieLigneCourante, nomFichier: fichier.name, contenuBase64: base64
    });

    if(r.ok){
      if(numerosExtraits.length){
        const existants = listeSerieNettoyee();
        const fusion = existants.concat(numerosExtraits.filter(n => !existants.includes(n)));
        $('serie-texte').value = fusion.join('\n');
        majCompteurSerie();
      }
      $('retour-import-csv').innerHTML = `<div class="msg msg-succes">
        Fichier importé${numerosExtraits.length ? ' — ' + numerosExtraits.length + ' numéro' + (numerosExtraits.length > 1 ? 's' : '') + ' ajouté' + (numerosExtraits.length > 1 ? 's' : '') : ''}.
      </div>`;
      $('serie-lien-csv-existant').innerHTML = `<a href="${echapper(r.url)}" target="_blank" rel="noopener">📄 Ouvrir le fichier CSV importé</a>`;
      const c = commandes.find(x => x.ligne === serieLigneCourante);
      if(c) c.csvTectech = r.url;
    }else{
      $('retour-import-csv').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-import-csv').innerHTML = '<div class="msg msg-erreur">Import impossible.</div>';
  }
  $('btn-serie-importer-csv').disabled = false;
});

$('serie-enregistrer').addEventListener('click', async () => {
  const valeur = listeSerieNettoyee().join('\n');
  $('serie-enregistrer').disabled = true;
  try{
    const r = await poster({ action:'update', ligne: serieLigneCourante, champ:'numerosSerie', valeur });
    if(r.ok){
      const c = commandes.find(x => x.ligne === serieLigneCourante);
      if(c) c.numerosSerie = valeur;
      $('modale-serie').hidden = true;
      rendre();
      etat('Numéros de série enregistrés', 'succes');
    }else{
      etat(r.erreur || 'Enregistrement impossible', 'erreur');
    }
  }catch(e){ etat('Enregistrement impossible', 'erreur'); }
  $('serie-enregistrer').disabled = false;
});

/* ══════════════ MODALE : SUIVI COLISSIMO ══════════════ */

let colissimoLigneCourante = null;

$('liste').addEventListener('click', e => {
  const b = e.target.closest('[data-colissimo-ligne]');
  if(!b) return;
  colissimoLigneCourante = parseInt(b.dataset.colissimoLigne, 10);
  $('colissimo-texte').value = b.dataset.colissimoValeur || '';
  majCompteurColissimo();
  $('modale-colissimo').hidden = false;
  setTimeout(() => $('colissimo-texte').focus(), 50);
});

function listeColissimoNettoyee(){
  return $('colissimo-texte').value.split('\n').map(s => s.trim()).filter(Boolean);
}
function majCompteurColissimo(){
  const n = listeColissimoNettoyee().length;
  $('colissimo-compte').textContent = n + (n > 1 ? ' liens' : ' lien');
}
$('colissimo-texte').addEventListener('input', majCompteurColissimo);
$('colissimo-annuler').addEventListener('click', () => $('modale-colissimo').hidden = true);

$('colissimo-enregistrer').addEventListener('click', async () => {
  const valeur = listeColissimoNettoyee().join('\n');
  $('colissimo-enregistrer').disabled = true;
  try{
    const r = await poster({ action:'update', ligne: colissimoLigneCourante, champ:'colissimo', valeur });
    if(r.ok){
      const c = commandes.find(x => x.ligne === colissimoLigneCourante);
      if(c) c.colissimo = valeur;
      $('modale-colissimo').hidden = true;
      rendre();
      etat('Suivi Colissimo enregistré', 'succes');
    }else{
      etat(r.erreur || 'Enregistrement impossible', 'erreur');
    }
  }catch(e){ etat('Enregistrement impossible', 'erreur'); }
  $('colissimo-enregistrer').disabled = false;
});

/* ══════════════ Envoi d'email — aperçu éditable partagé (commandes et SAV) ══════════════
   On ne fait plus confiance à un simple "confirmer/annuler" : le sujet et le corps réels sont
   chargés depuis le serveur (mêmes infos commande que celles qui seraient envoyées), affichés
   dans des champs modifiables, et c'est ce texte — éventuellement retouché — qui part vraiment
   à l'envoi. Automatiser ne veut pas dire perdre la main sur ce qui part. */
let envoiEmailAction = null;
let envoiEmailLigne = null;

async function demanderEnvoiEmail(action, ligne, description){
  envoiEmailAction = action;
  envoiEmailLigne = ligne;
  $('confirmation-email-texte').textContent = description;
  $('retour-confirmation-email').innerHTML = '';
  $('confirmation-email-corps').hidden = true;
  $('confirmation-email-chargement').hidden = false;
  $('confirmation-email-confirmer').disabled = true;
  $('modale-confirmation-email').hidden = false;

  const actionApercu = action.replace('envoyer-email-', 'apercu-email-');
  try{
    const r = await poster({ action: actionApercu, password: motDePasse, ligne: ligne });
    if(r.ok){
      $('confirmation-email-sujet').value = r.sujet;
      $('confirmation-email-texte-corps').value = r.corps;
      $('confirmation-email-chargement').hidden = true;
      $('confirmation-email-corps').hidden = false;
      $('confirmation-email-confirmer').disabled = false;
    }else{
      $('confirmation-email-chargement').hidden = true;
      $('retour-confirmation-email').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('confirmation-email-chargement').hidden = true;
    $('retour-confirmation-email').innerHTML = '<div class="msg msg-erreur">Aperçu impossible à charger.</div>';
  }
}
$('confirmation-email-annuler').addEventListener('click', () => $('modale-confirmation-email').hidden = true);

$('confirmation-email-confirmer').addEventListener('click', async () => {
  $('confirmation-email-confirmer').disabled = true;
  $('retour-confirmation-email').innerHTML = '';
  try{
    const r = await poster({
      action: envoiEmailAction, password: motDePasse, ligne: envoiEmailLigne,
      sujet: $('confirmation-email-sujet').value.trim(),
      corps: $('confirmation-email-texte-corps').value.trim()
    });
    if(r.ok){
      $('modale-confirmation-email').hidden = true;
      etat('Email envoyé à ' + r.email, 'succes');
    }else{
      $('retour-confirmation-email').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-confirmation-email').innerHTML = '<div class="msg msg-erreur">Envoi impossible.</div>';
  }
  $('confirmation-email-confirmer').disabled = false;
});

$('colissimo-envoyer-email').addEventListener('click', async () => {
  const c = commandes.find(x => x.ligne === colissimoLigneCourante);
  if(!c) return;
  if(!c.email){
    etat('Aucune adresse email connue pour cette commande', 'erreur');
    return;
  }
  const valeur = listeColissimoNettoyee().join('\n');
  if(!valeur){
    etat('Renseigne d\'abord un lien Colissimo avant de l\'envoyer', 'erreur');
    return;
  }
  $('colissimo-envoyer-email').disabled = true;
  try{
    const r = await poster({ action:'update', ligne: colissimoLigneCourante, champ:'colissimo', valeur });
    if(!r.ok){
      etat(r.erreur || 'Enregistrement du colissimo impossible avant envoi', 'erreur');
      $('colissimo-envoyer-email').disabled = false;
      return;
    }
    c.colissimo = valeur;
  }catch(e){
    etat('Enregistrement du colissimo impossible avant envoi', 'erreur');
    $('colissimo-envoyer-email').disabled = false;
    return;
  }
  $('colissimo-envoyer-email').disabled = false;
  demanderEnvoiEmail('envoyer-email-colissimo-commande', colissimoLigneCourante,
    `Envoyer le suivi Colissimo à ${c.email} pour la commande ${c.reference} ?`);
});

/* ══════════════ MODALE : COMMENTAIRE ══════════════ */

let commentaireLigneCourante = null;

$('liste').addEventListener('click', e => {
  const b = e.target.closest('[data-commentaire-ligne]');
  if(!b) return;
  commentaireLigneCourante = parseInt(b.dataset.commentaireLigne, 10);
  $('commentaire-texte').value = b.dataset.commentaireValeur || '';
  $('modale-commentaire').hidden = false;
  setTimeout(() => $('commentaire-texte').focus(), 50);
});
$('commentaire-annuler').addEventListener('click', () => $('modale-commentaire').hidden = true);

$('commentaire-enregistrer').addEventListener('click', async () => {
  const valeur = $('commentaire-texte').value;
  $('commentaire-enregistrer').disabled = true;
  try{
    const r = await poster({ action:'update', ligne: commentaireLigneCourante, champ:'commentaire', valeur });
    if(r.ok){
      const c = commandes.find(x => x.ligne === commentaireLigneCourante);
      if(c) c.commentaire = valeur;
      $('modale-commentaire').hidden = true;
      rendre();
      etat('Commentaire enregistré', 'succes');
    }else{
      etat(r.erreur || 'Enregistrement impossible', 'erreur');
    }
  }catch(e){ etat('Enregistrement impossible', 'erreur'); }
  $('commentaire-enregistrer').disabled = false;
});

/* ══════════════ MODALE : FACTURER DIRECTEMENT (SANS DEVIS) ══════════════ */

let facturerLigneCourante = null;
let ongletsNumerotationCache = []; // [{nom, gid}], rechargé à chaque ouverture de la modale
let fichierNumerotationIdCache = ''; // renvoyé par le serveur, pour construire le lien direct

async function ouvrirModaleFacturerDirect(ligne){
  facturerLigneCourante = ligne;
  $('facturer-numero').value = '';
  $('retour-facturer').innerHTML = '';
  $('modale-facturer-direct').hidden = false;

  const lienDossier = $('lien-dossier-factures-modale');
  if(dossierFacturesPdfId){
    lienDossier.href = 'https://drive.google.com/drive/folders/' + dossierFacturesPdfId;
    lienDossier.hidden = false;
  }else{
    lienDossier.hidden = true;
  }

  if(fichierNumerotationConfigure){
    $('zone-numerotation-auto').hidden = false;
    $('facturer-onglet-numerotation').innerHTML = '<option>Chargement…</option>';
    try{
      const r = await poster({action:'numerotation-onglets', password:motDePasse});
      if(r.ok){
        ongletsNumerotationCache = r.onglets;
        fichierNumerotationIdCache = r.fichierId;
        $('facturer-onglet-numerotation').innerHTML = r.onglets.map(o =>
          `<option value="${echapper(o.nom)}" ${o.nom === r.ongletParDefaut ? 'selected' : ''}>${echapper(o.nom)}</option>`).join('');
        majLienOngletNumerotation();
      }else{
        $('zone-numerotation-auto').hidden = true;
      }
    }catch(e){ $('zone-numerotation-auto').hidden = true; }
  }else{
    $('zone-numerotation-auto').hidden = true;
    setTimeout(() => $('facturer-numero').focus(), 50);
  }
}

function majLienOngletNumerotation(){
  const nomChoisi = $('facturer-onglet-numerotation').value;
  const onglet = ongletsNumerotationCache.find(o => o.nom === nomChoisi);
  const lien = $('lien-ouvrir-onglet-numerotation');
  if(onglet){
    lien.href = 'https://docs.google.com/spreadsheets/d/' + fichierNumerotationIdCache + '/edit#gid=' + onglet.gid;
  }
}
$('facturer-onglet-numerotation').addEventListener('change', majLienOngletNumerotation);

$('liste').addEventListener('click', e => {
  const b = e.target.closest('[data-facturer-ligne]');
  if(!b) return;
  ouvrirModaleFacturerDirect(parseInt(b.dataset.facturerLigne, 10));
});
$('facturer-annuler').addEventListener('click', () => $('modale-facturer-direct').hidden = true);

$('facturer-confirmer').addEventListener('click', async () => {
  const numeroFacture = $('facturer-numero').value.trim();
  if(!numeroFacture){
    $('retour-facturer').innerHTML = '<div class="msg msg-erreur">Le numéro de facture est obligatoire.</div>';
    return;
  }
  $('facturer-confirmer').disabled = true;
  try{
    const r = await poster({ action:'commande-facturer-direct', ligne: facturerLigneCourante, numeroFacture });
    if(r.ok){
      $('modale-facturer-direct').hidden = true;
      await recharger();
      await chargerFactures();
      etat('Facture ' + r.referenceFacture + ' créée — ' + formaterMontant(r.montant), 'succes');
    }else{
      $('retour-facturer').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-facturer').innerHTML = '<div class="msg msg-erreur">Création impossible.</div>';
  }
  $('facturer-confirmer').disabled = false;
});

/* ══════════════ MODALE : NOUVELLE COMMANDE MANUELLE ══════════════ */

let ncLignes = []; // [{produit, quantite}] — construites une à une avant l'enregistrement

function rendreNcLignes(){
  if(!ncLignes.length){
    $('nc-lignes-ajoutees').innerHTML = '<p class="reglage-texte" style="margin:6px 0">Aucun produit ajouté pour l\'instant.</p>';
  }else{
    $('nc-lignes-ajoutees').innerHTML = ncLignes.map((l, i) => `
      <div class="materiel-ligne" style="font-size:14px;margin-bottom:4px">
        <span class="q">${l.quantite}×</span> ${echapper(l.produit)}
        <button type="button" data-nc-retirer="${i}" title="Retirer">✕</button>
      </div>`).join('');
  }
  document.querySelectorAll('#nc-lignes-ajoutees [data-nc-retirer]').forEach(b => {
    b.addEventListener('click', () => {
      ncLignes.splice(parseInt(b.dataset.ncRetirer, 10), 1);
      rendreNcLignes();
    });
  });
}

$('btn-nouvelle-commande').addEventListener('click', () => {
  $('nc-code').value = '';
  $('nc-quantite').value = 1;
  $('nc-commentaire').value = '';
  $('nc-date').value = new Date().toISOString().slice(0, 10);
  $('retour-nouvelle-commande').innerHTML = '';
  $('retour-nc-ligne').innerHTML = '';
  ncLignes = [];
  rendreNcLignes();

  // Datalist des structures : "Nom — CODE" pour retrouver facilement, la valeur réelle envoyée est le code
  $('nc-structures-liste').innerHTML = structures.map(s =>
    `<option value="${echapper(s.code)}">${echapper(s.nom)}</option>`).join('');

  // Options produit à jour, avec le stock affiché pour éviter les mauvaises surprises
  $('nc-produit').innerHTML = produits.map(p =>
    `<option value="${echapper(p.nom)}">${echapper(p.nom)} — stock : ${p.stock}</option>`).join('');

  majBlocsPaiementNc();
  $('modale-commande').hidden = false;
  setTimeout(() => $('nc-code').focus(), 50);
});
$('nc-annuler').addEventListener('click', () => $('modale-commande').hidden = true);

/** Structure ESN : aucun moyen ni statut de paiement à saisir (jamais de facturation). */
function majBlocsPaiementNc(){
  const structureSaisie = structures.find(s => s.code === $('nc-code').value.trim());
  const estEsnSaisie = !!(structureSaisie && (structureSaisie.esn || structureSaisie.interne));
  $('nc-bloc-paiement').hidden = estEsnSaisie;
  $('nc-bloc-statut-paiement').hidden = estEsnSaisie;
}
$('nc-code').addEventListener('input', majBlocsPaiementNc);

$('nc-ajouter-ligne').addEventListener('click', () => {
  const produit = $('nc-produit').value;
  const quantite = parseInt($('nc-quantite').value, 10);
  if(!produit || !quantite || quantite < 1){
    $('retour-nc-ligne').innerHTML = '<div class="msg msg-erreur">Choisis un produit et une quantité valide.</div>';
    return;
  }
  if(ncLignes.some(l => l.produit === produit)){
    $('retour-nc-ligne').innerHTML = '<div class="msg msg-erreur">Ce produit est déjà dans la liste — retire-le d\'abord pour changer sa quantité.</div>';
    return;
  }
  ncLignes.push({ produit, quantite });
  $('retour-nc-ligne').innerHTML = '';
  $('nc-quantite').value = 1;
  rendreNcLignes();
});

$('nc-enregistrer').addEventListener('click', async () => {
  const structureNc = structures.find(s => s.code === $('nc-code').value.trim());
  const estEsnNc = !!(structureNc && (structureNc.esn || structureNc.interne));
  const donnees = {
    action: 'commande-create-manuelle',
    code: $('nc-code').value.trim(),
    lignes: ncLignes,
    moyenPaiement: estEsnNc ? 'Non applicable (ESN/Interne)' : $('nc-paiement').value,
    date: $('nc-date').value,
    statutCommande: $('nc-statut-commande').value,
    statutPaiement: $('nc-statut-paiement').value,
    commentaire: $('nc-commentaire').value.trim(),
    urlSuivi: urlFormulairePublic().replace('portail.html', 'suivi.html')
  };

  if(!donnees.code){
    $('retour-nouvelle-commande').innerHTML = '<div class="msg msg-erreur">Le code de la structure est obligatoire.</div>';
    return;
  }
  if(!ncLignes.length){
    $('retour-nouvelle-commande').innerHTML = '<div class="msg msg-erreur">Ajoute au moins un produit.</div>';
    return;
  }

  $('nc-enregistrer').disabled = true;
  $('retour-nouvelle-commande').innerHTML = '';

  try{
    const r = await poster(donnees);
    if(r.ok){
      $('modale-commande').hidden = true;
      await recharger();
      await chargerProduits();
      etat('Commande ' + r.reference + ' créée', 'succes');
    }else{
      $('retour-nouvelle-commande').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-nouvelle-commande').innerHTML = '<div class="msg msg-erreur">Création impossible.</div>';
  }
  $('nc-enregistrer').disabled = false;
});

/* ══════════════ SUPPRESSION À DOUBLE AVERTISSEMENT (générique) ══════════════ */

let suppressionEnAttente = null; // { action, ligne, apres }

function demanderSuppression(label, action, ligne, apres){
  if(!confirm(`Supprimer définitivement ${label} ?`)) return;
  if(suppressionSimple){
    executerSuppression(action, ligne, apres);
    return;
  }
  suppressionEnAttente = { action, ligne, apres };
  $('suppr-ref').textContent = label;
  $('modale-suppression').hidden = false;
}

async function executerSuppression(action, ligne, apres){
  try{
    const r = await poster({ action, ligne });
    if(r.ok){
      if(apres) await apres();
      etat('Supprimé', 'succes');
      return true;
    }
    etat(r.erreur || 'Suppression impossible', 'erreur');
    return false;
  }catch(e){ etat('Suppression impossible', 'erreur'); return false; }
}

$('liste').addEventListener('click', e => {
  const b = e.target.closest('[data-commande-supprimer]');
  if(!b) return;
  demanderSuppression('la commande ' + b.dataset.ref, 'commande-delete', parseInt(b.dataset.commandeSupprimer, 10), recharger);
});

$('suppr-annuler').addEventListener('click', () => $('modale-suppression').hidden = true);

$('suppr-confirmer').addEventListener('click', async () => {
  if(!suppressionEnAttente) return;
  $('suppr-confirmer').disabled = true;
  const { action, ligne, apres } = suppressionEnAttente;
  const succes = await executerSuppression(action, ligne, apres);
  if(succes){
    $('modale-suppression').hidden = true;
    suppressionEnAttente = null;
  }
  $('suppr-confirmer').disabled = false;
});

/* ══════════════ COMPTABILITÉ ══════════════ */

let compta = [];

async function chargerComptabilite(){
  etat('Chargement de la comptabilité…', 'chargement');
  try{
    const r = await jsonp({action:'comptabilite', password:motDePasse});
    if(r.ok){ compta = r.lignes; rendreComptabilite(); $('etat').classList.remove('visible'); }
    else etat(r.erreur || 'Chargement de la comptabilité impossible', 'erreur');
  }catch(e){ etat('Chargement de la comptabilité impossible', 'erreur'); }
}
$('btn-recharger-compta').addEventListener('click', () => {
  etat('Actualisation…', 'neutre');
  chargerComptabilite().then(() => etat('À jour', 'succes'));
});
$('recherche-compta').addEventListener('input', rendreComptabilite);

let filtreCompta = 'tout';
$('filtres-compta').addEventListener('click', e => {
  const b = e.target.closest('button');
  if(!b) return;
  filtreCompta = b.dataset.fc;
  document.querySelectorAll('#filtres-compta button').forEach(x => x.classList.toggle('actif', x === b));
  rendreComptabilite();
});

function rendreComptabilite(){
  const q = $('recherche-compta').value.trim().toLowerCase();
  const visibles = compta.filter(l => {
    if(filtreCompta === 'non-paye' && l.statutPaiement === 'Payé') return false;
    if(filtreCompta !== 'tout' && filtreCompta !== 'non-paye' && l.statutComptable !== filtreCompta) return false;
    if(!q) return true;
    return (l.referenceCommande + ' ' + l.referenceFacture + ' ' + l.nomStructure).toLowerCase().includes(q);
  });

  if(!visibles.length){
    $('liste-compta').innerHTML = `<div class="vide">
      <strong>Rien à afficher ici</strong>
      Une commande apparaît dans cette vue dès qu'une facture a été générée pour elle (onglet Devis → Convertir en facture).
    </div>`;
    return;
  }

  const optionsStatut = v => STATUTS_COMPTABLES.map(s =>
    `<option value="${s}"${s === v ? ' selected' : ''}>${s}</option>`).join('');

  $('liste-compta').innerHTML = visibles.map(l => `
    <article class="ligne-compta ${l.statutComptable === 'Clôturé' ? 'cloture' : ''}">
      <div>
        <div class="ref">${echapper(l.referenceFacture)}</div>
        <div class="date">${echapper(l.date)}</div>
      </div>
      <div>
        <div class="nom">${echapper(l.nomStructure)}</div>
        <div class="coords">Commande ${echapper(l.referenceCommande)}</div>
      </div>
      <div>
        <div class="materiel"><span class="q">${echapper(l.quantite)}×</span> ${echapper(l.produit)}</div>
        <div class="moyen">${echapper(l.moyenPaiement)} — ${echapper(l.statutPaiement)}</div>
      </div>
      <div class="montant">${formaterMontant(l.montant)}</div>
      <select data-compta-ligne="${l.ligne}" data-compta-champ="statutComptable">${optionsStatut(l.statutComptable)}</select>
      <input type="text" data-compta-ligne="${l.ligne}" data-compta-champ="numeroDepot"
             value="${echapper(l.numeroDepot)}" placeholder="N° dépôt ou Zettle">
    </article>`).join('');
}

$('liste-compta').addEventListener('change', async e => {
  const el = e.target;
  if(!el.matches('[data-compta-ligne]')) return;

  el.disabled = true;
  try{
    const r = await poster({
      action: 'compta-update',
      ligne: parseInt(el.dataset.comptaLigne, 10),
      champ: el.dataset.comptaChamp,
      valeur: el.value
    });
    etat(r.ok ? 'Enregistré' : (r.erreur || 'Enregistrement impossible'), r.ok ? 'succes' : 'erreur');
    if(r.ok){
      const l = compta.find(x => x.ligne === parseInt(el.dataset.comptaLigne, 10));
      if(l) l[el.dataset.comptaChamp] = el.value;
      if(el.dataset.comptaChamp === 'statutComptable') rendreComptabilite();
    }else{
      chargerComptabilite();
    }
  }catch(err){ etat('Enregistrement impossible', 'erreur'); }
  el.disabled = false;
});

