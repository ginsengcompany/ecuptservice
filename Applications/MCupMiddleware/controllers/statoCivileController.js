let statocivile = require('../models/statocivile');

/*
La funzione restituisce la lista dei possibili stati civili previsti dallo stato
 */
exports.statoCivile = function (req, res) {
    if (statocivile.db._readyState !== 1)
        return res.status(503).send('Il servizio non è momentaneamente disponibile');
    else{
        statocivile.find({}, function (err, stato) {
            if (err) return res.status(503).send('Il servizio non è momentaneamente disponibile');
            let sender = [];
            for (let i=0;i<stato.length;i++){
                sender.push({
                    id: stato[i].ID,
                    descrizione: stato[i].DESCRIZIONE
                });
            }
            res.status(200).send(sender);
        });
    }
};

/*
let express = require('express');

let router = express.Router();
let mongoose = require('mongoose');
let statocivile = require('../models/statocivile');

router.get('/',function (req, res) {
    if (statocivile.db._readyState !== 1)
        return res.status(500).send('Il servizio non è momentaneamente disponibile');
    else{
        statocivile.find({}, function (err, stato) {
            if (err) return res.status(500).send('Il servizio non è momentaneamente disponibile');
            let sender = [];
            for (let i=0;i<stato.length;i++){
                sender.push({
                    id: stato[i].ID,
                    descrizione: stato[i].DESCRIZIONE
                });
            }
            res.status(200).send(sender);
        });
    }
});

module.exports = router;
*/