let prestazione = require('../models/prestazioniModelloFittizio');

exports.getprestazioni = function (req, res) {
    if (prestazione.db._readyState !== 1)
        return res.status(500).send("Il servizio è momentaneamente non disponibile");
    prestazione.find({},{_id : 0},function (err,prestazioni) {
        if (err) return res.status(500).send("Errore in comunicazione con la banca dati");
        if (!prestazioni) res.status(404).send("Nessuna prestazione trovata");
        res.status(200).send(prestazioni);
    });
};

exports.getprestazioniBranca = function (req, res) {
    if (prestazione.db._readyState !== 1)
        return res.status(500).send("Il servizio è momentaneamente non disponibile");
    if (!req.headers.hasOwnProperty('branca'))
        return res.status(407).send("Parametri insufficienti");
    prestazione.find({branca : req.headers.branca},{_id : 0},function (err, prestazioni) {
        if (err) return res.status(500).send("Errore in comunicazione con la banca dati");
        if (prestazioni.length === 0)
            return res.status(404).send("Nessuna prestazione trovata");
        res.status(200).send(prestazioni);
    });
};