let express = require('express');
let router = express.Router();
let listaComuni = require('../controllers/listaComuniController'); //file che contiene le funzioni chiamate dalle rotte

/*
rotta comuni/listaprovince
viene utilizzata per recuperare la lista delle province
 */
router.get('/listaprovince', listaComuni.listaprovince);

/*
rotta comuni/listacomuni
utilizzata per recuperare la lista di comuni appartenenti ad una provincia
 */
router.post('/listacomuni', listaComuni.listacomuni);

router.get('/getByCodCatastale', listaComuni.comuneByCodCatastale);

module.exports = router;