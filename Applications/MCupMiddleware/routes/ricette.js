let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: true }));
let ricetteController = require('../controllers/ricetteController'); //file che contiene le funzioni chiamate dalle rotte

/*
rotta ricetta
viene utilizzata per recuperare le info di una ricetta (Simulazione)
 */
router.post('/',ricetteController.ricetta);

module.exports = router;