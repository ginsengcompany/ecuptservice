/*
variabile contenente il modello della collection prenotazionitemps per le prenotazioni sospese. questa variabile viene utilizzata per cercare
con la funzione find le prenotazioni sospese
 */
let prenotazioniTemp = require('../models/prenotazionitemp');
/*
variabile contenente il modello della collection prenotazionitemps per le prenotazioni sospese, questa variabile viene utilizzata per eliminare
una prenotazione sospesa se questa non viene confermata dall'utente
 */
let eliminaPren = require('../models/prenotazionitemp');
let moment = require('moment'); //modulo per semplificare la gestione delle date
let request = require('request');
let struttura = require('../models/strutture');
/*
La funzione viene chiamata dal cron EliminaPrenotazioniSospese per cercare le prenotazioni sospese
 */
exports.rimuoviPrenotazioniSospese = function () {
    //Controlla se il database è disponibile per comunicare con la funzione
    if (prenotazioniTemp.db._readyState === -1)
        return console.log("Errore Connessione verso il dabatabase");
    let orarioCorrente = moment(); //crea l'oggetto per la data e orario corrente
    prenotazioniTemp.find({},function (err, prenot) { //cerca le prenotazioni sospese
        if (!prenot)
            return;
        for (let i=0;i<prenot.length;i++){ //tutti i documenti trovati
            /*
            di seguito se prelevano anno, mese, giorno, ore, minuti e secondi della data (String) in cui
            l'utente ha utilizzato la prenotazione sospesa
             */
            let anno = parseInt(prenot[i].orarioUltimaRichiesta.substr(6,4));
            let mese = parseInt(prenot[i].orarioUltimaRichiesta.substr(3,2));
            let giorno = parseInt(prenot[i].orarioUltimaRichiesta.substr(0,2));
            let ore = parseInt(prenot[i].orarioUltimaRichiesta.substr(11,2));
            let minuti = parseInt(prenot[i].orarioUltimaRichiesta.substr(14,2));
            let secondi = parseInt(prenot[i].orarioUltimaRichiesta.substr(17,2));
            mese -= 1; //il mese di gennaio equivale a 0
            let ultimaRichiesta = moment([anno,mese,giorno,ore,minuti,secondi]); //Creiamo l'oggetto moment dell'ultima richiesta effettuata dal client
            /*
            Controlla se tra la data di ultima richiesta e quella corrente sono trascorsi 10 minuti, in tal caso chiama la funzione eliminaPrenotazioneSospesa
            per eliminare la prenotazione sospesa
             */
            if (orarioCorrente.diff(ultimaRichiesta,'minutes') >= 10){
                console.log("Eliminazione prenotazione sospesa presa in carico" + " " + orarioCorrente.diff(ultimaRichiesta));
                eliminaPrenotazioneSospesa(prenot[i]._id);
            }
        }
    });
};

/*
La funzione elimina una prenotazione sospesa attraverso il parametro id che identifica un singolo documento
 */
function eliminaPrenotazioneSospesa(id) {
        eliminaPren.findById({_id: id}, function (err, pren) {
            struttura.findOne({codice_struttura: pren.struttura}, function (err, structure) {
            let options = {
                method: 'POST',
                uri: structure.variabili_logicaDati.host + pren.struttura + '/annullamentoimpegnativa',
                body: {
                    nre: pren.nre,
                    cf: pren.assistito.codice_fiscale
                },
                json: true
                // JSON stringifies the body automatically
            };
            request.post(options, function (err, response, body) {
                if (err) return res.status(504).send("Si è verificato un errore");
                if (!body) return res.status(504).send("I servizi sono momentaneamente indisponibili");
                if (body.code === "200")
                    console.log("La richiesta per rendere di nuovo disponibile l'impegnativa è stata inviata");
                else
                    console.log("La richiesta per rendere di nuovo disponibile l'impegnativa non è stata inviata");
            });
            eliminaPren.remove({_id: id}, function (err) {
                if (!err)
                    console.log("Prenotazione sospesa eliminata con successo");
            });
        });

    });
}

