let request = require('request');
let moment = require('moment');
let jwt = require('jsonwebtoken');
let prenotazionitemp = require('../models/prenotazionitemp');
let utils = require('../utils/util');
let struttura = require('../models/strutture');

let optionsDate = ['DD/MM/YYYY', 'DD/MM/YY', 'D/MM/YYYY', 'D/MM/YY', 'DD/M/YYYY', 'DD/M/YY', 'D/M/YYYY', 'D/M/YY', 'DD-MM-YYYY', 'DD-MM-YY', 'D-MM-YYYY', 'D-MM-YY', 'DD-M-YYYY', 'DD-M-YY', 'D-M-YYYY', 'D-M-YY'];
/*
La funzione restituisce la prima disponibilità delle prestazioni inviate con i reparti scelti,
richiede il token di accesso
 */
exports.primaDisponibilita = function (req, res) {
    if (prenotazionitemp.db._readyState !== 1)
        return res.status(503).send('Il servizio non è momentaneamente disponibile');
    if (!req.headers.hasOwnProperty('x-access-token')) //Controlla se il campo x-access-token è presente
        return res.status(417).send("Accesso non autorizzato");
    if (!req.headers.hasOwnProperty('struttura') || !Array.isArray(req.body)) //Controlla se il campo struttura è presente e se il body è un array
        return res.status(417).send("La richiesta non può essere elaborata");
    for (let i = 0; i < req.body.length; i++) { //Cicla su tutte le prestazioni
        /*
        Controlla se sono presenti i campi reparti, codprest
         */
        if (!req.body[i].hasOwnProperty('reparti') || !req.body[i].hasOwnProperty('codprest') || !Array.isArray(req.body[i].reparti))
            return res.status(417).send("La richiesta non può essere elaborata");
        for (let j = 0; j < req.body[i].reparti.length; j++) { //Controlla se ci sono i campi unitaOperativa e codReparto
            if (!req.body[i].reparti[j].hasOwnProperty('unitaOperativa') || !req.body[i].reparti[j].hasOwnProperty('codReparto'))
                return res.status(417).send("La richiesta non può essere elaborata");
        }
    }
    let arrayPrestazioni = [];
    /*
    Crea il body da inviare al sottosistema CUP
     */
    for (let i = 0; i < req.body.length; i++) {
        for (let t = 0; t < req.body[i].reparti.length; t++) {
            if (req.body[i].reparti[t].repartoScelto === true) {
                arrayPrestazioni.push({
                    codice: {codPrest: req.body[i].codprest, codReg: "", codprestazione: ""},
                    codUnitaOp: req.body[i].reparti[t].unitaOperativa,
                    codReparto: parseInt(req.body[i].reparti[t].codReparto),
                    codSala: 0,
                    sedute: 0,
                    frequenza: 0
                });
                break;
            }
        }
    }
    if (arrayPrestazioni.length !== 0) {
        struttura.findOne({codice_struttura: req.headers.struttura}, function (err, structure) {
            let data = moment().format("DD/MM/YYYY"); //data corrente
            let options = {
                method: 'POST',
                timeout: 180000,
                uri: structure.variabili_logicaDati.host + req.headers.struttura + '/primadisponibilita',
                body: {
                    prestazioni: arrayPrestazioni,
                    preferenze: {dataInizio: data, orarioInizio: ""},
                    tipoPrenotazione: "A"
                },
                json: true
            };
            let token = req.headers['x-access-token'];
            jwt.verify(token, utils.access_seed, function (err, decoded) { //Verifica e decodifica il token di accesso
                if (err) return res.status(401).send("Accesso negato");
                /*
                Effettua la chiamata al sottosistema CUP
                */
                request(options, function (err, response, body) {
                    if (err) {
                        if (err.code === "ESOCKETTIMEDOUT") return res.status(408).send("Il servizio non è momentaneamente disponibile");
                        return res.status(504).send("Errore nella ricerca delle disponibilita");
                    }
                    if (response.statusCode !== 200) return res.status(404).send("Unità non disponibili");
                    let sender = [], esami = [], j;
                    /*
                    Controlla se ci sono esami non disponibili, in tal caso imposta il campo disponibile a false
                     */
                    for (j = 0; j < body.data.primadisponibilita.esamiNonDisp.length; j++) {
                        esami.push({
                            codprest: body.data.primadisponibilita.esamiNonDisp[j].esamiNonDisp.esame.codPrest.toString(),
                            desprest: body.data.primadisponibilita.esamiNonDisp[j].esamiNonDisp.esame.desPrest,
                            durata: "",
                            reparti: [],
                            dataAppuntamento: "",
                            oraAppuntamento: "",
                            posizione: "",
                            disponibile: false
                        });
                    }
                    let k;
                    /*
                    Questo doppio ciclo itera sui reparti delle prestazioni e salva l'indice di quello selezionato in precedenza
                    in modo da inviare al richiedente un singolo reparto per le prossime chiamate al servizio (anche se è singolo
                    viene comunque trattato come array)
                     */
                    for (j = 0; j < body.data.primadisponibilita.proposte.length; j++) {
                        let index;
                        for (k = 0; k < req.body.length; k++) {
                            if (req.body[k].codprest.toString() === body.data.primadisponibilita.proposte[j].proposta.esameProposta.esame.codPrest.toString()) {
                                for (let c = 0; c < req.body[k].reparti.length; c++) {
                                    if (req.body[k].reparti[c].repartoScelto === true) {
                                        index = c;
                                        break;
                                    }
                                }
                                break;
                            }
                        }
                        let data;
                        data = moment(body.data.primadisponibilita.proposte[j].proposta.disponibilita.dataAgenda, optionsDate, true).format('DD/MM/YYYY');
                        if (data === "Invalid date")
                            return res.status(502).send("Il servizio non è disponibile");
                        esami.push({
                            codprest: body.data.primadisponibilita.proposte[j].proposta.esameProposta.esame.codPrest.toString(),
                            desprest: body.data.primadisponibilita.proposte[j].proposta.esameProposta.esame.desPrest,//req.body[k].desprest,
                            durata: body.data.primadisponibilita.proposte[j].proposta.esameProposta.esame.durata.toString(),
                            dataAppuntamento: data,
                            oraAppuntamento: body.data.primadisponibilita.proposte[j].proposta.disponibilita.oraAppuntamento,
                            posizione: body.data.primadisponibilita.proposte[j].proposta.disponibilita.posto.toString(),
                            nota: body.data.primadisponibilita.proposte[j].proposta.esameProposta.esame.nota,
                            disponibile: true,
                            reparti: [{
                                codReparto: req.body[k].reparti[index].codReparto,
                                unitaOperativa: req.body[k].reparti[index].unitaOperativa,
                                descrizione: body.data.primadisponibilita.proposte[j].proposta.disponibilita.desReparto,
                                desunitaop: body.data.primadisponibilita.proposte[j].proposta.disponibilita.desBUnitaOp,
                                orarioApertura: body.data.primadisponibilita.proposte[j].proposta.disponibilita.dalleOre,
                                orarioChiusura: body.data.primadisponibilita.proposte[j].proposta.disponibilita.alleOre,
                                nomeStruttura: req.body[k].reparti[index].nomeStruttura,
                                nomeMedico: body.data.primadisponibilita.proposte[j].proposta.disponibilita.nomeMedico,
                                ubicazioneReparto: body.data.primadisponibilita.proposte[j].proposta.disponibilita.ubicazioneReparto,
                                ubicazioneUnita: body.data.primadisponibilita.proposte[j].proposta.disponibilita.ubicazioneUnita,
                                repartoScelto: true,
                                latitudine: req.body[k].reparti[index].latitudine,
                                longitudine: req.body[k].reparti[index].longitudine
                            }]
                        });
                    }
                    sender = {
                        appuntamenti: esami,
                        termid: body.data.primadisponibilita.termid
                    };
                    res.status(200).send(sender);
                    /*
                    Ricerca la prenotazione sospesa relativa a quella corrente e aggiorna il documento
                     */
                    prenotazionitemp.findOne({idUser: decoded.id}, function (err, prenotazioni) {
                        if (!err && prenotazioni) {
                            prenotazioni.orarioUltimaRichiesta = moment().format("DD/MM/YYYY hh:mm:ss"); //Aggiorna l'orario di ultima richiesta
                            prenotazioni.termid = body.data.primadisponibilita.termid; //Aggiorna il termid della prenotazione sospesa
                            prenotazioni.save(function (err, pren) {

                            })
                        }
                    });
                });
            });
        });
    }
    else {
        res.status(417).send("Errore in ricezione dei dati");
    }
};

/*
Questa funzione viene Chiamata in un secondo momento, ovvero dopo la funzione primaDisponibilita se l'utente la richiede.
La funzione restituisce la prima disponibilità successiva a quella corrente,
richiede il token di accesso
 */
exports.primaDsiponibilitaOrario = function (req, res, next) {
    if (!req.headers.hasOwnProperty('x-access-token')) //Controlla se il campo x-access-token è presente
        return res.status(400).send("Accesso non autorizzato");
    //Controlla se il campo struttura è presente e se appuntamenti è un array
    if (!req.headers.hasOwnProperty('struttura') || !Array.isArray(req.body.appuntamenti))
        return res.status(400).send("La richiesta non può essere elaborata");
    /*
    Controlla se sono presenti tutti i campi necessari per continuare
     */
    for (let i = 0; i < req.body.length; i++) {
        if (!req.body.appuntamenti[i].hasOwnProperty('reparti') || !req.body.appuntamenti[i].hasOwnProperty('codprest') || !Array.isArray(req.body.appuntamenti[i].reparti))
            return res.status(400).send("La richiesta non può essere elaborata");
        for (let j = 0; j < req.body.appuntamenti[i].reparti.length; j++) {
            if (!req.body.appuntamenti[i].reparti[j].hasOwnProperty('unitaOperativa') || !req.body.appuntamenti[i].reparti[j].hasOwnProperty('codReparto') ||
                !req.body.appuntamenti[i].reparti[j].hasOwnProperty('repartoScelto') || !req.body.appuntamenti[i].hasOwnProperty('dataAppuntamento') || !req.body.appuntamenti[i].hasOwnProperty('codprest'))
                return res.status(400).send("La richiesta non può essere elaborata");
        }
    }
    /*
    Preleva le informazioni ricevute e le incorpora nel body della chiamata REST
    al servizio del sottosistema CUP
     */
    let arrayPrestazioni = [];
    for (let i = 0; i < req.body.appuntamenti.length; i++) {
        //Identifica il reparto scelto relativo ad una prestazione
        if (req.body.appuntamenti[i].reparti[0].repartoScelto === true) {
            arrayPrestazioni.push({
                codice: {codPrest: req.body.appuntamenti[i].codprest, codReg: "", codprestazione: ""},
                codUnitaOp: req.body.appuntamenti[i].reparti[0].unitaOperativa,
                codReparto: parseInt(req.body.appuntamenti[i].reparti[0].codReparto),
                codSala: 0,
                sedute: 0,
                frequenza: 0
            });
        }
    }
    /*
    Se ci sono delle prestazioni
     */
    if (arrayPrestazioni.length !== 0) {
        /*
        Crea il body da inserire nella chiamata REST del sottosistema CUP,
        effettuando anke la formattazione delle date degli appuntamenti proposti in modo da inserire come
        data preferenziale la data più vicina alla data corrente tra quelle proposte in precedenza
        */

        let mese, minData, minIndex = 0;
        if (req.body.appuntamenti[0].dataAppuntamento.charAt(3) === "0")
            mese = parseInt(req.body.appuntamenti[0].dataAppuntamento.charAt(4)) - 1;
        else
            mese = parseInt(req.body.appuntamenti[0].dataAppuntamento.substring(3, 5)) - 1;
        minData = new Date(req.body.appuntamenti[0].dataAppuntamento.substring(6), mese, req.body.appuntamenti[0].dataAppuntamento.substring(0, 1));
        for (let i = 1; i < req.body.appuntamenti.length; i++) {
            if (req.body.appuntamenti[i].dataAppuntamento.charAt(3) === "0")
                mese = parseInt(req.body.appuntamenti[i].dataAppuntamento.charAt(4)) - 1;
            else
                mese = parseInt(req.body.appuntamenti[i].dataAppuntamento.substring(3, 5)) - 1;
            let data = new Date(req.body.appuntamenti[i].dataAppuntamento.substring(6), mese, req.body.appuntamenti[i].dataAppuntamento.substring(0, 1));
            if (data.getTime() < minData.getTime()) {
                minIndex = i;
                minData = data;
            }
        }
        let dataRicerca = moment(req.body.appuntamenti[minIndex].dataAppuntamento, ['DD/MM/YYYY', 'MM/DD/YYYY', 'DD-MM-YYYY', 'MM-DD-YYYY'], true).format('DD/MM/YYYY');
        if (dataRicerca === "Invalid date")
            return res.status(400).send("Il formato della data di ricerca è errato");
        let orarioRicerca = moment(req.body.appuntamenti[minIndex].oraAppuntamento, ['HH:mm', 'HHmm'], true).format('HH:mm');
        if (orarioRicerca === "Invalid date")
            return res.status(400).send("Il formato dell'orario di ricerca è errato");
        //Opzioni REST

        let token = req.headers['x-access-token'];
        jwt.verify(token, utils.access_seed, function (err, decoded) { //Verifica e decodifica il token di accesso
            struttura.findOne({codice_struttura: req.headers.struttura}, function (err, structure) {

                if (err) return res.status(401).send("Accesso negato");
                /*
                Effettua la chiamata REST
                */

                let options = {
                    method: 'POST',
                    uri: structure.variabili_logicaDati.host + req.headers.struttura + '/primadisponibilita',
                    timeout: 180000,
                    body: {
                        prestazioni: arrayPrestazioni,
                        preferenze: {dataInizio: dataRicerca, orarioInizio: orarioRicerca},
                        tipoPrenotazione: "A"
                    },
                    json: true
                };

                request(options, function (err, response, body) {
                    if (err) {
                        if (err.code === "ESOCKETTIMEDOUT") return res.status(408).send("Il servizio non è momentaneamente disponibile");
                        return res.status(504).send("Errore nella ricerca delle disponibilita");
                    }
                    if (response.statusCode !== 200) return res.status(504).send("Unità non disponibili");
                    let sender = [], esami = [], j;
                    /*
                    Controlla se ci sono esami non disponibili, in tal caso imposta il campo disponibile a false
                     */
                    for (j = 0; j < body.data.primadisponibilita.esamiNonDisp.length; j++) {
                        esami.push({
                            codprest: body.data.primadisponibilita.esamiNonDisp[j].esamiNonDisp.esame.codPrest.toString(),
                            desprest: body.data.primadisponibilita.esamiNonDisp[j].esamiNonDisp.esame.desPrest,
                            durata: "",
                            reparti: [],
                            dataAppuntamento: "",
                            oraAppuntamento: "",
                            posizione: "",
                            disponibile: false
                        });
                    }
                    let k;
                    /*
                    Crea l'oggetto da restituire al richiedente, il doppio ciclo permette di inviare al richiedente solo il reparto scelto
                    nel caso in cui ci siano più reparti
                     */
                    for (j = 0; j < body.data.primadisponibilita.proposte.length; j++) {
                        let index;
                        for (k = 0; k < req.body.appuntamenti.length; k++) {
                            if (req.body.appuntamenti[k].codprest.toString() === body.data.primadisponibilita.proposte[j].proposta.esameProposta.esame.codPrest.toString()) {
                                for (let c = 0; c < req.body.appuntamenti[k].reparti.length; c++) {
                                    if (req.body.appuntamenti[k].reparti[c].repartoScelto === true) {
                                        index = c;
                                        break;
                                    }
                                }
                                break;
                            }
                        }
                        let data;
                        data = moment(body.data.primadisponibilita.proposte[j].proposta.disponibilita.dataAgenda, optionsDate, true).format('DD/MM/YYYY');
                        if (data === "Invalid date")
                            return res.status(502).send("Il servizio non è disponibile");
                        esami.push({
                            codprest: body.data.primadisponibilita.proposte[j].proposta.esameProposta.esame.codPrest.toString(),
                            desprest: req.body.appuntamenti[k].desprest, //body.data.primadisponibilita.proposte[j].proposta.esameProposta.esame.desPrest,
                            durata: body.data.primadisponibilita.proposte[j].proposta.esameProposta.esame.durata.toString(),
                            dataAppuntamento: data,
                            oraAppuntamento: body.data.primadisponibilita.proposte[j].proposta.disponibilita.oraAppuntamento,
                            posizione: body.data.primadisponibilita.proposte[j].proposta.disponibilita.posto.toString(),
                            nota: body.data.primadisponibilita.proposte[j].proposta.esameProposta.esame.nota,
                            disponibile: true,
                            reparti: [{
                                codReparto: req.body.appuntamenti[k].reparti[index].codReparto,
                                unitaOperativa: req.body.appuntamenti[k].reparti[index].unitaOperativa,
                                desunitaop: body.data.primadisponibilita.proposte[j].proposta.disponibilita.desBUnitaOp,
                                descrizione: body.data.primadisponibilita.proposte[j].proposta.disponibilita.desReparto,
                                orarioApertura: body.data.primadisponibilita.proposte[j].proposta.disponibilita.dalleOre,
                                orarioChiusura: body.data.primadisponibilita.proposte[j].proposta.disponibilita.alleOre,
                                nomeStruttura: req.body.appuntamenti[k].reparti[index].nomeStruttura,
                                nomeMedico: body.data.primadisponibilita.proposte[j].proposta.disponibilita.nomeMedico,
                                ubicazioneReparto: body.data.primadisponibilita.proposte[j].proposta.disponibilita.ubicazioneReparto,
                                ubicazioneUnita: body.data.primadisponibilita.proposte[j].proposta.disponibilita.ubicazioneUnita,
                                repartoScelto: true,
                                latitudine: req.body.appuntamenti[k].reparti[index].latitudine,
                                longitudine: req.body.appuntamenti[k].reparti[index].longitudine
                            }]
                        });
                    }
                    sender = {
                        appuntamenti: esami,
                        termid: body.data.primadisponibilita.termid
                    };
                    /*
                Aggiorna la prenotazione sospesa
                 */
                    prenotazionitemp.findOne({idUser: decoded.id}, function (err, prenotazioni) {
                        if (!err && prenotazioni) {
                            prenotazioni.orarioUltimaRichiesta = moment().format("DD/MM/YYYY hh:mm:ss");
                            prenotazioni.termid = body.data.primadisponibilita.termid;
                            prenotazioni.save(function (err, pren) {

                            })
                        }
                    });
                    res.status(200).send(sender);
                });
            });
        });
    }
    else {
        res.status(400).send("Errore in ricezione dei dati");
    }
};

/*
Questa funzione viene Chiamata in un secondo momento, ovvero dopo la funzione primaDisponibilita se l'utente la richiede.
A differenza di quella precedente l'utente invia una data di preferenza (inviata come header della richiesta
nel campo dataRicerca) per la ricerca degli appuntamenti disponibili.
La funzione restituisce la prima disponibilità a partire da una certa data inviata dall'utente,
richiede il token di accesso
 */
exports.primaDisponibilitaData = function (req, res, next) {
    if (!req.headers.hasOwnProperty('x-access-token')) //Controlla se il campo x-access-token è presente
        return res.status(400).send("Accesso non autorizzato");
    /*
    Controlla la presenza di tutti i campi necessari per continuare l'operazione
     */
    if (!req.headers.hasOwnProperty('struttura') || !Array.isArray(req.body.appuntamenti) || !req.headers.hasOwnProperty('dataricerca'))
        return res.status(400).send("La richiesta non può essere elaborata");
    for (let i = 0; i < req.body.length; i++) {
        if (!req.body.appuntamenti[i].hasOwnProperty('reparti') || !req.body.appuntamenti[i].hasOwnProperty('codprest') || !Array.isArray(req.body.appuntamenti[i].reparti))
            return res.status(400).send("La richiesta non può essere elaborata");
        for (let j = 0; j < req.body.appuntamenti[i].reparti.length; j++) {
            if (!req.body.appuntamenti[i].reparti[j].hasOwnProperty('unitaOperativa') || !req.body.appuntamenti[i].reparti[j].hasOwnProperty('codReparto') ||
                !req.body.appuntamenti[i].reparti[j].hasOwnProperty('repartoScelto') || !req.body.appuntamenti[i].hasOwnProperty('dataAppuntamento') || !req.body.appuntamenti[i].hasOwnProperty('codprest'))
                return res.status(400).send("La richiesta non può essere elaborata");
        }
    }
    let arrayPrestazioni = [];
    /*
    Crea l'oggetto da inserire nel body della chiamata REST
     */
    for (let i = 0; i < req.body.appuntamenti.length; i++) {
        arrayPrestazioni.push({
            codice: {codPrest: req.body.appuntamenti[i].codprest, codReg: "", codprestazione: ""},
            codUnitaOp: req.body.appuntamenti[i].reparti[0].unitaOperativa,
            codReparto: parseInt(req.body.appuntamenti[i].reparti[0].codReparto),
            codSala: 0,
            sedute: 0,
            frequenza: 0
        });
    }
    if (arrayPrestazioni.length === 0 && !req.headers['dataRicerca'])
        return res.status(400).send("Errore in ricezione dei dati");
    let token = req.headers['x-access-token'];
    let dataRicerca = moment(req.headers['dataricerca'], ['DD/MM/YYYY', 'MM/DD/YYYY', 'DD-MM-YYYY', 'MM-DD-YYYY'], true).format('DD/MM/YYYY');
    if (dataRicerca === "Invalid date")
        return res.status(400).send("Il formato della data di ricerca è errato");
    jwt.verify(token, utils.access_seed, function (err, decoded) { //Verifica e decodifica il token di accesso
        if (err)
            return res.status(401).send("Accesso negato");

        struttura.findOne({codice_struttura: req.headers.struttura}, function (err, structure) {
            //Opzioni della chiamata REST
            let options = {
                method: 'POST',
                uri: structure.variabili_logicaDati.host + req.headers.struttura + '/primadisponibilita',
                timeout: 180000,
                body: {
                    prestazioni: arrayPrestazioni,
                    preferenze: {dataInizio: dataRicerca, orarioInizio: ""},
                    tipoPrenotazione: "A"
                },
                json: true
            };
            /*
            Effettua la richiesta REST al sottosistema CUP
             */
            request(options, function (err, response, body) {
                if (err) {
                    if (err.code === "ESOCKETTIMEDOUT") return res.status(408).send("Il servizio non è momentaneamente disponibile");
                    return res.status(504).send("Errore nella ricerca delle disponibilita");
                }
                if (response.statusCode !== 200) return res.status(504).send("Unita' non disponibili");
                let sender = [], esami = [], j;
                /*
                Controlla se ci sono esami non disponibili, in tal caso imposta il campo disponibile a false
                 */
                for (j = 0; j < body.data.primadisponibilita.esamiNonDisp.length; j++) {
                    esami.push({
                        codprest: body.data.primadisponibilita.esamiNonDisp[j].esamiNonDisp.esame.codPrest.toString(),
                        desprest: body.data.primadisponibilita.esamiNonDisp[j].esamiNonDisp.esame.desPrest,
                        durata: "",
                        reparti: [],
                        dataAppuntamento: "",
                        oraAppuntamento: "",
                        posizione: "",
                        disponibile: false
                    });
                }
                let k;
                /*
                Crea l'oggetto da restituire al richiedente, il doppio ciclo permette di inviare al richiedente solo il reparto scelto
                nel caso in cui ci siano più reparti
                */
                for (j = 0; j < body.data.primadisponibilita.proposte.length; j++) {
                    let index;
                    for (k = 0; k < req.body.appuntamenti.length; k++) {
                        if (req.body.appuntamenti[k].codprest.toString() === body.data.primadisponibilita.proposte[j].proposta.esameProposta.esame.codPrest.toString()) {
                            for (let c = 0; c < req.body.appuntamenti[k].reparti.length; c++) {
                                if (req.body.appuntamenti[k].reparti[c].repartoScelto === true) {
                                    index = c;
                                    break;
                                }
                            }
                            break;
                        }
                    }
                    let data;
                    data = moment(body.data.primadisponibilita.proposte[j].proposta.disponibilita.dataAgenda, optionsDate, true).format('DD/MM/YYYY');
                    if (data === "Invalid date")
                        return res.status(502).send("Il servizio non è disponibile");
                    esami.push({
                        codprest: body.data.primadisponibilita.proposte[j].proposta.esameProposta.esame.codPrest.toString(),
                        desprest: req.body.appuntamenti[k].desprest, //body.data.primadisponibilita.proposte[j].proposta.esameProposta.esame.desPrest,
                        durata: body.data.primadisponibilita.proposte[j].proposta.esameProposta.esame.durata.toString(),
                        dataAppuntamento: data,
                        oraAppuntamento: body.data.primadisponibilita.proposte[j].proposta.disponibilita.oraAppuntamento,
                        posizione: body.data.primadisponibilita.proposte[j].proposta.disponibilita.posto.toString(),
                        nota: body.data.primadisponibilita.proposte[j].proposta.esameProposta.esame.nota,
                        disponibile: true,
                        reparti: [{
                            codReparto: req.body.appuntamenti[k].reparti[index].codReparto,
                            unitaOperativa: req.body.appuntamenti[k].reparti[index].unitaOperativa,
                            descrizione: body.data.primadisponibilita.proposte[j].proposta.disponibilita.desReparto,
                            desunitaop: body.data.primadisponibilita.proposte[j].proposta.disponibilita.desBUnitaOp,
                            orarioApertura: body.data.primadisponibilita.proposte[j].proposta.disponibilita.dalleOre,
                            orarioChiusura: body.data.primadisponibilita.proposte[j].proposta.disponibilita.alleOre,
                            nomeStruttura: req.body.appuntamenti[k].reparti[index].nomeStruttura,
                            nomeMedico: body.data.primadisponibilita.proposte[j].proposta.disponibilita.nomeMedico,
                            ubicazioneReparto: body.data.primadisponibilita.proposte[j].proposta.disponibilita.ubicazioneReparto,
                            ubicazioneUnita: body.data.primadisponibilita.proposte[j].proposta.disponibilita.ubicazioneUnita,
                            repartoScelto: true,
                            latitudine: req.body.appuntamenti[k].reparti[index].latitudine,
                            longitudine: req.body.appuntamenti[k].reparti[index].longitudine
                        }]
                    });
                }
                sender = {
                    appuntamenti: esami,
                    termid: body.data.primadisponibilita.termid
                };
                /*
            Aggiorna la prenotazione sospesa
             */
                prenotazionitemp.findOne({idUser: decoded.id}, function (err, prenotazioni) {
                    if (!err && prenotazioni) {
                        prenotazioni.orarioUltimaRichiesta = moment().format("DD/MM/YYYY hh:mm:ss");
                        prenotazioni.termid = body.data.primadisponibilita.termid;
                        prenotazioni.save(function (err, pren) {

                        })
                    }
                });
                res.status(200).send(sender);
            });
        });
    });
};

/*
router.post('/prossimadatadisponibile',function (req, res) {
    proxData(req.body.codprest,req.body.reparti.unitaOperativa,req.body.reparti.codReparto,req.body.data_inizio,req.body.struttura,req.body.reparti.nomeStruttura).then(function (risposta) {
        if (risposta.stato === 200)
            res.status(risposta.stato).send(risposta.dati);
        else
            res.status(risposta.stato).send(risposta.dati.messaggio);
    });
});
*/