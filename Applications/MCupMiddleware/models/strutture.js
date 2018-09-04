let mongoose = require('mongoose');
let struttureSchema = new mongoose.Schema({
    nome_struttura: String,
    codice_struttura: String,
    logo_struttura: String,
    regione: String,
    codRegione: String,
    indirizzo: String,
    piva: String,
    contatto: {
        numero_callCenter: String,
        email: String
    },
    pagamenti: Boolean,
    referti: Boolean,
    variabili_logicaDati: {
        onMoreReparti: Number,
        onChangeAppuntamento: Number,
        prenotazioniInBlocco: Number,
        asl: Boolean,
        host: String,
        referti: String,
        repositoryReferti: String
    },
    url: {
        TerminiServizio : String,
        Ricetta : String,
        StruttureErogatrici : String,
        Registrazione : String,
        Login : String,
        StrutturaPreferita : String,
        RicercadisponibilitaReparti : String,
        PrimaDisponibilita : String,
        InfoPersonali : String,
        AggiungiNuovoContatto : String,
        EliminaContatto : String,
        ListaComuni : String,
        ListaProvince : String,
        ListaStatoCivile : String,
        ConfermaPrenotazione : String,
        prossimaDataDisponibile : String,
        updateTokenNotifiche : String,
        appuntamenti : String,
        PrimaDisponibilitaOra : String,
        ricercadata : String,
        eliminaContattoPersonale : String,
        annullaImpegnativa : String,
        ricezioneDatiPrenotazione : String,
        annullaPrenotazioneSospesa : String,
        spostamentoPrenotazione : String,
        piuReparti : String,
        appuntamentiFuturiEPassati: String,
        comunebycodicecatastale : String,
        annullaImpegnativaWeb : String
    }
});
mongoose.model('strutture', struttureSchema);

module.exports = mongoose.model('strutture');