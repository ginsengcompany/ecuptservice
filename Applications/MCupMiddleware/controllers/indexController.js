exports.paginaIniziale = function (req, res, next) {
    res.render('index',{title: "e-cupt"});
};

exports.paginaMenu = function (req, res) {
    res.render('menu',{title: "Menu"});
};

exports.paginaNuovaStruttura = function (req, res) {
    res.render('formNuovaStruttura',{title: "Nuova Struttura"});
};

exports.verifyIdentity = function (req, res) {
    if (req.body.user !== "MobileDevelopment" || req.body.pass !== "Sviluppo1!")
        res.send({status: 404,message: "Accesso non consentito"});
    else
        res.send({status: 200, message:""});
};

exports.paginaModifica = function (req, res) {
    res.render('formModificaStruttura',{title: "Modifica Struttura"});
};

exports.paginaLogo = function (req, res) {
    res.render('formLogoStruttura', {title: "Logo Struttura"});
};