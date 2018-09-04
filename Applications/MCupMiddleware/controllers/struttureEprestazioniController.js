let struttureEprestazioni = require('../models/struttureEprestazioniModel');

exports.getStrutture = function (req, res) {
    if (struttureEprestazioni.db._readyState !== 1)
        return res.status(500).send("Il servizio è momentaneamente non disponibile");
    struttureEprestazioni.find({}, {_id: 0, logo_struttura : 1, nome_struttura : 1, codice_struttura: 1},function (err, strutture) {
        if (err) return res.status(500).send("Errore in comunicazione con la banca dati");
        if (strutture.length === 0) return res.status(404).send("Nessuna struttura trovata");
        res.status(200).send(strutture);
    });
};

exports.getPrestazioniStruttura = function (req, res) {
    if (struttureEprestazioni.db._readyState !== 1)
        return res.status(500).send("Il servizio è momentaneamente non disponibile");
    if (!req.headers.hasOwnProperty('codice_struttura'))
        return res.status(407).send("Parametri non sufficienti");
    struttureEprestazioni.find({},{_id : 0, prestazioni : 1},function (err, prestazioni) {
        if (err) return res.status(500).send("Il servizio è momentaneamente non disponibile");
        if (prestazioni.length === 0) return res.status(404).send("Prestazioni non trovate");
        res.status(200).send(prestazioni);
    });
};

exports.ricercaPrestazioni = function (req, res) {
    if (struttureEprestazioni.db._readyState !== 1)
        return res.status(500).send("Il servizio è momentaneamente non disponibile");
    if (!req.headers.hasOwnProperty('codprest'))
        return res.status(407).send("Parametri insufficienti");
    struttureEprestazioni.find({"prestazioni.codprest": req.headers.codprest},{_id:0, codice_struttura : 1, nome_struttura : 1,prestazioni : {$elemMatch : {codprest : req.headers.codprest}}}, function (err, prestazioni) {
        if (err) return res.status(500).send("Il servizio è momentaneamente non disponibile");
        if (prestazioni.length === 0)
            return res.status(404).send("Prestazioni non trovate");
        let sendObject = [];
        for (let i=0;i< prestazioni.length; i++){
            for (let j=0; j < prestazioni[i].prestazioni.length; j++){
                sendObject.push({
                    codice_struttura : prestazioni[i].codice_struttura,
                    nome_struttura : prestazioni[i].nome_struttura,
                    descrizione : prestazioni[i].prestazioni[j].descrizione,
                    codprest : prestazioni[i].prestazioni[j]._doc.codprest,
                    data : prestazioni[i].prestazioni[j]._doc.data,
                    ora : prestazioni[i].prestazioni[j]._doc.ora,
                    branca : prestazioni[i].prestazioni[j]._doc.branca
                });
            }
        }
        res.status(200).send(sendObject);
    });
};