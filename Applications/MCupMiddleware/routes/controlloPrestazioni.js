let express = require('express');
let router = express.Router();
let bodyParser = require('body-parser');
router.use(bodyParser.json());
let controlloPrestazioniController = require('../controllers/controlloPrestazioniStruttureController');

/*
rotta controlloPrestazioni
viene utilizzata per controllare se la struttura eroga le prestazioni contenute nell'impegnativa
 */
router.post('/',controlloPrestazioniController.controlloPrestazioni);

module.exports = router;