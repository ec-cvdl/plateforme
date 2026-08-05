/* ══════════════ DEVIS ══════════════ */

let devis = [];
let devisChargeUneFois = false;
let totalDevis = 0;
let limiteDevisActuelle = LIMITE_LISTES_DEFAUT;
let decalageDevisActuel = 0;
let rechercheDevisActive = false;

async function chargerDevis(silencieux){
  if(!silencieux) etat('Chargement des devis…', 'chargement');
  try{
    const r = await jsonp({action:'devis', password:motDePasse, limite:limiteDevisActuelle, decalage:decalageDevisActuel});
    if(r.ok){ devis = r.devis; totalDevis = r.total; devisChargeUneFois = true; rendreDevis(); }
    if(!silencieux) $('etat').classList.remove('visible');
  }catch(e){ if(!silencieux) etat('Chargement des devis impossible', 'erreur'); }
}
async function changerPageDevis(nouveauDecalage){
  decalageDevisActuel = Math.max(0, nouveauDecalage);
  etat('Chargement…', 'chargement');
  try{
    const r = await jsonp({action:'devis', password:motDePasse, limite:limiteDevisActuelle, decalage:decalageDevisActuel});
    if(r.ok){ devis = r.devis; totalDevis = r.total; rendreDevis(); }
    $('etat').classList.remove('visible');
  }catch(e){ etat('Chargement impossible', 'erreur'); }
}
$('btn-page-precedente-devis').addEventListener('click', () => changerPageDevis(decalageDevisActuel - limiteDevisActuelle));
$('btn-page-suivante-devis').addEventListener('click', () => changerPageDevis(decalageDevisActuel + limiteDevisActuelle));

$('btn-recharger-devis').addEventListener('click', () => {
  etat('Actualisation…', 'neutre');
  decalageDevisActuel = 0;
  chargerDevis().then(() => etat('À jour', 'succes'));
});
let minuteurRechercheDevis = null;
$('recherche-devis').addEventListener('input', () => {
  clearTimeout(minuteurRechercheDevis);
  const terme = $('recherche-devis').value.trim();
  minuteurRechercheDevis = setTimeout(async () => {
    if(!terme){
      rechercheDevisActive = false;
      await changerPageDevis(0);
      return;
    }
    etat('Recherche…', 'chargement');
    try{
      const r = await jsonp({action:'devis', password:motDePasse, recherche:terme});
      if(r.ok){ devis = r.devis; totalDevis = r.total; rechercheDevisActive = true; rendreDevis(); etat('À jour', 'succes'); }
    }catch(e){ etat('Recherche impossible', 'erreur'); }
  }, 350);
});

function apercuModeleDevis(modele){
  const rendu = String(modele || '')
    .replace('{ANNEE}', new Date().getFullYear())
    .replace('{NUM}', '0001');
  return 'Exemple avec ce modèle : ' + rendu;
}

async function chargerReglages(){
  etat('Chargement des réglages…', 'chargement');
  try{
    try{ $('role-vue-preferee-input').value = localStorage.getItem('cvdl-role-vue-preferee') || 'commandes'; }catch(e){}
    const r = await jsonp({action:'reglages', password:motDePasse});
    if(r.ok){
      $('modele-devis-input').value = r.modeleDevis;
      $('apercu-modele-devis').textContent = apercuModeleDevis(r.modeleDevis);
      $('modele-commande-input').value = r.modeleCommande;
      $('apercu-modele-commande').textContent = apercuModeleDevis(r.modeleCommande);
      $('modele-sav-input').value = r.modeleSav;
      $('apercu-modele-sav').textContent = apercuModeleDevis(r.modeleSav);
      $('seuil-alerte-input').value = r.seuilAlerteImpayee;
      $('quantite-max-defaut-input').value = r.quantiteMaxDefaut || 5;
      $('quantite-max-defaut-esn-input').value = r.quantiteMaxDefautEsn || 5;
      $('badge-nouvelle-jours-input').value = r.badgeNouvelleJours || 1.5;
      $('badge-nouvelle-sav-jours-input').value = r.badgeNouvelleSavJours || 1.5;
      $('heure-fin-vendredi-input').value = r.heureFinVendredi != null ? r.heureFinVendredi : 17;
      $('heure-debut-lundi-input').value = r.heureDebutLundi != null ? r.heureDebutLundi : 8;
      badgeNouvelleJours = r.badgeNouvelleJours || 1.5;
      heureFinVendredi = r.heureFinVendredi != null ? r.heureFinVendredi : 17;
      heureDebutLundi = r.heureDebutLundi != null ? r.heureDebutLundi : 8;
      if(r.symptomesSav && r.symptomesSav.length) symptomesSav = r.symptomesSav;
      $('symptomes-sav-input').value = (r.symptomesSav || symptomesSav).join('\n');
      $('email-contact-sav-input').value = r.emailContactSav || '';
      $('email-logistique-input').value = r.emailLogistique || '';
      $('meme-personne-logistique-input').checked = !!r.memePersonneLogistiqueDistribution;
      memePersonneLogistiqueDistribution = !!r.memePersonneLogistiqueDistribution;
      $('email-modele-sav-input').value = r.emailModeleSav || '';
      peuplerCasesOngletsVisibles(r.ongletsMasques || '');
      appliquerOngletsVisibles(r.ongletsMasques || '');
      seuilAlerteImpayee = r.seuilAlerteImpayee;
      $('dossier-principal-input').value = r.dossierPrincipal || '';
      dossierPrincipalConfigure = !!r.dossierPrincipal;
      $('email-admin-input').value = r.emailAdmin || '';
      $('nom-organisation-input').value = r.nomOrganisation || '';
      $('suppression-simple-input').checked = !!r.suppressionSimple;
      suppressionSimple = !!r.suppressionSimple;
      appliquerNomOrganisation(r.nomOrganisation);
      appliquerLienDossierFactures(r.dossierPrincipal);
      appliquerLienFichierNumerotation(r.fichierNumerotation);
      $('fichier-numerotation-input').value = r.fichierNumerotation || '';
      $('onglet-numerotation-input').value = r.ongletNumerotation || '';
      fichierNumerotationConfigure = !!r.fichierNumerotation;
      if(r.modeleFacturation) modeleFacturationUrl = 'https://docs.google.com/spreadsheets/d/' + r.modeleFacturation;
      $('modele-facturation-input').value = r.modeleFacturation || '';
      $('modele-bon-livraison-input').value = r.modeleBonLivraison || '';
      $('modele-bon-orientation-input').value = r.modeleBonOrientation || '';
      $('modele-attestation-input').value = r.modeleAttestationPaiement || '';
      $('api-key-affichee').value = r.apiKeyLecture || '';
      $('btn-api-key-supprimer').hidden = !r.apiKeyLecture;
      $('modele-flotte-input').value = r.modeleFlotteMateriel || '';
      const typesDateSouhaitee = (r.structuresDateSouhaitee || '').split(',').map(s => s.trim()).filter(Boolean);
      ['rn', 'esn', 'interne', 'autres'].forEach(t => { $('date-souhaitee-' + t).checked = typesDateSouhaitee.includes(t); });
      $('nettoyage-fichiers-input').value = r.nettoyageFichiersJours || '';
      $('enquetes-satisfaction-input').checked = !!r.enquetesSatisfactionActivees;
      $('bascule-annuelle-input').checked = !!r.basculeAnnuelleActivee;
      $('bascule-jour-input').value = r.basculeDateJour || 1;
      $('bascule-mois-input').value = r.basculeDateMois || 1;
      $('lien-classeur-actif').href = r.classeurActifUrl || '#';
      rendreListeArchives(r.archives || []);
      if(r.rappelBasculeDu && !rappelBasculeDejaVuCetteSession){
        rappelBasculeDejaVuCetteSession = true;
        $('modale-rappel-bascule').hidden = false;
      }
      $('responsable-nom-input').value = r.responsableNom || '';
      $('responsable-telephone-input').value = r.responsableTelephone || '';
      $('responsable-email-input').value = r.responsableEmail || '';
    }else{
      etat(r.erreur || 'Chargement des réglages impossible (réponse serveur négative)', 'erreur');
      return;
    }
    $('etat').classList.remove('visible');
  }catch(e){
    console.error('chargerReglages a échoué :', e);
    etat('Chargement des réglages impossible : ' + e.message, 'erreur');
  }
}

$('modele-devis-input').addEventListener('input', () => {
  $('apercu-modele-devis').textContent = apercuModeleDevis($('modele-devis-input').value);
});

$('btn-modele-devis-enregistrer').addEventListener('click', async () => {
  const modele = $('modele-devis-input').value.trim();
  if(!modele){ etat('Le modèle ne peut pas être vide', 'erreur'); return; }
  if(modele.indexOf('{NUM}') === -1){ etat('Le modèle doit contenir le jeton {NUM}', 'erreur'); return; }

  $('btn-modele-devis-enregistrer').disabled = true;
  try{
    const r = await poster({action:'reglages-set', password:motDePasse, modeleDevis: modele});
    etat(r.ok ? 'Modèle enregistré' : (r.erreur || 'Enregistrement impossible'), r.ok ? 'succes' : 'erreur');
  }catch(e){ etat('Enregistrement impossible', 'erreur'); }
  $('btn-modele-devis-enregistrer').disabled = false;
});

$('modele-commande-input').addEventListener('input', () => {
  $('apercu-modele-commande').textContent = apercuModeleDevis($('modele-commande-input').value);
});
$('btn-modele-commande-enregistrer').addEventListener('click', async () => {
  const modele = $('modele-commande-input').value.trim();
  if(!modele){ etat('Le modèle ne peut pas être vide', 'erreur'); return; }
  if(modele.indexOf('{NUM}') === -1){ etat('Le modèle doit contenir le jeton {NUM}', 'erreur'); return; }

  $('btn-modele-commande-enregistrer').disabled = true;
  try{
    const r = await poster({action:'reglages-set', password:motDePasse, modeleCommande: modele});
    etat(r.ok ? 'Modèle enregistré' : (r.erreur || 'Enregistrement impossible'), r.ok ? 'succes' : 'erreur');
  }catch(e){ etat('Enregistrement impossible', 'erreur'); }
  $('btn-modele-commande-enregistrer').disabled = false;
});

$('modele-sav-input').addEventListener('input', () => {
  $('apercu-modele-sav').textContent = apercuModeleDevis($('modele-sav-input').value);
});
$('btn-modele-sav-enregistrer').addEventListener('click', async () => {
  const modele = $('modele-sav-input').value.trim();
  if(!modele){ etat('Le modèle ne peut pas être vide', 'erreur'); return; }
  if(modele.indexOf('{NUM}') === -1){ etat('Le modèle doit contenir le jeton {NUM}', 'erreur'); return; }

  $('btn-modele-sav-enregistrer').disabled = true;
  try{
    const r = await poster({action:'reglages-set', password:motDePasse, modeleSav: modele});
    etat(r.ok ? 'Modèle enregistré' : (r.erreur || 'Enregistrement impossible'), r.ok ? 'succes' : 'erreur');
  }catch(e){ etat('Enregistrement impossible', 'erreur'); }
  $('btn-modele-sav-enregistrer').disabled = false;
});

$('btn-seuil-alerte-enregistrer').addEventListener('click', async () => {
  const seuil = parseInt($('seuil-alerte-input').value, 10);
  if(!seuil || seuil < 1){
    $('retour-seuil-alerte').innerHTML = '<div class="msg msg-erreur">Indique un nombre de jours supérieur à 0.</div>';
    return;
  }

  $('btn-seuil-alerte-enregistrer').disabled = true;
  $('retour-seuil-alerte').innerHTML = '';
  try{
    const r = await poster({action:'reglages-set', password:motDePasse, seuilAlerteImpayee: seuil});
    if(r.ok){
      seuilAlerteImpayee = seuil;
      $('retour-seuil-alerte').innerHTML = '<div class="msg msg-succes">Enregistré.</div>';
      etat('Réglages enregistrés', 'succes');
      rendre(); // ré-applique le nouveau seuil sur les fiches déjà affichées
    }else{
      $('retour-seuil-alerte').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-seuil-alerte').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  $('btn-seuil-alerte-enregistrer').disabled = false;
});

$('btn-quantite-max-defaut-enregistrer').addEventListener('click', async () => {
  const q = parseInt($('quantite-max-defaut-input').value, 10);
  if(!q || q < 1){
    $('retour-quantite-max-defaut').innerHTML = '<div class="msg msg-erreur">Indique un nombre supérieur à 0.</div>';
    return;
  }
  $('btn-quantite-max-defaut-enregistrer').disabled = true;
  $('retour-quantite-max-defaut').innerHTML = '';
  try{
    const r = await poster({action:'reglages-set', password:motDePasse, quantiteMaxDefaut: q});
    if(r.ok){
      $('retour-quantite-max-defaut').innerHTML = '<div class="msg msg-succes">Enregistré.</div>';
      etat('Réglages enregistrés', 'succes');
    }else{
      $('retour-quantite-max-defaut').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-quantite-max-defaut').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  $('btn-quantite-max-defaut-enregistrer').disabled = false;
});

$('btn-quantite-max-defaut-esn-enregistrer').addEventListener('click', async () => {
  const q = parseInt($('quantite-max-defaut-esn-input').value, 10);
  if(!q || q < 1){
    $('retour-quantite-max-defaut-esn').innerHTML = '<div class="msg msg-erreur">Indique un nombre supérieur à 0.</div>';
    return;
  }
  $('btn-quantite-max-defaut-esn-enregistrer').disabled = true;
  $('retour-quantite-max-defaut-esn').innerHTML = '';
  try{
    const r = await poster({action:'reglages-set', password:motDePasse, quantiteMaxDefautEsn: q});
    if(r.ok){
      $('retour-quantite-max-defaut-esn').innerHTML = '<div class="msg msg-succes">Enregistré.</div>';
      etat('Réglages enregistrés', 'succes');
    }else{
      $('retour-quantite-max-defaut-esn').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-quantite-max-defaut-esn').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  $('btn-quantite-max-defaut-esn-enregistrer').disabled = false;
});

$('btn-badge-nouvelle-enregistrer').addEventListener('click', async () => {
  const jours = parseFloat($('badge-nouvelle-jours-input').value);
  const joursSav = parseFloat($('badge-nouvelle-sav-jours-input').value);
  const finVendredi = parseInt($('heure-fin-vendredi-input').value, 10);
  const debutLundi = parseInt($('heure-debut-lundi-input').value, 10);
  if(!jours || jours <= 0 || !joursSav || joursSav <= 0){
    $('retour-badge-nouvelle').innerHTML = '<div class="msg msg-erreur">Indique un nombre de jours supérieur à 0 pour les deux.</div>';
    return;
  }
  if(isNaN(finVendredi) || finVendredi < 0 || finVendredi > 23 || isNaN(debutLundi) || debutLundi < 0 || debutLundi > 23){
    $('retour-badge-nouvelle').innerHTML = '<div class="msg msg-erreur">Les heures doivent être comprises entre 0 et 23.</div>';
    return;
  }
  $('btn-badge-nouvelle-enregistrer').disabled = true;
  $('retour-badge-nouvelle').innerHTML = '';
  try{
    const r = await poster({
      action:'reglages-set', password:motDePasse,
      badgeNouvelleJours: jours, badgeNouvelleSavJours: joursSav,
      heureFinVendredi: finVendredi, heureDebutLundi: debutLundi
    });
    if(r.ok){
      badgeNouvelleJours = jours; badgeNouvelleSavJours = joursSav;
      heureFinVendredi = finVendredi; heureDebutLundi = debutLundi;
      $('retour-badge-nouvelle').innerHTML = '<div class="msg msg-succes">Enregistré.</div>';
      etat('Réglages enregistrés', 'succes');
      rendre(); // ré-applique tout de suite le nouveau réglage sur les fiches déjà affichées
      rendreSav();
    }else{
      $('retour-badge-nouvelle').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-badge-nouvelle').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  $('btn-badge-nouvelle-enregistrer').disabled = false;
});

$('btn-dossier-principal-enregistrer').addEventListener('click', async () => {
  const valeur = $('dossier-principal-input').value.trim();
  if(!valeur){
    $('retour-dossier-principal').innerHTML = '<div class="msg msg-erreur">Le dossier Drive principal est obligatoire.</div>';
    return;
  }
  $('btn-dossier-principal-enregistrer').disabled = true;
  $('retour-dossier-principal').innerHTML = '';
  try{
    const r = await poster({action:'reglages-set', password:motDePasse, dossierPrincipal: valeur});
    if(r.ok){
      $('retour-dossier-principal').innerHTML = '<div class="msg msg-succes">Enregistré.</div>';
      etat('Réglages enregistrés', 'succes');
      dossierPrincipalConfigure = true;
      $('modale-dossier-principal-obligatoire').hidden = true;
      await chargerReglages(); // réaffiche l'ID nettoyé si une URL complète a été collée
    }else{
      $('retour-dossier-principal').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-dossier-principal').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  $('btn-dossier-principal-enregistrer').disabled = false;
});

$('dossier-principal-modal-input').addEventListener('keydown', e => { if(e.key === 'Enter') $('btn-dossier-principal-modal-enregistrer').click(); });

$('btn-dossier-principal-modal-enregistrer').addEventListener('click', async () => {
  const valeur = $('dossier-principal-modal-input').value.trim();
  if(!valeur){
    $('retour-dossier-principal-modal').innerHTML = '<div class="msg msg-erreur">Le dossier Drive principal est obligatoire.</div>';
    return;
  }
  $('btn-dossier-principal-modal-enregistrer').disabled = true;
  $('retour-dossier-principal-modal').innerHTML = '';
  try{
    const r = await poster({action:'reglages-set', password:motDePasse, dossierPrincipal: valeur});
    if(r.ok){
      dossierPrincipalConfigure = true;
      $('modale-dossier-principal-obligatoire').hidden = true;
      $('dossier-principal-input').value = valeur;
      etat('Réglages enregistrés', 'succes');
      await chargerReglages();
    }else{
      $('retour-dossier-principal-modal').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-dossier-principal-modal').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  $('btn-dossier-principal-modal-enregistrer').disabled = false;
});

$('btn-numerotation-enregistrer').addEventListener('click', async () => {
  const fichier = $('fichier-numerotation-input').value.trim();
  const onglet = $('onglet-numerotation-input').value.trim();
  $('btn-numerotation-enregistrer').disabled = true;
  $('retour-numerotation').innerHTML = '';
  try{
    const r = await poster({action:'reglages-set', password:motDePasse, fichierNumerotation: fichier, ongletNumerotation: onglet});
    if(r.ok){
      $('retour-numerotation').innerHTML = '<div class="msg msg-succes">Enregistré.</div>';
      etat('Réglages enregistrés', 'succes');
      await chargerReglages();
    }else{
      $('retour-numerotation').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-numerotation').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  $('btn-numerotation-enregistrer').disabled = false;
});

$('btn-modele-facturation-enregistrer').addEventListener('click', async () => {
  const valeur = $('modele-facturation-input').value.trim();
  $('btn-modele-facturation-enregistrer').disabled = true;
  $('retour-modele-facturation').innerHTML = '';
  try{
    const r = await poster({action:'reglages-set', password:motDePasse, modeleFacturation: valeur});
    if(r.ok){
      $('retour-modele-facturation').innerHTML = '<div class="msg msg-succes">Enregistré.</div>';
      etat('Réglages enregistrés', 'succes');
      await chargerReglages();
    }else{
      $('retour-modele-facturation').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-modele-facturation').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  $('btn-modele-facturation-enregistrer').disabled = false;
});
if($('btn-modele-bon-livraison-enregistrer')){
  $('btn-modele-bon-livraison-enregistrer').addEventListener('click', async () => {
    const valeur = $('modele-bon-livraison-input').value.trim();
    $('btn-modele-bon-livraison-enregistrer').disabled = true;
    $('retour-modele-bon-livraison').innerHTML = '';
    try{
      const r = await poster({action:'reglages-set', password:motDePasse, modeleBonLivraison: valeur});
      if(r.ok){
        $('retour-modele-bon-livraison').innerHTML = '<div class="msg msg-succes">Enregistré.</div>';
        etat('Réglages enregistrés', 'succes');
        await chargerReglages();
      }else{
        $('retour-modele-bon-livraison').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
      }
    }catch(e){
      $('retour-modele-bon-livraison').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
    }
    $('btn-modele-bon-livraison-enregistrer').disabled = false;
  });
}

function creerHandlerReglageSimple(idBouton, idChamp, idRetour, cle){
  if(!$(idBouton)) return; // décalage possible entre la version du HTML et celle du JS déployés — ne doit jamais faire planter le reste du fichier
  $(idBouton).addEventListener('click', async () => {
    const valeur = $(idChamp).value.trim();
    $(idBouton).disabled = true;
    $(idRetour).innerHTML = '';
    try{
      const payload = { action:'reglages-set', password:motDePasse };
      payload[cle] = valeur;
      const r = await poster(payload);
      if(r.ok){
        $(idRetour).innerHTML = '<div class="msg msg-succes">Enregistré.</div>';
        etat('Réglages enregistrés', 'succes');
        await chargerReglages();
      }else{
        $(idRetour).innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
      }
    }catch(e){
      $(idRetour).innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
    }
    $(idBouton).disabled = false;
  });
}
creerHandlerReglageSimple('btn-modele-bon-orientation-enregistrer', 'modele-bon-orientation-input', 'retour-modele-bon-orientation', 'modeleBonOrientation');
creerHandlerReglageSimple('btn-modele-attestation-enregistrer', 'modele-attestation-input', 'retour-modele-attestation', 'modeleAttestationPaiement');

$('btn-api-key-generer').addEventListener('click', async () => {
  if($('api-key-affichee').value && !confirm('Regénérer la clé invalide immédiatement l\'ancienne — l\'outil externe devra être mis à jour. Continuer ?')) return;
  $('btn-api-key-generer').disabled = true;
  $('retour-api-key').innerHTML = '';
  try{
    const r = await poster({ action:'api-key-generer', password:motDePasse });
    if(r.ok){
      $('api-key-affichee').value = r.apiKeyLecture;
      $('btn-api-key-supprimer').hidden = false;
      $('retour-api-key').innerHTML = '<div class="msg msg-succes">Nouvelle clé générée — copie-la maintenant, elle ne sera plus réaffichée en clair ailleurs que dans les Réglages.</div>';
    }else{
      $('retour-api-key').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-api-key').innerHTML = '<div class="msg msg-erreur">Génération impossible.</div>';
  }
  $('btn-api-key-generer').disabled = false;
});

$('btn-api-key-supprimer').addEventListener('click', async () => {
  if(!confirm('Retirer la clé rend l\'API publique à nouveau accessible sans authentification. Continuer ?')) return;
  $('btn-api-key-supprimer').disabled = true;
  try{
    const r = await poster({ action:'api-key-supprimer', password:motDePasse });
    if(r.ok){
      $('api-key-affichee').value = '';
      $('btn-api-key-supprimer').hidden = true;
      $('retour-api-key').innerHTML = '<div class="msg msg-succes">Clé retirée — l\'API est de nouveau ouverte.</div>';
    }else{
      $('retour-api-key').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-api-key').innerHTML = '<div class="msg msg-erreur">Suppression impossible.</div>';
  }
  $('btn-api-key-supprimer').disabled = false;
});
creerHandlerReglageSimple('btn-modele-flotte-enregistrer', 'modele-flotte-input', 'retour-modele-flotte', 'modeleFlotteMateriel');

$('btn-date-souhaitee-enregistrer').addEventListener('click', async () => {
  const types = ['rn', 'esn', 'interne', 'autres'].filter(t => $('date-souhaitee-' + t).checked);
  $('btn-date-souhaitee-enregistrer').disabled = true;
  $('retour-date-souhaitee').innerHTML = '';
  try{
    const r = await poster({ action:'reglages-set', password:motDePasse, structuresDateSouhaitee: types.join(',') });
    if(r.ok){
      $('retour-date-souhaitee').innerHTML = '<div class="msg msg-succes">Enregistré.</div>';
      etat('Réglages enregistrés', 'succes');
    }else{
      $('retour-date-souhaitee').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-date-souhaitee').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  $('btn-date-souhaitee-enregistrer').disabled = false;
});
creerHandlerReglageSimple('btn-nettoyage-fichiers-enregistrer', 'nettoyage-fichiers-input', 'retour-nettoyage-fichiers', 'nettoyageFichiersJours');

$('btn-responsable-enregistrer').addEventListener('click', async () => {
  const nom = $('responsable-nom-input').value.trim();
  const telephone = $('responsable-telephone-input').value.trim();
  const email = $('responsable-email-input').value.trim();
  $('btn-responsable-enregistrer').disabled = true;
  $('retour-responsable').innerHTML = '';
  try{
    const r = await poster({
      action:'reglages-set', password:motDePasse,
      responsableNom: nom, responsableTelephone: telephone, responsableEmail: email
    });
    if(r.ok){
      $('retour-responsable').innerHTML = '<div class="msg msg-succes">Enregistré.</div>';
      etat('Réglages enregistrés', 'succes');
    }else{
      $('retour-responsable').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-responsable').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  $('btn-responsable-enregistrer').disabled = false;
});

$('btn-symptomes-sav-enregistrer').addEventListener('click', async () => {
  const liste = $('symptomes-sav-input').value.trim();
  if(!liste){
    $('retour-symptomes-sav').innerHTML = '<div class="msg msg-erreur">Il faut au moins un symptôme.</div>';
    return;
  }
  $('btn-symptomes-sav-enregistrer').disabled = true;
  $('retour-symptomes-sav').innerHTML = '';
  try{
    const r = await poster({ action:'reglages-set', password:motDePasse, symptomesSav: liste });
    if(r.ok){
      symptomesSav = liste.split('\n').map(s => s.trim()).filter(Boolean);
      $('retour-symptomes-sav').innerHTML = '<div class="msg msg-succes">Enregistré.</div>';
      etat('Réglages enregistrés', 'succes');
    }else{
      $('retour-symptomes-sav').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-symptomes-sav').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  $('btn-symptomes-sav-enregistrer').disabled = false;
});

$('btn-email-contact-sav-enregistrer').addEventListener('click', async () => {
  const email = $('email-contact-sav-input').value.trim();
  $('btn-email-contact-sav-enregistrer').disabled = true;
  $('retour-email-contact-sav').innerHTML = '';
  try{
    const r = await poster({ action:'reglages-set', password:motDePasse, emailContactSav: email });
    if(r.ok){
      $('retour-email-contact-sav').innerHTML = '<div class="msg msg-succes">Enregistré.</div>';
      etat('Réglages enregistrés', 'succes');
    }else{
      $('retour-email-contact-sav').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-email-contact-sav').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  $('btn-email-contact-sav-enregistrer').disabled = false;
});

$('btn-email-logistique-enregistrer').addEventListener('click', async () => {
  const email = $('email-logistique-input').value.trim();
  const memePersonne = $('meme-personne-logistique-input').checked;
  $('btn-email-logistique-enregistrer').disabled = true;
  $('retour-email-logistique').innerHTML = '';
  try{
    const r = await poster({ action:'reglages-set', password:motDePasse, emailLogistique: email, memePersonneLogistiqueDistribution: memePersonne });
    if(r.ok){
      memePersonneLogistiqueDistribution = memePersonne;
      $('retour-email-logistique').innerHTML = '<div class="msg msg-succes">Enregistré.</div>';
      etat('Réglages enregistrés', 'succes');
    }else{
      $('retour-email-logistique').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-email-logistique').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  $('btn-email-logistique-enregistrer').disabled = false;
});

$('btn-email-modele-sav-enregistrer').addEventListener('click', async () => {
  const modele = $('email-modele-sav-input').value;
  if(!modele.trim()){
    $('retour-email-modele-sav').innerHTML = '<div class="msg msg-erreur">Le modèle ne peut pas être vide.</div>';
    return;
  }
  $('btn-email-modele-sav-enregistrer').disabled = true;
  $('retour-email-modele-sav').innerHTML = '';
  try{
    const r = await poster({ action:'reglages-set', password:motDePasse, emailModeleSav: modele });
    if(r.ok){
      $('retour-email-modele-sav').innerHTML = '<div class="msg msg-succes">Enregistré.</div>';
      etat('Réglages enregistrés', 'succes');
    }else{
      $('retour-email-modele-sav').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-email-modele-sav').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  $('btn-email-modele-sav-enregistrer').disabled = false;
});

/* ══════════════ Interface : onglets visibles/masqués ══════════════ */
const ONGLETS_CONFIGURABLES = [
  { vue: 'commandes', libelle: 'Commandes' },
  { vue: 'structures', libelle: 'Structures' },
  { vue: 'produits', libelle: 'Stock' },
  { vue: 'devis', libelle: 'Devis' },
  { vue: 'factures', libelle: 'Factures' },
  { vue: 'sav', libelle: 'SAV' },
  { vue: 'comptabilite', libelle: 'Comptabilité' },
  { vue: 'bilan', libelle: 'Statistiques' }
];

function peuplerCasesOngletsVisibles(masquesStr){
  const masques = masquesStr.split(',').map(s => s.trim()).filter(Boolean);
  $('cases-onglets-visibles').innerHTML = ONGLETS_CONFIGURABLES.map(o => `
    <label style="display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:500">
      <input type="checkbox" data-onglet-vue="${o.vue}" ${masques.includes(o.vue) ? '' : 'checked'}>
      ${echapper(o.libelle)}
    </label>`).join('');
}

/** Applique la visibilité sur la navigation elle-même (Réglages reste toujours visible). */
function appliquerOngletsVisibles(masquesStr){
  const masques = masquesStr.split(',').map(s => s.trim()).filter(Boolean);
  document.querySelectorAll('.onglets button').forEach(b => {
    if(b.dataset.vue === 'reglages') return; // jamais masquable
    b.hidden = masques.includes(b.dataset.vue);
  });
  // Si l'onglet actuellement affiché vient d'être masqué, on bascule sur Commandes par défaut
  const ongletActif = document.querySelector('.onglets button.actif');
  if(ongletActif && ongletActif.hidden){
    const premierVisible = document.querySelector('.onglets button:not([hidden])');
    if(premierVisible) premierVisible.click();
  }
}

$('btn-onglets-visibles-enregistrer').addEventListener('click', async () => {
  const cases = $$('#cases-onglets-visibles input[type=checkbox]');
  const masques = cases.filter(c => !c.checked).map(c => c.dataset.ongletVue).join(',');
  $('btn-onglets-visibles-enregistrer').disabled = true;
  $('retour-onglets-visibles').innerHTML = '';
  try{
    const r = await poster({ action:'reglages-set', password:motDePasse, ongletsMasques: masques });
    if(r.ok){
      appliquerOngletsVisibles(masques);
      $('retour-onglets-visibles').innerHTML = '<div class="msg msg-succes">Enregistré.</div>';
      etat('Réglages enregistrés', 'succes');
    }else{
      $('retour-onglets-visibles').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-onglets-visibles').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  $('btn-onglets-visibles-enregistrer').disabled = false;
});

$('btn-role-vue-preferee-enregistrer').addEventListener('click', () => {
  try{
    localStorage.setItem('cvdl-role-vue-preferee', $('role-vue-preferee-input').value);
    localStorage.setItem('cvdl-role-choisi', 'true');
    $('retour-role-vue-preferee').innerHTML = '<div class="msg msg-succes">Enregistré — actif dès ta prochaine connexion.</div>';
  }catch(e){
    $('retour-role-vue-preferee').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible sur ce navigateur.</div>';
  }
});
$('btn-nom-organisation-enregistrer').addEventListener('click', async () => {
  const valeur = $('nom-organisation-input').value.trim();
  $('btn-nom-organisation-enregistrer').disabled = true;
  $('retour-nom-organisation').innerHTML = '';
  try{
    const r = await poster({action:'reglages-set', password:motDePasse, nomOrganisation: valeur});
    if(r.ok){
      $('retour-nom-organisation').innerHTML = '<div class="msg msg-succes">Enregistré.</div>';
      etat('Réglages enregistrés', 'succes');
      appliquerNomOrganisation(valeur);
    }else{
      $('retour-nom-organisation').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-nom-organisation').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  $('btn-nom-organisation-enregistrer').disabled = false;
});

let rappelBasculeDejaVuCetteSession = false;

function rendreListeArchives(archives){
  if(!archives.length){ $('liste-archives').innerHTML = ''; return; }
  $('liste-archives').innerHTML = '<p class="reglage-texte" style="margin-bottom:6px"><strong>Archives :</strong></p>'
    + archives.map(a => `<div style="font-size:13px;margin-bottom:4px"><a href="${echapper(a.url)}" target="_blank" rel="noopener">📁 ${echapper(a.annee)}</a></div>`).join('');
}

$('bascule-annuelle-input').addEventListener('change', async e => {
  const valeur = e.target.checked;
  e.target.disabled = true;
  $('retour-bascule-annuelle').innerHTML = '';
  try{
    const r = await poster({action:'reglages-set', password:motDePasse, basculeAnnuelleActivee: valeur});
    if(r.ok){
      $('retour-bascule-annuelle').innerHTML = '<div class="msg msg-succes">Enregistré.</div>';
      etat('Réglages enregistrés', 'succes');
    }else{
      e.target.checked = !valeur;
      $('retour-bascule-annuelle').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(err){
    e.target.checked = !valeur;
    $('retour-bascule-annuelle').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  e.target.disabled = false;
});

$('enquetes-satisfaction-input').addEventListener('change', async e => {
  const valeur = e.target.checked;
  e.target.disabled = true;
  $('retour-enquetes-satisfaction').innerHTML = '';
  try{
    const r = await poster({action:'reglages-set', password:motDePasse, enquetesSatisfactionActivees: valeur});
    if(r.ok){
      $('retour-enquetes-satisfaction').innerHTML = '<div class="msg msg-succes">Enregistré.</div>';
      etat('Réglages enregistrés', 'succes');
    }else{
      e.target.checked = !valeur;
      $('retour-enquetes-satisfaction').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(err){
    e.target.checked = !valeur;
    $('retour-enquetes-satisfaction').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  e.target.disabled = false;
});

$('btn-bascule-date-enregistrer').addEventListener('click', async () => {
  const jour = parseInt($('bascule-jour-input').value, 10);
  const mois = parseInt($('bascule-mois-input').value, 10);
  if(!jour || jour < 1 || jour > 31){
    $('retour-bascule-date').innerHTML = '<div class="msg msg-erreur">Jour invalide.</div>';
    return;
  }
  $('btn-bascule-date-enregistrer').disabled = true;
  $('retour-bascule-date').innerHTML = '';
  try{
    const r = await poster({action:'reglages-set', password:motDePasse, basculeDateJour: jour, basculeDateMois: mois});
    $('retour-bascule-date').innerHTML = r.ok
      ? '<div class="msg msg-succes">Enregistré.</div>'
      : `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    if(r.ok) etat('Réglages enregistrés', 'succes');
  }catch(e){
    $('retour-bascule-date').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  $('btn-bascule-date-enregistrer').disabled = false;
});

$('btn-basculer-maintenant').addEventListener('click', async () => {
  const lien = $('bascule-lien-input').value.trim();
  if(!lien){
    $('retour-basculer').innerHTML = '<div class="msg msg-erreur">Colle d\'abord le lien de ton nouveau classeur.</div>';
    return;
  }
  if(!confirm('Confirmer la bascule ? Le classeur actuel sera archivé et ce nouveau classeur deviendra actif pour les commandes, factures, devis et SAV.')) return;
  $('btn-basculer-maintenant').disabled = true;
  $('retour-basculer').innerHTML = '<div class="msg msg-info">Bascule en cours…</div>';
  try{
    const r = await poster({action:'basculer-classeur', password:motDePasse, lienNouveauClasseur: lien});
    if(r.ok){
      $('retour-basculer').innerHTML = '<div class="msg msg-succes">Bascule effectuée — l\'ancien classeur est archivé, le nouveau est actif.</div>';
      etat('Bascule effectuée', 'succes');
      $('bascule-lien-input').value = '';
      $('modale-rappel-bascule').hidden = true;
      await chargerReglages();
    }else{
      $('retour-basculer').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-basculer').innerHTML = '<div class="msg msg-erreur">Bascule impossible — réessaie.</div>';
  }
  $('btn-basculer-maintenant').disabled = false;
});

$('btn-rappel-bascule-plus-tard').addEventListener('click', () => $('modale-rappel-bascule').hidden = true);
$('btn-rappel-bascule-aller').addEventListener('click', () => {
  $('modale-rappel-bascule').hidden = true;
  document.querySelector('[data-vue="reglages"]').click();
  setTimeout(() => $('bascule-lien-input')?.scrollIntoView({behavior:'smooth', block:'center'}), 100);
});

$('suppression-simple-input').addEventListener('change', async e => {
  const valeur = e.target.checked;
  e.target.disabled = true;
  $('retour-suppression-simple').innerHTML = '';
  try{
    const r = await poster({action:'reglages-set', password:motDePasse, suppressionSimple: valeur});
    if(r.ok){
      suppressionSimple = valeur;
      $('retour-suppression-simple').innerHTML = '<div class="msg msg-succes">Enregistré.</div>';
      etat('Réglages enregistrés', 'succes');
    }else{
      e.target.checked = !valeur;
      $('retour-suppression-simple').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e2){
    e.target.checked = !valeur;
    $('retour-suppression-simple').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  e.target.disabled = false;
});

$('btn-email-admin-enregistrer').addEventListener('click', async () => {
  const valeur = $('email-admin-input').value.trim();
  $('btn-email-admin-enregistrer').disabled = true;
  $('retour-email-admin').innerHTML = '';
  try{
    const r = await poster({action:'reglages-set', password:motDePasse, emailAdmin: valeur});
    $('retour-email-admin').innerHTML = r.ok
      ? '<div class="msg msg-succes">Enregistré.</div>'
      : `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    if(r.ok) etat('Réglages enregistrés', 'succes');
  }catch(e){
    $('retour-email-admin').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  $('btn-email-admin-enregistrer').disabled = false;
});

$('btn-mdp-enregistrer').addEventListener('click', async () => {
  const nouveauAdmin = $('nouveau-mdp-admin-input').value.trim();
  const nouveauCompta = $('nouveau-mdp-compta-input').value.trim();

  if(!nouveauAdmin && !nouveauCompta){
    $('retour-mdp').innerHTML = '<div class="msg msg-erreur">Renseigne au moins un des deux champs.</div>';
    return;
  }
  if((nouveauAdmin && nouveauAdmin.length < 6) || (nouveauCompta && nouveauCompta.length < 6)){
    $('retour-mdp').innerHTML = '<div class="msg msg-erreur">Chaque mot de passe doit faire au moins 6 caractères.</div>';
    return;
  }

  $('btn-mdp-enregistrer').disabled = true;
  $('retour-mdp').innerHTML = '';
  try{
    const r = await poster({
      action:'reglages-set', password:motDePasse,
      nouveauMotDePasseAdmin: nouveauAdmin || undefined,
      nouveauMotDePasseCompta: nouveauCompta || undefined
    });
    if(r.ok){
      $('retour-mdp').innerHTML = '<div class="msg msg-succes">Enregistré. Reconnecte-toi avec le nouveau mot de passe si tu l\'as changé.</div>';
      etat('Réglages enregistrés', 'succes');
      $('nouveau-mdp-admin-input').value = '';
      $('nouveau-mdp-compta-input').value = '';
    }else{
      $('retour-mdp').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-mdp').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  $('btn-mdp-enregistrer').disabled = false;
});

function rendreDevis(){
  const banniereHistorique = $('bandeau-pagination-devis');
  if(!rechercheDevisActive && limiteDevisActuelle > 0 && totalDevis > limiteDevisActuelle){
    const pageActuelle = Math.floor(decalageDevisActuel / limiteDevisActuelle) + 1;
    const nbPages = Math.ceil(totalDevis / limiteDevisActuelle);
    $('texte-pagination-devis').textContent = `Page ${pageActuelle} sur ${nbPages} (${totalDevis} devis au total)`;
    $('btn-page-precedente-devis').disabled = decalageDevisActuel === 0;
    $('btn-page-suivante-devis').disabled = decalageDevisActuel + limiteDevisActuelle >= totalDevis;
    banniereHistorique.hidden = false;
  }else{
    banniereHistorique.hidden = true;
  }

  const visibles = devis;

  if(!visibles.length){
    $('liste-devis').innerHTML = `<div class="vide">
      <strong>Aucun devis</strong>
      Un devis se génère automatiquement dès qu'une commande passe au statut « Validée », ou crée-en un librement avec le bouton ci-dessus.
    </div>`;
    return;
  }

  $('liste-devis').innerHTML = visibles.map(d => {
    const modifiable = d.statut !== 'Converti' && d.statut !== 'Annulé';
    return `
    <article class="facture ${d.statut === 'Annulé' ? 'devis-annule' : ''}">
      <div>
        <div class="ref">${echapper(d.referenceDevis)}</div>
        <div class="date">${echapper(d.date)}</div>
      </div>
      <div>
        <div class="nom">${echapper(d.nomStructure)}</div>
        <div class="coords">${echapper(d.email)}<br>${echapper(d.adresse)}</div>
      </div>
      <div>
        ${modifiable
          ? `<input type="text" class="edit-ligne" data-devis-edit="${d.ligne}" data-champ="produit" value="${echapper(d.produit)}">`
          : `<div class="materiel">${echapper(d.produit)}</div>`}
        <div class="moyen">
          ${modifiable ? `<select class="edit-ligne mini" data-devis-edit="${d.ligne}" data-champ="quantite">
            ${[1,2,3,4,5].map(n => `<option value="${n}"${n === parseInt(d.quantite,10) ? ' selected' : ''}>${n}</option>`).join('')}
          </select>` : (d.quantite + '×')}
          ${d.referenceCommande ? ' — commande ' + echapper(d.referenceCommande) : ' — devis libre'}
        </div>
      </div>
      <div>
        <div class="montant-total" id="montant-devis-${d.ligne}">${formaterMontant(d.montantTotal)}</div>
        ${modifiable
          ? `<input type="number" class="edit-ligne mini" data-devis-edit="${d.ligne}" data-champ="prixUnitaire" value="${d.prixUnitaire}" step="0.01" min="0">`
          : `<div class="sous">${formaterMontant(d.prixUnitaire)} / unité</div>`}
      </div>
      <div class="pilotage" style="min-width:170px">
        ${d.statut === 'Converti'
          ? `<span class="pill-convertie">Converti → ${echapper(d.referenceFacture)}</span>`
          : d.statut === 'Annulé'
            ? `<span class="pill-annulee">Devis annulé</span>`
            : `<button type="button" class="action claire btn-convertir" data-devis-ligne="${d.ligne}" data-devis-ref="${echapper(d.referenceDevis)}">Convertir en facture</button>
               <button type="button" class="action claire" data-devis-annuler="${d.ligne}" data-devis-nom-annuler="${echapper(d.referenceDevis)}">Annuler le devis</button>`}
        <a class="action claire" href="${modeleFacturationUrl}" target="_blank" rel="noopener">Ouvrir le modèle</a>
        <button type="button" class="action" data-generer-pdf-devis="${d.ligne}">📝 Remplir le modèle</button>
        <div id="retour-pdf-devis-${d.ligne}"></div>
        <div class="ligne-actions-icones" style="justify-self:start;margin-top:4px">
          ${modifiable ? `<button type="button" class="btn-icone-fiche" data-devis-modifier="${d.ligne}" title="Modifier (les champs sont éditables directement)" aria-label="Modifier">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l11-11-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>
          </button>` : ''}
          <button type="button" class="btn-icone-fiche danger" data-devis-supprimer="${d.ligne}" data-devis-nom="${echapper(d.referenceDevis)}" title="Supprimer le devis" aria-label="Supprimer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7m2 0v13a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 20V7h10z"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      </div>
    </article>`;
  }).join('');
}

$('liste-devis').addEventListener('change', async e => {
  const el = e.target;
  if(!el.matches('[data-devis-edit]')) return;
  const ligne = parseInt(el.dataset.devisEdit, 10);
  el.disabled = true;
  try{
    const r = await poster({ action:'devis-update', ligne, champ: el.dataset.champ, valeur: el.value });
    if(r.ok){
      if(typeof r.montant === 'number'){
        const cible = document.getElementById('montant-devis-' + ligne);
        if(cible) cible.textContent = formaterMontant(r.montant);
      }
      etat('Enregistré', 'succes');
    }else{
      etat(r.erreur || 'Enregistrement impossible', 'erreur');
    }
  }catch(err){ etat('Enregistrement impossible', 'erreur'); }
  el.disabled = false;
});

/* Modale : nouveau devis */
$('btn-nouveau-devis').addEventListener('click', () => {
  $('dv-code').value = '';
  $('dv-commande').value = '';
  $('dv-quantite').value = 1;
  $('retour-devis').innerHTML = '';
  $('dv-produit').innerHTML = produits.map(p =>
    `<option value="${echapper(p.nom)}">${echapper(p.nom)} — stock : ${p.stock}</option>`).join('');
  $('modale-devis').hidden = false;
  setTimeout(() => $('dv-code').focus(), 50);
});
$('dv-annuler').addEventListener('click', () => $('modale-devis').hidden = true);

const PROBLEMES_EFFECTIFS_SAV = [
  'Écran', 'RAM', 'Batterie', 'Chargeur', 'Carte mère', 'Pile CMOS', 'Disque Dur', 'Clavier',
  'Faux positif', 'Problème d\'utilisation', 'Hors-garantie', 'Ventilateur', 'Haut-parleur',
  'Système d\'exploitation', 'BIOS'
];

$('btn-nouveau-sav').addEventListener('click', () => {
  $('sav-nom').value = '';
  $('sav-code').value = '';
  $('sav-numero-serie').value = '';
  $('sav-commande').value = '';
  $('sav-facture').value = '';
  $('sav-commentaire').value = '';
  $('sav-marque').value = '';
  $('sav-modele').value = '';
  $('sav-systeme').value = '';
  $('sav-symptome').innerHTML = symptomesSav.map(s => `<option value="${echapper(s)}">${echapper(s)}</option>`).join('');
  $('sav-statut').innerHTML = statutsSav.map(s => `<option value="${echapper(s.statut)}">${echapper(s.statut)}</option>`).join('');
  $('retour-sav').innerHTML = '';
  $('modale-sav').hidden = false;
  setTimeout(() => $('sav-nom').focus(), 50);
});
$('sav-annuler').addEventListener('click', () => $('modale-sav').hidden = true);

$('sav-enregistrer').addEventListener('click', async () => {
  const donnees = {
    action: 'sav-create-manuelle',
    nom: $('sav-nom').value.trim(),
    code: $('sav-code').value.trim(),
    numeroSerie: $('sav-numero-serie').value.trim(),
    referenceCommande: $('sav-commande').value.trim(),
    referenceFacture: $('sav-facture').value.trim(),
    symptome: $('sav-symptome').value,
    commentaire: $('sav-commentaire').value.trim(),
    marque: $('sav-marque').value.trim(),
    modele: $('sav-modele').value.trim(),
    systeme: $('sav-systeme').value.trim(),
    statut: $('sav-statut').value
  };
  if(!donnees.nom){
    $('retour-sav').innerHTML = '<div class="msg msg-erreur">Le nom (structure ou personne) est obligatoire.</div>';
    return;
  }
  $('sav-enregistrer').disabled = true;
  $('retour-sav').innerHTML = '';
  try{
    const r = await poster(donnees);
    if(r.ok){
      $('modale-sav').hidden = true;
      await chargerSav();
      etat('Ticket ' + r.reference + ' créé', 'succes');
    }else{
      $('retour-sav').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-sav').innerHTML = '<div class="msg msg-erreur">Création impossible.</div>';
  }
  $('sav-enregistrer').disabled = false;
});

$('dv-enregistrer').addEventListener('click', async () => {
  const donnees = {
    action: 'devis-create',
    code: $('dv-code').value.trim(),
    referenceCommande: $('dv-commande').value.trim(),
    produit: $('dv-produit').value,
    quantite: $('dv-quantite').value,
    moyenPaiement: $('dv-paiement').value
  };
  if(!donnees.code){
    $('retour-devis').innerHTML = '<div class="msg msg-erreur">Le code de la structure est obligatoire.</div>';
    return;
  }
  if(!donnees.referenceCommande){
    $('retour-devis').innerHTML = '<div class="msg msg-erreur">La référence de la commande rattachée est obligatoire.</div>';
    return;
  }
  $('dv-enregistrer').disabled = true;
  $('retour-devis').innerHTML = '';
  try{
    const r = await poster(donnees);
    if(r.ok){
      $('modale-devis').hidden = true;
      await chargerDevis();
      if(donnees.referenceCommande) await recharger(); // la commande liée peut avoir changé (badge "devis demandé")
      etat('Devis ' + r.referenceDevis + ' créé', 'succes');
    }else{
      $('retour-devis').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-devis').innerHTML = '<div class="msg msg-erreur">Création impossible.</div>';
  }
  $('dv-enregistrer').disabled = false;
});

/* Modale : conversion en facture */
let devisLigneAConvertir = null;

$('liste-devis').addEventListener('click', async e => {
  const bConv = e.target.closest('[data-devis-ligne]');
  if(bConv){
    devisLigneAConvertir = parseInt(bConv.dataset.devisLigne, 10);
    $('cv-numero').value = '';
    $('retour-conversion').innerHTML = '';
    $('modale-conversion').hidden = false;
    setTimeout(() => $('cv-numero').focus(), 50);
    return;
  }
  const bSup = e.target.closest('[data-devis-supprimer]');
  if(bSup){
    demanderSuppression(`le devis ${bSup.dataset.devisNom}`, 'devis-delete', parseInt(bSup.dataset.devisSupprimer, 10), chargerDevis);
    return;
  }
  const bAnnuler = e.target.closest('[data-devis-annuler]');
  if(bAnnuler){
    if(!confirm(`Annuler le devis ${bAnnuler.dataset.devisNomAnnuler} ? Il restera visible (marqué "Annulé"), sa référence ne sera jamais réutilisée.`)) return;
    const ligne = parseInt(bAnnuler.dataset.devisAnnuler, 10);
    bAnnuler.disabled = true;
    poster({ action:'devis-update', ligne, champ:'statut', valeur:'Annulé' })
      .then(async r => {
        if(r.ok){ await chargerDevis(); etat('Devis annulé', 'succes'); }
        else{ etat(r.erreur || 'Annulation impossible', 'erreur'); bAnnuler.disabled = false; }
      })
      .catch(() => { etat('Annulation impossible', 'erreur'); bAnnuler.disabled = false; });
    return;
  }
  const bMod = e.target.closest('[data-devis-modifier]');
  if(bMod){
    const champ = bMod.closest('article').querySelector('[data-devis-edit][data-champ="produit"]');
    if(champ){ champ.focus(); champ.select(); }
    return;
  }
  const bPdf = e.target.closest('[data-generer-pdf-devis]');
  if(bPdf){
    const ligne = parseInt(bPdf.dataset.genererPdfDevis, 10);
    const zoneRetour = $('retour-pdf-devis-' + ligne);
    bPdf.disabled = true;
    bPdf.innerHTML = '<span class="spinner-etat-sombre"></span><span>Remplissage…</span>';
    zoneRetour.innerHTML = '';
    try{
      const r = await poster({action:'devis-generer-pdf', password:motDePasse, ligne});
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
$('cv-annuler').addEventListener('click', () => $('modale-conversion').hidden = true);

$('cv-confirmer').addEventListener('click', async () => {
  const numeroFacture = $('cv-numero').value.trim();
  if(!numeroFacture){
    $('retour-conversion').innerHTML = '<div class="msg msg-erreur">Le numéro de facture est obligatoire.</div>';
    return;
  }
  $('cv-confirmer').disabled = true;
  try{
    const r = await poster({ action:'devis-convert', ligne: devisLigneAConvertir, numeroFacture });
    if(r.ok){
      $('modale-conversion').hidden = true;
      await chargerDevis();
      await chargerFactures();
      await recharger(); // pour que la commande liée arrête de proposer "Facturer directement"
      etat('Facture ' + r.referenceFacture + ' créée', 'succes');
    }else{
      $('retour-conversion').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-conversion').innerHTML = '<div class="msg msg-erreur">Conversion impossible.</div>';
  }
  $('cv-confirmer').disabled = false;
});

