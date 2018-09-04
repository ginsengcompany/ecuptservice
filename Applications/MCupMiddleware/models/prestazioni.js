let mongoose = require('mongoose');
let prestazioniSchema = new mongoose.Schema({
    Codice_Reg:               String,
    Descrizione_completa:     String,
    Codice_Catalogo:          String,
    Descrizione_CATALOGO:     String,
    Branca_Codice:            String,
    Branca_Descrizione:       String,
    Abbreviazioni_Note:       String,
    Disciplina_Codice:        String,
    Disciplina_Descrizione:   String
});
mongoose.model('ciao', prestazioniSchema);

module.exports = mongoose.model('ciao');