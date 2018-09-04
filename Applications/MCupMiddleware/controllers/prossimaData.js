var request = require('request');
/*
process.argv[2] : codicePrestazione, process.argv[3] : unitaOperativa, process.argv[4] : codiceReparto, process.argv[5] : struttura, process.argv[6] : data_inizio
 */
var arrayPrestazioni = [];
arrayPrestazioni[0] = {
    codice: {codPrest: process.argv[2], codReg: "", codprestazione: ""},
    codUnitaOp: process.argv[3],
    codReparto: parseInt(process.argv[4]),
    codSala: 0,
    sedute: 0,
    frequenza: 0
};
var options = {
    method: 'POST',
    uri: 'https://demo.gesan.it/cup/service/struttura/' + process.argv[7] + '/primadisponibilita',
    body: {
        prestazioni: arrayPrestazioni,
        preferenze: {dataInizio: process.argv[6], orarioInizio: ""},
        tipoPrenotazione: "A"
    },
    json: true
};
var esito = {
    stato : 0,
    dati : {}
};

request(options, function (err, response, body) {
    if (err){
        esito.dati.messaggio = "Errore nella ricerca delle disponibilita";
        esito.stato = 500;
        return console.log(JSON.stringify(esito));
    }
    if (!body) {
        esito.dati.messaggio = "Unita' non disponibili";
        esito.stato = 404;
        return console.log(JSON.stringify(esito));
    }
    var sender;
    if (body.data.primadisponibilita.esamiNonDisp.length === 0){
        esito.stato = 200;
        sender = {
            codPrestazione: body.data.primadisponibilita.proposte[0].proposta.esameProposta.esame.codPrest.toString(),
            descPrestazione: body.data.primadisponibilita.proposte[0].proposta.esameProposta.esame.desPrest,
            durataPrestazione: body.data.primadisponibilita.proposte[0].proposta.esameProposta.esame.durata.toString(),
            descReparto: body.data.primadisponibilita.proposte[0].proposta.disponibilita.desReparto,
            dataAppuntamento: body.data.primadisponibilita.proposte[0].proposta.disponibilita.dataAgenda,
            oraAppuntamento: body.data.primadisponibilita.proposte[0].proposta.disponibilita.oraAppuntamento,
            posizione: body.data.primadisponibilita.proposte[0].proposta.disponibilita.posto.toString(),
            orarioApertura: body.data.primadisponibilita.proposte[0].proposta.disponibilita.dalleOre,
            orarioChiusura: body.data.primadisponibilita.proposte[0].proposta.disponibilita.alleOre,
            codReparto: process.argv[4],
            unitaOperativa: process.argv[3],
            disponibile: true,
            termid: body.data.primadisponibilita.termid,
            nomeStruttura: process.argv[5]
        };
    }
    else{
        esito.stato = 501;
        sender = {
            codPrestazione: body.data.primadisponibilita.esamiNonDisp[0].esamiNonDisp.esame.codPrest.toString(),
            descPrestazione: body.data.primadisponibilita.esamiNonDisp[0].esamiNonDisp.esame.desPrest,
            durataPrestazione: "",
            descReparto: "",
            dataAppuntamento: "",
            oraAppuntamento: "",
            posizione: "",
            orarioApertura: "",
            orarioChiusura: "",
            nomeStruttura: "",
            disponibile: false
        }
    }
    esito.dati = sender;
    console.log(JSON.stringify(esito));
});