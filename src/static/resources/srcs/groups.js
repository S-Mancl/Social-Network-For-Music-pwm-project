//cosa devo fare?
//1. fetcho i gruppi
var groupList
fetch('/groupList').then(async a =>{
    answer = await a.json()
    groupList = answer
    if(a.ok){

        let toFill = document.getElementById('fillThisWithGroups')

        var key = "groups-followed"
        toFill.innerHTML+=`<div id="anche-questo-${key}" class="row g-4 mt-4 p-4 d-flex justify-content-center"><div id="card-${key}" class="col-8 m-2 m-md-0 mb-md-2 col-md-6 col-lg-4 col-xxl-2 d-none"><div  class="card h-100 normal-text adapt-size m-1"><div class="card-body"><h5 class="card-title normal-text"></h5><p class="card-text"></p></div><div class="card-footer"><p class="card-text"><small class="text-body-secondary"></small></p><a href="#" class="btn btn-secondary testo-pulsante testo-pulsante">View more</a></div></div></div></div>`
        var card = document.getElementById("card-"+key)
        var clone = card.cloneNode(true)
        clone.id = "card-"+key+"-nope"
        clone.getElementsByClassName('card-title')[0].innerHTML = "Sorry, we found nothing!"
        clone.classList.remove('d-block')
        clone.classList.add('d-none')
        card.after(clone)
        if(answer.length==0){
            document.getElementById("anche-questo-"+key).classList.add('d-none')
        }
        for(let i = 0;i<answer.length;i++){
            try{
                var card = document.getElementById("card-"+key)
                var clone = card.cloneNode(true)
                clone.id = "card-"+key+"-"+i
                clone.getElementsByClassName('card-title')[0].innerHTML = answer[i].name
                clone.getElementsByClassName('text-body-secondary')[0].innerHTML = answer[i].owner
                clone.getElementsByClassName('btn')[0].href = "/explainGroup.html?name=" + answer[i].name
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
        alarm('alerts',false,answer.reason)
        setTimeout(()=>{
            location.href='/login.html?redirect=groups.html'
        },2000)
    }
})
//2. creo un evento nell'html che onchange del coso di testo mi filtra i gruppi per nome

function changing(){
    let query = document.getElementById('search').value.toLowerCase()
    for(let i =0;i<groupList.length;i++){
        let card = document.getElementById('card-groups-followed-'+i)
        if(!card.getElementsByClassName(`card-title`)[0].innerHTML.toLowerCase().includes(query)) card.classList.add('d-none')
        else card.classList.remove('d-none')

    }
}


//funzioni varie
function newGroup(){
    document.getElementsByClassName('view-groups')[0].classList.add('d-none')
    document.getElementsByClassName('view-groups')[0].classList.remove('d-block')
    
    document.getElementsByClassName('create-groups')[0].classList.add('d-block')
    document.getElementsByClassName('create-groups')[0].classList.remove('d-none')
}
function newView(){
    document.getElementsByClassName('view-groups')[0].classList.add('d-block')
    document.getElementsByClassName('view-groups')[0].classList.remove('d-none')
    
    document.getElementsByClassName('create-groups')[0].classList.add('d-none')
    document.getElementsByClassName('create-groups')[0].classList.remove('d-block')
}
function craftGroup(){
    fetch('/checkLogin').then(a =>{
        if(a.ok){
            group = {
                nome: document.getElementById("nome").value,
                descrizione: document.getElementById('descrizione').value
            }
            fetch("/group", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(group)
            })
            .then(async a =>{
                var response = await a.json()
                if(a.ok){
                    setTimeout(()=>{
                        window.location.href=`/profile.html`
                    },3000)
                    alarm('alerts',true,`You successfully created a new group!. Please wait to be redirected to your profile.`)
                }
                else{
                    alarm('alerts',false,response.reason)

                }
            })
            }
        else window.location.href=`login.html?redirect=groups.html`
    })
}