const params = new URLSearchParams(window.location.search)
const question = {
    kind : params.get('kind'),
    value : params.get('value')
}

fetch(`/requireInfo/${question.kind}/${question.value}`)
.then((a) => a.json())
.then(async (response) => {
        var promise = await fetch('/checkLogin')
        var toFill = document.getElementById('toFill')
        var fill=`
        <span>General Infos:</span>
        <div class="col-md-4 mx-md-auto">
            <div class="row normal-text">`
        if(response.images!=undefined){
            fill+=`<img class="p-4 m-md-5 description-image common-border" src="${response.images[0].url}">`
        }
        else if(response.preview_url!=undefined){
            fill+=`<span>Preview</span><audio controls class="mb-2" src="${response.preview_url}"></audio></div>`
            if(promise.ok)fill+=`<div class="row normal-text">
                <div class="form-floating col-lg-6">
                    <select class="form-select normal-text h-100" id="floatingSelect" aria-label="Floating label select example">
                    <option selected>Select a playlist</option>
                    </select>
                </div>
                <div class="col-lg-6 badge rounded-pill normal-text text-bg-warning" id="the-mystic-button" onclick="addOrRemoveFromPlaylist();">
                    Select a playlist
                </div>
            </div>`
            else fill+=`<div class="row normal-text">
                <div class="form-floating col-lg-6">
                    <select class="form-select normal-text h-100" id="floatingSelect" aria-label="Floating label select example">
                    <option selected>View the playlists</option>
                    </select>
                </div>
                <div class="col-lg-6 badge rounded-pill normal-text text-bg-warning" id="the-mystic-button" onclick="alarm('alerts',false,'Please login or register')">
                    by logging in
                </div>
            </div>`
        }
        fill+=`</div>
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
        if(response.duration_ms!=undefined){
            fill+=` <div class="row">
            <div class="normal-text"><strong>Duration: </strong>${duration(response.duration_ms)}</div>
        </div>`
        }
        if(promise.ok)fill+=` <div class="row" onclick="starUnstar('${response.type}','${response.id}','${response.name.split("\"")[0].split("(")[0]}')">
                    <div class="col-sm-2 mx-auto col-4" id="isStarred"></div>
                </div>
            `
        fill+=`</div>`
        if(response.available_markets!=undefined){
            var flags = ""
            response.available_markets.forEach(countryCode => {
                var code = countryCode.toLowerCase()
                //console.log(code)
                flags += `<img class="p-1 flag" src='https://flagcdn.com/${window.screen.availWidth<2000?"16x12":"64x48"}/${code}.png'>`
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
        <div class="col-8 mx-auto" id="fill-this-with-tracks"></div></div>`}
        if(response.artists!=undefined){
            fill+=`
        <div class="row">
            <span>Artists:</span>
        </div>
        <div class="row">
        <div class="col-8 mx-auto">
        <div class="row g-4 mt-4 p-4 d-flex justify-content-center" id="fill-this-with-artists"></div></div></div>`
        }
        if(response.album!=undefined){
            fill+=`</div>
        <div class="row">
            <span>Album:</span>
        </div>
        <div class="row">
        <div class="col-8 mx-auto">
        <div class="row g-4 mt-4 p-4 d-flex justify-content-center">
        <div class="col-8 m-2 m-md-0 mb-md-2 col-md-6 col-lg-4 col-xxl-2">
            <div class="card h-100 w-100 normal-text adapt-size m-1">
                <img class="card-img-top" alt="..." src="${response.album.images[0].url}">
                <div class="card-body"><h5 class="card-title normal-text">${response.album.name}</h5><p class="card-text"></p></div>
                <div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="/describe.html?kind=albums&value=${response.album.id}" class="btn btn-secondary testo-pulsante">View more</a></div>
            </div></div>
        </div></div>
        `
        }
        toFill.innerHTML=fill;
        if(response.total_tracks!=undefined){
            let questo = document.getElementById('fill-this-with-tracks')
            var key = "track"
            questo.innerHTML+=`<div id="anche-questo-${key}" class="row g-4 mt-4 p-4 d-flex justify-content-center"><div id="card-${key}" class="col-8 m-2 m-md-0 mb-md-2 col-md-6 col-lg-4 col-xxl-2 d-none"><div  class="card h-100 normal-text adapt-size m-1"><div class="card-body"><h5 class="card-title normal-text"></h5><p class="card-text"></p></div><div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="#" class="btn btn-secondary testo-pulsante testo-pulsante">View more</a></div></div></div></div>`
            var card = document.getElementById("card-"+key)
            var clone = card.cloneNode(true)
            clone.id = "card-"+key+"-nope"
            clone.classList.remove('d-block')
            clone.classList.add('d-none')
            card.after(clone)
            if(response.tracks.items.length==0){
                document.getElementById("anche-questo-"+key).classList.add('d-none')
            }
            for(let i = 0;i<response.tracks.items.length;i++){
                try{
                    var card = document.getElementById("card-"+key)
                    var clone = card.cloneNode(true)
                    clone.id = "card-"+key+"-"+i
                    clone.getElementsByClassName('card-title')[0].innerHTML = response.tracks.items[i].name
                    clone.getElementsByClassName('btn')[0].href = `/describe.html?kind=tracks&value=${response.tracks.items[i].id}`
                    clone.classList.remove('d-none')
                    clone.classList.add('d-block')
                    card.before(clone)
                }
                catch(e){
                    console.log(e)
                };
        }
        }
        if(response.artists!=undefined){
            let questo = document.getElementById('fill-this-with-artists')
            var key = "artists"
            questo.innerHTML+=`<div id="anche-questo-${key}" class="row g-4 mt-4 p-4 d-flex justify-content-center"><div id="card-${key}" class="col-8 m-2 m-md-0 mb-md-2 col-md-6 col-lg-4 col-xxl-2 d-none"><div  class="card h-100 normal-text adapt-size m-1"><div class="card-body"><h5 class="card-title normal-text"></h5><p class="card-text"></p></div><div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="#" class="btn btn-secondary testo-pulsante testo-pulsante">View more</a></div></div></div></div>`
            var card = document.getElementById("card-"+key)
            var clone = card.cloneNode(true)
            clone.id = "card-"+key+"-nope"
            clone.classList.remove('d-block')
            clone.classList.add('d-none')
            card.after(clone)
            if(response.artists.length==0){
                document.getElementById("anche-questo-"+key).classList.add('d-none')
            }
            for(let i = 0;i<response.artists.length;i++){
                try{
                    var card = document.getElementById("card-"+key)
                    var clone = card.cloneNode(true)
                    clone.id = "card-"+key+"-"+i
                    clone.getElementsByClassName('card-title')[0].innerHTML = response.artists[i].name
                    clone.getElementsByClassName('btn')[0].href = `/describe.html?kind=artists&value=${response.artists[i].id}`
                    clone.classList.remove('d-none')
                    clone.classList.add('d-block')
                    card.before(clone)
                }
                catch(e){
                    console.log(e)
                };
        }
        }
        if(promise.ok)checkIfStarred();
        window.addEventListener('resize', () =>{
            const re = /\/.....\//
            let a = document.getElementsByClassName('flag')
            for (let i=0;i<a.length;i++){
                let element = a[i].src
                let code = element.split(re)[1].split(".png")[0]
                a[i].src = `https://flagcdn.com/${window.screen.availWidth<2000?"16x12":"64x48"}/${code}.png`
            }
        });
        if(response.preview_url!=undefined&&promise.ok){
            //riempio le opzioni
            let user = await promise.json()
            let select = document.getElementById('floatingSelect')
            for(let i in user.playlistsOwned){
                select.options[select.options.length] = new Option(user.playlistsOwned[i],user.playlistsOwned[i])
            }
            //creo l'evento
            document.querySelector('#floatingSelect').addEventListener('change', () =>{
                //recupero la playlist
                let playlist = document.querySelector('#floatingSelect').value
                //recupero l'id della canzone
                let id = params.get('value')
                fetch(`/playlist/info/${playlist}`).then(async a => {
                    if(a.ok){
                        response = await a.json()
                        if(!response.songs.some(element => element.id == id)){
                            //button to add it
                            document.getElementById('the-mystic-button').innerHTML='Add it!'
                            document.getElementById('the-mystic-button').classList.add('text-bg-success')
                            document.getElementById('the-mystic-button').classList.remove('text-bg-warning')
                        }
                        else{
                            //button to remove it
                            document.getElementById('the-mystic-button').innerHTML='Remove it!'
                            document.getElementById('the-mystic-button').classList.add('text-bg-danger')
                            document.getElementById('the-mystic-button').classList.remove('text-bg-warning')
                        }
                    }
                    else{
                        document.getElementById('the-mystic-button').innerHTML='Select a playlist'
                        document.getElementById('the-mystic-button').classList.remove('text-bg-success')
                        document.getElementById('the-mystic-button').classList.remove('text-bg-danger')
                        document.getElementById('the-mystic-button').classList.add('text-bg-warning')
                    }
                })
            });
        }
    })
function addOrRemoveFromPlaylist(){
    let playlist = document.querySelector('#floatingSelect').value
    //recupero l'id della canzone
    let id = params.get('value')
    fetch(`/playlist/info/${playlist}`).then(async a => {
        if(a.ok){
            response = await a.json()
            let mode
            if(!response.songs.some(element => element.id == id)) mode = "add"
            else mode = "remove"
            fetch(`/playlist/songs/${mode}`, {
                method: 'PUT',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({"name":playlist,"song_id":id})
            }).then(async b =>{
                answer = await b.json()
                if(b.ok){
                    setTimeout(()=>{
                        location.reload()
                    },2000)
                    alarm('alerts',true,answer.reason)
                }
                else{
                    alarm('alerts',false,answer.reason)
                }
            })
        }
        else alarm('alerts',false,"Don't dare")})
}