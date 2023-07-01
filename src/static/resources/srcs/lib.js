function getOptions(){
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
}
function getGenres(){
    var toFill = document.getElementById("genres")
    toFill.style+="border-radius:5%;border:3px solid #918EF4;margin-top:30px"
    fetch('/genres')
        .then((a) => a.json())
        .then((response) => {
            response.results.forEach(element => {
                //console.log(element)
                toFill.innerHTML+=`<div class="form-check"><input class="form-check-input" type="checkbox" value="${element}" id="${element}"> <label class="form-check-label normal-text" for="${element}">${element}</label></div>`
            });
        })
}
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
                document.getElementById('toFill').innerHTML=`
                    <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 11">
                        <div id="liveToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                            <div class="toast-header">
                            <img src="/images/alert.png" class="rounded me-2 small-image" alt="...">
                            <strong class="me-auto text-primary">Success</strong>
                            <small class="text-primary">Success</small>
                            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                            </div>
                            <div class="toast-body">
                            You successfully registered. Please wait to be redirected to the login page.
                            </div>
                        </div>
                    </div>
                `
                var a = new bootstrap.Toast(document.querySelector('.toast'))
                a.show()
                //CORRECT
            }
            else{
                document.getElementById('toFill').innerHTML=`
                    <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 11">
                        <div id="liveToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                            <div class="toast-header">
                            <img src="/images/alert.png" class="rounded me-2 small-image" alt="...">
                            <strong class="me-auto text-danger">Failure</strong>
                            <small class="text-danger">Don't panic</small>
                            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                            </div>
                            <div class="toast-body">
                            We received an error: code: <code>${response.code}</code>, and a message, that is: <code>${response.reason}</code>.
                            </div>
                        </div>
                    </div>
                `
                var a = new bootstrap.Toast(document.querySelector('.toast'))
                a.show()
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
function login(){
    var user = {
        email: document.getElementById(`email`).value,
        password: document.getElementById(`pass1`).value
    }
    fetch("/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(user)
    })
    .then(a => a.json())
    .then(response => {
        if(response.code==4) {
            document.getElementById('toFill').innerHTML=`
                <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 11">
                    <div id="liveToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                        <div class="toast-header">
                        <img src="/images/alert.png" class="rounded me-2 small-image" alt="...">
                        <strong class="me-auto text-primary">Success</strong>
                        <small class="text-primary">Success</small>
                        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                        </div>
                        <div class="toast-body">
                        You successfully logged in.
                        </div>
                    </div>
                </div>
            `
            var a = new bootstrap.Toast(document.querySelector('.toast'))
            a.show()
            setTimeout(()=>{
                checkLoginAndRedirect()
            },1500)

        }
        else{
            document.getElementById('toFill').innerHTML=`
                <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 11">
                    <div id="liveToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                        <div class="toast-header">
                        <img src="/images/alert.png" class="rounded me-2 small-image" alt="...">
                        <strong class="me-auto text-danger">Failure</strong>
                        <small class="text-danger">Don't panic</small>
                        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                        </div>
                        <div class="toast-body">
                        We received an error: code: <code>${response.code}</code>, and a message, that is: <code>${response.reason}</code>.
                        </div>
                    </div>
                </div>
            `
            var a = new bootstrap.Toast(document.querySelector('.toast'))
            a.show()
            document.getElementById(`email`).style.border = "0px solid red"
            document.getElementById(`pass1`).style.border = "0px solid red"
            switch(response.code){
                case 1:
                    document.getElementById(`email`).style.border = "5px solid red"
                    document.getElementById(`pass1`).style.border = "5px solid red"
                    break;
                case 2:
                    document.getElementById(`email`).style.border = "5px solid red"
                    break;
                case 3:
                    document.getElementById(`email`).style.border = "5px solid red"
                    document.getElementById(`pass1`).style.border = "5px solid red"
                    break;
                default:
                    console.log(`${response.code}, ${response.reason}`)
            }
        }
    })

}
function checkLoginAndRedirect(){
    const params = new URLSearchParams(window.location.search)
    fetch(`/checkLogin`)
        .then(response =>{
            //console.log(response.ok)
            if(response.ok)
                if(params.get('redirect')!=undefined)
                    setTimeout(()=>{
                        window.location.href=`/${params.get('redirect')}`
                    },1000)
                else setTimeout(()=>{
                    window.location.href=`/index.html`
                },1000)

        })
}
function fillProfile(){
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
                                    <strong class="col-5 col-md-3 normal-text m-2">${element}: </strong>
                                    <div class="col-5 col-md-3 normal-text m-2">${userData[element]} </div>
                                </div>
                            `
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
                            document.getElementById('favoritesToFill').innerHTML+=`<div class="row" id="${key}"><div class="normal-text text-start-${key}">We found the following <strong>${key}</strong></div></div><div id="anche-questo-${key}" class="row g-4 mt-4 p-4 d-flex justify-content-center"><div id="card-${key}" class="col-8 col-md-6 col-lg-4 col-xxl-2 d-none"><div  class="card h-100 normal-text adapt-size m-1"><div class="card-body"><h5 class="card-title normal-text"></h5><p class="card-text"></p></div><div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="#" class="btn btn-secondary testo-pulsante">View more</a></div></div></div></div>`
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


                        //still to do draw playlists
                    })
            }
        })
}

function logout(){
    fetch(`/logout`).then(res =>{
        setTimeout(()=>{
            window.location.href=`/index.html`
        },1000)
    })
}
function askAndRedirect(){
    question = {
        string: document.getElementById("search").value,
        type: [],
        limit: 5,
        offset: 0
    }
    var inputElements = document.getElementsByClassName('form-check-input');
    for(var i=0; inputElements[i]; ++i){
        if(inputElements[i].checked){
            question.type.push(inputElements[i].value);
        }
    }
    //console.log(question)
    fetch("/search", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(question)
    })
    .then(a => a.json())
    .then(response => {
        //console.log(response)
        document.getElementById('if-not-searching').style.display = "none"
        document.getElementById('if-searching').style.display = ""
        try{
            if(response.error.status==400){
                document.getElementById('toFill').innerHTML=`
                    <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 11">
                        <div id="liveToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                            <div class="toast-header">
                            <img src="/images/alert.png" class="rounded me-2 small-image" alt="...">
                            <strong class="me-auto text-danger">Attention please</strong>
                            <small class="text-danger">Error detected</small>
                            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                            </div>
                            <div class="toast-body">
                            Hey there! Are you sure you selected some categories to search for? Because I received this error: <code>${response.error.message}</code>. Try reloading and searching again, maybe...
                            </div>
                        </div>
                    </div>
                `
                var a = new bootstrap.Toast(document.querySelector('.toast'))
                a.show()
            }
        }
        catch(e){
            for (const key in response) {
                document.getElementById('toFill').innerHTML+=`<div class="row" id="${key}"><div class="normal-text">We found the following <strong>${key}</strong></div></div><div class="row g-4 mt-4 p-4 d-flex justify-content-center"><div id="card-${key}" class="col-8 col-md-6 col-lg-4 col-xxl-2 d-none"><div  class="card h-100 normal-text adapt-size m-1"><img  class="card-img-top" alt="..."><div class="card-body"><h5 class="card-title normal-text"></h5><p class="card-text"></p></div><div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="#" class="btn btn-secondary">View more</a></div></div></div></div>`
                var card = document.getElementById("card-"+key)
                var clone = card.cloneNode(true)
                clone.id = "card-"+key+"-more"
                clone.getElementsByClassName('card-title')[0].innerHTML = "Discover more!"
                clone.getElementsByClassName('card-text')[0].innerHTML = "You'll find more of this category!"
                //clone.getElementsByClassName('text-body-secondary')[0].innerHTML = popolari.results[i].release_date
                clone.getElementsByClassName('card-img-top')[0].src = '/images/black.png'
                clone.getElementsByClassName('btn')[0].href = "/showMore.html?kind="+key+"&value=" + question.string +"&page=1"
                clone.classList.remove('d-none')
                clone.classList.add('d-block')
                //clone.getElementsByClassName('btn')[0].classList.add('disabled')
                card.after(clone)
                //console.log("trying "+key)
                if(response[key].items.length==0){
                    document.getElementById("card-"+key+"-more").getElementsByClassName('btn')[0].classList.add('disabled')
                    document.getElementById("card-"+key+"-more").getElementsByClassName('card-title')[0].innerHTML = "Sorry, we found nothing!"
                    document.getElementById("card-"+key+"-more").getElementsByClassName('card-text')[0].innerHTML = "Please try with other params!"
                }
                for(let i = 0;i<response[key].items.length;i++){
                    try{
                        var card = document.getElementById("card-"+key)
                        var clone = card.cloneNode(true)
                        clone.id = "card-"+key+"-"+i
                        clone.getElementsByClassName('card-title')[0].innerHTML = response[key].items[i].name
                        //clone.getElementsByClassName('card-text')[0].innerHTML = popolari.results[i].overview
                        //clone.getElementsByClassName('text-body-secondary')[0].innerHTML = popolari.results[i].release_date
                        try{clone.getElementsByClassName('card-img-top')[0].src = response[key].items[i].images[1].url}catch(e){clone.getElementsByClassName('card-img-top')[0].src = '/images/black.png'}
                        clone.getElementsByClassName('btn')[0].href = "/describe.html?kind="+key+"&value=" + response[key].items[i].id
                        document.getElementById("card-"+key+"-more").classList.remove('disabled')
                        clone.classList.remove('d-none')
                        clone.classList.add('d-block')
                        card.after(clone)
                        //console.log("done correctly "+key)
                    }
                    catch(e){
                        //console.log(e)
                        //console.log(key)
                        document.getElementById("card-"+key+"-more").getElementsByClassName('btn')[0].classList.add('disabled')
                        document.getElementById("card-"+key+"-more").getElementsByClassName('card-title')[0].innerHTML = "Sorry, we found nothing!"
                        document.getElementById("card-"+key+"-more").getElementsByClassName('card-text')[0].innerHTML = "Please try with other params!"
                        //console.log('here')
                    };
                }
            }
        }
    })
        
}

function showMore(){
    const params = new URLSearchParams(window.location.search)
    question = {
        string: params.get('value'),//
        type: [],//
        limit: 16,//il limite è sempre di 16 risultati
        offset: (-1+parseInt(params.get('page')))*20,//offset parte da 0
    }
    //console.log(question)
    question.type.push(params.get('kind').slice(0,-1))
    //console.log(question)
    fetch("/search", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(question)
    })
    .then(a => a.json())
    .then(response => {
        //console.log(response)
        try{
            if(response.error.status==400){
                document.getElementById('toFill').innerHTML=`
                    <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 11">
                        <div id="liveToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                            <div class="toast-header">
                            <img src="/images/alert.png" class="rounded me-2 small-image" alt="...">
                            <strong class="me-auto text-danger">Attention please</strong>
                            <small class="text-danger">Error detected</small>
                            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                            </div>
                            <div class="toast-body">
                            Hey there! Are you sure some results existed? Because I received this error: <code>${response.error.message}</code>. Try reloading and searching again, maybe...
                            </div>
                        </div>
                    </div>
                `
                var a = new bootstrap.Toast(document.querySelector('.toast'))
                a.show()
            }
        }
        catch(e){
            //console.log(`here`)
            document.getElementById('title').innerHTML=`Your results: page ${params.get('page')}`
            key = params.get('kind')
            document.getElementById('toFill').innerHTML+=`<div class="row" id="${key}"><div class="normal-text">We found the following <strong>${key}</strong></div></div>
            
            <div class="row g-4 mt-4 p-4 d-flex justify-content-center">
                <div id="card-${key}" class="col-8 m-2 m-md-0 mb-md-2 col-md-6 col-lg-4 col-xxl-2 d-none">
                <div  class="card h-100 normal-text adapt-size m-1">
                <img  class="card-img-top" alt="...">
                <div class="card-body"><h5 class="card-title normal-text"></h5><p class="card-text"></p></div>
                <div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="#" class="btn btn-secondary text-btn-this">View more</a></div></div></div></div>`
            
            var card = document.getElementById("card-"+key)
            var clone = card.cloneNode(true)
            clone.id = "card-"+key+"-more"
            clone.getElementsByClassName('card-title')[0].innerHTML = "Discover more!"
            clone.getElementsByClassName('card-text')[0].innerHTML = "You'll find more of this category!"
            //clone.getElementsByClassName('text-body-secondary')[0].innerHTML = popolari.results[i].release_date
            clone.getElementsByClassName('card-img-top')[0].src = '/images/black.png'
            clone.getElementsByClassName('btn')[0].href = "/showMore.html?kind="+key+"&value=" + question.string +"&page="+(parseInt(params.get('page'))+1)
            clone.classList.remove('d-none')
            clone.classList.add('d-block')
            //clone.getElementsByClassName('btn')[0].classList.add('disabled')
            card.after(clone)
            //console.log("trying "+key)
            if(response[key].items.length==0){
                document.getElementById("card-"+key+"-more").getElementsByClassName('btn')[0].classList.add('disabled')
                document.getElementById("card-"+key+"-more").getElementsByClassName('card-title')[0].innerHTML = "Sorry, we found nothing else!"
                document.getElementById("card-"+key+"-more").getElementsByClassName('card-text')[0].innerHTML = "Please try searching again with other params!"
            }
            for(let i = 0;i<response[key].items.length;i++){
                try{
                    var card = document.getElementById("card-"+key)
                    var clone = card.cloneNode(true)
                    clone.id = "card-"+key+"-"+i
                    clone.getElementsByClassName('card-title')[0].innerHTML = response[key].items[i].name
                    //clone.getElementsByClassName('card-text')[0].innerHTML = popolari.results[i].overview
                    //clone.getElementsByClassName('text-body-secondary')[0].innerHTML = popolari.results[i].release_date
                    try{clone.getElementsByClassName('card-img-top')[0].src = response[key].items[i].images[1].url}catch(e){clone.getElementsByClassName('card-img-top')[0].src = '/images/black.png'}
                    clone.getElementsByClassName('btn')[0].href = "/describe.html?kind="+key+"&value=" + response[key].items[i].id
                    document.getElementById("card-"+key+"-more").classList.remove('disabled')
                    clone.classList.remove('d-none')
                    clone.classList.add('d-block')
                    card.after(clone)
                    //console.log("done correctly "+key)
                }
                catch(e){
                    //console.log(e)
                    //console.log(key)
                    document.getElementById("card-"+key+"-more").getElementsByClassName('btn')[0].classList.add('disabled')
                    document.getElementById("card-"+key+"-more").getElementsByClassName('card-title')[0].innerHTML = "Sorry, we found nothing else!"
                    document.getElementById("card-"+key+"-more").getElementsByClassName('card-text')[0].innerHTML = "Please try searching again with other params!"
                    //console.log('here')
                };
            }
            var card = document.getElementById("card-"+key)
            var clone = card.cloneNode(true)
            clone.id = "card-"+key+"-back"
            clone.getElementsByClassName('card-title')[0].innerHTML = `Go back!`
            //clone.getElementsByClassName('card-text')[0].innerHTML = popolari.results[i].overview
            //clone.getElementsByClassName('text-body-secondary')[0].innerHTML = popolari.results[i].release_date
            clone.getElementsByClassName('card-img-top')[0].src = '/images/black.png'
            clone.getElementsByClassName('card-text')[0].innerHTML = "Take another look at the ones you saw before!"
            clone.getElementsByClassName('btn')[0].href = "/showMore.html?kind="+key+"&value=" + question.string +"&page="+(parseInt(params.get('page'))-1)
            clone.getElementsByClassName('text-btn-this')[0].innerHTML=`Go back!`
            document.getElementById("card-"+key+"-more").classList.remove('disabled')
            clone.classList.remove('d-none')
            clone.classList.add('d-block')
            if(parseInt(params.get('page'))-1>0)card.after(clone)
        }
    })
        
}

async function starUnstar(type,id,name){
    //console.log({type:type,id:id,name:name})
    fetch('/addOrRemoveFavorite', {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({"category":type,"id":id,"name":name})
    }).then(async a => {
        response =  await a.json();
        if(a.ok){
            //console.log(response)
            if(response.removed){
                //console.log(a.ok)
                document.getElementById('alerts').innerHTML=`<div class="position-fixed bottom-0 end-0 p-3" style="z-index: 11">
        <div id="liveToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
            <img src="/images/alert.png" class="rounded me-2 small-image" alt="...">
            <strong class="me-auto text-danger">Removed</strong>
            <small class="text-danger">Success</small>
            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
            You removed this from your favorites.
            </div>
            </div>
            </div>
            `
            unstar()
        }
            else{
                //console.log(a.ok);
                document.getElementById('alerts').innerHTML=`<div class="position-fixed bottom-0 end-0 p-3" style="z-index: 11">
            <div id="liveToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                <img src="/images/alert.png" class="rounded me-2 small-image" alt="...">
                <strong class="me-auto text-primary">Added</strong>
                <small class="text-primary">Success</small>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                You added this to your favorites.
                </div>
                </div>
                </div>
                `
                star()
            }
            }
        else{
            //console.log(a.ok);
            document.getElementById('alerts').innerHTML=`<div class="position-fixed bottom-0 end-0 p-3" style="z-index: 11">
        <div id="liveToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
            <img src="/images/alert.png" class="rounded me-2 small-image" alt="...">
            <strong class="me-auto text-danger">Something happened</strong>
            <small class="text-danger">Oh no!</small>
            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
            ${response.reason}
            </div>
            </div>
            </div>
            `   
            }
        var a = new bootstrap.Toast(document.querySelector('.toast'))
        a.show()
        /*setTimeout(()=>{
            window.location.reload()
        },3000)*/
    })
}

function fillData(){
    const params = new URLSearchParams(window.location.search)
    const question = {
        kind : params.get('kind'),
        value : params.get('value')
    }
    //console.log(question)
    //console.log(`/requireInfo/${question.kind}/${question.value}`)
    fetch(`/requireInfo/${question.kind}/${question.value}`)
        .then((a) => a.json())
        .then((response) => {
            //console.log(response)
            var toFill = document.getElementById('toFill')
            //console.log(toFill)
            var fill=`
            <span>General Infos:</span>
            <div class="col-md-1">
            </div>
            <div class="col-md-4">
                <div class="row">`
            if(response.images!=undefined){
                fill+=`<img class="p-4 m-md-5 description-image common-border" src="${response.images[0].url}">`
            }
            else if(response.preview_url!=undefined){
                fill+=`<span>Preview</span><audio class="common-border un-common-border" controls src="${response.preview_url}">`
            }
            fill+=`</div>
            </div>
            <div class="col-md-1">
            </div>
            <div class="col-md-6">
                <div class="row">
                    <div class="normal-text"><strong>Category: </strong>${response.type}</div>
                </div>
                <div class="row">
                    <div class="normal-text"><strong>Name: </strong>${response.name}</div>
                </div>
                <div class="row">
                    <div class="normal-text"><strong>Spotify Url: </strong><a href="${response.external_urls.spotify}">here</a></div>
                </div>`
            if(response.total_tracks!=undefined){
                fill+=` <div class="row">
                            <div class="normal-text"><strong>Total tracks: </strong>${response.total_tracks}</div>
                        </div>`
            }
            //
            if(response.track_number!=undefined){
                fill+=` <div class="row">
                            <div class="normal-text"><strong>Track number: </strong>${response.track_number}</div>
                        </div>`
            }
            if(response.release_date!=undefined){
                fill+=` <div class="row">
                            <div class="normal-text"><strong>Release date: </strong>${response.release_date}</div>
                        </div>`
            }
            fill+=` <div class="row" onclick="starUnstar('${response.type}','${response.id}','${response.name}')">
                        <div class="col-sm-5 col-4"></div>
                        <div class="col-sm-2 col-4" id="isStarred"></div>
                        <div class="col-sm-5 col-4"></div>
                    </div>
                `
            //
            fill+=`</div>`
            if(response.available_markets!=undefined){
                var flags = ""
                response.available_markets.forEach(countryCode => {
                    var code = countryCode.toLowerCase()
                    //console.log(code)
                    flags += `<img class="p-1" src='https://flagcdn.com/16x12/${code}.png'>`
                });
                fill+=`
                <div class="row">
                    <div class="normal-text"><strong>Available on Spotify: </strong>${flags}</div>
                </div>
                `
                //console.log('done')
            }
            if(response.total_tracks!=undefined){
                fill+=`
            <div class="row">
                <span>Tracks:</span>
            </div>
            <div class="row">
            <div class="col-2"></div>
            <div class="col-8">
            <div class="row g-4 mt-4 p-4 d-flex justify-content-center">
            `
                response.tracks.items.forEach(element => {
                    //console.log({name:element.name,id:element.id})
                    fill+=`
                        <div class="card normal-text adapt-size m-1">
                            <div class="card-body"><h5 class="card-title normal-text">${element.name}</h5><p class="card-text"></p></div>
                            <div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="/describe.html?kind=tracks&amp;value=${element.id}" class="btn btn-secondary">View more</a></div>
                        </div>
                    `
                });
                fill+=`</div></div>
                <div class="col-2"></div>`
            }
            if(response.artists!=undefined){
                fill+=`
            <div class="row">
                <span>Artists:</span>
            </div>
            <div class="row">
            <div class="col-2"></div>
            <div class="col-8">
            <div class="row g-4 mt-4 p-4 d-flex justify-content-center">
            `
                response.artists.forEach(element => {
                    //console.log({name:element.name,id:element.id})
                    fill+=`
                        <div class="card normal-text adapt-size m-md-2 m-lg-3">
                            <div class="card-body"><h5 class="card-title normal-text">${element.name}</h5><p class="card-text"></p></div>
                            <div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="/describe.html?kind=artists&amp;value=${element.id}" class="btn btn-secondary">View more</a></div>
                        </div>
                    `
                });
                fill+=`</div></div>
                <div class="col-2"></div>`
            }
            if(response.album!=undefined){
                fill+=`
            <div class="row">
                <span>Album:</span>
            </div>
            <div class="row">
            <div class="col-2"></div>
            <div class="col-8">
            <div class="row g-4 mt-4 p-4 d-flex justify-content-center">
                <div class="card normal-text adapt-size m-1">
                    <img class="card-img-top" alt="..." src="${response.album.images[0].url}">
                    <div class="card-body"><h5 class="card-title normal-text">${response.album.name}</h5><p class="card-text"></p></div>
                    <div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="/describe.html?kind=albums&amp;value=${response.album.id}" class="btn btn-secondary">View more</a></div>
                </div>
            </div></div>
                <div class="col-2"></div>
            `
            }
            toFill.innerHTML=fill;
            checkIfStarred();
        })
}
function checkIfStarred(){
    const params = new URLSearchParams(window.location.search)
    //console.log(question)
    fetch('/isStarred', {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({"category":params.get('kind').slice(0,-1),"id":params.get('value')})
    }).then(async a => {
        response =  await a.json();
        if(a.ok){
            //console.log(JSON.stringify(response))
            if(response.favorite) {
                star()
            }
            else{
                unstar()
            }
        }
        else{
            //console.log(a.ok);
            document.getElementById('alerts').innerHTML=`<div class="position-fixed bottom-0 end-0 p-3" style="z-index: 11">
            <div id="liveToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                <img src="/images/alert.png" class="rounded me-2 small-image" alt="...">
                <strong class="me-auto text-danger">Something happened</strong>
                <small class="text-danger">Oh no!</small>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                ${response.reason}
                </div>
                </div>
                </div>
                `   
        }
    })
}

function star(){document.getElementById('isStarred').innerHTML=`<img class="rounded ps-2 ps-m-0 mx-auto d-block img-fluid reverse mt-4 mb-3" src="/images/heart-solid.svg">`}
function unstar(){document.getElementById('isStarred').innerHTML=`<img class="rounded ps-2 ps-m-0 mx-auto d-block img-fluid reverse mt-4 mb-3" src="/images/heart-regular.svg">`}