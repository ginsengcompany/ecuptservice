let express = require('express');
let bodyParser = require('body-parser');
let router = express.Router();
router.use(bodyParser.json());
let ricercaPrimaDisponibilitaController = require('../controllers/ricercaPrimaDisponibilitaController'); //file che contiene le funzioni chiamate dalle rotte

router.post('/', ricercaPrimaDisponibilitaController.primaDisponibilita);

router.post('/ricercaorario', ricercaPrimaDisponibilitaController.primaDsiponibilitaOrario);

router.post('/ricercadata', ricercaPrimaDisponibilitaController.primaDisponibilitaData);

module.exports = router;