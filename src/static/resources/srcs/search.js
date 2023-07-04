var toFill = document.getElementById("parameters")
toFill.style+="border-radius:5%;border:3px solid #918EF4;margin-top:30px"
fetch('/types')
    .then((a) => a.json())
    .then((response) => {
        response.forEach(element => {
            //console.log(element)
            toFill.innerHTML+=`<div class="form-check"><input class="form-check-input" type="checkbox" value="${element}" id="${element}"> <label class="form-check-label normal-text" for="${element}">${element}</label></div>`
        });
    })