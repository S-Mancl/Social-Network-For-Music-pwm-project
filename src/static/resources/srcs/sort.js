const params = new URLSearchParams(window.location.search)
const name=params.get('name')
document.getElementById('title').innerHTML=`Sort the songs in <strong>${name}</strong>: drag and drop them <div class="badge bg-secondary rounded-pill">New</div>`
fetch(`/playlist/info/${name}`).then(async (a) =>{
    response = await a.json()
    if(a.ok&&response.doIOwnIt){
        let elementToFill = document.getElementById('toFill')
        var key = "songs"
        elementToFill.innerHTML+=`<div id="anche-questo-${key}" class="row g-4 mt-4 p-4 d-flex justify-content-center"><div id="card-${key}" class="col-8 m-2 m-md-0 mb-md-2 col-md-6 col-lg-4 col-xxl-2 d-none"><div  class="card h-100 w-100 normal-text adapt-size m-1"><div class="card-body"><h5 class="card-title normal-text"></h5><p class="card-text"></p></div><div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="#" class="btn btn-secondary testo-pulsante testo-pulsante">View more</a></div></div></div></div>`
        var card = document.getElementById("card-"+key)
        var clone = card.cloneNode(true)
        clone.id = "card-"+key+"-nope"
        clone.getElementsByClassName('card-title')[0].innerHTML = "Sorry, we found nothing!"
        clone.getElementsByClassName('card-text')[0].innerHTML = "Search and find new songs!"
        clone.getElementsByClassName('btn')[0].href = "/search.html"
        clone.getElementsByClassName('testo-pulsante')[0].innerHTML = "Search!"
        clone.classList.remove('d-block')
        clone.classList.add('d-none')
        card.before(clone)
        if(response.songs.length==0){
            document.getElementById("anche-questo-"+key).classList.add('d-none')
        }
        for(let i = 0;i<response.songs.length;i++){
            try{
                var card = document.getElementById("card-"+key)
                var clone = card.cloneNode(true)
                clone.id = "card-"+key+"-"+i
                clone.getElementsByClassName('card-title')[0].innerHTML = response.songs[i].titolo+` (${response.songs[i].anno_di_pubblicazione})`
                clone.getElementsByClassName('text-body-secondary')[0].innerHTML = response.songs[i].cantante+" - "+duration(response.songs[i].durata)
                clone.getElementsByClassName('btn')[0].href = "/describe.html?kind=tracks&value=" + response.songs[i].id
                clone.getElementsByClassName('btn')[0].style.display="none"
                clone.classList.remove('d-none')
                clone.classList.add('d-block')
                card.before(clone)
            }
            catch(e){
                console.log(e)
            };
        }
        new Sortable(document.getElementById('anche-questo-songs'),{
            animation: 150,
            ghostClass: 'blue-background-class'
        });
    }
    else{
        window.history.back()
    }
})

function confirmOrder(){
    const order = document.getElementsByClassName('btn')
    let send_this = []
    for(let i=1;i<order.length-1;i++){
        send_this.push(order[i].href.split('value=')[1])
    }
    //console.log(send_this)
    fetch(`/playlist/sort/${params.get('name')}`, {
        method: 'PUT',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({"order":send_this})
    }).then(async a =>{
        response = await a.json()
        if(a.ok){
            alarm('alerts',true,response.reason)
            setTimeout(()=>{
                window.location.href=`/explainPlaylist.html?name=${params.get('name')}`
            },2000)
        }
        else{
            alarm('alerts',false,response.reason)
        }
    })
}