fetch(`/logout`).then(res =>{
    setTimeout(()=>{
        window.location.href=`/index.html`
    },1000)
})