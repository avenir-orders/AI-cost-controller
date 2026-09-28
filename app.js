let fileSelezionato = null;

document.getElementById('fileUpload').addEventListener('change', function(event) {
    fileSelezionato = event.target.files[0];
});

document.getElementById('btnConfronta').addEventListener('click', function() {
    if (!fileSelezionato) {
        alert("Prima seleziona un file CSV valido!");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const contenutoCSV = e.target.result;
        elaboraCSVInSicurezza(contenutoCSV);
    };
    reader.readAsText(fileSelezionato);
});

function elaboraCSVInSicurezza(csvText) {
    let aumentiTrovati = [];
    let prezziSalvati = JSON.parse(localStorage.getItem('ai_cost_prezzi_puliti')) || {};
    let nuoviPrezzi = { ...prezziSalvati };

    const righe = csvText.split('\n');

    righe.forEach(riga => {
        let rigaPulita = riga.trim();
        if (!rigaPulita) return;

        // Divide le colonne del CSV (supporta virgola o punto e virgola)
        let colonne = rigaPulita.split(/[,;]/);
        if (colonne.length >= 2) {
            let ingrediente = colonne[0].replace(/['"]+/g, '').trim().toUpperCase();
            let prezzo = parseFloat(colonne[1].replace(/['"]+/g, '').replace(',', '.'));

            if (!isNaN(prezzo) && ingrediente) {
                let vecchioPrezzo = prezziSalvati[ingrediente];

                if (vecchioPrezzo !== undefined && prezzo > vecchioPrezzo) {
                    let diffPercentuale = ((prezzo - vecchioPrezzo) / vecchioPrezzo) * 100;
                    aumentiTrovati.push({
                        ingrediente: ingrediente,
                        vecchio: vecchioPrezzo,
                        nuovo: prezzo,
                        percentuale: diffPercentuale.toFixed(1)
                    });
                }
                nuoviPrezzi[ingrediente] = prezzo;
            }
        }
    });

    // Salva nel browser solo i dati economici puliti
    localStorage.setItem('ai_cost_prezzi_puliti', JSON.stringify(nuoviPrezzi));
    mostraReport(aumentiTrovati, nuoviPrezzi);
}

function mostraReport(aumentiTrovati, tuttiIPrezzi) {
    const contenitore = document.getElementById('risultatiAnalisi');
    contenitore.classList.remove('hidden');
    
    let htmlOutput = '<h2 class="text-3xl font-bold text-white mb-6 text-center">Report Analisi Acquisti</h2>';

    if (aumentiTrovati.length > 0) {
        htmlOutput += `
            <div class="bg-slate-900 border-l-4 border-amber-500 p-6 rounded-r-xl mb-8 shadow-2xl">
                <span class="bg-amber-500/20 text-amber-500 font-bold px-3 py-1 rounded text-sm mb-4 inline-block">ATTENZIONE: RINCARI RILEVATI</span>
                <ul class="text-slate-300 space-y-3 mt-2">
        `;
        aumentiTrovati.forEach(item => {
            htmlOutput += `
                <li>• <strong>${item.ingrediente}</strong>: Prezzo salito da €${item.vecchio.toFixed(2)} a <span class="text-red-400">€${item.nuovo.toFixed(2)}</span> (<span class="text-red-400">+${item.percentuale}%</span>)</li>
            `;
        });
        htmlOutput += `</ul></div>`;
    } else {
        htmlOutput += `
            <div class="bg-slate-900 border-l-4 border-emerald-500 p-6 rounded-r-xl mb-8 shadow-2xl">
                <span class="bg-emerald-500/20 text-emerald-500 font-bold px-3 py-1 rounded text-sm mb-4 inline-block">DATI AGGIORNATI CON SUCCESSO</span>
                <p class="text-white">File elaborato in totale sicurezza. Nessun dato sensibile memorizzato.</p>
            </div>
        `;
    }

    htmlOutput += `
        <div class="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 class="text-xl font-bold text-white mb-4">Listino Attuale in Memoria</h3>
            <table class="w-full text-left text-sm">
                <thead class="bg-slate-900 text-slate-400">
                    <tr>
                        <th class="p-3">Prodotto / Ingrediente</th>
                        <th class="p-3 text-right">Prezzo Registrato</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-700 text-slate-200">
    `;

    for (let [ing, prezzo] of Object.entries(tuttiIPrezzi)) {
        htmlOutput += `
            <tr>
                <td class="p-3 font-semibold">${ing}</td>
                <td class="p-3 text-right text-emerald-400">€${prezzo.toFixed(2)}</td>
            </tr>
        `;
    }

    htmlOutput += `</tbody></table></div>`;
    contenitore.innerHTML = htmlOutput;
}
