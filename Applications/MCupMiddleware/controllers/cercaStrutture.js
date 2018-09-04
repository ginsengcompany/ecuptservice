let request = require('request');
let struttura = require('../models/strutture');

let checkPrestazioni = [];
let trovato = true;
let options = null;

struttura.findOne({codice_struttura: req.headers.struttura}, function (err, structure) {
    options = {
        method: 'GET',
        uri: structure.variabili_logicaDati.host + process.argv[2] + '/prestazioni'
    };
});

request(options, function (err, res, req) {
    for (let k = 3; k < process.argv.length; k++) {
        checkPrestazioni[k - 3] = false;
    }
    let parseReq = JSON.parse(req);
    for (let j = 3; j < process.argv.length; j++) {
        for (let i = 0; i < parseReq.response.length; i++) {
            if (process.argv[j].toString() === parseReq.response[i].codprest.toString()) {
                checkPrestazioni[j - 3] = true;
                break;
            }
        }
    }
    for (let t = 0; t < checkPrestazioni.length; t++) {
        if (checkPrestazioni[t] === false) {
            trovato = false;
            break;
        }
    }
    let esitoRicerca = {
        codice_struttura: process.argv[2],
        esito: trovato
    };
    console.log(JSON.stringify(esitoRicerca));
});

