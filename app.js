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
        
        // Legge il PDF direttamente nel browser
        pdfjsLib.getDocument(typedarray).promise.then(function(pdfDoc) {
            let extractedText = "";
            
            // Estrae il testo da tutte le pagine del PDF
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
                extractedText = pagesText.join("\n");
                analizzaTestoFattura(extractedText);
            });
        });
    };
    reader.readAsArrayBuffer(fileSelezionato);
});

function analizzaTestoFattura(testo) {
    let aumentiTrovati = [];
    let prezziSalvatiNelBrowser = JSON.parse(localStorage.getItem('ai_cost_prezzi')) || {};
    let nuoviPrezziSalvati = { ...prezziSalvatiNelBrowser };

    // Cerca nel testo parole chiave comuni nelle fatture (es. ingredienti simulati o pattern di prezzo)
    // Per un test rapido, cerchiamo corrispondenze con parole chiave nel testo del PDF
    const righe = testo.split(/[\r\n]+/);
    
    righe.forEach(riga => {
        let rigaUpper = riga.toUpperCase();
        // Esempio di ricerca intelligente nel testo della fattura
        if (rigaUpper.includes("MOZZARELLA") || rigaUpper.includes("POMODORO") || rigaUpper.includes("FARINA") || rigaUpper.includes("OLIO")) {
            // Estrae eventuali numeri decimali vicini (prezzi)
            let numeri = riga.match(/\d+[,\.]\d{2}/g);
            if (numeri && numeri.length > 0) {
                let prezzoTrovato = parseFloat(numeri[numeri.length - 1].replace(',', '.'));
                let ingrediente = rigaUpper.includes("MOZZARELLA") ? "MOZZARELLA" : 
                                  rigaUpper.includes("POMODORO") ? "POMODORO" : 
                                  rigaUpper.includes("FARINA") ? "FARINA" : "OLIO";

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

    localStorage.setItem('ai_cost_prezzi', JSON.stringify(nuoviPrezziSalvati));
    mostraReportGrafico(aumentiTrovati, nuoviPrezziSalvati, testo);
}

function mostraReportGrafico(aumentiTrovati, tuttiIPrezzi, testoGrezzo) {
    const contenitore = document.getElementById('risultatiAnalisi');
    contenitore.classList.remove('hidden');
    
    let htmlOutput = '<h2 class="text-3xl font-bold text-white mb-6 text-center">Report Analisi PDF</h2>';

    if (aumentiTrovati.length > 0) {
        htmlOutput += `
            <div class="bg-slate-900 border-l-4 border-amber-500 p-6 rounded-r-xl mb-8 shadow-2xl">
                <span class="bg-amber-500/20 text-amber-500 font-bold px-3 py-1 rounded text-sm mb-4 inline-block">ATTENZIONE: RINCARI RILEVATI DA PDF</span>
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
                <span class="bg-emerald-500/20 text-emerald-500 font-bold px-3 py-1 rounded text-sm mb-4 inline-block">PDF LETTO CORRETTAMENTE</span>
                <p class="text-white">Il file PDF è stato analizzato dal browser. Nessun rincaro critico rilevato rispetto allo storico.</p>
            </div>
        `;
    }

    // Mostra la tabella dello storico prezzi e un'anteprima del testo estratto dal PDF
    htmlOutput += `
        <div class="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6">
            <h3 class="text-xl font-bold text-white mb-4">Listino Storico nel Browser</h3>
            <table class="w-full text-left text-sm">
                <thead class="bg-slate-900 text-slate-400">
                    <tr>
                        <th class="p-3">Ingrediente</th>
                        <th class="p-3 text-right">Ultimo Prezzo</th>
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

    // Box di anteprima del testo estratto dal PDF per trasparenza
    htmlOutput += `
        <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <h4 class="text-sm font-bold text-slate-400 mb-2">Testo estratto dal PDF in automatico:</h4>
            <p class="text-xs text-slate-500 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">${testoGrezzo.substring(0, 1000)}...</p>
        </div>
    `;

    contenitore.innerHTML = htmlOutput;
}
