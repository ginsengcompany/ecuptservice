let struttura = require('../models/strutture');
let jwt = require('jsonwebtoken');
let moment = require('moment');
let request = require('request');
let utils = require('../utils/util');
let nodemailer = require('nodemailer');

/**
 * La funzione restituisce le informazioni (metadati, tipo file, tipo referto, id referto, ecc...) di un paziente.
 * Questa funzione invia al sottosistema CUP il codice fiscale del paziente ricevendo come ritorno tutti i dati di interesse per accedere al file dei referti
 * associati a quel paziente ovvero a quel codice fiscale, qualora presenti in quella struttura.
 * Si ricorda che in caso di assenza di referti la funzione restituisce un array vuoto
 * Richiede il token di accesso, il codice della struttura, il codice fiscale nell'header per poter avere le informazioni di interesse
 **/

exports.prelevaRefertiUtente = function (req, res) {
    //Controlla se sono presenti i campi struttura e x-access-token
    if (!req.headers.hasOwnProperty('struttura') && !req.headers.hasOwnProperty('x-access-token') && !req.headers.hasOwnProperty('cf'))
        return res.status(404).send("Accesso negato");
    let token = req.headers['x-access-token'];
    let cf = req.headers['cf'];
    jwt.verify(token, utils.access_seed, function (err, decoded) { //Verifica e decodifica il token di accesso
        if (!err) { //Se tutto OK
            struttura.findOne({codice_struttura: req.headers.struttura}, function (err, structure) {
                let sendObject;
                let options = {
                    method: 'GET',
                    uri: structure.variabili_logicaDati.referti + "?codicefiscale=" + cf,
                    json: true
                };
                request(options, function (err, response, body) {
                    if (err)
                        return res.status(500).send("Il servizio non è momentaneamente disponibile");
                    if (response.statusCode !== 200)
                        return res.status(parseInt(!body.code ? response.statusCode : body.code)).send(!body.message ? "Il servizio non è momentaneamente disponibile" : body.code);

                    let listaReferti = [];

                    for (let i = 0; i < response.body.files.length; i++)
                        listaReferti.push({
                            metadati: {
                                desDocumento: response.body.files[i].metadata.desDocumento,
                                desEvento: response.body.files[i].metadata.desEvento,
                                dataDocumento: response.body.files[i].metadata.dataDocumento,
                                autoreDocumento: response.body.files[i].metadata.autoreDocumento
                            },
                            id: response.body.files[i]._id,
                            filename: response.body.files[i].filename
                        });

                    sendObject = {
                        listaReferti: listaReferti
                    };

                    res.status(200).send(sendObject);
                });
            });
        }
        else
            return res.status(401).send("Autenticazione fallita");
    });
};


/**
 * La funzione permette di scaricare un referto associato ad un id univoco all'interno dei sistemi di storage
 *
 **/

exports.scaricaReferto = function (req, res) {
    //Controlla se sono presenti i campi struttura e x-access-token
    if (!req.headers.hasOwnProperty('struttura') && !req.headers.hasOwnProperty('x-access-token') && !req.headers.hasOwnProperty('id'))
        return res.status(404).send("Accesso negato");
    let token = req.headers['x-access-token'];
    let id = req.headers['id'];
    jwt.verify(token, utils.access_seed, function (err, decoded) { //Verifica e decodifica il token di accesso
        if (!err) { //Se tutto OK
            struttura.findOne({codice_struttura: req.headers.struttura}, function (err, structure) {
                let sendObject;
                let options = {
                    headers: {
                        'Content-Type': 'application/pdf'
                    },
                    method: 'GET',
                    uri: structure.variabili_logicaDati.repositoryReferti + id
                };

                request(options, function (err, response, body) {
                    //let t = {message:"read: Impossibile leggere il file!",error:{http_code:404,message:"readFile: File non trovato!"}};

                    if (err)
                        return res.status(500).send("Il servizio non è momentaneamente disponibile");
                    if (response.statusCode !== 200) {
                        let errore = JSON.parse(response.body);
                        return res.status(parseInt(!errore.error.http_code ? response.statusCode : errore.error.http_code))
                            .send(!errore.message ? "Il servizio non è momentaneamente disponibile" : errore.message);
                    }

                    urlReferto = null;

                    sendObject = {
                        urlReferto: structure.variabili_logicaDati.repositoryReferti
                    };

                    res.status(200).send(structure.variabili_logicaDati.repositoryReferti);
                });
            });
        }
        else
            return res.status(401).send("Autenticazione fallita");
    });
};

/**
 * La funzione permette di inviare i referti tramite mail
 *
 **/

exports.inviaRefertiPosta = function (req, res) {

    //Controlla se sono presenti i campi struttura e x-access-token
    if (!req.headers.hasOwnProperty('struttura') && !req.headers.hasOwnProperty('x-access-token'))
        return res.status(404).send("Accesso negato");

    // Prelevo le informazioni dall'headers
    let token = req.headers['x-access-token'];

    // Dichiaro il nodemailer per l'invio delle mail
    let transport = nodemailer.createTransport({
        service: "Gmail",
        auth: {
            user: "ecuptservice.mail@gmail.com",
            pass: "Sviluppoecupt!"
        }
    });

    jwt.verify(token, utils.access_seed, function (err, decoded) { //Verifica e decodifica il token di accesso
        if (!err) { //Se tutto OK

            // dichiaro variabile json per email destinazione e url inviati dal dispositivo mobile
            let url = "";
            let email = "";
            let nome = "";
            let cognome = "";
            
            if ((req.body.datiEmail.url !== null && req.body.datiEmail.url !== undefined) && (req.body.datiEmail.email !== null && req.body.datiEmail.email !== undefined)) {
                // Prelevo le informazioni dal body
                url = req.body.datiEmail.url;
                email = req.body.datiEmail.email;
                nome = req.body.datiEmail.nome;
                cognome = req.body.datiEmail.cognome;
                let message = "Il paziente " + cognome + " " + nome + " " + "la ha invitata a consultare il referto al seguente link: " + url;
                let mailOption = {
                    from: '"ecuptservice.mail@gmail.com" <ecuptservice.mail@gmail.com>',
                    to: email,
                    subject: "Inoltro Referto del paziente: " + cognome + " " + nome,
                    text: message
                };
                transport.sendMail(mailOption, (err, info) => {
                    if (err) {
                        console.log(err);
                        return res.status(400).send("Errore nell'invio della email!.");
                    }
                    else {
                        console.log(info.response);
                        return res.status(200).send("Email inviata con successo!");
                    }
                });
            } else
                return res.status(401).send("Dati mancanti");
        }
        else
            return res.status(401).send("Autenticazione fallita");
    });
};