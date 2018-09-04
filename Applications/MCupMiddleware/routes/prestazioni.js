let express = require('express');
let router = express.Router();
let prestazioniController = require('../controllers/prestazioniController');

router.get('/',prestazioniController.getprestazioni);

router.get('/prestazionibranca', prestazioniController.getprestazioniBranca);

module.exports = router;