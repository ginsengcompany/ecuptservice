let request = require('request');

/*
La funzione restituisce la lista dei comuni di una provincia,
richiede l'invio del codice istat della provincia
 */
exports.listacomuni = function (req, res) {
    if (!req.body.hasOwnProperty('codIstat')) //Controlla se il campo codIstat è presente
        return res.status(400).send('La richiesta non può essere elaborata');
    //opzioni di invio dei dati per ricevere la lista di comuni
    let options = {
        method: 'GET',
        uri: 'http://10.10.13.67:8080/distretti-3.0/rest/comune/findByCodiceIstatProvincia?codiceIstatProvincia=' + req.body.codIstat,
        json : true
    };
    //Effettua la chiamata REST
    request(options,function (err, response, body) {
        if (response.statusCode !== 200 || err) return res.status(504).send("Il servizio non è momentaneamente disponibile");
        if (body.isDati === false)
            return res.status(504).send("Il servizio non è momentaneamente disponibile");
        let listaComuni = [];
        //Crea l'array dei comuni
        for (let i=0;i<body.elenco.length;i++){
            listaComuni.push({
                nome: body.elenco[i].descrizione,
                codice: body.elenco[i].codiceIstat
            })
        }
        res.status(200).send(listaComuni);
    });
};

/*
La funzione restituisce la lista di province
 */
exports.listaprovince = function (req, res) {
    let options = {
        method: 'GET',
        uri: 'http://10.10.13.67:8080/distretti-3.0/rest/combo/province',
        json : true
    };
    request(options,function (err, response, body) {
        if (response.statusCode !== 200 || err) return res.status(504).send("Il servizio non è momentaneamente disponibile");
        if (body.isDati === false)
            return res.status(504).send("Il servizio non è momentaneamente disponibile");
        let listaProvince = [];
        for (let i=0;i<body.elenco.length;i++){
            listaProvince.push({
                provincia: body.elenco[i].label,
                codIstat: body.elenco[i].value
            });
        }
        res.status(200).send(listaProvince);
    });
};

exports.comuneByCodCatastale = function (req, res) {
    if(!req.query.hasOwnProperty('codcatastale'))
        return res.status(417).send('La richiesta non può essere elaborata');
    let options = {
        method: 'GET',
        uri: 'http://10.10.13.67:8080/distretti-3.0/rest/comune/findByCodiceCatastaleNonSoppresso?codiceCatastale=' + req.query.codcatastale,
        json: true
    };
    request(options,function (err, response, body) {
        if (err)
            return res.status(500).send("Il servizio non è momentaneamente disponibile");
        if(!body.isDati)
            return res.status(404).send('comune non trovato');
        let sendObject = {
            provincia: String,
            codIstat: String,
            nome: String,
            codice: String
        };
        sendObject.provincia = body.comune.provinciaDescrizione;
        sendObject.codice = body.comune.sezCodFiscale;
        sendObject.codIstat = body.comune.codiceIstat;
        sendObject.nome = body.comune.descrizione;
        res.status(200).send(sendObject);
    });
};