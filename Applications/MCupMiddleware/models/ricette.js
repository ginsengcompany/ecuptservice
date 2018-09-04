let mongoose = require('mongoose');
let ricetteSchema = new mongoose.Schema({
    nre : String,
    cognNome : String,
    codiceAss : String,
    indirizzo : String,
    tipoEsenzione : String,
    codRegione: String,
    descrizioneDiagnosi : String,
    dataCompilazione : String,
    classePriorita : String,
    elencoDettagliPrescrVisualErogato : [
        {
            statoPresc : String,
            codProdPrest : String,
            codNomenclNaz : String,
            quantita : String,
            descrProdPrest : String,
            prezzo : String,
            prezzoRimborso : String
        }
    ]
});
mongoose.model('ricette', ricetteSchema);

module.exports = mongoose.model('ricette');