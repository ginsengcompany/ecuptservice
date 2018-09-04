let strutture = require('../models/strutture');

/*
La funzione restituisce all'applicazione le rotte dei servizi associati a quella struttura
 */
exports.urlServizi = function (req, res) {
    let codiceStruttura = req.headers['codice_struttura'];
    if (!codiceStruttura) return res.status(417).json({codiceErrore: 'codice struttura non inviato'});
    if (strutture.db._readyState !== 1)
        return res.status(503).json('Il servizio non è momentaneamente disponibile');
    else {
        strutture.findOne({codice_struttura: codiceStruttura}, {_id : 0, url : 1}, function (err, urlServizi) {
            if (err) return res.status(503).json('Il servizio non è momentaneamente disponibile');
            if (!urlServizi) return res.status(404).json('struttura non trovata');
            res.status(200).send(urlServizi.url);
        });
    }
};