let jwt = require('jsonwebtoken');
let bcrypt = require('bcryptjs');
let utenti = require('../models/utenti'); //richiama il file che contiene il modello del documento della collection utentis
let controlloCodiceFiscale = require('../utils/controlloCodiceFiscale'); //richiama il file contenente le funzioni per il controllo del codice fiscale
let request = require('request');
let moment = require('moment');
let prenotazionitemp = require('../models/prenotazionitemp'); //richiama il file che contiene il modello del documento della collection prenotazionitemps
let https = require('https'); //modulo per il protocollo HTTPS
let utils = require('../utils/util');
let strutture = require('../models/strutture');
let fs = require('fs');
let path = require('path');
let nodemailer = require('nodemailer');
/*
La funzione effettua la registrazione di un utente utilizzando opportuni controlli sulle info
inviate alla rotta. Campi richiesti:
body: {
    username,
    nome,
    cognome,
    codice_fiscale,
    data_nascita,
    luogo_nascita,
    provincia,
    sesso,
    password,
    comune_residenza,
    telefono,
    istatComuneNascita,
    istatComuneResidenza,
    codStatoCivile,
    statocivile,
    email (opzionale),
    indirizzores
}
 */
exports.registrazione = function (req, res) {
    let parametriNonVuoti = true; //variabile di controllo che indica se i parametri inviati alla rotta siano non vuoti
    /*
    il ciclo for itera sulle proprietà del body inviate alla rotta
     */
    for (let prop in req.body) {
        if (prop !== "contatti" && prop !== "prenotazioni" && prop !== "ultimoAccesso" &&
            prop !== "tokenNotifiche" && prop !== "listaMedici" && prop !== "attivo" && prop !== "nomeCompletoConCodiceFiscale" && prop !== "AccountPrimario" && prop !== 'statocivile' && prop !== 'codStatoCivile' && prop !== 'imgSesso') {
            if (!req.body[prop].trim()) {
                parametriNonVuoti = false;
            }
        }
    }
    if (!parametriNonVuoti) //controlla se è tutto ok
        return res.status(400).send("Compilare tutti i campi obbligatori");
    if (utenti.db._readyState !== 1) //Controlla se il database è pronto per la comunicazione
        return res.status(503).send('Il servizio non è momentaneamente disponibile');
    //Effettua il controllo del codice fiscale in base alle info ricevute
    controlloCodiceFiscale(req.body.codice_fiscale, req.body).then(function (x) {
        if (x) { //x = true, controllo del codice fiscale andato a buon fine
            //effettua una ricerca per controllare se l'utente che richiede di registrarsi al servizio non esiste già
            utenti.findOne(
                {
                    $or: [
                        {codice_fiscale: req.body.codice_fiscale},
                        {username: req.body.username},
                        {email: req.body.email}
                    ]
                }, function (err, user) {
                    if (user) return res.status(409).send("Utente già registrato"); //Se l'utente risulta già registrato
                    req.body = JSON.parse(JSON.stringify(req.body));
                    let hashedPassword = bcrypt.hashSync(req.body.password, 8); //Cripta la password
                    let oggiReg = moment().format('DD/MM/YYYY'); //Recupera la data di registrazione dell'utente
                    utenti.create({ //Crea il documento con le info dell'utente
                            username: req.body.username,
                            nome: req.body.nome,
                            cognome: req.body.cognome,
                            codice_fiscale: req.body.codice_fiscale,
                            data_nascita: moment(req.body.data_nascita, ['DD/MM/YYYY', 'MM/DD/YYYY'], true).format('DD/MM/YYYY'),
                            istatComuneNascita: req.body.istatComuneNascita,
                            luogo_nascita: req.body.luogo_nascita,
                            istatComuneResidenza: req.body.istatComuneResidenza,
                            comune_residenza: req.body.comune_residenza,
                            telefono: req.body.telefono,
                            codStatoCivile: req.body.codStatoCivile,
                            statocivile: req.body.statocivile,
                            sesso: req.body.sesso,
                            email: req.body.email,
                            provincia: req.body.provincia,
                            indirizzores: req.body.indirizzores,
                            attivo: true,
                            ultimoAccesso: oggiReg,
                            dataRegistrazione: oggiReg,
                            password: hashedPassword
                        },
                        function (err, user) { //Callback create
                            if (err) return res.status(503).send("Il servizio non è momentaneamente disponibile"); //Errore
                            /*
                            Crea il token di accesso riferito all'id del documento dell'utente e lo invia al richiedente
                             */
                            let token = jwt.sign({id: user._id}, utils.access_seed, {
                                //expiresIn: 86400 // scade in 24 ore
                            });
                            res.status(201).send({auth: true});
                        });
                });
        }
        else //Codice fiscale non valido
            res.status(400).send("Dati inconsistenti, ricontrollare i dati");
    });
};

/*
La funzione restituisce le info dell'utente, richiede come header il token di accesso dell'utente [x-access-token]
 */
exports.me = function (req, res) {
    //controlla se il token è stato inserito nella chiamata alla rotta
    if (!req.headers.hasOwnProperty('x-access-token') || !req.headers['x-access-token'])
        return res.status(417).send({auth: false, message: "Accesso non autorizzato"});
    if (utenti.db._readyState !== 1) //Controlla se il database è pronto per la comunicazione
        return res.status(503).send('Il servizio non è momentaneamente disponibile');
    let token = req.headers['x-access-token'];
    jwt.verify(token, utils.access_seed, function (err, decoded) { //Questa funzione verifica e decodifica il token di accesso
        if (err) return res.status(401).send({auth: false, message: 'Autenticazione fallita'}); //Il token è errato
        /*
        Ricerca del documento relativo all'utente per _id (il token di accesso identifica, se codificato, l'id
        del documento dell'utente nel database
         */
        utenti.findById(decoded.id, {password: 0}, function (err, user) {
            if (err) return res.status(503).send("Errore nella ricerca utente");
            if (!user) return res.status(404).send("Utente non trovato");
            let sender = []; //variabile che contiene le info dell'utente e dei suoi contatti
            sender.push({ //Inserisce le info dell'utente
                nome: user.nome,
                cognome: user.cognome,
                codice_fiscale: user.codice_fiscale,
                data_nascita: user.data_nascita,
                istatComuneNascita: user.istatComuneNascita,
                luogo_nascita: user.luogo_nascita,
                istatComuneResidenza: user.istatComuneResidenza,
                comune_residenza: user.comune_residenza,
                telefono: user.telefono,
                codStatoCivile: user.codStatoCivile,
                statocivile: user.statocivile,
                provincia: user.provincia,
                sesso: user.sesso,
                email: user.email,
                indirizzores: user.indirizzores,
                nomeCompletoConCodiceFiscale: user.cognome + " " + user.nome // + " " + user.codice_fiscale
            });
            for (let i = 0; i < user.contatti.length; i++) //Inserisce le info dei contatti dell'utente
                sender.push({
                    nome: user.contatti[i].nome,
                    cognome: user.contatti[i].cognome,
                    codice_fiscale: user.contatti[i].codice_fiscale,
                    data_nascita: user.contatti[i].data_nascita,
                    istatComuneNascita: user.contatti[i].istatComuneNascita,
                    luogo_nascita: user.contatti[i].luogo_nascita,
                    istatComuneResidenza: user.contatti[i].istatComuneResidenza,
                    comune_residenza: user.contatti[i].comune_residenza,
                    telefono: user.contatti[i].telefono,
                    codStatoCivile: user.contatti[i].codStatoCivile,
                    provincia: user.contatti[i].provincia,
                    statocivile: user.contatti[i].statocivile,
                    sesso: user.contatti[i].sesso,
                    email: user.contatti[i].email,
                    indirizzores: user.contatti[i].indirizzores,
                    nomeCompletoConCodiceFiscale: user.contatti[i].cognome + " " + user.contatti[i].nome // + " " + user.contatti[i].codice_fiscale
                });
            res.status(200).send(sender);
        });
    });
};

/*
La funzione aggiunge un contatto al documento dell'utente, richiede il campo header per il token di accesso [x-access-token]
 */
exports.aggiungicontatto = function (req, res) {
    if (!req.headers.hasOwnProperty('x-access-token')) //controlla se il token è stato inserito nella chiamata alla rotta
        return res.status(417).send('Accesso non autorizzato');
    if (utenti.db._readyState !== 1) //Controlla se il database è pronto per la comunicazione
        return res.status(503).send('Il servizio non è momentaneamente disponibile');
    /*
    Controlla il codice fiscale del nuovo contatto da inserire nel documento dell'utente
     */
    controlloCodiceFiscale(req.body.codice_fiscale, req.body).then(function (x) {
        if (x) { //Codice fiscale corretto
            let token = req.headers['x-access-token'];
            jwt.verify(token, utils.access_seed, function (err, decoded) { //Verifica e decodifica il token di accesso
                if (err) return res.status(401).send('Autenticazione fallita');
                /*
                Cerca il documento relativo all'utente attraverso il campo _id dei documenti presenti nel database
                 */
                utenti.findById(decoded.id, {password: 0}, function (err, user) {
                    if (err) return res.status(503).send("Il servizio non è momentaneamente disponibile");
                    if (!user) return res.status(404).send("Utente non trovato"); //Documento non trovato
                    let trovato = false;
                    if (user.codice_fiscale === req.body.codice_fiscale)
                        return res.status(400).send("Impossibile aggiungere il contatto in quanto è presente il lista contatti");
                    for (let i = 0; i < user.contatti.length; i++) {
                        if (user.contatti[i].codice_fiscale === req.body.codice_fiscale) {
                            trovato = true;
                            break;
                        }
                    }
                    if (!trovato) {
                        /*
                    nuovo contatto da inserire nel documento trovato
                     */
                        let contatti = {
                            nome: req.body.nome,
                            cognome: req.body.cognome,
                            codice_fiscale: req.body.codice_fiscale,
                            data_nascita: moment(req.body.data_nascita, ['DD/MM/YYYY', 'MM/DD/YYYY'], true).format('DD/MM/YYYY'),
                            luogo_nascita: req.body.luogo_nascita,
                            comune_residenza: req.body.comune_residenza,
                            telefono: req.body.telefono,
                            istatComuneResidenza: req.body.istatComuneResidenza,
                            istatComuneNascita: req.body.istatComuneNascita,
                            indirizzores: req.body.indirizzores,
                            email: req.body.email,
                            sesso: req.body.sesso,
                            provincia: req.body.provincia,
                            codStatoCivile: req.body.codStatoCivile,
                            statocivile: req.body.statocivile
                        };
                        /*
                        Inserimento e salvataggio del nuovo contatto
                         */
                        user.contatti.push(contatti);
                        user.save(function (err, updateUser) {
                            if (err) return res.status(503).send("Il servizio non è momentaneamente disponibile"); //Errore nel salvataggio dell'update del documento
                            res.status(201).send({
                                auth: true,
                                token: ""
                            });
                        })
                    }
                    else
                        return res.status(400).send("Impossibile aggiungere il contatto in quanto è presente il lista contatti");
                });
            });
        }
        else
            res.status(400).send("Il codice fiscale non è valido");
    });
};

/*
La funzione elimina un contatto dalla lista dei contatti di un utente, richiede il campo x-access-token
come header (token di accesso)
 */
exports.eliminacontatto = function (req, res) {
    if (!req.headers.hasOwnProperty('x-access-token')) //Controlla se il token è stato inserito nella chiamata alla rotta
        return res.status(417).send("Accesso non autorizzato");
    if (!req.body.hasOwnProperty("codice_fiscale")) //Controlla se il campo codice_fiscale è presente nel body
        return res.status(400).send("La richiesta non può essere elaborata");
    if (utenti.db._readyState !== 1) //Controlla se il database è pronto per la comunicazione
        return res.status(503).send('Il servizio non è momentaneamente disponibile');
    let token = req.headers['x-access-token'];
    jwt.verify(token, utils.access_seed, function (err, decoded) { //Verifica e decodifica il token di accesso ricevuto
        if (err) return res.status(401).send('Autenticazione fallita');
        /*
        Cerca il documento relativo all'utente attraverso il campo _id dei documenti presenti nel database
        */
        utenti.findById(decoded.id, {password: 0}, function (err, user) {
            if (err) return res.status(503).send("Il servizio non è momentaneamente disponibile");
            if (!user) return res.status(404).send("Utente non trovato"); //Documento non trovato
            let eliminato = false; //Variabile che indica se il contatto è stato eliminato
            for (let i = 0; i < user._doc.contatti.length; i++) { //Cicla su tutti i contatti presenti nel documento dell'utente
                if (user._doc.contatti[i].codice_fiscale === req.body.codice_fiscale) { //Cerca il contatto confrontando i codici fiscali
                    user._doc.contatti.splice(i, 1);
                    eliminato = true; //Imposta la variabile di controllo a true (contatto rimosso dall'array
                    break;
                }
            }
            if (eliminato) //Se il contatto è stato rimosso dall'array
                user.save(function (err, updateUser) { //Salva la modifica effettuata sul documento dell'utente
                    if (err) return res.status(503).send("Il servizio non è momentaneamente disponibile");
                    res.status(200).send("Operazione riuscita");
                });
            else //Il contatto non è stato rimosso in quanto non è stato trvato all'interno dell'array dei contatti
                res.status(404).send("Contatto non trovato");
        });
    });
};

/*
La funzione effettua il controllo dei dati di accesso dell'utente per effettuare l'accesso ai servizi.
Restitusice il token di accesso per permettere all'utente di poter accedere ai servizi a lui dedicati
 */
exports.login = function (req, res) {
    //Controlla se sono presenti i campi username e password
    if (!req.body.hasOwnProperty('username') || !req.body.hasOwnProperty('password'))
        return res.status(400).send("La richiesta non può essere elaborata");
    if (utenti.db._readyState !== 1) //Controlla se il database è pronto per la comunicazione
        return res.status(503).send('Il servizio non è momentaneamente disponibile');
    /*
    Ricerca il documento dell'utente attraverso il campo username in quanto non può essere duplicato
     */
    utenti.findOne({username: req.body.username}, function (err, user) {
        if (err) return res.status(503).send('Il servizio non è momentaneamente disponibile');
        if (!user) return res.status(404).send('Utente non trovato');
        /*
        L'utente è disattivato se non accede al servizio da più di sei mesi
         */
        if (!user.attivo) return res.status(403).send("Utenza scaduta");
        /*
        Controlla la password decodificata del documento trovato e quella inviata alla rotta
         */
        let passwordIsValid = bcrypt.compareSync(req.body.password, user.password);
        if (!passwordIsValid) return res.status(401).send("username o password errati");
        let token = jwt.sign({id: user._id}, utils.access_seed, { //Crea il token di accesso ai servizi
            //expiresIn: 86400 // expires in 24 hours
        });
        /*
        Cerca un documento nella collection prenotazionitemps che ha lo stesso id del documento dell'utente.
        Se questo documento viene trovato significa che l'utente ha una prenotazione in sospeso, in tal caso
        viene inviato non solo il token di accesso ai servizi ma anche una variabile booleana per indicare
        che l'utente ha una prenotazione in sospeso
         */
        prenotazionitemp.findOne({idUser: user._id}, function (err, prenotazioni) {
            let pendingprenotazione = false; //variabile di controllo per le prenotazioni sospese
            if (prenotazioni) pendingprenotazione = true;
            res.status(200).send({auth: true, token: token, prenotazionePending: pendingprenotazione});
        });
        let oggi = moment().format('DD/MM/YYYY'); //dataCorrente
        user.ultimoAccesso = oggi; //Aggiorna la data
        user.save(function (err, updateUser) { //Salva la modifica
            if (err) return user.save();
        });
    });
};

/*
La funzione conferma l'appuntamento che l'utente sta prenotando, è richiesto l'invio del token
di accesso
 */
exports.confermaappuntamento = function (req, res) {
    if (!req.headers.hasOwnProperty('x-access-token')) //Controlla se il campo x-access-token è presente
        return res.status(417).send("Accesso non autorizzato");
    /*
    Controlla che siano presenti tutti i campi necessari per confermare l'appuntamento
     */
    if (!req.body.hasOwnProperty('assistito') || !req.headers.hasOwnProperty('struttura') || !req.body.hasOwnProperty('appuntamenti') ||
        !req.body.hasOwnProperty('dataEmissioneRicetta') || !req.body.hasOwnProperty('codiceImpegnativa') || !req.body.hasOwnProperty('classePriorita') ||
        !req.body.hasOwnProperty('termid'))
        return res.status(400).send("La richiesta non può essere elaborata");
    let token = req.headers['x-access-token'];
    if (utenti.db._readyState !== 1) //Controlla se il database è pronto per la comunicazione
        return res.status(503).send('Il servizio non è momentaneamente disponibile');
    let progressivi = [];
    for (let i = 0; i < req.body.appuntamenti.length; i++)
        progressivi.push(i + 1); //campo che contiene il numero di prestazioni da prenotare
    jwt.verify(token, utils.access_seed, function (err, decoded) { //Verifica il token di accesso
        if (err) return res.status(401).send(sender.messaggio = "L'appuntamento è stato confermato ma non è stato possibile salvare i dati nell'archivio dell'utente, per le informazioni dell'appuntamento contattare il servizio clienti");
        /*
    opzioni della funzione request che indicano le opzioni di invio dei dati per effettuare la prenotazione alla struttura
     */
        strutture.findOne({codice_struttura: req.headers.struttura}, function (err, structure) {
            if (err) return res.status(503).send("Il servizio non è momentaneamente disponibile");
            if (!structure) return res.status(404).send("Struttura non trovata");
            //Template della risposta del servizio
            let sender = {
                messaggio: "Non è possibile confermare l'appuntamento",
                esito: 0
            };
            let optionsRESTuno = {
                method: 'POST',
                uri: structure.variabili_logicaDati.host + req.headers.struttura + '/datiimpegnativa',
                body: {
                	nre: req.body.codiceImpegnativa,
                	cf : req.body.assistito.codice_fiscale,
                	nome : req.body.assistito.nome,
                	cognome : req.body.assistito.cognome
                },
                json : true
            };
            request(optionsRESTuno,function (err, response, body){
            	let prestazioni = [];
                for (let i=0;i < body.data.elencoDettagliPrescrVisualErogato.length;i++){
                    if (body.data.elencoDettagliPrescrVisualErogato[i].statoPresc === "1"){
                        /* if (structure._doc.codRegione === body.data.codRegione)
                             prestazioni.push({
                                 desprest : body.data.elencoDettagliPrescrVisualErogato[i].descrProdPrest,
                                 codregionale : body.data.elencoDettagliPrescrVisualErogato[i].codProdPrest
                             });
                         else
                             prestazioni.push({
                                 desprest : body.data.elencoDettagliPrescrVisualErogato[i].descrProdPrest,
                                 codnazionale : body.data.elencoDettagliPrescrVisualErogato[i].codNomenclNaz
                             }); */
                        prestazioni.push({
                            desprest : body.data.elencoDettagliPrescrVisualErogato[i].descrProdPrest,
                            codregionale : body.data.elencoDettagliPrescrVisualErogato[i].codCatalogoPrescr,
                            codnazionale : body.data.elencoDettagliPrescrVisualErogato[i].codCatalogoPrescr,
                            dataPrenotazione: body.data.elencoDettagliPrescrVisualErogato[i].dataPrenotazione
                        });
                    }
                }
                if(err) return res.status(500).send('Il servizio è momentaneamente indisponibile');
                    if(!structure) return res.status(404).send('Struttura non trovata');
                    let prestazionePrenotata = 0;
                    for(let i=0;i<prestazioni.length;i++){
                        if (prestazioni[i].dataPrenotazione !== "")
                            prestazionePrenotata += 1;
                    }
                    if (prestazionePrenotata < body.data.elencoDettagliPrescrVisualErogato.length && prestazionePrenotata > 0){
                    	sender.messaggio = "L'impegnativa risulta parzialmente prenotata. Per informazioni si prega di contattare il call center al numero " + structure.contatto.numero_callCenter;
                		sender.esito = 1;
                        return res.status(201).send(sender);
                    }
                    else if (prestazionePrenotata === body.data.elencoDettagliPrescrVisualErogato.length){
                    	sender.messaggio = "L'impegnativa risulta già prenotata. Per informazioni si prega di contattare il call center al numero " + structure.contatto.numero_callCenter;
                		sender.esito = 1;
                        return res.status(409).send(sender);
                    }
                    let options = {
                method: 'POST',
                uri: structure.variabili_logicaDati.host + req.headers['struttura'] + '/confermaappuntamento',
                body: {
                    idPai: "",
                    progressivi: progressivi,
                    termid: req.body.termid,
                    tipoPrenotato: "",
                    assistito: {
                        codAssistito: "0",
                        codFiscale: req.body.assistito.codice_fiscale,
                        cognome: req.body.assistito.cognome,
                        nome: req.body.assistito.nome,
                        sesso: req.body.assistito.sesso,
                        dataNascita: req.body.assistito.data_nascita,
                        istatComune: req.body.assistito.istatComuneNascita,
                        codStatoCivile: req.body.assistito.codStatoCivile,
                        istatComuneRes: req.body.assistito.istatComuneResidenza,
                        istatQuartiere: "",
                        telefono: req.body.assistito.telefono
                    },
                    operatore: {
                        uid: "156",
                        codStrutturaRichiesta: req.headers['struttura']
                    },
                    nre: req.body.codiceImpegnativa
                },
                json: true
            };
            /*
            Invia la richiesta di prenotazione dell'appuntamento al servizio del CUP della struttura

            let appuntamento = [];

            Aggiunge l'appuntamento confermato alla lista degli appuntamenti dell'utente

            for (let i=0;i<req.body.appuntamenti.length;i++) {
                appuntamento.push({
                    dataAppuntamento : req.body.appuntamenti[i].dataAppuntamento,
                    oraAppuntamento : req.body.appuntamenti[i].oraAppuntamento,
                    codPrestazione : req.body.appuntamenti[i].codprest,
                    desprest : req.body.appuntamenti[i].desprest,
                    nota: req.body.appuntamenti[i].nota,
                    reparti: [{
                        codReparto : req.body.appuntamenti[i].reparti[0].codReparto,
                        descrizione: req.body.appuntamenti[i].reparti[0].descrizione,
                        unitaOperativa : req.body.appuntamenti[i].reparti[0].unitaOperativa,
                        nomeStruttura : req.body.appuntamenti[i].reparti[0].nomeStruttura,
                        nomeMedico: req.body.appuntamenti[i].reparti[0].nomeMedico,
                        ubicazioneReparto: req.body.appuntamenti[i].reparti[0].ubicazioneReparto,
                        ubicazioneUnita: req.body.appuntamenti[i].reparti[0].ubicazioneUnita,
                        latitudine: req.body.appuntamenti[i].reparti[0].latitudine,
                        longitudine: req.body.appuntamenti[i].reparti[0].longitudine,
                    }]
                });
            }
            for (let t = 0; t < appuntamento.length - 1; t++){
                let posmin = t;
                for (let k = t+1; k < appuntamento.length; k++){
                    let meseA,meseB;
                    if (appuntamento[posmin].dataAppuntamento.charAt(3) === "0")
                        meseA = parseInt(appuntamento[posmin].dataAppuntamento.charAt(4)) - 1;
                    else
                        meseA = parseInt(appuntamento[posmin].dataAppuntamento.substring(3,5)) - 1;
                    if (appuntamento[k].dataAppuntamento.charAt(3) === "0")
                        meseB = parseInt(appuntamento[k].dataAppuntamento.charAt(4)) - 1;
                    else
                        meseB = parseInt(appuntamento[k].dataAppuntamento.substring(3,5)) - 1;
                    let data1 = moment({years: appuntamento[posmin].dataAppuntamento.substring(6), months: meseA.toString(), date: appuntamento[posmin].dataAppuntamento.substring(0,2)});
                    let data2 = moment({years: appuntamento[k].dataAppuntamento.substring(6), months: meseB, date: appuntamento[k].dataAppuntamento.substring(0,2)});
                    if (data1.isBefore(data2) === false) //data1 è più vicina a oggi rispetto data2
                        posmin = k;
                }
                if (posmin !== t){
                    let temp = appuntamento[t];
                    appuntamento[t] = appuntamento[posmin];
                    appuntamento[posmin] = temp;
                }
            }*/
            request(options, function (err, response, body) {
                //Si è verificato un errore proveniente dal sottosistema CUP della struttura
                if (err || response.statusCode !== 200 || !body || body.code !== "200") {
                    return res.status(502).send("Si è verificato un errore durante la conferma dell'appuntamento");
                }
                sender.messaggio = "Prenotazione avvenuta con successo";
                sender.esito = 1;
                res.status(201).send(sender);
                prenotazionitemp.remove({idUser: decoded.id}, function (err) {

                });
                /*
                Cerca il documento relativo all'utente attraverso il token di accesso

                utenti.findById(decoded.id, {password: 0}, function (err, user) {
                    //Se si verifica un errore col database, l'appuntamento è stato confermato con la struttura ma non è stato possibile salvarlo nella lista
                    //appuntamenti dell'utente
                    if (err) return res.status(500).send(sender.messaggio = "L'appuntamento è stato confermato ma non è stato possibile salvare i dati nell'archivio dell'utente, per le informazioni dell'appuntamento contattare il servizio clienti");
                    if (!user) return res.status(404).send(sender.messaggio = "L'appuntamento è stato confermato ma non è stato possibile salvare i dati nell'archivio dell'utente, per le informazioni dell'appuntamento contattare il servizio clienti");
                    let dataEmissione = moment(req.body.dataEmissioneRicetta.substring(0, 10),"DD/MM/YYYY"); //salva la data di emissione dell'impegnativa
                    user.prenotazioni.push({
                        assistito : {
                            nome : req.body.assistito.nome,
                            cognome : req.body.assistito.cognome,
                            codice_fiscale : req.body.assistito.codice_fiscale
                        },
                        appuntamenti: appuntamento,
                        codiceImpegnativa : req.body.codiceImpegnativa,
                        dataPrenotazione : moment().format("DD/MM/YYYY"),
                        dataEmissioneRicetta : dataEmissione._i,
                        classePriorita : req.body.classePriorita,
                        termid : req.body.termid
                    });
                    user.save(function (err, updateUser) { //Aggiorna il documento nel database
                        if (err) return res.status(500).send(sender.messaggio = "L'appuntamento è stato confermato ma non è stato possibile salvare i dati nell'archivio dell'utente");
                        sender.esito = 1;
                        res.status(201).send(sender);
                        });
                        });
                        */
            });
            });
        });
    });
};

/*
La funzione recupera la lista degli appuntamenti con data maggiore o uguale alla data corrente dell'utente, richiede l'invio
del token di accesso [x-access-token]
 */
exports.listaappuntamenti = function (req, res) {
    if (!req.headers.hasOwnProperty('x-access-token') || !req.headers.hasOwnProperty('struttura')) //Controlla se il campo x-access-token è presente
        return res.status(417).send("Accesso non autorizzato");
    if (!req.body.hasOwnProperty('codice_fiscale')) //Controlla se il campo codice_fiscale è presente
        return res.status(400).send("La richiesta non può essere elaborata");
    let token = req.headers['x-access-token'];
    if (utenti.db._readyState !== 1) //Controlla se il database è pronto per la comunicazione
        return res.status(503).send('Il servizio non è momentaneamente disponibile');
    jwt.verify(token, utils.access_seed, function (err, decoded) { //Verifica e decodifica il token ricevuto
        if (err) return res.status(401).send("Si è verificato un errore");
        strutture.findOne({codice_struttura: req.headers.struttura}, function (err, structure) {
            if (err) return res.status(503).send("Il servizio non è momentaneamente disponibile");
            if (!structure) return res.status(404).send("Struttura non trovata");
            /*
        Cerca il documento relativo all'utente attraverso il token
        utenti.findById(decoded.id, {prenotazioni: 1, _id : 0}, function (err, user) {
            if (err) return res.status(503).send("Il servizio non è momentaneamente disponibile");
            if (!user) return res.status(404).send("Utente non trovato"); //Documento non trovato
            let listaAppuntamenti = [];
            //Recupera tutti gli appuntamenti dell'utente, se ci sono
            for (let i = 0; i < user.prenotazioni.length; i++){
                let prenotazione = {
                    assistito: {},
                    appuntamenti: [],
                    codiceImpegnativa: "",
                    dataPrenotazione: "",
                    dataEmissioneRicetta: "",
                    classePriorita: "",
                    termid: ""
                };
                let index = [];
                //Preleva solo gli appuntamenti futuri ed odierni
                if (user.prenotazioni[i].assistito.codice_fiscale === req.body.codice_fiscale){
                    for (j=0; j < user.prenotazioni[i].appuntamenti.length; j++) {
                        let data = moment([parseInt(user.prenotazioni[i].appuntamenti[j].dataAppuntamento.substr(6, 4)), parseInt(user.prenotazioni[i].appuntamenti[j].dataAppuntamento.substr(3, 2)) - 1, parseInt(user.prenotazioni[i].appuntamenti[j].dataAppuntamento.substr(0, 2))]);
                        if (moment().diff(data, 'days') <= 0)
                            index.push(j);
                    }
                    if (index.length > 0){
                        for (let t in index)
                            prenotazione.appuntamenti.push(user.prenotazioni[i].appuntamenti[t]);
                        prenotazione.assistito = user.prenotazioni[i].assistito;
                        prenotazione.codiceImpegnativa = user.prenotazioni[i].codiceImpegnativa;
                        prenotazione.dataPrenotazione = user.prenotazioni[i].dataPrenotazione;
                        prenotazione.dataEmissioneRicetta = user.prenotazioni[i].dataEmissioneRicetta;
                        prenotazione.classePriorita = user.prenotazioni[i].classePriorita;
                        prenotazione.termid = user.prenotazioni[i].termid;
                        listaAppuntamenti.push(prenotazione);
                    }
                }
            }
            res.status(200).send(listaAppuntamenti);
        });*/
            utenti.findById(decoded.id, function (err, user) {
                if (err) return res.status(503).send("Il servizio non è momentaneamente disponibile");
                if (!user) return res.status(404).send("Utente non trovato"); //Documento non trovato
                let trovato = false;
                let index = -1;
                for (let i = 0; i < user.contatti.length; i++)
                    if (user.contatti[i].codice_fiscale === req.body.codice_fiscale) {
                        trovato = true;
                        index = i;
                    }
                if (!trovato && user.codice_fiscale === req.body.codice_fiscale)
                    trovato = true;
                if (!trovato)
                    return res.status(404).send("contatto non trovato");
                let options = {
                    method: 'POST',
                    uri: structure.variabili_logicaDati.host + req.headers['struttura'] + '/listaappuntamenti',
                    body: {
                        cf: req.body.codice_fiscale
                    },
                    json: true
                };
                request(options, function (err, response, body) {
                    if (response.statusCode !== 200 || body.code !== "200" || body.data.appuntamenti.length === 0)
                        return res.status(parseInt(response.statusCode)).send("Non è possibile ricevere i dati");
                    let listaAppuntamenti = [];
                    let rispostaRequest = body.data.appuntamenti;
                    let ImpegnativaIndexes = [];
                    let assistito = {};
                    if (index === -1) {//codice fiscale del proprietario dell'utenza
                        assistito.nome = user.nome;
                        assistito.cognome = user.cognome;
                        assistito.codice_fiscale = user.codice_fiscale;
                        assistito.data_nascita = user.data_nascita;
                        assistito.luogo_nascita = user.luogo_nascita;
                        assistito.comune_residenza = user.comune_residenza;
                        assistito.telefono = user.telefono;
                        assistito.istatComuneResidenza = user.istatComuneResidenza;
                        assistito.istatComuneNascita = user.istatComuneNascita;
                        assistito.indirizzores = user.indirizzores;
                        assistito.email = user.email;
                        assistito.sesso = user.sesso;
                        assistito.codStatoCivile = user.codStatoCivile;
                        assistito.statocivile = user.statocivile;
                    } else
                        assistito = user.contatti[index];
                    for (let i = 0; i < rispostaRequest.length; i++) {
                        if (ImpegnativaIndexes.length === 0)
                            ImpegnativaIndexes.push({impegnativa: rispostaRequest[i].codiceImpegnativa, indexes: [i]});
                        else {
                            let find = false;
                            for (let j = 0; j < ImpegnativaIndexes.length; j++) {
                                if (ImpegnativaIndexes[j].impegnativa === rispostaRequest[i].codiceImpegnativa) {
                                    find = true;
                                    ImpegnativaIndexes[j].indexes.push(i);
                                    break;
                                }
                            }
                            if (!find) {
                                ImpegnativaIndexes.push({
                                    impegnativa: rispostaRequest[i].codiceImpegnativa,
                                    indexes: [i]
                                });
                            }
                        }
                    }
                    for (let i = 0; i < ImpegnativaIndexes.length; i++) {
                        let prenotazione = {
                            assistito: {},
                            appuntamenti: [],
                            codiceImpegnativa: "",
                            dataPrenotazione: "",
                            dataEmissioneRicetta: "",
                            classePriorita: "",
                            termid: "",
                            tipoPrenotazione : "",
                            dataAccettazione : ""

                        };
                        prenotazione.assistito = assistito;
                        prenotazione.codiceImpegnativa = ImpegnativaIndexes[i].impegnativa;
                        for (let j = 0; j < ImpegnativaIndexes[i].indexes.length; j++) {
                            prenotazione.appuntamenti.push(rispostaRequest[ImpegnativaIndexes[i].indexes[j]]);
                            for (let t = 0; t < prenotazione.appuntamenti.length; t++) {
                                if (prenotazione.appuntamenti[t].codPrestazione === rispostaRequest[ImpegnativaIndexes[i].indexes[j]].codPrestazione) {
                                    prenotazione.appuntamenti[t].reparti = [];
                                    prenotazione.appuntamenti[t].reparti.push({
                                        codReparto: rispostaRequest[ImpegnativaIndexes[i].indexes[j]].codReparto,
                                        descrizione: rispostaRequest[ImpegnativaIndexes[i].indexes[j]].descrizione,
                                        unitaOperativa: rispostaRequest[ImpegnativaIndexes[i].indexes[j]].unitaOperativa,
                                        nomeStruttura: rispostaRequest[ImpegnativaIndexes[i].indexes[j]].nomeStruttura,
                                        nomeMedico: rispostaRequest[ImpegnativaIndexes[i].indexes[j]].nomeMedico,
                                        ubicazioneReparto: rispostaRequest[ImpegnativaIndexes[i].indexes[j]].ubicazioneReparto,
                                        ubicazioneUnita: rispostaRequest[ImpegnativaIndexes[i].indexes[j]].ubicazioneUnita,
                                        latitudine: rispostaRequest[ImpegnativaIndexes[i].indexes[j]].latitudine,
                                        longitudine: rispostaRequest[ImpegnativaIndexes[i].indexes[j]].longitudine
                                    });
                                }
                            }
                        }
                        prenotazione.dataPrenotazione = rispostaRequest[ImpegnativaIndexes[i].indexes[0]].dataPrenotazione;
                        prenotazione.dataEmissioneRicetta = rispostaRequest[ImpegnativaIndexes[i].indexes[0]].dataEmissioneRicetta;
                        prenotazione.classePriorita = rispostaRequest[ImpegnativaIndexes[i].indexes[0]].classePriorita;
                        prenotazione.termid = rispostaRequest[ImpegnativaIndexes[i].indexes[0]].termid;
                        prenotazione.tipoPrenotazione = rispostaRequest[ImpegnativaIndexes[i].indexes[0]].tipoPrenotazione;
                        prenotazione.dataAccettazione = rispostaRequest[ImpegnativaIndexes[i].indexes[0]].dataAccettazione;
                        prenotazione.codiceFiscale = req.body.codice_fiscale;
                        listaAppuntamenti.push(prenotazione);
                    }
                    res.status(200).send(listaAppuntamenti);
                });
            });
        });
    });
};

/*
router.get('/strutturaPreferita', function (req, res) {
    if (utenti.db._readyState !== 1)
        return res.status(500).send('Il servizio non è momentaneamente disponibile');
    else {
        let token = req.headers['x-access-token'];
        if (!token) return res.status(401).send({auth: false, message: 'Nessun token trovato'});
        jwt.verify(token, utils.access_seed', function (err, decoded) {
            if (err) return res.status(500).send({auth: false, message: 'Autenticazione del token fallita'});
            utenti.findById(decoded.id, {password: 0}, function (err, user) {
                if (err) return res.status(500).send("Errore nella ricerca utente");
                if (!user) return res.status(404).send("Utente non trovato");
                if (!user.struttura_preferita)
                    res.status(200).send({scelta: false, struttura: ""});
                else
                    res.status(200).send({scelta: true, struttura: user.struttura_preferita});
            });
        });
    }
});

router.post('/strutturaPreferita', function (req, res) {
    if (utenti.db._readyState !== 1)
        return res.status(500).send('Il servizio non è momentaneamente disponibile');
    else{
        let token = req.headers['x-access-token'];
        if (!token) return res.status(401).send({auth: false, message: 'Nessun token trovato'});
        jwt.verify(token, utils.access_seed', function (err, decoded) {
            if (err) return res.status(500).send({auth: false, message: 'Autenticazione del token fallita'});
            utenti.findById(decoded.id, {password: 0}, function (err, user) {
                if (err) return res.status(500).send("Errore nella ricerca utente");
                if (!user) return res.status(404).send("Utente non trovato");
                user.struttura_preferita = req.body.struttura;
                user.save(function (err, updateUser) {
                    if (err) return res.status(500).send("Operazione non riuscita");
                    res.status(200).send("Operazione riuscita");
                })
            });
        });
    }
});
*/

/*
La funzione aggiorna il token di un utente, richiede il token di accesso
ai servizi [x-access-token]
 */
exports.updateTokenNotifiche = function (req, res) {
    if (!req.headers.hasOwnProperty('x-access-token')) //Controlla se il campo x-access-token è presente
        res.status(417).send(false);
    let token = req.headers['x-access-token'];
    if (utenti.db._readyState !== 1) //Controlla se il database è pronto per la comunicazione
        return res.status(503).send(false);
    jwt.verify(token, utils.access_seed, function (err, decoded) { //Verifica e decodifica il token di accesso
        if (err) return res.status(401).send(false);
        /*
        Cerca il documento dell'utente attraverso il token di accesso
         */
        utenti.findById(decoded.id, {password: 0}, function (err, user) {
            if (err) return res.status(503).send(false);
            if (!user) return res.status(404).send(false); //Documento non trovato
            /*
            Aggiorna il campo tokenNotifiche
             */
            user.tokenNotifiche = req.body.tokenNotification;
            user.save(function (err, updateUser) {
                if (err) return res.status(503).send(false);
                res.status(200).send(true);
            });
        });
    });
};

/*
La funzione elimina l'account di un utente, tale operazione rimuove l'intero documento relativo all'utente.
Richiede il token di accesso [x-access-token]
 */
exports.eliminaAccount = function (req, res) {
    if (!req.headers.hasOwnProperty('x-access-token')) //Controlla se il campo x-access-token è presente
        return res.status(417).send("Accesso non autorizzato");
    let token = req.headers['x-access-token'];
    if (utenti.db._readyState !== 1) //Controlla se il database è pronto per la comunicazione
        return res.status(503).send('Il servizio non è momentaneamente disponibile');
    jwt.verify(token, utils.access_seed, function (err, decoded) { //Verifica e decodifica il token di accesso
        if (err) return res.status(401).send('Autenticazione fallita');
        //Elimina l'account
        utenti.remove({_id: decoded.id}, function (err) {
            if (err) return res.status(503).send("Il servizio non è momentaneamente disponibile");
            res.status(200).send("L'account è stato eliminato con successo");
        });
    });
};

/*
La funzione annulla l'impegnativa che l'utente ha confermato, quindi si fa accesso alla sua
lista appuntamenti. Richiede il token di accesso [x-access-token]
 */
exports.annullaImpegnativa = function (req, res) {
    if (!req.headers.hasOwnProperty('x-access-token') || !req.headers.hasOwnProperty('struttura')) //Controlla se il campo x-access-token è presente
        return res.status(417).send("Accesso non autorizzato");
    if (!req.body.hasOwnProperty('codiceImpegnativa') || (!req.body.hasOwnProperty('assistito') && !req.body.assistito.hasOwnProperty('codice_fiscale'))) //Controlla se il campo codiceImpegnativa è presente
        return res.status(400).send("La richiesta non può essere elaborata");
    let token = req.headers['x-access-token'];
    if (utenti.db._readyState !== 1) //Controlla se il database è pronto per la comunicazione
        return res.status(503).send("Impossibile annullare l'impegnativa, rivolgersi al call center");
    jwt.verify(token, utils.access_seed, function (err, decoded) { //Verifica e decodifica il token di accesso
        if (err) return res.status(401).send("Autenticazione fallita");
        strutture.findOne({codice_struttura: req.headers.struttura}, function (err, structure) {
            if (err) return res.status(503).send("Il servizio non è momentaneamente disponibile");
            if (!structure) return res.status(404).send("Struttura non trovata");
            /*
        Ricerca il documento relativo all'utente attraverso il campo _id identificato dal token
        di accesso

        utenti.findOne({_id : decoded.id}, function (err, user) {
            if (err) return res.status(503).send("Impossibile annullare l'impegnativa, rivolgersi al call center");
            if (!user) return res.status(404).send("Impossibile annullare l'impegnativa, rivolgersi al call center");
            let removeIndex = -1; //Contiene l'indice dell'impegnativa da annullare, -1 equivale a impegnativa non trovata
            for (let i=0;i<user.prenotazioni.length;i++){
                if (user.prenotazioni[i].codiceImpegnativa === req.body.codiceImpegnativa) {
                    removeIndex = i; //recupera l'indice dell'impegnativa da annullare
                    break;
                }
            }
            if (removeIndex > -1){ //Se l'impegnativa è stata trovata */
            //utenti.findOne({_id: decoded.id}, function (err, user) {
            //  if (err) return res.status(503).send("Impossibile annullare l'impegnativa, rivolgersi al call center");
            // if (!user) return res.status(404).send("Impossibile annullare l'impegnativa, rivolgersi al call center");
            // let removeIndex = -1; //Contiene l'indice dell'impegnativa da annullare, -1 equivale a impegnativa non trovata

            let options = {
                method: 'POST',
                uri: structure.variabili_logicaDati.host + req.headers['struttura'] + '/annullamentoimpegnativa',
                body: {
                    nre: req.body.codiceImpegnativa,
                    cf: req.body.assistito.codice_fiscale
                },
                json: true
                // JSON stringifies the body automatically
            };
            request.post(options, function (err, response, body) {
                utenti.findById(decoded.id, function (errUser, user) {
                    let messaggio = {
                        app_id: "821d395a-09ed-48a4-81b8-4a79971452eb",
                        headings: {en: "Reminder", it: "Promemoria"},
                        contents: {en: "", it: ""},
                        include_player_ids: [],
                        ios_sound: "onesignal_default_sound.wav"
                    };


                    if (errUser) return console.info("Errore in query database per ottenere le informazioni dell'utente in annullamento impegnativa");
                    if (!user) return console.info("Utente non trovato in query database per ottenere le informazioni dell'utente in annullamento impegnativa");
                    if (!user.tokenNotifiche)
                        return console.info("L'utente non possiede il token per le notifiche (h effettuato il logout dall'applicazione)");
                    messaggio.include_player_ids.push(user.tokenNotifiche);
                    if (response.statusCode === 200 || body.code === "200") {
                        messaggio.contents.it = "L'impegnativa è ora disponibile";
                        messaggio.contents.en = "L'impegnativa è ora disponibile";
                    }
                    else {
                        messaggio.contents.it = "L'annullamento dell'impegnativa non è andato a buon fine";
                        messaggio.contents.en = "L'annullamento dell'impegnativa non è andato a buon fine";
                    }
                    /*
                    variabile contenente gli headers da inviare in una POST al servizio di notifiche di one signal
                    */
                    let headers = {
                        "Content-Type": "application/json; charset=utf-8",
                        "Authorization": "Basic NzQ2MjkzMzgtNmQwYy00Y2NkLTk2OTgtODdiM2YxZTY0ZDYz"
                    };

                    /*
                    opzioni per la chiamata REST
                     */
                    let optionsNotifiche = {
                        host: "onesignal.com",
                        port: 443,
                        path: "/api/v1/notifications",
                        method: "POST",
                        headers: headers
                    };
                    /*
    Richiesta di invio di una notifica, la richiesta restituisce l'identificativo del messaggio
     */
                    let req = https.request(optionsNotifiche, function (res) {
                        res.on('data', function (data) {
                            //console.log("Risposta: ");
                            //console.log(JSON.parse(data));
                        });
                    });

                    /*
                    Callback che cattura l'evento error della chiamata REST
                     */
                    req.on('error', function (e) {
                        console.info("Errore in invio notifiche per l'annullamento dell'impegnativa");
                    });

                    /*
                    Invia al servizio di notifiche di one signal il messaggio e i destinatari di quest'ultimo
                     */
                    req.write(JSON.stringify(messaggio));
                    req.end();
                });
            });
            res.status(200).send("La richiesta per rendere l'impegnativa disponibile è stato inviata. Riceverai una notifica dell'esito dell'operazione");
        });
    });

    /*
    user.prenotazioni.splice(removeIndex,1);
    user.save(function (err, updateUser) {
        if (err) return res.status(503).send("Impossibile annullare l'impegnativa, rivolgersi al call center");
    });
}
else{
    res.status(404).send("L'impegnativa non è stata trovata");
}*/
    //});
    //});
};

/*
La funzione recupera le informazioni della prenotazione sospesa,
richiede il token di accesso [x-access-token]
 */
exports.recuperaPrenotazionePending = function (req, res) {
    if (!req.headers.hasOwnProperty('x-access-token')) //Controlla se il campo x-access-token è presente
        return res.status(417).send('Accesso non autorizzato');
    if (utenti.db._readyState !== 1) //Controlla se il database è pronto per la comunicazione
        return res.status(503).send('Il servizio non è momentaneamente disponibile');
    let token = req.headers['x-access-token'];
    jwt.verify(token, utils.access_seed, function (err, decoded) { //Verifica e decodifica il token di accesso
        if (err) return res.status(401).send('Autenticazione fallita');
        /*
        Ricerca la prenotazione sospesa dell'utente che ha come id l'id dell'utente. L'id
        dell'utente si ottiene decodificando il token
         */
        prenotazionitemp.findOne({idUser: decoded.id}, function (err, prenotazioni) {
            if (err || !prenotazioni) return res.status(404).send("Non ci sono prenotazioni in sospeso");
            res.status(200).send(prenotazioni);
        });
    });
};

/*
La funzione annulla la prenotazione sospesa dell'utente, richiede il token
di accesso.
 */
exports.annullaPrenotazioneTemp = function (req, res) {
    if (!req.headers.hasOwnProperty('x-access-token') || !req.headers.hasOwnProperty('struttura')) //Controlla se il campo x-access-token è presente
        return res.status(417).send("Accesso non autorizzato");
    if (utenti.db._readyState !== 1) //Controlla se il database è pronto per la comunicazione
        return res.status(503).send('Il servizio non è momentaneamente disponibile');
    let token = req.headers['x-access-token'];
    jwt.verify(token, utils.access_seed, function (err, decoded) { //Verifica e decodifica il token di accesso
        if (err) return res.status(401).send('Autenticazione fallita');
        strutture.findOne({codice_struttura: req.headers.struttura}, function (err, structure) {
            if (err) return res.status(503).send("Il servizio non è momentaneamente disponibile");
            if (!structure) return res.status(404).send("Struttura non trovata");
            prenotazionitemp.findOne({idUser: decoded.id}, function (err, data) {
                if (err || !data) {
                    return res.status(404).send("Non sono presenti prestazioni in sospeso");
                }
                prenotazionitemp.remove({idUser: decoded.id}, function (err) {
                    if (err) {
                        return res.status(404).send("Non sono presenti prestazioni in sospeso");
                    }
                    let options = {
                        method: 'POST',
                        uri: structure.variabili_logicaDati.host + req.headers['struttura'] + '/annullamentoimpegnativa',
                        body: {
                            nre: data.nre,
                            cf: data.assistito.codice_fiscale
                        },
                        json: true
                        // JSON stringifies the body automatically
                    };
                    request(options, function (err, response, body) {
                        utenti.findById(decoded.id, function (errUser, user) {
                            let messaggio = {
                                app_id: "821d395a-09ed-48a4-81b8-4a79971452eb",
                                headings: {en: "Reminder", it: "Promemoria"},
                                contents: {en: "", it: ""},
                                include_player_ids: [],
                                ios_sound: "onesignal_default_sound.wav"
                            };
                            if (errUser) return console.info("Errore in query database per ottenere le informazioni dell'utente in annullamento impegnativa");
                            if (!user) return console.info("Utente non trovato in query database per ottenere le informazioni dell'utente in annullamento impegnativa");
                            if (!user.tokenNotifiche)
                                return console.info("L'utente non possiede il token per le notifiche (h effettuato il logout dall'applicazione)");
                            messaggio.include_player_ids.push(user.tokenNotifiche);
                            if (response.statusCode === 200 || body.code === "200") {
                                messaggio.contents.it = "L'impegnativa è ora disponibile";
                                messaggio.contents.en = "L'impegnativa è ora disponibile";
                            }
                            else {
                                messaggio.contents.it = "L'annullamento dell'impegnativa non è andato a buon fine";
                                messaggio.contents.en = "L'annullamento dell'impegnativa non è andato a buon fine";
                            }
                            /*
                            variabile contenente gli headers da inviare in una POST al servizio di notifiche di one signal
                            */
                            let headers = {
                                "Content-Type": "application/json; charset=utf-8",
                                "Authorization": "Basic NzQ2MjkzMzgtNmQwYy00Y2NkLTk2OTgtODdiM2YxZTY0ZDYz"
                            };

                            /*
                            opzioni per la chiamata REST
                             */
                            let optionsNotifiche = {
                                host: "onesignal.com",
                                port: 443,
                                path: "/api/v1/notifications",
                                method: "POST",
                                headers: headers
                            };
                            /*
            Richiesta di invio di una notifica, la richiesta restituisce l'identificativo del messaggio
             */
                            let req = https.request(optionsNotifiche, function (res) {
                                res.on('data', function (data) {
                                    console.log("Risposta: ");
                                    console.log(JSON.parse(data));
                                });
                            });

                            /*
                            Callback che cattura l'evento error della chiamata REST
                             */
                            req.on('error', function (e) {
                                console.info("Errore in invio notifiche per l'annullamento dell'impegnativa");
                            });

                            /*
                            Invia al servizio di notifiche di one signal il messaggio e i destinatari di quest'ultimo
                             */
                            req.write(JSON.stringify(messaggio));
                            req.end();
                        });
                    });
                    res.status(200).send("La richiesta per rendere l'impegnativa disponibile è stato inviata. Riceverai una notifica dell'esito dell'operazione");
                });
            });
        });
    });
};

/*
La funzione recupera la lista degli appuntamenti (futuri e passati) dell'utente, richiede l'invio
del token di accesso [x-access-token]
 */
exports.listaappuntamentiFuturiEPassati = function (req, res) {
    if (!req.headers.hasOwnProperty('x-access-token')) //Controlla se il campo x-access-token è presente
        return res.status(417).send("Accesso non autorizzato");
    if (!req.body.hasOwnProperty('codice_fiscale')) //Controlla se il campo codice_fiscale è presente
        return res.status(400).send("La richiesta non può essere elaborata");
    let token = req.headers['x-access-token'];
    if (utenti.db._readyState !== 1) //Controlla se il database è pronto per la comunicazione
        return res.status(503).send("Il servizio non è momentaneamente disponibile");
    jwt.verify(token, utils.access_seed, function (err, decoded) { //Verifica e decodifica il token ricevuto
        if (err) return res.status(401).send("Autenticazione fallita");
        /*
        Cerca il documento relativo all'utente attraverso il token
         */
        utenti.findById(decoded.id, {prenotazioni: 1, _id: 0}, function (err, user) {
            if (err) return res.status(503).send("Il servizio non è momentaneamente disponibile");
            if (!user) return res.status(404).send("Utente non trovato"); //Documento non trovato
            let listaAppuntamenti = [];
            /*
            Recupera tutti gli appuntamenti dell'utente, se ci sono
             */
            for (let i = 0; i < user.prenotazioni.length; i++) {
                if (user.prenotazioni[i].assistito.codice_fiscale === req.body.codice_fiscale) {
                    listaAppuntamenti.push(user.prenotazioni[i]);
                }
            }
            /*
            Se sono stati trovati gli appuntamenti questi vengono ordinati
             */
            if (listaAppuntamenti.length > 1) {
                for (let t = 0; t < listaAppuntamenti.length - 1; t++) {
                    let posmin = t;
                    for (let k = t + 1; k < listaAppuntamenti.length; k++) {
                        let meseA, meseB;
                        if (listaAppuntamenti[posmin].appuntamenti[0].dataAppuntamento.charAt(3) === "0")
                            meseA = parseInt(listaAppuntamenti[posmin].appuntamenti[0].dataAppuntamento.charAt(4)) - 1;
                        else
                            meseA = parseInt(listaAppuntamenti[posmin].appuntamenti[0].dataAppuntamento.substring(3, 5)) - 1;
                        if (listaAppuntamenti[k].appuntamenti[0].dataAppuntamento.charAt(3) === "0")
                            meseB = parseInt(listaAppuntamenti[k].appuntamenti[0].dataAppuntamento.charAt(4)) - 1;
                        else
                            meseB = parseInt(listaAppuntamenti[k].appuntamenti[0].dataAppuntamento.substring(3, 5)) - 1;
                        let data1 = moment({
                            years: listaAppuntamenti[posmin].appuntamenti[0].dataAppuntamento.substring(6),
                            months: meseA.toString(),
                            date: listaAppuntamenti[posmin].appuntamenti[0].dataAppuntamento.substring(0, 2)
                        });
                        let data2 = moment({
                            years: listaAppuntamenti[k].appuntamenti[0].dataAppuntamento.substring(6),
                            months: meseB,
                            date: listaAppuntamenti[k].appuntamenti[0].dataAppuntamento.substring(0, 2)
                        });
                        if (data1.isBefore(data2) === false) //data1 è più vicina a oggi rispetto data2
                            posmin = k;
                    }
                    if (posmin !== t) {
                        let temp = listaAppuntamenti[t];
                        listaAppuntamenti[t] = listaAppuntamenti[posmin];
                        listaAppuntamenti[posmin] = temp;
                    }
                }
                /*
                                setTimeout(function () {
                                    res.status(200).send(listaAppuntamenti);
                                },2000);*/
            }
            res.status(200).send(listaAppuntamenti);
        });
    });
};

/*
La funzione verifica le credenziali dal sito web
 */
exports.manager = function (req, res) {
    if (req.body.user !== "MobileDevelopment" && req.body.pwd !== "Sviluppo1!")
        res.send({"status": 404, "message": "Credenziali Errate"});
    else
        res.send({"status": 200, "message": "/menu"});
};

exports.listaMediciComboBox = function (req, res) {
    if (!req.headers.hasOwnProperty('x-access-token')) //Controlla se il campo x-access-token è presente
        return res.status(417).send("Accesso non autorizzato");
    if (utenti.db._readyState !== 1)
        return res.status(503).send('Il servizio non è momentaneamente disponibile');
    let token = req.headers['x-access-token'];
    jwt.verify(token, utils.access_seed, function (err, decoded) { //Verifica e decodifica il token ricevuto
        if (err) return res.status(401).send("Autenticazione fallita");
        utenti.findById(decoded.id, {password: 0}, function (err, user) {
            if (err) return res.status(503).send("Errore nella ricerca utente");
            if (!user) return res.status(404).send("Utente non trovato");
            res.status(200).send(user.listaMedici);
        });
    });
};

exports.richiestaPasswordSmarrita = function (req, res) {
    if (!req.body.hasOwnProperty('email'))
        return res.status(417).send('Accesso non autorizzato');
    if (utenti.db._readyState !== 1)
        return res.status(503).send('Il servizio non è momentaneamente disponibile');
    utenti.findOne({email: req.body.email}, {password: 0}, function (err, user) {
        if (err) return res.status(503).send("Errore nella ricerca utente");
        if (!user) return res.status(404).send("Utente non trovato");
        let token = jwt.sign({id: user._id}, utils.access_seed, { //Crea il token di accesso ai servizi
            expiresIn: 86400 // expires in 24 hours
        });
        let options = {
            method: 'POST',
            uri: 'http://10.10.13.43:3000/sendEmail',
            body: {
                chiamante: "CUPT",
                titolo: "Modifica password",
                link: "http://ecuptservice.ak12srl.it/auth/pagemodpassw?id=" + token,
                sottotitolo: "Per recuperare la password clicca sul pulsante in basso",
                to: user.email,
                subject: "Richiesta modifica password"
            },
            json: true
            // JSON stringifies the body automatically
        };
        request(options, function (err, response, body) {
            if (err || body !== true) return res.status(500).send("L'email non è stata inviata");
            res.status(200).send("La richiesta è stata elaborata a breve riceverai un email per continuare l'operazione");
        });
    });
};

exports.renderModPassw = function (req, res) {
    if (!req.query || !req.query.id)
        return res.render('error', {
            error: {
                status: 417,
                stack: "Si sta tentando di accedere in un area privata senza privilegi di accesso"
            }, message: "Accesso non autorizzato"
        });
    jwt.verify(req.query.id, utils.access_seed, function (err, decoded) {
        if (err) return res.render('error', {
            error: {
                status: 417,
                stack: "Si sta tentando di accedere in un area privata senza privilegi di accesso"
            }, message: "Accesso non autorizzato"
        });
        res.render('modificapass', {title: "e-CUPT"});
    });
};

exports.modificaPass = function (req, res) {
    if (utenti.db._readyState !== 1)
        return res.status(503).send("Il servizio non è momentaneamente disponibile");
    if (!req.body.hasOwnProperty("id") || !req.body.hasOwnProperty("password"))
        return res.status(400).send("La richiesta non può essere elaborata");
    jwt.verify(req.body.id, utils.access_seed, function (err, decoded) {
        if (err) return res.status(417).send("Accesso non autorizzato");
        utenti.findById(decoded.id, function (err, user) {
            if (err) return res.status(500).send("Il servizio non è momentaneamente disponibile");
            if (!user) return res.status(404).send("Utente non trovato");
            user.password = bcrypt.hashSync(req.body.password, 8);
            user.save(function (err, updateUser) {
                if (err) return res.status(500).send("Il servizio non è momentaneamente disponibile");
                res.status(200).send("La password è stata modificata con successo");
            });
        });
    });
};

exports.modificaContatto = function (req, res) {
    if (utenti.db._readyState !== 1)
        return res.status(503).send("Il servizio non è momentaneamente disponibile");
    if (!req.headers.hasOwnProperty('x-access-token') || !req.body.hasOwnProperty('codice_fiscale'))
        return res.status(400).send("La richiesta non può essere elaborata");
    let token = req.headers["x-access-token"];
    jwt.verify(token, utils.access_seed, function (err, decoded) {
        if (err) return res.status(417).send("Accesso non autorizzato");
        utenti.findById(decoded.id, function (err, user) {
            if (err) return res.status(500).send("Il servizio non è momentaneamente disponibile");
            if (!user) return res.status(404).send("Utente non trovato");
            let trovato = false;
            if (user.codice_fiscale === req.body.codice_fiscale) {//Utente principale
                user.comune_residenza = req.body.comune_residenza;
                user.telefono = req.body.telefono;
                user.istatComuneResidenza = req.body.istatComuneResidenza;
                user.email = req.body.email;
                user.provincia = req.body.provincia;
                user.statocivile = req.body.statocivile;
                user.codStatoCivile = req.body.codStatoCivile;
                user.indirizzores = req.body.indirizzores;
                trovato = true;
            }
            else {
                for (let i = 0; i < user.contatti.length; i++) {
                    if (user.contatti[i].codice_fiscale === req.body.codice_fiscale) {
                        user.contatti[i].comune_residenza = req.body.comune_residenza;
                        user.contatti[i].telefono = req.body.telefono;
                        user.contatti[i].istatComuneResidenza = req.body.istatComuneResidenza;
                        user.contatti[i].email = req.body.email;
                        user.contatti[i].statocivile = req.body.statocivile;
                        user.contatti[i].codStatoCivile = req.body.codStatoCivile;
                        user.contatti[i].indirizzores = req.body.indirizzores;
                        user.contatti[i].provincia = req.body.provincia;
                        trovato = true;
                        break;
                    }
                }
            }
            if (!trovato)
                return res.status(404).send("Assistito non trovato");
            user.save(function (err, updateUser) {
                if (err) return res.status(500).send("Il servizio non è momentaneamente disponibile");
                res.status(200).send("La modifica è avvenuta con successo");
            });
        });
    });
};

exports.annullaImpegnativaWeb = function (req, res) {
    if (!req.headers.hasOwnProperty('x-access-token') || !req.headers.hasOwnProperty('struttura')) //Controlla se il campo x-access-token è presente
        return res.status(417).send("Accesso non autorizzato");
    if (!req.body.hasOwnProperty('codiceImpegnativa') || (!req.body.hasOwnProperty('assistito') && !req.body.hasOwnProperty('codice_fiscale'))) //Controlla se il campo codiceImpegnativa è presente
        return res.status(400).send("La richiesta non può essere elaborata");
    let token = req.headers['x-access-token'];
    if (utenti.db._readyState !== 1) //Controlla se il database è pronto per la comunicazione
        return res.status(503).send("Impossibile annullare l'impegnativa, rivolgersi al call center");
    jwt.verify(token, utils.access_seed, function (err, decoded) { //Verifica e decodifica il token di accesso
        if (err) return res.status(401).send("Autenticazione fallita");
        strutture.findOne({codice_struttura: req.headers.struttura}, function (err, structure) {
            if (err) return res.status(503).send("Il servizio non è momentaneamente disponibile");
            if (!structure) return res.status(404).send("Struttura non trovata");
            /*
        Ricerca il documento relativo all'utente attraverso il campo _id identificato dal token
        di accesso

        utenti.findOne({_id : decoded.id}, function (err, user) {
            if (err) return res.status(503).send("Impossibile annullare l'impegnativa, rivolgersi al call center");
            if (!user) return res.status(404).send("Impossibile annullare l'impegnativa, rivolgersi al call center");
            let removeIndex = -1; //Contiene l'indice dell'impegnativa da annullare, -1 equivale a impegnativa non trovata
            for (let i=0;i<user.prenotazioni.length;i++){
                if (user.prenotazioni[i].codiceImpegnativa === req.body.codiceImpegnativa) {
                    removeIndex = i; //recupera l'indice dell'impegnativa da annullare
                    break;
                }
            }
            if (removeIndex > -1){ //Se l'impegnativa è stata trovata */
            //utenti.findOne({_id: decoded.id}, function (err, user) {
            //  if (err) return res.status(503).send("Impossibile annullare l'impegnativa, rivolgersi al call center");
            // if (!user) return res.status(404).send("Impossibile annullare l'impegnativa, rivolgersi al call center");
            // let removeIndex = -1; //Contiene l'indice dell'impegnativa da annullare, -1 equivale a impegnativa non trovata

            let options = {
                method: 'POST',
                uri: structure.variabili_logicaDati.host + req.headers['struttura'] + '/annullamentoimpegnativa',
                body: {
                    nre: req.body.codiceImpegnativa,
                    cf: req.body.assistito.codice_fiscale
                },
                json: true
                // JSON stringifies the body automatically
            };
            request.post(options, function (err, response, body) {
                utenti.findById(decoded.id, function (errUser, user) {
                    if (errUser) return res.status(500).send("Il servizio non è momentaneamente disponibile");
                    if(!user) return res.status(404).send("Utente non trovato");
                    if (response.statusCode === 200 || body.code === "200")
                        return res.status(200).send("L'impegnativa è ora disponibile");
                    res.status(response.statusCode).send("Non è stato possibile rendere l'impegnativa di nuovo disponibile");
                });
            });
        });
    });

    /*
    user.prenotazioni.splice(removeIndex,1);
    user.save(function (err, updateUser) {
        if (err) return res.status(503).send("Impossibile annullare l'impegnativa, rivolgersi al call center");
    });
}
else{
    res.status(404).send("L'impegnativa non è stata trovata");
}*/
    //});
    //});
};

exports.annullaPrenotazioneTempWeb = function (req,res){
    if (!req.headers.hasOwnProperty('x-access-token') || !req.headers.hasOwnProperty('struttura')) //Controlla se il campo x-access-token è presente
        return res.status(417).send("Accesso non autorizzato");
    if (utenti.db._readyState !== 1) //Controlla se il database è pronto per la comunicazione
        return res.status(503).send('Il servizio non è momentaneamente disponibile');
    let token =  req.headers['x-access-token'];
    jwt.verify(token,utils.access_seed, function (err, decoded) { //Verifica e decodifica il token di accesso
        if (err) return res.status(401).send('Autenticazione fallita');
        strutture.findOne({codice_struttura:req.headers.struttura}, function (err, structure) {
            if(err) return res.status(503).send("Il servizio non è momentaneamente disponibile");
            if(!structure) return res.status(404).send("Struttura non trovata");
            prenotazionitemp.findOne({idUser: decoded.id}, function (err, data) {
                if (err || !data)
                    return res.status(404).send("Non sono presenti prestazioni in sospeso");
                prenotazionitemp.remove({idUser: decoded.id}, function (err) {
                    if (err){
                        return res.status(404).send("Non sono presenti prestazioni in sospeso");
                    }
                    let options = {
                        method: 'POST',
                        uri: structure.variabili_logicaDati.host + req.headers['struttura'] + '/annullamentoimpegnativa',
                        body: {
                            nre: data.nre,
                            cf : data.assistito.codice_fiscale
                        },
                        json: true
                        // JSON stringifies the body automatically
                    };
                    request(options,function (errReq, response, body){
                        if (errReq) return res.status(500).send("Il servizio non è momentaneamente disponibile");
                        if (response.statusCode === 200 || body.code === "200")
                            return res.status(200).send("L'impegnativa è ora disponibile");
                        res.status(response.statusCode).send("Non è stato possibile rendere l'impegnativa di nuovo disponibile");
                    });
                });
            });
        });
    });
};

exports.downloadme = function (req, res) {
    if (!req.headers.hasOwnProperty('x-access-token')) //Controlla se il campo x-access-token è presente
        return res.status(417).send("Accesso non autorizzato");
    if (utenti.db._readyState !== 1) //Controlla se il database è pronto per la comunicazione
        return res.status(503).send('Il servizio non è momentaneamente disponibile');
    let token =  req.headers['x-access-token'];
    jwt.verify(token, utils.access_seed, function (err, decoded) {
        if(err)
            return res.status(417).send("Accesso non autorizzato");
        utenti.findOne({_id : decoded.id},{_id:0,prenotazioni:0,listaMedici:0,password:0, __v:0, attivo: 0, tokenNotifiche: 0},function (errUser, user) {
            if(errUser)
                return res.status(503).send("Il servizio non è momentaneamente disponibile");
            if(!user)
                return res.status(404).send("Utente non trovato");
            let objectWrite = JSON.stringify(user);
            fs.writeFile(path.join(process.cwd(),'Applications/MCupMiddleware/jsonUsers') + "/" + user.nome + "-" + user.cognome + "-" + decoded.id.substr(2) + ".json", objectWrite, 'utf8', function (errWrite) {
                if(errWrite)
                    return res.status(400).send("Il servizio non è momentaneamente disponibile");
                let transporter = nodemailer.createTransport({
                    service: "Gmail",
                    auth: {
                        user: "ecuptservice.mail@gmail.com",
                        pass: "Sviluppoecupt!"
                    }
                });
                let mailOption = {
                    from: '"ecuptservice.mail@gmail.com" <ecuptservice.mail@gmail.com>',
                    to: user.email,
                    subject: "Richiesta informazioni personali",
                    text: "Gentile utente in allegato trova le sue informazioni personali utilizzate dai nostri servizi.",
                    attachments: [
                        {path : path.join(process.cwd(),'Applications/MCupMiddleware/jsonUsers') + "/" + user.nome + "-" + user.cognome + "-" + decoded.id.substr(2) + ".json"}
                    ]
                };
                transporter.sendMail(mailOption, function (err,info){
                    if(err)
                        return res.status(400).send("Il servizio non è momentaneamente disponibile");
                    else
                        res.status(200).send("La richiesta è stata elaborata correttamente. A breve riceverai una mail con in allegato le tue informazioni.");
                });
            });
        });
    });
};

exports.checkMe = function (req, res) {
    if (!req.headers.hasOwnProperty('x-access-token')) //Controlla se il campo x-access-token è presente
        return res.status(417).send("Accesso non autorizzato");
    if (utenti.db._readyState !== 1) //Controlla se il database è pronto per la comunicazione
        return res.status(503).send('Il servizio non è momentaneamente disponibile');
    let token =  req.headers['x-access-token'];
    jwt.verify(token, utils.access_seed, function (err, decoded) {
        utenti.findById(decoded.id, function (err, user) {
            if (err) return res.status(503).send('Il servizio non è momentaneamente disponibile');
            if (!user) return res.status(404).send('Utente non trovato');
            let passwordIsValid = bcrypt.compareSync(req.body.password, user.password);
            if (!passwordIsValid) return res.status(401).send("Accesso non autorizzato");
            res.status(200).send({check: true});
        });
    });
};