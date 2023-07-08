try{
    const params = new URLSearchParams(window.location.search)
    if(params.has('tag')) getPlaylistsByTag()
    else if(params.has('name')) getPlaylists()
}
catch(e){}
function createPlaylist(){
    fetch('/checkLogin').then(a =>{
        if(a.ok){
            playlist = {
                nome: document.getElementById("nome").value,
                descrizione: document.getElementById('descrizione').value
            }
            fetch("/playlist", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(playlist)
            })
            .then(async a =>{
                var response = await a.json()
                if(a.ok){
                    setTimeout(()=>{
                        window.location.href=`/profile.html`
                    },3000)
                    alarm('alerts',true,`You successfully created a new playlist!. Please wait to be redirected to your profile.`)
                }
                else{
                    alarm('alerts',false,response.reason)

                }
            })
            }
        else window.location.href=`login.html?redirect=playlists.html`
    })
}
function newPlaylist(){
    document.getElementById('if-not-searching').style.display='none'
    document.getElementById('if-searching').style.display='none'
    document.getElementById('if-creating').style.display='block'
}

function searchPlaylists(){
    document.getElementById('if-not-searching').style.display='block'
    document.getElementById('if-searching').style.display='none'
    document.getElementById('if-creating').style.display='none'
}

function createSearchConditions(){
    document.getElementById('if-not-searching').style.display='none'
    document.getElementById('if-searching').style.display='block'
    document.getElementById('if-creating').style.display='none'
    return new URLSearchParams(window.location.search)
}

function redirectToSearch(boolean){
    var question = document.getElementById('search').value
    location.href=`/playlists.html?${boolean?"name":"tag"}=${question}`
}

function getPlaylists(){
    var question = createSearchConditions().get('name')
    //console.log(`name: ${question}`)
    fetch(`/playlist/search/name/${question}`)
        .then(async response =>{
            console.log(response)
            answer = await response.json()
            if(response.ok){
                console.log(answer)
                var key = "playlists-found"
                document.getElementById('toFill').innerHTML+=`<div class="row" id="${key}"><div class="normal-text text-start-${key}">We found the following <strong>playlists</strong></div></div><div id="anche-questo-${key}" class="row g-4 mt-4 p-4 d-flex justify-content-center"><div id="card-${key}" class="col-8 m-2 m-md-0 mb-md-2 col-md-6 col-lg-4 col-xxl-2 d-none"><div  class="card h-100 w-100 normal-text adapt-size m-1"><div class="card-body"><h5 class="card-title normal-text"></h5><p class="card-text"></p></div><div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="#" class="btn btn-secondary testo-pulsante testo-pulsante">View more</a></div></div></div></div>`
                var card = document.getElementById("card-"+key)
                var clone = card.cloneNode(true)
                clone.id = "card-"+key+"-nope"
                clone.getElementsByClassName('card-title')[0].innerHTML = "Sorry, we found nothing!"
                clone.getElementsByClassName('card-text')[0].innerHTML = "Search and find new playlists!"
                clone.getElementsByClassName('btn')[0].href = "/playlists.html"
                clone.getElementsByClassName('testo-pulsante')[0].innerHTML = "Search!"
                clone.classList.remove('d-block')
                clone.classList.add('d-none')
                if(answer.length==0){
                    clone.classList.remove('d-none')
                    clone.classList.add('d-block')
                }
                card.after(clone)
                for(let i = 0;i<answer.length;i++){
                    try{
                        var card = document.getElementById("card-"+key)
                        var clone = card.cloneNode(true)
                        clone.id = "card-"+key+"-"+i
                        clone.getElementsByClassName('card-title')[0].innerHTML = answer[i].name
                        clone.getElementsByClassName('text-body-secondary')[0].innerHTML = answer[i].owner+" - "+duration(answer[i].totalTime)
                        clone.getElementsByClassName('btn')[0].href = "/explainPlaylist.html?name=" + answer[i].name
                        clone.classList.remove('d-none')
                        clone.classList.add('d-block')
                        card.after(clone)
                    }
                    catch(e){
                        console.log(e)
                    };
                }
        }
            else{
                alarm('toFill',false,answer.reason)
            }
        })
        .catch(async error => {
            alarm('toFill',false,error)
        })

}
function getPlaylistsByTag(){
    var question = createSearchConditions().get('tag')
    //console.log(`tag: ${question}`)
    fetch(`/playlist/search/tag/${question}`)
        .then(async response =>{
            console.log(response)
            answer = await response.json()
            if(response.ok){
                console.log(answer)
                var key = "playlists-found"
                document.getElementById('toFill').innerHTML+=`<div class="row" id="${key}"><div class="normal-text text-start-${key}">We found the following <strong>playlists</strong></div></div><div id="anche-questo-${key}" class="row g-4 mt-4 p-4 d-flex justify-content-center"><div id="card-${key}" class="col-8 m-2 m-md-0 mb-md-2 col-md-6 col-lg-4 col-xxl-2 d-none"><div  class="card h-100 w-100 normal-text adapt-size m-1"><div class="card-body"><h5 class="card-title normal-text"></h5><p class="card-text"></p></div><div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="#" class="btn btn-secondary testo-pulsante testo-pulsante">View more</a></div></div></div></div>`
                var card = document.getElementById("card-"+key)
                var clone = card.cloneNode(true)
                clone.id = "card-"+key+"-nope"
                clone.getElementsByClassName('card-title')[0].innerHTML = "Sorry, we found nothing!"
                clone.getElementsByClassName('card-text')[0].innerHTML = "Search and find new playlists!"
                clone.getElementsByClassName('btn')[0].href = "/playlists.html"
                clone.getElementsByClassName('testo-pulsante')[0].innerHTML = "Search!"
                clone.classList.remove('d-block')
                clone.classList.add('d-none')
                if(answer.length==0){
                    clone.classList.remove('d-none')
                    clone.classList.add('d-block')
                }
                card.after(clone)
                for(let i = 0;i<answer.length;i++){
                    try{
                        var card = document.getElementById("card-"+key)
                        var clone = card.cloneNode(true)
                        clone.id = "card-"+key+"-"+i
                        clone.getElementsByClassName('card-title')[0].innerHTML = answer[i].name
                        clone.getElementsByClassName('text-body-secondary')[0].innerHTML = answer[i].owner+" - "+duration(answer[i].totalTime)
                        clone.getElementsByClassName('btn')[0].href = "/explainPlaylist.html?name=" + answer[i].name
                        clone.classList.remove('d-none')
                        clone.classList.add('d-block')
                        card.after(clone)
                    }
                    catch(e){
                        console.log(e)
                    };
                }
        }
            else{
                alarm('toFill',false,answer.reason)
            }
        })
        .catch(async error=>{
            alarm('toFill',false,error)
        })
}