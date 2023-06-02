const menuItems = [
    { label: "Home - Playlists", link: "playlists.html", image:"music-solid" },
    { label: "Search", link: "search.html",image:"magnifying-glass-solid" },
    { label: "Groups", link: "groups.html",image:"user-group-solid" }
    //{ label: "", link: "" },
]

const dropdownItems = [
    { label: "register", link: "register.html", image:"door-open-solid" },
    { label: "login", link: "login.html", image:"arrow-right-to-bracket-solid" },
    { label: "logout", link: "logout.html", image:"arrow-right-from-bracket-solid" },
    { label: "my favorites", link: "favorites.html", image:"heart-solid"},
    { label: "my playlists", link: "myplaylists.html", image:"compact-disc-solid" },
]


var menuHTML = "";
var dropdownHTML = "";
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
    dropdownHTML += `<li><a class="dropdown-item normal-text" href="${item.link}"><img class="nav-image" src="/images/${item.image}.svg">${item.label}</a></li>`;
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