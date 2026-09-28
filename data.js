// data.js
const menu = [
    { 
        nome: "Margherita", 
        venditeMensili: 1240, 
        prezzoVendita: 9.00, 
        ingredienti: [
            { nome: "Mozzarella", quantitaKg: 0.12 }, 
            { nome: "Pomodoro", quantitaKg: 0.10 }
        ] 
    },
    { 
        nome: "4 Formaggi", 
        venditeMensili: 420, 
        prezzoVendita: 11.00, 
        ingredienti: [
            { nome: "Mozzarella", quantitaKg: 0.10 }, 
            { nome: "Gorgonzola", quantitaKg: 0.08 },
            { nome: "Asiago", quantitaKg: 0.05 }
        ] 
    }
];

// I prezzi che avevi a sistema prima della nuova fattura
let prezziBase = {
    "Mozzarella": 7.20,
    "Pomodoro": 1.50,
    "Gorgonzola": 12.00,
    "Asiago": 9.50
};
