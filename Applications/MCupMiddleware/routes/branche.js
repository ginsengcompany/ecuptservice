let express = require('express');
let router = express.Router();
let brancheController = require('../controllers/brancheController');

router.get('/', brancheController.getBranche);

module.exports = router;