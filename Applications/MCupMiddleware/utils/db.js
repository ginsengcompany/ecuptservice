let mongoose = require('mongoose'); //Modulo per comunicare con il database MongoDb
let userMongo = process.env.userMongoMcup;
let pwdMongo = process.env.pwdMongoMcup;
let options = {
    //user: userMongo,
    //pass: pwdMongo,
    useNewUrlParser : true
};
mongoose.connect('mongodb://10.10.13.43:27017/ecupt',options); //indirizzo ip della macchina e database di riferimento
mongoose.connection.on("error", function(err) { //Callback eseguita quando si verifica un errore
    console.error(err);
});
