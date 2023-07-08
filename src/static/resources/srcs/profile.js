fetch(`/checkLogin`)
    .then(a =>{
        if(!a.ok) window.location.href=`/login.html?redirect=profile.html`
        else{
            a.json().then(
                async (userData) => {
                    var fill = "";
                    //console.log(userData)
                    [`name`,`surname`,`userName`,`birthDate`,`email`].forEach(element =>{
                        //console.log(userData[element])
                        fill+=`
                            <div class="row d-flex justify-content-center">
                                <strong class="col-5 col-md-3 normal-text m-2 id="title-${element}">${element}: </strong>
                                <div class="col-5 col-md-3 normal-text m-2  id="value${element}"">${userData[element]} </div>
                            </div>
                        `
                        try{
                            document.getElementById(element).setAttribute('placeholder',userData[element])
                            document.getElementById(element).setAttribute('value',userData[element])
                        }
                        catch(e){}
                    })
                    fill+=`
                            <div class="row d-flex justify-content-center">
                                <strong class="col-5 col-md-3 normal-text m-2">Favorite Genres: </strong>
                                <div class="col-5 col-md-3 normal-text m-2">
                            `
                    var colors = ['success','primary','danger','warning','info']
                    userData.favoriteGenres.forEach(element =>{
                        //console.log(element)
                        var color = colors[Math.floor(Math.random()*colors.length)]
                        fill+=`
                            <span class="badge rounded-pill text-bg-${color}">${element}</span>
                        `
                    })
                    document.getElementById("toFill").innerHTML+=fill+`
                                </div>
                            </div>
                            `
                    fill = "";

                    for (const key in userData.favorites) {
                        document.getElementById('favoritesToFill').innerHTML+=`<div class="row" id="${key}"><div class="normal-text text-start-${key}">We found the following <strong>${key}</strong></div></div><div id="anche-questo-${key}" class="row g-4 mt-4 p-4 d-flex justify-content-center"><div id="card-${key}" class="col-8 m-2 m-md-0 mb-md-2 col-md-6 col-lg-4 col-xxl-2 d-none"><div  class="card h-100 w-100 normal-text adapt-size m-1"><div class="card-body"><h5 class="card-title normal-text"></h5><p class="card-text"></p></div><div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="#" class="btn btn-secondary testo-pulsante testo-pulsante">View more</a></div></div></div></div>`
                        var card = document.getElementById("card-"+key)
                        var clone = card.cloneNode(true)
                        clone.id = "card-"+key+"-nope"
                        clone.getElementsByClassName('card-title')[0].innerHTML = "Sorry, we found nothing!"
                        clone.getElementsByClassName('card-text')[0].innerHTML = "Search and find new favorites!"
                        clone.getElementsByClassName('btn')[0].href = "/search.html"
                        clone.getElementsByClassName('testo-pulsante')[0].innerHTML = "Search!"
                        clone.classList.remove('d-block')
                        clone.classList.add('d-none')
                        card.after(clone)
                        if(userData.favorites[key].length==0){
                            document.getElementById(key).classList.add('d-none')
                            document.getElementById("anche-questo-"+key).classList.add('d-none')
                        }
                        for(let i = 0;i<userData.favorites[key].length;i++){
                            try{
                                var card = document.getElementById("card-"+key)
                                var clone = card.cloneNode(true)
                                clone.id = "card-"+key+"-"+i
                                clone.getElementsByClassName('card-title')[0].innerHTML = userData.favorites[key][i].name
                                clone.getElementsByClassName('btn')[0].href = "/describe.html?kind="+key+"s&value=" + userData.favorites[key][i].id
                                clone.classList.remove('d-none')
                                clone.classList.add('d-block')
                                card.after(clone)
                            }
                            catch(e){
                                console.log(e)
                            };
                        }
                    }

                    var key = "playlists-owned"
                    document.getElementById('playlistsOwned').innerHTML+=`<div class="row" id="${key}"><div class="normal-text text-start-${key}">We found the following <strong>owned playlists</strong></div></div><div id="anche-questo-${key}" class="row g-4 mt-4 p-4 d-flex justify-content-center"><div id="card-${key}" class="col-8 m-2 m-md-0 mb-md-2 col-md-6 col-lg-4 col-xxl-2 d-none"><div  class="card h-100 w-100 normal-text adapt-size m-1"><div class="card-body"><h5 class="card-title normal-text"></h5><p class="card-text"></p></div><div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="#" class="btn btn-secondary testo-pulsante testo-pulsante">View more</a></div></div></div></div>`
                    var card = document.getElementById("card-"+key)
                    var clone = card.cloneNode(true)
                    clone.id = "card-"+key+"-nope"
                    clone.getElementsByClassName('card-title')[0].innerHTML = "Sorry, we found nothing!"
                    clone.getElementsByClassName('card-text')[0].innerHTML = "Search and find new favorites!"
                    clone.getElementsByClassName('btn')[0].href = "/search.html"
                    clone.getElementsByClassName('testo-pulsante')[0].innerHTML = "Search!"
                    clone.classList.remove('d-block')
                    clone.classList.add('d-none')
                    card.after(clone)
                    if(userData.playlistsOwned.length==0){
                        document.getElementById(key).classList.add('d-none')
                        document.getElementById("anche-questo-"+key).classList.add('d-none')
                    }
                    for(let i = 0;i<userData.playlistsOwned.length;i++){
                        try{
                            var card = document.getElementById("card-"+key)
                            var clone = card.cloneNode(true)
                            clone.id = "card-"+key+"-"+i
                            clone.getElementsByClassName('card-title')[0].innerHTML = userData.playlistsOwned[i]
                            clone.getElementsByClassName('btn')[0].href = "/explainPlaylist.html?name=" + userData.playlistsOwned[i]
                            clone.classList.remove('d-none')
                            clone.classList.add('d-block')
                            card.after(clone)
                        }
                        catch(e){
                            console.log(e)
                        };
                    }

                    var key = "playlists-followed"
                    document.getElementById('playlistsFollowed').innerHTML+=`<div class="row" id="${key}"><div class="normal-text text-start-${key}">We found the following <strong>followed playlists</strong></div></div><div id="anche-questo-${key}" class="row g-4 mt-4 p-4 d-flex justify-content-center"><div id="card-${key}" class="col-8 m-2 m-md-0 mb-md-2 col-md-6 col-lg-4 col-xxl-2 d-none"><div  class="card h-100 w-100 normal-text adapt-size m-1"><div class="card-body"><h5 class="card-title normal-text"></h5><p class="card-text"></p></div><div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="#" class="btn btn-secondary testo-pulsante testo-pulsante">View more</a></div></div></div></div>`
                    var card = document.getElementById("card-"+key)
                    var clone = card.cloneNode(true)
                    clone.id = "card-"+key+"-nope"
                    clone.getElementsByClassName('card-title')[0].innerHTML = "Sorry, we found nothing!"
                    clone.getElementsByClassName('card-text')[0].innerHTML = "Search and find new favorites!"
                    clone.getElementsByClassName('btn')[0].href = "/search.html"
                    clone.getElementsByClassName('testo-pulsante')[0].innerHTML = "Search!"
                    clone.classList.remove('d-block')
                    clone.classList.add('d-none')
                    card.after(clone)
                    if(userData.playlistsFollowed.length==0){
                        document.getElementById(key).classList.add('d-none')
                        document.getElementById("anche-questo-"+key).classList.add('d-none')
                    }
                    for(let i = 0;i<userData.playlistsFollowed.length;i++){
                        try{
                            var card = document.getElementById("card-"+key)
                            var clone = card.cloneNode(true)
                            clone.id = "card-"+key+"-"+i
                            clone.getElementsByClassName('card-title')[0].innerHTML = userData.playlistsFollowed[i]
                            clone.getElementsByClassName('btn')[0].href = "/explainPlaylist.html?name=" + userData.playlistsFollowed[i]
                            clone.classList.remove('d-none')
                            clone.classList.add('d-block')
                            card.after(clone)
                        }
                        catch(e){
                            console.log(e)
                        };
                    }

                    var key = "groups-owned"
                    document.getElementById('groupsOwned').innerHTML+=`<div class="row" id="${key}"><div class="normal-text text-start-${key}">We found the following <strong>owned groups</strong></div></div><div id="anche-questo-${key}" class="row g-4 mt-4 p-4 d-flex justify-content-center"><div id="card-${key}" class="col-8 m-2 m-md-0 mb-md-2 col-md-6 col-lg-4 col-xxl-2 d-none"><div  class="card h-100 w-100 normal-text adapt-size m-1"><div class="card-body"><h5 class="card-title normal-text"></h5><p class="card-text"></p></div><div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="#" class="btn btn-secondary testo-pulsante testo-pulsante">View more</a></div></div></div></div>`
                    var card = document.getElementById("card-"+key)
                    var clone = card.cloneNode(true)
                    clone.id = "card-"+key+"-nope"
                    clone.getElementsByClassName('card-title')[0].innerHTML = "Sorry, we found nothing!"
                    clone.getElementsByClassName('card-text')[0].innerHTML = "Search and find new favorites!"
                    clone.getElementsByClassName('btn')[0].href = "/search.html"
                    clone.getElementsByClassName('testo-pulsante')[0].innerHTML = "Search!"
                    clone.classList.remove('d-block')
                    clone.classList.add('d-none')
                    card.after(clone)
                    if(userData.groupsOwned.length==0){
                        document.getElementById(key).classList.add('d-none')
                        document.getElementById("anche-questo-"+key).classList.add('d-none')
                    }
                    for(let i = 0;i<userData.groupsOwned.length;i++){
                        try{
                            var card = document.getElementById("card-"+key)
                            var clone = card.cloneNode(true)
                            clone.id = "card-"+key+"-"+i
                            clone.getElementsByClassName('card-title')[0].innerHTML = userData.groupsOwned[i]
                            clone.getElementsByClassName('btn')[0].href = "/explainGroup.html?name=" + userData.groupsOwned[i]
                            clone.classList.remove('d-none')
                            clone.classList.add('d-block')
                            card.after(clone)
                        }
                        catch(e){
                            console.log(e)
                        };
                    }

                    var key = "groups-followed"
                    document.getElementById('groupsFollowed').innerHTML+=`<div class="row" id="${key}"><div class="normal-text text-start-${key}">We found the following <strong>groups followed</strong></div></div><div id="anche-questo-${key}" class="row g-4 mt-4 p-4 d-flex justify-content-center"><div id="card-${key}" class="col-8 m-2 m-md-0 mb-md-2 col-md-6 col-lg-4 col-xxl-2 d-none"><div  class="card h-100 w-100 normal-text adapt-size m-1"><div class="card-body"><h5 class="card-title normal-text"></h5><p class="card-text"></p></div><div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="#" class="btn btn-secondary testo-pulsante testo-pulsante">View more</a></div></div></div></div>`
                    var card = document.getElementById("card-"+key)
                    var clone = card.cloneNode(true)
                    clone.id = "card-"+key+"-nope"
                    clone.getElementsByClassName('card-title')[0].innerHTML = "Sorry, we found nothing!"
                    clone.getElementsByClassName('card-text')[0].innerHTML = "Search and find new favorites!"
                    clone.getElementsByClassName('btn')[0].href = "/search.html"
                    clone.getElementsByClassName('testo-pulsante')[0].innerHTML = "Search!"
                    clone.classList.remove('d-block')
                    clone.classList.add('d-none')
                    card.after(clone)
                    if(userData.groupsFollowed.length==0){
                        document.getElementById(key).classList.add('d-none')
                        document.getElementById("anche-questo-"+key).classList.add('d-none')
                    }
                    for(let i = 0;i<userData.groupsFollowed.length;i++){
                        try{
                            var card = document.getElementById("card-"+key)
                            var clone = card.cloneNode(true)
                            clone.id = "card-"+key+"-"+i
                            clone.getElementsByClassName('card-title')[0].innerHTML = userData.groupsFollowed[i]
                            clone.getElementsByClassName('btn')[0].href = "/explainGroup.html?name=" + userData.groupsFollowed[i]
                            clone.classList.remove('d-none')
                            clone.classList.add('d-block')
                            card.after(clone)
                        }
                        catch(e){
                            console.log(e)
                        };
                    }
                    
                    var toFill = document.getElementById("genres")
                    toFill.style+="border-radius:5%;border:3px solid #918EF4;margin-top:30px"
                    fetch('/genres')
                        .then((a) => a.json())
                        .then((response) => {
                            response.results.forEach(element => {
                                toFill.innerHTML+=`<div class="form-check"><input class="form-check-input" type="checkbox" value="${element}" id="${element}" ${userData.favoriteGenres.some(favorite => favorite == element)?"checked":""}> <label class="form-check-label normal-text" for="${element}">${element}</label></div>`
                            });
                        })
                })
        }
    })
function deleteMyAccount(){
    document.getElementById("sure").classList.remove('d-none')
    location.href="#sure"
}
function check(){
    //console.log(document.getElementById("sure2").value)
    if(document.getElementById("sure2").value=="I AM ABSOLUTELY SURE ABOUT WHAT I AM DOING"){
        document.getElementById("sure2").setAttribute('disabled','')
        document.getElementById("confirm").classList.remove('d-none')
        location.href="#confirm"
    }
}
function letsdothisthing(){
    console.log("You did something no one imagined")
    fetch(`/user`, {
        method: 'DELETE',
    }).then(async a=>{
        if(a.ok){
            alarm('alerts',false,'We are very sorry to see you go...')
            setTimeout(()=>{
                window.location.href="/"
            },2000)
        }
        else{
            alarm('alerts',false,"Something hasn't worked as expected, sorry")
        }
    })
}

function setupedit(){
    let newData = document.getElementById('change-data')
    newData.classList.remove('d-none')
    document.getElementById('toFill').classList.add('d-none')
    location.href="#change-data"
    newData.innerHTML+=`
    <div class="row">
    <div class="mx-auto">
        <div class="badge rounded-pill text-bg-danger normal-text mt-3 p-4 mb-3" id="change" onclick="edit()">SAVE CHANGES</div>
    </div>
    </div>`
}

function edit(){
    var user = {
        name: document.getElementById("name").value,
        surname: document.getElementById("surname").value,
        //userName: document.getElementById("userName").value,
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
        console.log(JSON.stringify(user))
        fetch("/user", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(user)
        })
        .then(a => a.json())
        .then(response => {
            if(response.code==0) {
                setTimeout(()=>{
                    window.location.reload()
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