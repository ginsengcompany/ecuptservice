let mongoose = require('mongoose');

let statocivileSchema = mongoose.Schema({
    ID: String,
    DESCRIZIONE: String
});

mongoose.model('statocivile', statocivileSchema);

module.exports = mongoose.model('statocivile');