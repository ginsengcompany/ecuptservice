let terminiServizio = require('../models/terminiServizio');

/*
La funzione restituisce i termini di servizio che l'utente deve accettare in fase di registrazione
 */
exports.terminiServizio = function (req, res) {
    if (terminiServizio.db._readyState !== 1)
        return res.status(503).send('Il servizio non è momentaneamente disponibile');
    else{
        terminiServizio.find({}, function (err, terminiServizio) {
            if (err) return res.status(503).send("Errore nel caricamento dei termini");
            let s = terminiServizio[0]._doc.termini_servizio;
            res.status(200).send(s);
        });
    }
};