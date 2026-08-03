/**
 * CVDL — Backend commandes matériel (source : Config.gs, 1 sur 8)
 *
 * Ce fichier fait partie des sources du backend, réparties dans backend/*.gs :
 * Config, Routeur, Structures, Produits, Commandes, Devis, Sav, Facturation.
 *
 * ⚠️ NE PAS COLLER CE FICHIER SEUL DANS APPS SCRIPT.
 * Le fichier à coller est apps-script.gs, à la racine — généré automatiquement à
 * partir de ces 8 fichiers par `python3 outils/generer-backend.py`. Ce même script
 * régénère aussi la copie intégrée dans admin.html (bouton "Copier le code" de
 * l'installateur). Après toute modification ici, relance ce script avant de livrer.
 *
 * ─────────────────────────────────────────────
 * À CONFIGURER (les 3 lignes ci-dessous)
 * ─────────────────────────────────────────────
 */

/**
 * ─────────────────────────────────────────────
 * Configuration
 * ─────────────────────────────────────────────
 * Ces valeurs peuvent être définies ici en dur (avant le tout premier déploiement),
 * ou réglées ensuite depuis l'installateur intégré (back-office → première connexion),
 * qui les stocke dans PropertiesService. Une valeur en base prime toujours sur celle codée ici.
 */

const CLES_CONFIG = {
  ADMIN_PASSWORD:  'CONFIG_ADMIN_PASSWORD',
  COMPTA_PASSWORD: 'CONFIG_COMPTA_PASSWORD',
  ADMIN_EMAIL:     'CONFIG_ADMIN_EMAIL',
  DOSSIER_PRINCIPAL: 'CONFIG_DOSSIER_PRINCIPAL',
  SEUIL_ALERTE_IMPAYEE: 'CONFIG_SEUIL_ALERTE_IMPAYEE',
  NOM_ORGANISATION: 'CONFIG_NOM_ORGANISATION',
  SUPPRESSION_SIMPLE: 'CONFIG_SUPPRESSION_SIMPLE',
  FICHIER_NUMEROTATION: 'CONFIG_FICHIER_NUMEROTATION',
  ONGLET_NUMEROTATION: 'CONFIG_ONGLET_NUMEROTATION',
  RESPONSABLE_NOM: 'CONFIG_RESPONSABLE_NOM',
  RESPONSABLE_TELEPHONE: 'CONFIG_RESPONSABLE_TELEPHONE',
  RESPONSABLE_EMAIL: 'CONFIG_RESPONSABLE_EMAIL',
  MODELE_FACTURATION: 'CONFIG_MODELE_FACTURATION',
  MODELE_BON_LIVRAISON: 'CONFIG_MODELE_BON_LIVRAISON',
  MODELE_BON_ORIENTATION: 'CONFIG_MODELE_BON_ORIENTATION',
  MODELE_ATTESTATION_PAIEMENT: 'CONFIG_MODELE_ATTESTATION_PAIEMENT',
  MODELE_FLOTTE_MATERIEL: 'CONFIG_MODELE_FLOTTE_MATERIEL',
  NETTOYAGE_FICHIERS_JOURS: 'CONFIG_NETTOYAGE_FICHIERS_JOURS',
  ENQUETES_SATISFACTION_ACTIVEES: 'CONFIG_ENQUETES_SATISFACTION_ACTIVEES',
  BASCULE_ANNUELLE_ACTIVEE: 'CONFIG_BASCULE_ANNUELLE_ACTIVEE',
  BASCULE_DATE_JOUR: 'CONFIG_BASCULE_DATE_JOUR',
  BASCULE_DATE_MOIS: 'CONFIG_BASCULE_DATE_MOIS',
  RAPPEL_BASCULE_MAIL_ENVOYE_ANNEE: 'CONFIG_RAPPEL_BASCULE_MAIL_ENVOYE_ANNEE',
  CLASSEUR_ACTIF_ID: 'CONFIG_CLASSEUR_ACTIF_ID',
  DERNIERE_BASCULE: 'CONFIG_DERNIERE_BASCULE',
  ARCHIVES_CLASSEURS: 'CONFIG_ARCHIVES_CLASSEURS',
  QUANTITE_MAX_DEFAUT: 'CONFIG_QUANTITE_MAX_DEFAUT',
  QUANTITE_MAX_DEFAUT_ESN: 'CONFIG_QUANTITE_MAX_DEFAUT_ESN',
  BADGE_NOUVELLE_JOURS: 'CONFIG_BADGE_NOUVELLE_JOURS',
  BADGE_NOUVELLE_SAV_JOURS: 'CONFIG_BADGE_NOUVELLE_SAV_JOURS',
  HEURE_FIN_VENDREDI: 'CONFIG_HEURE_FIN_VENDREDI',
  HEURE_DEBUT_LUNDI: 'CONFIG_HEURE_DEBUT_LUNDI',
  SYMPTOMES_SAV: 'CONFIG_SYMPTOMES_SAV',
  EMAIL_CONTACT_SAV: 'CONFIG_EMAIL_CONTACT_SAV',
  EMAIL_MODELE_SAV: 'CONFIG_EMAIL_MODELE_SAV',
  ONGLETS_MASQUES: 'CONFIG_ONGLETS_MASQUES',
  EMAIL_LOGISTIQUE: 'CONFIG_EMAIL_LOGISTIQUE'
};

/** Lit une valeur de config : PropertiesService en priorité, sinon la valeur par défaut codée en dur. */
/** Toutes les propriétés du script, lues en un seul appel réseau et mises en cache pour
 *  le reste de cette exécution — plutôt que 13 appels séparés à chaque obtenirConfig().
 *  Chaque exécution du script repart de zéro (_proprietesCache redevient null), donc pas
 *  de risque de lire une valeur périmée d'une exécution précédente. */
let _proprietesCache = null;
function toutesLesProprietes() {
  if (_proprietesCache === null) {
    _proprietesCache = PropertiesService.getScriptProperties().getProperties();
  }
  return _proprietesCache;
}

/** Échappement HTML minimal pour les pages de confirmation générées par doGet (lien de
 *  paiement, validation logistique) — jamais de contenu utilisateur non échappé dans du HTML. */
function echapperHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function obtenirConfig(nom, valeurParDefaut) {
  const valeur = toutesLesProprietes()[CLES_CONFIG[nom]];
  return (valeur === undefined || valeur === null || valeur === '') ? valeurParDefaut : valeur;
}

/** Écrit une valeur de config dans PropertiesService. Une chaîne vide efface le réglage (retombe sur le défaut). */
function definirConfig(nom, valeur) {
  const props = PropertiesService.getScriptProperties();
  const cle = CLES_CONFIG[nom];
  if (!cle) return;
  if (valeur === '' || valeur === null || valeur === undefined) {
    props.deleteProperty(cle);
    if (_proprietesCache !== null) delete _proprietesCache[cle];
  } else {
    props.setProperty(cle, String(valeur));
    if (_proprietesCache !== null) _proprietesCache[cle] = String(valeur);
  }
}

/** true si aucun mot de passe admin n'a jamais été réglé ET que la valeur par défaut d'usine est toujours active
 *  — sert à savoir si l'installateur doit s'afficher au lieu de l'écran de connexion classique. */
function installationTerminee() {
  const valeurEnBase = PropertiesService.getScriptProperties().getProperty(CLES_CONFIG.ADMIN_PASSWORD);
  return valeurEnBase !== null && valeurEnBase !== '';
}

/** Écrit la configuration initiale depuis l'installateur.
 *  - Première installation (aucun mot de passe jamais enregistré) : rien à vérifier, on écrit directement.
 *  - Installation déjà faite : exige le vrai mot de passe actuellement actif, pour empêcher
 *    quiconque de rappeler cette route au hasard une fois le site en place. */
function configurerInstallation(data) {
  if (installationTerminee() && data.motDePasseActuel !== ADMIN_PASSWORD) {
    return { ok: false, erreur: 'Mot de passe actuel incorrect' };
  }
  if (data.nouveauMotDePasseAdmin) {
    if (String(data.nouveauMotDePasseAdmin).length < 6) {
      return { ok: false, erreur: 'Le mot de passe admin doit faire au moins 6 caractères' };
    }
    definirConfig('ADMIN_PASSWORD', data.nouveauMotDePasseAdmin);
  }
  if (data.nouveauMotDePasseCompta !== undefined) {
    definirConfig('COMPTA_PASSWORD', data.nouveauMotDePasseCompta);
  }
  if (data.nouvelEmailAdmin !== undefined) {
    definirConfig('ADMIN_EMAIL', data.nouvelEmailAdmin);
  }
  if (data.nouveauDossierDrive !== undefined) {
    const id = extraireIdDossierDrive(data.nouveauDossierDrive);
    if (id) {
      try { DriveApp.getFolderById(id); }
      catch (e) { return { ok: false, erreur: 'Ce dossier Drive est introuvable ou inaccessible avec ce compte Google' }; }
    }
    definirConfig('DOSSIER_PRINCIPAL', id);
  }
  return { ok: true };
}

const ADMIN_PASSWORD  = obtenirConfig('ADMIN_PASSWORD', 'change-moi-tout-de-suite');  // mot de passe du back-office
const COMPTA_PASSWORD = obtenirConfig('COMPTA_PASSWORD', 'change-moi-aussi');          // mot de passe de la vue comptabilité (lecture + statut/dépôt uniquement)
const ADMIN_EMAIL     = obtenirConfig('ADMIN_EMAIL', '');                          // ton email pour la notif à chaque commande (vide = pas d'email)
const DOSSIER_PRINCIPAL = obtenirConfig('DOSSIER_PRINCIPAL', ''); // seul dossier Drive à configurer — tous les sous-dossiers (Factures, Devis, Bons de livraison...) sont créés automatiquement dedans
const SEUIL_ALERTE_IMPAYEE = parseInt(obtenirConfig('SEUIL_ALERTE_IMPAYEE', '30'), 10) || 30; // jours après livraison avant d'afficher l'alerte impayée
const NOM_ORGANISATION = obtenirConfig('NOM_ORGANISATION', '');                       // ex. "Mairie de Paris" — affiché dans l'en-tête du back-office
const SUPPRESSION_SIMPLE = obtenirConfig('SUPPRESSION_SIMPLE', '') === '1';            // true = une seule confirmation au lieu de deux
const FICHIER_NUMEROTATION = obtenirConfig('FICHIER_NUMEROTATION', '');                // classeur externe de numérotation officielle des factures
const ONGLET_NUMEROTATION = obtenirConfig('ONGLET_NUMEROTATION', '');                  // nom de l'onglet à l'intérieur de ce classeur (souvent l'année en cours)
const RESPONSABLE_NOM = obtenirConfig('RESPONSABLE_NOM', '');                          // affiché sur les factures PDF générées
const RESPONSABLE_TELEPHONE = obtenirConfig('RESPONSABLE_TELEPHONE', '');
const RESPONSABLE_EMAIL = obtenirConfig('RESPONSABLE_EMAIL', '');
const EMAIL_MODELE_SAV_DEFAUT = `Bonjour {{NOM}},

Voici le suivi de votre colis pour le ticket SAV {{REFERENCE}} :

{{COLISSIMO}}

Cordialement,
{{ORGANISATION}}`;
const EMAIL_MODELE_SAV = obtenirConfig('EMAIL_MODELE_SAV', EMAIL_MODELE_SAV_DEFAUT);
const ONGLETS_MASQUES = obtenirConfig('ONGLETS_MASQUES', '');
const MODELE_FACTURATION = obtenirConfig('MODELE_FACTURATION', '1buUwl_I6t2MXw96FWbXRVF8wLkVGZwZasM4xsDIqDGw'); // ID du Sheets modèle de facturation
const MODELE_BON_LIVRAISON = obtenirConfig('MODELE_BON_LIVRAISON', ''); // ID du Sheets modèle de bon de livraison
const MODELE_BON_ORIENTATION = obtenirConfig('MODELE_BON_ORIENTATION', ''); // ID du Sheets modèle de bon d'orientation
const MODELE_ATTESTATION_PAIEMENT = obtenirConfig('MODELE_ATTESTATION_PAIEMENT', ''); // ID du Sheets modèle d'attestation de paiement (par personne)
const MODELE_FLOTTE_MATERIEL = obtenirConfig('MODELE_FLOTTE_MATERIEL', ''); // ID du Sheets modèle que chaque structure copie dans son propre Drive
const NETTOYAGE_FICHIERS_JOURS = parseInt(obtenirConfig('NETTOYAGE_FICHIERS_JOURS', '0'), 10) || 0; // 0 = désactivé

/** Renvoie (en le créant si besoin) un sous-dossier nommé à l'intérieur du dossier Drive
 *  principal — tous les documents générés par l'outil (factures, devis, bons, attestations,
 *  CSV tec.tech) vivent chacun dans leur propre sous-dossier, sans qu'il y ait quoi que ce
 *  soit à configurer individuellement. Si aucun dossier principal n'est renseigné, repli sur
 *  la racine du Drive (comportement historique, avant la consolidation en un seul réglage).
 *  Mis en cache le temps d'une exécution : plusieurs appels au même nom ne refont pas la
 *  recherche Drive à chaque fois. */
const _sousDossiersCache = {};
function sousDossier(nom) {
  if (_sousDossiersCache[nom]) return _sousDossiersCache[nom];
  const racine = DOSSIER_PRINCIPAL ? DriveApp.getFolderById(DOSSIER_PRINCIPAL) : DriveApp.getRootFolder();
  const existants = racine.getFoldersByName(nom);
  const dossier = existants.hasNext() ? existants.next() : racine.createFolder(nom);
  _sousDossiersCache[nom] = dossier;
  return dossier;
}
const QUANTITE_MAX_DEFAUT = parseInt(obtenirConfig('QUANTITE_MAX_DEFAUT', '5'), 10) || 5; // par produit, sauf réglage propre au produit
const QUANTITE_MAX_DEFAUT_ESN = parseInt(obtenirConfig('QUANTITE_MAX_DEFAUT_ESN', '5'), 10) || 5; // idem, pour les structures ESN
const BADGE_NOUVELLE_JOURS = parseFloat(obtenirConfig('BADGE_NOUVELLE_JOURS', '1.5')) || 1.5; // en jours ouvrés
const BADGE_NOUVELLE_SAV_JOURS = parseFloat(obtenirConfig('BADGE_NOUVELLE_SAV_JOURS', '1.5')) || 1.5; // idem, réglable séparément pour le SAV
const HEURE_FIN_VENDREDI = parseInt(obtenirConfig('HEURE_FIN_VENDREDI', '17'), 10) || 17;
const HEURE_DEBUT_LUNDI = parseInt(obtenirConfig('HEURE_DEBUT_LUNDI', '8'), 10) || 8;
const EMAIL_CONTACT_SAV = obtenirConfig('EMAIL_CONTACT_SAV', '');
const EMAIL_LOGISTIQUE = obtenirConfig('EMAIL_LOGISTIQUE', ''); // reçoit le mail de validation Reçue → Validée avec le lien à cliquer
const MAX_QUANTITE    = 5;
const MAX_FICHIER_MO  = 8;   // Mo par fichier, vérifié aussi côté serveur
const LIMITE_SOUMISSIONS_PAR_HEURE = 5; // par code structure, protège en cas de fuite d'un code

/** Lit tous les réglages exposés dans l'onglet "Réglages" du back-office, en un seul appel. */
function obtenirReglages(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  return {
    ok: true,
    seuilAlerteImpayee: SEUIL_ALERTE_IMPAYEE,
    modeleDevis: obtenirModeleDevis(),
    modeleCommande: obtenirModeleCommande(),
    modeleSav: obtenirModeleSav(),
    emailAdmin: ADMIN_EMAIL,
    dossierPrincipal: DOSSIER_PRINCIPAL,
    nomOrganisation: NOM_ORGANISATION,
    suppressionSimple: SUPPRESSION_SIMPLE,
    fichierNumerotation: FICHIER_NUMEROTATION,
    ongletNumerotation: ONGLET_NUMEROTATION,
    responsableNom: RESPONSABLE_NOM,
    responsableTelephone: RESPONSABLE_TELEPHONE,
    responsableEmail: RESPONSABLE_EMAIL,
    modeleFacturation: MODELE_FACTURATION,
    modeleBonLivraison: MODELE_BON_LIVRAISON,
    modeleBonOrientation: MODELE_BON_ORIENTATION,
    modeleAttestationPaiement: MODELE_ATTESTATION_PAIEMENT,
    modeleFlotteMateriel: MODELE_FLOTTE_MATERIEL,
    nettoyageFichiersJours: NETTOYAGE_FICHIERS_JOURS,
    basculeAnnuelleActivee: obtenirConfig('BASCULE_ANNUELLE_ACTIVEE', '') === '1',
    enquetesSatisfactionActivees: obtenirConfig('ENQUETES_SATISFACTION_ACTIVEES', '') === '1',
    basculeDateJour: parseInt(obtenirConfig('BASCULE_DATE_JOUR', '1'), 10) || 1,
    basculeDateMois: parseInt(obtenirConfig('BASCULE_DATE_MOIS', '1'), 10) || 1,
    rappelBasculeDu: basculeEstDue(),
    classeurActifUrl: classeurActif().getUrl(),
    archives: listerArchives(),
    quantiteMaxDefaut: QUANTITE_MAX_DEFAUT,
    quantiteMaxDefautEsn: QUANTITE_MAX_DEFAUT_ESN,
    badgeNouvelleJours: BADGE_NOUVELLE_JOURS,
    badgeNouvelleSavJours: BADGE_NOUVELLE_SAV_JOURS,
    heureFinVendredi: HEURE_FIN_VENDREDI,
    heureDebutLundi: HEURE_DEBUT_LUNDI,
    symptomesSav: SYMPTOMES_SAV,
    emailContactSav: EMAIL_CONTACT_SAV,
    emailLogistique: EMAIL_LOGISTIQUE,
    emailModeleSav: EMAIL_MODELE_SAV,
    ongletsMasques: ONGLETS_MASQUES
  };
}

/** Nom de l'organisation, lisible sans mot de passe : sert à afficher le bon nom sur
 *  l'écran de connexion lui-même, avant toute authentification (aucune donnée sensible). */
function obtenirNomOrganisationPublic() {
  return { ok: true, nomOrganisation: NOM_ORGANISATION };
}

/** Public, sans mot de passe — juste la liste des symptômes proposés au formulaire SAV. */
function obtenirSymptomesSavPublic() {
  return { ok: true, symptomes: SYMPTOMES_SAV };
}

/** Accepte soit un ID de dossier Drive brut, soit une URL complète
 *  (https://drive.google.com/drive/folders/XXXX...) et en extrait l'ID. */
function extraireIdDossierDrive(valeur) {
  const v = String(valeur || '').trim();
  if (!v) return '';
  const m = v.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : v;
}

/** Comme extraireIdDossierDrive, mais pour un FICHIER (Sheets/Docs) plutôt qu'un dossier —
 *  accepte une URL complète (.../spreadsheets/d/ID/edit...) ou un ID déjà brut. */
function extraireIdFichier(valeur) {
  const v = String(valeur || '').trim();
  if (!v) return '';
  const m = v.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : v;
}

/** Écrit les réglages modifiables depuis l'onglet "Réglages" du back-office. */
function definirReglages(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };

  if (data.seuilAlerteImpayee !== undefined) {
    const seuil = parseInt(data.seuilAlerteImpayee, 10);
    if (!seuil || seuil < 1) {
      return { ok: false, erreur: 'Le seuil doit être un nombre de jours supérieur à 0' };
    }
    definirConfig('SEUIL_ALERTE_IMPAYEE', seuil);
  }

  if (data.modeleDevis !== undefined) {
    const resultatModele = definirModeleDevis({ password: data.password, modele: data.modeleDevis });
    if (!resultatModele.ok) return resultatModele;
  }

  if (data.modeleCommande !== undefined) {
    const resultatModeleCmd = definirModeleCommande({ password: data.password, modele: data.modeleCommande });
    if (!resultatModeleCmd.ok) return resultatModeleCmd;
  }

  if (data.modeleSav !== undefined) {
    const resultatModeleSav = definirModeleSav({ password: data.password, modele: data.modeleSav });
    if (!resultatModeleSav.ok) return resultatModeleSav;
  }

  if (data.emailAdmin !== undefined) {
    const email = String(data.emailAdmin).trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, erreur: 'Adresse email invalide' };
    }
    definirConfig('ADMIN_EMAIL', email);
  }

  if (data.dossierPrincipal !== undefined) {
    const id = extraireIdDossierDrive(data.dossierPrincipal);
    if (!id) return { ok: false, erreur: 'Le dossier Drive principal est obligatoire' };
    try { DriveApp.getFolderById(id); }
    catch (e) { return { ok: false, erreur: 'Ce dossier Drive est introuvable ou inaccessible avec ce compte Google' }; }
    definirConfig('DOSSIER_PRINCIPAL', id);
  }

  if (data.nouveauMotDePasseAdmin) {
    if (String(data.nouveauMotDePasseAdmin).length < 6) {
      return { ok: false, erreur: 'Le nouveau mot de passe back-office doit faire au moins 6 caractères' };
    }
    definirConfig('ADMIN_PASSWORD', data.nouveauMotDePasseAdmin);
  }

  if (data.nomOrganisation !== undefined) {
    definirConfig('NOM_ORGANISATION', String(data.nomOrganisation).trim().slice(0, 80));
  }

  if (data.suppressionSimple !== undefined) {
    definirConfig('SUPPRESSION_SIMPLE', data.suppressionSimple ? '1' : '');
  }

  if (data.fichierNumerotation !== undefined) {
    const id = extraireIdFichier(data.fichierNumerotation);
    if (id) {
      try { SpreadsheetApp.openById(id); }
      catch (e) { return { ok: false, erreur: 'Ce fichier de numérotation est introuvable ou inaccessible avec ce compte Google' }; }
    }
    definirConfig('FICHIER_NUMEROTATION', id);
  }

  if (data.ongletNumerotation !== undefined) {
    definirConfig('ONGLET_NUMEROTATION', String(data.ongletNumerotation).trim().slice(0, 60));
  }

  if (data.responsableNom !== undefined) {
    definirConfig('RESPONSABLE_NOM', String(data.responsableNom).trim().slice(0, 80));
  }
  if (data.responsableTelephone !== undefined) {
    definirConfig('RESPONSABLE_TELEPHONE', String(data.responsableTelephone).trim().slice(0, 30));
  }
  if (data.responsableEmail !== undefined) {
    const email = String(data.responsableEmail).trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, erreur: 'Adresse email du responsable invalide' };
    }
    definirConfig('RESPONSABLE_EMAIL', email);
  }

  if (data.modeleFacturation !== undefined) {
    const id = extraireIdFichier(data.modeleFacturation);
    if (id) {
      try { SpreadsheetApp.openById(id); }
      catch (e) { return { ok: false, erreur: 'Ce modèle de facturation est introuvable ou inaccessible avec ce compte Google' }; }
    }
    definirConfig('MODELE_FACTURATION', id);
  }

  if (data.modeleBonLivraison !== undefined) {
    const id = extraireIdFichier(data.modeleBonLivraison);
    if (id) {
      try { SpreadsheetApp.openById(id); }
      catch (e) { return { ok: false, erreur: 'Ce modèle de bon de livraison est introuvable ou inaccessible avec ce compte Google' }; }
    }
    definirConfig('MODELE_BON_LIVRAISON', id);
  }

  if (data.modeleBonOrientation !== undefined) {
    const id = extraireIdFichier(data.modeleBonOrientation);
    if (id) {
      try { SpreadsheetApp.openById(id); }
      catch (e) { return { ok: false, erreur: 'Ce modèle de bon d\'orientation est introuvable ou inaccessible avec ce compte Google' }; }
    }
    definirConfig('MODELE_BON_ORIENTATION', id);
  }

  if (data.modeleAttestationPaiement !== undefined) {
    const id = extraireIdFichier(data.modeleAttestationPaiement);
    if (id) {
      try { SpreadsheetApp.openById(id); }
      catch (e) { return { ok: false, erreur: 'Ce modèle d\'attestation de paiement est introuvable ou inaccessible avec ce compte Google' }; }
    }
    definirConfig('MODELE_ATTESTATION_PAIEMENT', id);
  }

  if (data.modeleFlotteMateriel !== undefined) {
    const id = extraireIdFichier(data.modeleFlotteMateriel);
    if (id) {
      try { SpreadsheetApp.openById(id); }
      catch (e) { return { ok: false, erreur: 'Ce modèle de flotte matériel est introuvable ou inaccessible avec ce compte Google' }; }
    }
    definirConfig('MODELE_FLOTTE_MATERIEL', id);
  }

  if (data.nettoyageFichiersJours !== undefined) {
    const jours = parseInt(data.nettoyageFichiersJours, 10) || 0;
    if (jours < 0) return { ok: false, erreur: 'Le nombre de jours ne peut pas être négatif' };
    definirConfig('NETTOYAGE_FICHIERS_JOURS', String(jours));
    configurerDeclencheurNettoyage(jours);
  }

  if (data.basculeAnnuelleActivee !== undefined) {
    const active = !!data.basculeAnnuelleActivee;
    definirConfig('BASCULE_ANNUELLE_ACTIVEE', active ? '1' : '');
    configurerDeclencheurRappelBascule(active);
  }

  if (data.enquetesSatisfactionActivees !== undefined) {
    const active = !!data.enquetesSatisfactionActivees;
    definirConfig('ENQUETES_SATISFACTION_ACTIVEES', active ? '1' : '');
    configurerDeclencheurEnquetesSatisfaction(active);
  }

  if (data.basculeDateJour !== undefined || data.basculeDateMois !== undefined) {
    const jour = parseInt(data.basculeDateJour, 10);
    const mois = parseInt(data.basculeDateMois, 10);
    if (jour && (jour < 1 || jour > 31)) return { ok: false, erreur: 'Jour de bascule invalide' };
    if (mois && (mois < 1 || mois > 12)) return { ok: false, erreur: 'Mois de bascule invalide' };
    if (jour) definirConfig('BASCULE_DATE_JOUR', String(jour));
    if (mois) definirConfig('BASCULE_DATE_MOIS', String(mois));
  }

  if (data.quantiteMaxDefaut !== undefined) {
    const q = parseInt(data.quantiteMaxDefaut, 10);
    if (!q || q < 1) return { ok: false, erreur: 'La quantité max par défaut doit être un nombre supérieur à 0' };
    definirConfig('QUANTITE_MAX_DEFAUT', q);
  }

  if (data.quantiteMaxDefautEsn !== undefined) {
    const q = parseInt(data.quantiteMaxDefautEsn, 10);
    if (!q || q < 1) return { ok: false, erreur: 'La quantité max par défaut ESN doit être un nombre supérieur à 0' };
    definirConfig('QUANTITE_MAX_DEFAUT_ESN', q);
  }

  if (data.badgeNouvelleJours !== undefined) {
    const j = parseFloat(data.badgeNouvelleJours);
    if (!j || j <= 0) return { ok: false, erreur: 'La durée du badge doit être un nombre de jours supérieur à 0' };
    definirConfig('BADGE_NOUVELLE_JOURS', j);
  }

  if (data.badgeNouvelleSavJours !== undefined) {
    const j = parseFloat(data.badgeNouvelleSavJours);
    if (!j || j <= 0) return { ok: false, erreur: 'La durée du badge SAV doit être un nombre de jours supérieur à 0' };
    definirConfig('BADGE_NOUVELLE_SAV_JOURS', j);
  }

  if (data.heureFinVendredi !== undefined) {
    const h = parseInt(data.heureFinVendredi, 10);
    if (isNaN(h) || h < 0 || h > 23) return { ok: false, erreur: 'Heure de fin du vendredi invalide (0 à 23)' };
    definirConfig('HEURE_FIN_VENDREDI', h);
  }

  if (data.heureDebutLundi !== undefined) {
    const h = parseInt(data.heureDebutLundi, 10);
    if (isNaN(h) || h < 0 || h > 23) return { ok: false, erreur: 'Heure de reprise du lundi invalide (0 à 23)' };
    definirConfig('HEURE_DEBUT_LUNDI', h);
  }

  if (data.symptomesSav !== undefined) {
    const liste = String(data.symptomesSav).split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
    if (!liste.length) return { ok: false, erreur: 'Il faut au moins un symptôme dans la liste' };
    definirConfig('SYMPTOMES_SAV', liste.join('\n'));
  }

  if (data.emailContactSav !== undefined) {
    const email = String(data.emailContactSav).trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, erreur: 'Adresse email de contact SAV invalide' };
    }
    definirConfig('EMAIL_CONTACT_SAV', email);
  }

  if (data.emailLogistique !== undefined) {
    const email = String(data.emailLogistique).trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, erreur: 'Adresse email logistique invalide' };
    }
    definirConfig('EMAIL_LOGISTIQUE', email);
  }

  if (data.emailModeleSav !== undefined) {
    const modele = String(data.emailModeleSav);
    if (!modele.trim()) return { ok: false, erreur: 'Le modèle d\'email SAV ne peut pas être vide' };
    definirConfig('EMAIL_MODELE_SAV', modele);
  }

  if (data.ongletsMasques !== undefined) {
    definirConfig('ONGLETS_MASQUES', String(data.ongletsMasques));
  }

  if (data.nouveauMotDePasseCompta) {
    if (String(data.nouveauMotDePasseCompta).length < 6) {
      return { ok: false, erreur: 'Le nouveau mot de passe comptabilité doit faire au moins 6 caractères' };
    }
    definirConfig('COMPTA_PASSWORD', data.nouveauMotDePasseCompta);
  }

  return { ok: true };
}

/**
 * ─────────────────────────────────────────────
 * Feuilles gérées par ce script
 * ─────────────────────────────────────────────
 * Toutes se créent automatiquement au premier besoin. Rien à préparer à la main.
 */

/** Le classeur est ouvert une seule fois par exécution (au lieu d'à chaque appel
 *  de feuilleXXX()), pour éviter de refaire ce travail plusieurs fois quand
 *  plusieurs fonctions accèdent aux feuilles pendant une même requête. */
let _classeurCache = null;
function obtenirClasseur() {
  if (!_classeurCache) _classeurCache = SpreadsheetApp.getActiveSpreadsheet();
  return _classeurCache;
}

/** ══════════════ Bascule annuelle (classeur "période active") ══════════════
 *  Commandes, LignesCommande, Factures, Devis, SAV et HistoriqueSav vivent dans un classeur
 *  à part qui change chaque année (voir configurerBasculeAnnuelle / effectuerBasculeAnnuelle) —
 *  ça garde ce classeur petit, donc rapide à lire, peu importe l'ancienneté de l'organisation.
 *  Structures et Produits, eux, restent pour toujours dans le classeur principal (obtenirClasseur
 *  ci-dessus) : ce sont des données de référence, pas un historique qui grossit sans fin.
 *  Tant que la bascule n'a jamais été activée, classeurActif() renvoie le classeur principal —
 *  comportement strictement identique à avant, aucune migration à faire pour qui ne l'active pas. */
let _classeurActifCache = null;
function classeurActif() {
  if (_classeurActifCache) return _classeurActifCache;
  const id = obtenirConfig('CLASSEUR_ACTIF_ID', '');
  _classeurActifCache = id ? SpreadsheetApp.openById(id) : obtenirClasseur();
  return _classeurActifCache;
}

const ONGLET_STRUCTURES = 'Structures';
const ONGLET_COMMANDES  = 'Commandes';
const ONGLET_PRODUITS   = 'Produits';
const ONGLET_FACTURES   = 'Factures';
const ONGLET_DEVIS      = 'Devis';
const ONGLET_JOURNAL_SECURITE = 'Journal de sécurité';
const ONGLET_LIGNES_COMMANDE = 'LignesCommande';
const ENTETES_LIGNES_COMMANDE = ['Référence commande', 'Produit', 'Quantité'];
const MAX_LIGNES_PAR_COMMANDE = 10; // nombre max de produits différents dans une seule commande

const ENTETES_COMMANDES = [
  'Référence', 'Reçue le', 'Code structure', 'Nom structure', 'Email', 'Téléphone',
  'Adresse', 'Produit', 'Quantité', 'Moyen de paiement', 'Bon d\'orientation',
  'Statut commande', 'Statut paiement', 'Lien de paiement', 'Commentaire', 'Numéros de série',
  'Nombre de fichiers', 'Référence devis', 'Référence facture', 'Statut comptable', 'Numéro de dépôt',
  'Devis demandé', 'Suivi Colissimo', 'Date de livraison', 'Fichier CSV tec.tech',
  'Caractéristiques matériel', 'Bon de livraison', 'Personnes bénéficiaires', 'Dernier clic lien de paiement',
  'Jeton validation logistique', 'Date de livraison souhaitée', 'Paiement séparé', 'Livraison sans envoi postal',
  'Enquête satisfaction envoyée'
];

const STATUTS_COMPTABLES = ['Non rapproché', 'Rapproché', 'Clôturé'];

const ENTETES_DEVIS = [
  'Référence devis', 'Date', 'Référence commande', 'Nom structure', 'Email', 'Adresse',
  'Produit', 'Quantité', 'Moyen de paiement', 'Prix unitaire', 'Montant total',
  'Statut', 'Référence facture'
];

const ENTETES_STRUCTURES = ['Code', 'Nom', 'Email', 'Téléphone', 'Adresse', 'RN', 'ESN', 'Interne', 'Lien flotte matériel', 'Autres', 'Email facturation', 'Latitude', 'Longitude'];

const ENTETES_PRODUITS = ['Nom', 'Prix standard', 'Prix RN', 'Stock', 'Visible', 'Message si épuisé', 'Disque dur', 'RAM', 'Système', 'Icône', 'Quantité max', 'SKU Tech.tec'];

const ENTETES_FACTURES = [
  'Référence facture', 'Date', 'Référence commande', 'Nom structure', 'Email', 'Adresse',
  'Produit', 'Quantité', 'Moyen de paiement', 'Prix unitaire', 'Montant total', 'Commentaire'
];

/* ═══════════════════════════════════════════════════════════════════════
   Cache — la pagination réduit ce qui est renvoyé au navigateur, mais sans
   ça, le serveur relisait TOUJOURS les feuilles Commandes/LignesCommande/
   Factures en entier à chaque page. Ici : le résultat déjà construit est
   gardé en cache (découpé en morceaux, la limite Apps Script étant de
   100 Ko par entrée), invalidé automatiquement dès qu'une écriture a lieu.
   Un échec de cache (quota, corruption) ne bloque jamais rien : la fonction
   appelante recalcule simplement à partir des feuilles, comme avant.
   ═══════════════════════════════════════════════════════════════════════ */
const CACHE_TTL_LISTES = 3600; // 1h : l'invalidation par version se fait déjà à chaque écriture (voir invaliderCache), donc
                                 // ce délai ne sert qu'à éviter une accumulation infinie du cache — jamais à retenir une
                                 // donnée périmée. Mesuré : reconstruction à froid ~3.7s contre ~0.3s en cache chaud, donc
                                 // mieux vaut rester en cache chaud le plus longtemps possible tant que rien n'a changé.
const TAILLE_CHUNK_CACHE = 90000; // marge de sécurité sous la limite de 100 Ko par entrée

function versionCache(nom) {
  const v = CacheService.getScriptCache().get('version_' + nom);
  return v || '0';
}

function invaliderCache(nom) {
  try {
    const v = (parseInt(CacheService.getScriptCache().get('version_' + nom), 10) || 0) + 1;
    CacheService.getScriptCache().put('version_' + nom, String(v), 21600); // 6h, le plafond du cache Apps Script
  } catch (e) {
    // Le cache est un confort de performance, jamais une dépendance — un échec ici ne doit
    // jamais empêcher l'écriture elle-même de réussir.
  }
}
function invaliderCacheCommandes() { invaliderCache('commandes'); }
function invaliderCacheSav() { invaliderCache('sav'); }
function invaliderCacheFactures() { invaliderCache('factures'); }
function invaliderCacheDevis() { invaliderCache('devis'); }

function mettreEnCacheDecoupe(cle, objet) {
  const debut = Date.now();
  try {
    const texte = JSON.stringify(objet);
    const nbChunks = Math.max(1, Math.ceil(texte.length / TAILLE_CHUNK_CACHE));
    const valeurs = {};
    for (let i = 0; i < nbChunks; i++) {
      valeurs[cle + '_' + i] = texte.slice(i * TAILLE_CHUNK_CACHE, (i + 1) * TAILLE_CHUNK_CACHE);
    }
    valeurs[cle + '_n'] = String(nbChunks);
    CacheService.getScriptCache().putAll(valeurs, CACHE_TTL_LISTES);
    Logger.log('[cache écriture] ' + cle + ' — ' + texte.length + ' caractères, ' + nbChunks + ' morceaux, ' + (Date.now() - debut) + ' ms');
  } catch (e) {
    Logger.log('[cache écriture] ' + cle + ' — ÉCHEC après ' + (Date.now() - debut) + ' ms : ' + e);
    // Idem : jamais bloquant, juste pas de cache pour cette fois.
  }
}

function lireCacheDecoupe(cle) {
  const debut = Date.now();
  try {
    const cache = CacheService.getScriptCache();
    const nbChunksTexte = cache.get(cle + '_n');
    if (!nbChunksTexte) { Logger.log('[cache lecture] ' + cle + ' — absent (' + (Date.now() - debut) + ' ms)'); return null; }
    const nbChunks = parseInt(nbChunksTexte, 10);
    const cles = [];
    for (let i = 0; i < nbChunks; i++) cles.push(cle + '_' + i);
    const valeurs = cache.getAll(cles);
    let texte = '';
    for (let i = 0; i < nbChunks; i++) {
      const morceau = valeurs[cle + '_' + i];
      if (morceau === undefined) { Logger.log('[cache lecture] ' + cle + ' — morceau manquant, recalcul (' + (Date.now() - debut) + ' ms)'); return null; }
      texte += morceau;
    }
    const resultat = JSON.parse(texte);
    Logger.log('[cache lecture] ' + cle + ' — ' + texte.length + ' caractères, ' + nbChunks + ' morceaux, ' + (Date.now() - debut) + ' ms (dont JSON.parse)');
    return resultat;
  } catch (e) {
    Logger.log('[cache lecture] ' + cle + ' — ÉCHEC après ' + (Date.now() - debut) + ' ms : ' + e);
    return null;
  }
}

/* ══════════════ Nettoyage automatique des fichiers générés ══════════════
   Supprime (met à la corbeille, jamais de suppression définitive directe — Drive garde la
   corbeille 30 jours, donc rien n'est perdu brutalement) les fichiers générés par l'outil
   (bons, devis, factures, attestations, CSV tec.tech) plus vieux que le seuil configuré,
   dans chacun des sous-dossiers auto-créés du dossier Drive principal. Ne touche jamais aux
   modèles eux-mêmes (fichiers référencés par les ID de modèle) ni à quoi que ce soit hors
   de ces sous-dossiers connus. */
const NOMS_SOUS_DOSSIERS_GENERES = ['Factures', 'Devis', 'Bons de livraison', 'Bons d\'orientation', 'Attestations de paiement', 'CSV Tec.Tech', 'Pièces jointes commandes'];

function dossiersANettoyer() {
  return NOMS_SOUS_DOSSIERS_GENERES.map(function(nom) {
    try { return sousDossier(nom); } catch (e) { return null; } // dossier principal pas encore configuré, ou inaccessible
  }).filter(Boolean);
}

function nettoyerFichiersAnciens() {
  const jours = NETTOYAGE_FICHIERS_JOURS;
  if (!jours) return { ok: true, supprimes: 0 };

  const idsModeles = [MODELE_FACTURATION, MODELE_BON_LIVRAISON, MODELE_BON_ORIENTATION, MODELE_ATTESTATION_PAIEMENT, MODELE_FLOTTE_MATERIEL]
    .filter(Boolean);
  const seuil = new Date(Date.now() - jours * 24 * 60 * 60 * 1000);
  let supprimes = 0;

  dossiersANettoyer().forEach(function(dossier) {
    const fichiers = dossier.getFiles();
    while (fichiers.hasNext()) {
      const fichier = fichiers.next();
      if (idsModeles.indexOf(fichier.getId()) !== -1) continue; // jamais le modèle lui-même
      if (fichier.getLastUpdated() < seuil) {
        fichier.setTrashed(true);
        supprimes++;
      }
    }
  });
  return { ok: true, supprimes: supprimes };
}

/** Crée, met à jour ou supprime le déclencheur quotidien de nettoyage selon le réglage.
 *  Toujours repartir d'une base propre (suppression des anciens déclencheurs de cette
 *  fonction) pour ne jamais en empiler plusieurs au fil des changements de réglage. */
function configurerDeclencheurNettoyage(jours) {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'nettoyerFichiersAnciens') ScriptApp.deleteTrigger(t);
  });
  if (jours > 0) {
    ScriptApp.newTrigger('nettoyerFichiersAnciens').timeBased().everyDays(1).atHour(3).create();
  }
}

/* ══════════════ Bascule annuelle (lien manuel) ══════════════
   Chaque année, le classeur "période active" (Commandes/Factures/Devis/SAV) est archivé et
   remplacé par un classeur neuf — ça garde la base interrogée au quotidien petite, donc
   rapide, indéfiniment. La bascule elle-même reste un geste volontaire : on ne crée jamais de
   classeur à la place de la personne. Elle crée son classeur vierge elle-même (un lien direct
   vers sheets.new le lui propose), colle son lien dans les réglages, et l'app se charge du
   reste (archivage de l'ancien, connexion au nouveau). Un rappel (email + modale à la
   connexion) prévient le jour venu, à la date choisie dans les réglages — jamais d'action
   automatique sur le classeur lui-même. */

function configurerDeclencheurRappelBascule(active) {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'verifierRappelBasculeParMail') ScriptApp.deleteTrigger(t);
  });
  if (active) {
    ScriptApp.newTrigger('verifierRappelBasculeParMail').timeBased().everyDays(1).atHour(8).create();
  }
}

/** Vrai si la bascule est due : on a dépassé la date choisie dans les réglages, et elle n'a
 *  pas encore été faite cette année (comparé à l'année de la dernière bascule effective, pas
 *  à la date du jour du dernier rappel — un rappel ignoré doit continuer de réapparaître). */
function basculeEstDue() {
  if (obtenirConfig('BASCULE_ANNUELLE_ACTIVEE', '') !== '1') return false;
  const jour = parseInt(obtenirConfig('BASCULE_DATE_JOUR', '1'), 10) || 1;
  const mois = parseInt(obtenirConfig('BASCULE_DATE_MOIS', '1'), 10) || 1; // 1 = janvier
  const maintenant = new Date();
  const dateBascule = new Date(maintenant.getFullYear(), mois - 1, jour);
  if (maintenant < dateBascule) return false;

  const derniere = obtenirConfig('DERNIERE_BASCULE', '');
  if (!derniere) return true;
  return new Date(derniere).getFullYear() < maintenant.getFullYear();
}

/** Appelée une fois par jour — envoie un mail seulement le premier jour où la bascule devient
 *  due (pas un mail par jour tant que ce n'est pas fait : ce serait vite agaçant). La modale
 *  dans l'admin, elle, réapparaît à chaque connexion tant que ce n'est pas fait — voir
 *  obtenirReglages ci-dessous (champ rappelBascule). */
function verifierRappelBasculeParMail() {
  if (!basculeEstDue()) return;
  if (obtenirConfig('RAPPEL_BASCULE_MAIL_ENVOYE_ANNEE', '') === String(new Date().getFullYear())) return;
  definirConfig('RAPPEL_BASCULE_MAIL_ENVOYE_ANNEE', String(new Date().getFullYear()));

  if (!ADMIN_EMAIL) return;
  try {
    MailApp.sendEmail(ADMIN_EMAIL, 'CVDL — C\'est l\'heure de la bascule annuelle',
      'Bonjour,\n\nLa date choisie pour la bascule annuelle des données est arrivée.\n\n'
      + 'Pour la faire :\n1. Crée un nouveau classeur Google Sheets vierge : https://sheets.new\n'
      + '2. Copie son lien\n3. Colle-le dans l\'admin, onglet Réglages → "Bascule base de données"\n'
      + '4. Clique "Basculer maintenant"\n\nL\'ancien classeur est archivé automatiquement, rien à supprimer ni déplacer toi-même.'
      + '\n\nCordialement,\nCVDL');
  } catch (e) { Logger.log('Échec envoi mail de rappel bascule : ' + e); }
}

/** Le geste volontaire lui-même : archive le classeur actif actuel, se connecte au nouveau
 *  classeur donné (créé à la main par la personne, jamais par le script). Vérifie l'accès
 *  avant de basculer quoi que ce soit. */
function basculerVersNouveauClasseur(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };

  const id = extraireIdFichier(data.lienNouveauClasseur);
  if (!id) return { ok: false, erreur: 'Lien invalide' };

  let nouveauClasseur;
  try {
    nouveauClasseur = SpreadsheetApp.openById(id);
  } catch (e) {
    return { ok: false, erreur: 'Impossible d\'accéder à ce classeur — vérifie le lien et que tu y as bien accès.' };
  }

  const ancienId = obtenirConfig('CLASSEUR_ACTIF_ID', '') || obtenirClasseur().getId();
  if (ancienId === id) return { ok: false, erreur: 'C\'est déjà le classeur actif — colle le lien de ton nouveau classeur vierge.' };

  const ancienClasseur = SpreadsheetApp.openById(ancienId);
  const anneeArchivee = new Date().getFullYear();

  const archives = listerArchives();
  archives.unshift({ annee: anneeArchivee, id: ancienId, url: ancienClasseur.getUrl() });
  definirConfig('ARCHIVES_CLASSEURS', JSON.stringify(archives));

  try { ancienClasseur.rename('CVDL — Données ' + anneeArchivee + ' (archivé)'); } catch (e) { /* pas bloquant si le renommage échoue */ }

  definirConfig('CLASSEUR_ACTIF_ID', id);
  definirConfig('DERNIERE_BASCULE', new Date().toISOString());
  _classeurActifCache = null; // le cache en mémoire de cette exécution doit être invalidé aussi

  return { ok: true, ancienneUrl: ancienClasseur.getUrl(), anneeArchivee: anneeArchivee };
}

/** Liste des classeurs archivés, du plus récent au plus ancien. */
function listerArchives() {
  try {
    const brut = obtenirConfig('ARCHIVES_CLASSEURS', '');
    return brut ? JSON.parse(brut) : [];
  } catch (e) {
    return [];
  }
}

/** N'est appelée que quand la recherche dans le classeur actif ne remonte rien — jamais
 *  systématiquement, pour ne jamais ralentir le cas normal. Parcourt chaque classeur archivé
 *  (du plus récent au plus ancien) et cherche directement dedans, sans passer par le cache
 *  (une archive ne change jamais, mais on ne veut pas non plus garder des dizaines de
 *  classeurs archivés en cache pour rien). Les résultats sont clairement marqués comme
 *  archivés — jamais modifiables depuis l'admin, uniquement consultables. */
function rechercherDansArchives(terme) {
  const debut = Date.now();
  const termeLower = String(terme || '').trim().toLowerCase();
  const archives = listerArchives();
  const resultats = [];
  if (!termeLower || !archives.length) return resultats;

  for (let a = 0; a < archives.length && resultats.length < 100; a++) {
    const archive = archives[a];
    try {
      const classeur = SpreadsheetApp.openById(archive.id);
      const feuille = classeur.getSheetByName(ONGLET_COMMANDES);
      if (!feuille) continue;
      const lignes = feuille.getDataRange().getValues();
      for (let i = 1; i < lignes.length; i++) {
        const l = lignes[i];
        if (!l[0]) continue;
        const cible = (l[0] + ' ' + l[3] + ' ' + l[4] + ' ' + l[7] + ' ' + (l[15] || '')).toLowerCase();
        if (!cible.includes(termeLower)) continue;
        resultats.push({
          ligne: i + 1,
          reference: l[0],
          date: l[1] instanceof Date ? Utilities.formatDate(l[1], Session.getScriptTimeZone(), 'dd/MM/yyyy') : '',
          code: l[2] || '',
          nom: l[3] || '',
          email: l[4] || '',
          telephone: l[5] || '',
          adresse: l[6] || '',
          produit: l[7] || '',
          quantite: l[8] || '',
          moyenPaiement: l[9] || '',
          statutCommande: l[11] || '',
          statutPaiement: l[12] || '',
          commentaire: l[14] || '',
          numerosSerie: l[15] || '',
          referenceDevis: l[17] || '',
          referenceFacture: l[18] || '',
          colissimo: l[22] || '',
          dateLivraison: l[23] instanceof Date ? Utilities.formatDate(l[23], Session.getScriptTimeZone(), 'dd/MM/yyyy') : (l[23] || ''),
          bonLivraison: l[26] || '',
          personnes: l[27] || '',
          archive: true,
          anneeArchive: archive.annee,
          urlArchive: archive.url
        });
      }
    } catch (e) {
      Logger.log('[rechercherDansArchives] classeur ' + archive.annee + ' illisible : ' + e);
    }
  }
  Logger.log('[rechercherDansArchives] "' + terme + '" — ' + archives.length + ' archive(s) explorée(s), ' + resultats.length + ' résultat(s), ' + (Date.now() - debut) + ' ms');
  return resultats;
}


/**
 * CVDL — Backend commandes matériel (source : Routeur.gs, 2 sur 8 — doGet/doPost, aiguillage des actions)
 * Fait partie de backend/*.gs — voir Config.gs pour les instructions de génération.
 */

/* ══════════════ Points d'entrée ══════════════ */

function doGet(e) {
  const debutDoGet = Date.now();
  const p = e.parameter;

  // Route à part : ce n'est pas une réponse JSON. La structure clique un lien "Régler cette
  // commande" dans suivi.html, ce lien passe par ici pour tracer l'horodatage du clic (utile à
  // l'admin pour savoir qu'il faut vérifier le paiement), puis affiche une page de confirmation
  // avec un bouton vers l'URL réelle du lien de paiement — pas de redirection automatique
  // silencieuse : plus fiable, et si le lien n'est pas configuré, ça se voit tout de suite
  // au lieu d'échouer sans explication.
  if (p.action === 'clic-lien-paiement') {
    let r = { ok: false };
    try {
      r = enregistrerClicLienPaiement(p.ref, p.index);
    } catch (err) {
      Logger.log('Échec traçage clic lien de paiement pour ' + p.ref + ' : ' + err);
    }
    const style = 'font-family:sans-serif;max-width:420px;margin:70px auto;text-align:center;padding:0 20px';
    const html = r.ok
      ? '<div style="' + style + '"><h1 style="font-size:20px">' + echapperHtml(r.reference) + (r.beneficiaire ? ' — ' + echapperHtml(r.beneficiaire) : '') + '</h1>' +
        '<p style="color:#555">' + (r.structure ? echapperHtml(r.structure) + ' — ' : '') + 'clique ci-dessous pour accéder au règlement.</p>' +
        '<a href="' + echapperHtml(r.url) + '" style="display:inline-block;margin-top:18px;padding:13px 30px;background:#0B5FFF;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Accéder au paiement</a></div>'
      : '<div style="' + style + '"><h1 style="font-size:20px">Lien introuvable</h1>' +
        '<p style="color:#555">Aucun lien de paiement n\'est configuré pour cette commande, ou la référence transmise est incorrecte. Contacte-nous directement pour régler cette commande.</p></div>';
    return HtmlService.createHtmlOutput(html);
  }

  // Lien cliqué depuis le mail de validation logistique — affiche un petit formulaire
  // (quantités modifiables + commentaire) plutôt que de valider tout de suite : la
  // validation elle-même se fait via un appel POST déclenché par ce formulaire.
  if (p.action === 'confirmer-validation-logistique') {
    let html;
    try {
      html = construirePageValidationLogistique(p.ref, p.jeton);
    } catch (err) {
      html = '<div style="font-family:sans-serif;max-width:420px;margin:70px auto;text-align:center;padding:0 20px"><h1 style="font-size:20px">Erreur</h1><p style="color:#555">' + echapperHtml(String(err)) + '</p></div>';
    }
    return HtmlService.createHtmlOutput(html);
  }

  let res;

  try {
    if (p.action === 'ping') {
      res = { ok: true, message: 'Le script répond correctement.' };
    } else if (p.action === 'organisation') {
      res = obtenirNomOrganisationPublic();
    } else if (p.action === 'sav-symptomes') {
      res = obtenirSymptomesSavPublic();
    } else if (p.action === 'installation-etat') {
      res = { ok: true, terminee: installationTerminee() };
    } else if (p.action === 'check') {
      res = verifierCode(p.code);
    } else if (p.action === 'commandes-par-code') {
      res = listerCommandesParCode(p);
    } else if (p.action === 'flotte-obtenir') {
      res = flotteObtenir(p);
    } else if (p.action === 'structures-coordonnees') {
      res = obtenirCoordonneesStructures(p);
    } else if (p.action === 'flotte-lister') {
      res = flotteListerAppareils(p);
    } else if (p.action === 'sav-par-numero-serie') {
      res = listerTicketsSavParNumeroSerie(p);
    } else if (p.action === 'sav-par-code') {
      res = listerTicketsSavParCode(p);
    } else if (p.action === 'sav-statuts-public') {
      res = listerStatutsSavPublic();
    } else if (p.action === 'produits-public') {
      res = listerProduitsPublic(p.code);
    } else if (p.action === 'sav-verifier-numero-serie') {
      res = verifierNumeroSerieSav(p.numeroSerie);
    } else if (p.action === 'login') {
      res = seConnecter(p.password);
    } else if (p.action === 'list') {
      res = listerCommandes(p.password, p.limite, p.decalage, p.recherche);
    } else if (p.action === 'commandes-nombre') {
      res = compterCommandes(p.password);
    } else if (p.action === 'structures') {
      res = listerStructures(p.password);
    } else if (p.action === 'produits') {
      res = listerProduits(p.password);
    } else if (p.action === 'factures') {
      res = listerFactures(p.password, p.limite, p.decalage, p.recherche);
    } else if (p.action === 'devis') {
      res = listerDevis(p.password, p.limite, p.decalage, p.recherche);
    } else if (p.action === 'comptabilite') {
      res = listerComptabilite(p.password, p.limite, p.decalage, p.recherche);
    } else if (p.action === 'sav-list') {
      res = listerSav(p.password, p.limite, p.decalage, p.recherche);
    } else if (p.action === 'sav-statuts-list') {
      res = listerStatutsSav(p.password);
    } else if (p.action === 'devis-modele') {
      res = (p.password === ADMIN_PASSWORD)
        ? { ok: true, modele: obtenirModeleDevis() }
        : { ok: false, erreur: 'Mot de passe incorrect' };
    } else if (p.action === 'reglages') {
      res = obtenirReglages(p);
    } else {
      res = { ok: false, erreur: 'Action inconnue' };
    }
  } catch (err) {
    res = { ok: false, erreur: String(err) };
  }

  // JSONP : évite tout souci de CORS depuis une page statique
  Logger.log('[doGet] action=' + p.action + ' — ' + (Date.now() - debutDoGet) + ' ms au total');
  if (p.callback) {
    return ContentService
      .createTextOutput(p.callback + '(' + JSON.stringify(res) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(JSON.stringify(res))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let res;
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'create') {
      res = creerCommande(data);
    } else if (data.action === 'sav-create') {
      res = creerTicketSav(data);
    } else if (data.action === 'sav-create-manuelle') {
      res = creerTicketSavManuel(data);
    } else if (data.action === 'sav-update') {
      res = majSav(data);
    } else if (data.action === 'sav-delete') {
      res = supprimerSav(data);
    } else if (data.action === 'sav-statut-ajouter') {
      res = ajouterStatutSav(data);
    } else if (data.action === 'sav-statut-modifier') {
      res = majStatutSav(data);
    } else if (data.action === 'sav-statut-supprimer') {
      res = supprimerStatutSav(data);
    } else if (data.action === 'sav-statut-deplacer') {
      res = deplacerStatutSav(data);
    } else if (data.action === 'envoyer-email-colissimo-commande') {
      res = envoyerEmailColissimoCommande(data);
    } else if (data.action === 'apercu-email-colissimo-commande') {
      res = apercuEmailColissimoCommande(data);
    } else if (data.action === 'envoyer-email-colissimo-sav') {
      res = envoyerEmailColissimoSav(data);
    } else if (data.action === 'apercu-email-colissimo-sav') {
      res = apercuEmailColissimoSav(data);
    } else if (data.action === 'commande-create-manuelle') {
      res = creerCommandeManuelle(data);
    } else if (data.action === 'demander-validation-logistique') {
      res = demanderValidationLogistique(data);
    } else if (data.action === 'valider-avec-modifications') {
      res = validerCommandeAvecModifications(data);
    } else if (data.action === 'notifier-lien-paiement') {
      res = notifierLienPaiement(data);
    } else if (data.action === 'flotte-lier') {
      res = flotteLier(data);
    } else if (data.action === 'flotte-actualiser') {
      res = flotteActualiser(data);
    } else if (data.action === 'flotte-modifier') {
      res = flotteModifierAppareil(data);
    } else if (data.action === 'basculer-classeur') {
      res = basculerVersNouveauClasseur(data);
    } else if (data.action === 'enquete-repondre') {
      res = enregistrerReponseEnquete(data);
    } else if (data.action === 'commande-delete') {
      res = supprimerCommande(data);
    } else if (data.action === 'devis-create') {
      res = creerDevisManuel(data);
    } else if (data.action === 'devis-convert') {
      res = convertirDevisEnFacture(data);
    } else if (data.action === 'devis-delete') {
      res = supprimerDevis(data);
    } else if (data.action === 'compta-update') {
      res = majCompta(data);
    } else if (data.action === 'commande-facturer-direct') {
      res = facturerDirectement(data);
    } else if (data.action === 'numerotation-onglets') {
      res = listerOngletsNumerotation(data);
    } else if (data.action === 'numerotation-rechercher') {
      res = rechercherNumeroFacture(data);
    } else if (data.action === 'numerotation-reserver') {
      res = reserverNumeroFacture(data);
    } else if (data.action === 'commande-devis-direct') {
      res = creerDevisDirect(data);
    } else if (data.action === 'facture-update') {
      res = majFacture(data);
    } else if (data.action === 'facture-generer-pdf') {
      res = genererFacturePdf(data);
    } else if (data.action === 'devis-generer-pdf') {
      res = genererDevisPdf(data);
    } else if (data.action === 'facture-delete') {
      res = supprimerFacture(data);
    } else if (data.action === 'devis-update') {
      res = majDevis(data);
    } else if (data.action === 'devis-modele-set') {
      res = definirModeleDevis(data);
    } else if (data.action === 'reglages-set') {
      res = definirReglages(data);
    } else if (data.action === 'installation-configurer') {
      res = configurerInstallation(data);
    } else if (data.action === 'update') {
      res = majCommande(data);
    } else if (data.action === 'commande-importer-csv-tectech') {
      res = importerCsvTectech(data);
    } else if (data.action === 'commande-generer-bon-livraison') {
      res = genererBonLivraisonPdf(data);
    } else if (data.action === 'commande-generer-bon-orientation') {
      res = genererBonOrientationPdf(data);
    } else if (data.action === 'commande-generer-attestations') {
      res = genererAttestationsPaiement(data);
    } else if (data.action === 'stock-synchroniser-tectech') {
      res = synchroniserStockTectech(data);
    } else if (data.action === 'commande-ligne-modifier') {
      res = modifierLigneCommande(data);
    } else if (data.action === 'commande-ligne-ajouter') {
      res = ajouterLigneCommande(data);
    } else if (data.action === 'commande-ligne-supprimer') {
      res = supprimerLigneCommande(data);
    } else if (data.action === 'structure-create') {
      res = creerStructure(data);
    } else if (data.action === 'structure-update') {
      res = majStructure(data);
    } else if (data.action === 'structure-delete') {
      res = supprimerStructure(data);
    } else if (data.action === 'produit-create') {
      res = creerProduit(data);
    } else if (data.action === 'produit-update') {
      res = majProduit(data);
    } else if (data.action === 'produit-delete') {
      res = supprimerProduit(data);
    } else {
      res = { ok: false, erreur: 'Action inconnue' };
    }
  } catch (err) {
    res = { ok: false, erreur: String(err) };
  }

  return ContentService
    .createTextOutput(JSON.stringify(res))
    .setMimeType(ContentService.MimeType.JSON);
}

/** À lancer directement avec le bouton ▶ Exécuter de l'éditeur (sélectionne cette fonction
 *  dans le menu déroulant en haut, puis Exécuter) — simule une vraie requête "commandes,
 *  première page" et affiche le résultat + tous les logs de mesure de temps juste en dessous,
 *  dans le journal d'exécution. Beaucoup plus simple que de fouiller le panneau Exécutions. */
function testerPerformanceListCommandes() {
  const debut = Date.now();
  const reponse = doGet({ parameter: { action: 'list', password: ADMIN_PASSWORD, limite: '20', decalage: '0' } });
  Logger.log('=== Requête simulée terminée en ' + (Date.now() - debut) + ' ms au total ===');
  Logger.log('Taille de la réponse : ' + reponse.getContent().length + ' caractères');
}

/** Même principe, pour tester spécifiquement la comptabilité (souvent la plus lourde, vu
 *  qu'elle relit toute la feuille Commandes en plus de Factures). */
function testerPerformanceComptabilite() {
  const debut = Date.now();
  const reponse = doGet({ parameter: { action: 'comptabilite', password: ADMIN_PASSWORD, limite: '20', decalage: '0' } });
  Logger.log('=== Requête simulée terminée en ' + (Date.now() - debut) + ' ms au total ===');
  Logger.log('Taille de la réponse : ' + reponse.getContent().length + ' caractères');
}

/**
 * CVDL — Backend commandes matériel (source : Structures.gs, 3 sur 8 — CRUD structures partenaires)
 * Fait partie de backend/*.gs — voir Config.gs pour les instructions de génération.
 */

/* ══════════════ Structures ══════════════ */

function feuilleStructures() {
  const classeur = obtenirClasseur();
  let feuille = classeur.getSheetByName(ONGLET_STRUCTURES);

  if (!feuille) {
    feuille = classeur.insertSheet(ONGLET_STRUCTURES);
    feuille.appendRow(ENTETES_STRUCTURES);
    feuille.getRange(1, 1, 1, ENTETES_STRUCTURES.length).setFontWeight('bold');
    feuille.setFrozenRows(1);
  }
  return feuille;
}

function lireStructures() {
  const feuille = feuilleStructures();
  const lignes = feuille.getDataRange().getValues();
  const structures = {};

  for (let i = 1; i < lignes.length; i++) {
    const code = String(lignes[i][0] || '').trim();
    if (!code) continue;
    structures[code] = {
      ligne:     i + 1,
      code:      code,
      nom:       String(lignes[i][1] || '').trim(),
      email:     String(lignes[i][2] || '').trim(),
      telephone: String(lignes[i][3] || '').trim(),
      adresse:   String(lignes[i][4] || '').trim(),
      rn:        lignes[i][5] === true || String(lignes[i][5]).trim().toUpperCase() === 'TRUE',
      esn:       lignes[i][6] === true || String(lignes[i][6]).trim().toUpperCase() === 'TRUE',
      interne:   lignes[i][7] === true || String(lignes[i][7]).trim().toUpperCase() === 'TRUE',
      lienFlotte: String(lignes[i][8] || '').trim(),
      autres:    lignes[i][9] === true || String(lignes[i][9]).trim().toUpperCase() === 'TRUE',
      emailFacturation: String(lignes[i][10] || '').trim()
    };
  }
  return structures;
}

function verifierCode(code) {
  const propre = String(code || '').trim();
  if (!propre) return { ok: false, erreur: 'Code vide' };

  const structure = lireStructures()[propre];
  if (!structure) {
    journaliserEvenementSecurite('Code structure invalide', propre);
    return { ok: false, erreur: 'Code inconnu' };
  }

  // On ne renvoie que le strict nécessaire à l'affichage : email et adresse restent côté serveur
  return {
    ok: true,
    nom: structure.nom,
    moyenImpose: structure.rn ? 'Virement (RN uniquement)' : null,
    esn: !!structure.esn,
    interne: !!structure.interne,
    autres: !!structure.autres
  };
}

function listerStructures(password) {
  if (password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };

  const lignes = feuilleStructures().getDataRange().getValues();
  const structures = [];

  for (let i = 1; i < lignes.length; i++) {
    if (!String(lignes[i][0] || '').trim()) continue;
    structures.push({
      ligne:     i + 1,
      code:      lignes[i][0],
      nom:       lignes[i][1],
      email:     lignes[i][2],
      telephone: lignes[i][3],
      adresse:   lignes[i][4],
      rn:        lignes[i][5] === true || String(lignes[i][5]).trim().toUpperCase() === 'TRUE',
      esn:       lignes[i][6] === true || String(lignes[i][6]).trim().toUpperCase() === 'TRUE',
      interne:   lignes[i][7] === true || String(lignes[i][7]).trim().toUpperCase() === 'TRUE'
    });
  }
  return { ok: true, structures: structures };
}

function creerStructure(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };

  const code = String(data.code || '').trim();
  if (!code) return { ok: false, erreur: 'Le code est obligatoire' };
  if (lireStructures()[code]) return { ok: false, erreur: 'Ce code est déjà utilisé' };

  const feuille = feuilleStructures();
  feuille.appendRow([
    code,
    String(data.nom || '').trim(),
    String(data.email || '').trim(),
    String(data.telephone || '').trim(),
    String(data.adresse || '').trim(),
    data.rn === true || data.rn === 'true',
    data.esn === true || data.esn === 'true',
    data.interne === true || data.interne === 'true',
    '', // Lien flotte matériel — jamais renseigné à la création, uniquement par la structure elle-même
    data.autres === true || data.autres === 'true',
    String(data.emailFacturation || '').trim()
  ]);

  // Cases à cocher propres sur les colonnes RN, ESN et Interne de cette nouvelle ligne
  feuille.getRange(feuille.getLastRow(), 6, 1, 3).insertCheckboxes();
  feuille.getRange(feuille.getLastRow(), 10).insertCheckboxes(); // colonne Autres

  return { ok: true };
}

function majStructure(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };

  const colonnes = { code: 1, nom: 2, email: 3, telephone: 4, adresse: 5, rn: 6, esn: 7, interne: 8, autres: 10, emailFacturation: 11 };
  const colonne = colonnes[data.champ];
  if (!colonne) return { ok: false, erreur: 'Champ inconnu' };

  if (data.champ === 'rn' || data.champ === 'esn' || data.champ === 'interne' || data.champ === 'autres') {
    feuilleStructures().getRange(data.ligne, colonne).setValue(data.valeur === true || data.valeur === 'true');
    return { ok: true };
  }

  const valeur = String(data.valeur || '').trim();

  if (data.champ === 'code') {
    if (!valeur) return { ok: false, erreur: 'Le code ne peut pas être vide' };
    const existante = lireStructures()[valeur];
    if (existante) {
      const feuille = feuilleStructures();
      if (String(feuille.getRange(data.ligne, 1).getValue()).trim() !== valeur) {
        return { ok: false, erreur: 'Ce code est déjà utilisé' };
      }
    }
  }

  feuilleStructures().getRange(data.ligne, colonne).setValue(valeur);
  return { ok: true };
}

/** Renvoie tous les appareils du tableau flotte lié à cette structure, avec leur numéro de
 *  ligne (nécessaire pour les modifications ciblées ensuite). */
function flotteListerAppareils(data) {
  const code = String(data.code || '').trim();
  const structure = lireStructures()[code];
  if (!structure) return { ok: false, erreur: 'Code inconnu' };
  if (!structure.lienFlotte) return { ok: false, erreur: 'Aucun tableau flotte lié pour le moment' };

  const id = extraireIdFichier(structure.lienFlotte);
  let feuilleFlotte;
  try {
    feuilleFlotte = SpreadsheetApp.openById(id).getSheets()[0];
  } catch (e) {
    return { ok: false, erreur: 'Impossible d\'accéder au tableau — l\'accès a peut-être été retiré côté partage.' };
  }

  const lignes = feuilleFlotte.getDataRange().getValues();
  const appareils = [];
  const seuilAlerteMs = 90 * 24 * 60 * 60 * 1000; // 3 mois
  for (let i = 1; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    const dateLivraisonRaw = lignes[i][6];
    const statutAppareil = lignes[i][5] || 'En stock';
    const alerteGarantie = statutAppareil === 'En stock' && dateLivraisonRaw instanceof Date
      && (Date.now() - dateLivraisonRaw.getTime()) >= seuilAlerteMs;
    appareils.push({
      ligne: i + 1,
      numeroSerie: lignes[i][0],
      marque: lignes[i][1] || '',
      modele: lignes[i][2] || '',
      prixAchat: lignes[i][3],
      personne: lignes[i][4] || '',
      statut: statutAppareil,
      dateLivraison: dateLivraisonRaw instanceof Date ? Utilities.formatDate(dateLivraisonRaw, Session.getScriptTimeZone(), 'dd/MM/yyyy') : (dateLivraisonRaw || ''),
      dateVente: lignes[i][7] instanceof Date ? Utilities.formatDate(lignes[i][7], Session.getScriptTimeZone(), 'dd/MM/yyyy') : (lignes[i][7] || ''),
      paye: lignes[i][8] || '',
      lienPaiement: lignes[i][9] || '',
      alerteGarantie: alerteGarantie
    });
  }
  return { ok: true, appareils: appareils };
}

/** Modifie un seul champ d'un appareil, uniquement parmi ceux autorisés (voir
 *  CHAMPS_FLOTTE_MODIFIABLES) — le numéro de série, le prix d'achat, la date de livraison et
 *  le lien de paiement restent en lecture seule depuis cette interface, quoi qu'il arrive. */
function flotteModifierAppareil(data) {
  const code = String(data.code || '').trim();
  const structure = lireStructures()[code];
  if (!structure) return { ok: false, erreur: 'Code inconnu' };
  if (!structure.lienFlotte) return { ok: false, erreur: 'Aucun tableau flotte lié pour le moment' };

  const colonne = CHAMPS_FLOTTE_MODIFIABLES[data.champ];
  if (!colonne) return { ok: false, erreur: 'Champ non modifiable depuis cette interface' };

  if (data.champ === 'statut' && STATUTS_FLOTTE.indexOf(data.valeur) === -1) {
    return { ok: false, erreur: 'Statut invalide' };
  }
  if (data.champ === 'paye' && ['Oui', 'Non', ''].indexOf(data.valeur) === -1) {
    return { ok: false, erreur: 'Valeur invalide' };
  }

  const ligne = parseInt(data.ligne, 10);
  if (!ligne || ligne < 2) return { ok: false, erreur: 'Ligne invalide' };

  const id = extraireIdFichier(structure.lienFlotte);
  let feuilleFlotte;
  try {
    feuilleFlotte = SpreadsheetApp.openById(id).getSheets()[0];
  } catch (e) {
    return { ok: false, erreur: 'Impossible d\'accéder au tableau — l\'accès a peut-être été retiré côté partage.' };
  }

  // Sécurité minimale : vérifier que cette ligne a bien un numéro de série, pour éviter
  // d'écrire au hasard sur une ligne vide si le numéro de ligne transmis est erroné.
  if (!feuilleFlotte.getRange(ligne, 1).getValue()) return { ok: false, erreur: 'Ligne introuvable' };

  feuilleFlotte.getRange(ligne, colonne).setValue(data.valeur);
  return { ok: true };
}

function supprimerStructure(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  feuilleStructures().deleteRow(data.ligne);
  return { ok: true };
}

/* ══════════════ Flotte matériel (inventaire léger tenu par chaque structure) ══════════════
   Le tableau appartient entièrement à la structure : elle le crée en copiant notre modèle
   dans son propre Drive, le partage en modification par lien, puis nous donne l'URL une seule
   fois pour qu'on le pré-remplisse avec les appareils déjà livrés. Aucun accès permanent de
   notre côté après ça — juste l'URL, gardée pour permettre une actualisation ultérieure si
   la structure le souhaite (bouton "Actualiser"). */

const ENTETES_FLOTTE = ['Numéro de série', 'Marque', 'Modèle', 'Prix d\'achat de base', 'Personne', 'Statut', 'Date de livraison', 'Date de vente', 'Payé', 'Lien de paiement'];
const STATUTS_FLOTTE = ['En stock', 'Vendu', 'En SAV'];
const CHAMPS_FLOTTE_MODIFIABLES = { marque: 2, modele: 3, personne: 5, statut: 6, dateVente: 8, paye: 9 }; // colonnes 1-indexées ; num série (1), prix d'achat (4), date livraison (7) et lien paiement (10) restent en lecture seule depuis l'interface

/** Renvoie de quoi afficher le bouton "Gérer ma flotte" côté portail : soit le lien déjà
 *  enregistré (tableau déjà lié), soit le lien de copie du modèle si rien n'est encore lié. */
function flotteObtenir(data) {
  const structure = lireStructures()[String(data.code || '').trim()];
  if (!structure) return { ok: false, erreur: 'Code inconnu' };

  if (structure.lienFlotte) {
    return { ok: true, lienFlotte: structure.lienFlotte };
  }
  if (!MODELE_FLOTTE_MATERIEL) {
    return { ok: true, lienFlotte: '', lienModele: '' }; // pas encore configuré côté admin
  }
  return { ok: true, lienFlotte: '', lienModele: 'https://docs.google.com/spreadsheets/d/' + MODELE_FLOTTE_MATERIEL + '/copy' };
}

/** Appelée une fois que la structure a copié le modèle, l'a partagé en modification, et colle
 *  l'URL de sa copie. Vérifie qu'on peut bien y accéder (donc que le partage est fait), puis
 *  pré-remplit avec tous les appareils déjà livrés à cette structure. */
function flotteLier(data) {
  const code = String(data.code || '').trim();
  const structure = lireStructures()[code];
  if (!structure) return { ok: false, erreur: 'Code inconnu' };

  const id = extraireIdFichier(data.lienFlotte);
  if (!id) return { ok: false, erreur: 'Lien invalide' };

  let feuilleFlotte;
  try {
    const classeurFlotte = SpreadsheetApp.openById(id);
    feuilleFlotte = classeurFlotte.getSheets()[0];
  } catch (e) {
    return { ok: false, erreur: 'Impossible d\'accéder à ce tableau — vérifie qu\'il est bien partagé en modification via le lien (Partager → "Toute personne disposant du lien" → Éditeur), puis réessaie.' };
  }

  feuilleStructures().getRange(structure.ligne, 9).setValue(data.lienFlotte);

  let resultat;
  try {
    resultat = synchroniserFlotteMateriel(code, feuilleFlotte);
  } catch (e) {
    return { ok: true, ajoutes: 0, avertissement: 'Tableau lié, mais le pré-remplissage a échoué : ' + e.message };
  }
  return { ok: true, ajoutes: resultat.ajoutes };
}

/** Rappelable à tout moment par la structure (bouton "Actualiser") pour récupérer les
 *  appareils livrés depuis la dernière synchronisation — n'ajoute jamais de doublon (comparé
 *  aux numéros de série déjà présents en colonne A) et ne touche jamais aux lignes existantes. */
function flotteActualiser(data) {
  const code = String(data.code || '').trim();
  const structure = lireStructures()[code];
  if (!structure) return { ok: false, erreur: 'Code inconnu' };
  if (!structure.lienFlotte) return { ok: false, erreur: 'Aucun tableau flotte lié pour le moment' };

  const id = extraireIdFichier(structure.lienFlotte);
  let feuilleFlotte;
  try {
    feuilleFlotte = SpreadsheetApp.openById(id).getSheets()[0];
  } catch (e) {
    return { ok: false, erreur: 'Impossible d\'accéder au tableau — l\'accès a peut-être été retiré côté partage.' };
  }

  const resultat = synchroniserFlotteMateriel(code, feuilleFlotte);
  return { ok: true, ajoutes: resultat.ajoutes };
}

/** Cœur de la synchronisation : une ligne par numéro de série livré à cette structure et pas
 *  déjà présent dans le tableau. Le nom de la personne, la date de vente et le statut détaillé
 *  restent entièrement à la main de la structure — on ne les écrase jamais. */
function synchroniserFlotteMateriel(codeStructure, feuilleFlotte) {
  if (feuilleFlotte.getLastRow() === 0) {
    feuilleFlotte.appendRow(ENTETES_FLOTTE);
    feuilleFlotte.getRange(1, 1, 1, ENTETES_FLOTTE.length).setFontWeight('bold');
  }

  // Liste déroulante sur toute la colonne Statut (au-delà des lignes déjà remplies, pour
  // que les prochains ajouts — d'ici ou faits à la main par la structure — en bénéficient
  // aussi). Repose la règle à chaque synchronisation : sans effet si elle est déjà en place.
  const colonneStatut = ENTETES_FLOTTE.indexOf('Statut') + 1;
  const regleStatut = SpreadsheetApp.newDataValidation().requireValueInList(STATUTS_FLOTTE, true).setAllowInvalid(true).build();
  feuilleFlotte.getRange(2, colonneStatut, Math.max(feuilleFlotte.getMaxRows() - 1, 500)).setDataValidation(regleStatut);

  const donneesExistantes = feuilleFlotte.getDataRange().getValues();
  const seriesDejaPresentes = {};
  for (let i = 1; i < donneesExistantes.length; i++) {
    const s = String(donneesExistantes[i][0] || '').trim();
    if (s) seriesDejaPresentes[s] = true;
  }

  // Réutilise le même cache léger que l'admin (voir obtenirBaseCommandes) plutôt que de
  // relire Commandes/Factures/LignesCommande en entier à chaque clic sur "Actualiser" — c'est
  // ce qui rendait cette étape très lente avec beaucoup de commandes en base, pour un
  // résultat qui ne concerne pourtant qu'une seule structure.
  const baseCommandes = obtenirBaseCommandes();
  const lignesLegeresStructure = baseCommandes.toutes.filter(function(c) {
    return c.code === codeStructure && c.statutCommande === 'Livrée' && c.numerosSerie;
  });
  const completesParLigne = obtenirCommandesCompletesParLigne(baseCommandes, lignesLegeresStructure);

  const nouvellesLignes = [];

  lignesLegeresStructure.forEach(function(cLeger) {
    const c = completesParLigne[cLeger.ligne];
    if (!c) return;

    const numerosSerie = String(c.numerosSerie || '').split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
    if (!numerosSerie.length) return;

    const dateLivraison = c.dateLivraisonRaw ? Utilities.formatDate(new Date(c.dateLivraisonRaw), Session.getScriptTimeZone(), 'dd/MM/yyyy') : '';
    const paye = c.statutPaiement === 'Payé' ? 'Oui' : 'Non';
    const lienPaiement = String(c.lienPaiement || '').split('\n')[0] || ''; // premier lien si plusieurs (paiement séparé) : au moins une base à corriger à la main

    // Prix moyen par appareil pour cette commande — même approximation que pour les
    // attestations de paiement, faute de prix unitaire attaché à chaque numéro de série
    // individuellement (une commande peut mélanger plusieurs produits à prix différents).
    // montantEstime est déjà calculé par construireCommandeComplete, pas besoin de le refaire ici.
    const quantiteTotale = parseInt(c.quantite, 10) || numerosSerie.length;
    const montantCommande = c.montantFacture != null ? c.montantFacture : c.montantEstime;
    const prixParAppareil = quantiteTotale ? Math.round((montantCommande / quantiteTotale) * 100) / 100 : '';

    numerosSerie.forEach(function(numeroSerie) {
      if (seriesDejaPresentes[numeroSerie]) return;
      seriesDejaPresentes[numeroSerie] = true;
      nouvellesLignes.push([numeroSerie, '', '', prixParAppareil, '', 'En stock', dateLivraison, '', paye, lienPaiement]);
    });
  });

  if (nouvellesLignes.length) {
    feuilleFlotte.getRange(feuilleFlotte.getLastRow() + 1, 1, nouvellesLignes.length, ENTETES_FLOTTE.length).setValues(nouvellesLignes);
  }
  return { ajoutes: nouvellesLignes.length };
}

/* ══════════════ Carte de répartition géographique des structures ══════════════
   Géocodage via le service Maps intégré à Apps Script — gratuit, sans clé API à configurer.
   Chaque structure n'est géocodée qu'une seule fois (coordonnées écrites en colonnes L/M de
   la feuille Structures) : les appels suivants ne regéocodent que celles encore sans
   coordonnées (nouvelle structure, ou adresse tout juste renseignée). */
function obtenirCoordonneesStructures(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };

  const feuille = feuilleStructures();
  const lignes = feuille.getDataRange().getValues();
  const geocodeur = Maps.newGeocoder().setRegion('fr');
  const resultats = [];
  let nouvellesGeocodees = 0;

  for (let i = 1; i < lignes.length; i++) {
    if (!lignes[i][0]) continue;
    const adresse = String(lignes[i][4] || '').trim();
    if (!adresse) continue;

    let lat = lignes[i][11];
    let lng = lignes[i][12];

    if (!lat || !lng) {
      try {
        const reponse = geocodeur.geocode(adresse);
        if (reponse.status === 'OK' && reponse.results.length) {
          lat = reponse.results[0].geometry.location.lat;
          lng = reponse.results[0].geometry.location.lng;
          feuille.getRange(i + 1, 12, 1, 2).setValues([[lat, lng]]);
          nouvellesGeocodees++;
        }
      } catch (e) {
        Logger.log('Géocodage échoué pour "' + adresse + '" : ' + e);
        continue;
      }
    }

    if (lat && lng) {
      resultats.push({ code: lignes[i][0], nom: lignes[i][1], adresse: adresse, lat: lat, lng: lng });
    }
  }

  return { ok: true, structures: resultats, nouvellesGeocodees: nouvellesGeocodees };
}


/**
 * CVDL — Backend commandes matériel (source : Produits.gs, 4 sur 8 — lignes de commande + catalogue produits/stock)
 * Fait partie de backend/*.gs — voir Config.gs pour les instructions de génération.
 */

/* ══════════════ Lignes de commande (détail multi-produits) ══════════════
   Une commande "chapeau" reste dans Commandes (référence, structure, statut, paiement...),
   mais son détail produit vit ici, une ligne par produit choisi. Les colonnes Produit/Quantité
   de la feuille Commandes deviennent un résumé (ex. "2× Ordinateur Fixe, 1× Souris") et un
   total, calculés à partir de ces lignes — jamais éditées directement.
   Les commandes créées AVANT ce changement n'ont aucune ligne ici : lireLignesCommande()
   reconstitue alors une ligne unique à partir des anciennes colonnes Produit/Quantité de
   Commandes, pour qu'elles continuent de fonctionner sans migration. */

function feuilleLignesCommande() {
  const classeur = classeurActif();
  let feuille = classeur.getSheetByName(ONGLET_LIGNES_COMMANDE);
  if (!feuille) {
    feuille = classeur.insertSheet(ONGLET_LIGNES_COMMANDE);
    feuille.appendRow(ENTETES_LIGNES_COMMANDE);
    feuille.getRange(1, 1, 1, ENTETES_LIGNES_COMMANDE.length).setFontWeight('bold');
    feuille.setFrozenRows(1);
  }
  return feuille;
}

/** Renvoie les lignes {ligne, produit, quantite} d'une commande, dans l'ordre d'écriture.
 *  Repli automatique sur l'ancienne commande à produit unique si rien n'est trouvé ici. */
function lireLignesCommande(referenceCommande, produitReplique, quantiteReplique) {
  const lignes = feuilleLignesCommande().getDataRange().getValues();
  const resultat = [];
  for (let i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]).trim() === referenceCommande) {
      resultat.push({ ligne: i + 1, produit: lignes[i][1], quantite: parseInt(lignes[i][2], 10) || 0 });
    }
  }
  if (!resultat.length && produitReplique) {
    resultat.push({ ligne: null, produit: produitReplique, quantite: parseInt(quantiteReplique, 10) || 0 });
  }
  return resultat;
}

/** Construit le résumé texte ("2× Ordinateur Fixe, 1× Souris") et le total de quantité,
 *  à partir d'un tableau de lignes {produit, quantite}. */
function resumerLignes(lignes) {
  const resume = lignes.map(function(l) { return l.quantite + '× ' + l.produit; }).join(', ');
  const total = lignes.reduce(function(s, l) { return s + l.quantite; }, 0);
  return { resume: resume, total: total };
}

/** Quantité max applicable à un produit donné : son propre réglage s'il existe, sinon
 *  le réglage global par défaut (ou son équivalent ESN si `estEsn` est vrai). */
function quantiteMaxPourProduit(produit, estEsn) {
  if (produit && produit.quantiteMax) return produit.quantiteMax;
  return estEsn ? QUANTITE_MAX_DEFAUT_ESN : QUANTITE_MAX_DEFAUT;
}

/* ══════════════ Produits ══════════════ */

function feuilleProduits() {
  const classeur = obtenirClasseur();
  let feuille = classeur.getSheetByName(ONGLET_PRODUITS);

  if (!feuille) {
    feuille = classeur.insertSheet(ONGLET_PRODUITS);
    feuille.appendRow(ENTETES_PRODUITS);
    feuille.getRange(1, 1, 1, ENTETES_PRODUITS.length).setFontWeight('bold');
    feuille.setFrozenRows(1);
  }
  return feuille;
}

function lireProduits() {
  const lignes = feuilleProduits().getDataRange().getValues();
  const produits = {};

  for (let i = 1; i < lignes.length; i++) {
    const nom = String(lignes[i][0] || '').trim();
    if (!nom) continue;
    produits[nom] = {
      ligne:          i + 1,
      nom:            nom,
      prixStandard:   parseFloat(lignes[i][1]) || 0,
      prixRN:         parseFloat(lignes[i][2]) || 0,
      stock:          parseInt(lignes[i][3], 10) || 0,
      visible:        lignes[i][4] === true || String(lignes[i][4]).trim().toUpperCase() === 'TRUE',
      messageRupture: String(lignes[i][5] || '').trim(),
      disque:         String(lignes[i][6] || '').trim(),
      ram:            String(lignes[i][7] || '').trim(),
      systeme:        String(lignes[i][8] || '').trim(),
      icone:          String(lignes[i][9] || '').trim(),
      quantiteMax:    parseInt(lignes[i][10], 10) || 0, // 0 = pas de limite propre, utilise le réglage global
      skuTectech:     String(lignes[i][11] || '').trim()
    };
  }
  return produits;
}

/** Vue publique du catalogue, utilisée par le formulaire de commande.
 *  Le prix affiché est celui qui s'appliquerait réellement à cette structure
 *  (RN ou non) — jamais le statut RN lui-même, seulement le montant qui en résulte. */
function listerProduitsPublic(code) {
  const structure = code ? lireStructures()[String(code).trim()] : null;
  const estEsn = structure ? !!(structure.esn || structure.interne) : false;

  const produits = Object.values(lireProduits());
  return {
    ok: true,
    produits: produits.map(p => {
      const calcul = estEsn ? null : calculerPrixUnitaire(code, p.nom);
      return {
        nom:            p.nom,
        visible:        p.visible,
        disponible:     p.visible && p.stock > 0,
        stock:          p.stock,
        messageRupture: p.messageRupture || 'Ce produit est temporairement indisponible.',
        disque:         p.disque,
        ram:            p.ram,
        systeme:        p.systeme,
        icone:          p.icone,
        prixUnitaire:   estEsn ? null : (calcul ? calcul.prixUnitaire : p.prixStandard),
        quantiteMax:    p.quantiteMax || (estEsn ? QUANTITE_MAX_DEFAUT_ESN : QUANTITE_MAX_DEFAUT)
      };
    })
  };
}

/** ⚠️ STUB EN ATTENTE D'ACCÈS API — ne fait rien de réel pour l'instant.
 *  Une fois l'API Tech.tec disponible : remplacer le contenu de ce bloc par un appel
 *  UrlFetchApp.fetch(...) vers leur endpoint stock, mettre à jour la colonne Stock de
 *  chaque produit correspondant, puis renvoyer la liste à jour comme listerProduits().
 *  Volontairement déclenché uniquement par un bouton dédié (jamais en tâche de fond) :
 *  l'API étant en lecture seule côté Tech.tec, il n'y a aucune notion de "temps réel" —
 *  ce que l'admin verra est une photo prise au moment du clic, pas un flux continu. */
function synchroniserStockTectech(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  return { ok: false, erreur: 'Synchronisation Tech.tec pas encore disponible — accès API en attente.' };
}

function listerProduits(password) {
  if (password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  return { ok: true, produits: Object.values(lireProduits()) };
}

function creerProduit(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };

  const nom = String(data.nom || '').trim();
  if (!nom) return { ok: false, erreur: 'Le nom du produit est obligatoire' };
  if (lireProduits()[nom]) return { ok: false, erreur: 'Ce produit existe déjà' };

  const prixStandard = parseFloat(data.prixStandard);
  const prixRN        = parseFloat(data.prixRN);
  const stock          = parseInt(data.stock, 10);

  if (isNaN(prixStandard) || prixStandard < 0) return { ok: false, erreur: 'Prix standard invalide' };
  if (isNaN(prixRN) || prixRN < 0)              return { ok: false, erreur: 'Prix RN invalide' };
  if (isNaN(stock) || stock < 0)                return { ok: false, erreur: 'Stock invalide' };

  const feuille = feuilleProduits();
  feuille.appendRow([
    nom, prixStandard, prixRN, stock,
    data.visible !== false && data.visible !== 'false',
    String(data.messageRupture || '').trim(),
    String(data.disque || '').trim(),
    String(data.ram || '').trim(),
    String(data.systeme || '').trim(),
    String(data.icone || '').trim(),
    data.quantiteMax ? parseInt(data.quantiteMax, 10) : ''
  ]);
  feuille.getRange(feuille.getLastRow(), 5).insertCheckboxes();

  return { ok: true };
}

function majProduit(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };

  const colonnes = {
    nom: 1, prixStandard: 2, prixRN: 3, stock: 4, visible: 5, messageRupture: 6,
    disque: 7, ram: 8, systeme: 9, icone: 10, quantiteMax: 11, skuTectech: 12
  };
  const colonne = colonnes[data.champ];
  if (!colonne) return { ok: false, erreur: 'Champ inconnu' };

  let valeur = data.valeur;

  if (data.champ === 'visible') {
    valeur = valeur === true || valeur === 'true';
  } else if (data.champ === 'prixStandard' || data.champ === 'prixRN' || data.champ === 'stock') {
    valeur = parseFloat(valeur);
    if (isNaN(valeur) || valeur < 0) return { ok: false, erreur: 'Valeur numérique invalide' };
  } else if (data.champ === 'quantiteMax') {
    valeur = valeur === '' ? '' : parseInt(valeur, 10);
    if (valeur !== '' && (isNaN(valeur) || valeur < 1)) return { ok: false, erreur: 'Quantité max invalide' };
  } else {
    valeur = String(valeur || '').trim();
  }

  feuilleProduits().getRange(data.ligne, colonne).setValue(valeur);
  return { ok: true };
}

function supprimerProduit(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  feuilleProduits().deleteRow(data.ligne);
  return { ok: true };
}

/**
 * CVDL — Backend commandes matériel (source : Commandes.gs, 5 sur 8 — création, modification, cycle de vie des commandes)
 * Fait partie de backend/*.gs — voir Config.gs pour les instructions de génération.
 */

/* ══════════════ Commandes ══════════════ */

/** Ajoute plusieurs lignes de détail de commande en un seul appel Sheets (une plage de
 *  cellules écrite d'un coup), au lieu d'un appendRow() par ligne de produit. */
function ajouterLignesCommande(feuilleLignes, reference, lignes) {
  if (!lignes || !lignes.length) return;
  const matrice = lignes.map(function(l) { return [reference, l.produit, l.quantite]; });
  feuilleLignes.getRange(feuilleLignes.getLastRow() + 1, 1, matrice.length, 3).setValues(matrice);
}

/** Décrémente le stock de plusieurs produits en une seule lecture + une seule écriture,
 *  au lieu d'un aller-retour Sheets par produit. `demandeParProduit` est un objet
 *  { nomProduit: quantiteADecrementer, ... }. */
function decrementerStocks(demandeParProduit) {
  const noms = Object.keys(demandeParProduit);
  if (!noms.length) return;

  const feuille = feuilleProduits();
  const derniereLigne = feuille.getLastRow();
  if (derniereLigne < 2) return;

  const plage = feuille.getRange(2, 1, derniereLigne - 1, 4); // colonnes A (nom) → D (stock)
  const valeurs = plage.getValues();

  for (let i = 0; i < valeurs.length; i++) {
    const nom = String(valeurs[i][0] || '').trim();
    if (Object.prototype.hasOwnProperty.call(demandeParProduit, nom)) {
      const stockActuel = parseInt(valeurs[i][3], 10) || 0;
      valeurs[i][3] = Math.max(0, stockActuel - demandeParProduit[nom]);
    }
  }

  plage.setValues(valeurs);
}

function feuilleCommandes() {
  const classeur = classeurActif();
  let feuille = classeur.getSheetByName(ONGLET_COMMANDES);

  if (!feuille) {
    feuille = classeur.insertSheet(ONGLET_COMMANDES);
    feuille.appendRow(ENTETES_COMMANDES);
    feuille.getRange(1, 1, 1, ENTETES_COMMANDES.length).setFontWeight('bold');
    feuille.setFrozenRows(1);
  }
  return feuille;
}

/** Limite le nombre de commandes qu'un même code peut soumettre en une heure.
 *  Une protection contre l'abus si un code venait à fuiter, pas une gêne
 *  pour un usage normal (une structure ne passe jamais 5 commandes en 1h). */
function verifierLimiteSoumissions(code) {
  const cache = CacheService.getScriptCache();
  const cle = 'soumissions_' + code;
  const compte = parseInt(cache.get(cle) || '0', 10);
  if (compte >= LIMITE_SOUMISSIONS_PAR_HEURE) return false;
  cache.put(cle, String(compte + 1), 3600);
  return true;
}

function creerCommande(data) {
  const structure = lireStructures()[String(data.code || '').trim()];
  if (!structure) return { ok: false, erreur: 'Code structure invalide' };

  if (!verifierLimiteSoumissions(structure.code)) {
    journaliserEvenementSecurite('Limite de soumissions atteinte', structure.code);
    return { ok: false, erreur: 'Trop de commandes envoyées récemment avec ce code. Merci de réessayer plus tard ou de nous contacter.' };
  }

  // data.lignes = [{produit, quantite}, ...] — nouveau format multi-produits.
  // Repli sur l'ancien format à un seul produit, le temps de la transition du formulaire public.
  let lignesDemandees = Array.isArray(data.lignes) ? data.lignes : null;
  if (!lignesDemandees) {
    const nomProduitUnique = String(data.produit || data.typeMateriel || '').trim();
    if (nomProduitUnique) lignesDemandees = [{ produit: nomProduitUnique, quantite: data.quantite }];
  }
  if (!lignesDemandees || !lignesDemandees.length) return { ok: false, erreur: 'Aucun produit choisi' };
  if (lignesDemandees.length > MAX_LIGNES_PAR_COMMANDE) {
    return { ok: false, erreur: 'Trop de produits différents dans cette commande (maximum ' + MAX_LIGNES_PAR_COMMANDE + ')' };
  }
  if (!data.moyenPaiement) return { ok: false, erreur: 'Moyen de paiement manquant' };

  const produits = lireProduits();
  const lignesValidees = [];
  for (const l of lignesDemandees) {
    const nomProduit = String(l.produit || '').trim();
    const quantite = parseInt(l.quantite, 10);
    if (!nomProduit) return { ok: false, erreur: 'Produit manquant sur une des lignes' };

    const produit = produits[nomProduit];
    if (!produit || !produit.visible) {
      return { ok: false, erreur: 'Ce produit n\'est pas disponible à la commande : ' + nomProduit };
    }
    const maxPourCeProduit = quantiteMaxPourProduit(produit, !!(structure.esn || structure.interne));
    if (!quantite || quantite < 1 || quantite > maxPourCeProduit) {
      return { ok: false, erreur: 'Quantité invalide pour "' + nomProduit + '" (1 à ' + maxPourCeProduit + ')' };
    }
    lignesValidees.push({ produit: nomProduit, quantite: quantite });
  }

  // Agrège par produit (au cas où le même produit apparaîtrait sur deux lignes) avant de vérifier le stock
  const demandeParProduit = {};
  lignesValidees.forEach(function(l) { demandeParProduit[l.produit] = (demandeParProduit[l.produit] || 0) + l.quantite; });
  for (const nomProduit in demandeParProduit) {
    if (produits[nomProduit].stock < demandeParProduit[nomProduit]) {
      return { ok: false, erreur: 'Stock insuffisant pour "' + nomProduit + '"' };
    }
  }

  let fichiers = null;
  if (data.fichiers && data.fichiers.length) fichiers = data.fichiers;
  else if (data.fichier && data.fichier.base64) fichiers = [data.fichier]; // compatibilité ancien envoi

  const infosResumees = resumerLignes(lignesValidees);

  // Détection de doublon — ne bloque jamais l'envoi (un vrai échec de connexion suivi d'un
  // second essai légitime ne doit jamais être empêché), juste un signal pour l'admin à vérifier
  // manuellement : même structure, même contenu, dans les 10 dernières minutes.
  const commentaireDoublon = detecterCommandeDoublonRecente(structure.code, infosResumees.resume)
    ? '⚠️ DOUBLON POTENTIEL DÉTECTÉ : une commande très similaire de cette structure a été reçue il y a moins de 10 minutes — vérifier avant de traiter les deux.\n\n'
    : '';
  const commentaireFinal = commentaireDoublon + String(data.commentaire || '');

  const resultat = inserer(structure, infosResumees.resume, infosResumees.total, data.moyenPaiement, fichiers, commentaireFinal, null, null, null, !!data.demandeDevis, data.personnes, data.paiementSepare);

  // Écrit le détail des lignes, puis décrémente le stock — chacun en un seul appel Sheets,
  // quel que soit le nombre de produits différents dans la commande.
  ajouterLignesCommande(feuilleLignesCommande(), resultat.reference, lignesValidees);
  decrementerStocks(demandeParProduit);

  let montant = 0;
  lignesValidees.forEach(function(l) {
    const calcul = calculerPrixUnitaire(structure.code, l.produit);
    if (calcul) montant += calcul.prixUnitaire * l.quantite;
  });

  // Notifications email best-effort : une erreur d'envoi ne doit jamais faire échouer la commande
  try {
    notifierNouvelleCommande(resultat.reference, structure.nom, infosResumees.resume, infosResumees.total);
  } catch (e) {
    Logger.log('Échec envoi notification email admin pour ' + resultat.reference + ' : ' + e);
  }
  try {
    notifierStructureNouvelleCommande(resultat.reference, structure, infosResumees.resume, montant, data.urlSuivi, data.urlPortail);
  } catch (e) {
    Logger.log('Échec envoi confirmation email structure pour ' + resultat.reference + ' : ' + e);
  }

  return { ok: true, reference: resultat.reference, montant: montant };
}

/** Création depuis le back-office : mêmes règles de stock, mais date et
 *  statuts choisis librement (utile pour rattraper une commande passée). */
function creerCommandeManuelle(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };

  const structure = lireStructures()[String(data.code || '').trim()];
  if (!structure) return { ok: false, erreur: 'Structure introuvable pour ce code' };

  let lignesDemandees = Array.isArray(data.lignes) ? data.lignes : null;
  if (!lignesDemandees) {
    const nomProduitUnique = String(data.produit || '').trim();
    if (nomProduitUnique) lignesDemandees = [{ produit: nomProduitUnique, quantite: data.quantite }];
  }
  if (!lignesDemandees || !lignesDemandees.length) return { ok: false, erreur: 'Aucun produit choisi' };
  if (lignesDemandees.length > MAX_LIGNES_PAR_COMMANDE) {
    return { ok: false, erreur: 'Trop de produits différents (maximum ' + MAX_LIGNES_PAR_COMMANDE + ')' };
  }
  if (!data.moyenPaiement) return { ok: false, erreur: 'Moyen de paiement manquant' };

  const produits = lireProduits();
  const lignesValidees = [];
  for (const l of lignesDemandees) {
    const nomProduit = String(l.produit || '').trim();
    const quantite = parseInt(l.quantite, 10);
    if (!nomProduit) return { ok: false, erreur: 'Produit manquant sur une des lignes' };

    const produit = produits[nomProduit];
    if (!produit) return { ok: false, erreur: 'Produit introuvable au catalogue : ' + nomProduit };
    const maxPourCeProduit = quantiteMaxPourProduit(produit, !!(structure.esn || structure.interne));
    if (!quantite || quantite < 1 || quantite > maxPourCeProduit) {
      return { ok: false, erreur: 'Quantité invalide pour "' + nomProduit + '" (1 à ' + maxPourCeProduit + ')' };
    }
    lignesValidees.push({ produit: nomProduit, quantite: quantite });
  }

  const demandeParProduit = {};
  lignesValidees.forEach(function(l) { demandeParProduit[l.produit] = (demandeParProduit[l.produit] || 0) + l.quantite; });
  for (const nomProduit in demandeParProduit) {
    if (produits[nomProduit].stock < demandeParProduit[nomProduit]) {
      return { ok: false, erreur: 'Stock insuffisant pour "' + nomProduit + '"' };
    }
  }

  const date = data.date ? new Date(data.date) : new Date();
  const statutCommande = data.statutCommande || 'Reçue';
  const statutPaiement = data.statutPaiement || 'Non payé';

  const infosResumees = resumerLignes(lignesValidees);
  const resultat = inserer(structure, infosResumees.resume, infosResumees.total, data.moyenPaiement, null, data.commentaire, date, statutCommande, statutPaiement, false);

  ajouterLignesCommande(feuilleLignesCommande(), resultat.reference, lignesValidees);
  decrementerStocks(demandeParProduit);

  let montant = 0;
  lignesValidees.forEach(function(l) {
    const calcul = calculerPrixUnitaire(structure.code, l.produit);
    if (calcul) montant += calcul.prixUnitaire * l.quantite;
  });
  try {
    notifierStructureNouvelleCommande(resultat.reference, structure, infosResumees.resume, montant, data.urlSuivi, data.urlPortail);
  } catch (e) {
    Logger.log('Échec envoi confirmation email structure pour ' + resultat.reference + ' : ' + e);
  }

  return { ok: true, reference: resultat.reference };
}

/** Modèle de nommage des commandes, même principe que celui des devis.
 *  Jetons disponibles : {ANNEE} et {NUM} (numéro séquentiel, complété à 4 chiffres). */
const MODELE_COMMANDE_DEFAUT = 'CVDL-{ANNEE}-{NUM}';

function obtenirModeleCommande() {
  return PropertiesService.getScriptProperties().getProperty('MODELE_COMMANDE') || MODELE_COMMANDE_DEFAUT;
}

function definirModeleCommande(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  const modele = String(data.modele || '').trim();
  if (!modele) return { ok: false, erreur: 'Modèle vide' };
  if (modele.indexOf('{NUM}') === -1) return { ok: false, erreur: 'Le modèle doit contenir le jeton {NUM}' };
  PropertiesService.getScriptProperties().setProperty('MODELE_COMMANDE', modele);
  return { ok: true, modele: modele };
}

/** Logique d'insertion commune aux deux points d'entrée ci-dessus — écrit la ligne "chapeau"
 *  de Commandes à partir d'un résumé texte et d'une quantité totale déjà calculés par
 *  l'appelant. Ne touche plus au stock elle-même : chaque appelant décrémente lui-même,
 *  produit par produit, puisqu'une commande peut désormais en contenir plusieurs. */
/** Doublon potentiel : même structure, même résumé produit, commande reçue il y a moins de
 *  10 minutes. Sert uniquement à prévenir l'admin (jamais à bloquer) — le cas typique est une
 *  connexion qui plante côté navigateur après que la commande a pourtant bien été enregistrée,
 *  poussant la structure à réessayer en pensant que rien n'est parti. */
function detecterCommandeDoublonRecente(codeStructure, resumeProduit) {
  const FENETRE_MINUTES = 10;
  const maintenant = new Date();
  const lignes = feuilleCommandes().getDataRange().getValues();

  for (let i = lignes.length - 1; i >= 1; i--) {
    const l = lignes[i];
    if (!l[0]) continue;
    if (String(l[2] || '').trim() !== codeStructure) continue;
    const dateCommande = l[1] ? new Date(l[1]) : null;
    if (!dateCommande) continue;
    const ecartMinutes = (maintenant - dateCommande) / 60000;
    if (ecartMinutes > FENETRE_MINUTES) break; // les lignes sont dans l'ordre chronologique : au-delà, inutile de continuer
    if (String(l[7] || '').trim() === resumeProduit) return true;
  }
  return false;
}

function inserer(structure, resumeProduits, quantiteTotale, moyenPaiement, fichiers, commentaire, dateForcee, statutCommande, statutPaiement, devisDemande, personnes, paiementSepare) {
  const feuille  = feuilleCommandes();
  const annee    = (dateForcee || new Date()).getFullYear();
  const numero   = feuille.getLastRow();
  const reference = obtenirModeleCommande()
    .replace('{ANNEE}', annee)
    .replace('{NUM}', String(numero).padStart(4, '0'));
  const date = dateForcee || new Date();

  let lienDossier = '';
  let nombreFichiers = 0;
  if (fichiers && fichiers.length) {
    const resultatFichiers = enregistrerFichiers(fichiers, reference, structure.nom, date);
    lienDossier = resultatFichiers.url;
    nombreFichiers = resultatFichiers.count;
  }

  feuille.appendRow([
    reference,
    date,
    structure.code,
    structure.nom,
    structure.email,
    structure.telephone,
    structure.adresse,
    resumeProduits,
    quantiteTotale,
    moyenPaiement,
    lienDossier,
    statutCommande || 'Reçue',
    statutPaiement || 'Non payé',
    '',
    String(commentaire || '').slice(0, 1000),
    '',
    nombreFichiers,
    '',
    '',
    '',
    '',
    devisDemande ? 'Oui' : '',
    '', // Suivi Colissimo
    '', // Date de livraison
    '', // Fichier CSV tec.tech
    '', // Caractéristiques matériel
    '', // Bon de livraison
    (personnes && personnes.length) ? personnes.filter(function(p){ return String(p || '').trim(); }).join('\n') : '',
    '', // Dernier clic lien de paiement
    '', // Jeton validation logistique
    '', // Date de livraison souhaitée
    paiementSepare === 'Oui' ? 'Oui' : 'Non'
  ]);

  invaliderCacheCommandes();
  return { reference: reference };
}

/** Confirmation automatique à la structure elle-même — toujours silencieuse (jamais de
 *  confirmation admin à faire), best-effort comme la notification interne ci-dessus.
 *  urlSuivi est fourni par le front (dérivé de sa propre URL, cf. urlFormulairePublic côté
 *  admin.html) : le backend ne connaît pas l'adresse à laquelle il est hébergé. */
function notifierStructureNouvelleCommande(reference, structure, resumeProduit, montant, urlSuivi, urlPortail) {
  const email = String(structure.email || '').trim();
  if (!email) return;

  const estEsnOuInterne = !!(structure.esn || structure.interne);
  const ligneMontant = estEsnOuInterne ? '' : ('Montant estimé : ' + Math.round(montant) + ' €\n');
  const ligneSuivi = urlSuivi
    ? ('\nVous pouvez suivre son avancement à tout moment avec votre code structure, ici :\n' + urlSuivi + '\n')
    : '';
  const lignePortail = urlPortail
    ? ('\nPour retrouver l\'ensemble de votre espace (commander, suivre, signaler une panne), votre portail structure :\n' + urlPortail + '\n')
    : '';

  MailApp.sendEmail({
    to: email,
    subject: 'Commande bien reçue — ' + reference,
    body:
      'Bonjour,\n\n' +
      'Nous avons bien reçu votre commande ' + reference + ' (' + resumeProduit + ').\n' +
      ligneMontant +
      ligneSuivi +
      lignePortail + '\n' +
      'Cordialement,\n' + NOM_ORGANISATION
  });
}

function notifierNouvelleCommande(reference, nomStructure, nomProduit, quantite) {
  if (!ADMIN_EMAIL) {
    Logger.log('Notification email ignorée (ADMIN_EMAIL non renseigné en haut du script) pour ' + reference);
    return;
  }
  MailApp.sendEmail({
    to: ADMIN_EMAIL,
    subject: 'Nouvelle commande — ' + reference,
    body:
      'Une nouvelle commande vient d\'être reçue.\n\n' +
      'Référence : ' + reference + '\n' +
      'Structure : ' + nomStructure + '\n' +
      'Produit : ' + quantite + ' × ' + nomProduit + '\n\n' +
      'Ouvre le back-office pour la traiter.'
  });
}

/** Crée un sous-dossier dédié à la commande et y dépose 1 à N fichiers.
 *  Chaque fichier est revérifié en taille ici : la limite côté navigateur
 *  peut toujours être contournée par un appel direct au script. */
function enregistrerFichiers(fichiers, reference, nomStructure, date) {
  const maxOctets = MAX_FICHIER_MO * 1024 * 1024;

  for (const fichier of fichiers) {
    if (!fichier || !fichier.base64) continue;
    // Une chaîne base64 fait grosso modo 4/3 de la taille réelle du fichier
    const octetsApprox = fichier.base64.length * 0.75;
    if (octetsApprox > maxOctets) {
      throw new Error('Le fichier "' + (fichier.nom || '') + '" dépasse ' + MAX_FICHIER_MO + ' Mo');
    }
  }

  const racine = sousDossier('Pièces jointes commandes');

  const dateFormatee = Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd-MM-yyyy');
  const nomDossier = reference + ' — ' + dateFormatee + ' — ' + nomStructure;
  const dossier = racine.createFolder(nomDossier);

  let compte = 0;
  fichiers.forEach((fichier, index) => {
    if (!fichier || !fichier.base64) return;
    const octets = Utilities.base64Decode(fichier.base64);
    const blob = Utilities.newBlob(octets, fichier.type || 'application/octet-stream', fichier.nom || ('fichier-' + (index + 1)));
    dossier.createFile(blob);
    compte++;
  });

  return { url: dossier.getUrl(), count: compte };
}

/** Importe un CSV tec.tech pour une commande donnée : dépôt dans le dossier Drive dédié
 *  (sous-dossier "CSV Tec.Tech" du dossier principal), et lien persistant écrit sur la ligne de la commande. Le
 *  parsing de la colonne G (numéros de série) se fait côté client, avant l'appel — ici
 *  on ne fait que conserver le fichier et son lien. */
/** Même principe que genererFacturePdf/genererDevisPdf : copie d'un modèle Sheets dédié avec
 *  jetons remplacés. L'URL de la copie est écrite sur la commande elle-même (colonne 27),
 *  ce qui la rend retrouvable ensuite dans l'admin et dans le suivi structure. */
function genererBonLivraisonPdf(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  if (!MODELE_BON_LIVRAISON) return { ok: false, erreur: 'Aucun modèle de bon de livraison configuré (Réglages)' };

  const ligne = parseInt(data.ligne, 10);
  if (!ligne) return { ok: false, erreur: 'Commande introuvable' };

  const feuille = feuilleCommandes();
  const c = feuille.getRange(ligne, 1, 1, ENTETES_COMMANDES.length).getValues()[0];
  const [reference, dateCommande, codeStructure, nomStructure, email, telephone, adresse,
         resumeProduit, quantiteTotale] = c;
  if (!reference) return { ok: false, erreur: 'Commande introuvable' };

  const numerosSerie = String(c[15] || '').trim();

  const jetons = Object.assign(jetonsProduitsNumerotes(reference, resumeProduit, quantiteTotale, codeStructure), {
    '{{STRUCTURE}}': nomStructure || '',
    '{{ADRESSE}}': adresse || '',
    '{{EMAIL}}': email || '',
    '{{TELEPHONE}}': telephone || '',
    '{{REFERENCE_COMMANDE}}': reference,
    '{{DATE}}': Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy'),
    '{{NUMEROS_SERIE}}': numerosSerie,
    '{{RESPONSABLE_NOM}}': RESPONSABLE_NOM,
    '{{RESPONSABLE_TELEPHONE}}': RESPONSABLE_TELEPHONE,
    '{{RESPONSABLE_EMAIL}}': RESPONSABLE_EMAIL
  });

  const nomFichier = 'Bon de livraison ' + reference;

  let copie;
  try {
    const modeleFichier = DriveApp.getFileById(MODELE_BON_LIVRAISON);
    const dossierCible = sousDossier('Bons de livraison');
    copie = modeleFichier.makeCopy(nomFichier, dossierCible);
    // Le dossier n'est pas forcément partagé avec qui doit ouvrir ce lien (structure,
    // logistique...) — on rend donc CE fichier accessible par lien, sans dépendre du
    // partage du dossier qui le contient.
    copie.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    return { ok: false, erreur: 'Copie du modèle impossible : ' + e.message };
  }

  const classeurCopie = SpreadsheetApp.openById(copie.getId());
  classeurCopie.getSheets().forEach(function(f) {
    Object.keys(jetons).forEach(function(jeton) {
      f.createTextFinder(jeton).matchEntireCell(false).replaceAllWith(jetons[jeton]);
    });
  });
  SpreadsheetApp.flush();

  feuille.getRange(ligne, 27).setValue(copie.getUrl());
  return { ok: true, url: copie.getUrl() };
}

/** Bon d'orientation — depuis que les personnes ne joignent plus leur propre document mais
 *  saisissent juste leur nom, c'est nous qui remplissons le document officiel à partir de
 *  cette liste. Même principe de copie de modèle que le bon de livraison. */
function genererBonOrientationPdf(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  if (!MODELE_BON_ORIENTATION) return { ok: false, erreur: 'Aucun modèle de bon d\'orientation configuré (Réglages)' };

  const ligne = parseInt(data.ligne, 10);
  if (!ligne) return { ok: false, erreur: 'Commande introuvable' };

  const feuille = feuilleCommandes();
  const c = feuille.getRange(ligne, 1, 1, ENTETES_COMMANDES.length).getValues()[0];
  const [reference, , codeStructure, nomStructure, email, telephone, adresse, resumeProduit, quantiteTotale] = c;
  if (!reference) return { ok: false, erreur: 'Commande introuvable' };

  const personnes = String(c[27] || '').split('\n').map(function(s) { return s.trim().split('|')[0].trim(); }).filter(Boolean);

  const jetons = Object.assign(jetonsProduitsNumerotes(reference, resumeProduit, quantiteTotale, codeStructure), {
    '{{STRUCTURE}}': nomStructure || '',
    '{{ADRESSE}}': adresse || '',
    '{{EMAIL}}': email || '',
    '{{TELEPHONE}}': telephone || '',
    '{{REFERENCE_COMMANDE}}': reference,
    '{{DATE}}': Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy'),
    '{{PERSONNES}}': personnes.join('\n'),
    '{{NOMBRE_PERSONNES}}': String(personnes.length),
    '{{RESPONSABLE_NOM}}': RESPONSABLE_NOM,
    '{{RESPONSABLE_TELEPHONE}}': RESPONSABLE_TELEPHONE,
    '{{RESPONSABLE_EMAIL}}': RESPONSABLE_EMAIL
  });

  const nomFichier = 'Bon orientation ' + reference;

  let copie;
  try {
    const modeleFichier = DriveApp.getFileById(MODELE_BON_ORIENTATION);
    const dossierCible = sousDossier('Bons d\'orientation');
    copie = modeleFichier.makeCopy(nomFichier, dossierCible);
    copie.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    return { ok: false, erreur: 'Copie du modèle impossible : ' + e.message };
  }

  const classeurCopie = SpreadsheetApp.openById(copie.getId());
  classeurCopie.getSheets().forEach(function(f) {
    Object.keys(jetons).forEach(function(jeton) {
      f.createTextFinder(jeton).matchEntireCell(false).replaceAllWith(jetons[jeton]);
    });
  });
  SpreadsheetApp.flush();

  feuille.getRange(ligne, 11).setValue(copie.getUrl()); // colonne 11 = Bon d'orientation
  return { ok: true, url: copie.getUrl() };
}

/** Une attestation par personne — appariée avec les numéros de série et leurs
 *  caractéristiques (colonnes 16 et 26) par position dans la liste : la Nème personne
 *  saisie correspond au Nème numéro de série renseigné. C'est une approximation
 *  raisonnable (pas de lien strict en base entre une personne et un appareil précis),
 *  à vérifier visuellement avant envoi — pas quelque chose à automatiser à l'aveugle.
 *  Le prix est le montant moyen de la commande (montant total / quantité), faute de
 *  prix unitaire par ligne individuelle attaché à chaque personne. */
function genererAttestationsPaiement(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  if (!MODELE_ATTESTATION_PAIEMENT) return { ok: false, erreur: 'Aucun modèle d\'attestation de paiement configuré (Réglages)' };
  if (!DOSSIER_PRINCIPAL) return { ok: false, erreur: 'Aucun dossier Drive principal configuré (Réglages)' };

  const ligne = parseInt(data.ligne, 10);
  if (!ligne) return { ok: false, erreur: 'Commande introuvable' };

  const feuille = feuilleCommandes();
  const c = feuille.getRange(ligne, 1, 1, ENTETES_COMMANDES.length).getValues()[0];
  const [reference, dateCommande, codeStructure] = c;
  if (!reference) return { ok: false, erreur: 'Commande introuvable' };

  const personnesBrutes = String(c[27] || '').split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
  if (!personnesBrutes.length) return { ok: false, erreur: 'Aucune personne renseignée pour cette commande' };

  // Format "nom complet|date de naissance|produit" — avec repli sur l'ancien format (juste
  // un nom, sans date ni produit) pour les commandes enregistrées avant ce changement.
  const personnes = personnesBrutes.map(function(ligne) {
    const parties = ligne.split('|');
    return {
      nomComplet: (parties[0] || '').trim(),
      dateNaissance: (parties[1] || '').trim(),
      produit: (parties[2] || '').trim()
    };
  });

  const numerosSerie = String(c[15] || '').split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
  const caracteristiquesBrutes = String(c[25] || '').split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
  const specsParSerie = {};
  caracteristiquesBrutes.forEach(function(ligneSpec) {
    const sep = ligneSpec.indexOf(':');
    if (sep === -1) return;
    specsParSerie[ligneSpec.slice(0, sep).trim()] = ligneSpec.slice(sep + 1).trim();
  });

  const structure = lireStructures()[String(codeStructure || '').trim()];
  const dateVente = dateCommande ? Utilities.formatDate(new Date(dateCommande), Session.getScriptTimeZone(), 'dd/MM/yyyy') : '';

  const dossier = sousDossier('Attestations de paiement');

  const modeleFichier = DriveApp.getFileById(MODELE_ATTESTATION_PAIEMENT);
  const resultats = [];

  personnes.forEach(function(personne, i) {
    const numeroSerie = numerosSerie[i] || '';
    const specs = specsParSerie[numeroSerie] || '';
    // Prix réel du produit de cette personne — plus précis qu'une moyenne sur toute la
    // commande, maintenant qu'on sait exactement quel appareil lui revient.
    const calculPrix = personne.produit ? calculerPrixUnitaire(codeStructure, personne.produit) : null;
    const prixPersonne = calculPrix ? calculPrix.prixUnitaire : 0;

    const jetons = {
      '{{NOM_COMPLET}}': personne.nomComplet,
      '{{DATE_NAISSANCE}}': personne.dateNaissance,
      '{{STRUCTURE}}': structure ? structure.nom : '',
      '{{REFERENCE_COMMANDE}}': reference,
      '{{PRIX}}': formaterMontantPourModele(prixPersonne),
      '{{PRODUIT}}': personne.produit,
      '{{MARQUE_MODELE}}': specs || personne.produit,
      '{{DATE_VENTE}}': dateVente,
      '{{NUMERO_SERIE}}': numeroSerie,
      '{{RESPONSABLE_NOM}}': RESPONSABLE_NOM,
      '{{RESPONSABLE_TELEPHONE}}': RESPONSABLE_TELEPHONE,
      '{{RESPONSABLE_EMAIL}}': RESPONSABLE_EMAIL
    };

    const nomFichier = 'Attestation de paiement - ' + personne.nomComplet;
    const copie = modeleFichier.makeCopy(nomFichier, dossier);
    copie.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const classeurCopie = SpreadsheetApp.openById(copie.getId());
    classeurCopie.getSheets().forEach(function(f) {
      Object.keys(jetons).forEach(function(jeton) {
        f.createTextFinder(jeton).matchEntireCell(false).replaceAllWith(jetons[jeton]);
      });
    });
    resultats.push({ nom: personne.nomComplet, url: copie.getUrl() });
  });
  SpreadsheetApp.flush();

  return { ok: true, attestations: resultats };
}

function importerCsvTectech(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };

  if (!DOSSIER_PRINCIPAL) {
    return { ok: false, erreur: 'Aucun dossier Drive principal n\'est configuré (onglet Réglages)' };
  }

  const ligne = parseInt(data.ligne, 10);
  if (!ligne) return { ok: false, erreur: 'Commande introuvable' };

  if (!data.contenuBase64) return { ok: false, erreur: 'Fichier vide ou illisible' };
  const octetsApprox = data.contenuBase64.length * 0.75;
  if (octetsApprox > MAX_FICHIER_MO * 1024 * 1024) {
    return { ok: false, erreur: 'Le fichier dépasse ' + MAX_FICHIER_MO + ' Mo' };
  }

  const dossier = sousDossier('CSV Tec.Tech');

  const feuille = feuilleCommandes();
  const ligneActuelle = feuille.getRange(ligne, 1, 1, ENTETES_COMMANDES.length).getValues()[0];
  const reference = ligneActuelle[0];
  if (!reference) return { ok: false, erreur: 'Commande introuvable' };

  const nomFichier = (reference + ' — ' + String(data.nomFichier || 'export.csv').trim());
  const octets = Utilities.base64Decode(data.contenuBase64);
  const blob = Utilities.newBlob(octets, 'text/csv', nomFichier);
  const fichier = dossier.createFile(blob);

  const url = fichier.getUrl();
  feuille.getRange(ligne, 25).setValue(url); // colonne 25 = Fichier CSV tec.tech
  if (data.caracteristiques) {
    feuille.getRange(ligne, 26).setValue(String(data.caracteristiques)); // colonne 26 = Caractéristiques matériel
  }
  return { ok: true, url: url };
}

/** limite : nombre max de commandes renvoyées (les plus récentes), pour ne pas resservir tout
 *  l'historique à chaque connexion — passer 0 ou omettre pour tout renvoyer (bouton "Charger
 *  tout l'historique" côté admin). total indique toujours le vrai nombre, limité ou non, pour
 *  que le front sache s'il manque des commandes plus anciennes. */
/** Formate les 3 dates d'une commande (reste en valeurs brutes bon marché — ISO string —
 *  jusque-là, voir construireBaseCommandes) — appelé uniquement sur les quelques dizaines de
 *  commandes réellement renvoyées à un appel donné, jamais sur tout l'historique : c'est ce
 *  qui rend listerCommandes rapide même avec des milliers de lignes en base. */
function formaterDatesCommande(c) {
  const tz = Session.getScriptTimeZone();
  return Object.assign({}, c, {
    date:      c.dateRaw ? Utilities.formatDate(new Date(c.dateRaw), tz, 'dd/MM/yyyy') : '',
    heure:     c.dateRaw ? Utilities.formatDate(new Date(c.dateRaw), tz, 'HH:mm') : '',
    dateLivraison: c.dateLivraisonRaw ? Utilities.formatDate(new Date(c.dateLivraisonRaw), tz, 'dd/MM/yyyy') : '',
    dernierClicLienPaiement: c.dernierClicRaw ? Utilities.formatDate(new Date(c.dernierClicRaw), tz, 'dd/MM/yyyy à HH:mm') : ''
  });
}

/** Renvoie la base légère des commandes (cache si présent, reconstruite sinon) — la même que
 *  celle utilisée par l'admin. Réutilisée partout où on a besoin de filtrer les commandes
 *  sans relire toute la feuille à chaque fois (ex. synchronisation de la flotte matériel). */
function obtenirBaseCommandes() {
  const cleCache = 'commandes_v' + versionCache('commandes');
  let baseCommandes = lireCacheDecoupe(cleCache);
  if (!baseCommandes) {
    const debutConstruction = Date.now();
    baseCommandes = construireBaseCommandes();
    Logger.log('[obtenirBaseCommandes] construireBaseCommandes (cache manquant) — ' + (Date.now() - debutConstruction) + ' ms, ' + baseCommandes.toutes.length + ' commandes');
    mettreEnCacheDecoupe(cleCache, baseCommandes);
  }
  return baseCommandes;
}

/** Reconstruit les champs complets pour un ensemble de commandes légères, en piochant en
 *  priorité dans la fenêtre récente déjà en cache (voir construireBaseCommandes) — ne
 *  déclenche une lecture complète de la feuille que pour ce qui en sort vraiment. */
function obtenirCommandesCompletesParLigne(baseCommandes, lignesLegeres) {
  const recentesParLigne = {};
  (baseCommandes.recentesCompletes || []).forEach(function(c) { recentesParLigne[c.ligne] = c; });
  const horsFenetre = lignesLegeres.filter(function(c) { return !recentesParLigne[c.ligne]; });
  const parLigne = {};
  Object.keys(recentesParLigne).forEach(function(l) { parLigne[l] = recentesParLigne[l]; });
  if (horsFenetre.length) {
    enrichirCommandesCompletes(horsFenetre).forEach(function(c) { parLigne[c.ligne] = c; });
  }
  return parLigne;
}

/** Juste la taille de la feuille (getLastRow, métadonnée — pas de lecture du contenu), pour
 *  afficher "chargement de X commandes…" côté client pendant que la vraie requête (bien plus
 *  lente au premier chargement) est en cours. Toujours quasi instantané, même à des milliers
 *  de lignes, puisque rien n'est vraiment lu. */
function compterCommandes(password) {
  if (password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  const dernierLigne = feuilleCommandes().getLastRow();
  return { ok: true, total: Math.max(0, dernierLigne - 1) };
}

function listerCommandes(password, limite, decalage, recherche) {
  if (password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  const debutTotal = Date.now();

  const baseCommandes = obtenirBaseCommandes();
  const toutes = baseCommandes.toutes;
  const aLivrer = baseCommandes.aLivrer;
  const nombreNouvelles = baseCommandes.nombreNouvelles;
  const nombreImpayees = baseCommandes.nombreImpayees;

  const termeRecherche = String(recherche || '').trim().toLowerCase();

  if (termeRecherche) {
    // La recherche porte toujours sur l'historique complet, jamais seulement sur la page
    // affichée — sinon une commande plus ancienne que la pagination en cours serait
    // introuvable alors qu'elle existe bel et bien. Le filtre lui-même n'a besoin d'aucune
    // date formatée (il ne regarde que référence/nom/email/produit/n° série).
    const resultats = toutes.filter(function(c) {
      const cible = (c.reference + ' ' + c.nom + ' ' + c.email + ' ' + c.produit + ' ' + (c.numerosSerie || '')).toLowerCase();
      return cible.includes(termeRecherche);
    });

    if (resultats.length) {
      const cibles = resultats.slice(0, 200);
      const completesParLigne = obtenirCommandesCompletesParLigne(baseCommandes, cibles);
      const enrichies = cibles.map(function(c) { return formaterDatesCommande(completesParLigne[c.ligne]); });
      const resultat = { ok: true, commandes: enrichies, total: toutes.length, recherche: true, aLivrer: aLivrer, nombreNouvelles: nombreNouvelles, nombreImpayees: nombreImpayees };
      Logger.log('[listerCommandes] recherche "' + termeRecherche + '" — ' + resultats.length + ' résultats, total ' + (Date.now() - debutTotal) + ' ms');
      return resultat;
    }

    // Rien dans la période active : on va voir dans les archives avant de dire "introuvable" —
    // seulement dans ce cas précis, pour ne jamais ralentir une recherche qui aboutit déjà.
    const resultatsArchives = rechercherDansArchives(termeRecherche);
    const resultat = { ok: true, commandes: resultatsArchives, total: toutes.length, recherche: true, archivesConsultees: true, aLivrer: aLivrer, nombreNouvelles: nombreNouvelles, nombreImpayees: nombreImpayees };
    Logger.log('[listerCommandes] recherche "' + termeRecherche + '" — 0 résultat en actif, ' + resultatsArchives.length + ' en archive, total ' + (Date.now() - debutTotal) + ' ms');
    return resultat;
  }

  const limiteNombre = parseInt(limite, 10) || 0;
  const decalageNombre = parseInt(decalage, 10) || 0;
  const pageLegere = limiteNombre > 0 ? toutes.slice(decalageNombre, decalageNombre + limiteNombre) : toutes;

  // Les commandes non traitées (Reçue) et les commandes urgentes ne doivent jamais passer
  // à la trappe simplement parce qu'elles sont anciennes et repoussées au-delà de la
  // première page par des commandes plus récentes — toujours renvoyées en entier, à part,
  // peu importe la pagination. Plafonné pour éviter un retour disproportionné si vraiment
  // beaucoup de commandes sont en attente.
  const prioritairesLegers = toutes.filter(function(c) {
    return c.statutCommande === 'Reçue' || c.dateLivraisonSouhaitee === 'ASAP';
  }).slice(0, 100);

  // Un seul enrichissement pour les deux ensembles à la fois (dédupliqués par ligne) — la
  // lecture groupée de la feuille qu'il déclenche a un coût fixe, pas la peine de le payer
  // deux fois pour la même requête.
  const lignesVues = new Set();
  const aEnrichir = [];
  pageLegere.concat(prioritairesLegers).forEach(function(c) {
    if (lignesVues.has(c.ligne)) return;
    lignesVues.add(c.ligne);
    aEnrichir.push(c);
  });

  // La quasi-totalité des cas est déjà couverte par la fenêtre récente construite avec le
  // cache (voir construireBaseCommandes) — aucune lecture supplémentaire de la feuille dans
  // ce cas. Seul ce qui en sort vraiment (recherche qui remonte une commande ancienne, ou
  // énormément de commandes en attente hors fenêtre) déclenche encore une lecture complète,
  // et seulement pour ces quelques-unes-là.
  const enrichiesParLigne = obtenirCommandesCompletesParLigne(baseCommandes, aEnrichir);
  const formaterEtRecuperer = function(c) { return formaterDatesCommande(enrichiesParLigne[c.ligne]); };

  const limitees = pageLegere.map(formaterEtRecuperer);
  const prioritaires = prioritairesLegers.map(formaterEtRecuperer);

  const resultat = { ok: true, commandes: limitees, total: toutes.length, prioritaires: prioritaires, aLivrer: aLivrer, nombreNouvelles: nombreNouvelles, nombreImpayees: nombreImpayees };
  Logger.log('[listerCommandes] page decalage=' + decalageNombre + ' limite=' + limiteNombre + ' — total ' + toutes.length + ' commandes en base, ' + (Date.now() - debutTotal) + ' ms');
  return resultat;
}

/** Le vrai travail coûteux de listerCommandes — isolé pour pouvoir être mis en cache.
 *  Relit les 3 feuilles (Commandes, LignesCommande, Factures) et construit la liste
 *  complète enrichie, une seule fois, plutôt qu'à chaque page demandée. */
function construireBaseCommandes() {
  const debut = Date.now();
  const TAILLE_FENETRE_RECENTE = 500; // largement au-delà de ce qu'une pagination normale consulte

  // Version allégée mise en cache : uniquement ce qu'il faut pour la recherche, le tri et les
  // totaux d'en-tête sur tout l'historique. En plus de ça, les commandes les plus récentes
  // (les seules qu'on affiche dans l'immense majorité des cas) sont mises en cache déjà
  // complètes — pour ne plus jamais avoir à relire toute la feuille juste pour afficher 20
  // lignes. Seul un cas rare (recherche qui remonte une commande ancienne, ou énormément de
  // commandes "Reçue" en attente hors de cette fenêtre) déclenche encore une lecture complète.
  const lignesDetailParReference = obtenirLignesDetailParReference();
  Logger.log('[construireBaseCommandes] lecture LignesCommande — ' + (Date.now() - debut) + ' ms (cumulé)');

  const montantsParFacture = obtenirMontantsParFacture();
  const produitsCache = lireProduits();

  const lignes = feuilleCommandes().getDataRange().getValues();
  Logger.log('[construireBaseCommandes] lecture Commandes — ' + (lignes.length - 1) + ' lignes, ' + (Date.now() - debut) + ' ms (cumulé)');

  const structuresCache = lireStructures();
  Logger.log('[construireBaseCommandes] lecture Structures — ' + (Date.now() - debut) + ' ms (cumulé)');

  const toutes = [];
  const recentesCompletes = [];
  const debutFenetreRecente = Math.max(1, lignes.length - TAILLE_FENETRE_RECENTE);
  const aLivrer = {};
  let nombreNouvelles = 0;
  let nombreImpayees = 0;

  for (let i = 1; i < lignes.length; i++) {
    const l = lignes[i];
    if (!l[0]) continue;
    const statutCommande = l[11];
    const code = String(l[2] || '').trim();

    if (statutCommande === 'Reçue') nombreNouvelles++;

    if (statutCommande === 'Reçue' || statutCommande === 'Validée') {
      const detailLignes = lignesDetailParReference[l[0]] || [{ produit: l[7], quantite: parseInt(l[8], 10) || 0 }];
      detailLignes.forEach(function(ld) {
        const qte = parseInt(ld.quantite, 10) || 0;
        if (!qte || !ld.produit) return;
        aLivrer[ld.produit] = (aLivrer[ld.produit] || 0) + qte;
      });
    }

    if (statutCommande === 'Livrée' && l[12] !== 'Payé' && l[12] !== 'Remboursé') {
      const structureCmd = structuresCache[code];
      if (!(structureCmd && (structureCmd.esn || structureCmd.interne))) nombreImpayees++;
    }

    // Strict nécessaire pour retrouver/trier/filtrer une commande sans avoir à la relire —
    // le reste est reconstruit à la demande, voir enrichirCommandesCompletes.
    toutes.push({
      ligne:          i + 1,
      reference:      l[0],
      code:           code,
      nom:            l[3],
      email:          l[4],
      produit:        l[7],
      statutCommande: statutCommande,
      statutPaiement: l[12],
      numerosSerie:   l[15],
      dateLivraisonSouhaitee: (l[30] instanceof Date) ? Utilities.formatDate(l[30], Session.getScriptTimeZone(), 'dd/MM/yyyy') : String(l[30] || '').trim()
    });

    // Version complète construite ici pour les commandes récentes — pas besoin de relire la
    // feuille une seconde fois pour elles au moment de répondre à une requête.
    if (i >= debutFenetreRecente) {
      recentesCompletes.push(construireCommandeComplete(i + 1, l, {
        montantsParFacture: montantsParFacture,
        lignesDetailParReference: lignesDetailParReference,
        produitsCache: produitsCache,
        structuresCache: structuresCache
      }));
    }
  }

  const toutesInversees = toutes.reverse();
  const recentesInversees = recentesCompletes.reverse();
  Logger.log('[construireBaseCommandes] TERMINÉ (version légère + ' + recentesInversees.length + ' complètes en fenêtre récente) — ' + (Date.now() - debut) + ' ms au total, ' + toutesInversees.length + ' commandes');
  return { toutes: toutesInversees, recentesCompletes: recentesInversees, aLivrer: aLivrer, nombreNouvelles: nombreNouvelles, nombreImpayees: nombreImpayees };
}

/** Mis en cache séparément (même mécanisme que les autres listings) — ces deux tables de
 *  correspondance sont utilisées à la fois par construireBaseCommandes et
 *  enrichirCommandesCompletes ; sans cache, elles étaient relues intégralement à chaque appel
 *  alors qu'elles ne changent que quand une facture ou une ligne de commande est modifiée. */
function obtenirMontantsParFacture() {
  const cle = 'montants_facture_v' + versionCache('factures');
  const enCache = lireCacheDecoupe(cle);
  if (enCache) return enCache;

  const montantsParFacture = {};
  const lignesFactures = feuilleFactures().getDataRange().getValues();
  for (let i = 1; i < lignesFactures.length; i++) {
    if (!lignesFactures[i][0]) continue;
    montantsParFacture[lignesFactures[i][0]] = lignesFactures[i][10];
  }
  mettreEnCacheDecoupe(cle, montantsParFacture);
  return montantsParFacture;
}

function obtenirLignesDetailParReference() {
  const cle = 'lignes_detail_v' + versionCache('commandes');
  const enCache = lireCacheDecoupe(cle);
  if (enCache) return enCache;

  const lignesDetailParReference = {};
  const donneesLignes = feuilleLignesCommande().getDataRange().getValues();
  for (let i = 1; i < donneesLignes.length; i++) {
    const ref = String(donneesLignes[i][0] || '').trim();
    if (!ref) continue;
    if (!lignesDetailParReference[ref]) lignesDetailParReference[ref] = [];
    lignesDetailParReference[ref].push({
      ligne: i + 1,
      produit: donneesLignes[i][1],
      quantite: parseInt(donneesLignes[i][2], 10) || 0
    });
  }
  mettreEnCacheDecoupe(cle, lignesDetailParReference);
  return lignesDetailParReference;
}

/** Reconstruit les champs complets (tous ceux qu'affichent la carte et la fiche détail) pour
 *  un petit nombre de commandes précises — jamais pour l'historique complet. Appelée
 *  uniquement sur ce qui est réellement renvoyé à un appel donné (la page affichée, les
 *  commandes prioritaires, les résultats de recherche : quelques dizaines à ~200 lignes au
 *  maximum), donc rapide même avec des milliers de commandes en base. */
/** Construit l'objet "commande complète" (tous les champs qu'affichent la carte et la fiche
 *  détail) à partir d'une ligne brute — partagé entre construireBaseCommandes (fenêtre
 *  récente, construite pendant l'unique lecture complète) et enrichirCommandesCompletes
 *  (repli pour tout ce qui tombe hors de cette fenêtre). */
function construireCommandeComplete(ligneNum, l, contexte) {
  const referenceFacture = l[18] || '';
  const detailLignes = contexte.lignesDetailParReference[l[0]] || [{ ligne: null, produit: l[7], quantite: parseInt(l[8], 10) || 0 }];

  const structurePourCalcul = contexte.structuresCache[String(l[2]).trim()];
  const estRN = structurePourCalcul ? structurePourCalcul.rn : false;
  let montantEstime = 0;
  detailLignes.forEach(function(ligneDetail) {
    const p = contexte.produitsCache[ligneDetail.produit];
    if (p) montantEstime += (estRN ? p.prixRN : p.prixStandard) * ligneDetail.quantite;
  });

  return {
    ligne:          ligneNum,
    reference:      l[0],
    dateRaw:        l[1] instanceof Date ? l[1].toISOString() : '',
    code:           l[2],
    nom:            l[3],
    email:          l[4],
    telephone:      l[5],
    adresse:        l[6],
    produit:        l[7],
    quantite:       l[8],
    lignes:         detailLignes,
    montantEstime:  montantEstime,
    moyenPaiement:  l[9],
    dossier:        l[10],
    statutCommande: l[11],
    statutPaiement: l[12],
    lienPaiement:   l[13],
    commentaire:    l[14],
    numerosSerie:   l[15],
    nombreFichiers: l[16] || 0,
    referenceDevis:   l[17] || '',
    referenceFacture: referenceFacture,
    montantFacture: referenceFacture && contexte.montantsParFacture[referenceFacture] != null ? contexte.montantsParFacture[referenceFacture] : null,
    statutComptable: l[19] || '',
    numeroDepot:     l[20] || '',
    devisDemande:    l[21] || '',
    colissimo:       l[22] || '',
    dateLivraisonRaw: l[23] instanceof Date ? l[23].toISOString() : '',
    csvTectech:      l[24] || '',
    caracteristiquesMateriel: l[25] || '',
    bonLivraison: l[26] || '',
    personnes: l[27] || '',
    dernierClicRaw: l[28] instanceof Date ? l[28].toISOString() : '',
    validationLogistiqueEnAttente: !!l[29],
    dateLivraisonSouhaitee: (l[30] instanceof Date) ? Utilities.formatDate(l[30], Session.getScriptTimeZone(), 'dd/MM/yyyy') : String(l[30] || '').trim(),
    paiementSepare: l[31] === 'Oui',
    livraisonSansEnvoi: l[32] === 'Oui'
  };
}

function enrichirCommandesCompletes(commandesLegeres) {
  if (!commandesLegeres.length) return [];
  const debut = Date.now();

  const contexte = {
    montantsParFacture: obtenirMontantsParFacture(),
    lignesDetailParReference: obtenirLignesDetailParReference(),
    produitsCache: lireProduits(),
    structuresCache: lireStructures()
  };
  const feuille = feuilleCommandes();

  // Toujours une lecture groupée de la feuille entière, jamais ligne par ligne : chaque appel
  // getRange() individuel a un coût fixe très élevé sous Apps Script (mesuré : 150-300x plus
  // lent au total que de tout lire d'un coup, même pour une vingtaine de lignes), donc la
  // lecture groupée reste la plus rapide même quand on n'a besoin que de quelques commandes.
  // N'arrive que pour ce qui tombe hors de la fenêtre récente déjà en cache — voir
  // construireBaseCommandes — donc rarement sur le chemin normal.
  const lignesParNumero = {};
  const toutesLesLignes = feuille.getDataRange().getValues();
  commandesLegeres.forEach(function(c) { lignesParNumero[c.ligne] = toutesLesLignes[c.ligne - 1]; });

  const resultat = commandesLegeres.map(function(c) {
    return construireCommandeComplete(c.ligne, lignesParNumero[c.ligne], contexte);
  });

  Logger.log('[enrichirCommandesCompletes] ' + commandesLegeres.length + ' commandes enrichies (repli hors fenêtre récente) — ' + (Date.now() - debut) + ' ms');
  return resultat;
}

/** Convertit le lien d'édition d'un Google Sheets en lien de téléchargement PDF direct —
 *  pour le suivi structure : on ne veut pas ouvrir l'éditeur collaboratif, juste proposer un
 *  fichier à télécharger. L'admin, lui, garde le lien éditable classique (utile pour corriger
 *  une coquille), seule cette version publique est transformée. */
function urlExportPdfDepuisUrlSheets(url) {
  const propre = String(url || '').trim();
  if (!propre) return '';
  const correspondance = propre.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!correspondance) return propre; // pas reconnu comme un lien Sheets : on renvoie tel quel plutôt que de casser le lien
  return 'https://docs.google.com/spreadsheets/d/' + correspondance[1] + '/export?format=pdf';
}

/** Vue publique pour une structure — protégée par son code, jamais par le mot de passe admin.
 *  Ne renvoie que ses propres commandes, avec uniquement les champs pertinents pour elle
 *  (rien sur les autres structures, rien de purement comptable/interne comme le numéro de
 *  dépôt ou le statut comptable). */
function listerCommandesParCode(data) {
  const code = String(data.code || '').trim();
  if (!code) return { ok: false, erreur: 'Code vide' };

  const structure = lireStructures()[code];
  if (!structure) {
    journaliserEvenementSecurite('Code structure invalide (suivi commandes)', code);
    return { ok: false, erreur: 'Code inconnu' };
  }
  const estEsnOuInterne = !!(structure.esn || structure.interne);

  const lignesDetailParReference = {};
  const donneesLignes = feuilleLignesCommande().getDataRange().getValues();
  for (let i = 1; i < donneesLignes.length; i++) {
    const ref = String(donneesLignes[i][0] || '').trim();
    if (!ref) continue;
    if (!lignesDetailParReference[ref]) lignesDetailParReference[ref] = [];
    lignesDetailParReference[ref].push({
      produit: donneesLignes[i][1],
      quantite: parseInt(donneesLignes[i][2], 10) || 0
    });
  }

  const montantsParFacture = {};
  const lignesFactures = feuilleFactures().getDataRange().getValues();
  for (let i = 1; i < lignesFactures.length; i++) {
    if (!lignesFactures[i][0]) continue;
    montantsParFacture[lignesFactures[i][0]] = lignesFactures[i][10];
  }

  const produitsCache = lireProduits();
  const lignes = feuilleCommandes().getDataRange().getValues();
  const commandes = [];

  for (let i = 1; i < lignes.length; i++) {
    const l = lignes[i];
    if (!l[0] || String(l[2]).trim() !== code) continue;

    const detailLignes = lignesDetailParReference[l[0]] || [{ produit: l[7], quantite: parseInt(l[8], 10) || 0 }];

    let montantEstime = 0;
    detailLignes.forEach(function(ligneDetail) {
      const p = produitsCache[ligneDetail.produit];
      if (p) montantEstime += (structure.rn ? p.prixRN : p.prixStandard) * ligneDetail.quantite;
    });

    const referenceFacture = l[18] || '';

    commandes.push({
      reference:       l[0],
      date:            l[1] ? Utilities.formatDate(new Date(l[1]), Session.getScriptTimeZone(), 'dd/MM/yyyy') : '',
      lignes:          detailLignes,
      statutCommande:  l[11],
      dateLivraison:   l[23] ? Utilities.formatDate(new Date(l[23]), Session.getScriptTimeZone(), 'dd/MM/yyyy') : '',
      colissimo:       l[22] || '',
      numerosSerie:    l[15] || '',
      // Rien de tout ceci n'a de sens pour une structure ESN/Interne : jamais de prix, jamais de facture
      montantEstime:   estEsnOuInterne ? null : montantEstime,
      montantFacture:  estEsnOuInterne ? null : (referenceFacture && montantsParFacture[referenceFacture] != null ? montantsParFacture[referenceFacture] : null),
      moyenPaiement:   estEsnOuInterne ? null : l[9],
      statutPaiement:  estEsnOuInterne ? null : l[12],
      lienPaiement:    estEsnOuInterne ? '' : (l[13] || ''),
      paiementSepare:  l[31] === 'Oui',
      personnes:       l[27] || '',
      bonLivraison:    urlExportPdfDepuisUrlSheets(l[26]),
      commentaire:     l[11] === 'Annulée' ? (l[14] || '') : ''
    });
  }

  return { ok: true, nomStructure: structure.nom, commandes: commandes.reverse() };
}

/** Appelée quand une structure clique un lien "Régler cette commande" dans suivi.html.
 *  Trace l'horodatage du clic (colonne 29) pour signaler à l'admin qu'il faut vérifier le
 *  paiement, puis renvoie de quoi construire la page de confirmation (voir Routeur.gs).
 *  `index` distingue quel lien a été cliqué quand plusieurs bénéficiaires règlent séparément
 *  (un lien par ligne dans la colonne, dans le même ordre que les personnes) — 0 par défaut. */
function enregistrerClicLienPaiement(reference, index) {
  const ref = String(reference || '').trim();
  if (!ref) return { ok: false };

  const feuille = feuilleCommandes();
  const lignes = feuille.getDataRange().getValues();
  for (let i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]).trim() !== ref) continue;
    feuille.getRange(i + 1, 29).setValue(new Date());
    invaliderCacheCommandes();
    const liens = String(lignes[i][13] || '').split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
    const idx = parseInt(index, 10) || 0;
    const url = liens[idx] || liens[0] || '';
    const personnesListe = String(lignes[i][27] || '').split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
    return { ok: !!url, url: url, reference: ref, structure: lignes[i][3] || '', beneficiaire: personnesListe[idx] || '' };
  }
  return { ok: false };
}

/** Étape "Reçue → Validée" : ne bascule plus jamais le statut à la main. On envoie un mail à
 *  la personne logistique (réglage EMAIL_LOGISTIQUE) avec un lien à cliquer ; le clic écrit
 *  "oui" en base (jeton consommé) et fait passer la commande en "Validée" automatiquement.
 *  Rappelable plusieurs fois sans risque (renvoie juste un nouveau mail avec un nouveau jeton). */
function demanderValidationLogistique(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  if (!EMAIL_LOGISTIQUE) return { ok: false, erreur: 'Aucun email logistique configuré dans les Réglages' };

  const feuille = feuilleCommandes();
  const ligne = parseInt(data.ligne, 10);
  const c = feuille.getRange(ligne, 1, 1, ENTETES_COMMANDES.length).getValues()[0];
  if (!c[0]) return { ok: false, erreur: 'Commande introuvable' };
  if (c[11] !== 'Reçue') return { ok: false, erreur: 'Cette commande n\'est plus au statut Reçue' };

  const jeton = Utilities.getUuid();
  feuille.getRange(ligne, 30).setValue(jeton);

  const detailLignes = lireLignesCommande(c[0], c[7], c[8]);
  const detailTexte = detailLignes.map(function(l) { return '- ' + l.quantite + ' × ' + l.produit; }).join('\n');
  const urlValidation = ScriptApp.getService().getUrl() + '?action=confirmer-validation-logistique&ref='
    + encodeURIComponent(c[0]) + '&jeton=' + encodeURIComponent(jeton);

  const dateSouhaitee = c[30];
  let ligneDateSouhaitee = '';
  if (dateSouhaitee === 'ASAP') {
    ligneDateSouhaitee = 'Livraison souhaitée : ⚡ le plus rapidement possible\n\n';
  } else if (dateSouhaitee instanceof Date) {
    ligneDateSouhaitee = 'Livraison souhaitée : ' + Utilities.formatDate(dateSouhaitee, Session.getScriptTimeZone(), 'dd/MM/yyyy') + '\n\n';
  } else if (dateSouhaitee) {
    ligneDateSouhaitee = 'Livraison souhaitée : ' + dateSouhaitee + '\n\n';
  }

  const corps = 'Bonjour,\n\nUne commande attend une validation logistique avant préparation :\n\n'
    + 'Référence : ' + c[0] + '\n'
    + 'Structure : ' + c[3] + '\n'
    + 'Adresse : ' + c[6] + '\n\n'
    + ligneDateSouhaitee
    + 'Matériel demandé :\n' + detailTexte + '\n\n'
    + 'Pour valider cette commande et la faire passer à l\'étape suivante, cliquez ce lien :\n'
    + urlValidation + '\n\nCordialement,\n' + NOM_ORGANISATION;

  MailApp.sendEmail(EMAIL_LOGISTIQUE, 'Validation logistique requise — commande ' + c[0], corps);
  invaliderCacheCommandes();
  return { ok: true };
}

/** Vérifie qu'un jeton correspond bien à une commande encore au statut "Reçue" avec ce jeton
 *  non consommé. Renvoie la ligne de la feuille (1-indexé) ou 0 si invalide — jamais d'erreur
 *  levée, pour que les appelants (page publique) restent simples à écrire. */
function ligneCommandeSiJetonValide(reference, jetonRecu) {
  const ref = String(reference || '').trim();
  const jeton = String(jetonRecu || '').trim();
  if (!ref || !jeton) return 0;
  const lignes = feuilleCommandes().getDataRange().getValues();
  for (let i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]).trim() !== ref) continue;
    const jetonEnBase = String(lignes[i][29] || '');
    return (jetonEnBase && jetonEnBase === jeton) ? i + 1 : 0;
  }
  return 0;
}

/** Données nécessaires pour afficher le formulaire de validation logistique (voir Routeur.gs) :
 *  détail des lignes produit/quantité modifiables, et infos d'affichage. Lignes issues d'une
 *  commande antérieure à LignesCommande (ligne=null) ne sont pas modifiables individuellement
 *  ici — juste affichées, pour rester simple. */
function donneesPageValidationLogistique(reference, jetonRecu) {
  const ligneCmd = ligneCommandeSiJetonValide(reference, jetonRecu);
  if (!ligneCmd) return { ok: false };
  const c = feuilleCommandes().getRange(ligneCmd, 1, 1, ENTETES_COMMANDES.length).getValues()[0];
  const lignesDetail = lireLignesCommande(c[0], c[7], c[8]);
  return {
    ok: true,
    reference: c[0],
    structure: c[3],
    adresse: c[6],
    lignes: lignesDetail,
    commentaire: c[14] || ''
  };
}

/** Appelée depuis la page de validation logistique : applique les éventuelles modifications
 *  de quantité, ajoute le commentaire laissé, puis valide la commande (même effet que l'ancien
 *  clic direct). Jamais de mot de passe ici — c'est le jeton qui fait foi. */
function validerCommandeAvecModifications(data) {
  const ligneCmd = ligneCommandeSiJetonValide(data.ref, data.jeton);
  if (!ligneCmd) return { ok: false, erreur: 'Ce lien a déjà été utilisé ou n\'est plus valide' };

  const feuille = feuilleCommandes();
  const c = feuille.getRange(ligneCmd, 1, 1, ENTETES_COMMANDES.length).getValues()[0];
  const referenceCommande = c[0];
  const produits = lireProduits();

  const modifications = Array.isArray(data.lignes) ? data.lignes : [];
  modifications.forEach(function(mod) {
    const ligneDetail = parseInt(mod.ligne, 10);
    const nouvelleQuantite = parseInt(mod.quantite, 10);
    if (!ligneDetail || !nouvelleQuantite || nouvelleQuantite < 1) return; // ligne non modifiable, ou valeur invalide : on l'ignore plutôt que de bloquer toute la validation

    const feuilleLignes = feuilleLignesCommande();
    const valeursActuelles = feuilleLignes.getRange(ligneDetail, 1, 1, 3).getValues()[0];
    if (String(valeursActuelles[0]).trim() !== referenceCommande) return; // sécurité : cette ligne détail n'appartient pas à cette commande
    const nomProduit = valeursActuelles[1];
    const ancienneQuantite = parseInt(valeursActuelles[2], 10) || 0;
    if (nouvelleQuantite === ancienneQuantite) return;

    const produit = produits[nomProduit];
    if (produit) {
      const stockDisponible = produit.stock + ancienneQuantite;
      if (stockDisponible < nouvelleQuantite) return; // pas assez de stock : on laisse la quantité initiale plutôt que de bloquer
      ajusterStock(nomProduit, ancienneQuantite - nouvelleQuantite);
    }
    feuilleLignes.getRange(ligneDetail, 3).setValue(nouvelleQuantite);
  });
  if (modifications.length) recalculerResumeCommande(ligneCmd, referenceCommande);

  const commentaireAjoute = String(data.commentaire || '').trim();
  if (commentaireAjoute) {
    const commentaireExistant = String(feuille.getRange(ligneCmd, 15).getValue() || '').trim();
    feuille.getRange(ligneCmd, 15).setValue(
      (commentaireExistant ? commentaireExistant + '\n\n' : '') + '[Logistique] ' + commentaireAjoute
    );
  }

  feuille.getRange(ligneCmd, 12).setValue('Validée'); // colonne 12 : Statut commande
  feuille.getRange(ligneCmd, 30).setValue('');        // jeton consommé

  // Devis automatique, même règle qu'un passage manuel en "Validée" — la structure a pu
  // le demander depuis le formulaire public.
  const devisDemande = feuille.getRange(ligneCmd, 22).getValue();
  if (devisDemande === 'Oui') {
    try { genererDevis(ligneCmd); } catch (e) { Logger.log('Devis auto (validation logistique) échoué pour ' + referenceCommande + ' : ' + e); }
  }

  invaliderCacheCommandes();
  return { ok: true, reference: referenceCommande };
}

/** Envoyé manuellement par l'admin (avec confirmation côté front) quand un lien de paiement
 *  vient d'être ajouté ou changé sur une commande — passe par la route tracée, comme le lien
 *  affiché dans suivi.html, pour que le clic depuis ce mail soit tracé lui aussi. */
function notifierLienPaiement(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };

  const ligne = parseInt(data.ligne, 10);
  const c = feuilleCommandes().getRange(ligne, 1, 1, ENTETES_COMMANDES.length).getValues()[0];
  if (!c[0]) return { ok: false, erreur: 'Commande introuvable' };

  const email = String(c[4] || '').trim();
  const lien = String(c[13] || '').trim();
  if (!email) return { ok: false, erreur: 'Aucun email connu pour cette structure' };
  if (!lien) return { ok: false, erreur: 'Aucun lien de paiement enregistré' };

  const paiementSepare = c[31] === 'Oui';
  const personnesListe = String(c[27] || '').split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
  const liensListe = lien.split('\n').map(function(s) { return s.trim(); }).filter(Boolean);

  let corpsLiens;
  if (paiementSepare && liensListe.length > 1) {
    corpsLiens = liensListe.map(function(_, idx) {
      const urlTracee = ScriptApp.getService().getUrl() + '?action=clic-lien-paiement&ref=' + encodeURIComponent(c[0]) + '&index=' + idx;
      return '- ' + (personnesListe[idx] || 'Bénéficiaire ' + (idx + 1)) + ' : ' + urlTracee;
    }).join('\n');
  } else {
    const urlTracee = ScriptApp.getService().getUrl() + '?action=clic-lien-paiement&ref=' + encodeURIComponent(c[0]);
    corpsLiens = urlTracee;
  }

  const corps = 'Bonjour,\n\nLe paiement en ligne de votre commande ' + c[0] + ' est maintenant disponible.\n\n'
    + (paiementSepare && liensListe.length > 1
      ? 'Un lien de règlement par bénéficiaire :\n' + corpsLiens
      : 'Vous pouvez la régler directement ici :\n' + corpsLiens)
    + '\n\nCordialement,\n' + NOM_ORGANISATION;

  MailApp.sendEmail(email, 'Paiement disponible — commande ' + c[0], corps);
  return { ok: true };
}

/** Construit la page HTML affichée au clic sur le lien du mail de validation logistique :
 *  quantités modifiables (pour les lignes qui le permettent), commentaire libre, et un bouton
 *  qui valide la commande par un appel POST vers ce même script (jeton en guise d'auth). */
function construirePageValidationLogistique(reference, jetonRecu) {
  const donnees = donneesPageValidationLogistique(reference, jetonRecu);

  if (!donnees.ok) {
    return `<div style="font-family:sans-serif;max-width:420px;margin:70px auto;text-align:center;padding:0 20px">
      <h1 style="font-size:20px">Lien invalide</h1>
      <p style="color:#555">Ce lien a déjà été utilisé, ou la commande n'est plus en attente de validation.</p>
    </div>`;
  }

  const lignesHtml = donnees.lignes.map(function(l, i) {
    const champQuantite = l.ligne
      ? `<input type="number" min="1" value="${l.quantite}" data-ligne-detail="${l.ligne}" style="width:64px;padding:6px;border:1px solid #D8DEE4;border-radius:6px;font-size:14px">`
      : `<span style="color:#8592A0">${l.quantite}</span>`; // commande ancienne, sans ligne détail modifiable individuellement
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;${i > 0 ? 'border-top:1px solid #EEF1F4' : ''}">
      <span>${echapperHtml(l.produit)}</span>${champQuantite}
    </div>`;
  }).join('');

  const urlScript = ScriptApp.getService().getUrl();
  const refJson = JSON.stringify(donnees.reference);
  const jetonJson = JSON.stringify(jetonRecu);
  const urlJson = JSON.stringify(urlScript);

  return `<div style="font-family:sans-serif;max-width:460px;margin:50px auto;padding:0 20px;color:#1A2733">
    <h1 style="font-size:19px;margin-bottom:4px">Validation logistique</h1>
    <p style="color:#555;margin-top:0">${echapperHtml(donnees.reference)} — ${echapperHtml(donnees.structure)}</p>
    <p style="color:#8592A0;font-size:13px">${echapperHtml(donnees.adresse)}</p>
    <div style="margin-top:18px">${lignesHtml}</div>
    <label style="display:block;margin-top:18px;font-size:13px;font-weight:600">Commentaire (optionnel)</label>
    <textarea id="commentaire-logistique" rows="3" style="width:100%;margin-top:6px;padding:8px;border:1px solid #D8DEE4;border-radius:6px;font-size:14px;box-sizing:border-box;font-family:inherit"></textarea>
    <div id="retour-validation" style="margin-top:12px;font-size:13px"></div>
    <button id="btn-valider" style="width:100%;margin-top:14px;padding:13px;background:#0B5FFF;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer">Valider cette commande</button>
    <script>
      document.getElementById('btn-valider').addEventListener('click', function(){
        var bouton = this;
        bouton.disabled = true;
        bouton.textContent = 'Validation…';
        var lignes = Array.prototype.map.call(document.querySelectorAll('[data-ligne-detail]'), function(i){
          return { ligne: i.dataset.ligneDetail, quantite: i.value };
        });
        fetch(${urlJson}, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'valider-avec-modifications',
            ref: ${refJson},
            jeton: ${jetonJson},
            lignes: lignes,
            commentaire: document.getElementById('commentaire-logistique').value
          })
        }).then(function(r){ return r.json(); }).then(function(r){
          if(r.ok){
            document.body.innerHTML = '<div style="font-family:sans-serif;max-width:460px;margin:70px auto;text-align:center;padding:0 20px">'
              + '<h1 style="font-size:20px">Commande ' + r.reference + ' validée ✅</h1>'
              + '<p style="color:#555">Elle passe à l\\'étape suivante (préparation).</p></div>';
          } else {
            document.getElementById('retour-validation').innerHTML = '<span style="color:#C0392B">' + (r.erreur || 'Erreur inconnue') + '</span>';
            bouton.disabled = false;
            bouton.textContent = 'Valider cette commande';
          }
        }).catch(function(){
          document.getElementById('retour-validation').innerHTML = '<span style="color:#C0392B">Validation impossible — réessaie.</span>';
          bouton.disabled = false;
          bouton.textContent = 'Valider cette commande';
        });
      });
    </script>
  </div>`;
}

function supprimerCommande(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  feuilleCommandes().deleteRow(data.ligne);
  invaliderCacheCommandes();
  return { ok: true };
}

function majCommande(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };

  const colonnes = {
    moyenPaiement:    10,
    statutCommande:   12,
    statutPaiement:   13,
    lienPaiement:     14,
    commentaire:      15,
    numerosSerie:     16,
    referenceDevis:   18,
    referenceFacture: 19,
    devisDemande:     22,
    colissimo:        23,
    dateLivraison:    24,
    csvTectech:       25,
    caracteristiquesMateriel: 26,
    dateLivraisonSouhaitee: 31,
    livraisonSansEnvoi: 33
  };

  const colonne = colonnes[data.champ];
  if (!colonne) return { ok: false, erreur: 'Champ non modifiable' };

  const feuille = feuilleCommandes();

  // Les statuts de commande ne sont plus modifiables librement : uniquement l'étape suivante
  // (ou "Annulée", accessible depuis n'importe quel statut non final), chacune avec ses
  // propres conditions bloquantes vérifiées ici — jamais côté client seul.
  if (data.champ === 'statutCommande') {
    const ligneActuellePourControle = feuille.getRange(data.ligne, 1, 1, ENTETES_COMMANDES.length).getValues()[0];
    const statutActuel = ligneActuellePourControle[11];
    const ordre = ['Reçue', 'Validée', 'Préparée', 'En cours de livraison', 'Livrée'];
    const indexActuel = ordre.indexOf(statutActuel);
    const indexCible = ordre.indexOf(data.valeur);

    if (data.valeur !== 'Annulée') {
      if (statutActuel === 'Livrée' || statutActuel === 'Annulée') {
        return { ok: false, erreur: 'Cette commande est déjà clôturée, son statut ne peut plus changer.' };
      }
      if (indexCible !== indexActuel + 1) {
        return { ok: false, erreur: 'Impossible de sauter une étape : le seul statut suivant possible depuis "' + statutActuel + '" est "' + ordre[indexActuel + 1] + '".' };
      }
      if (statutActuel === 'Reçue') {
        return { ok: false, erreur: 'Le passage de Reçue à Validée se fait uniquement via la validation logistique par mail, pas manuellement.' };
      }
      if (data.valeur === 'Préparée') {
        const structurePourControle = lireStructures()[String(ligneActuellePourControle[2]).trim()];
        const estInterne = !!(structurePourControle && structurePourControle.interne);
        const numerosSerieListe = String(ligneActuellePourControle[15] || '').split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
        const quantiteAttendue = parseInt(ligneActuellePourControle[8], 10) || 0;
        const facturationOk = estInterne || ligneActuellePourControle[17] || ligneActuellePourControle[18]; // devis ou facture
        if (numerosSerieListe.length !== quantiteAttendue) {
          return { ok: false, erreur: 'Il faut exactement ' + quantiteAttendue + ' numéro' + (quantiteAttendue > 1 ? 's' : '') + ' de série (un par appareil) avant de passer cette commande en Préparée — il y en a actuellement ' + numerosSerieListe.length + '.' };
        }
        if (!facturationOk) {
          return { ok: false, erreur: 'Génère d\'abord un devis ou une facture avant de passer cette commande en Préparée (sauf structure Interne).' };
        }
      }
      if (data.valeur === 'En cours de livraison') {
        const bonLivraisonRenseigne = String(ligneActuellePourControle[26] || '').trim().length > 0;
        const sansEnvoi = ligneActuellePourControle[32] === 'Oui';
        const colissimoRenseigne = sansEnvoi || String(ligneActuellePourControle[22] || '').trim().length > 0;
        if (!bonLivraisonRenseigne || !colissimoRenseigne) {
          return { ok: false, erreur: 'Renseigne le bon de livraison' + (sansEnvoi ? '' : ' et le numéro Colissimo') + ' avant de passer cette commande en livraison.' };
        }
      }
      if (data.valeur === 'Livrée') {
        const dateLivraisonActuelle = feuille.getRange(data.ligne, 24).getValue();
        if (!dateLivraisonActuelle) {
          return { ok: false, erreur: 'Renseigne d\'abord la date de livraison avant de passer cette commande en Livrée.' };
        }
      }
    }
  }

  if (data.champ === 'statutCommande') {
    const ligneActuelle = feuille.getRange(data.ligne, 1, 1, ENTETES_COMMANDES.length).getValues()[0];
    const ancienStatut = ligneActuelle[11];
    const detailLignes = lireLignesCommande(ligneActuelle[0], ligneActuelle[7], ligneActuelle[8]);

    if (data.valeur === 'Annulée' && ancienStatut !== 'Annulée') {
      detailLignes.forEach(function(l) { ajusterStock(l.produit, l.quantite); }); // +quantite
    } else if (ancienStatut === 'Annulée' && data.valeur !== 'Annulée') {
      detailLignes.forEach(function(l) { ajusterStock(l.produit, -l.quantite); }); // -quantite, on reconsomme le stock
    }
  }

  feuille.getRange(data.ligne, colonne).setValue(data.valeur);
  invaliderCacheCommandes();

  // Devis automatique au passage en "Validée" — uniquement si la structure l'a demandé
  // depuis le formulaire public. Sinon, le devis reste à créer manuellement si besoin.
  if (data.champ === 'statutCommande' && data.valeur === 'Validée') {
    const ligneActuelle2 = feuille.getRange(data.ligne, 1, 1, ENTETES_COMMANDES.length).getValues()[0];
    const devisDemande = ligneActuelle2[21]; // colonne "Devis demandé"
    if (devisDemande === 'Oui') {
      const resultat = genererDevis(data.ligne);
      if (resultat.ok) {
        feuille.getRange(data.ligne, 22).setValue(''); // le devis existe désormais, l'alerte n'a plus lieu d'être
        return { ok: true, devis: resultat.referenceDevis, montant: resultat.montant };
      }
      return { ok: true, avertissement: resultat.erreur };
    }
  }

  return { ok: true };
}

/** Ajuste le stock d'un produit par son nom (delta positif ou négatif), jamais sous 0. */
function ajusterStock(nomProduit, delta) {
  const produit = lireProduits()[String(nomProduit || '').trim()];
  if (!produit) return;
  feuilleProduits().getRange(produit.ligne, 4).setValue(Math.max(0, produit.stock + delta));
}

/** Recalcule et réécrit le résumé texte + la quantité totale d'une commande (colonnes
 *  Produit/Quantité de Commandes), à partir de ses lignes réelles dans LignesCommande.
 *  À appeler après tout ajout/modification/suppression de ligne. */
function recalculerResumeCommande(ligneCommande, referenceCommande) {
  const lignesActuelles = lireLignesCommande(referenceCommande, null, null);
  const infos = resumerLignes(lignesActuelles);
  feuilleCommandes().getRange(ligneCommande, 8, 1, 2).setValues([[infos.resume, infos.total]]);
}

/** Modifie le produit et/ou la quantité d'UNE ligne d'une commande existante, avec
 *  recalcul du stock. Ne touche pas au stock si la commande est déjà "Annulée" (déjà
 *  recrédité ailleurs). Si la commande n'a encore aucune ligne dans LignesCommande
 *  (créée avant ce changement), une ligne y est créée à la volée à partir de l'ancien
 *  résumé, pour pouvoir continuer à l'éditer normalement ensuite. */
function modifierLigneCommande(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };

  const nouveauProduitNom = String(data.produit || '').trim();
  const nouvelleQuantite = parseInt(data.quantite, 10);
  if (!nouveauProduitNom) return { ok: false, erreur: 'Produit manquant' };

  const produits = lireProduits();
  const nouveauProduit = produits[nouveauProduitNom];
  if (!nouveauProduit) return { ok: false, erreur: 'Produit "' + nouveauProduitNom + '" introuvable au catalogue' };

  const ligneCommandeAvantVerif = parseInt(data.ligneCommande, 10);
  const codeStructureCmd = feuilleCommandes().getRange(ligneCommandeAvantVerif, 3).getValue();
  const structureCmd = lireStructures()[String(codeStructureCmd || '').trim()];

  const maxPourCeProduit = quantiteMaxPourProduit(nouveauProduit, !!(structureCmd && (structureCmd.esn || structureCmd.interne)));
  if (!nouvelleQuantite || nouvelleQuantite < 1 || nouvelleQuantite > maxPourCeProduit) {
    return { ok: false, erreur: 'Quantité invalide (1 à ' + maxPourCeProduit + ')' };
  }

  const ligneCommande = parseInt(data.ligneCommande, 10);
  const ligneActuelleCmd = feuilleCommandes().getRange(ligneCommande, 1, 1, ENTETES_COMMANDES.length).getValues()[0];
  const referenceCommande = ligneActuelleCmd[0];
  const statutCommande = ligneActuelleCmd[11];

  let ligneDetail = parseInt(data.ligne, 10) || null;
  const feuilleLignes = feuilleLignesCommande();
  let ancienProduitNom, ancienneQuantite;

  if (ligneDetail) {
    const valeursActuelles = feuilleLignes.getRange(ligneDetail, 1, 1, 3).getValues()[0];
    ancienProduitNom = valeursActuelles[1];
    ancienneQuantite = parseInt(valeursActuelles[2], 10) || 0;
  } else {
    // Commande antérieure à LignesCommande : on crée la ligne maintenant, à partir du résumé actuel
    ancienProduitNom = ligneActuelleCmd[7];
    ancienneQuantite = parseInt(ligneActuelleCmd[8], 10) || 0;
    feuilleLignes.appendRow([referenceCommande, ancienProduitNom, ancienneQuantite]);
    ligneDetail = feuilleLignes.getLastRow();
  }

  if (statutCommande !== 'Annulée') {
    const stockDisponiblePourVerif = (nouveauProduitNom === ancienProduitNom)
      ? nouveauProduit.stock + ancienneQuantite
      : nouveauProduit.stock;

    if (stockDisponiblePourVerif < nouvelleQuantite) {
      return { ok: false, erreur: 'Stock insuffisant pour ce produit (' + stockDisponiblePourVerif + ' disponible)' };
    }

    ajusterStock(ancienProduitNom, ancienneQuantite);
    ajusterStock(nouveauProduitNom, -nouvelleQuantite);
  }

  feuilleLignes.getRange(ligneDetail, 2, 1, 2).setValues([[nouveauProduitNom, nouvelleQuantite]]);
  recalculerResumeCommande(ligneCommande, referenceCommande);
  invaliderCacheCommandes();

  return { ok: true, ligne: ligneDetail };
}

/** Ajoute un nouveau produit à une commande déjà existante. */
function ajouterLigneCommande(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };

  const nomProduit = String(data.produit || '').trim();
  const quantite = parseInt(data.quantite, 10);
  if (!nomProduit) return { ok: false, erreur: 'Produit manquant' };

  const ligneCommande = parseInt(data.ligneCommande, 10);
  const ligneActuelleCmd = feuilleCommandes().getRange(ligneCommande, 1, 1, ENTETES_COMMANDES.length).getValues()[0];
  const referenceCommande = ligneActuelleCmd[0];
  const statutCommande = ligneActuelleCmd[11];

  const lignesExistantes = lireLignesCommande(referenceCommande, ligneActuelleCmd[7], ligneActuelleCmd[8]);
  if (lignesExistantes.length >= MAX_LIGNES_PAR_COMMANDE) {
    return { ok: false, erreur: 'Cette commande contient déjà le maximum de produits différents (' + MAX_LIGNES_PAR_COMMANDE + ')' };
  }

  const produit = lireProduits()[nomProduit];
  if (!produit) return { ok: false, erreur: 'Produit "' + nomProduit + '" introuvable au catalogue' };

  const structurePourLigne = lireStructures()[String(ligneActuelleCmd[2] || '').trim()] || {};
  const maxPourCeProduit = quantiteMaxPourProduit(produit, !!(structurePourLigne.esn || structurePourLigne.interne));
  if (!quantite || quantite < 1 || quantite > maxPourCeProduit) {
    return { ok: false, erreur: 'Quantité invalide (1 à ' + maxPourCeProduit + ')' };
  }

  if (statutCommande !== 'Annulée') {
    if (produit.stock < quantite) return { ok: false, erreur: 'Stock insuffisant pour ce produit' };
    ajusterStock(nomProduit, -quantite);
  }

  // Si la commande n'a encore aucune ligne dans LignesCommande (créée avant ce changement),
  // on migre d'abord son ancien résumé en vraie ligne, pour ne pas le perdre.
  const feuilleLignes = feuilleLignesCommande();
  const aDejaDesLignesEnBase = lignesExistantes.some(function(l) { return l.ligne !== null; });
  if (!aDejaDesLignesEnBase && lignesExistantes.length) {
    ajouterLignesCommande(feuilleLignes, referenceCommande, lignesExistantes);
  }

  feuilleLignes.appendRow([referenceCommande, nomProduit, quantite]);
  recalculerResumeCommande(ligneCommande, referenceCommande);
  invaliderCacheCommandes();

  return { ok: true };
}

/** Retire une ligne d'une commande (au moins une ligne doit toujours rester). */
function supprimerLigneCommande(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };

  const ligneCommande = parseInt(data.ligneCommande, 10);
  const ligneDetail = parseInt(data.ligne, 10);
  if (!ligneDetail) return { ok: false, erreur: 'Impossible de retirer cette ligne (commande à un seul produit, antérieure à cette fonctionnalité)' };

  const ligneActuelleCmd = feuilleCommandes().getRange(ligneCommande, 1, 1, ENTETES_COMMANDES.length).getValues()[0];
  const referenceCommande = ligneActuelleCmd[0];
  const statutCommande = ligneActuelleCmd[11];

  const lignesExistantes = lireLignesCommande(referenceCommande, null, null);
  if (lignesExistantes.length <= 1) {
    return { ok: false, erreur: 'Une commande doit garder au moins un produit — modifie-le plutôt que de le supprimer' };
  }

  const feuilleLignes = feuilleLignesCommande();
  const valeursActuelles = feuilleLignes.getRange(ligneDetail, 1, 1, 3).getValues()[0];
  const nomProduit = valeursActuelles[1];
  const quantite = parseInt(valeursActuelles[2], 10) || 0;

  if (statutCommande !== 'Annulée') ajusterStock(nomProduit, quantite);

  feuilleLignes.deleteRow(ligneDetail);
  recalculerResumeCommande(ligneCommande, referenceCommande);
  invaliderCacheCommandes();

  return { ok: true };
}

/* ══════════════ Enquête de satisfaction (J+7 après livraison) ══════════════
   Questions de départ à affiner ensemble — l'essentiel pour l'instant est que la mécanique
   (déclenchement, mail, formulaire, stockage) fonctionne de bout en bout. */

function configurerDeclencheurEnquetesSatisfaction(active) {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'envoyerEnquetesSatisfaction') ScriptApp.deleteTrigger(t);
  });
  if (active) {
    ScriptApp.newTrigger('envoyerEnquetesSatisfaction').timeBased().everyDays(1).atHour(9).create();
  }
}

/** Cherche les commandes livrées il y a exactement 7 jours (ou plus, si le déclencheur a
 *  loupé un jour), jamais encore sondées, et leur envoie le lien du formulaire. */
function envoyerEnquetesSatisfaction() {
  const feuille = feuilleCommandes();
  const lignes = feuille.getDataRange().getValues();
  const auPlusTard = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  let envoyees = 0;

  for (let i = 1; i < lignes.length; i++) {
    const l = lignes[i];
    if (!l[0] || l[11] !== 'Livrée') continue;
    if (l[33] === 'Oui') continue; // déjà sondée
    const dateLivraison = l[23];
    if (!(dateLivraison instanceof Date) || dateLivraison > auPlusTard) continue;

    const email = String(l[4] || '').trim();
    if (!email) { feuille.getRange(i + 1, 34).setValue('Oui'); continue; } // pas d'email connu : on marque quand même pour ne pas réessayer indéfiniment

    const lienEnquete = urlBase() + 'enquete-satisfaction.html?ref=' + encodeURIComponent(l[0]);
    try {
      MailApp.sendEmail(email, 'Votre avis sur votre commande ' + l[0],
        'Bonjour,\n\nVotre commande ' + l[0] + ' vous a été livrée il y a une semaine. '
        + 'Votre avis nous aide à améliorer le service :\n\n' + lienEnquete
        + '\n\nÇa prend moins de deux minutes. Merci !\n\nCordialement,\nCVDL');
      feuille.getRange(i + 1, 34).setValue('Oui');
      envoyees++;
    } catch (e) {
      Logger.log('Échec envoi enquête satisfaction pour ' + l[0] + ' : ' + e);
    }
  }
  return { ok: true, envoyees: envoyees };
}

function urlBase() {
  return obtenirConfig('URL_PAGES_PUBLIQUES', 'https://ec-cvdl.github.io/plateforme/');
}

/** Enregistre une réponse au formulaire de satisfaction — une feuille à part, jamais liée
 *  aux caches déjà en place (aucun impact sur les performances de l'admin). */
function enregistrerReponseEnquete(data) {
  const reference = String(data.reference || '').trim();
  if (!reference) return { ok: false, erreur: 'Référence manquante' };

  const feuille = classeurActif().getSheetByName('Enquetes') || (function() {
    const f = classeurActif().insertSheet('Enquetes');
    f.appendRow(['Référence commande', 'Date réponse', 'Note globale', 'Note délai', 'Note état du matériel', 'Commentaire']);
    f.getRange(1, 1, 1, 6).setFontWeight('bold');
    return f;
  })();

  feuille.appendRow([
    reference,
    new Date(),
    parseInt(data.noteGlobale, 10) || '',
    parseInt(data.noteDelai, 10) || '',
    parseInt(data.noteMateriel, 10) || '',
    String(data.commentaire || '').trim()
  ]);
  return { ok: true };
}


/**
 * CVDL — Backend commandes matériel (source : Devis.gs, 6 sur 8 — génération des devis)
 * Fait partie de backend/*.gs — voir Config.gs pour les instructions de génération.
 */

/* ══════════════ Devis ══════════════ */

/** Modèle de nommage des devis, persistant via PropertiesService.
 *  Jetons disponibles : {ANNEE} et {NUM} (numéro séquentiel, complété à 4 chiffres). */
const MODELE_DEVIS_DEFAUT = 'DEV-{ANNEE}-{NUM}';

function obtenirModeleDevis() {
  return PropertiesService.getScriptProperties().getProperty('MODELE_DEVIS') || MODELE_DEVIS_DEFAUT;
}

function definirModeleDevis(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  const modele = String(data.modele || '').trim();
  if (!modele) return { ok: false, erreur: 'Modèle vide' };
  if (modele.indexOf('{NUM}') === -1) return { ok: false, erreur: 'Le modèle doit contenir le jeton {NUM}' };
  PropertiesService.getScriptProperties().setProperty('MODELE_DEVIS', modele);
  return { ok: true, modele: modele };
}

/** Génère une référence de devis unique selon le modèle configuré, même après suppression de lignes. */
/** Compteur persistant (PropertiesService), jamais basé sur le nombre de lignes du tableur —
 *  sinon, supprimer ou annuler un devis ferait potentiellement réattribuer un numéro déjà
 *  utilisé. Une fois généré, un numéro n'est plus jamais réutilisé, même si le devis
 *  correspondant est ensuite annulé ou supprimé. */
function genererReferenceUnique() {
  const modele = obtenirModeleDevis();
  const annee = new Date().getFullYear();

  const props = PropertiesService.getScriptProperties();
  let numero = parseInt(props.getProperty('DEVIS_PROCHAIN_NUMERO') || '0', 10);
  numero++;
  props.setProperty('DEVIS_PROCHAIN_NUMERO', String(numero));

  return modele
    .replace('{ANNEE}', annee)
    .replace('{NUM}', String(numero).padStart(4, '0'));
}

/**
 * CVDL — Backend commandes matériel (source : Sav.gs, 7 sur 8 — journal de sécurité, tickets SAV, emails de suivi)
 * Fait partie de backend/*.gs — voir Config.gs pour les instructions de génération.
 */

/* ══════════════ Journal de sécurité ══════════════
   Version minimale volontairement simple : un onglet, trois colonnes, pas d'interface
   dédiée dans l'admin pour l'instant — à consulter directement dans le Sheets. Objectif :
   avoir un signal en cas d'acharnement (mot de passe ou code structure), pas une preuve
   légale. On ne journalise jamais le mot de passe tenté lui-même (seulement le fait qu'une
   tentative a échoué), pour ne pas stocker en clair une valeur proche du vrai mot de passe. */
const ENTETES_JOURNAL_SECURITE = ['Date/heure', 'Type', 'Détail'];

/* ══════════════ SAV ══════════════
   Le lien vers une commande reste toujours facultatif et jamais bloquant : du matériel
   vendu avant l'arrivée sur la plateforme (ou avant le suivi par numéro de série) doit
   pouvoir ouvrir un ticket comme n'importe quel autre. La recherche de correspondance est
   "best-effort" : elle enrichit le ticket quand elle trouve quelque chose, ne bloque jamais
   sinon. Le code structure est lui-même facultatif : un bénéficiaire sans code peut ouvrir
   un ticket identifié seulement par son nom et le numéro de série de son appareil. */
const ONGLET_SAV = 'SAV';
const ENTETES_SAV = [
  'Référence', 'Date', 'Code structure', 'Nom (structure ou personne)', 'Numéro de série',
  'Référence commande', 'Référence facture', 'Symptôme déclaré', 'Commentaire',
  'Marque', 'Modèle', 'Système d\'exploitation', 'Statut', 'Problème effectif',
  'Notes de résolution', 'Date de résolution',
  'Reconditionneur / ESN', 'Suivi Colissimo', 'Nouveau numéro de série (remplacement)',
  'Photo / pièce jointe', 'Lien vidéo', 'Email de contact', 'Date d\'achat ou de don',
  'Structure d\'origine (déclarée par le bénéficiaire)', 'Téléphone de contact'
];

/* ─── Statuts SAV : entièrement paramétrables, carte blanche complète ───
   Une feuille dédiée plutôt qu'une liste figée dans le code : chaque territoire peut avoir
   son propre déroulé, ses propres libellés, ses propres couleurs — configurable directement
   depuis l'onglet SAV de l'admin, pas seulement dans Réglages. Deux "drapeaux" par statut
   pilotent l'apparition progressive des champs sur la fiche : à partir du premier statut où
   Colissimo/Diagnostic est coché, ce champ reste affiché pour tous les statuts suivants
   (jamais un champ qui réapparaît puis disparaît en avançant dans le déroulé). */
const ONGLET_STATUTS_SAV = 'StatutsSAV';
const ENTETES_STATUTS_SAV = ['Ordre', 'Statut', 'Couleur', 'Afficher Colissimo', 'Afficher Diagnostic', 'Terminal', 'Départ du délai', 'Fin de cycle (anneau)'];
const COULEURS_SAV_DISPONIBLES = ['t-ambre', 't-bleu', 't-violet', 't-turquoise', 't-vert', 't-rouge', 't-gris'];

const STATUTS_SAV_DEFAUT = [
  ['SAV demandé',                                    't-ambre',     false, false, false, false],
  ['Prise en charge',                                 't-bleu',      true,  false, false, false],
  ['Matériel réceptionné par le reconditionneur/ESN', 't-bleu',      true,  false, false, true ],
  ['Diagnostic réalisé',                               't-violet',    true,  true,  false, false],
  ['Réparation effectuée',                             't-violet',    true,  true,  false, false],
  ['En attente de pièces',                             't-violet',    true,  true,  false, false],
  ['Livraison en cours',                               't-turquoise', true,  true,  false, false],
  ['Remplacement ou D3E',                              't-turquoise', true,  true,  false, false],
  ['SAV traité',                                        't-vert',      true,  true,  true,  false]
];

const PROBLEMES_EFFECTIFS_SAV = [
  'Écran', 'RAM', 'Batterie', 'Chargeur', 'Carte mère', 'Pile CMOS', 'Disque Dur', 'Clavier',
  'Faux positif', 'Problème d\'utilisation', 'Hors-garantie', 'Ventilateur', 'Haut-parleur',
  'Système d\'exploitation', 'BIOS'
];

const SYMPTOMES_SAV_DEFAUT = [
  'L\'écran ne s\'allume plus', 'L\'appareil ne se charge plus', 'Le clavier ne fonctionne plus ou mal'
].join('\n');
const SYMPTOMES_SAV = obtenirConfig('SYMPTOMES_SAV', SYMPTOMES_SAV_DEFAUT).split('\n').map(function(s) { return s.trim(); }).filter(Boolean);

const ONGLET_HISTORIQUE_SAV = 'HistoriqueSAV';
const ENTETES_HISTORIQUE_SAV = ['Référence ticket', 'Date', 'Statut'];

function feuilleStatutsSav() {
  const classeur = obtenirClasseur();
  let feuille = classeur.getSheetByName(ONGLET_STATUTS_SAV);
  if (!feuille) {
    feuille = classeur.insertSheet(ONGLET_STATUTS_SAV);
    feuille.appendRow(ENTETES_STATUTS_SAV);
    feuille.getRange(1, 1, 1, ENTETES_STATUTS_SAV.length).setFontWeight('bold');
    STATUTS_SAV_DEFAUT.forEach(function(s, i) {
      feuille.appendRow([i + 1, s[0], s[1], s[2], s[3], s[4], s[5]]);
    });
    feuille.setFrozenRows(1);
  }
  return feuille;
}

/** Liste ordonnée des statuts configurés, avec leurs drapeaux. */
function listerStatutsSavInterne() {
  const lignes = feuilleStatutsSav().getDataRange().getValues();
  const statuts = [];
  for (let i = 1; i < lignes.length; i++) {
    if (!lignes[i][1]) continue;
    statuts.push({
      ligne: i + 1, ordre: parseFloat(lignes[i][0]) || (i + 1), statut: lignes[i][1],
      couleur: lignes[i][2] || 't-gris',
      colissimo: lignes[i][3] === true || lignes[i][3] === 'TRUE' || lignes[i][3] === 'true',
      diagnostic: lignes[i][4] === true || lignes[i][4] === 'TRUE' || lignes[i][4] === 'true',
      terminal: lignes[i][5] === true || lignes[i][5] === 'TRUE' || lignes[i][5] === 'true',
      departDelai: lignes[i][6] === true || lignes[i][6] === 'TRUE' || lignes[i][6] === 'true',
      finCycle: lignes[i][7] === true || lignes[i][7] === 'TRUE' || lignes[i][7] === 'true'
    });
  }
  statuts.sort(function(a, b) { return a.ordre - b.ordre; });
  return statuts;
}

function listerStatutsSav(password) {
  if (password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  return { ok: true, statuts: listerStatutsSavInterne() };
}

/** Version publique — seulement nom/ordre/couleur, aucune info sensible, pour permettre à la
 *  page de suivi bénéficiaire de dessiner une timeline même sans être connecté à l'admin. */
function listerStatutsSavPublic() {
  const statuts = listerStatutsSavInterne().map(function(s) {
    return { statut: s.statut, ordre: s.ordre, couleur: s.couleur, terminal: !!s.terminal, finCycle: !!s.finCycle };
  });
  return { ok: true, statuts: statuts };
}

function ajouterStatutSav(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  const nom = String(data.statut || '').trim();
  if (!nom) return { ok: false, erreur: 'Le nom du statut est obligatoire' };

  const feuille = feuilleStatutsSav();
  const statuts = listerStatutsSavInterne();
  if (statuts.some(function(s) { return s.statut === nom; })) {
    return { ok: false, erreur: 'Ce statut existe déjà' };
  }
  const ordreMax = statuts.length ? Math.max.apply(null, statuts.map(function(s) { return s.ordre; })) : 0;
  feuille.appendRow([
    ordreMax + 1, nom, COULEURS_SAV_DISPONIBLES.indexOf(data.couleur) !== -1 ? data.couleur : 't-gris',
    !!data.colissimo, !!data.diagnostic, !!data.terminal, !!data.departDelai, !!data.finCycle
  ]);
  return { ok: true };
}

function majStatutSav(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  const colonnes = { statut: 2, couleur: 3, colissimo: 4, diagnostic: 5, terminal: 6, departDelai: 7, finCycle: 8 };
  const colonne = colonnes[data.champ];
  if (!colonne) return { ok: false, erreur: 'Champ non modifiable' };

  let valeur = data.valeur;
  if (data.champ === 'couleur' && COULEURS_SAV_DISPONIBLES.indexOf(valeur) === -1) valeur = 't-gris';
  if (data.champ === 'colissimo' || data.champ === 'diagnostic' || data.champ === 'terminal' || data.champ === 'departDelai' || data.champ === 'finCycle') {
    valeur = (valeur === true || valeur === 'true');
  }
  if (data.champ === 'statut') valeur = String(valeur || '').trim();

  feuilleStatutsSav().getRange(data.ligne, colonne).setValue(valeur);
  return { ok: true };
}

function supprimerStatutSav(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  const statuts = listerStatutsSavInterne();
  if (statuts.length <= 1) return { ok: false, erreur: 'Il doit rester au moins un statut' };
  feuilleStatutsSav().deleteRow(data.ligne);
  return { ok: true };
}

/** Échange l'ordre de ce statut avec son voisin immédiat (direction: 'haut' ou 'bas'). */
function deplacerStatutSav(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  const statuts = listerStatutsSavInterne();
  const index = statuts.findIndex(function(s) { return s.ligne === parseInt(data.ligne, 10); });
  if (index === -1) return { ok: false, erreur: 'Statut introuvable' };

  const cible = data.direction === 'haut' ? index - 1 : index + 1;
  if (cible < 0 || cible >= statuts.length) return { ok: true }; // déjà en haut/bas, rien à faire

  const feuille = feuilleStatutsSav();
  const ordreA = statuts[index].ordre, ordreB = statuts[cible].ordre;
  feuille.getRange(statuts[index].ligne, 1).setValue(ordreB);
  feuille.getRange(statuts[cible].ligne, 1).setValue(ordreA);
  return { ok: true };
}

function feuilleSav() {
  const classeur = classeurActif();
  let feuille = classeur.getSheetByName(ONGLET_SAV);
  if (!feuille) {
    feuille = classeur.insertSheet(ONGLET_SAV);
    feuille.appendRow(ENTETES_SAV);
    feuille.getRange(1, 1, 1, ENTETES_SAV.length).setFontWeight('bold');
    feuille.setFrozenRows(1);
  }
  return feuille;
}

function feuilleHistoriqueSav() {
  const classeur = classeurActif();
  let feuille = classeur.getSheetByName(ONGLET_HISTORIQUE_SAV);
  if (!feuille) {
    feuille = classeur.insertSheet(ONGLET_HISTORIQUE_SAV);
    feuille.appendRow(ENTETES_HISTORIQUE_SAV);
    feuille.getRange(1, 1, 1, ENTETES_HISTORIQUE_SAV.length).setFontWeight('bold');
    feuille.setFrozenRows(1);
  }
  return feuille;
}

function ajouterHistoriqueSav(referenceTicket, statut) {
  feuilleHistoriqueSav().appendRow([referenceTicket, new Date(), statut]);
}

/** Historique complet d'un ticket, dans l'ordre chronologique. */
function lireHistoriqueSav(referenceTicket) {
  const lignes = feuilleHistoriqueSav().getDataRange().getValues();
  const evenements = [];
  for (let i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]).trim() === referenceTicket) {
      evenements.push({
        date: lignes[i][1] ? Utilities.formatDate(new Date(lignes[i][1]), Session.getScriptTimeZone(), 'dd/MM/yyyy') : '',
        statut: lignes[i][2]
      });
    }
  }
  return evenements;
}

/** Recherche best-effort d'une commande à partir d'un numéro de série : parcourt le champ
 *  "Numéros de série" (une ou plusieurs valeurs séparées par des sauts de ligne) de chaque
 *  commande. Renvoie la première correspondance trouvée, ou null — ne bloque jamais l'appelant,
 *  sert uniquement à enrichir automatiquement le ticket quand c'est possible. */
function rechercherCommandeParNumeroSerie(numeroSerie) {
  const cherche = String(numeroSerie || '').trim().toLowerCase();
  if (!cherche) return null;

  const lignes = feuilleCommandes().getDataRange().getValues();
  for (let i = 1; i < lignes.length; i++) {
    const champSeries = String(lignes[i][15] || '');
    const series = champSeries.split('\n').map(function(s) { return s.trim().toLowerCase(); });
    if (series.indexOf(cherche) !== -1) {
      return { reference: lignes[i][0], code: lignes[i][2], nom: lignes[i][3] };
    }
  }
  return null;
}

/** Modèle de nommage des tickets SAV, même principe que celui des devis.
 *  Jetons disponibles : {ANNEE} et {NUM} (numéro séquentiel, complété à 4 chiffres). */
const MODELE_SAV_DEFAUT = 'SAV-{ANNEE}-{NUM}';

function obtenirModeleSav() {
  return PropertiesService.getScriptProperties().getProperty('MODELE_SAV') || MODELE_SAV_DEFAUT;
}

function definirModeleSav(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  const modele = String(data.modele || '').trim();
  if (!modele) return { ok: false, erreur: 'Modèle vide' };
  if (modele.indexOf('{NUM}') === -1) return { ok: false, erreur: 'Le modèle doit contenir le jeton {NUM}' };
  PropertiesService.getScriptProperties().setProperty('MODELE_SAV', modele);
  return { ok: true, modele: modele };
}

function genererReferenceSav() {
  const annee = new Date().getFullYear();
  const numero = feuilleSav().getLastRow();
  return obtenirModeleSav()
    .replace('{ANNEE}', annee)
    .replace('{NUM}', String(numero).padStart(4, '0'));
}

/** Point d'entrée public (formulaire) — le code structure est facultatif (un bénéficiaire
 *  sans code peut ouvrir un ticket), rien n'est jamais bloquant pour la création elle-même. */
/** Vue publique pour un bénéficiaire — protégée par le numéro de série (pas de code),
 *  jamais par le mot de passe admin. Ne renvoie que les champs utiles au suivi, rien
 *  d'interne (notes de résolution, diagnostic effectif, coordonnées d'autres personnes). */
function listerTicketsSavParNumeroSerie(data) {
  const numeroSerie = String(data.numeroSerie || '').trim().toLowerCase();
  if (!numeroSerie) return { ok: false, erreur: 'Numéro de série vide' };

  const lignes = feuilleSav().getDataRange().getValues();
  const tickets = [];
  for (let i = 1; i < lignes.length; i++) {
    const l = lignes[i];
    if (!l[0]) continue;
    if (String(l[4] || '').trim().toLowerCase() !== numeroSerie) continue;
    tickets.push({
      reference:      l[0],
      date:           l[1] ? Utilities.formatDate(new Date(l[1]), Session.getScriptTimeZone(), 'dd/MM/yyyy') : '',
      symptome:       l[7],
      statut:         l[12],
      dateResolution: l[15] ? Utilities.formatDate(new Date(l[15]), Session.getScriptTimeZone(), 'dd/MM/yyyy') : '',
      colissimo:      l[17] || '',
      notesResolution: l[14] || '',
      historique:     lireHistoriqueSav(l[0])
    });
  }

  if (!tickets.length) {
    journaliserEvenementSecurite('Suivi SAV bénéficiaire sans résultat', numeroSerie);
  }

  return { ok: true, tickets: tickets.reverse() };
}

/** Même principe pour une structure — protégée par son code, tous ses tickets (pas un seul
 *  numéro de série à la fois), avec le nom de la structure pour l'affichage. */
function listerTicketsSavParCode(data) {
  const code = String(data.code || '').trim();
  if (!code) return { ok: false, erreur: 'Code vide' };

  const structure = lireStructures()[code];
  if (!structure) {
    journaliserEvenementSecurite('Code structure invalide (suivi SAV)', code);
    return { ok: false, erreur: 'Code inconnu' };
  }

  const lignes = feuilleSav().getDataRange().getValues();
  const tickets = [];
  for (let i = 1; i < lignes.length; i++) {
    const l = lignes[i];
    if (!l[0]) continue;
    if (String(l[2] || '').trim() !== code) continue;
    tickets.push({
      reference:      l[0],
      date:           l[1] ? Utilities.formatDate(new Date(l[1]), Session.getScriptTimeZone(), 'dd/MM/yyyy') : '',
      numeroSerie:    l[4] || '',
      symptome:       l[7],
      statut:         l[12],
      dateResolution: l[15] ? Utilities.formatDate(new Date(l[15]), Session.getScriptTimeZone(), 'dd/MM/yyyy') : '',
      colissimo:      l[17] || '',
      notesResolution: l[14] || '',
      historique:     lireHistoriqueSav(l[0])
    });
  }

  return { ok: true, nomStructure: structure.nom, tickets: tickets.reverse() };
}

function creerTicketSav(data) {
  const nom = String(data.nom || '').trim();
  if (!nom) return { ok: false, erreur: 'Merci d\'indiquer un nom (structure ou personne)' };

  const email = String(data.email || '').trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, erreur: 'Merci d\'indiquer une adresse email valide' };
  }

  const symptome = String(data.symptome || '').trim();
  if (!symptome) return { ok: false, erreur: 'Merci de choisir un symptôme' };

  // Code structure facultatif : s'il est fourni, il doit correspondre à une vraie structure
  let codeStructure = '';
  if (data.code) {
    const structure = lireStructures()[String(data.code).trim()];
    if (!structure) return { ok: false, erreur: 'Code structure invalide' };
    codeStructure = structure.code;
  }

  const numeroSerie = String(data.numeroSerie || '').trim();
  const correspondance = rechercherCommandeParNumeroSerie(numeroSerie);
  const referenceCommande = correspondance ? correspondance.reference : '';

  const statuts = listerStatutsSavInterne();
  const statutInitial = statuts.length ? statuts[0].statut : 'SAV demandé';
  const reference = genererReferenceSav();

  // Photos facultatives : même mécanisme de validation/dépôt que pour les commandes
  let lienPhoto = '';
  if (data.fichiers && data.fichiers.length) {
    try {
      const resultat = enregistrerFichiers(data.fichiers, reference, nom, new Date());
      lienPhoto = resultat.url;
    } catch (e) {
      return { ok: false, erreur: String(e.message || e) };
    }
  }

  feuilleSav().appendRow([
    reference, new Date(), codeStructure, nom, numeroSerie,
    referenceCommande, String(data.referenceFacture || '').trim(), symptome,
    String(data.commentaire || '').trim(),
    '', '', '', // marque, modèle, système — remplis manuellement plus tard côté admin, ou par API un jour
    statutInitial, '', '', '',
    '', '', '', // reconditionneur, colissimo, nouveau numéro de série (remplacement)
    lienPhoto, String(data.lienVideo || '').trim(),
    email, String(data.dateAchat || '').trim(), String(data.structureOrigine || '').trim(),
    String(data.telephone || '').trim()
  ]);
  ajouterHistoriqueSav(reference, statutInitial);
  invaliderCacheSav();

  return { ok: true, reference: reference, commandeTrouvee: !!correspondance };
}

/** Vérification autonome d'un numéro de série, pour le parcours "sans code" (bénéficiaire) :
 *  cherche une correspondance dans les commandes, renvoie la structure trouvée si oui. Ne
 *  bloque jamais la création du ticket derrière — sert seulement à afficher un message
 *  rassurant ou, à défaut, à orienter vers l'email de contact SAV. */
function verifierNumeroSerieSav(numeroSerie) {
  const correspondance = rechercherCommandeParNumeroSerie(numeroSerie);
  return {
    ok: true,
    trouve: !!correspondance,
    nomStructure: correspondance ? correspondance.nom : '',
    emailContact: EMAIL_CONTACT_SAV
  };
}

/** Création manuelle depuis le back-office (ticket reçu par téléphone/email). */
function creerTicketSavManuel(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };

  const nom = String(data.nom || '').trim();
  if (!nom) return { ok: false, erreur: 'Le nom (structure ou personne) est obligatoire' };

  let codeStructure = '';
  if (data.code) {
    const structure = lireStructures()[String(data.code).trim()];
    if (!structure) return { ok: false, erreur: 'Code structure introuvable' };
    codeStructure = structure.code;
  }

  const numeroSerie = String(data.numeroSerie || '').trim();
  const correspondance = rechercherCommandeParNumeroSerie(numeroSerie);
  const referenceCommande = String(data.referenceCommande || '').trim() || (correspondance ? correspondance.reference : '');

  const statuts = listerStatutsSavInterne();
  const statutInitial = data.statut || (statuts.length ? statuts[0].statut : 'SAV demandé');

  const reference = genererReferenceSav();
  feuilleSav().appendRow([
    reference, new Date(), codeStructure, nom, numeroSerie,
    referenceCommande, String(data.referenceFacture || '').trim(), String(data.symptome || '').trim(),
    String(data.commentaire || '').trim(),
    String(data.marque || '').trim(), String(data.modele || '').trim(), String(data.systeme || '').trim(),
    statutInitial, '', String(data.notes || '').trim(), '',
    '', '', '',
    '', '',
    String(data.email || '').trim(), String(data.dateAchat || '').trim(), String(data.structureOrigine || '').trim()
  ]);
  ajouterHistoriqueSav(reference, statutInitial);

  return { ok: true, reference: reference };
}

function listerSav(password, limite, decalage, recherche) {
  if (password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };

  const cleCache = 'sav_v' + versionCache('sav');
  let baseSav = lireCacheDecoupe(cleCache);

  if (!baseSav) {
    const debutConstruction = Date.now();
    baseSav = construireBaseSav();
    Logger.log('[listerSav] construireBaseSav (cache manquant) — ' + (Date.now() - debutConstruction) + ' ms, ' + baseSav.toutes.length + ' tickets');
    mettreEnCacheDecoupe(cleCache, baseSav);
  }

  const toutes = baseSav.toutes;
  const nombreEnAttente = baseSav.nombreEnAttente;

  const termeRecherche = String(recherche || '').trim().toLowerCase();

  if (termeRecherche) {
    const resultats = toutes.filter(function(t) {
      const cible = (t.reference + ' ' + t.nom + ' ' + t.numeroSerie + ' ' + t.referenceCommande + ' ' + t.referenceFacture).toLowerCase();
      return cible.includes(termeRecherche);
    });
    return { ok: true, tickets: resultats.slice(0, 200).map(formaterDatesSav), total: toutes.length, recherche: true, nombreEnAttente: nombreEnAttente };
  }

  const limiteNombre = parseInt(limite, 10) || 0;
  const decalageNombre = parseInt(decalage, 10) || 0;
  const limitees = (limiteNombre > 0 ? toutes.slice(decalageNombre, decalageNombre + limiteNombre) : toutes).map(formaterDatesSav);
  return { ok: true, tickets: limitees, total: toutes.length, nombreEnAttente: nombreEnAttente };
}

/** Le vrai travail coûteux de listerSav — isolé pour pouvoir être mis en cache. */
function construireBaseSav() {
  // Historique chargé une seule fois, groupé par référence, plutôt qu'une lecture par ticket
  const historiqueParReference = {};
  const lignesHisto = feuilleHistoriqueSav().getDataRange().getValues();
  for (let i = 1; i < lignesHisto.length; i++) {
    const ref = String(lignesHisto[i][0] || '').trim();
    if (!ref) continue;
    if (!historiqueParReference[ref]) historiqueParReference[ref] = [];
    historiqueParReference[ref].push({
      dateRaw: lignesHisto[i][1] instanceof Date ? lignesHisto[i][1].toISOString() : '',
      statut: lignesHisto[i][2]
    });
  }

  const lignes = feuilleSav().getDataRange().getValues();
  const tickets = [];
  for (let i = 1; i < lignes.length; i++) {
    const l = lignes[i];
    if (!l[0]) continue;
    tickets.push({
      ligne:               i + 1,
      reference:           l[0],
      dateRaw:             l[1] instanceof Date ? l[1].toISOString() : '',
      code:                l[2] || '',
      nom:                 l[3],
      numeroSerie:         l[4] || '',
      referenceCommande:   l[5] || '',
      referenceFacture:    l[6] || '',
      symptome:            l[7] || '',
      commentaire:         l[8] || '',
      marque:              l[9] || '',
      modele:              l[10] || '',
      systeme:             l[11] || '',
      statut:              l[12] || '',
      problemeEffectif:    l[13] || '',
      notes:               l[14] || '',
      dateResolutionRaw:   l[15] instanceof Date ? l[15].toISOString() : '',
      reconditionneur:     l[16] || '',
      colissimo:           l[17] || '',
      nouveauNumeroSerie:  l[18] || '',
      photo:               l[19] || '',
      lienVideo:           l[20] || '',
      email:               l[21] || '',
      dateAchat:           l[22] || '',
      structureOrigine:    l[23] || '',
      telephone:           l[24] || '',
      historiqueRaw:       historiqueParReference[l[0]] || []
    });
  }
  const toutes = tickets.reverse();

  // Même principe que pour les commandes : ce total ne doit jamais dépendre de la page
  // affichée, sinon le bandeau d'en-tête changerait selon la pagination en cours.
  const statutsOrdonnes = listerStatutsSavInterne();
  const premierStatut = statutsOrdonnes.length ? statutsOrdonnes[0].statut : null;
  const nombreEnAttente = premierStatut ? toutes.filter(function(t) { return t.statut === premierStatut; }).length : 0;

  return { toutes: toutes, nombreEnAttente: nombreEnAttente };
}

/** Formate les dates d'un ticket SAV (et de son historique) — appelé uniquement sur les
 *  tickets réellement renvoyés à un appel donné (voir formaterDatesCommande, même principe
 *  et même raison : rester rapide même avec un gros historique de tickets). */
function formaterDatesSav(t) {
  const tz = Session.getScriptTimeZone();
  return Object.assign({}, t, {
    date:           t.dateRaw ? Utilities.formatDate(new Date(t.dateRaw), tz, 'dd/MM/yyyy') : '',
    heure:          t.dateRaw ? Utilities.formatDate(new Date(t.dateRaw), tz, 'HH:mm') : '',
    dateResolution: t.dateResolutionRaw ? Utilities.formatDate(new Date(t.dateResolutionRaw), tz, 'dd/MM/yyyy') : '',
    historique: (t.historiqueRaw || []).map(function(h) {
      return { date: h.dateRaw ? Utilities.formatDate(new Date(h.dateRaw), tz, 'dd/MM/yyyy') : '', statut: h.statut };
    })
  });
}

function majSav(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };

  const colonnes = {
    nom: 4, numeroSerie: 5, referenceCommande: 6, referenceFacture: 7, symptome: 8, commentaire: 9,
    marque: 10, modele: 11, systeme: 12, statut: 13, problemeEffectif: 14, notes: 15,
    reconditionneur: 17, colissimo: 18, nouveauNumeroSerie: 19, email: 22, dateAchat: 23, structureOrigine: 24,
    telephone: 25
  };
  const colonne = colonnes[data.champ];
  if (!colonne) return { ok: false, erreur: 'Champ non modifiable' };

  const feuille = feuilleSav();

  if (data.champ === 'statut') {
    const reference = feuille.getRange(data.ligne, 1).getValue();
    ajouterHistoriqueSav(reference, data.valeur);
    // Date de résolution auto-remplie une seule fois, au passage sur un statut marqué "Terminal"
    const statutCible = listerStatutsSavInterne().find(function(s) { return s.statut === data.valeur; });
    if (statutCible && statutCible.terminal) {
      const dateResolutionActuelle = feuille.getRange(data.ligne, 16).getValue();
      if (!dateResolutionActuelle) feuille.getRange(data.ligne, 16).setValue(new Date());
    }
  }

  feuille.getRange(data.ligne, colonne).setValue(String(data.valeur ?? ''));
  invaliderCacheSav();
  return { ok: true };
}

function supprimerSav(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  feuilleSav().deleteRow(data.ligne);
  invaliderCacheSav();
  return { ok: true };
}

/* ══════════════ Envoi d'email — suivi Colissimo ══════════════
   Toujours déclenché manuellement par l'admin, jamais automatique côté serveur — la fenêtre
   de confirmation vit côté client, ce qui compte ici est de ne jamais envoyer sans un ligne
   et une adresse email valides, et de renvoyer une erreur claire sinon plutôt qu'un échec muet.
   Le sujet/corps par défaut sont toujours reconstruits ici (jamais confiés tels quels au
   front) ; le front peut ensuite les modifier avant de les renvoyer pour l'envoi réel. */
function construireEmailColissimoCommande(l) {
  const reference = l[0], nom = l[3], colissimo = String(l[22] || '').trim();
  const liens = colissimo.split('\n').map(function(s) { return s.trim(); }).filter(Boolean).join('\n');

  // Caractéristiques matériel (colonne 26) : une ligne "numéro de série: caractéristiques" par
  // appareil, importées depuis le CSV tec.tech — on les rattache ici au bon numéro de série
  // (colonne 16) pour enrichir le mail, sans jamais bloquer l'envoi si l'info manque.
  const numerosSerie = String(l[15] || '').split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
  const caracteristiquesBrutes = String(l[25] || '').split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
  const specsParSerie = {};
  caracteristiquesBrutes.forEach(function(ligneSpec) {
    const sep = ligneSpec.indexOf(':');
    if (sep === -1) return;
    specsParSerie[ligneSpec.slice(0, sep).trim()] = ligneSpec.slice(sep + 1).trim();
  });

  let blocMateriel = '';
  if (numerosSerie.length && Object.keys(specsParSerie).length) {
    blocMateriel = '\n' + numerosSerie.map(function(n) {
      return specsParSerie[n] ? (n + ' (' + specsParSerie[n] + ')') : n;
    }).join('\n') + '\n';
  }

  const bonLivraison = String(l[26] || '').trim();
  const blocBonLivraison = bonLivraison ? ('\nVotre bon de livraison :\n' + bonLivraison + '\n') : '';

  return {
    sujet: 'Suivi de votre commande ' + reference,
    corps: 'Bonjour ' + nom + ',\n\nVoici le suivi de votre colis pour la commande ' + reference + ' :\n' +
      blocMateriel + blocBonLivraison + '\n' + liens + '\n\nCordialement,\n' + NOM_ORGANISATION
  };
}

function apercuEmailColissimoCommande(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  const l = feuilleCommandes().getRange(data.ligne, 1, 1, ENTETES_COMMANDES.length).getValues()[0];
  const email = String(l[4] || '').trim(), colissimo = String(l[22] || '').trim();
  if (!email) return { ok: false, erreur: 'Aucune adresse email connue pour cette commande' };
  if (!colissimo) return { ok: false, erreur: 'Aucun lien Colissimo renseigné pour cette commande' };
  const email_construit = construireEmailColissimoCommande(l);
  return { ok: true, email: email, sujet: email_construit.sujet, corps: email_construit.corps };
}

function envoyerEmailColissimoCommande(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };

  const feuille = feuilleCommandes();
  const l = feuille.getRange(data.ligne, 1, 1, ENTETES_COMMANDES.length).getValues()[0];
  const email = String(l[4] || '').trim(), colissimo = String(l[22] || '').trim();

  if (!email) return { ok: false, erreur: 'Aucune adresse email connue pour cette commande' };
  if (!colissimo) return { ok: false, erreur: 'Aucun lien Colissimo renseigné pour cette commande' };

  const parDefaut = construireEmailColissimoCommande(l);
  const sujet = String(data.sujet || '').trim() || parDefaut.sujet;
  const corps = String(data.corps || '').trim() || parDefaut.corps;

  try {
    MailApp.sendEmail({ to: email, subject: sujet, body: corps });
  } catch (e) {
    return { ok: false, erreur: 'Envoi impossible : ' + String(e.message || e) };
  }
  return { ok: true, email: email };
}

function construireEmailColissimoSav(l) {
  const reference = l[0], nom = l[3], colissimo = String(l[17] || '').trim();
  const liens = colissimo.split('\n').map(function(s) { return s.trim(); }).filter(Boolean).join('\n');
  return {
    sujet: 'Suivi de votre SAV ' + reference,
    corps: EMAIL_MODELE_SAV
      .replace(/\{\{NOM\}\}/g, nom)
      .replace(/\{\{REFERENCE\}\}/g, reference)
      .replace(/\{\{COLISSIMO\}\}/g, liens)
      .replace(/\{\{ORGANISATION\}\}/g, NOM_ORGANISATION)
  };
}

function apercuEmailColissimoSav(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  const l = feuilleSav().getRange(data.ligne, 1, 1, ENTETES_SAV.length).getValues()[0];
  const colissimo = String(l[17] || '').trim(), email = String(l[21] || '').trim();
  if (!email) return { ok: false, erreur: 'Aucune adresse email connue pour ce ticket' };
  if (!colissimo) return { ok: false, erreur: 'Aucun lien Colissimo renseigné pour ce ticket' };
  const construit = construireEmailColissimoSav(l);
  return { ok: true, email: email, sujet: construit.sujet, corps: construit.corps };
}

function envoyerEmailColissimoSav(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };

  const feuille = feuilleSav();
  const l = feuille.getRange(data.ligne, 1, 1, ENTETES_SAV.length).getValues()[0];
  const colissimo = String(l[17] || '').trim(), email = String(l[21] || '').trim();

  if (!email) return { ok: false, erreur: 'Aucune adresse email connue pour ce ticket' };
  if (!colissimo) return { ok: false, erreur: 'Aucun lien Colissimo renseigné pour ce ticket' };

  const parDefaut = construireEmailColissimoSav(l);
  const sujet = String(data.sujet || '').trim() || parDefaut.sujet;
  const corps = String(data.corps || '').trim() || parDefaut.corps;

  try {
    MailApp.sendEmail({ to: email, subject: sujet, body: corps });
  } catch (e) {
    return { ok: false, erreur: 'Envoi impossible : ' + String(e.message || e) };
  }
  return { ok: true, email: email };
}

function feuilleJournalSecurite() {
  const classeur = obtenirClasseur();
  let feuille = classeur.getSheetByName(ONGLET_JOURNAL_SECURITE);

  if (!feuille) {
    feuille = classeur.insertSheet(ONGLET_JOURNAL_SECURITE);
    feuille.appendRow(ENTETES_JOURNAL_SECURITE);
    feuille.getRange(1, 1, 1, ENTETES_JOURNAL_SECURITE.length).setFontWeight('bold');
    feuille.setFrozenRows(1);
  }
  return feuille;
}

function journaliserEvenementSecurite(type, detail) {
  try {
    feuilleJournalSecurite().appendRow([new Date(), type, detail || '']);
  } catch (e) {
    Logger.log('Journalisation sécurité impossible : ' + e);
  }
}

function feuilleDevis() {
  const classeur = classeurActif();
  let feuille = classeur.getSheetByName(ONGLET_DEVIS);

  if (!feuille) {
    feuille = classeur.insertSheet(ONGLET_DEVIS);
    feuille.appendRow(ENTETES_DEVIS);
    feuille.getRange(1, 1, 1, ENTETES_DEVIS.length).setFontWeight('bold');
    feuille.setFrozenRows(1);
  }
  return feuille;
}

function devisExistePourCommande(referenceCommande) {
  if (!referenceCommande) return false;
  const lignes = feuilleDevis().getDataRange().getValues();
  for (let i = 1; i < lignes.length; i++) {
    if (lignes[i][2] === referenceCommande) return true;
  }
  return false;
}

/** Calcule le prix unitaire d'un produit pour une structure donnée (RN ou non). */
function calculerPrixUnitaire(codeStructure, nomProduit) {
  const produit = lireProduits()[String(nomProduit).trim()];
  if (!produit) return null;
  const structure = lireStructures()[String(codeStructure || '').trim()];
  const estRN = structure ? structure.rn : false;
  return { produit: produit, prixUnitaire: estRN ? produit.prixRN : produit.prixStandard };
}

function inscrireDevis(referenceCommande, codeStructure, nomStructure, email, adresse, nomProduit, quantite, moyenPaiement) {
  const calcul = calculerPrixUnitaire(codeStructure, nomProduit);
  if (!calcul) return { ok: false, erreur: 'Produit "' + nomProduit + '" introuvable au catalogue' };

  const montant = calcul.prixUnitaire * quantite;
  const feuille = feuilleDevis();
  const referenceDevis = genererReferenceUnique();

  feuille.appendRow([
    referenceDevis, new Date(), referenceCommande || '', nomStructure, email, adresse,
    nomProduit, quantite, moyenPaiement, calcul.prixUnitaire, montant, 'Émis', ''
  ]);
  invaliderCacheDevis();

  return { ok: true, referenceDevis: referenceDevis, montant: montant };
}

/** Devis automatique déclenché par le passage d'une commande en "Validée". */
/** Point d'entrée pour le bouton "Faire un devis" sur une commande — genererDevis() ne
 *  vérifie pas le mot de passe elle-même (appelée en interne depuis majCommande, déjà
 *  authentifiée), donc ce petit wrapper s'en charge pour l'appel direct depuis le bouton. */
function creerDevisDirect(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  return genererDevis(data.ligne);
}

function genererDevis(ligneCommande) {
  const feuilleCmd = feuilleCommandes();
  const c = feuilleCmd.getRange(ligneCommande, 1, 1, ENTETES_COMMANDES.length).getValues()[0];
  const [reference, , codeStructure, nomStructure, email, , adresse, resumeProduit, quantiteTotale, moyenPaiement] = c;

  const structurePourVerif = lireStructures()[codeStructure];
  if (structurePourVerif && (structurePourVerif.esn || structurePourVerif.interne)) {
    return { ok: false, erreur: 'Cette structure est de type ESN ou Interne — aucun devis n\'est généré pour elle' };
  }
  const emailDevis = (structurePourVerif && structurePourVerif.emailFacturation) || email;

  if (devisExistePourCommande(reference)) {
    return { ok: false, erreur: 'Un devis existe déjà pour ' + reference };
  }

  // Agrège le montant à partir des vraies lignes de la commande (elle peut contenir
  // plusieurs produits) — le résumé/quantité de la commande servent juste à l'affichage.
  const detailLignes = lireLignesCommande(reference, resumeProduit, quantiteTotale);
  let montant = 0;
  for (const l of detailLignes) {
    const calcul = calculerPrixUnitaire(codeStructure, l.produit);
    if (!calcul) return { ok: false, erreur: 'Produit "' + l.produit + '" introuvable au catalogue' };
    montant += calcul.prixUnitaire * l.quantite;
  }
  const prixUnitaireAffiche = detailLignes.length === 1
    ? (montant / (detailLignes[0].quantite || 1)) : ''; // n'a de sens que pour un seul produit

  const feuilleDev = feuilleDevis();
  const referenceDevis = genererReferenceUnique();
  feuilleDev.appendRow([
    referenceDevis, new Date(), reference, nomStructure, emailDevis, adresse,
    resumeProduit, quantiteTotale, moyenPaiement, prixUnitaireAffiche, montant, 'Émis', ''
  ]);

  // La commande garde une trace de son devis, visible et modifiable dans le back-office
  feuilleCmd.getRange(ligneCommande, 18).setValue(referenceDevis);
  invaliderCacheDevis();
  invaliderCacheCommandes();

  return { ok: true, referenceDevis: referenceDevis, montant: montant };
}

/** Devis créé librement depuis le back-office, rattaché ou non à une commande existante. */
function creerDevisManuel(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };

  const structure = lireStructures()[String(data.code || '').trim()];
  if (!structure) return { ok: false, erreur: 'Structure introuvable pour ce code' };
  if (structure.esn || structure.interne) return { ok: false, erreur: 'Cette structure est de type ESN ou Interne — aucun devis n\'est généré pour elle' };

  const quantite = parseInt(data.quantite, 10);
  if (!quantite || quantite < 1) return { ok: false, erreur: 'Quantité invalide' };
  if (!data.produit) return { ok: false, erreur: 'Produit manquant' };
  if (!data.moyenPaiement) return { ok: false, erreur: 'Moyen de paiement manquant' };

  const referenceCommande = String(data.referenceCommande || '').trim();
  if (!referenceCommande) {
    return { ok: false, erreur: 'Un devis doit obligatoirement être rattaché à une commande existante' };
  }
  if (devisExistePourCommande(referenceCommande)) {
    return { ok: false, erreur: 'Un devis existe déjà pour la commande ' + referenceCommande };
  }
  const lignesCmdVerif = feuilleCommandes().getDataRange().getValues();
  const commandeExiste = lignesCmdVerif.some(function(l) { return l[0] === referenceCommande; });
  if (!commandeExiste) {
    return { ok: false, erreur: 'Aucune commande trouvée avec la référence "' + referenceCommande + '"' };
  }

  const resultat = inscrireDevis(
    referenceCommande, structure.code, structure.nom, structure.emailFacturation || structure.email, structure.adresse,
    data.produit, quantite, data.moyenPaiement
  );
  if (!resultat.ok) return resultat;

  // Si une référence de commande existante a été précisée, on y reporte le lien
  if (referenceCommande) {
    const lignes = feuilleCommandes().getDataRange().getValues();
    for (let i = 1; i < lignes.length; i++) {
      if (lignes[i][0] === referenceCommande) {
        feuilleCommandes().getRange(i + 1, 18).setValue(resultat.referenceDevis);
        feuilleCommandes().getRange(i + 1, 22).setValue(''); // le devis existe désormais, l'alerte n'a plus lieu d'être
        invaliderCacheCommandes();
        break;
      }
    }
  }

  return resultat;
}

function supprimerDevis(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  feuilleDevis().deleteRow(data.ligne);
  invaliderCacheDevis();
  return { ok: true };
}

/** Supprime une facture. Ne touche pas à la commande liée (la référence facture y reste visible
 *  à titre d'historique) ni au devis dont elle serait issue — suppression volontairement isolée. */
function supprimerFacture(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  feuilleFactures().deleteRow(data.ligne);
  invaliderCacheFactures();
  return { ok: true };
}

function listerDevis(password, limite, decalage, recherche) {
  if (password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };

  const cleCache = 'devis_v' + versionCache('devis');
  let toutes = lireCacheDecoupe(cleCache);

  if (!toutes) {
    const debutConstruction = Date.now();
    const lignes = feuilleDevis().getDataRange().getValues();
    toutes = [];
    for (let i = 1; i < lignes.length; i++) {
      if (!lignes[i][0]) continue;
      toutes.push({
        ligne:             i + 1,
        referenceDevis:    lignes[i][0],
        dateRaw:           lignes[i][1] instanceof Date ? lignes[i][1].toISOString() : '',
        referenceCommande: lignes[i][2],
        nomStructure:      lignes[i][3],
        email:             lignes[i][4],
        adresse:           lignes[i][5],
        produit:           lignes[i][6],
        quantite:          lignes[i][7],
        moyenPaiement:     lignes[i][8],
        prixUnitaire:      lignes[i][9],
        montantTotal:      lignes[i][10],
        statut:            lignes[i][11],
        referenceFacture:  lignes[i][12]
      });
    }
    toutes.reverse();
    mettreEnCacheDecoupe(cleCache, toutes);
    Logger.log('[listerDevis] construction (cache manquant) — ' + (Date.now() - debutConstruction) + ' ms, ' + toutes.length + ' devis');
  }

  const formaterDateDevis = d => Object.assign({}, d, { date: d.dateRaw ? Utilities.formatDate(new Date(d.dateRaw), Session.getScriptTimeZone(), 'dd/MM/yyyy') : '' });

  const termeRecherche = String(recherche || '').trim().toLowerCase();
  if (termeRecherche) {
    const resultats = toutes.filter(function(d) {
      const cible = (d.referenceDevis + ' ' + d.referenceCommande + ' ' + d.nomStructure + ' ' + d.email + ' ' + d.produit).toLowerCase();
      return cible.includes(termeRecherche);
    });
    return { ok: true, devis: resultats.slice(0, 200).map(formaterDateDevis), total: toutes.length, recherche: true };
  }

  const limiteNombre = parseInt(limite, 10) || 0;
  const decalageNombre = parseInt(decalage, 10) || 0;
  const limitees = (limiteNombre > 0 ? toutes.slice(decalageNombre, decalageNombre + limiteNombre) : toutes).map(formaterDateDevis);
  return { ok: true, devis: limitees, total: toutes.length };
}

/**
 * CVDL — Backend commandes matériel (source : Facturation.gs, 8 sur 8 — factures, numérotation officielle, comptabilité)
 * Fait partie de backend/*.gs — voir Config.gs pour les instructions de génération.
 */

/* ══════════════ Factures ══════════════ */

function feuilleFactures() {
  const classeur = classeurActif();
  let feuille = classeur.getSheetByName(ONGLET_FACTURES);

  if (!feuille) {
    feuille = classeur.insertSheet(ONGLET_FACTURES);
    feuille.appendRow(ENTETES_FACTURES);
    feuille.getRange(1, 1, 1, ENTETES_FACTURES.length).setFontWeight('bold');
    feuille.setFrozenRows(1);
  }
  return feuille;
}

function factureNumeroExiste(numero) {
  const lignes = feuilleFactures().getDataRange().getValues();
  for (let i = 1; i < lignes.length; i++) {
    if (String(lignes[i][0]).trim().toLowerCase() === String(numero).trim().toLowerCase()) return true;
  }
  return false;
}

/** Convertit un devis existant en facture. Le numéro est saisi à la main
 *  (fichier de numérotation externe non automatisé pour l'instant). */
function convertirDevisEnFacture(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };

  const numeroFacture = String(data.numeroFacture || '').trim();
  if (!numeroFacture) return { ok: false, erreur: 'Le numéro de facture est obligatoire' };
  if (factureNumeroExiste(numeroFacture)) return { ok: false, erreur: 'Ce numéro de facture est déjà utilisé' };

  const feuilleDev = feuilleDevis();
  const d = feuilleDev.getRange(data.ligne, 1, 1, ENTETES_DEVIS.length).getValues()[0];
  const [referenceDevis, , referenceCommande, nomStructure, email, adresse, produit, quantite, moyenPaiement, prixUnitaire, montantTotal, statutActuel] = d;

  if (statutActuel === 'Converti') {
    return { ok: false, erreur: 'Ce devis a déjà été converti en facture' };
  }

  feuilleFactures().appendRow([
    numeroFacture, new Date(), referenceCommande, nomStructure, email, adresse,
    produit, quantite, moyenPaiement, prixUnitaire, montantTotal, ''
  ]);

  feuilleDev.getRange(data.ligne, 12).setValue('Converti');
  feuilleDev.getRange(data.ligne, 13).setValue(numeroFacture);
  invaliderCacheDevis();
  invaliderCacheFactures();

  reporterFactureSurCommande(referenceCommande, numeroFacture);

  return { ok: true, referenceFacture: numeroFacture, montant: montantTotal };
}

/** Facture directe depuis une commande, sans passer par un devis. */
/* ══════════════ Fichier externe de numérotation officielle des factures ══════════════
   Classeur séparé (pas celui de CVDL), pré-numéroté à l'avance : colonne B = nom de la
   structure (rempli au fur et à mesure), colonne C = numéro de facture (déjà présent).
   On y trouve la prochaine ligne "réservée mais pas encore utilisée", on la montre à
   l'admin pour confirmation, et seulement APRÈS confirmation on y écrit le nom de la
   structure — jamais d'écriture silencieuse, pour ne jamais risquer d'écraser une ligne
   que quelqu'un d'autre aurait commencé à remplir autrement que par la colonne B. */

function listerOngletsNumerotation(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  if (!FICHIER_NUMEROTATION) return { ok: false, erreur: 'Aucun fichier de numérotation configuré (Réglages)' };

  try {
    const classeur = SpreadsheetApp.openById(FICHIER_NUMEROTATION);
    const onglets = classeur.getSheets().map(function(f) { return { nom: f.getName(), gid: f.getSheetId() }; });
    return { ok: true, onglets: onglets, ongletParDefaut: ONGLET_NUMEROTATION, fichierId: FICHIER_NUMEROTATION };
  } catch (e) {
    return { ok: false, erreur: 'Fichier de numérotation introuvable ou inaccessible : ' + e.message };
  }
}

/** Cherche la prochaine ligne "prête à être utilisée" dans l'onglet choisi : la colonne B
 *  (structure) doit être vide, la colonne C (numéro) doit déjà contenir une valeur, et on
 *  vérifie deux lignes au-dessus (doivent être déjà utilisées, colonne B remplie — confirme
 *  qu'on est bien à la suite d'un bloc continu) et deux lignes en dessous (doivent être
 *  encore vides, confirme qu'on ne s'arrête pas au milieu par erreur). Si d'autres colonnes
 *  que B sont déjà renseignées sur la ligne trouvée, c'est signalé comme avertissement plutôt
 *  que bloqué silencieusement — à l'admin de décider. */
function rechercherNumeroFacture(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  if (!FICHIER_NUMEROTATION) return { ok: false, erreur: 'Aucun fichier de numérotation configuré (Réglages)' };

  const onglet = String(data.onglet || '').trim();
  if (!onglet) return { ok: false, erreur: 'Choisis un onglet' };

  let feuille;
  try {
    const classeur = SpreadsheetApp.openById(FICHIER_NUMEROTATION);
    feuille = classeur.getSheetByName(onglet);
    if (!feuille) return { ok: false, erreur: 'Onglet introuvable dans ce fichier' };
  } catch (e) {
    return { ok: false, erreur: 'Fichier de numérotation inaccessible : ' + e.message };
  }

  const derniereLigne = feuille.getLastRow();
  if (derniereLigne < 2) return { ok: false, erreur: 'Cet onglet semble vide' };

  const nbColonnes = Math.max(feuille.getLastColumn(), 3);
  const valeurs = feuille.getRange(1, 1, derniereLigne, nbColonnes).getValues();
  const estRempli = function(v) { return v !== '' && v !== null && v !== undefined; };

  // Cherche la dernière ligne où la colonne B (index 1) est remplie
  let derniereUtilisee = -1;
  for (let i = 1; i < valeurs.length; i++) {
    if (estRempli(valeurs[i][1])) derniereUtilisee = i; // index 0-based dans "valeurs", donc ligne réelle = i+1
  }
  if (derniereUtilisee === -1) return { ok: false, erreur: 'Aucune ligne déjà utilisée trouvée — vérifie le fichier/onglet' };

  // Sécurité : les 2 lignes au-dessus doivent aussi être utilisées (bloc continu, pas un cas isolé)
  for (let d = 1; d <= 2; d++) {
    const idx = derniereUtilisee - d;
    if (idx >= 1 && !estRempli(valeurs[idx][1])) {
      return { ok: false, erreur: 'La continuité des lignes utilisées n\'est pas claire (vérifie le fichier manuellement)' };
    }
  }

  const candidatIdx = derniereUtilisee + 1;
  if (candidatIdx >= valeurs.length) return { ok: false, erreur: 'Plus aucune ligne pré-numérotée disponible après la dernière utilisée' };

  // Sécurité : les 2 lignes en dessous du candidat doivent être vides (on ne s'arrête pas au milieu)
  for (let d = 1; d <= 2; d++) {
    const idx = candidatIdx + d;
    if (idx < valeurs.length && estRempli(valeurs[idx][1])) {
      return { ok: false, erreur: 'D\'autres lignes semblent déjà utilisées plus bas — vérifie le fichier manuellement' };
    }
  }

  const ligneCandidate = valeurs[candidatIdx];
  const numero = ligneCandidate[2]; // colonne C
  if (!estRempli(numero)) {
    return { ok: false, erreur: 'La ligne suivante n\'a pas de numéro en colonne C — vérifie le fichier manuellement' };
  }

  // Avertissement (pas un blocage) si une colonne autre que B ou C est déjà renseignée sur cette ligne
  let autreColonneRemplie = false;
  for (let col = 0; col < ligneCandidate.length; col++) {
    if (col === 1 || col === 2) continue; // B et C sont attendues/normales ici
    if (estRempli(ligneCandidate[col])) { autreColonneRemplie = true; break; }
  }

  return {
    ok: true,
    numero: String(numero),
    ligne: candidatIdx + 1, // ligne réelle (1-indexée) dans la feuille
    gid: feuille.getSheetId(),
    urlLigne: 'https://docs.google.com/spreadsheets/d/' + FICHIER_NUMEROTATION + '/edit#gid=' + feuille.getSheetId() + '&range=B' + (candidatIdx + 1),
    avertissement: autreColonneRemplie
      ? 'Cette ligne contient déjà des informations dans d\'autres colonnes — vérifie qu\'elle est vraiment libre avant de confirmer.'
      : null
  };
}

/** N'écrit QUE la colonne B (nom de structure), sur la ligne précédemment trouvée par
 *  rechercherNumeroFacture — jamais appelée seule sans être passée par cette recherche
 *  d'abord côté interface. Revérifie que la case est encore vide au moment d'écrire, pour
 *  limiter le risque si deux personnes cliquent en même temps. */
function reserverNumeroFacture(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  if (!FICHIER_NUMEROTATION) return { ok: false, erreur: 'Aucun fichier de numérotation configuré (Réglages)' };

  const onglet = String(data.onglet || '').trim();
  const ligne = parseInt(data.ligne, 10);
  const nomStructure = String(data.nomStructure || '').trim();
  if (!onglet || !ligne || !nomStructure) return { ok: false, erreur: 'Paramètres manquants' };

  let feuille;
  try {
    const classeur = SpreadsheetApp.openById(FICHIER_NUMEROTATION);
    feuille = classeur.getSheetByName(onglet);
    if (!feuille) return { ok: false, erreur: 'Onglet introuvable' };
  } catch (e) {
    return { ok: false, erreur: 'Fichier de numérotation inaccessible : ' + e.message };
  }

  const caseB = feuille.getRange(ligne, 2);
  const caseC = feuille.getRange(ligne, 3);
  if (String(caseB.getValue() || '').trim() !== '') {
    return { ok: false, erreur: 'Cette ligne a déjà été réservée entre-temps par quelqu\'un d\'autre — relance la recherche.' };
  }
  const numero = caseC.getValue();
  if (numero === '' || numero === null || numero === undefined) {
    return { ok: false, erreur: 'Cette ligne n\'a plus de numéro en colonne C — vérifie le fichier manuellement' };
  }

  caseB.setValue(nomStructure);
  return { ok: true, numero: String(numero) };
}

function facturerDirectement(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };

  const numeroFacture = String(data.numeroFacture || '').trim();
  if (!numeroFacture) return { ok: false, erreur: 'Le numéro de facture est obligatoire' };
  if (factureNumeroExiste(numeroFacture)) return { ok: false, erreur: 'Ce numéro de facture est déjà utilisé' };

  const feuilleCmd = feuilleCommandes();
  const c = feuilleCmd.getRange(data.ligne, 1, 1, ENTETES_COMMANDES.length).getValues()[0];
  const [referenceCommande, , codeStructure, nomStructure, email, , adresse, resumeProduit, quantiteTotale, moyenPaiement, , , , , , , , , referenceFactureExistante] = c;

  if (referenceFactureExistante) {
    return { ok: false, erreur: 'Cette commande a déjà une facture (' + referenceFactureExistante + ')' };
  }

  const structurePourVerif = lireStructures()[codeStructure];
  if (structurePourVerif && (structurePourVerif.esn || structurePourVerif.interne)) {
    return { ok: false, erreur: 'Cette structure est de type ESN ou Interne — aucune facture n\'est générée pour elle' };
  }
  const emailFacture = (structurePourVerif && structurePourVerif.emailFacturation) || email;

  const detailLignes = lireLignesCommande(referenceCommande, resumeProduit, quantiteTotale);
  let montantTotal = 0;
  for (const l of detailLignes) {
    const calcul = calculerPrixUnitaire(codeStructure, l.produit);
    if (!calcul) return { ok: false, erreur: 'Produit "' + l.produit + '" introuvable au catalogue' };
    montantTotal += calcul.prixUnitaire * l.quantite;
  }
  const prixUnitaireAffiche = detailLignes.length === 1
    ? (montantTotal / (detailLignes[0].quantite || 1)) : '';

  feuilleFactures().appendRow([
    numeroFacture, new Date(), referenceCommande, nomStructure, emailFacture, adresse,
    resumeProduit, quantiteTotale, moyenPaiement, prixUnitaireAffiche, montantTotal, ''
  ]);
  invaliderCacheFactures();

  reporterFactureSurCommande(referenceCommande, numeroFacture);

  return { ok: true, referenceFacture: numeroFacture, montant: montantTotal };
}

function reporterFactureSurCommande(referenceCommande, numeroFacture) {
  if (!referenceCommande) return;
  const lignes = feuilleCommandes().getDataRange().getValues();
  for (let i = 1; i < lignes.length; i++) {
    if (lignes[i][0] === referenceCommande) {
      feuilleCommandes().getRange(i + 1, 19).setValue(numeroFacture);
      feuilleCommandes().getRange(i + 1, 20).setValue('Non rapproché');
      invaliderCacheCommandes();
      break;
    }
  }
}

function listerFactures(password, limite, decalage, recherche) {
  if (password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };

  const cleCache = 'factures_v' + versionCache('factures');
  let toutes = lireCacheDecoupe(cleCache);

  if (!toutes) {
    const debutConstruction = Date.now();
    const lignes = feuilleFactures().getDataRange().getValues();
    toutes = [];
    for (let i = 1; i < lignes.length; i++) {
      if (!lignes[i][0]) continue;
      toutes.push({
        ligne:             i + 1,
        referenceFacture:  lignes[i][0],
        dateRaw:           lignes[i][1] instanceof Date ? lignes[i][1].toISOString() : '',
        referenceCommande: lignes[i][2] || '',
        nomStructure:      lignes[i][3] || '',
        email:             lignes[i][4] || '',
        adresse:           lignes[i][5] || '',
        produit:           lignes[i][6] || '',
        quantite:          lignes[i][7] || '',
        moyenPaiement:     lignes[i][8] || '',
        prixUnitaire:      lignes[i][9] || 0,
        montantTotal:      lignes[i][10] || 0,
        commentaire:       lignes[i][11] || ''
      });
    }
    toutes.reverse();
    mettreEnCacheDecoupe(cleCache, toutes);
    Logger.log('[listerFactures] construction (cache manquant) — ' + (Date.now() - debutConstruction) + ' ms, ' + toutes.length + ' factures');
  }
  const montantTotalGlobal = toutes.reduce(function(s, f) { return s + (parseFloat(f.montantTotal) || 0); }, 0);
  const formaterDateFacture = f => Object.assign({}, f, { date: f.dateRaw ? Utilities.formatDate(new Date(f.dateRaw), Session.getScriptTimeZone(), 'dd/MM/yyyy') : '' });

  const termeRecherche = String(recherche || '').trim().toLowerCase();
  if (termeRecherche) {
    // La recherche porte toujours sur l'historique complet, jamais seulement sur la page
    // affichée — même principe que pour les commandes.
    const resultats = toutes.filter(function(f) {
      const cible = (f.referenceFacture + ' ' + f.referenceCommande + ' ' + f.nomStructure + ' ' + f.email + ' ' + f.produit).toLowerCase();
      return cible.includes(termeRecherche);
    });
    return { ok: true, factures: resultats.slice(0, 200).map(formaterDateFacture), total: toutes.length, montantTotalGlobal: montantTotalGlobal, recherche: true };
  }

  const limiteNombre = parseInt(limite, 10) || 0;
  const decalageNombre = parseInt(decalage, 10) || 0;
  const limitees = (limiteNombre > 0 ? toutes.slice(decalageNombre, decalageNombre + limiteNombre) : toutes).map(formaterDateFacture);
  return { ok: true, factures: limitees, total: toutes.length, montantTotalGlobal: montantTotalGlobal };
}

/** Édition manuelle d'une facture déjà émise (produit, quantité, prix, commentaire).
 *  Le montant total se recalcule automatiquement si prix ou quantité changent. */
/** Génère la facture PDF d'une ligne de l'onglet Factures, à partir du modèle Sheets
 *  configuré dans Réglages. Copie le modèle, remplace les jetons {{...}} (fonctionne même
 *  avec des cellules fusionnées, contrairement à des références de cellules figées), exporte
 *  en PDF, dépose dans le dossier d'archivage configuré, puis supprime la copie Sheets
 *  intermédiaire pour ne garder que le PDF final. */
/** Construit les jetons produits pour un modèle PDF, à partir des vraies lignes d'une
 *  commande : {{PRODUIT}}/{{QUANTITE}}/{{PRIX_UNITAIRE}} (le premier produit, pour rester
 *  compatible avec un modèle à un seul produit) ainsi que {{PRODUIT_1}}, {{PRODUIT_2}}...
 *  jusqu'à MAX_LIGNES_PAR_COMMANDE, vides au-delà du nombre réel de lignes. */
function jetonsProduitsNumerotes(referenceCommande, resumeReplique, quantiteReplique, codeStructure) {
  const lignes = lireLignesCommande(referenceCommande, resumeReplique, quantiteReplique);
  const jetons = {};

  for (let i = 1; i <= MAX_LIGNES_PAR_COMMANDE; i++) {
    const l = lignes[i - 1];
    if (l) {
      const calcul = calculerPrixUnitaire(codeStructure, l.produit);
      const prixUnitaire = calcul ? calcul.prixUnitaire : 0;
      jetons['{{PRODUIT_' + i + '}}'] = l.produit || '';
      jetons['{{QUANTITE_' + i + '}}'] = String(l.quantite || '');
      jetons['{{PRIX_UNITAIRE_' + i + '}}'] = formaterMontantPourModele(prixUnitaire);
      jetons['{{TOTAL_LIGNE_' + i + '}}'] = formaterMontantPourModele(prixUnitaire * l.quantite);
    } else {
      jetons['{{PRODUIT_' + i + '}}'] = '';
      jetons['{{QUANTITE_' + i + '}}'] = '';
      jetons['{{PRIX_UNITAIRE_' + i + '}}'] = '';
      jetons['{{TOTAL_LIGNE_' + i + '}}'] = '';
    }
  }

  // Compatibilité avec un modèle à un seul produit : reprend la première ligne
  if (lignes.length) {
    const calculPremiere = calculerPrixUnitaire(codeStructure, lignes[0].produit);
    jetons['{{PRODUIT}}'] = lignes[0].produit || '';
    jetons['{{QUANTITE}}'] = String(lignes[0].quantite || '');
    jetons['{{PRIX_UNITAIRE}}'] = formaterMontantPourModele(calculPremiere ? calculPremiere.prixUnitaire : 0);
  } else {
    jetons['{{PRODUIT}}'] = ''; jetons['{{QUANTITE}}'] = ''; jetons['{{PRIX_UNITAIRE}}'] = '';
  }

  return jetons;
}

function genererFacturePdf(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  if (!MODELE_FACTURATION) return { ok: false, erreur: 'Aucun modèle de facturation configuré (Réglages)' };

  const ligne = parseInt(data.ligne, 10);
  if (!ligne) return { ok: false, erreur: 'Facture introuvable' };

  const f = feuilleFactures().getRange(ligne, 1, 1, ENTETES_FACTURES.length).getValues()[0];
  const [referenceFacture, dateFacture, referenceCommande, nomStructure, email, adresse,
         resumeProduit, quantiteTotale, , , montantTotal] = f;
  if (!referenceFacture) return { ok: false, erreur: 'Facture introuvable' };

  // Téléphone, référence devis et code structure ne sont pas stockés sur la ligne Facture
  // elle-même : on les retrouve via la commande d'origine, si elle existe encore.
  let telephone = '', referenceDevis = '', codeStructure = '';
  if (referenceCommande) {
    const lignesCmd = feuilleCommandes().getDataRange().getValues();
    for (let i = 1; i < lignesCmd.length; i++) {
      if (lignesCmd[i][0] === referenceCommande) {
        codeStructure = lignesCmd[i][2] || '';
        telephone = lignesCmd[i][5] || '';
        referenceDevis = lignesCmd[i][17] || '';
        break;
      }
    }
  }

  const jetons = Object.assign(jetonsProduitsNumerotes(referenceCommande, resumeProduit, quantiteTotale, codeStructure), {
    '{{STRUCTURE}}': nomStructure || '',
    '{{ADRESSE}}': adresse || '',
    '{{EMAIL}}': email || '',
    '{{TELEPHONE}}': telephone,
    '{{NUMERO_FACTURE}}': referenceFacture,
    '{{DATE}}': Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy'),
    '{{PRIX_TOTAL_HT}}': formaterMontantPourModele(montantTotal),
    '{{NUMERO_DEVIS}}': referenceDevis,
    '{{RESPONSABLE_NOM}}': RESPONSABLE_NOM,
    '{{RESPONSABLE_TELEPHONE}}': RESPONSABLE_TELEPHONE,
    '{{RESPONSABLE_EMAIL}}': RESPONSABLE_EMAIL
  });

  const nomFichier = 'Facture ' + referenceFacture;

  let copie;
  try {
    // Copie conservée telle quelle (pas de PDF, pas d'export supplémentaire) : la personne
    // l'ouvre, vérifie, et exporte elle-même en PDF depuis Sheets si besoin (Fichier →
    // Télécharger → PDF), ou la classe directement dans le dossier d'archivage.
    const modeleFichier = DriveApp.getFileById(MODELE_FACTURATION);
    const dossierCible = sousDossier('Factures');
    copie = modeleFichier.makeCopy(nomFichier, dossierCible);
    // Le dossier n'est pas forcément partagé avec qui reçoit ce lien : on partage donc
    // explicitement CE fichier, sans dépendre du partage du dossier qui le contient.
    copie.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    return { ok: false, erreur: 'Copie du modèle impossible : ' + e.message };
  }

  const classeurCopie = SpreadsheetApp.openById(copie.getId());
  classeurCopie.getSheets().forEach(function(feuille) {
    Object.keys(jetons).forEach(function(jeton) {
      feuille.createTextFinder(jeton).matchEntireCell(false).replaceAllWith(jetons[jeton]);
    });
  });
  SpreadsheetApp.flush();

  return { ok: true, url: copie.getUrl() };
}

/** Même principe que genererFacturePdf, pour un devis plutôt qu'une facture — même modèle
 *  Sheets réutilisé (les jetons non concernés restent simplement vides). */
function genererDevisPdf(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };
  if (!MODELE_FACTURATION) return { ok: false, erreur: 'Aucun modèle de facturation configuré (Réglages)' };

  const ligne = parseInt(data.ligne, 10);
  if (!ligne) return { ok: false, erreur: 'Devis introuvable' };

  const d = feuilleDevis().getRange(ligne, 1, 1, ENTETES_DEVIS.length).getValues()[0];
  const [referenceDevis, dateDevis, referenceCommande, nomStructure, email, adresse,
         resumeProduit, quantiteTotale, , , montantTotal, , referenceFacture] = d;
  if (!referenceDevis) return { ok: false, erreur: 'Devis introuvable' };

  let telephone = '', codeStructure = '';
  if (referenceCommande) {
    const lignesCmd = feuilleCommandes().getDataRange().getValues();
    for (let i = 1; i < lignesCmd.length; i++) {
      if (lignesCmd[i][0] === referenceCommande) {
        codeStructure = lignesCmd[i][2] || '';
        telephone = lignesCmd[i][5] || '';
        break;
      }
    }
  }

  const jetons = Object.assign(jetonsProduitsNumerotes(referenceCommande, resumeProduit, quantiteTotale, codeStructure), {
    '{{STRUCTURE}}': nomStructure || '',
    '{{ADRESSE}}': adresse || '',
    '{{EMAIL}}': email || '',
    '{{TELEPHONE}}': telephone,
    '{{NUMERO_FACTURE}}': referenceFacture || '',
    '{{DATE}}': Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy'),
    '{{PRIX_TOTAL_HT}}': formaterMontantPourModele(montantTotal),
    '{{NUMERO_DEVIS}}': referenceDevis,
    '{{RESPONSABLE_NOM}}': RESPONSABLE_NOM,
    '{{RESPONSABLE_TELEPHONE}}': RESPONSABLE_TELEPHONE,
    '{{RESPONSABLE_EMAIL}}': RESPONSABLE_EMAIL
  });

  const nomFichier = 'Devis ' + referenceDevis;

  let copie;
  try {
    const modeleFichier = DriveApp.getFileById(MODELE_FACTURATION);
    const dossierCible = sousDossier('Devis');
    copie = modeleFichier.makeCopy(nomFichier, dossierCible);
    copie.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    return { ok: false, erreur: 'Copie du modèle impossible : ' + e.message };
  }

  const classeurCopie = SpreadsheetApp.openById(copie.getId());
  classeurCopie.getSheets().forEach(function(feuille) {
    Object.keys(jetons).forEach(function(jeton) {
      feuille.createTextFinder(jeton).matchEntireCell(false).replaceAllWith(jetons[jeton]);
    });
  });
  SpreadsheetApp.flush();

  return { ok: true, url: copie.getUrl() };
}

/** Même formatage que côté admin (nombre rond si possible), pour rester cohérent visuellement. */
function formaterMontantPourModele(valeur) {
  const n = parseFloat(valeur) || 0;
  return (Math.round(n * 100) / 100).toString().replace('.', ',') + ' €';
}

function majFacture(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };

  const colonnes = { produit: 7, quantite: 8, moyenPaiement: 9, prixUnitaire: 10, commentaire: 12 };
  const colonne = colonnes[data.champ];
  if (!colonne) return { ok: false, erreur: 'Champ non modifiable' };

  const feuille = feuilleFactures();
  feuille.getRange(data.ligne, colonne).setValue(data.valeur);
  invaliderCacheFactures();

  if (data.champ === 'quantite' || data.champ === 'prixUnitaire') {
    const ligne = feuille.getRange(data.ligne, 1, 1, ENTETES_FACTURES.length).getValues()[0];
    const nouveauMontant = parseFloat(ligne[7]) * parseFloat(ligne[9]);
    feuille.getRange(data.ligne, 11).setValue(nouveauMontant);
    return { ok: true, montant: nouveauMontant };
  }

  return { ok: true };
}

/** Édition manuelle d'un devis non encore converti. */
function majDevis(data) {
  if (data.password !== ADMIN_PASSWORD) return { ok: false, erreur: 'Mot de passe incorrect' };

  const colonnes = { produit: 7, quantite: 8, moyenPaiement: 9, prixUnitaire: 10, statut: 12 };
  const colonne = colonnes[data.champ];
  if (!colonne) return { ok: false, erreur: 'Champ non modifiable' };

  const feuille = feuilleDevis();
  feuille.getRange(data.ligne, colonne).setValue(data.valeur);
  invaliderCacheDevis();

  if (data.champ === 'quantite' || data.champ === 'prixUnitaire') {
    const ligne = feuille.getRange(data.ligne, 1, 1, ENTETES_DEVIS.length).getValues()[0];
    const nouveauMontant = parseFloat(ligne[7]) * parseFloat(ligne[9]);
    feuille.getRange(data.ligne, 11).setValue(nouveauMontant);
    return { ok: true, montant: nouveauMontant };
  }

  return { ok: true };
}

/* ══════════════ Connexion et comptabilité ══════════════ */

/** Un seul champ mot de passe côté interface, deux niveaux d'accès possibles.
 *  Le rôle renvoyé dit au back-office quoi afficher, sans jamais exposer les mots de passe eux-mêmes. */
const LIMITE_CONNEXIONS_PAR_HEURE = 20; // protège le mot de passe admin contre le bruteforce

function seConnecter(password) {
  const cache = CacheService.getScriptCache();
  const compte = parseInt(cache.get('tentatives_connexion') || '0', 10);
  if (compte >= LIMITE_CONNEXIONS_PAR_HEURE) {
    return { ok: false, erreur: 'Trop de tentatives. Réessaie dans un instant.' };
  }

  if (password === ADMIN_PASSWORD) return { ok: true, role: 'admin' };
  if (password === COMPTA_PASSWORD) return { ok: true, role: 'compta' };

  cache.put('tentatives_connexion', String(compte + 1), 3600);
  journaliserEvenementSecurite('Connexion back-office échouée', '');
  return { ok: false, erreur: 'Mot de passe incorrect' };
}

function accesComptaAutorise(password) {
  return password === ADMIN_PASSWORD || password === COMPTA_PASSWORD;
}

/** Vue agrégée : uniquement les commandes déjà facturées, avec le montant
 *  repris de la facture, et deux champs propres à la compta (statut, dépôt). */
function listerComptabilite(password, limite, decalage, recherche) {
  if (!accesComptaAutorise(password)) return { ok: false, erreur: 'Mot de passe incorrect' };

  const cleCache = 'comptabilite_v' + versionCache('commandes') + '_' + versionCache('factures') + '_' + versionCache('comptabilite');
  let toutes = lireCacheDecoupe(cleCache);

  if (!toutes) {
    const debutConstruction = Date.now();
    const montantsParFacture = obtenirMontantsParFacture();

    const lignes = feuilleCommandes().getDataRange().getValues();
    Logger.log('[listerComptabilite] lecture Commandes — ' + (lignes.length - 1) + ' lignes, ' + (Date.now() - debutConstruction) + ' ms (cumulé)');
    toutes = [];

    for (let i = 1; i < lignes.length; i++) {
      const l = lignes[i];
      const referenceFacture = l[18];
      if (!l[0] || !referenceFacture) continue; // seulement les commandes facturées

      toutes.push({
        ligne:             i + 1,
        referenceCommande: l[0],
        dateRaw:           l[1] instanceof Date ? l[1].toISOString() : '',
        nomStructure:      l[3],
        produit:           l[7],
        quantite:          l[8],
        moyenPaiement:     l[9],
        statutPaiement:    l[12],
        referenceFacture:  referenceFacture,
        montant:           montantsParFacture[referenceFacture] != null ? montantsParFacture[referenceFacture] : '',
        statutComptable:   l[19] || 'Non rapproché',
        numeroDepot:       l[20] || ''
      });
    }
    toutes.reverse();
    mettreEnCacheDecoupe(cleCache, toutes);
    Logger.log('[listerComptabilite] construction (cache manquant) — ' + (Date.now() - debutConstruction) + ' ms, ' + toutes.length + ' lignes facturées');
  }

  const formaterDateCompta = c => Object.assign({}, c, { date: c.dateRaw ? Utilities.formatDate(new Date(c.dateRaw), Session.getScriptTimeZone(), 'dd/MM/yyyy') : '' });

  const termeRecherche = String(recherche || '').trim().toLowerCase();
  if (termeRecherche) {
    // La recherche porte toujours sur l'historique complet, jamais seulement sur la page
    // affichée — même principe que pour les commandes.
    const resultats = toutes.filter(function(c) {
      const cible = (c.referenceCommande + ' ' + c.referenceFacture + ' ' + c.nomStructure + ' ' + c.produit + ' ' + c.numeroDepot).toLowerCase();
      return cible.includes(termeRecherche);
    });
    return { ok: true, lignes: resultats.slice(0, 200).map(formaterDateCompta), total: toutes.length, recherche: true };
  }

  const limiteNombre = parseInt(limite, 10) || 0;
  const decalageNombre = parseInt(decalage, 10) || 0;
  const limitees = (limiteNombre > 0 ? toutes.slice(decalageNombre, decalageNombre + limiteNombre) : toutes).map(formaterDateCompta);
  return { ok: true, lignes: limitees, total: toutes.length };
}

function majCompta(data) {
  if (!accesComptaAutorise(data.password)) return { ok: false, erreur: 'Mot de passe incorrect' };

  const colonnes = { statutComptable: 20, numeroDepot: 21 };
  const colonne = colonnes[data.champ];
  if (!colonne) return { ok: false, erreur: 'Champ non modifiable depuis cette vue' };

  feuilleCommandes().getRange(data.ligne, colonne).setValue(data.valeur);
  invaliderCacheCommandes();
  return { ok: true };
}
