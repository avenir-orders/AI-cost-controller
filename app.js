// app.js - Versione CSV Aggiornata e Visibile

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
    let aumentiTrovati = [];
    let prezziSalvatiNelBrowser = JSON.parse(localStorage.getItem('ai_cost_prezzi')) || {};
    let nuoviPrezziSalvati = { ...prezziSalvatiNelBrowser };

    // Legge il file CSV saltando la prima riga (intestazione)
    // Formato atteso nel CSV: Ingrediente, Prezzo (es: MOZZARELLA,8.10)
    for (let i = 1; i < righe.length; i++) {
        let rigaTrim = righe[i].trim();
        if (rigaTrim !== "") {
            let col = rigaTrim.split(',');
            if (col.length >= 2) {
                let ingrediente = col[0].trim().toUpperCase();
                let nuovoPrezzo = parseFloat(col[1].trim().replace(',', '.'));
                
                if (!isNaN(nuovoPrezzo)) {
                    let vecchioPrezzo = prezziSalvatiNelBrowser[ingrediente];
                    
                    if (vecchioPrezzo !== undefined) {
                        if (nuovoPrezzo > vecchioPrezzo) {
                            let diffPercentuale = ((nuovoPrezzo - vecchioPrezzo) / vecchioPrezzo) * 100;
                            aumentiTrovati.push({
                                ingrediente: ingrediente,
                                vecchio: vecchioPrezzo,
                                nuovo: nuovoPrezzo,
                                percentuale: diffPercentuale.toFixed(1)
                            });
                        }
                    }
                    // Aggiorna con il nuovo prezzo nel database del browser
                    nuoviPrezziSalvati[ingrediente] = nuovoPrezzo;
                }
            }
        }
    }

    // Salva i nuovi prezzi nella memoria del browser
    localStorage.setItem('ai_cost_prezzi', JSON.stringify(nuoviPrezziSalvati));

    mostraReportGrafico(aumentiTrovati, nuoviPrezziSalvati);
}

function mostraReportGrafico(aumentiTrovati, tuttiIPrezzi) {
    const contenitore = document.getElementById('risultatiAnalisi');
    contenitore.classList.remove('hidden');
    contenitore.classList.add('fade-in');
    
    let htmlOutput = '<h2 class="text-3xl font-bold text-white mb-6 text-center">Report Analisi Acquisti</h2>';

    // Se ci sono aumenti, mostra l'Alert in arancione
    if (aumentiTrovati.length > 0) {
        htmlOutput += `
            <div class="bg-slate-900 border-l-4 border-amber-500 p-6 rounded-r-xl mb-8 shadow-2xl">
                <span class="bg-amber-500/20 text-amber-500 font-bold px-3 py-1 rounded text-sm mb-4 inline-block">ATTENZIONE: RINCARI RILEVATI</span>
                <ul class="text-slate-300 space-y-3 mt-2">
        `;
        aumentiTrovati.forEach(item => {
            htmlOutput += `
                <li>• <strong>${item.ingrediente}</strong>: Prezzo salito da €${item.vecchio.toFixed(2)} a <span class="text-red-400">€${item.nuovo.toFixed(2)}/kg</span> (<span class="text-red-400">+${item.percentuale}%</span>)</li>
            `;
        });
        htmlOutput += `</ul></div>`;
    } else {
        htmlOutput += `
            <div class="bg-slate-900 border-l-4 border-emerald-500 p-6 rounded-r-xl mb-8 shadow-2xl">
                <span class="bg-emerald-500/20 text-emerald-400 font-bold px-3 py-1 rounded text-sm mb-4 inline-block">NESSUN RINCARO</span>
                <p class="text-white">Tutti i prezzi di questo file sono stabili o inferiori rispetto allo storico salvato.</p>
            </div>
        `;
    }

    // Tabella con TUTTI i prezzi attualmente memorizzati nel browser (per vedere cosa sta confrontando)
    htmlOutput += `
        <div class="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 class="text-xl font-bold text-white mb-4">Listino Storico Attualmente in Memoria</h3>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="bg-slate-900 text-slate-400">
                        <tr>
                            <th class="p-3">Ingrediente</th>
                            <th class="p-3 text-right">Ultimo Prezzo Registrato</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-700 text-slate-200">
    `;

    for (let [ing, prezzo] of Object.entries(tuttiIPrezzi)) {
        htmlOutput += `
            <tr>
                <td class="p-3 font-semibold">${ing}</td>
                <td class="p-3 text-right text-emerald-400">€${prezzo.toFixed(2)} / kg</td>
            </tr>
        `;
    }

    htmlOutput += '</tbody></table></div></div>';
    contenitore.innerHTML = htmlOutput;
}
