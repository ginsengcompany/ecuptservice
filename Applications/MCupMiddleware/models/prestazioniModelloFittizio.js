let mongoose = require('mongoose');
let prestazioni = new mongoose.Schema({
    descrizione : String,
    codprest : Number,
    branca : Number
});

mongoose.model('prestazioni', prestazioni);

module.exports = mongoose.model('prestazioni');