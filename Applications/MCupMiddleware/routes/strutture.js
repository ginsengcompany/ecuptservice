let express = require('express');
let router = express.Router();
let struttureController = require('../controllers/struttureController'); //file che contiene le funzioni chiamate dalle rotte
let bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({extended: true}));
router.use(bodyParser.json());

/*
rotta infostruttura/infoChangeAppuntamento
restituisce il messaggio da visualizzare se l'utente vuole spostare l'appuntamento, il messaggio dipende da una variabile
all'interno del documento della collection struttures  relativo ad una struttura
 */
router.get('/infoChangeAppuntamento', struttureController.infoChangeAppuntamentoStruttura);

/*
rotta infostruttura/infoMoreReparti
restituisce il messaggio da visualizzare se una o più prestazioni hanno più reparti, il messaggio dipende da una variabile
all'interno del documento della collection struttures  relativo ad una struttura
 */
router.get('/infoMoreReparti', struttureController.infoMoreReparti);

/*
rotta infostruttura/logoStruttura
viene utilizzata per recuperare il logo di una struttura
 */
router.get('/logoStruttura', struttureController.logoStruttura);

/*
rotta per inserire una struttura nel database
 */
router.post('/inserisciStruttura', struttureController.inserimentoStruttura);

router.post('/inserisciLogo', struttureController.insertLogo);

router.get('/listaStrutture', struttureController.listaStrutture);

router.get('/', struttureController.infoStruttura);

router.get('/isAsl', struttureController.isAsl);

module.exports = router;