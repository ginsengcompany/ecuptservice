let mongoose = require('mongoose');
let terminiServizioSchema = new mongoose.Schema({
    termini_servizio: String
});
mongoose.model('terminiServizio', terminiServizioSchema);

module.exports = mongoose.model('terminiServizio');