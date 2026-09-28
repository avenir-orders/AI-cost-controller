// app.js - Gestione con pulsante "Confronta Fattura"

let fileSelezionato = null;

// Intercetta quando l'utente seleziona un file
document.getElementById('fileUpload').addEventListener('change', function(event) {
    fileSelezionato = event.target.files[0];
});

// Intercetta il click sul tasto "Confronta Fattura"
document.getElementById('btnConfronta').addEventListener('click', function() {
    if (!fileSelezionato) {
        alert("Prima seleziona un file CSV o Excel da caricare!");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const contenuto = e.target.result;
        elaboraDatiFattura(contenuto);
    };
    reader.readAsText(fileSelezionato);
});

function elaboraDatiFattura(csv) {
    const righe = csv.split('\n');
    let aumentiTrovati = [];
    let prezziSalvatiNelBrowser = JSON.parse(localStorage.getItem('ai_cost_prezzi')) || {};
    let nuoviPrezziSalvati = { ...prezziSalvatiNelBrowser };

    // Legge il file riga per riga (Formato atteso: Ingrediente, Prezzo)
    for (let i = 1; i < righe.length; i++) {
        let rigaTrim = righe[i].trim();
        if (rigaTrim !== "") {
            let col = rigaTrim.split(',');
            if (col.length >= 2) {
                let ingrediente = col[0].trim().toUpperCase();
                let nuovoPrezzo = parseFloat(col[1].trim().replace(',', '.'));
                
                if (!isNaN(nuovoPrezzo)) {
                    let vecchioPrezzo = prezziSalvatiNelBrowser[ingrediente];
                    
                    // Se esiste un prezzo precedente nello storico, confrontalo
                    if (vecchioPrezzo !== undefined && nuovoPrezzo > vecchioPrezzo) {
                        let diffPercentuale = ((nuovoPrezzo - vecchioPrezzo) / vecchioPrezzo) * 100;
                        aumentiTrovati.push({
                            ingrediente: ingrediente,
                            vecchio: vecchioPrezzo,
                            nuovo: nuovoPrezzo,
                            percentuale: diffPercentuale.toFixed(1)
                        });
                    }
                    
                    // Aggiorna sempre con il prezzo più recente nel database del browser
                    nuoviPrezziSalvati[ingrediente] = nuovoPrezzo;
                }
            }
        }
    }

    // Salva i nuovi prezzi nella memoria del browser
    localStorage.setItem('ai_cost_prezzi', JSON.stringify(nuoviPrezziSalvati));

    // Mostra il report a schermo
    mostraReportGrafico(aumentiTrovati, nuoviPrezziSalvati);
}

function mostraReportGrafico(aumentiTrovati, tuttiIPrezzi) {
    const contenitore = document.getElementById('risultatiAnalisi');
    contenitore.classList.remove('hidden');
    
    let htmlOutput = '<h2 class="text-3xl font-bold text-white mb-6 text-center">Report Confronto Fattura</h2>';

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
                <span class="bg-emerald-500/20 text-emerald-500 font-bold px-3 py-1 rounded text-sm mb-4 inline-block">NESSUN RINCARO</span>
                <p class="text-white">I prezzi di questa fattura sono stabili o allineati con lo storico registrato.</p>
            </div>
        `;
    }

    // Tabella con lo storico dei prezzi salvati nel browser
    htmlOutput += `
        <div class="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 class="text-xl font-bold text-white mb-4">Listino Storico Aggiornato nel Sistema</h3>
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
