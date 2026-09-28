// Configura il motore di decodifica PDF di Mozilla
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
        alert("Seleziona prima un file PDF o CSV dal tuo computer!");
        return;
    }

    const stato = document.getElementById('statoElaborazione');
    stato.innerText = "Elaborazione e lettura del documento in corso...";

    try {
        let testoEstratto = "";
        
        if (fileSelezionato.name.endsWith('.pdf')) {
            testoEstratto = await leggiTestoDaPDF(fileSelezionato);
        } else {
            testoEstratto = await leggiTestoDaCSV(fileSelezionato);
        }

        analizzaTestoEConfrontaPrezzi(testoEstratto);
        stato.innerText = "Analisi completata con successo!";
    } catch (errore) {
        console.error(errore);
        stato.innerText = "Errore durante la lettura del file.";
        alert("Si è verificato un errore nella lettura del documento.");
    }
});

// Funzione pulita per estrarre il testo dal PDF senza caratteri illeggibili
async function leggiTestoDaPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    let testoTotale = "";

    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const testoPagina = textContent.items.map(item => item.str).join(' ');
        testoTotale += testoPagina + "\n";
    }
    return testoTotale;
}

function leggiTestoDaCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = err => reject(err);
        reader.readAsText(file);
    });
}

function analizzaTestoEConfrontaPrezzi(testo) {
    let aumentiTrovati = [];
    let prezziStorici = JSON.parse(localStorage.getItem('ai_cost_storico_prezzi')) || {};
    let nuoviPrezzi = { ...prezziStorici };

    const righe = testo.split('\n');

    righe.forEach(riga => {
        let rigaPulita = riga.trim();
        if (!rigaPulita) return;

        // Cerca pattern di prezzo nel testo (es. parole seguite da importi in formato 0,00 o 0.00)
        let corrispondenze = rigaPulita.match(/([A-ZÀ-Úa-zà-ú\s]+)?[\s\-:]+(\d+[\.,]\d{2})/g);
        
        if (corrispondenze) {
            corrispondenze.forEach(item => {
                let parti = item.split(/[\s\-:]+/);
                let prezzoStr = parti.pop().replace(',', '.');
                let prodotto = parti.join(' ').trim().toUpperCase();
                let prezzoCorrente = parseFloat(prezzoStr);

                if (prodotto.length > 2 && !isNaN(prezzoCorrente)) {
                    let vecchioPrezzo = prezziStorici[prodotto];

                    if (vecchioPrezzo !== undefined && prezzoCorrente > vecchioPrezzo) {
                        let diffPercentuale = ((prezzoCorrente - vecchioPrezzo) / vecchioPrezzo) * 100;
                        aumentiTrovati.push({
                            prodotto: prodotto,
                            vecchio: vecchioPrezzo,
                            nuovo: prezzoCorrente,
                            percentuale: diffPercentuale.toFixed(1)
                        });
                    }
                    nuoviPrezzi[prodotto] = prezzoCorrente;
                }
            });
        }
    });

    localStorage.setItem('ai_cost_storico_prezzi', JSON.stringify(nuoviPrezzi));
    mostraReportGrafico(aumentiTrovati, nuoviPrezzi);
}

function mostraReportGrafico(aumentiTrovati, tuttiIPrezzi) {
    const contenitore = document.getElementById('risultatiAnalisi');
    contenitore.classList.remove('hidden');
    
    let htmlOutput = '<h2 class="text-3xl font-bold text-white mb-6 text-center">Report Analisi PDF e Variazioni</h2>';

    if (aumentiTrovati.length > 0) {
        htmlOutput += `
            <div class="bg-slate-900 border-l-4 border-amber-500 p-6 rounded-r-xl mb-8 shadow-2xl">
                <span class="bg-amber-500/20 text-amber-500 font-bold px-3 py-1 rounded text-sm mb-4 inline-block">ATTENZIONE: RINCARI RILEVATI</span>
                <ul class="text-slate-300 space-y-3 mt-2">
        `;
        aumentiTrovati.forEach(item => {
            htmlOutput += `
                <li>• <strong>${item.prodotto}</strong>: Prezzo salito da €${item.vecchio.toFixed(2)} a <span class="text-red-400">€${item.nuovo.toFixed(2)}</span> (<span class="text-red-400">+${item.percentuale}%</span>)</li>
            `;
        });
        htmlOutput += `</ul></div>`;
    } else {
        htmlOutput += `
            <div class="bg-slate-900 border-l-4 border-emerald-500 p-6 rounded-r-xl mb-8 shadow-2xl">
                <span class="bg-emerald-500/20 text-emerald-500 font-bold px-3 py-1 rounded text-sm mb-4 inline-block">DOCUMENTO LETTO CORRETTAMENTE</span>
                <p class="text-white">Testo estratto dal PDF ed elementi registrati nello storico del browser.</p>
            </div>
        `;
    }

    htmlOutput += `
        <div class="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 class="text-xl font-bold text-white mb-4">Listino Estratto in Memoria</h3>
            <table class="w-full text-left text-sm">
                <thead class="bg-slate-900 text-slate-400">
                    <tr>
                        <th class="p-3">Voce / Prodotto</th>
                        <th class="p-3 text-right">Prezzo Rilevato</th>
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
