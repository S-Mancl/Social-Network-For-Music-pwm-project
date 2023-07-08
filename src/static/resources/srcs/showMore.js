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
            alarm('toFill',false,`Hey there! Are you sure some results existed? Because I received this error: <code>${response.error.message}</code>. Try reloading and searching again, maybe...`)
        }
    }
    catch(e){
        //console.log(`here`)
        document.getElementById('title').innerHTML=`Your results: page ${params.get('page')}`
        key = params.get('kind')
        document.getElementById('toFill').innerHTML+=`<div class="row" id="${key}"><div class="normal-text">We found the following <strong>${key}</strong></div></div>
        
        <div class="col-md-8 col-11 mx-auto">
        <div class="row g-4 mt-4 p-4 d-flex justify-content-center">
            <div id="card-${key}" class="col-8 m-2 m-md-0 mb-md-2 col-md-6 col-lg-4 col-xxl-2 d-none">
            <div  class="card h-100 w-100 w-100 normal-text adapt-size m-1">
            <img  class="card-img-top" alt="...">
            <div class="card-body"><h5 class="card-title normal-text"></h5><p class="card-text"></p></div>
            <div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="#" class="btn btn-secondary testo-pulsante text-btn-this">View more</a></div></div></div></div></div>`
        

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
        clone.getElementsByClassName('text-btn-this')[0].classList.add('disabled')
        //document.getElementById("card-"+key+"-more").classList.remove('disabled')
        clone.classList.remove('d-none')
        clone.classList.add('d-block')
        if(parseInt(params.get('page'))-1>0) clone.getElementsByClassName('text-btn-this')[0].classList.remove('disabled')
        card.before(clone)



        let status = [true]
        
        //console.log("trying "+key)
        if(response[key].items.length==0){
            status = [false,'Sorry, we found nothing else!','Please try searching again with other params!']
        }
        for(let i = 0;i<response[key].items.length;i++){
            try{
                var card = document.getElementById("card-"+key)
                var clone = card.cloneNode(true)
                clone.id = "card-"+key+"-"+i
                clone.getElementsByClassName('card-title')[0].innerHTML = response[key].items[i].name
                try{clone.getElementsByClassName('card-img-top')[0].src = response[key].items[i].images[1].url}catch(e){
                    try{
                        clone.getElementsByClassName('card-img-top')[0].src = response[key].items[i].album.images[1].url
                    }catch(e){clone.getElementsByClassName('card-img-top')[0].classList.add('d-none')}
                }
                try{clone.getElementsByClassName('text-body-secondary')[0].innerHTML=`${duration(response[key].items[i].duration_ms)}`}catch(e){console.log(e)}
                clone.getElementsByClassName('btn')[0].href = "/describe.html?kind="+key+"&value=" + response[key].items[i].id
                clone.classList.remove('d-none')
                clone.classList.add('d-block')
                card.before(clone)
                //console.log("done correctly "+key)
            }
            catch(e){
                //console.log(e)
                //console.log(key)
                console.log(`critical failure`)
                status = [false,'Sorry, we found nothing else!','Please try searching again with other params!']
                //console.log('here')
            };
        }
        
        var card = document.getElementById("card-"+key)
        var clone = card.cloneNode(true)
        clone.id = "card-"+key+"-more"
        clone.getElementsByClassName('card-title')[0].innerHTML = "Discover more!"
        clone.getElementsByClassName('card-text')[0].innerHTML = "You'll find more of this category!"
        //clone.getElementsByClassName('text-body-secondary')[0].innerHTML = popolari.results[i].release_date
        clone.getElementsByClassName('card-img-top')[0].src = '/images/black.png'
        clone.getElementsByClassName('btn')[0].href = "/showMore.html?kind="+key+"&value=" + question.string +"&page="+(parseInt(params.get('page'))+1)
        if(!status[0]){
            clone.getElementsByClassName('btn')[0].classList.add('disabled')
            clone.getElementsByClassName('card-title')[0].innerHTML = status[1]
            clone.getElementsByClassName('card-text')[0].innerHTML = status[2]
        }
        clone.classList.remove('d-none')
        clone.classList.add('d-block')
        //clone.getElementsByClassName('btn')[0].classList.add('disabled')
        card.before(clone)

    }
})