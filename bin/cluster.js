let cluster = require('cluster');
let os = require('os');
let nodemailer = require('nodemailer');
let workers;
if (cluster.isMaster){
	let transport = nodemailer.createTransport({
        service: "Gmail",
        auth: {
            user: "ecuptservice.mail@gmail.com",
            pass: "Sviluppoecupt!"
        }
    });
    const cpus = os.cpus().length;
    for (let i = 0; i < cpus; i++){
        cluster.fork();
    }
    workers = Object.values(cluster.workers);
    cluster.on('exit', function (worker, code, signal) {
        if (!worker.exitedAfterDisconnect)
            cluster.fork();
    });
    cluster.on('message',(worker,message) => {
    	let mailOption = {
            from: '"ecuptservice.mail@gmail.com" <ecuptservice.mail@gmail.com>',
            to: "ak12sviluppo@gmail.com",
            subject: "Errore Server",
            text: message
        };
        transport.sendMail(mailOption, (err, info) => {
            if (err)
                console.log(err);
            else
                console.log(info.response);
        });
    });
    //Start Linux
   	process.on('SIGUSR2',() => {
       for (let j=0; j < workers.length; j++){
            workers[j].kill();
            if(workers[j].exitedAfterDisconnect)
                cluster.fork();
       }
    });
    //end Linux
    let appCron = require('../appCron');
    appCron.startCronService();
}
else{
   let www = require('./www');
   www.StartServer();
}