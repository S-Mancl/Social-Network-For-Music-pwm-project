//script to fill playlists data
const params = new URLSearchParams(window.location.search)
const name=params.get('name')
fetch(`/playlist/info/${name}`).then(async (a) =>{
    response = await a.json()
    if(a.ok){
        console.log(response)
        var toFill = document.getElementById('toFill')
        //console.log(toFill)
        var fill=`
        <span>General Infos:</span>
        <div class="col-md-1">
        </div>
        <div class="col-md-4">
            <div class="row">`
        fill+=`<span>${response.name}</span><br><div class="normal-text">${response.description}</div>`
        fill+=`</div>
        </div>
        <div class="col-md-1">
        </div>
        <div class="col-md-6">
            <div class="row">
                <div class="normal-text"><strong>Owner: </strong>${response.owner}</div>
            </div>`
        fill+=`<div class="row">
                    <div class="normal-text"><strong>Duration: </strong>${duration(response.totalTime)}</div>
                </div>`
        fill+=`<div class="row">
        <div class="col-3 mx-auto">
                <span class="badge rounded-pill text-bg-${colorSharing(response.visibility)} normal-text mt-3 p-4">${dataSharing(response.visibility)}</span></div>
                </div>`
        fill+=`<div class="row">`
        response.tags.forEach(element => fill+= `<div class="col-2 mt-3">
                <span class="badge rounded-pill text-bg-primary normal-text p-2" onclick='location.href="/playlists.html?tag=${element}"'>${element}</span></div>
                `)
        fill+=`</div></div>`
            fill+=`</div></div></div>
        <div class="row">
            <span>Songs:</span>
        </div>
        <div class="row">
        <div class="col-2"></div>
        <div class="col-8">
        <div class="row g-4 mt-4 p-4 d-flex justify-content-center">
        `
        response.songs.forEach(element => {
            fill+=`
                <div class="card normal-text adapt-size m-md-2 m-lg-3">
                    <div class="card-body"><h5 class="card-title normal-text">${element.titolo}</h5><p class="card-text"></p>
                    </div><small class="text-body-secondary">${duration(element.durata)} - ${element.cantante}</small>
                    <div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="/describe.html?kind=tracks&ampvalue=${element.id}" class="btn btn-secondary testo-pulsante">View more</a></div>
                </div>x                `
        });
        if(response.doIOwnIt) {
            fill+=`<div class="row">
                    <div class="col-md-6">
                    <div class="btn btn-lg normal-text" id="button" onClick="location.href='/search.html'">Search some songs to add!</div>
                    </div>
                    <div class="col-md-6">
                    <div class="btn btn-lg normal-text" id="button2" onClick="location.href='/playlists.html'">Browse some other playlists!</div>
                    </div>
                </div>`
        }
        else fill+=`<div class="btn btn-lg normal-text col-sm-6" id="button" onClick="location.href='/playlists.html'">Browse some other playlists!</div>`
        if(response.doIOwnIt){
            fill+=`<div class="row border border-danger mt-4">
        <div class="col-8 mx-auto">
                <div class="row"><span class="text-danger"><strong>DANGER ZONE</strong></span></div>
                <div class="row">
                <div class="badge rounded-pill text-bg-danger normal-text mt-3 p-4" id="change-visibility" onclick="makePlaylistPublicOrPrivate(${response.visibility},'${response.name}')">Make it ${dataSharing(!response.visibility)}</div></div>
            </div>
            <div class="input-group mt-4">
                <span class="input-group-text normal-text">Insert your new description</span>
                <textarea class="form-control normal-text" id="new-description" aria-label="With textarea">${response.description}</textarea>
                <span class="input-group-text normal-text text-danger" onclick="changeDescription()">Change it!</span>
            </div>
            <div class="input-group mt-4">
                <span class="input-group-text normal-text">Insert a tag</span>
                <textarea class="form-control normal-text" id="tag" aria-label="With textarea">tagName</textarea>
                <span class="input-group-text normal-text text-danger" onclick="addTag()">Add it!</span>
                <span class="input-group-text normal-text text-danger" onclick="removeTag()">Remove it!</span>
            </div>
            <div class="input-group mt-4">
                <span class="input-group-text normal-text">Trasfer to</span>
                <textarea class="form-control normal-text" id="owner" aria-label="With textarea">UserName of the new Owner</textarea>
                <span class="input-group-text normal-text text-danger" onclick="changePlaylistOwnership()">CLICK HERE<br>CANNOT BE REVERSED</span>
            </div>
            <div class="row"><span class="text-danger"><strong>SUPER DANGER ZONE</strong></span></div>
                <div class="row">
                <div class="badge rounded-pill text-bg-danger normal-text mt-3 p-4" id="delete" onclick="deletePlaylist()">DELETE THIS PLAYLIST</div></div>
            </div>`
        }
        else{
            fill+=`<div class="row border border-success mt-4">
        <div class="col-8 mx-auto">
                <div class="row"><span class="text-success"><strong>SAFE ZONE</strong></span></div>
                <div class="row">
                <div class="badge rounded-pill text-bg-success normal-text mt-3 p-4" id="follow-unfollow" onclick="followOrNot(${response.following})">${ifFollowing(response.following)} this playlist!</div></div>
            </div>`

        }
        fill+=`</div></div>
        <div class="col-2"></div>`
        toFill.innerHTML=fill;
    }
    else{
        if(a.status==401){
            console.log(document.cookie,document.cookie.includes('token'))
            setTimeout(()=>{
                window.location.href=`/playlists.html`
            },2000)
        }
        alarm('toFill',false,response.reason)
    }
})

function addTag(){
    const params = new URLSearchParams(window.location.search)
    var tag ={
        tag: document.getElementById('tag').value,
        name : params.get('name')
    }
    fetch(`/playlist/tags/add`, {
        method: 'PUT',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(tag)

    }).then(async a =>{
        response = await a.json()
        if(a.ok){
            alarm('alerts',true,response.reason)
            setTimeout(()=>{
                window.location.reload()
            },2000)
        }
        else{
            alarm('alerts',false,response.reason)
        }
    })
}
function removeTag(){
    const params = new URLSearchParams(window.location.search)
    var tag ={
        tag: document.getElementById('tag').value,
        name : params.get('name')
    }
    //console.log(tag)
    fetch(`/playlist/tags/remove`, {
        method: 'PUT',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(tag)

    }).then(async a =>{
        response = await a.json()
        if(a.ok){
            alarm('alerts',true,response.reason)
            setTimeout(()=>{
                window.location.reload()
            },2000)
        }
        else{
            alarm('alerts',false,response.reason)
        }
    })
}
function changePlaylistOwnership(){
    const params = new URLSearchParams(window.location.search)
    var data ={
        new_owner: document.getElementById('owner').value,
        name : params.get('name')
    }
    fetch(`/playlist/owner`, {
        method: 'PUT',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)

    }).then(async a =>{
        response = await a.json()
        if(a.ok){
            alarm('alerts',true,response.reason)
            setTimeout(()=>{
                window.location.reload()
            },2000)
        }
        else{
            alarm('alerts',false,response.reason)
        }
    })
}

function deletePlaylist(){
    const params = new URLSearchParams(window.location.search)
    var name = params.get('name')
    fetch(`/playlist/${name}`, {
        method: 'DELETE',
    }).then(async a =>{
        response = await a.json()
        if(a.ok){
            alarm('alerts',true,response.reason)
            setTimeout(()=>{
                window.location.href="/profile.html"
            },2000)
        }
        else{
            alarm('alerts',false,response.reason)
        }
    })
}
function ifFollowing(value){
    return value?"Stop following ":"Start following"
}
function followOrNot(value){
    const params = new URLSearchParams(window.location.search)
    var name = params.get('name')
    if(!value){
        fetch(`/playlist/follow/${name}`, {
            method: 'PUT',
        }).then(async a =>{
            response = await a.json()
            if(a.ok){
                alarm('alerts',true,response.reason)
                document.getElementById('follow-unfollow').onclick="followOrNot(true)"
                document.getElementById('follow-unfollow').innerHTML=ifFollowing(false)+" this playlist!"
                setTimeout(()=>{
                    window.location.reload()
                },2000)
            }
            else{
                alarm('alerts',false,response.reason)
            }
        })
    }
    else{
        fetch(`/playlist/unfollow/${name}`, {
            method: 'PUT',
        }).then(async a =>{
            response = await a.json()
            if(a.ok){
                alarm('alerts',true,response.reason)
                document.getElementById('follow-unfollow').onclick="followOrNot(false)"
                document.getElementById('follow-unfollow').innerHTML=ifFollowing(true)+" this playlist!"
                setTimeout(()=>{
                    window.location.reload()
                },2000)
            }
            else{
                alarm('alerts',false,response.reason)
            }
        })
    }
}

function colorSharing(visibility){
    return visibility?`success`:`danger`
}
function dataSharing(visibility){
    return visibility?`public`:`private`
}

function makePlaylistPublicOrPrivate(visibility,name){
    if(visibility){
        //siamo nel caso in cui la playlist è pubblica e voglio renderla privata
        fetch(`/playlist/private/${name}`, {
            method: 'PUT',
        }).then(async a =>{
            response = await a.json()
            if(a.ok){
                alarm('alerts',true,response.reason)
                setTimeout(()=>{
                    window.location.reload()
                },2000)
            }
            else{
                alarm('alerts',false,response.reason)  
            }
        })
    }
    else{
        //playlist privata e la voglio pubblicare
        fetch(`/playlist/publish/${name}`, {
            method: 'PUT',
        }).then(async a =>{
            response = await a.json()
            if(a.ok){
                alarm('alerts',true,response.reason)
                setTimeout(()=>{
                    window.location.reload()
                },2000)
            }
            else{
                alarm('alerts',false,response.reason)   
            }
        })
    }
}
function changeDescription(){
    const params = new URLSearchParams(window.location.search)
    var question = {
        //recuperare il nome dalla query
        name : params.get('name'),
        //recuperare descrizione testo
        new_description : document.getElementById('new-description').value
    }
    //console.log(question)
    //fare la PUT ed eventualmente ricarica la pagina
    fetch(`/playlist/description`, {
            method: 'PUT',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(question)

        }).then(async a =>{
            response = await a.json()
            if(a.ok){
                alarm('alerts',true,response.reason)
                setTimeout(()=>{
                    window.location.reload()
                },2000)
            }
            else{
                alarm('alerts',false,response.reason)
            }
        })
}