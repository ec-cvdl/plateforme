/* ══════════════ PRODUITS ══════════════ */

let produits = [];

if($('btn-synchroniser-tectech')){
  $('btn-synchroniser-tectech').addEventListener('click', async () => {
    $('btn-synchroniser-tectech').disabled = true;
    $('retour-sync-tectech').innerHTML = '';
    try{
      const r = await poster({ action: 'stock-synchroniser-tectech', password: motDePasse });
      if(r.ok){
        produits = r.produits || produits;
        rendreProduits();
        $('retour-sync-tectech').innerHTML = `<div class="msg msg-succes">Stock synchronisé avec Tech.tec.</div>`;
      }else{
        $('retour-sync-tectech').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
      }
    }catch(e){
      $('retour-sync-tectech').innerHTML = '<div class="msg msg-erreur">Synchronisation impossible.</div>';
    }
    $('btn-synchroniser-tectech').disabled = false;
  });
}

async function chargerProduits(){
  try{
    const r = await jsonp({action:'produits', password:motDePasse});
    if(r.ok){ produits = r.produits; rendreProduits(); }
  }catch(e){ etat('Chargement des produits impossible', 'erreur'); }
}
$('btn-recharger-produits').addEventListener('click', () => {
  etat('Actualisation…', 'neutre');
  chargerProduits().then(() => etat('À jour', 'succes'));
});

const SEUIL_STOCK_FAIBLE = 5;

/** Récap du stock — un seul bandeau borné (comme celui de l'onglet Statistiques), qui
 *  contient à la fois le total et le détail par produit : rien ne déborde en dessous. */
function rendreRecapStock(){
  const el = $('recap-stock');
  if(!el) return;

  const totalUnites = produits.reduce((s, p) => s + (parseInt(p.stock, 10) || 0), 0);

  const puces = produits.slice()
    .sort((a, b) => (parseInt(b.stock, 10) || 0) - (parseInt(a.stock, 10) || 0))
    .map(p => {
      const stock = parseInt(p.stock, 10) || 0;
      const classeAlerte = stock <= 0 ? ' alerte' : (stock < SEUIL_STOCK_FAIBLE ? ' avertissement' : '');
      return `<div class="puce-stock${classeAlerte}">
        ${svgIconePuce(p.nom, p.icone)}
        <span class="n">${stock}</span>
        <span class="l">${echapper(p.nom)}</span>
      </div>`;
    }).join('');

  el.innerHTML = `
    <div class="bilan-chiffre-principal">
      <div class="bilan-chiffre-valeur">${totalUnites}</div>
      <div class="bilan-chiffre-libelle">Unités en stock, tous produits confondus</div>
    </div>
    ${puces ? `<div class="bandeau-stock-produits">${puces}</div>` : ''}`;
}

function rendreProduits(){
  rendreRecapStock();

  if(!produits.length){
    $('liste-produits').innerHTML = `<div class="vide">
      <strong>Aucun produit défini</strong>
      Le formulaire public n'a rien à proposer tant qu'aucun produit n'existe ici.
    </div>`;
    return;
  }

  $('liste-produits').innerHTML = produits.map(p => `
    <div class="produit-carte ${p.stock <= 0 ? 'epuise' : ''}">
      <div class="produit-carte-entete">
        <div class="produit-icone-rond">${svgIconePuce(p.nom, p.icone)}</div>
        <input type="text" value="${echapper(p.nom)}" data-ligne="${p.ligne}" data-champ="nom" title="Nom du produit">
        <div class="ligne-actions-icones">
          <button type="button" class="btn-icone-fiche" data-produit-modifier="${p.ligne}" title="Modifier (les champs sont éditables directement)" aria-label="Modifier">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l11-11-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>
          </button>
          <button type="button" class="btn-icone-fiche danger" data-produit-supprimer="${p.ligne}" data-nom="${echapper(p.nom)}" title="Supprimer le produit" aria-label="Supprimer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7m2 0v13a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 20V7h10z"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      </div>

      <div class="produit-carte-prix">
        <div class="produit-carte-champ">
          <label>Prix standard</label>
          <input type="number" step="0.01" min="0" value="${p.prixStandard}" data-ligne="${p.ligne}" data-champ="prixStandard">
        </div>
        <div class="produit-carte-champ">
          <label>Prix RN</label>
          <input type="number" step="0.01" min="0" value="${p.prixRN}" data-ligne="${p.ligne}" data-champ="prixRN">
        </div>
        <div class="produit-carte-champ">
          <label>Stock</label>
          <input type="number" step="1" min="0" value="${p.stock}" data-ligne="${p.ligne}" data-champ="stock">
        </div>
        <div class="produit-carte-champ">
          <label>Quantité max / commande</label>
          <input type="number" step="1" min="1" placeholder="Défaut" value="${p.quantiteMax || ''}" data-ligne="${p.ligne}" data-champ="quantiteMax">
        </div>
        <div class="produit-carte-champ">
          <label title="La référence utilisée côté Tech.tec pour ce produit, pour que la synchronisation de stock sache à qui l'attribuer">SKU Tech.tec</label>
          <input type="text" placeholder="Aucun" value="${echapper(p.skuTectech || '')}" data-ligne="${p.ligne}" data-champ="skuTectech">
        </div>
      </div>

      <div class="produit-carte-specs">
        <input type="text" placeholder="Disque dur" value="${echapper(p.disque)}" data-ligne="${p.ligne}" data-champ="disque">
        <input type="text" placeholder="RAM" value="${echapper(p.ram)}" data-ligne="${p.ligne}" data-champ="ram">
        <input type="text" placeholder="Système" value="${echapper(p.systeme)}" data-ligne="${p.ligne}" data-champ="systeme">
        <select data-ligne="${p.ligne}" data-champ="icone">
          <option value="">Icône auto</option>
          <option value="telephone"${p.icone==='telephone'?' selected':''}>Smartphone</option>
          <option value="tablette"${p.icone==='tablette'?' selected':''}>Tablette</option>
          <option value="portable"${p.icone==='portable'?' selected':''}>PC portable</option>
          <option value="fixe"${p.icone==='fixe'?' selected':''}>PC fixe</option>
          <option value="telephone_touches"${p.icone==='telephone_touches'?' selected':''}>Tél. à touches</option>
          <option value="atelier"${p.icone==='atelier'?' selected':''}>Animation/atelier</option>
          <option value="feuille"${p.icone==='feuille'?' selected':''}>Sensibilisation</option>
          <option value="generique"${p.icone==='generique'?' selected':''}>Générique</option>
        </select>
      </div>

      <div class="produit-carte-pied">
        <label class="produit-carte-visible">
          <input type="checkbox" data-ligne="${p.ligne}" data-champ="visible" ${p.visible ? 'checked' : ''}>
          Visible dans le formulaire de commandes structures
        </label>
      </div>
    </div>`).join('');
}

$('btn-nouveau-produit').addEventListener('click', () => {
  ['p-nom','p-prix-standard','p-prix-rn','p-stock','p-message','p-disque','p-ram','p-systeme','p-sku-tectech'].forEach(i => $(i).value = '');
  $('p-icone').value = '';
  $('p-visible').checked = true;
  $('retour-produit').innerHTML = '';
  $('modale-nouveau-produit').hidden = false;
  setTimeout(() => $('p-nom').focus(), 50);
});
$('p-annuler').addEventListener('click', () => $('modale-nouveau-produit').hidden = true);

$('btn-produit-ajouter').addEventListener('click', async () => {
  const donnees = {
    action:'produit-create',
    nom:            $('p-nom').value.trim(),
    prixStandard:   $('p-prix-standard').value,
    prixRN:         $('p-prix-rn').value,
    stock:          $('p-stock').value,
    messageRupture: $('p-message').value.trim(),
    visible:        $('p-visible').checked,
    disque:         $('p-disque').value.trim(),
    ram:            $('p-ram').value.trim(),
    systeme:        $('p-systeme').value.trim(),
    icone:          $('p-icone').value,
    skuTectech:     $('p-sku-tectech').value.trim()
  };

  if(!donnees.nom || donnees.prixStandard === '' || donnees.prixRN === '' || donnees.stock === ''){
    $('retour-produit').innerHTML = '<div class="msg msg-erreur">Nom, prix standard, prix RN et stock sont obligatoires.</div>';
    return;
  }

  $('btn-produit-ajouter').disabled = true;
  $('retour-produit').innerHTML = '';

  try{
    const r = await poster(donnees);
    if(r.ok){
      $('modale-nouveau-produit').hidden = true;
      await chargerProduits();
      etat('Produit ajouté', 'succes');
    }else{
      $('retour-produit').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`;
    }
  }catch(e){
    $('retour-produit').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  $('btn-produit-ajouter').disabled = false;
});

$('liste-produits').addEventListener('change', async e => {
  const el = e.target;
  if(!el.matches('input[data-ligne], select[data-ligne]')) return;

  const valeur = el.type === 'checkbox' ? el.checked : el.value;
  el.disabled = true;
  try{
    const r = await poster({
      action:'produit-update',
      ligne: parseInt(el.dataset.ligne, 10),
      champ: el.dataset.champ,
      valeur: valeur
    });
    etat(r.ok ? 'Enregistré' : (r.erreur || 'Enregistrement impossible'), r.ok ? 'succes' : 'erreur');
    if(r.ok && (el.dataset.champ === 'stock' || el.dataset.champ === 'visible' || el.dataset.champ === 'icone')) await chargerProduits();
    if(!r.ok) chargerProduits();
  }catch(err){ etat('Enregistrement impossible', 'erreur'); }
  el.disabled = false;
});

$('liste-produits').addEventListener('click', async e => {
  const b = e.target.closest('[data-produit-supprimer]');
  if(!b) return;
  demanderSuppression(`le produit « ${b.dataset.nom} » (il n'apparaîtra plus dans le formulaire)`, 'produit-delete', parseInt(b.dataset.produitSupprimer, 10), chargerProduits);
});

$('liste-produits').addEventListener('click', e => {
  const b = e.target.closest('[data-produit-modifier]');
  if(!b) return;
  const champ = b.closest('.produit-carte').querySelector('input[data-champ="nom"]');
  if(champ){ champ.focus(); champ.select(); }
});

