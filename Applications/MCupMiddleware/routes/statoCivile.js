let express = require('express');
let router = express.Router();
let statocivileController = require('../controllers/statoCivileController'); //file che contiene le funzioni chiamate dalle rotte

/*
rotta statocivile
viene utilizzata per recuperare la lista degli stati civili
 */
router.get('/',statocivileController.statoCivile);

module.exports = router;