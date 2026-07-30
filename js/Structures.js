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
      <input          value="${echapper(s.telephone)}" data-ligne="${s.ligne}" data-champ="telephone">
      <textarea rows="2" data-ligne="${s.ligne}" data-champ="adresse" placeholder="Retour à la ligne possible (Entrée)">${echapper(s.adresse)}</textarea>
      <input type="checkbox" data-ligne="${s.ligne}" data-champ="rn" ${s.rn ? 'checked' : ''}>
      <input type="checkbox" data-ligne="${s.ligne}" data-champ="esn" ${s.esn ? 'checked' : ''} title="ESN : aucun prix affiché, aucune facturation générée pour cette structure">
      <input type="checkbox" data-ligne="${s.ligne}" data-champ="interne" ${s.interne ? 'checked' : ''} title="Interne : mêmes effets que ESN (aucun prix, aucune facturation), pour les commandes passées en interne">
      <div class="ligne-actions-icones">
        <button type="button" class="btn-icone-fiche" data-structure-modifier="${s.ligne}" title="Modifier (les champs sont éditables directement)" aria-label="Modifier">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l11-11-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>
        </button>
        <button type="button" class="btn-icone-fiche danger" data-supprimer="${s.ligne}" data-nom="${echapper(s.nom)}" title="Supprimer la structure" aria-label="Supprimer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7m2 0v13a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 20V7h10z"/><path d="M10 11v6M14 11v6"/></svg>
        </button>
      </div>
    </div>`).join('');
}

$('btn-nouvelle-structure').addEventListener('click', () => {
  ['s-code','s-nom','s-email','s-tel','s-adresse'].forEach(i => $(i).value = '');
  $('s-rn').checked = false;
  $('s-esn').checked = false;
  $('s-interne').checked = false;
  $('retour-ajout').innerHTML = '';
  $('modale-nouvelle-structure').hidden = false;
  setTimeout(() => $('s-nom').focus(), 50);
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
    telephone: $('s-tel').value.trim(),
    adresse:   $('s-adresse').value.trim(),
    rn:        $('s-rn').checked,
    esn:       $('s-esn').checked,
    interne:   $('s-interne').checked
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

