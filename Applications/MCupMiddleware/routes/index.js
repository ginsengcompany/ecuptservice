let express = require('express');
let router = express.Router();
let indexController = require('../controllers/indexController');

/* GET home page. */
router.get('/', indexController.paginaIniziale);
/*
router.get('/newStruttura', indexController.paginaNuovaStruttura);

router.get('/menu', indexController.paginaMenu);

router.post('/verify', indexController.verifyIdentity);

router.get('/formLogoStruttura', indexController.paginaLogo);

router.get('/error', function (req, res) {
    res.render('error',{message:"Accesso Negato",error:{status: 401, stack: "autenticazione fallita"}});
});

router.get('/modificaStruttura', indexController.paginaModifica);
*/
module.exports = router;
