function login(){
    var user = {
        email: document.getElementById(`email`).value,
        password: document.getElementById(`pass1`).value
    }
    fetch("/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(user)
    })
    .then(a => a.json())
    .then(response => {
        if(response.code==4) {
            alarm('toFill',true,'You successfully logged in.')
            setTimeout(()=>{
                checkLoginAndRedirect()
            },1500)

        }
        else{
            alarm('toFill',false,`We received an error: code: <code>${response.code}</code>, and a message, that is: <code>${response.reason}</code>.`)
            document.getElementById(`email`).style.border = "0px solid red"
            document.getElementById(`pass1`).style.border = "0px solid red"
            switch(response.code){
                case 1:
                    document.getElementById(`email`).style.border = "5px solid red"
                    document.getElementById(`pass1`).style.border = "5px solid red"
                    break;
                case 2:
                    document.getElementById(`email`).style.border = "5px solid red"
                    break;
                case 3:
                    document.getElementById(`email`).style.border = "5px solid red"
                    document.getElementById(`pass1`).style.border = "5px solid red"
                    break;
                default:
                    console.log(`${response.code}, ${response.reason}`)
            }
        }
    })
}