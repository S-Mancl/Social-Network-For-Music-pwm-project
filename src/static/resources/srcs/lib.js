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
                clone.getElementsByClassName('btn')[0].href = "/showMore.html?kind="+key+"&value=" + question.string
                clone.classList.remove('d-none')
                clone.classList.add('d-block')
                //clone.getElementsByClassName('btn')[0].classList.add('disabled')
                card.after(clone)
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

function fillData(){
    const params = new URLSearchParams(window.location.search)
    const question = {
        kind : params.get('kind'),
        value : params.get('value')
    }
    //console.log(question)
    console.log(`/requireInfo/${question.kind}?id=${question.value}`)
    fetch(`/requireInfo/${question.kind}?id=${question.value}`)
        .then((a) => a.json())
        .then((response) => {
            console.log(response)
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
        })
}