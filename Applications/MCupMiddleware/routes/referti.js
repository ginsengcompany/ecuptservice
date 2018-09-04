let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: true }));
let refertiController = require('../controllers/refertiController'); //file che contiene le funzioni chiamate dalle rotte

/**
 * A partire dalla rotta referti è possibile accedere alle seguenti funzioni associate ad interfaccia REST:
 *
 * /prelevarefertiutente
 * serve ad accedere alla lista di tutti i referti disponibili di un utente presenti nella struttura
 *
 * /accedirefertoutente
 * serve ad accedere ad un determianto documento per visualizzarlo nel browser
 **/

// viene utilizzata per recuperare le info di tutti i referti associato ad un paziente
router.post('/prelevarefertiutente',refertiController.prelevaRefertiUtente);

// viene utilizzata per scaricare il referto di un paziente
router.post('/scaricareferto',refertiController.scaricaReferto);

// viene utilizzata per inviare i referti tramite e mail
router.post('/inviarefertoemail',refertiController.inviaRefertiPosta);

module.exports = router;