//let strutture = require('../models/strutture');
//let exec = require('child_process').execSync;
let request = require('request');
let prenotazionitemp = require('../models/prenotazionitemp');
let jwt = require('jsonwebtoken');
let moment = require('moment');
let utils = require('../utils/util');
let struttura = require('../models/strutture');

exports.controlloPrestazioni = function (req, res) {
    if (!req.headers.hasOwnProperty('struttura') || !req.headers.hasOwnProperty('x-access-token'))
        return res.status(417).send("Accesso negato");
    if (Array.isArray(req.body)) {
        if (req.body.length > 0) {
            let token = req.headers['x-access-token'];
            let prestazioni = [];
            let codiciCatalogo = [];
            for (let i = 0; i < req.body.length; i++) {
                if (!req.body[i].codregionale) {
                    prestazioni.push({
                        codice: {
                            codiceCatalogo: req.body[i].codnazionale,
                            codPrest: 0
                        }
                    });
                    codiciCatalogo.push(req.body[i].codnazionale);
                }
                else {
                    prestazioni.push({
                        codice: {
                            codiceCatalogo: req.body[i].codregionale,
                            codPrest: 0
                        }
                    });
                    codiciCatalogo.push(req.body[i].codregionale);
                }
            }
            struttura.findOne({codice_struttura: req.headers.struttura}, function (err, structure) {
                let options = {
                    method: 'POST',
                    uri: structure.variabili_logicaDati.host + req.headers['struttura'] + '/ricercadisponibilitaprestazioni',
                    body: {
                        prestazioni: prestazioni
                    },
                    json: true
                };

                request(options, function (err, response, body) {
                    if (err) return res.status(504).send("Si è verificato un errore");
                    if (response.statusCode !== 200) return res.status(504).send("Il servizio è momentaneamente indisponibile");
                    if (body.data.length === 0) {
                        for (let j = 0; j < prestazioni.length; j++) {
                            prestazioni[j].desprest = req.body[j].desprest;
                            prestazioni[j].erogabile = false;
                        }
                        return res.status(200).send(prestazioni);
                    }
                    else {
                        let invioEsitoPrestazione = [];
                        let prest_erogabili = [];
                        for (let i = 0; i < body.data.length; i++) {
                            if (body.data[i].prestazioneinternet && body.data[i].agendainternet)
                                prest_erogabili.push(body.data[i]);
                        }
                        if (prest_erogabili.length > 0) {
                            for (let i = 0; i < prest_erogabili.length; i++) {
                                for (let j = 0; j < req.body.length; j++) {
                                    if (codiciCatalogo[j].includes(prest_erogabili[i].codregionale)) {
                                        invioEsitoPrestazione.push({
                                            codnazionale: codiciCatalogo[j],
                                            codregionale: codiciCatalogo[j],
                                            codprest: prest_erogabili[i].codprest,
                                            desprest: prest_erogabili[i].desbprest, //body.data[0].desbprest,
                                            erogabile: true
                                        });
                                        break;
                                    }
                                }
                            }
                        }
                        else {
                            for (let j = 0; j < prestazioni.length; j++) {
                                prestazioni[j].desprest = req.body[j].desprest;
                                prestazioni[j].erogabile = false;
                            }
                            return res.status(200).send(prestazioni);
                        }
                        res.status(200).send(invioEsitoPrestazione);
                    }
                });
            });
        }
    }
    else if (((req.body.hasOwnProperty('codregionale') && req.body.codregionale) || (req.body.hasOwnProperty('codnazionale') && req.body.codnazionale))) {
        let token = req.headers['x-access-token'];
        let prestazioni = [];
        if (!req.body.codregionale)
            prestazioni.push({
                codice: {
                    codiceCatalogo: req.body.codnazionale,
                    codPrest: 0
                }
            });
        else
            prestazioni.push({
                codice: {
                    codiceCatalogo: req.body.codregionale,
                    codPrest: 0
                }
            });
        struttura.findOne({codice_struttura: req.headers.struttura}, function (err, structure) {
            let options = {
                method: 'POST',
                uri: structure.variabili_logicaDati.host + req.headers['struttura'] + '/ricercadisponibilitaprestazioni',
                body: {
                    prestazioni: prestazioni
                },
                json: true
            };

            request(options, function (err, response, body) {
                if (err) return res.status(504).send("Si è verificato un errore");
                if (response.statusCode !== 200) return res.status(504).send("Il servizio è momentaneamente indisponibile");
                if (body.data.length === 0)
                    return res.status(200).send({
                        codnazionale: prestazioni[0].codice.codiceCatalogo,
                        codregionale: prestazioni[0].codice.codiceCatalogo,
                        desprest: req.body.desprest,
                        erogabile: false
                    });
                else {
                    let invioEsitoPrestazione = {};
                    let prest_erogabili = [];
                    let index, min;
                    for (let i = 0; i < body.data.length; i++) {
                        if (body.data[i].prestazioneinternet && body.data[i].agendainternet)
                            prest_erogabili.push(body.data[i]);
                    }
                    if (prest_erogabili.length > 0) {
                        invioEsitoPrestazione = {
                            codnazionale: req.body.codnazionale,
                            codregionale: req.body.codregionale,
                            codprest: prest_erogabili[0].codprest,
                            desprest: prest_erogabili[0].desbprest, //body.data[0].desbprest,
                            erogabile: true
                        };
                    }
                    else {
                        return res.status(200).send({
                            codnazionale: prestazioni[0].codice.codiceCatalogo,
                            codregionale: prestazioni[0].codice.codiceCatalogo,
                            erogabile: false
                        });
                    }
                    res.status(200).send(invioEsitoPrestazione);
                }
            });
        });
    }
    else
        return res.status(417).send("La richiesta non può essere elaborata");
};

/*
exports.controlloPrestazioni = function (req, res) {
    if (req.body.hasOwnProperty('prestazioni') && req.headers.hasOwnProperty('struttura') && req.body.prestazioni && req.headers['struttura'] && req.headers.hasOwnProperty('x-access-token') && req.headers['x-access-token']) {
        let token = req.headers['x-access-token'];
        let prestazioni = req.body.prestazioni;
        let invioEsitoPrestazioni = [];
        request('http://10.10.13.33/cup/service/struttura/' + req.headers['struttura'] + '/prestazioni', function (err, response, req) {
            if (err) return res.status(504).send("Si è verificato un errore");
            if (!req) return res.status(404).send("Il servizio è momentaneamente indisponibile");
            let trovato;
            let parseReq = JSON.parse(req);
            for (let i=0; i < prestazioni.length; i++){
                trovato = false;
                let j;
                for (j=0; j < parseReq.response.length; j++) {
                    if (!prestazioni[i].codregionale){
                        if (prestazioni[i].codnazionale === parseReq.response[j].codnazionale) {
                            trovato = true;
                            break;
                        }
                    }
                    else {
                         if (prestazioni[i].codregionale === parseReq.response[j].codregionale) {
                            trovato = true;
                            break;
                        }
                    }
                }
                if (trovato === true){
                    invioEsitoPrestazioni[i] = {
                        codnazionale : prestazioni[i].codnazionale,
                        codregionale : prestazioni[i].codregionale,
                        codprest : parseReq.response[j].codprest,
                        desprest : parseReq.response[j].desprest,
                        erogabile : trovato
                    };
                }
                else {
                    invioEsitoPrestazioni[i] = {
                        codnazionale : prestazioni[i].codnazionale,
                        codregionale : prestazioni[i].codregionale,
                        desprest : prestazioni[i].desprest,
                        erogabile : trovato
                    };
                }
            }
            jwt.verify(token, utils.access_token, function (err, decoded) {
                if (err) return res.status(401).send('Autenticazione fallita');
                prenotazionitemp.findOne({idUser: decoded.id},function (err, prenotazioni) {
                    if (!err && prenotazioni){
                        prenotazioni.orarioUltimaRichiesta = moment().format("DD/MM/YYYY hh:mm:ss");
                        prenotazioni.save(function (err,pren) {

                        })
                    }
                });
            });
            res.status(200).send(invioEsitoPrestazioni);
        });
    }
    else
        return res.status(417).send("La richiesta non può essere elaborata");
};
*/