let utenti = require('../models/utenti'); //Modello della collection utentis, contiene i campi degli utenti registrati al servizio
let moment = require('moment'); //Modulo per semplificare la gestione delle date

/*
La funzione viene chiamata dal cron Disattiva Utenti. Disattiva gli utenti che non effettuano la login da più di 6 mesi
 */
exports.cronDisattivaUtenti = function () {
    if (utenti.db._readyState !== 1) { //Controlla se il database è pronto per la comunicazione
        return console.log('Il servizio non è momentaneamente disponibile');
    }
    else {
        utenti.find({}, function (err, user) {
            let oggi = moment().subtract(6, 'months').format('DD/MM/YYYY'); //Calcola il giorno di 6 mesi dalla data corrente in formato DD/MM/YYYY
            let mese, meseAccesso;
            /*
            Esegue il parse della Stringa in formato DD/MM/YYYY
             */
            if (oggi.charAt(3) === "0")
                mese = parseInt(oggi.charAt(4)) - 1;
            else
                mese = parseInt(oggi.substring(3, 5)) - 1;
            let seiMesi = new Date(oggi.substring(6), mese, oggi.substring(0, 1)); //Crea l'oggetto che si riferisce alla data antecedente di 6 mesi alla data corrente
            let lastAccess;
            for (let i = 0; i < user.length; i++) { //Cicla su tutti gli utenti
                if (user[i].ultimoAccesso.charAt(3) === "0")
                    meseAccesso = parseInt(user[i].ultimoAccesso.charAt(4)) - 1;
                else
                    meseAccesso = parseInt(user[i].ultimoAccesso.substring(3, 5)) - 1;
                lastAccess = new Date(user[i].ultimoAccesso.substring(6), meseAccesso, user[i].ultimoAccesso.substring(0, 1)); //lastAccess contiene la data di ultimo accesso
                /*
                Controlla se la data di ultimo accesso è lontana più di sei mesi e se l'utente è attivo, in tal caso
                disattiva l'utente
                 */
                if (lastAccess < seiMesi && user[i].attivo === true){
                    user[i].attivo = false;
                    user[i].save(function (err, updateUser) {
                        if (err || !updateUser) return console.log("Disattivazione utente non riuscito : " + user[i]._id); //Controlla se c'è stato un errore
                        console.log("utente disattivato : " + updateUser._id);
                    });
                }
            }
        });
    }
};