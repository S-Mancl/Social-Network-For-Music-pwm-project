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
function colorSharing(visibility){
    return visibility?`success`:`danger`
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
                alarm('toFill',false,`Hey there! Are you sure you selected some categories to search for? Because I received this error: <code>${response.error.message}</code>. Try reloading and searching again, maybe...`)
            }
        }
        catch(e){
            for (const key in response) {
                document.getElementById('toFill').innerHTML+=`<div class="row" id="${key}"><div class="normal-text">We found the following <strong>${key}</strong></div></div><div class="row g-4 mt-4 p-4 d-flex justify-content-center"><div id="card-${key}" class="col-10 m-2 m-md-0 mb-md-2 col-md-6 col-lg-4 col-xxl-2 d-none"><div  class="card h-100 w-100 w-100 normal-text adapt-size m-1"><img  class="card-img-top" alt="..."><div class="card-body"><h5 class="card-title normal-text"></h5><p class="card-text"></p></div><div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="#" class="btn btn-secondary testo-pulsante">View more</a></div></div></div></div>`
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
                        try{clone.getElementsByClassName('card-img-top')[0].src = response[key].items[i].images[1].url}catch(e){
                            try{
                                clone.getElementsByClassName('card-img-top')[0].src = response[key].items[i].album.images[1].url
                            }catch(e){clone.getElementsByClassName('card-img-top')[0].classList.add('d-none')}
                        }
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
                alarm('alerts',true,`You removed this from your favorites`)
            unstar()
        }
            else{
                alarm('alerts',true,'You added this to your favorites')
                star()
            }
            }
        else{
            alarm('alerts',false,`Something hasn't worked properly: ${response.reason}`)
            }
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
            alarm('alerts',false,`${response.reason}`)
        }
    })
}

function star(){document.getElementById('isStarred').innerHTML=`<img class="rounded ps-2 ps-m-0 mx-auto d-block img-fluid reverse mt-4 mb-3" src="/images/heart-solid.svg">`}
function unstar(){document.getElementById('isStarred').innerHTML=`<img class="rounded ps-2 ps-m-0 mx-auto d-block img-fluid reverse mt-4 mb-3" src="/images/heart-regular.svg">`}

function duration(ms){
    if ( `${Math.floor(ms/1000/60)}:${Math.floor(ms/1000)-Math.floor(ms/1000/60)*60}`.split(":")[1].length<2)
    return `${Math.floor(ms/1000/60)}:0${Math.floor(ms/1000)-Math.floor(ms/1000/60)*60}`
    else return `${Math.floor(ms/1000/60)}:${Math.floor(ms/1000)-Math.floor(ms/1000/60)*60}`
}
function alarm(where,good,reason){
    document.getElementById(where).innerHTML=`<div class="toast-container position-fixed bottom-0 end-0 p-3 scale-text w-100" style="z-index: 11">
            <div id="liveToast" class="toast ${window.screen.availWidth>2000?"w-25":""} scale-text" role="alert" data-bs-autohide="false" aria-live="assertive" aria-atomic="true">
                <div class="toast-header  scale-text">
                <img src="/images/alert.png" class="rounded me-2 small-image  scale-text" alt="...">
                <strong class="me-auto text-${colorSharing(good)}  scale-text">${returnDescription(good)[0]}</strong>
                <small class="text-${colorSharing(good)} scale-text">${returnDescription(good)[1]}</small>
                <button type="button" class="btn-close scale-text" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body scale-text">
                ${reason==undefined?"":reason}
                </div>
                </div>
                </div>
                `
    var a = new bootstrap.Toast(document.querySelector('.toast'))
    a.show()
}
function returnDescription(status){
    return status?["Done correctly!","success"]:["Don't panic","failure"]
}
window.addEventListener('resize', () =>{
    let a = document.getElementById('liveToast')
    if(a!=null&&a!=undefined){
        console.log(window.screen.availWidth)
        if(window.screen.availWidth>2000){
            a.classList.add('w-25')
        }
        else {
            a.classList.remove('w-25')
        }
    }
});