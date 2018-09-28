let mongoose = require('mongoose');
let utentiSchema = new mongoose.Schema({
    username: String,
    nome: String,
    cognome: String,
    codice_fiscale: String,
    data_nascita: String,
    luogo_nascita: String,
    provincia: String,
    sesso: String,
    password : String,
    struttura_preferita: String,
    comune_residenza: String,
    telefono: String,
    istatComuneNascita: String,
    istatComuneResidenza: String,
    codIstatProvinciaResidenza: String,
    codStatoCivile: String,
    statocivile: String,
    email: String,
    indirizzores: String,
    attivo: Boolean,
    ultimoAccesso: String,
    tokenNotifiche: String,
    dataRegistrazione: String,
    listaMedici: [],
    contatti: [{
        nome: String,
        cognome: String,
        codice_fiscale: String,
        data_nascita: String,
        luogo_nascita: String,
        comune_residenza: String,
        telefono: String,
        istatComuneResidenza: String,
        istatComuneNascita: String,
        codIstatProvinciaResidenza: String,
        indirizzores: String,
        email: String,
        sesso: String,
        provincia: String,
        codStatoCivile: String,
        statocivile: String
    }],
    prenotazioni: []
});
mongoose.model('utenti', utentiSchema);

module.exports = mongoose.model('utenti');