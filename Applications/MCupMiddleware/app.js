let express = require('express');
let path = require('path');
let favicon = require('serve-favicon');
let logger = require('morgan');
let cookieParser = require('cookie-parser');
let bodyParser = require('body-parser');
let log = require("./utils/logger");

//Servizio App
let db = require('./utils/db');
let CronJob = require('cron');
let authController = require('./routes/auth');
let terminiServizioController = require('./routes/terminiServizio');
let ricetteController = require('./routes/ricette');
let refertiController = require('./routes/referti');
let controlloPrestazioniStruttureController = require('./routes/controlloPrestazioni');
let ricercaDisponibilita = require('./routes/ricercaDisponibilitaPrestazioni');
let ricercaPrimaDisponibilita = require('./routes/ricercaPrimaDisponibilita');
let listaComuni = require('./routes/listaComuni');
let listaStatoCivile = require('./routes/statoCivile');
//let cronNotifiche = require('./utils/cronNotifiche');
//let cronDisattivaUtente = require('./utils/cronDisattivaUtenti');
let serviziURLApplicazione = require('./routes/urlApplicazione');
let strutture = require('./routes/strutture');
//let cronPrenotazioniSospese = require('./utils/cronRimuoviPrenotazioniSospese');
let nazioni = require('./routes/nazioni');
let codfiscinverso = require('./routes/codfiscinverso');

//Servizi temporanei
let prestazioni = require('./routes/prestazioni');
let struttureEprestazioni = require('./routes/struttureEprestazioni');
let branche = require('./routes/branche');

//Web
let index = require('./routes/index');
const swaggerUi = require('swagger-ui-express');
//const YAML = require('yamljs');
//const swaggerDocument = YAML.load('./Applications/MCupMiddleware/api/swagger/swagger.yaml');
let app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public','favicon.ico')));
app.use(logger('combined'));
app.use(require('morgan')("combined",{ "stream": log.stream }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin","*");
    res.header("Access-Control-Allow-Methods","GET,PUT,POST,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers","Origin, X-Requested-With, x-access-token, struttura, Content-Type, Accept");
    next();
});

//Rotte Servizio App
app.use('/auth', authController);
app.use('/terminiservizio', terminiServizioController);
app.use('/ricetta', ricetteController);
app.use('/referti', refertiController);
app.use('/controlloPrestazioni', controlloPrestazioniStruttureController);
app.use('/ricercareparti',ricercaDisponibilita);
app.use('/ricercaprimadisponibilita',ricercaPrimaDisponibilita);
app.use('/comuni', listaComuni);
app.use('/statocivile', listaStatoCivile);
app.use('/urlserviziapp', serviziURLApplicazione);
app.use('/infostruttura', strutture);
app.use('/', index);
app.use('/codicefiscaleinverso', codfiscinverso);
//app.use('/api-docs',swaggerUi.serve,swaggerUi.setup(swaggerDocument));

//Servizi temporanei
app.use('/prestazioni',prestazioni);
app.use('/struttureEprestazioni',struttureEprestazioni);
app.use('/branche', branche);
app.use('/nazioni',nazioni);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    let err = new Error('e-cupt Service Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.locals.title = "e-cupt";
    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

process.on('uncaughtException', (err) => {
    process.send(err.message);
});

module.exports = app;

