// app.js
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
    // Simula la lettura di un file con colonne: Ingrediente,NuovoPrezzo
    const righe = csv.split('\n');
    let nuoviPrezzi = { ...prezziBase };
    let aumentiTrovati = [];

    // Salta l'intestazione e leggi i dati
    for (let i = 1; i < righe.length; i++) {
        let riga = righe[i].trim().split(',');
        if (riga.length >= 2) {
            let ingrediente = riga[0];
            let nuovoPrezzo = parseFloat(riga[1]);
            
            if (prezziBase[ingrediente] && nuovoPrezzo > prezziBase[ingrediente]) {
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

function calcolaCostoPizza(pizza, listinoPrezzi) {
    return pizza.ingredienti.reduce((totale, ing) => {
        return totale + (ing.quantitaKg * listinoPrezzi[ing.nome]);
    }, 0);
}

function calcolaNuoviMargini(nuoviPrezzi, aumentiTrovati) {
    const contenitore = document.getElementById('risultatiAnalisi');
    contenitore.classList.remove('hidden');
    contenitore.classList.add('fade-in');
    
    let htmlOutput = '<h2 class="text-3xl font-bold text-white mb-6 text-center">Analisi Completata</h2>';

    // Genera Alert per gli ingredienti
    if (aumentiTrovati.length > 0) {
        let ingredientePeggiorativo = aumentiTrovati.sort((a, b) => b.percentuale - a.percentuale)[0];
        
        // Trova la pizza più colpita
        let pizzaPiuColpita = menu.find(p => p.ingredienti.some(i => i.nome === ingredientePeggiorativo.ingrediente));
        
        let costoVecchio = calcolaCostoPizza(pizzaPiuColpita, prezziBase);
        let costoNuovo = calcolaCostoPizza(pizzaPiuColpita, nuoviPrezzi);
        let impattoMensile = (costoNuovo - costoVecchio) * pizzaPiuColpita.venditeMensili;

        htmlOutput += `
            <div class="bg-slate-900 border-l-4 border-amber-500 p-6 rounded-r-xl mb-8 shadow-2xl">
                <span class="bg-amber-500/20 text-amber-500 font-bold px-3 py-1 rounded text-sm mb-4 inline-block">ALERT AUTOMATICO</span>
                <p class="text-white text-lg mb-4">Il costo della <strong class="text-emerald-400">${pizzaPiuColpita.nome}</strong> è aumentato a causa degli ultimi acquisti.</p>
                <ul class="text-slate-300 space-y-2">
                    <li>• Principale causa: ${ingredientePeggiorativo.ingrediente} <span class="text-red-400">+${ingredientePeggiorativo.percentuale}%</span> (da €${ingredientePeggiorativo.vecchio} a €${ingredientePeggiorativo.nuovo}/kg)</li>
                    <li>• Costo ricetta ricalcolato: €${costoVecchio.toFixed(2)} → <span class="text-red-400">€${costoNuovo.toFixed(2)}</span></li>
                    <li>• Perdita di marginalità stimata: <span class="text-red-400">-€${impattoMensile.toFixed(0)}/mese</span> basato sui tuoi volumi.</li>
                </ul>
            </div>
        `;
    }

    // Genera Tabella Margini Aggiornata
    htmlOutput += `
        <div class="overflow-x-auto bg-slate-800 rounded-xl border border-slate-700 mt-8">
            <table class="w-full text-left text-sm">
                <thead class="bg-slate-900 text-slate-400">
                    <tr>
                        <th class="p-4">Prodotto</th>
                        <th class="p-4 text-right">Nuovo Costo</th>
                        <th class="p-4 text-right">Nuovo Margine %</th>
                        <th class="p-4 text-right">Margine Lordo Mensile</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-700 text-slate-200">
    `;

    menu.forEach(pizza => {
        let costo = calcolaCostoPizza(pizza, nuoviPrezzi);
        let margineEuro = pizza.prezzoVendita - costo;
        let marginePerc = (margineEuro / pizza.prezzoVendita) * 100;
        let incassoMargineMensile = margineEuro * pizza.venditeMensili;

        htmlOutput += `
            <tr>
                <td class="p-4 font-bold">${pizza.nome}</td>
                <td class="p-4 text-right text-red-300">€${costo.toFixed(2)}</td>
                <td class="p-4 text-right text-emerald-400">${marginePerc.toFixed(1)}%</td>
                <td class="p-4 text-right font-bold text-white">€${incassoMargineMensile.toFixed(0)}</td>
            </tr>
        `;
    });

    htmlOutput += '</tbody></table></div>';
    contenitore.innerHTML = htmlOutput;
}
