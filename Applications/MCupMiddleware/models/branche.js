let mongoose = require('mongoose');
let brancheSchema = new mongoose.Schema({
    descrizione:    String,
    codice:    Number
});
mongoose.model('branche', brancheSchema);

module.exports = mongoose.model('branche');