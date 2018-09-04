let request = require('request');
let moment = require('moment');
let jwt = require('jsonwebtoken');
let prenotazionitemp = require('../models/prenotazionitemp'); //file contenente il modello della collection per le prenotazioni sospese
let utils = require('../utils/util');
let struttura = require('../models/strutture');

/*
La funzione restituisce i reparti della struttura che erogano le prestazioni indicate.
Richiede il token di accesso [x-access-token] e il codice struttura [struttura]
 */

exports.ricercadisponibilitaprestazioni = function (req, res) {
    //Controlla che i campi x-access-token e struttura sono presenti
    if (!req.headers.hasOwnProperty('x-access-token') || !req.headers.hasOwnProperty('struttura'))
        return res.status(417).send("Accesso negato");
    if (!req.body.hasOwnProperty('codprest') || (!req.body.hasOwnProperty('codregionale') && !req.body.hasOwnProperty('codnazionale'))) //Controlla che il campo codprest è presente
        return res.status(400).send("La richiesta non può essere elaborata");
    let send = [];
    let data = moment().format("DD/MM/YYYY"); //data corrente
    /*
    body da inviare al sottosistema CUP per ricevere i reparti
     */
    /*send.push({
        codice:{
            codPrest : parseInt(req.body.codprest)
        },
        preferenze:{dataInizio: data}
    });*/
    if (!req.body.codregionale)
        send.push({
            codice: {
                codiceCatalogo: req.body.codnazionale,
                codPrest: 0
            }
        });
    else
        send.push({
            codice: {
                codiceCatalogo: req.body.codregionale,
                codPrest: 0
            }
        });

    let token = req.headers['x-access-token'];
    jwt.verify(token, utils.access_seed, function (err, decoded) { //Verifica e decodifica il token di accesso
        struttura.findOne({codice_struttura: req.headers.struttura}, function (err, structure) {
            let options = {
                method: 'POST',
                uri: structure.variabili_logicaDati.host + req.headers['struttura'] + '/ricercadisponibilitaprestazioni',
                body: {
                    prestazioni: send,
                    tipoPrenotazione: "A"
                },
                json: true
                // JSON stringifies the body automatically
            };
            if (err) return res.status(401).send('Autenticazione del token fallita');
            //Effettua la richiesta REST al sottosistema CUP
            request.post(options, function (err, response, body) {
                if (err) return res.status(504).send("Si è verificato un errore");
                if (response.statusCode !== 200) return res.status(504).send("I servizi sono momentaneamente indisponibili");
                //code 200 è tutto OK
                if (body.code === "200") {
                    let reparti = [];
                    //Inserisce i reparti relativi alla prestazione
                    for (let i = 0; i < body.data.length; i++) {
                        if (body.data[i].prestazioneinternet && body.data[i].agendainternet)
                            reparti.push({
                                unitaOperativa: body.data[i].codunitaop,
                                codReparto: body.data[i].codreparto.toString(),
                                descrizione: body.data[i].desreparto + " " + body.data[i].desbunitaop,
                                nomeStruttura: body.data[i].struttura,
                                dataDisponibile: body.data[i].datadisponibile,
                                codprest: req.body.codprest,
                                desprest: body.data[i].desbprest,
                                latitudine: "",
                                longitudine: ""
                            });
                    }
                    /*
                                reparti.push({
                                    unitaOperativa : "prova",
                                    codReparto : "prova",
                                    descrizione : "prova",
                                    nomeStruttura : "prova",
                                    dataDisponibile : "prova",
                                    codprest : "prova",
                                    latitudine: "41.0874159",
                                    longitudine: "14.3352687"
                                });*/
                    res.status(200).send(reparti);
                }
                else
                    res.status(parseInt(body.code)).send(body.message);
            });
            /*
            Ricerca le prenotazioni sospese attraverso il token di accesso in quanto decodificato
            è l'id dell'utente che è lo stesso id del documento della prenotazione sospesa, nel caso
            in cui viene trovata una prenotazione sospesa questa viene aggiornata
             */
            prenotazionitemp.findOne({idUser: decoded.id}, function (err, prenotazioni) {
                if (!err && prenotazioni) {
                    prenotazioni.orarioUltimaRichiesta = moment().format("DD/MM/YYYY hh:mm:ss"); //Aggiorna data e ora dell'ultima chiamata REST da parte dell'utente
                    prenotazioni.save(function (err, pren) {

                    })
                }
            });
        });
    });
};
