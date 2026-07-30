/* ══════════════ BILAN MATÉRIEL ══════════════ */

const PALETTE_GRAPHIQUES = [
  '#213A8E', '#00ACB0', '#FECC38', '#e62460', '#8A4FC7',
  '#3AB9B4', '#5B8DEF', '#F0A83C', '#5FCBA0', '#C77DD6'
];

function moisAnnee(dateStr){
  if(!dateStr) return null;
  const [, m, a] = dateStr.split('/').map(Number);
  if(!m || !a) return null;
  const noms = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
  return { cle: a + '-' + String(m).padStart(2,'0'), libelle: noms[m-1] + ' ' + a };
}

/** Construit un camembert SVG à partir d'une liste {libelle, valeur}. Pur SVG, pas de dépendance externe. */
function construireCamembert(donnees, taille){
  taille = taille || 220;
  const total = donnees.reduce((t, d) => t + d.valeur, 0);
  const cx = taille/2, cy = taille/2, rayon = taille/2 - 4;
  if(!total){
    return `<div class="bilan-vide-graphique">Pas encore de données</div>`;
  }
  let angle = -90;
  const segments = donnees.map((d, i) => {
    const part = d.valeur / total;
    const angleDepart = angle;
    const angleFin = angle + part * 360;
    angle = angleFin;
    const grand = (angleFin - angleDepart) > 180 ? 1 : 0;
    const x1 = cx + rayon * Math.cos(angleDepart * Math.PI/180);
    const y1 = cy + rayon * Math.sin(angleDepart * Math.PI/180);
    const x2 = cx + rayon * Math.cos(angleFin * Math.PI/180);
    const y2 = cy + rayon * Math.sin(angleFin * Math.PI/180);
    const couleur = PALETTE_GRAPHIQUES[i % PALETTE_GRAPHIQUES.length];
    // Un seul segment (100%) : cercle complet, le tracé en arc ne fonctionne pas pour 360°
    if(donnees.length === 1){
      return `<circle cx="${cx}" cy="${cy}" r="${rayon}" fill="${couleur}"/>`;
    }
    return `<path d="M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${rayon},${rayon} 0 ${grand} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z" fill="${couleur}"/>`;
  }).join('');

  const legende = donnees.map((d, i) => {
    const pct = total ? Math.round(d.valeur / total * 100) : 0;
    const couleur = PALETTE_GRAPHIQUES[i % PALETTE_GRAPHIQUES.length];
    return `<div class="legende-item">
      <span class="legende-puce" style="background:${couleur}"></span>
      <span class="legende-libelle">${echapper(d.libelle)}</span>
      <span class="legende-valeur">${d.valeur} · ${pct}%</span>
    </div>`;
  }).join('');

  return `
    <div class="bilan-camembert-bloc">
      <svg viewBox="0 0 ${taille} ${taille}" class="bilan-camembert-svg">${segments}</svg>
      <div class="bilan-legende">${legende}</div>
    </div>`;
}

/** Construit un graphique en barres verticales à partir d'une liste {libelle, valeur}, triée chronologiquement. */
function construireBarres(donnees){
  const max = Math.max(1, ...donnees.map(d => d.valeur));
  return `<div class="bilan-barres">
    ${donnees.map(d => `
      <div class="bilan-barre-item">
        <div class="bilan-barre-tige" style="height:${Math.max(4, d.valeur / max * 120)}px" title="${d.valeur}"></div>
        <div class="bilan-barre-valeur">${d.valeur}</div>
        <div class="bilan-barre-libelle">${echapper(d.libelle)}</div>
      </div>`).join('')}
  </div>`;
}

/** Convertit une date au format dd/MM/yyyy (telle que stockée) en yyyy-MM-dd,
 *  directement comparable lexicographiquement aux valeurs d'un <input type="date">. */
function dateFrVersComparable(dateStr){
  if(!dateStr) return '';
  const [j, m, a] = dateStr.split('/');
  if(!j || !m || !a) return '';
  return a + '-' + m.padStart(2,'0') + '-' + j.padStart(2,'0');
}

function initialiserFiltreBilan(){
  const anneeCourante = new Date().getFullYear();
  $('bilan-date-debut').value = anneeCourante + '-01-01';
  $('bilan-date-fin').value = anneeCourante + '-12-31';
}
$('btn-bilan-annee-courante').addEventListener('click', () => { initialiserFiltreBilan(); rendreBilan(); rendreBilanSav(); });
$('btn-recharger-bilan').addEventListener('click', () => {
  etat('Actualisation…', 'neutre');
  Promise.all([chargerFactures(), chargerStatutsSav().then(chargerSav)]).then(() => {
    rendreBilan(); rendreBilanSav(); etat('À jour', 'succes');
  });
});
$('bilan-date-debut').addEventListener('change', () => { rendreBilan(); rendreBilanSav(); });
$('bilan-date-fin').addEventListener('change', () => { rendreBilan(); rendreBilanSav(); });
initialiserFiltreBilan();

let filtreBilanAffichage = 'materiel';
function appliquerAffichageBilan(){
  $('bilan-bandeau').hidden = (filtreBilanAffichage === 'sav');
  $('bilan-contenu').hidden = (filtreBilanAffichage === 'sav');
  $('bilan-sav-contenu').hidden = (filtreBilanAffichage === 'materiel');
}
$('filtres-bilan-type').addEventListener('click', e => {
  const b = e.target.closest('button');
  if(!b) return;
  document.querySelectorAll('#filtres-bilan-type button').forEach(x => x.classList.toggle('actif', x === b));
  filtreBilanAffichage = b.dataset.bt;
  appliquerAffichageBilan();
});

function rendreBilan(){
  const debut = $('bilan-date-debut').value; // yyyy-mm-dd, ou '' si vide (= pas de borne basse)
  const fin   = $('bilan-date-fin').value;
  const dansLaPeriode = c => {
    const d = dateFrVersComparable(c.date);
    if(!d) return true; // ne masque jamais une ligne dont la date est absente/illisible
    if(debut && d < debut) return false;
    if(fin && d > fin) return false;
    return true;
  };

  const commandesPeriode = commandes.filter(dansLaPeriode);
  const facturesPeriode = factures.filter(dansLaPeriode);

  const commandesLivrees = commandesPeriode.filter(c => c.statutCommande === 'Livrée');
  const commandesActives = commandesPeriode.filter(c => c.statutCommande !== 'Annulée');
  const commandesAnnulees = commandesPeriode.filter(c => c.statutCommande === 'Annulée');

  // ─── Bandeau principal : total distribué (Livrée uniquement) ───
  const totalDistribue = commandesLivrees.reduce((t, c) => t + (parseInt(c.quantite, 10) || 0), 0);

  const parProduit = {};
  commandesLivrees.forEach(c => {
    (c.lignes || []).forEach(l => {
      const qte = parseInt(l.quantite, 10) || 0;
      if(!qte || !l.produit) return;
      parProduit[l.produit] = (parProduit[l.produit] || 0) + qte;
    });
  });
  const listeParProduit = Object.keys(parProduit)
    .map(nom => ({ nom, quantite: parProduit[nom] }))
    .sort((a,b) => b.quantite - a.quantite);

  const tauxAnnulation = commandesPeriode.length ? Math.round(commandesAnnulees.length / commandesPeriode.length * 100) : 0;

  const puceProduit = listeParProduit.map(p => {
    const info = produits.find(x => x.nom === p.nom);
    return `<div class="puce-bilan">
      ${svgIconePuce(p.nom, info ? info.icone : '')}
      <span class="n">${p.quantite}</span>
      <span class="l">${echapper(p.nom)}</span>
    </div>`;
  }).join('');

  // ─── Camembert 1 : répartition des produits distribués ───
  const camembertProduits = construireCamembert(
    listeParProduit.map(p => ({ libelle: p.nom, valeur: p.quantite }))
  );

  // ─── Camembert 2 : répartition par structure (quantité, commandes actives hors annulées) ───
  const parStructureQte = {};
  commandesActives.forEach(c => {
    const qte = parseInt(c.quantite, 10) || 0;
    if(!qte) return;
    parStructureQte[c.nom] = (parStructureQte[c.nom] || 0) + qte;
  });
  const listeParStructureQte = Object.keys(parStructureQte)
    .map(nom => ({ libelle: nom, valeur: parStructureQte[nom] }))
    .sort((a,b) => b.valeur - a.valeur);
  const camembertStructures = construireCamembert(listeParStructureQte.slice(0, 8));

  // ─── Évolution mensuelle : nombre de commandes par mois ───
  const parMois = {};
  commandesPeriode.forEach(c => {
    const ma = moisAnnee(c.date);
    if(!ma) return;
    if(!parMois[ma.cle]) parMois[ma.cle] = { libelle: ma.libelle, valeur: 0 };
    parMois[ma.cle].valeur++;
  });
  const listeParMois = Object.keys(parMois).sort().map(cle => parMois[cle]).slice(-12);
  const graphiqueMensuel = construireBarres(listeParMois);

  // ─── Top structures par montant facturé ───
  const montantParStructure = {};
  facturesPeriode.forEach(f => {
    montantParStructure[f.nomStructure] = (montantParStructure[f.nomStructure] || 0) + (parseFloat(f.montantTotal) || 0);
  });
  const topStructuresMontant = Object.keys(montantParStructure)
    .map(nom => ({ nom, montant: montantParStructure[nom] }))
    .sort((a,b) => b.montant - a.montant)
    .slice(0, 8);

  $('bilan-bandeau').innerHTML = `
    <div class="bilan-bandeau-principal">
      <div class="bilan-chiffre-principal">
        <div class="bilan-chiffre-valeur">${totalDistribue}</div>
        <div class="bilan-chiffre-libelle">Matériel distribué au total (commandes livrées)</div>
      </div>
      <div class="bilan-chiffre-secondaire">
        <div class="bilan-chiffre-valeur-mini">${tauxAnnulation}%</div>
        <div class="bilan-chiffre-libelle">Taux de commandes annulées (${commandesAnnulees.length} / ${commandesPeriode.length})</div>
      </div>
    </div>

    ${puceProduit ? `<div class="bilan-detail-produits">${puceProduit}</div>` : ''}
  `;

  $('bilan-contenu').innerHTML = `
    <div class="bilan-grille-graphiques">
      <div class="bilan-carte-graphique">
        <h3>Répartition des produits distribués</h3>
        ${camembertProduits}
      </div>
      <div class="bilan-carte-graphique">
        <h3>Répartition par structure (quantité)</h3>
        ${camembertStructures}
        ${listeParStructureQte.length > 8 ? `<p class="bilan-note">Top 8 sur ${listeParStructureQte.length} structures</p>` : ''}
      </div>
    </div>

    <div class="bilan-grille-graphiques">
      <div class="bilan-carte-graphique">
        <h3>Évolution mensuelle des commandes</h3>
        ${listeParMois.length ? graphiqueMensuel : '<div class="bilan-vide-graphique">Pas encore de données</div>'}
      </div>
      <div class="bilan-carte-graphique">
        <h3>Top structures par montant facturé</h3>
        ${topStructuresMontant.length ? `<div class="bilan-top-liste">
          ${topStructuresMontant.map((s, i) => `
            <div class="bilan-top-item">
              <span class="bilan-top-rang">${i+1}</span>
              <span class="bilan-top-nom">${echapper(s.nom)}</span>
              <span class="bilan-top-montant">${formaterMontant(s.montant)}</span>
            </div>`).join('')}
        </div>` : '<div class="bilan-vide-graphique">Pas encore de factures</div>'}
      </div>
    </div>
  `;
  appliquerAffichageBilan();
}

function rendreBilanSav(){
  const debut = $('bilan-date-debut').value;
  const fin   = $('bilan-date-fin').value;
  const dansLaPeriode = t => {
    const d = dateFrVersComparable(t.date);
    if(!d) return true;
    if(debut && d < debut) return false;
    if(fin && d > fin) return false;
    return true;
  };

  const savPeriode = sav.filter(dansLaPeriode);

  const compter = (cle) => {
    const compteur = {};
    savPeriode.forEach(t => {
      const v = (t[cle] || '').trim();
      if(!v) return;
      compteur[v] = (compteur[v] || 0) + 1;
    });
    return Object.keys(compteur).map(k => ({ libelle: k, valeur: compteur[k] })).sort((a,b) => b.valeur - a.valeur);
  };

  const parSymptome = compter('symptome');
  const parReconditionneur = compter('reconditionneur');
  const parProblemeEffectif = compter('problemeEffectif');

  const camembertSymptomes = parSymptome.length ? construireCamembert(parSymptome) : '';
  const camembertReconditionneurs = parReconditionneur.length ? construireCamembert(parReconditionneur) : '';
  const camembertProblemes = parProblemeEffectif.length ? construireCamembert(parProblemeEffectif) : '';

  const statutsTermines = statutsSav.filter(s => s.terminal).map(s => s.statut);
  const nbTraites = savPeriode.filter(t => statutsTermines.includes(t.statut)).length;
  const nbEnCours = savPeriode.length - nbTraites;

  $('bilan-sav-contenu').innerHTML = `
    <div class="bilan-bandeau-principal">
      <div class="bilan-chiffre-principal">
        <div class="bilan-chiffre-valeur">${savPeriode.length}</div>
        <div class="bilan-chiffre-libelle">Tickets SAV sur la période</div>
      </div>
      <div class="bilan-chiffre-secondaire">
        <div class="bilan-chiffre-valeur-mini">${nbTraites}</div>
        <div class="bilan-chiffre-libelle">Traités (${nbEnCours} encore en cours)</div>
      </div>
    </div>

    <div class="bilan-grille-graphiques">
      <div class="bilan-carte-graphique">
        <h3>Répartition des symptômes déclarés</h3>
        ${camembertSymptomes || '<div class="bilan-vide-graphique">Pas encore de données</div>'}
      </div>
      <div class="bilan-carte-graphique">
        <h3>SAV par reconditionneur / ESN</h3>
        ${camembertReconditionneurs || '<div class="bilan-vide-graphique">Aucun reconditionneur renseigné sur la période</div>'}
      </div>
    </div>

    <div class="bilan-grille-graphiques">
      <div class="bilan-carte-graphique">
        <h3>Répartition par panne effective (après contrôle)</h3>
        ${camembertProblemes || '<div class="bilan-vide-graphique">Aucun diagnostic renseigné sur la période</div>'}
      </div>
    </div>
  `;
  appliquerAffichageBilan();
}

