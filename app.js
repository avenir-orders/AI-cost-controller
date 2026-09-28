// app.js - Versione Prototipo Web per AI Cost Controller

document.getElementById('fileUpload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const contenutoCSV = e.target.result;
            elaboraFatturaCSV(contenutoCSV);
        };
        reader.readAsText(file);
    }
});

function elaboraFatturaCSV(csv) {
    const righe = csv.split('\n');
    let nuoviPrezzi = { ...prezziBase };
    let aumentiTrovati = [];

    // Legge il file CSV caricato (formato: Ingrediente,NuovoPrezzo)
    for (let i = 1; i < righe.length; i++) {
        let riga = righe[i].trim().split(',');
        if (riga.length >= 2) {
            let ingrediente = riga[0].trim();
            let nuovoPrezzo = parseFloat(riga[1].replace(',', '.'));
            
            if (prezziBase[ingrediente] !== undefined && nuovoPrezzo > prezziBase[ingrediente]) {
                let diffPercentuale = ((nuovoPrezzo - prezziBase[ingrediente]) / prezziBase[ingrediente]) * 100;
                aumentiTrovati.push({
                    ingrediente: ingrediente,
                    vecchio: prezziBase[ingrediente],
                    nuovo: nuovoPrezzo,
                    percentuale: diffPercentuale.toFixed(1)
                });
            }
            nuoviPrezzi[ingrediente] = nuovoPrezzo;
        }
    }

    calcolaNuoviMargini(nuoviPrezzi, aumentiTrovati);
}

function calcolaCostoRicetta(ricetta, listinoPrezzi) {
    return ricetta.ingredienti.reduce((totale, ing) => {
        let prezzoAlKg = listinoPrezzi[ing.nome] || 0;
        return totale + (ing.quantitaKg * prezzoAlKg);
    }, 0);
}

function calcolaNuoviMargini(nuoviPrezzi, aumentiTrovati) {
    const contenitore = document.getElementById('risultatiAnalisi');
    contenitore.classList.remove('hidden');
    contenitore.classList.add('fade-in');
    
    let htmlOutput = '<h2 class="text-3xl font-bold text-white mb-6 text-center">Risultato Analisi Margini</h2>';

    // Genera Alert dinamico se ci sono aumenti
    if (aumentiTrovati.length > 0) {
        let peggiore = aumentiTrovati.sort((a, b) => b.percentuale - a.percentuale)[0];
        let ricettaColpita = menu.find(p => p.ingredienti.some(i => i.nome === peggiore.ingrediente));
        
        let costoVecchio = calcolaCostoRicetta(ricettaColpita, prezziBase);
        let costoNuovo = calcolaCostoRicetta(ricettaColpita, nuoviPrezzi);
        let impattoMensile = (costoNuovo - costoVecchio) * ricettaColpita.venditeMensili;

        htmlOutput += `
            <div class="bg-slate-900 border-l-4 border-amber-500 p-6 rounded-r-xl mb-8 shadow-2xl">
                <span class="bg-amber-500/20 text-amber-500 font-bold px-3 py-1 rounded text-sm mb-4 inline-block">ATTENZIONE: SCOSTAMENTO MARGINE</span>
                <p class="text-white text-lg mb-4">Il costo della ricetta <strong class="text-emerald-400">${ricettaColpita.nome}</strong> è aumentato a causa dei rincari.</p>
                <ul class="text-slate-300 space-y-2">
                    <li>• Principale causa: ${peggiore.ingrediente} <span class="text-red-400">+${peggiore.percentuale}%</span> (da €${peggiore.vecchio.toFixed(2)} a €${peggiore.nuovo.toFixed(2)}/kg)</li>
                    <li>• Costo porzione ricalcolato: €${costoVecchio.toFixed(2)} → <span class="text-red-400">€${costoNuovo.toFixed(2)}</span></li>
                    <li>• Perdita di marginalità stimata: <span class="text-red-400">-€${impattoMensile.toFixed(0)}/mese</span> sui volumi attuali.</li>
                </ul>
            </div>
        `;
    } else {
        htmlOutput += `
            <div class="bg-slate-900 border-l-4 border-emerald-500 p-6 rounded-r-xl mb-8 shadow-2xl">
                <span class="bg-emerald-500/20 text-emerald-400 font-bold px-3 py-1 rounded text-sm mb-4 inline-block">TUTTO STABILE</span>
                <p class="text-white text-lg">Nessun aumento anomalo rilevato nei prezzi caricati rispetto allo storico.</p>
            </div>
        `;
    }

    // Tabella di riepilogo ricette
    htmlOutput += `
        <div class="overflow-x-auto bg-slate-800 rounded-xl border border-slate-700 mt-8">
            <table class="w-full text-left text-sm">
                <thead class="bg-slate-900 text-slate-400">
                    <tr>
                        <th class="p-4">Prodotto / Ricetta</th>
                        <th class="p-4 text-right">Costo Reale</th>
                        <th class="p-4 text-right">Margine %</th>
                        <th class="p-4 text-right">Margine Lordo Mensile</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-700 text-slate-200">
    `;

    menu.forEach(item => {
        let costo = calcolaCostoRicetta(item, nuoviPrezzi);
        let margineEuro = item.prezzoVendita - costo;
        let marginePerc = (margineEuro / item.prezzoVendita) * 100;
        let incassoMensile = margineEuro * item.venditeMensili;

        htmlOutput += `
            <tr>
                <td class="p-4 font-bold">${item.nome}</td>
                <td class="p-4 text-right text-red-300">€${costo.toFixed(2)}</td>
                <td class="p-4 text-right text-emerald-400">${marginePerc.toFixed(1)}%</td>
                <td class="p-4 text-right font-bold text-white">€${incassoMensile.toFixed(0)}</td>
            </tr>
        `;
    });

    htmlOutput += '</tbody></table></div>';
    contenitore.innerHTML = htmlOutput;
}
