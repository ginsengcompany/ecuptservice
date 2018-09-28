let express = require('express');
let bcrypt = require('bcryptjs');
let moment = require('moment');
let strutture = require('../models/strutture');
let video = require('../models/video');
let path = require('path');

/*
router.get('/', function (req, res) {
    if (utenti.db._readyState !== 1)
        return res.status(500).send('Il servizio non è momentaneamente disponibile');
    else{
        strutture.find({}, function (err, strutture) {
            if (err) return res.status(500).send("Errore nella lista strutture");
            res.status(200).send(strutture);
        });
    }
});
*/

exports.infoStruttura = function (req, res) {
    if (!req.headers.hasOwnProperty('struttura'))
        return res.status(417).send("Campi insufficienti");
    if (strutture.db._readyState !== 1)
        return res.status(503).send("Servizio momentaneamente indisponibile");
    strutture.findOne({codice_struttura : req.headers['struttura']}, function (err, str) {
        if (err) return res.status(503).send("Servizio momentaneamente indisponibile");
        if (!str) return res.status(404).send("Struttura non trovata");
        res.status(200).send(str);
    });
};

exports.isAsl = function (req, res) {
    if (!req.headers.hasOwnProperty('struttura'))
        return res.status(417).send("Campi insufficienti");
    if (strutture.db._readyState !== 1)
        return res.status(503).send("Servizio momentaneamente indisponibile");
    strutture.findOne({codice_struttura : req.headers['struttura']}, function (err, str) {
        if (err) return res.status(503).send("Servizio momentaneamente indisponibile");
        if (!str) return res.status(404).send("Struttura non trovata");
        res.status(200).send(str._doc.variabili_logicaDati.asl);
    });
};

exports.infoChangeAppuntamentoStruttura = function (req, res) {
    if (!req.headers.hasOwnProperty('struttura'))
        return res.status(417).send("Campi insufficienti");
    if (strutture.db._readyState !== 1)
        return res.status(503).send("Servizio momentaneamente indisponibile");
    strutture.findOne({codice_struttura : req.headers['struttura']}, function (err, str) {
        if (err) return res.status(503).send("Servizio momentaneamente indisponibile");
        if (!str) return res.status(404).send("Struttura non trovata");
        if (str.variabili_logicaDati.onChangeAppuntamento === 0)
            res.status(200).send("Per effettuare lo spostamento desiderato contattare il call center della struttura " + str.nome_struttura + " al numero " + str.contatto.numero_callCenter);
        else
            res.status(200).send("Lo spostamento richiesto è stato preso in carico dalla struttura " + str.nome_struttura + ", sarai presto contattato");
    });
};

exports.infoMoreReparti = function (req, res) {
    if (!req.headers.hasOwnProperty('struttura'))
        return res.status(417).send("Campi insufficienti");
    if (strutture.db._readyState !== 1)
        return res.status(503).send("Servizio momentaneamente indisponibile");
    strutture.findOne({codice_struttura : req.headers['struttura']}, function (err, str) {
        if (err) return res.status(503).send("Servizio momentaneamente indisponibile");
        if (!str) return res.status(404).send("Struttura non trovata");
        if (str.variabili_logicaDati.onMoreReparti === 0)
            res.status(200).send("Se non conosci il reparto da selezionare, chiama il call center della struttura " + str.nome_struttura + " al numero " + str.contatto.numero_callCenter + " o si rechi al CUP");
    });
};

exports.logoStruttura = function (req, res) {
    if (!req.headers.hasOwnProperty('struttura'))
        return res.status(417).send("Campi insufficienti");
    if (strutture.db._readyState !== 1)
        return res.status(503).send("Servizio momentaneamente indisponibile");
    strutture.findOne({codice_struttura : req.headers['struttura']}, function (err, str) {
        res.status(200).send(str.logo_struttura);
    });
};

exports.inserimentoStruttura = function (req, res) {
    if (strutture.db.readyState !== 1) //Ontrolla se il database è pronto per la comunicazione
        return res.send({status: 503,message: 'Il servizio non è momentaneamente disponibile'});
    let logo = req.body.logo_struttura.replace(/.*,/g, "");
    //Nuova struttura da inserire nel database
    let nuovaStruttura = {
        nome_struttura: req.body.nome_struttura,
        codice_struttura: req.body.codice_struttura,
        logo_struttura: "",
        regione: req.body.regione,
        codRegione: "", //recuperare il codice della regione dal distretti-3.0
        contatto: {
            numero_callCenter: req.body.numero_callCenter,
            email: req.body.email
        },
        variabili_logicaDati: {
            onMoreReparti: 0,
            onChangeAppuntamento: req.body.onChangeAppuntamento,
            prenotazioniInBlocco: 1
        },
        url: {
            TerminiServizio: req.body.terminiServizio,
            Ricetta: req.body.ricetta,
            StruttureErogatrici: req.body.struttureErogatrici,
            Registrazione: "http://192.168.125.14:3000/auth/registrazione",
            Login: "http://192.168.125.14:3000/auth/login",
            StrutturaPreferita: "http://192.168.125.14:3000/auth/strutturaPreferita",
            RicercadisponibilitaReparti: req.body.ricercaDisponibilitaReparti,
            PrimaDisponibilita: req.body.primaDisponibilita,
            InfoPersonali: "http://192.168.125.14:3000/auth/me",
            AggiungiNuovoContatto: "http://192.168.125.14:3000/auth/aggiungiContatto",
            EliminaContatto: "http://192.168.125.14:3000/auth/eliminaContatto",
            ListaComuni: "http://192.168.125.14:3000/comuni/listacomuni",
            ListaProvince: "http://192.168.125.14:3000/comuni/listaprovince",
            ListaStatoCivile: "http://192.168.125.14:3000/statocivile",
            ConfermaPrenotazione: "http://192.168.125.14:3000/auth/confermaappuntamento",
            prossimaDataDisponibile: req.body.prossimaDataDisponibile,
            updateTokenNotifiche: "http://192.168.125.14:3000/auth/updatetokennotifiche",
            appuntamenti: "http://192.168.125.14:3000/auth/listaappuntamenti",
            PrimaDisponibilitaOra: req.body.primaDisponibilitaOra,
            ricercadata: req.body.ricercaData,
            eliminaContattoPersonale: "http://192.168.125.14:3000/auth/eliminaaccount",
            annullaImpegnativa: "http://192.168.125.14:3000/auth/annullaImpegnativa",
            ricezioneDatiPrenotazione: "http://192.168.125.14:3000/auth/pendingprenotazione",
            annullaPrenotazioneSospesa: "http://192.168.125.14:3000/auth/annullaprenotazionesospesa",
            spostamentoPrenotazione: "http://192.168.125.14:3000/infostruttura/infoChangeAppuntamento",
            piuReparti: req.body.piuReparti,
            appuntamentiFuturiEPassati: "http://192.168.125.14:3000/auth/listaappuntamentiFuturiEPassati"
        }
    };
    strutture.create(nuovaStruttura, function (err, struttura) {
        if(err) return res.send({status: 500, message: 'Registrazione nuova struttura fallita'}); //Errore
        res.status(201).send({ status: 201, message: 'Registrazione avvenuta con successo'});
    });
    res.status(201).send({ status: 201, message: 'Registrazione avvenuta con successo'});

};

exports.insertLogo = function(req, res){
    strutture.findOne({codice_struttura: req.body.codice_struttura}, function (err, struttura) {
        if(err) return res.send({status: 500, message: 'Il logo non è stato inserito'});
        struttura.logo_struttura = req.body.logo_struttura;
        struttura.save(function (err, str) {
            if(err) return res.send({status: 500, message: 'Il logo non è stato inserito'});
            res.send({status: 200, message: 'Il logo è stato inserito'});
        });
    });
};

exports.listaStrutture = function (req, res) {
    strutture.find({},{_id:0, codice_struttura: 1}, function (err, structure) {
        if(err) return res.send({status: 500, message: 'Errore del Database'});
        if(!structure) return res.send({status: 404, message: 'Nessuna struttura trovata'});
        let array = [];
        for(let i=0; i<structure.length; i++){
            array.push(structure[i].codice_struttura);
        }
        res.send({status: 200, strutture: array});
    });
};

exports.modificaStruttura = function (req, res) {
    strutture.findOne({codice_struttura: req.body.codice_struttura}, function (err, structure) {
        if(err) return res.send({status: 500, message: 'Errore del Database'});
        if(!structure) return res.send({status: 404, message: 'Nessuna struttura trovata'});

    });
};

exports.getVideos = function (req, res) {
    if(!req.headers.hasOwnProperty("struttura")) return res.status(417).send("Servizio non disponibile");
    video.findOne({struttura : req.headers.struttura}, function (err,result) {
        if(err) return res.status(500).send("Il servizio non è momentaneamente disponibile");
        if(!result) return res.status(404).send("Struttura non trovata");
        res.status(200).send(result.videoApp);
    });
};

