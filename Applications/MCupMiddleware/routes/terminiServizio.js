let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: true }));
let termini = require('../controllers/terminiServizioController'); //file che contiene le funzioni chiamate dalle rotte

/*
rotta terminiservizio
viene utilizzata per recuperare i termini di servizio che bisogna accettare se l'utente ha intenzione di registrarsi
al servizio
 */
router.get('/', termini.terminiServizio);
router.get('/display', function (req, res, next) {
    res.render('terminiservizio',{title:"Termini d'uso"})
});

module.exports = router;