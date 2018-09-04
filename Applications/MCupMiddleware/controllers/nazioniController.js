let request = require('request');
let moment = require('moment');

exports.getNazioni = function (req, res, next) {
    let options = {
        method: 'GET',
        uri: "http://10.10.13.67:8080/distretti-3.0/rest/nazione/findAll?data=" + moment().format('YYYY-MM-DD'),
        json: true
    };
    request(options,function (err, response, body) {
        if (response.statusCode !== 200 || err) return res.status(504).send("Il servizio non è momentaneamente disponibile");
        if (body.isDati === false)
            return res.status(504).send("Il servizio non è momentaneamente disponibile");
        res.status(200).send(body.elenco);
    });
};