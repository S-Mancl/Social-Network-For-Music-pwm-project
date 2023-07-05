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
            fill+=`<span>Preview</span><audio class="common-border un-common-border normal-text" controls src="${response.preview_url}"></audio></div>`
            if(promise.ok)fill+=`<div class="row normal-text">
                <div class="form-floating col-lg-6">
                    <select class="form-select" id="floatingSelect" aria-label="Floating label select example">
                    <option selected>Select a playlist first</option>
                    </select>
                </div>
                <div class="col-lg-6 badge rounded-pill normal-text" id="the-mystic-button" onclick="addOrRemoveFromPlaylist();">
                    <button class="btn btn-lg normal-text">Select a playlist first</button>
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
        if(response.duration_ms!=undefined){
            fill+=` <div class="row">
            <div class="normal-text"><strong>Duration: </strong>${duration(response.duration_ms)}</div>
        </div>`
        }
        fill+=` <div class="row" onclick="starUnstar('${response.type}','${response.id}','${response.name.split("\"")[0].split("(")[0]}')">
                    <div class="col-sm-5 col-4"></div>
                    <div class="col-sm-2 col-4" id="isStarred"></div>
                    <div class="col-sm-5 col-4"></div>
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
        <div class="col-8 mx-auto">
        <div class="row g-4 mt-4 p-4 justify-content-center">
        `
            response.tracks.items.forEach(element => {
                fill+=`<div class="col-8 m-2 m-md-0 mb-md-2 col-md-6 col-lg-4 col-xxl-2">
                    <div class="card h-100 w-100 normal-text adapt-size m-1">
                        <div class="card-body"><h5 class="card-title normal-text">${element.name}</h5><p class="card-text"></p></div>
                        <div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="/describe.html?kind=tracks&amp;value=${element.id}" class="btn btn-secondary testo-pulsante">View more</a></div>
                    </div></div>
                `
            });
            fill+=`</div></div>`
        }
        if(response.artists!=undefined){
            fill+=`
        <div class="row">
            <span>Artists:</span>
        </div>
        <div class="row">
        <div class="col-8 mx-auto">
        <div class="row g-4 mt-4 p-4 d-flex justify-content-center">
        `
            response.artists.forEach(element => {
                //console.log({name:element.name,id:element.id})
                fill+=`<div class="col-8 m-2 m-md-0 mb-md-2 col-md-6 col-lg-4 col-xxl-2">
                    <div class="card h-100 w-100 normal-text adapt-size m-md-2 m-lg-3">
                        <div class="card-body"><h5 class="card-title normal-text">${element.name}</h5><p class="card-text"></p></div>
                        <div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="/describe.html?kind=artists&amp;value=${element.id}" class="btn btn-secondary testo-pulsante">View more</a></div>
                    </div></div>
                `
            });
            fill+=`</div></div>`
        }
        if(response.album!=undefined){
            fill+=`
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
                <div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="/describe.html?kind=albums&amp;value=${response.album.id}" class="btn btn-secondary testo-pulsante">View more</a></div>
            </div></div>
        </div></div>
        `
        }
        toFill.innerHTML=fill;
        checkIfStarred();
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
                            //button to remove it
                            console.log(document.getElementById('the-mystic-button').onclick)
                            document.getElementById('the-mystic-button').innerHTML='Add it!'
                            document.getElementById('the-mystic-button').classList.add('text-bg-success')
                        }
                        else{
                            //button to add it
                            console.log(document.getElementById('the-mystic-button').onclick)
                            document.getElementById('the-mystic-button').innerHTML='Remove it!'
                            document.getElementById('the-mystic-button').classList.add('text-bg-danger')
                        }
                    }
                    //else alarm('alerts',false,"Somehow you made an impossible query... you're very capable, but please, don't hack me")
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