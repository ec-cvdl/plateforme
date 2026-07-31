
let etapeInstallationCourante = 1;
let urlInstallationValidee = '';

function afficherEtapeInstallation(numero){
  etapeInstallationCourante = numero;
  document.querySelectorAll('.etape-installation').forEach(sec => {
    sec.hidden = parseInt(sec.dataset.etape, 10) !== numero;
  });
  $('installation-progres').innerHTML = [1,2,3,4].map(n =>
    `<span class="${n < numero ? 'faite' : n === numero ? 'active' : ''}"></span>`).join('');
}

function ouvrirInstallation(){
  $('connexion').hidden = true;
  $('installation').hidden = false;
  afficherEtapeInstallation(1);
}

$('btn-ouvrir-installation').addEventListener('click', ouvrirInstallation);
$('btn-deja-installe').addEventListener('click', () => {
  localStorage.setItem('cvdl-installation-terminee', 'true');
  $('installation').hidden = true;
  $('connexion').hidden = false;
});

document.querySelectorAll('[data-etape-suivante]').forEach(b => {
  b.addEventListener('click', () => afficherEtapeInstallation(parseInt(b.dataset.etapeSuivante, 10)));
});
document.querySelectorAll('[data-etape-precedente]').forEach(b => {
  b.addEventListener('click', () => afficherEtapeInstallation(parseInt(b.dataset.etapePrecedente, 10)));
});

// Étape 2 : affichage et copie du code (chargé depuis ce même fichier n'est pas possible en JS pur,
// donc on renvoie vers le fichier apps-script.gs fourni à côté — voir note affichée).
$('code-script-affiche').textContent = CODE_SCRIPT_A_COLLER;
$('btn-copier-code-script').addEventListener('click', async () => {
  try{
    await navigator.clipboard.writeText(CODE_SCRIPT_A_COLLER);
    const b = $('btn-copier-code-script');
    b.textContent = 'Copié !';
    b.classList.add('copie');
    setTimeout(() => { b.textContent = 'Copier le code'; b.classList.remove('copie'); }, 2000);
  }catch(e){ /* navigateur trop ancien ou permission refusée : la personne peut copier à la main */ }
});

// Étape 3 : test de connexion vers l'URL saisie
$('btn-tester-connexion').addEventListener('click', async () => {
  const url = $('installation-url').value.trim();
  $('retour-test-connexion').innerHTML = '';
  $('btn-vers-etape-4').disabled = true;
  urlInstallationValidee = '';

  if(!url || !url.includes('script.google.com')){
    $('retour-test-connexion').innerHTML = '<div class="msg msg-erreur">Cette URL ne ressemble pas à une URL de déploiement Apps Script.</div>';
    return;
  }

  $('btn-tester-connexion').disabled = true;
  $('btn-tester-connexion').textContent = 'Vérification…';
  try{
    const r = await jsonpVersUrl(url, { action: 'ping' });
    if(r.ok){
      urlInstallationValidee = url;
      localStorage.setItem('cvdl-url-installee', url);
      $('retour-test-connexion').innerHTML = '<div class="msg msg-succes">Connexion réussie, le script répond correctement.</div>';
      $('btn-vers-etape-4').disabled = false;
    }else{
      $('retour-test-connexion').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur || 'Le script a répondu, mais avec une erreur.')}</div>`;
    }
  }catch(e){
    $('retour-test-connexion').innerHTML = '<div class="msg msg-erreur">Impossible de joindre cette URL. Vérifie qu\'elle est bien complète et que le déploiement est actif.</div>';
  }
  $('btn-tester-connexion').disabled = false;
  $('btn-tester-connexion').textContent = 'Vérifier la connexion';
});

$('btn-vers-etape-4').addEventListener('click', () => {
  $('url-finale-affichee').textContent = urlInstallationValidee;
  afficherEtapeInstallation(4);
});

// Étape 4 : connexion immédiate avec le mot de passe par défaut, en réutilisant
// exactement la même fonction que l'écran de connexion classique.
$('btn-copier-mdp-defaut').addEventListener('click', async () => {
  try{
    await navigator.clipboard.writeText('change-moi-tout-de-suite');
    const b = $('btn-copier-mdp-defaut');
    b.textContent = 'Copié !';
    b.classList.add('copie');
    setTimeout(() => { b.textContent = 'Copier'; b.classList.remove('copie'); }, 2000);
  }catch(e){ /* copie manuelle possible depuis le bloc affiché */ }
});

$('btn-connexion-immediate').addEventListener('click', async () => {
  $('btn-connexion-immediate').disabled = true;
  $('btn-connexion-immediate').textContent = 'Connexion…';
  $('retour-connexion-immediate').innerHTML = '';

  // Si le navigateur a déjà auto-rempli un mot de passe enregistré (installation déjà faite
  // par le passé sur ce même projet), on le respecte plutôt que d'écraser avec le mot de passe
  // par défaut — sinon une connexion pourtant valide échouait à cause de cet écrasement.
  if(!$('mdp').value.trim()) $('mdp').value = 'change-moi-tout-de-suite';
  await connecter();

  // connecter() affiche #app quand la connexion réussit ; sinon elle a échoué
  // (mot de passe différent de celui essayé, URL injoignable, etc.)
  if(!$('app').hidden){
    $('installation').hidden = true;
    localStorage.setItem('cvdl-installation-terminee', 'true');
  }else{
    $('retour-connexion-immediate').innerHTML =
      '<div class="msg msg-erreur">Connexion impossible avec ce mot de passe. ' +
      'Si tu as déjà personnalisé un mot de passe par le passé sur ce même projet, ' +
      'utilise plutôt l\'écran de connexion classique avec ce mot de passe — le lien ' +
      '"Déjà installé ?" tout en haut de cette page t\'y ramène directement.</div>';
    $('btn-connexion-immediate').disabled = false;
    $('btn-connexion-immediate').textContent = 'Me connecter maintenant';
  }
});

$('btn-copier-url-finale').addEventListener('click', async () => {
  try{
    await navigator.clipboard.writeText(urlInstallationValidee);
    const b = $('btn-copier-url-finale');
    b.textContent = 'Copié !';
    b.classList.add('copie');
    setTimeout(() => { b.textContent = "Copier l'URL"; b.classList.remove('copie'); }, 2000);
  }catch(e){ /* copie manuelle possible depuis le bloc affiché */ }
});

// Affiche l'installateur automatiquement la toute première fois (pas de drapeau en localStorage)
if(!localStorage.getItem('cvdl-installation-terminee')){
  ouvrirInstallation();
}

document.querySelectorAll('[data-role-vue]').forEach(b => {
  b.addEventListener('click', () => {
    localStorage.setItem('cvdl-role-vue-preferee', b.dataset.roleVue);
    localStorage.setItem('cvdl-role-choisi', 'true');
    $('modale-role').hidden = true;
    const onglet = document.querySelector(`[data-vue="${b.dataset.roleVue}"]`);
    if(onglet) onglet.click();
    if(!localStorage.getItem('cvdl-onboarding-vu')) $('modale-bienvenue').hidden = false;
    else verifierRappelNouvelleAnnee();
  });
});

$('bienvenue-plus-tard').addEventListener('click', () => {
  localStorage.setItem('cvdl-onboarding-vu', 'true');
  $('modale-bienvenue').hidden = true;
});
$('bienvenue-aller-reglages').addEventListener('click', () => {
  localStorage.setItem('cvdl-onboarding-vu', 'true');
  $('modale-bienvenue').hidden = true;
  document.querySelector('[data-vue="reglages"]').click();
});

/* ─── Rappel de changement d'année : réaffiché chaque janvier tant qu'on n'a pas coché
   "ne plus me le rappeler" POUR CETTE ANNÉE précise (donc revient bien l'année suivante). ─── */
function verifierRappelNouvelleAnnee(){
  const maintenant = new Date();
  if(maintenant.getMonth() !== 0) return; // uniquement en janvier
  const annee = maintenant.getFullYear();
  if(localStorage.getItem('cvdl-nouvelle-annee-ignoree') === String(annee)) return;
  $('modale-nouvelle-annee').hidden = false;
}
$('nouvelle-annee-plus-tard').addEventListener('click', () => {
  $('modale-nouvelle-annee').hidden = true;
  if($('nouvelle-annee-ne-plus-afficher').checked){
    localStorage.setItem('cvdl-nouvelle-annee-ignoree', String(new Date().getFullYear()));
  }
});
$('nouvelle-annee-aller-reglages').addEventListener('click', () => {
  $('modale-nouvelle-annee').hidden = true;
  if($('nouvelle-annee-ne-plus-afficher').checked){
    localStorage.setItem('cvdl-nouvelle-annee-ignoree', String(new Date().getFullYear()));
  }
  document.querySelector('[data-vue="reglages"]').click();
});

/* ─── Session ─── */
const memorise = sessionStorage.getItem('cvdl');
if(memorise){ $('mdp').value = memorise; connecter(); }
