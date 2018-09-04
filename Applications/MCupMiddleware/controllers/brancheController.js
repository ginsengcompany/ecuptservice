let branca = require('../models/branche');

exports.getBranche = function (req, res) {
    if (branca.db._readyState !== 1)
        return res.status(500).send("Il servizio è momentaneamente non disponibile");
    branca.find({},{_id : 0}, function (err, branche) {
        if (err) return res.status(500).send("Errore in comunicazione con la banca dati");
        if (branche.length === 0)
            return res.status(404).send("Branche non trovate");
        let sendObject = [];
        for(let i=-1; i < branche.length; i++){
            if (i === -1)
                sendObject.push({
                    descrizione : "Nessuna scelta",
                    codice : 0
                });
            else
                sendObject.push(branche[i]);
        }
        res.status(200).send(sendObject);
    })
};