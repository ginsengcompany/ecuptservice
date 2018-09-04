let winston = require('winston');
let path = require('path');
const tsFormat = () => (new Date()).toLocaleTimeString();
winston.emitErrs = true;

let logger = new winston.Logger({
    transports: [
        new (require('winston-daily-rotate-file'))({
            level: 'silly',
            filename: path.join(process.cwd(),'Applications/MCupMiddleware/utils/logs/-log-file.log'),
            handleExceptions: true,
            datePattern: 'dd-MM-yyyy',
            prepend: true,
            timestamp: tsFormat,
        }),
        new winston.transports.Console({
            level: 'silly',
            timestamp: tsFormat(),
            handleExceptions: true,
            json: false,
            colorize: true
        })
    ],
    exitOnError: false
});

module.exports = logger;
module.exports.stream = {
    write: function(message){
        logger.silly(message);
    }
};
