let mongoose = require('mongoose');
let comuniSchema = new mongoose.Schema({
    ID : String,
    DA4TAISTITUZIONE : String,
    DATACESSAZIONE : String,
    CODISTAT : String,
    CODCATASTALE : String,
    DENOMINAZIONE_IT : String,
    DENOMTRASLITTERATA : String,
    ALTRADENOMINAZIONE : String,
    ALTRADENOMTRASLITTERATA : String,
    IDPROVINCIA : String,
    IDREGIONE : String,
    IDPREFETTURA : String,
    STATO : String,
    SIGLAPROVINCIA : String,
    FONTE : String,
    DATAULTIMOAGG : String,
    COD_DENOM : String
});

mongoose.model('comuni', comuniSchema);

module.exports = mongoose.model('comuni');