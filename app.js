// Configurazione di PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let fileSelezionato = null;

document.getElementById('fileUpload').addEventListener('change', function(event) {
    fileSelezionato = event.target.files[0];
});

document.getElementById('btnConfronta').addEventListener('click', function() {
    if (!fileSelezionato) {
        alert("Prima seleziona un file PDF!");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const typedarray = new Uint8Array(e.target.result);
        
        pdfjsLib.getDocument(typedarray).promise.then(function(pdfDoc) {
            let pagePromises = [];
            for (let i = 1; i <= pdfDoc.numPages; i++) {
                pagePromises.push(
                    pdfDoc.getPage(i).then(function(page) {
                        return page.getTextContent().then(function(textContent) {
                            return textContent.items.map(item => item.str).join(" ");
                        });
                    })
                );
            }

            Promise.all(pagePromises).then(function(pagesText) {
                let testoCompleto = pagesText.join("\n");
                estraiSoloPrezziSicuri(testoCompleto);
            });
        });
    };
    reader.readAsArrayBuffer(fileSelezionato);
});

function estraiSoloPrezziSicuri(testo) {
    let aumentiTrovati = [];
    let prezziSalvatiNelBrowser = JSON.parse(localStorage.getItem('ai_cost_prezzi')) || {};
    let nuoviPrezziSalvati = { ...prezziSalvatiNelBrowser };

    // Filtra il testo ignorando rigorosamente dati sensibili come IBAN, P.IVA o intestazioni
    // Cerca solo le righe che contengono i prodotti e i relativi importi numerici
    const righe = testo.split(/[\r\n]+/);
    
    righe.forEach(riga => {
        let rigaUpper = riga.toUpperCase();
        
        // Ignora le righe che contengono dati sensibili o fiscali
        if (rigaUpper.includes("IBAN") || rigaUpper.includes("PARTITA IVA") || rigaUpper.includes("P.IVA") || rigaUpper.includes("CODICE FISCALE")) {
            return; // salta questa riga
        }

        // Cerca ingredienti o voci di costo nel corpo della fattura
        if (rigaUpper.includes("MOZZARELLA") || rigaUpper.includes("POMODORO") || rigaUpper.includes("FARINA") || rigaUpper.includes("OLIO") || rigaUpper.includes("FORMAGGIO")) {
            let numeri = riga.match(/\d+[,\.]\d{2}/g);
            if (numeri && numeri.length > 0) {
                let prezzoTrovato = parseFloat(numeri[numeri.length - 1].replace(',', '.'));
                let ingrediente = rigaUpper.includes("MOZZARELLA") ? "MOZZARELLA" : 
                                  rigaUpper.includes("POMODORO") ? "POMODORO" : 
                                  rigaUpper.includes("FARINA") ? "FARINA" : 
                                  rigaUpper.includes("OLIO") ? "OLIO" : "FORMAGGIO";

                let vecchioPrezzo = prezziSalvatiNelBrowser[ingrediente];
                if (vecchioPrezzo !== undefined && prezzoTrovato > vecchioPrezzo) {
                    let diffPercentuale = ((prezzoTrovato - vecchioPrezzo) / vecchioPrezzo) * 100;
                    aumentiTrovati.push({
                        ingrediente: ingrediente,
                        vecchio: vecchioPrezzo,
                        nuovo: prezzoTrovato,
                        percentuale: diffPercentuale.toFixed(1)
                    });
                }
                nuoviPrezziSalvati[ingrediente] = prezzoTrovato;
            }
        }
    });

    // Salva nel browser solo i prezzi dei prodotti (nessun dato sensibile viene memorizzato)
    localStorage.setItem('ai_cost_prezzi', JSON.stringify(nuoviPrezziSalvati));
    mostraReportGrafico(aumentiTrovati, nuoviPrezziSalvati);
}

function mostraReportGrafico(aumentiTrovati, tuttiIPrezzi) {
    const contenitore = document.getElementById('risultatiAnalisi');
    contenitore.classList.remove('hidden');
    
    let htmlOutput = '<h2 class="text-3xl font-bold text-white mb-6 text-center">Report Confronto Sicuro</h2>';

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
                <span class="bg-emerald-500/20 text-emerald-500 font-bold px-3 py-1 rounded text-sm mb-4 inline-block">ANALISI COMPLETATA IN SICUREZZA</span>
                <p class="text-white">Fattura elaborata correttamente. I dati sensibili sono stati esclusi e i prezzi sono stati confrontati con lo storico.</p>
            </div>
        `;
    }

    htmlOutput += `
        <div class="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h3 class="text-xl font-bold text-white mb-4">Listino Prodotti Monitorati (Storico)</h3>
            <table class="w-full text-left text-sm">
                <thead class="bg-slate-900 text-slate-400">
                    <tr>
                        <th class="p-3">Ingrediente</th>
                        <th class="p-3 text-right">Ultimo Prezzo in Memoria</th>
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
