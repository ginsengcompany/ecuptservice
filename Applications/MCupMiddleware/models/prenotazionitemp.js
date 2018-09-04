let mongoose = require('mongoose');
let prenotazionitempSchema = new mongoose.Schema({
    idUser : String,
    nre : String,
    struttura : String,
    orarioUltimaRichiesta : String,
    appuntamentoConfermato : Boolean,
    dataEmissioneRicetta: String,
    classePriorita : String,
    sar: Boolean,
    termid: String,
    assistito : {
        nome : String,
        cognome : String,
        sesso : String,
        codice_fiscale : String,
        istatComuneNascita : String,
        luogo_nascita : String,
        istatComuneResidenza : String,
        comune_residenza : String,
        telefono : String,
        codStatoCivile : String,
        statocivile : String,
        indirizzores : String,
        email : String,
        nomeCompletoConCodiceFiscale : String,
        data_nascita : String
    },
    prestazioni : [
        {
            codprest : String,
            codregionale : String,
            codnazionale : String,
            desprest : String,
            durata : String,
            priorita : String,
            quantita : String,
            erogabile : String,
            nota : String,
            reparti : []
        }
    ]
});

mongoose.model('prenotazionitemp', prenotazionitempSchema);

module.exports = mongoose.model('prenotazionitemp');