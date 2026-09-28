// app.js - Versione Dinamica e Flessibile

document.getElementById('fileUpload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const contenutoCSV = e.target.result;
            elaboraFatturaDinamica(contenutoCSV);
        };
        reader.readAsText(file);
    }
});

function elaboraFatturaDinamica(csv) {
    const righe = csv.split('\n');
    let aumentiTrovati = [];
    let nuoviPrezziSalvati = { ...prezziStorici };

    // Legge il file CSV (Formato: Ingrediente, PrezzoNuovo)
    for (let i = 1; i < righe.length; i++) {
        let riga = righe[i].trim().split(',');
        if (riga.length >= 2) {
            let ingrediente = riga[0].trim().toUpperCase();
            let nuovoPrezzo = parseFloat(riga[1].replace(',', '.'));
            
            if (!isNaN(nuovoPrezzo)) {
                let vecchioPrezzo = prezziStorici[ingrediente];
                
                if (vecchioPrezzo !== undefined && nuovoPrezzo > vecchioPrezzo) {
                    let diffPercentuale = ((nuovoPrezzo - vecchioPrezzo) / vecchioPrezzo) * 100;
                    aumentiTrovati.push({
                        ingrediente: ingrediente,
                        vecchio: vecchioPrezzo,
                        nuovo: nuovoPrezzo,
                        percentuale: diffPercentuale.toFixed(1)
                    });
                }
                
                // Aggiorna il prezzo nel database locale
                nuoviPrezziSalvati[ingrediente] = nuovoPrezzo;
            }
        }
    }

    // Salva i nuovi prezzi nella memoria del browser
    prezziStorici = nuoviPrezziSalvati;
    localStorage.setItem('ai_cost_prezzi', JSON.stringify(prezziStorici));

    mostraRisultatiDinamici(aumentiTrovati);
}

function mostraRisultatiDinamici(aumentiTrovati) {
    const contenitore = document.getElementById('risultatiAnalisi');
    contenitore.classList.remove('hidden');
    contenitore.classList.add('fade-in');
    
    let htmlOutput = '<h2 class="text-3xl font-bold text-white mb-6 text-center">Analisi Fattura Eseguita</h2>';

    if (aumentiTrovati.length > 0) {
        htmlOutput += `
            <div class="bg-slate-900 border-l-4 border-amber-500 p-6 rounded-r-xl mb-8 shadow-2xl">
                <span class="bg-amber-500/20 text-amber-500 font-bold px-3 py-1 rounded text-sm mb-4 inline-block">AUMENTI RILEVATI NELLA FATTURA</span>
                <ul class="text-slate-300 space-y-3 mt-2">
        `;
        
        aumentiTrovati.forEach(item => {
            htmlOutput += `
                <li>• <strong>${item.ingrediente}</strong>: Prezzo salito da €${item.vecchio.toFixed(2)} a <span class="text-red-400">€${item.nuovo.toFixed(2)}/kg</span> (<span class="text-red-400">+${item.percentuale}%</span>)</li>
            `;
        });
        
        htmlOutput += `
                </ul>
            </div>
        `;
    } else {
        htmlOutput += `
            <div class="bg-slate-900 border-l-4 border-emerald-500 p-6 rounded-r-xl mb-8 shadow-2xl">
                <span class="bg-emerald-500/20 text-emerald-400 font-bold px-3 py-1 rounded text-sm mb-4 inline-block">AGGIORNAMENTO RIUSCITO</span>
                <p class="text-white">I dati della fattura sono stati acquisiti correttamente nel sistema.</p>
            </div>
        `;
    }

    // Tabella riepilogativa dei prodotti dinamici
    htmlOutput += `
        <div class="overflow-x-auto bg-slate-800 rounded-xl border border-slate-700 mt-8">
            <table class="w-full text-left text-sm">
                <thead class="bg-slate-900 text-slate-400">
                    <tr>
                        <th class="p-4">Prodotto / Ricetta</th>
                        <th class="p-4 text-right">Prezzo Vendita</th>
                        <th class="p-4 text-right">Margine Stimato</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-700 text-slate-200">
    `;

    menuDinamico.forEach(item => {
        htmlOutput += `
            <tr>
                <td class="p-4 font-bold">${item.nome}</td>
                <td class="p-4 text-right text-emerald-400">€${item.prezzoVendita.toFixed(2)}</td>
                <td class="p-4 text-right text-slate-300">Attivo nel menu</td>
            </tr>
        `;
    });

    htmlOutput += '</tbody></table></div>';
    contenitore.innerHTML = htmlOutput;
}
