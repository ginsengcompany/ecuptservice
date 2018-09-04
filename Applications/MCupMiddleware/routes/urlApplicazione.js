let express = require('express');
let router = express.Router();
let seriviziURLApplicazione = require('../controllers/serviziURLApplicazione'); //file che contiene le funzioni chiamate dalle rotte
let bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({extended: true}));
router.use(bodyParser.json());

/*
rotta urlserviziapp
viene utilizzata per recuperare tutte le rotte per gestire l'app mobile in base
alla struttura
 */
router.get('/',seriviziURLApplicazione.urlServizi);

module.exports = router;