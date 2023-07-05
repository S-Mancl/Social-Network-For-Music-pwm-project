//cosa devo fare?
//1. fetcho i gruppi
//2. creo un evento che onchange del coso di testo mi filtra i gruppi per nome
//3. altrimenti mostr i primi 20 e stop



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