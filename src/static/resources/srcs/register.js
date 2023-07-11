var toFill = document.getElementById("genres")
toFill.style+="border-radius:5%;border:3px solid #918EF4;margin-top:30px"
fetch('/genres')
    .then((a) => a.json())
    .then((response) => {
        response.results.forEach(element => {
            //console.log(element)
            toFill.innerHTML+=`<div class="form-check col-6 col-sm-3 col-md-2 form-check-inline"><input class="form-check-input" type="checkbox" value="${element}" id="${element}"> <label class="form-check-label normal-text" for="${element}">${element}</label></div>`
        });
    })
function register(){
    var user = {
        name: document.getElementById("name").value,
        surname: document.getElementById("surname").value,
        userName: document.getElementById("userName").value,
        email: document.getElementById(`email`).value,
        birthDate: document.getElementById(`birthDate`).value,
        favoriteGenres: [],
        password: document.getElementById(`pass1`).value
    }
    if(document.getElementById(`pass1`).value==document.getElementById(`pass2`).value){
        var inputElements = document.getElementsByClassName('form-check-input');
        for(var i=0; inputElements[i]; ++i){
            if(inputElements[i].checked){
                user.favoriteGenres.push(inputElements[i].value);
            }
        }
        //console.log(JSON.stringify(user))
        fetch("/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(user)
        })
        .then(a => a.json())
        .then(response => {
            if(response.code==0) {
                setTimeout(()=>{
                    window.location.href=`/login.html`
                },2000)
                alarm('toFill',true,'You successfully registered. Please wait to be redirected to the login page.')
            }
            else{
                alarm('toFill',false,`We received an error: code: <code>${response.code}</code>, and a message, that is: <code>${response.reason}</code>.`)
                a = [`email`,`pass1`,`pass2`,`birthDate`,`name`,`surname`,`userName`]
                a.forEach(questo => {
                    //console.log(questo);
                    document.getElementById(questo).style.border = "0px solid red"
                })
                switch(response.code){
                    case 1:
                        document.getElementById(`email`).style.border = "5px solid red"
                        break;
                    case 2:
                        document.getElementById(`pass1`).style.border = "5px solid red"
                        document.getElementById(`pass2`).style.border = "5px solid red"
                        break;
                    case 3:
                        document.getElementById(`birthDate`).style.border = "5px solid red"
                        break;
                    case 4:
                        document.getElementById(`name`).style.border = "5px solid red"
                        document.getElementById(`surname`).style.border = "5px solid red"
                        break;
                    case 5:
                        document.getElementById(`email`).style.border = "5px solid red"
                        document.getElementById(`userName`).style.border = "5px solid red"
                        break;
                    case 7:
                        document.getElementById(`userName`).style.border = "5px solid red"
                        break;
                    default:
                        console.log(`${response.code}, ${response.reason}`)
                }
            }
        })
    }
    else{
        //console.log(`passwords do not match`)
        a = [`email`,`pass1`,`pass2`,`birthDate`,`name`,`surname`,`userName`]
        a.forEach(questo => {
            //console.log(questo);
            document.getElementById(questo).style.border = "0px solid red"
        })
        document.getElementById(`pass1`).style.border = "5px solid red"
        document.getElementById(`pass2`).style.border = "5px solid red"
    }       
}