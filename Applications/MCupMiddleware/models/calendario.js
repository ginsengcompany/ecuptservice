let mongoose = require('mongoose');
let calendarioSchema = new mongoose.Schema({
    data : String,
    ore : [
        {
            ora : String,
            libero: Boolean
        }
    ]
});
mongoose.model('calendario', calendarioSchema);

module.exports = mongoose.model('calendario');