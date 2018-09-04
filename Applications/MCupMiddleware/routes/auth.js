let express = require('express');
let router = express.Router();
let auth = require('../controllers/authController'); //file che contiene le funzioni chiamate dalle rotte
let bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({extended: true}));
router.use(bodyParser.json());

/*
rotta auth/registrazione
viene utilizzata per registrare un account
 */
router.post('/registrazione',auth.registrazione);

/*
rotta auth/me
viene utilizzata per prelevare le informazioni relative all'utente
 */
router.get('/me',auth.me);

/*
rotta auth/aggiungicontatto
viene utilizzata per aggiungere un contatto alla lista contatti di un utente registrato al servizio
 */
router.post('/aggiungiContatto', auth.aggiungicontatto);

/*
rotta auth/eliminaContatto
viene utilizzata per eliminare un contatto nella lista contatti di un utente registrato al servizio
 */
router.post('/eliminaContatto', auth.eliminacontatto);

/*
rotta auth/login
viene utilizzata per effettuare l'accesso al servizio da parte di un utente qualora quest'ultimo risultasse registrato
al servizio
 */
router.post('/login', auth.login);

/*
rotta auth/confermaappuntamento
viene utilizzata per confermare gli appuntamenti che l'utente sta prenotando verso una struttura
 */
router.post('/confermaappuntamento', auth.confermaappuntamento);

/*
rotta auth/listaappuntamenti
viene utilizzata per recuperare la lista degli appuntamenti confermati dall'utente registrato al servizio
 */
router.post('/listaappuntamenti', auth.listaappuntamenti);

/*
rotta auth/updatetokennotifiche
viene utilizzata per aggiornare il token di un utente per identificare il device a cui inviare le notifiche.
Questa viene aggiornata ogni qualvolta un utente effettua il login su un dispositivo
 */
router.post('/updatetokennotifiche', auth.updateTokenNotifiche);

/*
rotta auth/anullaImpegnativa
viene utilizzata per annullare l'impegnativa che è stata presa in carico ed è stata utilizzata per prenotare
un appuntamento verso una struttura
 */
router.post('/annullaImpegnativa', auth.annullaImpegnativa);

/*
rotta auth/anullaImpegnativaWeb
viene utilizzata per annullare l'impegnativa che è stata già presa in carico
 */
router.post('/annullaImpegnativaWeb', auth.annullaImpegnativaWeb);

/*
rotta auth/pendingprenotazione
viene utilizzata per recuperare le prenotazioni sospese
 */
router.get('/pendingprenotazione', auth.recuperaPrenotazionePending);

/*
rotta auth/annullaprenotazionesospesa
viene utilizzata per annullare un'impegnativa che fa riferimento ad una prenotazione sospesa
 */
router.get('/annullaprenotazionesospesa', auth.annullaPrenotazioneTemp);

/*
rotta auth/annullaprenotazionesospesaWeb
viene utilizzata per annullare un'impegnativa che fa riferimento ad una prenotazione sospesa
utilizzata dal portale
 */
router.get('/annullaprenotazionesospesaWeb', auth.annullaPrenotazioneTempWeb);

/*
rotta auth/eliminaaccount
viene utilizzata per eliminare l'account di un utente registrato al servizio
 */
router.get('/eliminaaccount', auth.eliminaAccount);

//router.post('/listaappuntamentiFuturiEPassati',auth.listaappuntamentiFuturiEPassati);

//router.post('/manager', auth.manager);

router.get('/listaMediciCombo', auth.listaMediciComboBox);

router.post('/passwordsmarrita', auth.richiestaPasswordSmarrita);

router.get('/pagemodpassw', auth.renderModPassw);

router.post('/modpassw', auth.modificaPass);

router.post('/modAssistito', auth.modificaContatto);

router.get('/downloadMe', auth.downloadme);

router.post('/checkMe', auth.checkMe);

module.exports = router;