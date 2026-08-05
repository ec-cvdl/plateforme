/* ═══ Attestations — espace dédié pour associer personnes ↔ numéros de série (avec import
   CSV tec.tech en option) et générer les attestations de paiement en masse. ═══ */

let attestationsChargeesUneFois = false;
let attestationsLigneCourante = null;
let attestationsPersonnesCourantes = [];
let attestationsNumerosParProduit = {};
let attestationsUnSeulProduit = false;

async function chargerListeAttestations(terme){
  $('liste-commandes-attestations').innerHTML = '<p class="sous-question">Chargement…</p>';
  try{
    const r = await jsonp({action:'attestations-commandes-liste', password:motDePasse, recherche: terme || ''});
    if(!r.ok){ $('liste-commandes-attestations').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur || 'Chargement impossible.')}</div>`; return; }
    if(!r.commandes.length){
      $('liste-commandes-attestations').innerHTML = `<div class="vide">
        <strong>Aucune commande éligible</strong>
        Une commande doit avoir au moins une personne renseignée pour apparaître ici.
      </div>`;
      return;
    }
    $('liste-commandes-attestations').innerHTML = r.commandes.map(c => `
      <div class="carte-projet-distribution" style="cursor:pointer" data-attestations-ouvrir="${c.ligne}">
        <div class="entete-projet-distribution">
          <div>
            <div class="mono" style="font-size:11.5px;color:var(--steel)">${echapper(c.reference)} · ${echapper(c.date)}</div>
            <div style="font-weight:700;font-size:15px">${echapper(c.nomStructure)}</div>
            <div class="sous-question" style="margin:2px 0 0">${c.nombrePersonnes} personne${c.nombrePersonnes > 1 ? 's' : ''} · ${echapper(c.statutCommande)}</div>
          </div>
          <button type="button" class="action claire" data-attestations-ouvrir="${c.ligne}">Ouvrir →</button>
        </div>
      </div>`).join('');
  }catch(e){
    $('liste-commandes-attestations').innerHTML = '<div class="msg msg-erreur">Chargement impossible — réessaie.</div>';
  }
}
$('btn-recharger-attestations').addEventListener('click', () => chargerListeAttestations($('recherche-attestations').value.trim()));
let minuteurRechercheAttestations = null;
$('recherche-attestations').addEventListener('input', () => {
  clearTimeout(minuteurRechercheAttestations);
  minuteurRechercheAttestations = setTimeout(() => chargerListeAttestations($('recherche-attestations').value.trim()), 350);
});

document.addEventListener('click', e => {
  const b = e.target.closest('[data-attestations-ouvrir]');
  if(!b) return;
  ouvrirAssociationAttestations(parseInt(b.dataset.attestationsOuvrir, 10));
});

async function ouvrirAssociationAttestations(ligne){
  attestationsLigneCourante = ligne;
  $('attestations-etape-liste').hidden = true;
  $('attestations-etape-association').hidden = false;
  $('attestations-lignes-association').innerHTML = '<p class="sous-question">Chargement…</p>';
  $('attestations-retour-csv').textContent = '';
  $('attestations-fichier-csv').value = '';
  $('attestations-retour-association').innerHTML = '';
  $('attestations-retour-generation').innerHTML = '';

  try{
    const r = await jsonp({action:'attestations-commande-detail', password:motDePasse, ligne});
    if(!r.ok){ $('attestations-lignes-association').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur)}</div>`; return; }

    $('attestations-titre-commande').textContent = `${r.reference} — ${r.nomStructure}`;
    attestationsPersonnesCourantes = r.personnes;

    const typesDistincts = [...new Set(r.lignesProduits.map(l => l.produit))];
    attestationsUnSeulProduit = typesDistincts.length <= 1;
    attestationsNumerosParProduit = {};
    if(attestationsUnSeulProduit){
      attestationsNumerosParProduit['*'] = [...r.numerosSerie];
    }else{
      let curseur = 0;
      r.lignesProduits.forEach(l => {
        attestationsNumerosParProduit[l.produit] = r.numerosSerie.slice(curseur, curseur + l.quantite);
        curseur += l.quantite;
      });
    }

    const prixParProduit = {};
    r.lignesProduits.forEach(l => { prixParProduit[l.produit] = l.prixUnitaire; });

    $('attestations-aide-association').textContent = attestationsUnSeulProduit
      ? 'Un seul type de produit dans cette commande — tous les numéros sont libres.'
      : 'Plusieurs produits — chaque personne ne voit que les numéros de son produit déclaré.';

    rendreLignesAssociationAttestations(prixParProduit);
  }catch(e){
    $('attestations-lignes-association').innerHTML = '<div class="msg msg-erreur">Chargement impossible.</div>';
  }
}

function rendreLignesAssociationAttestations(prixParProduit){
  $('attestations-lignes-association').innerHTML = attestationsPersonnesCourantes.map((p, i) => {
    const numerosDispo = attestationsUnSeulProduit ? attestationsNumerosParProduit['*'] : (attestationsNumerosParProduit[p.produit] || []);
    const prix = prixParProduit ? prixParProduit[p.produit] : null;
    return `
    <div class="ligne-reglage" style="margin-top:8px;align-items:center;flex-wrap:wrap">
      <span style="flex:1;min-width:160px;font-size:13.5px">${echapper(p.nomComplet)}${p.produit ? ` <span style="color:var(--steel)">— ${echapper(p.produit)}${prix != null ? ' (' + formaterMontant(prix) + ')' : ''}</span>` : ''}</span>
      <input type="date" data-attestations-naissance="${i}" value="${p.dateNaissance ? p.dateNaissance.split('/').reverse().join('-') : ''}" style="width:150px" title="Date de naissance">
      <select data-attestations-serie="${i}" data-attestations-produit="${echapper(p.produit)}" style="flex:1;min-width:160px">
        <option value="">— Aucun —</option>
        ${numerosDispo.map(n => `<option value="${echapper(n)}" ${p.numeroSerie === n ? 'selected' : ''}>${echapper(n)}</option>`).join('')}
      </select>
    </div>`;
  }).join('');
}

$('btn-attestations-retour').addEventListener('click', () => {
  $('attestations-etape-association').hidden = true;
  $('attestations-etape-liste').hidden = false;
});

/* Import CSV tec.tech — même extraction que la modale numéro de série sur les commandes,
   simplifiée : on ne fait que proposer les numéros trouvés dans les listes déroulantes. */
$('attestations-fichier-csv').addEventListener('change', async () => {
  const fichier = $('attestations-fichier-csv').files[0];
  if(!fichier) return;
  try{
    const texte = await new Promise((resolve, reject) => {
      const lecteur = new FileReader();
      lecteur.onload = () => resolve(String(lecteur.result || ''));
      lecteur.onerror = () => reject(lecteur.error);
      lecteur.readAsText(fichier, 'utf-8');
    });
    const lignesTexte = texte.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const delimiteur = (lignesTexte[0].split(';').length > lignesTexte[0].split(',').length) ? ';' : ',';
    const numeros = lignesTexte
      .map(l => (l.split(delimiteur)[6] || '').trim().replace(/^"|"$/g, ''))
      .filter(Boolean)
      .filter(v => v.toLowerCase() !== 'numéro de série' && v.toLowerCase() !== 'numero de serie');

    if(attestationsUnSeulProduit){
      attestationsNumerosParProduit['*'] = [...new Set([...attestationsNumerosParProduit['*'], ...numeros])];
    }else{
      // Sans produit connu par numéro, on les ajoute au premier groupe — l'admin peut ensuite
      // réassigner manuellement dans les listes déroulantes si besoin.
      const premierProduit = Object.keys(attestationsNumerosParProduit)[0];
      if(premierProduit) attestationsNumerosParProduit[premierProduit] = [...new Set([...attestationsNumerosParProduit[premierProduit], ...numeros])];
    }
    $('attestations-retour-csv').textContent = `${numeros.length} numéro${numeros.length > 1 ? 's' : ''} importé${numeros.length > 1 ? 's' : ''} — disponibles dans les listes ci-dessous.`;
    rendreLignesAssociationAttestations();
  }catch(e){
    $('attestations-retour-csv').textContent = '';
    $('attestations-retour-association').innerHTML = '<div class="msg msg-erreur">Fichier CSV illisible.</div>';
  }
});

$('btn-attestations-melanger').addEventListener('click', () => {
  function melanger(liste){
    const m = [...liste];
    for(let i = m.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [m[i], m[j]] = [m[j], m[i]];
    }
    return m;
  }
  const melangesParGroupe = {};
  Object.keys(attestationsNumerosParProduit).forEach(cle => { melangesParGroupe[cle] = melanger(attestationsNumerosParProduit[cle]); });
  const curseurs = {};
  document.querySelectorAll('#attestations-lignes-association select[data-attestations-serie]').forEach(sel => {
    const groupe = attestationsUnSeulProduit ? '*' : sel.dataset.attestationsProduit;
    const dispo = melangesParGroupe[groupe];
    if(!dispo) return;
    curseurs[groupe] = curseurs[groupe] || 0;
    sel.value = dispo[curseurs[groupe]] || '';
    curseurs[groupe]++;
  });
});

$('btn-attestations-enregistrer-association').addEventListener('click', async () => {
  const naissances = document.querySelectorAll('#attestations-lignes-association [data-attestations-naissance]');
  const series = document.querySelectorAll('#attestations-lignes-association [data-attestations-serie]');
  const valeurs = attestationsPersonnesCourantes.map((p, i) => ({
    nomComplet: p.nomComplet,
    dateNaissance: naissances[i] && naissances[i].value ? naissances[i].value.split('-').reverse().join('/') : '',
    produit: p.produit,
    numeroSerie: series[i] ? series[i].value : '',
  }));

  const numerosUtilises = valeurs.map(p => p.numeroSerie).filter(Boolean);
  if(new Set(numerosUtilises).size !== numerosUtilises.length){
    $('attestations-retour-association').innerHTML = '<div class="msg msg-erreur">Un même numéro de série ne peut pas être assigné à deux personnes.</div>';
    return;
  }

  $('btn-attestations-enregistrer-association').disabled = true;
  $('attestations-retour-association').innerHTML = '';
  try{
    const r = await poster({ action:'attestations-associer', ligne: attestationsLigneCourante, personnes: valeurs });
    if(r.ok){
      attestationsPersonnesCourantes = valeurs;
      $('attestations-retour-association').innerHTML = '<div class="msg msg-succes">Association enregistrée.</div>';
    }else{
      $('attestations-retour-association').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur || 'Enregistrement impossible')}</div>`;
    }
  }catch(e){
    $('attestations-retour-association').innerHTML = '<div class="msg msg-erreur">Enregistrement impossible.</div>';
  }
  $('btn-attestations-enregistrer-association').disabled = false;
});

$('btn-attestations-generer-liens').addEventListener('click', async () => {
  $('btn-attestations-generer-liens').disabled = true;
  $('attestations-retour-generation').innerHTML = '<div class="msg msg-info">Génération en cours — patiente, une attestation par personne…</div>';
  try{
    const r = await poster({ action:'attestations-generer', ligne: attestationsLigneCourante });
    if(r.ok){
      $('attestations-retour-generation').innerHTML = `
        <div class="msg msg-succes">Prêt — ${r.attestations.length} attestation${r.attestations.length > 1 ? 's' : ''} :</div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">
          ${r.attestations.map(a => `<a href="${echapper(a.url)}" target="_blank" rel="noopener">📄 ${echapper(a.nom)}</a>`).join('')}
        </div>`;
    }else{
      $('attestations-retour-generation').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur || 'Génération impossible')}</div>`;
    }
  }catch(e){
    $('attestations-retour-generation').innerHTML = '<div class="msg msg-erreur">Génération impossible.</div>';
  }
  $('btn-attestations-generer-liens').disabled = false;
});

$('btn-attestations-generer-zip').addEventListener('click', async () => {
  $('btn-attestations-generer-zip').disabled = true;
  $('attestations-retour-generation').innerHTML = '<div class="msg msg-info">Génération en cours — ça peut prendre un moment selon le nombre de personnes…</div>';
  try{
    const reponse = await fetch(urlApiActive(), {
      method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'},
      body: JSON.stringify({ action:'attestations-generer-zip', password:motDePasse, ligne: attestationsLigneCourante }),
    });
    if(!reponse.ok || reponse.headers.get('content-type')?.includes('application/json')){
      const r = await reponse.json();
      $('attestations-retour-generation').innerHTML = `<div class="msg msg-erreur">${echapper(r.erreur || 'Génération impossible')}</div>`;
    }else{
      const blob = await reponse.blob();
      const url = URL.createObjectURL(blob);
      const lien = document.createElement('a');
      lien.href = url; lien.download = `attestations-${attestationsLigneCourante}.zip`;
      document.body.appendChild(lien); lien.click(); lien.remove();
      URL.revokeObjectURL(url);
      $('attestations-retour-generation').innerHTML = '<div class="msg msg-succes">Zip téléchargé.</div>';
    }
  }catch(e){
    $('attestations-retour-generation').innerHTML = '<div class="msg msg-erreur">Génération impossible — réessaie.</div>';
  }
  $('btn-attestations-generer-zip').disabled = false;
});
