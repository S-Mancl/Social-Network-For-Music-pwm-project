const menuItems = [
    { label: "Playlists", link: "playlists.html", image:"music-solid" },
    { label: "Search", link: "search.html",image:"magnifying-glass-solid" },
    { label: "Groups", link: "groups.html",image:"user-group-solid" }
    //{ label: "", link: "" },
]

const dropdownItems = [
    { label: "register", link: "register.html", image:"door-open-solid", needsLogged:false },
    { label: "login", link: "login.html", image:"arrow-right-to-bracket-solid", needsLogged:false },
    { label: "logout", link: "logout.html", image:"arrow-right-from-bracket-solid",needsLogged:true },
    { label: "my favorites", link: "profile.html#favorites", image:"heart-solid",needsLogged:true},
    { label: "my playlists", link: "profile.html#playlists", image:"compact-disc-solid",needsLogged:true },
    { label: "my groups", link: "profile.html#groups", image:"user-group-solid",needsLogged:true },
    { label: "my profile", link: "profile.html", image:"address-card-solid",needsLogged:true },
]
var menuHTML = "";
var dropdownHTML = "";
fetch(`/checkLogin`).then(response => {
    if(response.ok){
        response.json().then(answer => {
            var dropdownHTML = `
                      <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle normal-text" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                            <img class="nav-image" src="/images/user-solid.svg">
                            ${answer.userName}
                        </a>
                        <ul class="dropdown-menu">
        `;
        for (let i = 0; i < menuItems.length; i++) {
            let item = menuItems[i];
            menuHTML += `<li class="nav-item"><a class="nav-link normal-text" href="${item.link}"><img class="nav-image" src="/images/${item.image}.svg">${item.label}</a></li>`;
        }
        for (let i = 0; i < dropdownItems.length; i++) {
            let item = dropdownItems[i];
            if(item.needsLogged)dropdownHTML += `<li><a class="dropdown-item normal-text" href="${item.link}"><img class="nav-image" src="/images/${item.image}.svg">${item.label}</a></li>`;
        }
        dropdownHTML += `
        </ul>
        </li>
        `
        console.log(document.getElementsByClassName("navbar")[0].innerHTML)
        document.getElementsByClassName("navbar")[0].innerHTML=`
                <div class="container-fluid">
                    <a class="navbar-brand fw-bold normal-text" href="./index.html"><img class="nav-image nav-brand-image" src="https://img.icons8.com/wired/64/tesseract.png" alt="tesseract"/>SNM</a>
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
                        aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div class="collapse navbar-collapse" id="navbarNav">
                        <ul class="navbar-nav">
                            ${menuHTML}
                        </ul>
                        <ul class="navbar-nav ms-auto">
                            ${dropdownHTML}
                        </ul>
                    </div>
                </div>
        `;
        })
    }
    else{
        var dropdownHTML = `
                      <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle normal-text" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                            <img class="nav-image" src="/images/user-solid.svg">
                            User
                        </a>
                        <ul class="dropdown-menu">
        `;
        for (let i = 0; i < menuItems.length; i++) {
            let item = menuItems[i];
            menuHTML += `<li class="nav-item"><a class="nav-link normal-text" href="${item.link}"><img class="nav-image" src="/images/${item.image}.svg">${item.label}</a></li>`;
        }
        for (let i = 0; i < dropdownItems.length; i++) {
            let item = dropdownItems[i];
            if(!item.needsLogged)dropdownHTML += `<li><a class="dropdown-item normal-text" href="${item.link}"><img class="nav-image" src="/images/${item.image}.svg">${item.label}</a></li>`;
        }
        dropdownHTML += `
        </ul>
        </li>
        `
        console.log(document.getElementsByClassName("navbar")[0].innerHTML)
        document.getElementsByClassName("navbar")[0].innerHTML=`
                <div class="container-fluid">
                    <a class="navbar-brand fw-bold normal-text" href="./index.html"><img class="nav-image nav-brand-image" src="https://img.icons8.com/wired/64/tesseract.png" alt="tesseract"/>SNM</a>
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
                        aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div class="collapse navbar-collapse" id="navbarNav">
                        <ul class="navbar-nav">
                            ${menuHTML}
                        </ul>
                        <ul class="navbar-nav ms-auto">
                            ${dropdownHTML}
                        </ul>
                    </div>
                </div>
        `;
    }
})