let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
router.use(bodyParser.json());
let disponibilitaPrestazioni = require('../controllers/ricercadisponibilitaprestazioniController'); //file che contiene le funzioni chiamate dalle rotte

/*
rotta ricercareparti
viene utilizzata per restituire i reparti che che erogano i servizi richiesti indicando:
l'unità operativa, l'ubicazione e la struttura in cui il reparto si trova e altre informazioni
 */
router.post('/', disponibilitaPrestazioni.ricercadisponibilitaprestazioni);

module.exports = router;