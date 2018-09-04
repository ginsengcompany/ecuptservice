let express = require('express');
let router = express.Router();
let codfiscinverso = require('../controllers/codfiscinversoController');

router.get('/', codfiscinverso.traduzioneCodFisc);

module.exports = router;