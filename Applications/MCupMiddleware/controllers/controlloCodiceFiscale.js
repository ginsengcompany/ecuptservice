let controlloCodice = require('cfpiva');
let Promise = require('promise');
module.exports = function (codiceFiscale, utente) {
    return new Promise(function (resolve, reject) {
        controlloCodice.controllaCF(codiceFiscale, function (err, data) {
            if (err){ //omocodia
                let poolLettere = ['L','M','N','P','Q','R','S','T','U','V'];
                let numeriCod = [];
                let omocodia = [];
                let secondoControllo = [false, false, false, false, false, false, false];
                omocodia.push(codiceFiscale[6]);
                omocodia.push(codiceFiscale[7]);
                omocodia.push(codiceFiscale[9]);
                omocodia.push(codiceFiscale[10]);
                omocodia.push(codiceFiscale[12]);
                omocodia.push(codiceFiscale[13]);
                omocodia.push(codiceFiscale[14]);
                for (let i=0; i < omocodia.length; i++){
                    for (let j=0; j < poolLettere.length; j++){
                        if (omocodia[i] === poolLettere[j]){
                            secondoControllo[i] = true;
                            numeriCod.push(j);
                            break;
                        }
                    }
                }
                secondoControllo.forEach(function (t) {
                    if (t === false)
                        resolve(false);
                });
                //Anno di nascita
                if (parseInt(utente.data_nascita[8]) !== numeriCod[0] || parseInt(utente.data_nascita[9]) !== numeriCod[1])
                    resolve(false);
                //Giorno di nascita e sesso
                if (utente.sesso === 'F'){
                    let giornoNascitaUtente = numeriCod[2].toString() + numeriCod[3].toString();
                    let numeroTemp = parseInt(giornoNascitaUtente,10);
                    let giornoCod = numeroTemp - 40;
                    let y = parseInt(utente.data_nascita.substring(0,2),10);
                    if (y !== giornoCod)
                        resolve(false);
                }
                else{
                    if (parseInt(utente.data_nascita[0]) !== numeriCod[2] || parseInt(utente.data_nascita[1]) !== numeriCod[3])
                        resolve(false);
                }
                resolve(true);
            }
            else{ //controllo Dati codice fiscale e dati anagrafici
                let numeri = [];
                numeri.push(codiceFiscale[6]);
                numeri.push(codiceFiscale[7]);
                numeri.push(codiceFiscale[9]);
                numeri.push(codiceFiscale[10]);
                numeri.push(codiceFiscale[12]);
                numeri.push(codiceFiscale[13]);
                numeri.push(codiceFiscale[14]);
                //Anno
                if (utente.data_nascita[8] !== numeri[0] || utente.data_nascita[9] !== numeri[1])
                    resolve(false);
                if (utente.sesso === 'F'){ //Giorno di nascita e sesso
                    let giorno = parseInt(numeri[2].toString() + numeri[3].toString(),10);
                    giorno -= 40;
                    resolve(parseInt(utente.data_nascita.substring(0, 2), 10) === giorno);
                }
                else
                    resolve(utente.data_nascita[0] === numeri[2] || utente.data_nascita[1] !== numeri[3]);
            }
        });
    });
};