pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let fileSelezionato = null;

document.getElementById('fileUpload').addEventListener('change', function(event) {
    fileSelezionato = event.target.files[0];
    if (fileSelezionato) {
        document.getElementById('statoElaborazione').innerText = "File selezionato: " + fileSelezionato.name;
    }
});

document.getElementById('btnConfronta').addEventListener('click', async function() {
    if (!fileSelezionato) {
        alert("Seleziona prima un file PDF o CSV!");
        return;
    }

    const stato = document.getElementById('statoElaborazione');
    stato.innerText = "Analisi del documento in corso...";

    try {
        let testoEstratto = "";
        if (fileSelezionato.name.endsWith('.pdf')) {
            testoEstratto = await leggiTestoDaPDF(fileSelezionato);
        } else {
            testoEstratto = await leggiTestoDaCSV(fileSelezionato);
        }

        estraiArticoliEConfronta(testoEstratto);
        stato.innerText = "Confronto prezzi completato!";
    } catch (errore) {
        console.error(errore);
        stato.innerText = "Errore durante la lettura del file.";
    }
});

async function leggiTestoDaPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    let righeTrovate = [];

    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        
        // Ordina gli elementi per posizione verticale per mantenere le righe pulite
        textContent.items.sort((a, b) => b.transform[5] - a.transform[5]);
        
        let rigaCorrente = "";
        let yPrecedente = null;

        textContent.items.forEach(item => {
            let y = Math.round(item.transform[5]);
            if (yPrecedente === null || Math.abs(y - yPrecedente) < 5) {
                rigaCorrente += " " + item.str;
            } else {
                righeTrovate.push(rigaCorrente);
                rigaCorrente = item.str;
            }
            yPrecedente = y;
        });
        righeTrovate.push(rigaCorrente);
    }
    return righeTrovate.join('\n');
}

function leggiTestoDaCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = err => reject(err);
        reader.readAsText(file);
    });
}

function estraiArticoliEConfronta(testo) {
    let aumentiTrovati = [];
    let prezziStorici = JSON.parse(localStorage.getItem('ai_cost_storico_articoli')) || {};
    let nuoviPrezzi = { ...prezziStorici };

    const righe = testo.split('\n');
    
    // Parole chiave da ignorare (per evitare di prendere imponibili o totali fattura)
    const paroleDaScartare = ['IMPONIBILE', 'IMPOSTA', 'TOTALE', 'SCADENZE', 'IVA', 'DOCUMENTO', 'TRASPORTO', 'CONTRIBUTO'];

    righe.forEach(riga => {
        let rigaPulita = riga.trim().toUpperCase();
        if (!rigaPulita) return;

        // Salta le righe di riepilogo fiscale
        if (paroleDaScartare.some(parola => rigaPulita.includes(parola))) return;

        // Cerca pattern di prezzo (es. nome prodotto seguito da un importo in euro)
        let match = rigaPulita.match(/^(.+?)\s+(\d+[\.,]\d{2})$/);
        
        if (match) {
            let prodotto = match[1].trim();
            let prezzo = parseFloat(match[2].replace(',', '.'));

            if (prodotto.length > 2 && !isNaN(prezzo)) {
                let vecchioPrezzo = prezziStorici[prodotto];

                if (vecchioPrezzo !== undefined && prezzo !== vecchioPrezzo) {
                    let diffPercentuale = ((prezzo - vecchioPrezzo) / vecchioPrezzo) * 100;
                    if (diffPercentuale > 0) {
                        aumentiTrovati.push({
                            prodotto: prodotto,
                            vecchio: vecchioPrezzo,
                            nuovo: prezzo,
                            percentuale: diffPercentuale.toFixed(1)
                        });
                    }
                }
                nuoviPrezzi[prodotto] = prezzo;
            }
        }
    });

    localStorage.setItem('ai_cost_storico_articoli', JSON.stringify(nuoviPrezzi));
    mostraTabellaConfronto(aumentiTrovati, nuoviPrezzi);
}

function mostraTabellaConfronto(aumentiTrovati, tuttiIPrezzi) {
    const contenitore = document.getElementById('risultatiAnalisi');
    contenitore.classList.remove('hidden');
    
    let htmlOutput = '<h2 class="text-3xl font-bold text-white mb-6 text-center">Confronto Variazioni Prezzi</h2>';

    // Se ci sono aumenti, mostra l'alert in evidenza
    if (aumentiTrovati.length > 0) {
        htmlOutput += `
            <div class="bg-slate-900 border-l-4 border-amber-500 p-6 rounded-r-xl mb-8 shadow-2xl">
                <span class="bg-amber-500/20 text-amber-500 font-bold px-3 py-1 rounded text-sm mb-4 inline-block">ATTENZIONE: RINCARI RILEVATI RISPETTO ALLA FATTURA PRECEDENTE</span>
                <ul class="text-slate-300 space-y-3 mt-2">
        `;
        aumentiTrovati.forEach(item => {
            htmlOutput += `
                <li>• <strong>${item.prodotto}</strong>: Prezzo precedente €${item.vecchio.toFixed(2)} → Nuovo prezzo <span class="text-red-400 font-bold">€${item.nuovo.toFixed(2)}</span> (<span class="text-red-400">+${item.percentuale}%</span>)</li>
            `;
        });
        htmlOutput += `</ul></div>`;
    } else {
        htmlOutput += `
            <div class="bg-slate-900 border-l-4 border-emerald-500 p-6 rounded-r-xl mb-8 shadow-2xl">
                <span class="bg-emerald-500/20 text-emerald-500 font-bold px-3 py-1 rounded text-sm mb-4 inline-block">NESSUN RINCARO TROVATO</span>
                <p class="text-white">I prezzi di questa fattura sono allineati o inferiori rispetto allo storico registrato.</p>
            </div>
        `;
    }

    // Tabella riepilogativa di tutti gli articoli in memoria
    htmlOutput += `
        <div class="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 class="text-xl font-bold text-white mb-4">Ultimo Prezzo Registrato per Articolo</h3>
            <table class="w-full text-left text-sm">
                <thead class="bg-slate-900 text-slate-400">
                    <tr>
                        <th class="p-3">Articolo / Ingrediente</th>
                        <th class="p-3 text-right">Prezzo Attuale</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-700 text-slate-200">
    `;

    for (let [prod, prezzo] of Object.entries(tuttiIPrezzi)) {
        htmlOutput += `
            <tr>
                <td class="p-3 font-semibold">${prod}</td>
                <td class="p-3 text-right text-emerald-400">€${prezzo.toFixed(2)}</td>
            </tr>
        `;
    }

    htmlOutput += `</tbody></table></div>`;
    contenitore.innerHTML = htmlOutput;
}
