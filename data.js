// data.js - Versione dinamica senza codice fisso
// Se non ci sono dati salvati, creiamo una base iniziale vuota o di test
let menuDinamico = JSON.parse(localStorage.getItem('ai_cost_menu')) || [
    { 
        nome: "Prodotto Standard 1", 
        venditeMensili: 500, 
        prezzoVendita: 10.00, 
        ingredienti: [
            { nome: "INGREDIENTE BASE", quantitaKg: 0.20 }
        ] 
    }
];

let prezziStorici = JSON.parse(localStorage.getItem('ai_cost_prezzi')) || {};
