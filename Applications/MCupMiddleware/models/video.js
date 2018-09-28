let mongoose = require('mongoose');
let videoSchema = new mongoose.Schema({
    struttura : String,
    videoApp : [
        {
            nome : String,
            link : String,
            immagine : String,
            descrizione : String
        }
    ]
});

mongoose.model('video', videoSchema);

module.exports = mongoose.model('video');