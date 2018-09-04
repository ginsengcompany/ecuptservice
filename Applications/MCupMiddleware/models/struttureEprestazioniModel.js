let mongoose = require('mongoose');
let struttureEprestazioni = new mongoose.Schema({
    nome_struttura : String,
    codice_struttura : String,
    regione : String,
    codRegione : String,
    contatto : {
        numero_callCenter : String,
        email : String
    },
    prestazioni : [
        {
            descrizione : String,
            codprest : Number
        }
    ],
    logo_struttura : String
});

mongoose.model('struttureprestazioni', struttureEprestazioni);

module.exports = mongoose.model('struttureprestazioni');