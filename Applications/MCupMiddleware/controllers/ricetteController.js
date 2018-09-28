let ricette = require('../models/ricette');
let struttura = require('../models/strutture');
let prenotazionitemp = require('../models/prenotazionitemp');
let jwt = require('jsonwebtoken');
let moment = require('moment');
let request = require('request');
let utils = require('../utils/util');

/*
La funzione restituisce le informazioni (prestazioni, classe di priorità, ecc...) della ricetta.
Al momento questa funzione simula l'invio dei dati al CUP che richiede le informazioni della ricetta a SOGEI utilizzando
il database.
Richiede il token di accesso e il codice della struttura per poter capire se utilizzare il codice regionale o
nazionale delle prestazioni in base alla regione della struttura e a quella in cui è stata emessa la ricetta
 */
exports.ricetta = function (req, res) {
    //Controlla se sono presenti i campi struttura e x-access-token
    if (!req.headers.hasOwnProperty('struttura') && !req.headers.hasOwnProperty('x-access-token'))
        return res.status(404).send("Accesso negato");
    let options = {
        method: 'GET',
        uri: 'https://api.myjson.com/bins/l5s0s',
        json: true
    };
    let token = req.headers['x-access-token'];
    jwt.verify(token, utils.access_seed, function (err, decoded){ //Verifica e decodifica il token di accesso
        if (!err){ //Se tutto OK
            struttura.findOne({codice_struttura: req.headers.struttura}, function (err, structure) {
                let sendObject;
               /* let options = {
                    method: 'POST',
                    uri: structure.variabili_logicaDati.host + req.headers.struttura + '/datiimpegnativa',
                    body: {
                        nre: req.body.nre,
                        cf : req.body.assistito.codice_fiscale,
                        nome : req.body.assistito.nome,
                        cognome : req.body.assistito.cognome
                    },
                    json : true
                }; */
            request(options,function (err, response, body){
                if(err) return res.status(500).send("Il servizio non è momentaneamente disponibile");
                if (body.code !== "200" || response.statusCode !== 200)
                        return res.status(parseInt(!body.code ? response.statusCode : body.code)).send(!body.message ? "Il servizio non è momentaneamente disponibile" : body.message);
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
                    if (prestazionePrenotata < body.data.elencoDettagliPrescrVisualErogato.length && prestazionePrenotata > 0)
                        return res.status(409).send("L'impegnativa risulta parzialmente prenotata. Si prega di contattare il call center al numero " + structure.contatto.numero_callCenter);
                    else if (prestazionePrenotata === body.data.elencoDettagliPrescrVisualErogato.length)
                        return res.status(409).send("L'impegnativa risulta già prenotata. Si prega di contattare il call center al numero " + structure.contatto.numero_callCenter);
                    sendObject = {
                        nre: req.body.nre,
                        dataEmissioneRicetta: body.data.dataCompilazione,
                        classePriorita : body.data.classePriorita,
                        prestazioni: prestazioni
                    };
                    /*
                    Crea o aggiorna una prenotazione sospesa
                    */
                    prenotazionitemp.findOne({idUser: decoded.id}, function (err, pren) {
                        //Se già esiste una prenotazione sospesa
                        if (pren){
                            pren.orarioUltimaRichiesta = moment().format("DD/MM/YYYY hh:mm:ss"); //Aggiorna la data e l'orario della richiesta
                            pren.save();
                        }
                        //Se non esiste una prenotazione sospesa
                        else{
                            prenotazionitemp.create({ //Crea il documento della prenotazione sospesa
                                idUser: decoded.id,
                                nre: sendObject.nre,
                                struttura : req.headers['struttura'],
                                orarioUltimaRichiesta : moment().format("DD/MM/YYYY hh:mm:ss"),
                                appuntamentoConfermato : false,
                                sar: req.body.sar,
                                dataEmissioneRicetta: body.data.dataCompilazione,
                                classePriorita : body.data.classePriorita,
                                assistito : req.body.assistito,
                                prestazioni : sendObject.prestazioni
                            }, function (err, prenotazioni) {

                            });
                        }
                    });
                    res.status(200).send(sendObject);
                });
            });
        }
        else
            return res.status(401).send("Autenticazione fallita");
    });
};