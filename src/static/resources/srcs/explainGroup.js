//script to fill groups data
const params = new URLSearchParams(window.location.search)
const name=params.get('name')
fetch(`/group/${name}`).then(async (a) =>{
    response = await a.json()
    if(a.ok){
        console.log(response)
        var toFill = document.getElementById('toFill')
        //console.log(toFill)
        var fill=`
        <span>General Infos:</span>
        <div class="col-md-4 mx-auto">
            <div class="row">`
        fill+=`<span>${response.name}</span><br><div class="normal-text">${response.description}</div>`
        fill+=`</div>
        </div>
        <div class="col-md-6">
            <div class="row">
                <div class="normal-text"><strong>Owner: </strong>${response.owner}</div>
            </div>`
        fill+=`<div class="row">`
        response.users.forEach(element => fill+= `<div class="col-4 mt-3">
                <span class="badge rounded-pill text-bg-primary normal-text p-2">${element}</span></div>
                `)
        fill+=`</div></div>`
            fill+=`</div></div></div>
        <div class="row">
            <span>Playlists:</span>
        </div>
        <div class="row mx-auto" id="fill-this-with-playlists"></div>
        `
        
        if(response.doIOwnIt) {
            fill+=`<div class="row">
                    <div class="col-md-6">
                    <div class="btn btn-lg normal-text" id="button" onClick="location.href='/playlists.html'">Search some playlists to add!</div>
                    </div>
                    <div class="col-md-6">
                    <div class="btn btn-lg normal-text" id="button2" onClick="location.href='/groups.html'">Browse some other groups!</div>
                    </div>
                </div>`
        }
        else fill+=`<div class="btn btn-lg normal-text col-sm-6" id="button" onClick="location.href='/groups.html'">Browse some other groups!</div>`
        if(response.doIOwnIt){
            fill+=`<div class="col-md-8 mx-auto">
                <div class="row border border-danger mx-auto mt-4 justify-content-center">
                <div class="col-8 mx-auto">
                    <div class="row">
                        <span class="text-danger"><strong>DANGER ZONE</strong></span>
                    </div>
                </div>
                <div class="row input-group mt-4">
                    <span class="input-group-text normal-text">Insert your new description</span>
                    <textarea class="form-control normal-text" id="new-description" aria-label="With textarea">${response.description}</textarea>
                    <span class="input-group-text normal-text text-danger" onclick="changeDescription()">Change it!</span>
                </div>
                <div class="row input-group mt-4">
                    <span class="input-group-text normal-text">Trasfer to</span>
                    <textarea class="form-control normal-text" id="owner" aria-label="With textarea">UserName of the new Owner</textarea>
                    <span class="input-group-text normal-text text-danger" onclick="changeGroupOwnership()">CLICK HERE<br>CANNOT BE REVERSED</span>
                </div>
                <div class="row">
                    <span class="text-danger"><strong>SUPER DANGER ZONE</strong></span>
                </div>
                    <div class="row">
                        <div class="badge rounded-pill text-bg-danger normal-text mt-3 mb-3 p-4" id="delete" onclick="deleteGroup()">DELETE THIS GROUP
                        </div>
                    </div>
                </div>
            </div></div></div>`
        }
        else{
            fill+=`<div class="row mx-auto">
                    <div class="row border border-success mt-4">
                        <div class="col-8 mx-auto">
                            <div class="row">
                                <span class="text-success"><strong>SAFE ZONE</strong></span>
                            </div>
                            <div class="row">
                                <div class="badge rounded-pill text-bg-success normal-text mt-3 p-4" id="follow-unfollow" onclick="followOrNot(${response.following})">${ifFollowing(response.following)} this group!
                                </div>
                            </div>
                        </div>
                </div>
            </div>`

        }
        fill+=`</div></div>`
        toFill.innerHTML=fill;
        let questo = document.getElementById('fill-this-with-playlists')

        var key = "playlist"
        questo.innerHTML+=`<div id="anche-questo-${key}" class="row g-4 mt-4 p-4 d-flex justify-content-center"><div id="card-${key}" class="col-8 m-2 m-md-0 mb-md-2 col-md-6 col-lg-4 col-xxl-2 d-none"><div  class="card h-100 w-100 w-100 normal-text adapt-size m-1"><div class="card-body"><h5 class="card-title normal-text"></h5><p class="card-text"></p></div><div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="#" class="btn btn-secondary testo-pulsante testo-pulsante">View more</a></div></div></div></div>`
        var card = document.getElementById("card-"+key)
        var clone = card.cloneNode(true)
        clone.id = "card-"+key+"-nope"
        clone.getElementsByClassName('card-title')[0].innerHTML = "Sorry, we found nothing!"
        clone.getElementsByClassName('card-text')[0].innerHTML = "Search and find new playlists!"
        clone.getElementsByClassName('btn')[0].href = "/playlists.html"
        clone.getElementsByClassName('testo-pulsante')[0].innerHTML = "Search!"
        clone.classList.remove('d-block')
        clone.classList.add('d-none')
        card.after(clone)
        if(response.playlistsShared.length==0){
            document.getElementById("anche-questo-"+key).classList.add('d-none')
        }
        for(let i = 0;i<response.playlistsShared.length;i++){
            try{
                var card = document.getElementById("card-"+key)
                var clone = card.cloneNode(true)
                clone.id = "card-"+key+"-"+i
                clone.getElementsByClassName('card-title')[0].innerHTML = response.playlistsShared[i]
                clone.getElementsByClassName('btn')[0].href = "/explainPlaylist.html?name=" + response.playlistsShared[i]
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
        if(a.status==401){
            setTimeout(()=>{
                window.location.href=`/groups.html`
            },2000)
        }
        alarm('toFill',false,response.reason)
    }
})

function changeGroupOwnership(){
    const params = new URLSearchParams(window.location.search)
    var data ={
        new_owner: document.getElementById('owner').value,
        name : params.get('name')
    }
    fetch(`/group/owner`, {
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

function deleteGroup(){
    const params = new URLSearchParams(window.location.search)
    var nome = params.get('name')
    fetch(`/group/${nome}`, {
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
    return value?"Leave":"Join"
}
function followOrNot(value){
    const params = new URLSearchParams(window.location.search)
    var name = params.get('name')
    if(!value){
        fetch(`/group/join/${name}`, {
            method: 'PUT',
        }).then(async a =>{
            response = await a.json()
            if(a.ok){
                alarm('alerts',true,response.reason)
                document.getElementById('follow-unfollow').onclick="followOrNot(true)"
                document.getElementById('follow-unfollow').innerHTML=ifFollowing(false)+" this group!"
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
        fetch(`/group/leave/${name}`, {
            method: 'PUT',
        }).then(async a =>{
            response = await a.json()
            if(a.ok){
                alarm('alerts',true,response.reason)
                document.getElementById('follow-unfollow').onclick="followOrNot(false)"
                document.getElementById('follow-unfollow').innerHTML=ifFollowing(true)+" this group!"
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
    fetch(`/group/description`, {
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