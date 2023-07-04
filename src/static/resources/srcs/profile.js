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
                        document.getElementById('favoritesToFill').innerHTML+=`<div class="row" id="${key}"><div class="normal-text text-start-${key}">We found the following <strong>${key}</strong></div></div><div id="anche-questo-${key}" class="row g-4 mt-4 p-4 d-flex justify-content-center"><div id="card-${key}" class="col-8 col-md-6 col-lg-4 col-xxl-2 d-none"><div  class="card h-100 normal-text adapt-size m-1"><div class="card-body"><h5 class="card-title normal-text"></h5><p class="card-text"></p></div><div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="#" class="btn btn-secondary testo-pulsante testo-pulsante">View more</a></div></div></div></div>`
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
                    document.getElementById('playlistsOwned').innerHTML+=`<div class="row" id="${key}"><div class="normal-text text-start-${key}">We found the following <strong>owned playlists</strong></div></div><div id="anche-questo-${key}" class="row g-4 mt-4 p-4 d-flex justify-content-center"><div id="card-${key}" class="col-8 col-md-6 col-lg-4 col-xxl-2 d-none"><div  class="card h-100 normal-text adapt-size m-1"><div class="card-body"><h5 class="card-title normal-text"></h5><p class="card-text"></p></div><div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="#" class="btn btn-secondary testo-pulsante testo-pulsante">View more</a></div></div></div></div>`
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
                    document.getElementById('playlistsFollowed').innerHTML+=`<div class="row" id="${key}"><div class="normal-text text-start-${key}">We found the following <strong>followed playlists</strong></div></div><div id="anche-questo-${key}" class="row g-4 mt-4 p-4 d-flex justify-content-center"><div id="card-${key}" class="col-8 col-md-6 col-lg-4 col-xxl-2 d-none"><div  class="card h-100 normal-text adapt-size m-1"><div class="card-body"><h5 class="card-title normal-text"></h5><p class="card-text"></p></div><div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="#" class="btn btn-secondary testo-pulsante testo-pulsante">View more</a></div></div></div></div>`
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
                    document.getElementById('groupsOwned').innerHTML+=`<div class="row" id="${key}"><div class="normal-text text-start-${key}">We found the following <strong>owned playlists</strong></div></div><div id="anche-questo-${key}" class="row g-4 mt-4 p-4 d-flex justify-content-center"><div id="card-${key}" class="col-8 col-md-6 col-lg-4 col-xxl-2 d-none"><div  class="card h-100 normal-text adapt-size m-1"><div class="card-body"><h5 class="card-title normal-text"></h5><p class="card-text"></p></div><div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="#" class="btn btn-secondary testo-pulsante testo-pulsante">View more</a></div></div></div></div>`
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
                    document.getElementById('groupsFollowed').innerHTML+=`<div class="row" id="${key}"><div class="normal-text text-start-${key}">We found the following <strong>owned playlists</strong></div></div><div id="anche-questo-${key}" class="row g-4 mt-4 p-4 d-flex justify-content-center"><div id="card-${key}" class="col-8 col-md-6 col-lg-4 col-xxl-2 d-none"><div  class="card h-100 normal-text adapt-size m-1"><div class="card-body"><h5 class="card-title normal-text"></h5><p class="card-text"></p></div><div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="#" class="btn btn-secondary testo-pulsante testo-pulsante">View more</a></div></div></div></div>`
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
                    
                })
        }
    })