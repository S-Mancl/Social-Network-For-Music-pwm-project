try{
    const params = new URLSearchParams(window.location.search)
    if(params.has('tag')) getPlaylistsByTag()
    else if(params.has('name')) getPlaylists()
}
catch(e){}
function createPlaylist(){
    fetch('/checkLogin').then(a =>{
        if(a.ok){
            playlist = {
                nome: document.getElementById("nome").value,
                descrizione: document.getElementById('descrizione').value
            }
            fetch("/playlist", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(playlist)
            })
            .then(async a =>{
                var response = await a.json()
                if(a.ok){
                    setTimeout(()=>{
                        window.location.href=`/profile.html`
                    },3000)
                    alarm('alerts',true,`You successfully created a new playlist!. Please wait to be redirected to your profile.`)
                }
                else{
                    alarm('alerts',false,response.reason)

                }
            })
            }
        else window.location.href=`login.html?redirect=playlists.html`
    })
}
function newPlaylist(){
    document.getElementById('if-not-searching').style.display='none'
    document.getElementById('if-searching').style.display='none'
    document.getElementById('if-creating').style.display='block'
}

function searchPlaylists(){
    document.getElementById('if-not-searching').style.display='block'
    document.getElementById('if-searching').style.display='none'
    document.getElementById('if-creating').style.display='none'
}