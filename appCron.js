let path = require('path');
let logger = require('morgan');
let CronJob = require('cron');
let cronNotifiche = require('./Applications/MCupMiddleware/utils/cronNotifiche');
let cronDisattivaUtente = require('./Applications/MCupMiddleware/utils/cronDisattivaUtenti');
let cronPrenotazioniSospese = require('./Applications/MCupMiddleware/utils/cronRimuoviPrenotazioniSospese');
let dbCUPT = require('./Applications/MCupMiddleware/utils/db');

exports.startCronService = function () {
    new CronJob.CronJob('0 0 * * *', function() {
        cronNotifiche.elaboraNotifiche();
    }, null, true, 'Europe/Rome');

    new CronJob.CronJob('0 0 * * *', function () {
        cronDisattivaUtente.cronDisattivaUtenti();
    }, null, true, 'Europe/Rome');

    new CronJob.CronJob('*/5 * * * *', function () {
        cronPrenotazioniSospese.rimuoviPrenotazioniSospese();
    }, null, true, 'Europe/Rome');
};