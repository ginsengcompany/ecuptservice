let express = require('express');
let router = express.Router();
let struttureEprestazioniController = require('../controllers/struttureEprestazioniController');

router.get('/strutture',struttureEprestazioniController.getStrutture);

router.get('/ricercaprestazioni',struttureEprestazioniController.ricercaPrestazioni);

module.exports = router;