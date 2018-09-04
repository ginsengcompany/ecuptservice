function inviadati() {
    let passw = document.getElementById("passw").value;
    let conferma = document.getElementById("confpassw").value;
    let id = getParameterByName("id");
    let patt = new RegExp(/(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/g);
    if ((passw.trim() === "" || conferma.trim() === ""))
        alert("Controlla i campi");
    else if(passw !== conferma)
        alert("Le password sono differenti");
    else if(passw.length < 8)
        alert("La password deve essere di almeno 8 caratteri");
    else if(!patt.test(passw))
        alert("La password deve contenere un carattere maiuscolo, minuscolo e un numero");
    else {
        let xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (this.readyState === 4)
                alert(this.responseText);
        };
        xhttp.open("POST","http://ecuptservice.ak12srl.it/auth/modpassw", true);
        xhttp.setRequestHeader("Content-type","application/json");
        let data = {
            "id" : id,
            "password" : passw
        };
        xhttp.send(JSON.stringify(data));
    }
}

let getParameterByName = function(name) {
    let url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    let regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
};