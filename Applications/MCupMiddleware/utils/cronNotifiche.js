let utenti = require('../models/utenti'); //Modello della collection utentis, contiene i campi degli utenti registrati al servizio
let https = require('https'); //modulo per il protocollo HTTPS
let moment = require('moment'); //Modulo per semplificare la gestione delle date
let request = require('request');
let strutture = require('../models/strutture');
/*
messaggio è l'oggetto che conterrà le info per inviare le notifiche agli utenti utilizzando le api di one signal.
app_id: è l'identificatore dell'applicazione
headings: è il titolo del messaggio
contents: è il corpo del messaggio
include_player_ids: è un array che conterrà i token per identificare gli utenti a cui sarà inviata una notifica
 */
let messaggio = {
    app_id: "821d395a-09ed-48a4-81b8-4a79971452eb",
    headings: {en: "Reminder", it: "Promemoria"},
    contents: {en: "", it: ""},
    include_player_ids: [],
    ios_sound: "onesignal_default_sound.wav"
};


function prelevaStrutture(assistito, token) {
    let oggi = moment().format("DD/MM/YYYY"); //Stringa contenente la data corrente
    strutture.find({}, function (err, struttura) {
        if (err || !struttura) return console.info("Errore durante il find della collection strutture");
        for (let p = 0; p < struttura.length; p++) {
            let options = {
                method: 'POST',
                uri: struttura[p].variabili_logicaDati.host + struttura[p].codice_struttura + '/listaappuntamenti',
                body: {
                    cf: assistito.codice_fiscale
                },
                json: true
            };
            request(options, function (err, response, body) {
            	if (err || !body) return console.info("Errore nella richiesta degli appuntamenti per il cron notifiche");
                if (body.data.appuntamenti.length === 0) return console.info("Non sono stati trovati appuntamenti per " + assistito.codice_fiscale);
                for (let q = 0; q < body.data.appuntamenti.length; q++) {
                    /*
                        Di seguito si calcolano il giorno prima dell'appuntamento e 5 giorni dopo l'appuntamento. dataAppuntamento è la data dell'appuntamento
                    */
                    let dataAppuntamentoMenoCinque = moment(body.data.appuntamenti[q].dataappuntamento, "DD/MM/YYYY").subtract(5, 'days').format("DD/MM/YYYY");
                    let dataAppuntamentoMenoUno = moment(body.data.appuntamenti[q].dataappuntamento, "DD/MM/YYYY").subtract(1, 'days').format("DD/MM/YYYY");
                    if ((oggi === dataAppuntamentoMenoCinque || oggi === dataAppuntamentoMenoUno)) {
                        messaggio.include_player_ids = [];
                        messaggio.contents.it = "Ti ricordiamo che hai prenotato un appuntamento per il giorno " + body.data.appuntamenti[q].dataappuntamento + " per " + assistito.cognome + " " + assistito.nome;
                        messaggio.contents.en = "We remind you that you have booked an appointment for the day " + body.data.appuntamenti[q].dataappuntamento + " for " + assistito.cognome + " " + assistito.nome;
                        invioNotifiche(token);
                    }
                }
            });
        }
    });
}

/*
La funzione viene chiamata dal cron Invia Notifiche per cercare gli utenti che hanno appuntamenti il giorno dopo o cinque giorni dopo
la data corrente
 */
exports.elaboraNotifiche = function () {
    if (utenti.db._readyState !== 1) //Controlla se il database è pronto per la comunicazione
        return console.log('Il servizio non è momentaneamente disponibile');
    else {
        utenti.find({}, function (err, user) {
            if (err) return console.log('Errore Find'); //errore della funzione find
            if (!user) return console.log('Non ci sono utenti registrati al servizio');
            for (let j = 0; j < user.length; j++) { //tutti i documenti
                /*
                Controlla se l'utente ha il campo tokenNotifiche non vuoto (Questo può essere vuoto quando l'utente ha effettuato il logout dal dispositivo)
                 */
                if (user[j].tokenNotifiche !== '') {
                    let token = user[j].tokenNotifiche;
                    for (let i = -1; i < user[j].contatti.length; i++) {
                        if (i === -1) {
                            prelevaStrutture(user[j], token);
                        }
                        else {
                            prelevaStrutture(user[j].contatti[i], token);
                        }
                    }
                }
            }
        });
    }
};

/*
La funzione invia le notifiche al device identificato dal token passato come argomento della chiamata della funzione
 */
function invioNotifiche(token) {
    messaggio.include_player_ids.push(token); //inserisce il token nell'array dei dispositivi
    /*
    variabile contenente gli headers da inviare in una POST al servizio di notifiche di one signal
     */
    let headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": "Basic NzQ2MjkzMzgtNmQwYy00Y2NkLTk2OTgtODdiM2YxZTY0ZDYz"
    };

    /*
    opzioni per la chiamata REST
     */
    let options = {
        host: "onesignal.com",
        port: 443,
        path: "/api/v1/notifications",
        method: "POST",
        headers: headers
    };

    /*
    Richiesta di invio di una notifica, la richiesta restituisce l'identificativo del messaggio
     */
    let req = https.request(options, function (res) {
        res.on('data', function (data) {
            console.log("Risposta: ");
            console.log(JSON.parse(data));
        });
    });

    /*
    Callback che cattura l'evento error della chiamata REST
     */
    req.on('error', function (e) {
        console.log("Errore: ");
        console.log(e);
    });

    /*
    Invia al servizio di notifiche di one signal il messaggio e i destinatari di quest'ultimo
     */
    req.write(JSON.stringify(messaggio));
    req.end();
}
