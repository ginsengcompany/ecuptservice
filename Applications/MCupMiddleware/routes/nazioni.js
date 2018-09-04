let express = require('express');
let router = express.Router();
let nazioniController = require('../controllers/nazioniController');

router.get('/', nazioniController.getNazioni);

module.exports = router;