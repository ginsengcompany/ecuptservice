let codice_fiscale = require('codice-fiscale-js');
let moment = require('moment');

let convertiOmocodia = function (cf) {
    return new Promise(function (resolve, reject) {
        let poolLettere = ['L','M','N','P','Q','R','S','T','U','V'];
        let omocodia = [];
        omocodia.push(cf[6]);
        omocodia.push(cf[7]);
        omocodia.push(cf[9]);
        omocodia.push(cf[10]);
        omocodia.push(cf[12]);
        omocodia.push(cf[13]);
        omocodia.push(cf[14]);
        for(let i=0;i<omocodia.length;i++){
            for(let j=0;j<poolLettere.length;j++){
                if(poolLettere[j] === omocodia[i]){
                    omocodia[i] = j.toString();
                }
            }
        }
        let codfisc = cf[0] + cf[1] + cf[2] + cf[3] + cf[4] + cf[5] + omocodia[0] +
            omocodia[1] + cf[8] + omocodia[2] + omocodia[3] + cf[11] +
            omocodia[4] + omocodia[5] + omocodia[6];
        codfisc += codice_fiscale.getCheckCode(codfisc);
        let person = codice_fiscale.computeInverse(codfisc);
        let data = new Date(person.month.toString() + '/' + person.day.toString() + '/' + person.year);
        let sendObject = {
            sesso : person.gender,
            datanascita: moment(data).format('DD/MM/YYYY'),
            codcatastale: codfisc[11] + codfisc[12] + codfisc[13] + codfisc[14]
        };
        resolve(sendObject);
    });
};

exports.traduzioneCodFisc = async function (req, res, next) {
    if(!req.headers.hasOwnProperty('codfisc'))
        return res.status(417).send("Dati mancanti");
    let codfisc = req.headers.codfisc;
    let isValid = codice_fiscale.check(codfisc);
    if(isValid){
        let persona = await convertiOmocodia(codfisc);
        return res.status(200).send(persona);
    }
    return res.status(400).send("Dati errati");
};
