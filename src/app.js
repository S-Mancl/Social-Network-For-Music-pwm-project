const express = require('express')
require('dotenv').config()
const validator = require('validator');
const crypto = require('crypto')
const cors = require('cors')
const mongoClient = require('mongodb').MongoClient;
const mongoUrl = "mongodb+srv://"+process.env.MONGONAME+":"+process.env.MONGOPASSWORD+"@pwm.hwxyajg.mongodb.net/?retryWrites=true&w=majority"
const path = require('path')
const jwt = require('jsonwebtoken');
const cookieParser = require("cookie-parser");
const mongoSanitize = require('express-mongo-sanitize')({allowDots: true,replaceWith: ''});

const app = express()
app.use(express.json())
app.use(cors())//per i cors
app.use(cookieParser());

var token = {
    value: "none",
    expiration: 42,
    regenAndThen : function(func_to_apply,paramA,paramB){
        fetch(baseUrls.token, {
            method: "POST",
            headers: {
            Authorization: "Basic " + btoa(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`),
            "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ grant_type: "client_credentials" }),
        })
        .then((response) => response.json())
        .then((tokenResponse) => {
            this.expiration = new Date().getTime(); //ms since doesn't matter
            //console.log(tokenResponse.access_token)
            this.value=tokenResponse.access_token
            //console.log(this.value)
            func_to_apply(paramA,paramB)
        })                   
    },
    hasExpired : function(){
        //console.log("dateDelta: "+(new Date().getTime()-this.expiration)/1000/60)
        if(((new Date().getTime()-this.expiration)/1000/60)>=59){
            return true;
        }
        else return false;
    }
}

const baseUrls = {
    search: "https://api.spotify.com/v1/search?",
    token: "https://accounts.spotify.com/api/token",
    genres: "https://api.spotify.com/v1/recommendations/available-genre-seeds",
    basic: "https://api.spotify.com/v1/"
}

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger-output.json');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

function hash(input) {
    return crypto.createHash('md5')
        .update(input)
        .digest('hex')
}

function perform(questo,paramA,paramB){
    if(token.hasExpired()) token.regenAndThen(questo,paramA,paramB)
    else questo(paramA,paramB)
}

function getGenres(req,res){
    //console.log(token.value)
    fetch(baseUrls.genres,{
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token.value,
        },
    })
    .then((response) => response.json())
    .then((searchResults) => {
        var answer = {
            status: 200,
            results: searchResults.genres
        }
        if(searchResults.error!=undefined) answer.status = searchResults.error
        res.json(answer)
    }
    )    
}

function createUrlForSearch(question){
    var url = baseUrls.search+"q="+question.string+"&type="
    question.type.forEach(element => {
        url += element
        url += ","
        //console.log(url)
    });
    url = url.slice(0,-1)
    url += "&limit="+question.limit+"&offset="+question.offset
    //console.log(url)
    return url
}

function askSpotify(res,question){
    /*
        Format of question
        question = {
            string: String,
            type: Array(types) <- tra album, playlist,episode,track,audiobook,artist,show,
            limit: number
            offset: number
        }
    */
    question.string = validator.escape(question.string) //just to improve security
    
    fetch(createUrlForSearch(question),{
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token.value,
        },
    })
    .then((response) => response.json())
    .then((searchResults) => {
        res.json(searchResults)
    }
    )
}

function getInfo(details,res){
    var url = baseUrls.basic+details.kind+"/"+details.id
    fetch(url,{
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token.value,
        },
    })
    .then((response) => response.json())
    .then((searchResults) => {
        res.json(searchResults)
    }
    )
}
async function login(res,user){
    /*
        Format of user
        user = {
            email: email,
            password: password,
        }
    */
    if((typeof user.email !== 'string' &&!( user.email instanceof String)) || (typeof user.password !== 'string' &&!( user.password instanceof String))) res.status(400).json({code:1,reason: `Don't try to mess with me...`})
    else if(user.email == undefined || user.password == undefined) res.status(400).json({code:1,reason: `You are missing some fields or they are not strings...`})
    else{
        user.email = validator.escape(validator.trim(user.email))
        user.email = user.email.toLowerCase()
        user.password = validator.escape(validator.trim(user.password))
        if(!validator.isEmail(user.email)) res.status(400).json({code:2,reason:`This isn't really an email, is it?`})
        else{
            user.password = hash(user.password)
            var pwmClient = await new mongoClient(mongoUrl).connect()
            var filter = {
                $and : [
                    {"email": user.email},
                    {"password": user.password}
                ]
            }
            var loggedUser = await pwmClient.db("pwm_project")
                .collection('users')
                .findOne(filter);
            //console.log(loggedUser)
            if(loggedUser == null) res.status(401).json({code:3,reason:`This user does not exist or its password is not the one you inserted.`})
            else{
                //JWT and cookie
                var token = jwt.sign(
                    {
                        username:user.userName,
                        email:user.email,
                        exp: Math.floor(Date.now() / 1000) + (60 * 60),
                    },
                    process.env.SECRET)
                res.cookie(`token`,token,{maxAge:60*1000*1000,httpOnly:true})
                res.status(200).json({code:4,reason:`Logged successfully!`})
            }
            pwmClient.close()
        }
    }
}


async function register(res,user){
    /*
        Format of user
        user = {
            name: String,
            surname: String,
            userName: String,
            email: String
            birthDate: Date
            favoriteGenres: Array(genres) <- tra /genres
            password: String
            favorites: object of arrays of types
        }
    */

    if(user.name==undefined || user.password==undefined || user.surname == undefined || user.userName == undefined || user.birthDate == undefined || user.favoriteGenres == undefined || user.email == undefined) res.status(400).json({code:-1,reason: `You are missing some fields...`})
    else{
        [`name`,`surname`,`userName`,`birthDate`,`password`,`email`].forEach(key => {
            //console.log(user[key])
            user[key] = validator.escape(validator.trim(user[key]))
        })
        for (let i = 0; i < user.favoriteGenres.length; i++){
            user.favoriteGenres[i] = validator.escape(validator.trim(user.favoriteGenres[i]))
        }
        if(!validator.isEmail(user.email)) res.status(400).json({code:1,reason:`Are you sure ${user.email} is an email?`})
        else if(!validator.isStrongPassword(user.password)) res.status(400).json({code:2,reason:`${user.password} is not strong enough as a password`})
        else if(!validator.isDate(user.birthDate)) res.status(400).json({code:3,reason:`${user.birthDate} is not an accepted birth date`})
        else if(!validator.isAlpha(user.name)||!validator.isAlpha(user.surname)) res.status(400).json({code:4,reason:`${user.name} ${user.surname} is not an accepted name... It contains numbers or it's empty!`})
        else if(user.userName=="") res.status(400).json({code:7,reason:`You have selected an invalid username. Please try again`})
        else{
            //user.email = validator.normalizeEmail(user.email)
            user.email = user.email.toLowerCase()
            user.password = hash(user.password)
            user.favorites = {
                album: [],
                artist: [],
                audiobook: [],
                episode: [],
                playlist: [],
                show: [],
                track: []
            }
            var pwmClient = await new mongoClient(mongoUrl).connect()
            try {
                var items = await pwmClient.db("pwm_project").collection('users').insertOne(user)
                delete items.insertedId
                res.status(200).json({code:0,items:items})
                pwmClient.close()
            }
            catch (e) {
                //console.log('catch in test');
                if (e.code == 11000) {
                    res.status(400).json({code:5,reason:"Already present user: please choose a different username or email"})
                    return
                }
                res.status(500).json({code:6,reason:`Generic error: ${e}`})
        
            };
        }
    }
}

function checkLogin(req,res){
    if(req.cookies.token == undefined) res.status(400).json({})
    else{
        var token = req.cookies.token
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(400).json(err)
            }
            else{
                //console.log(decoded)
                var pwmClient = await new mongoClient(mongoUrl).connect()
            var filter = {"email": decoded.email}
            var loggedUser = await pwmClient.db("pwm_project")
                .collection('users')
                .findOne(filter);
            if(loggedUser == null) res.status(401).clearCookie(`token`).json({code:3,reason:`Somehow you are logged as a user that does not exist... are you trying to mess with me?`})
            else{
                delete loggedUser._id
                delete loggedUser.password
                console.log(loggedUser)
                res.status(200).json(loggedUser)
            }        
            pwmClient.close()
            }
        })
    }
}

async function addOrRemoveFavorite(req,res){
    //console.log(req.body.id,req.body.name,req.body.category)
    //connect to DB, evaluate if present, else... etc
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(400).json({"reason": `Invalid login`})
    else{
        const user = jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(400).json(err)                
                pwmClient.close()
            }
            else{
                var filter = {"email":decoded.email}
                var loggedUser = await pwmClient.db("pwm_project")
                            .collection('users')
                            .findOne(filter);
                //così ho trovato l'utente loggato
                //ora devo ricavarne i campi da modificare
                //console.log(await loggedUser.favorites[req.body.category].some(element => element.id ==req.body.id))
                if(await loggedUser.favorites[req.body.category].some(element => element.id ==req.body.id)){
                    loggedUser.favorites[req.body.category].splice(loggedUser.favorites[req.body.category].indexOf({"name":req.body.name,"id":req.body.id}),1)
                    res.status(200).json({"removed":true})
                    //console.log(JSON.stringify(loggedUser.favorites[req.body.category]))
                }//se non è già presente allora lo devo invece aggiungere
                else {
                    loggedUser.favorites[req.body.category].push({"name":req.body.name,"id":req.body.id})
                    res.status(200).json({"removed":false})
                }
                await pwmClient//e infine aggiorno il db
                    .db("pwm_project")
                    .collection("users")
                    .replaceOne(
                        filter,
                        loggedUser
                    )
                pwmClient.close()
            }
        })
    }
}

async function isStarred(req,res){
    //console.log(req.body.category)
    //connect to DB, evaluate if present, else... etc
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(400).json({"reason": `Invalid login`})
    else{
        const user = jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(400).json(err)
                pwmClient.close()
            }
            else{
                var filter = {"email":decoded.email}
                var loggedUser = await pwmClient.db("pwm_project")
                            .collection('users')
                            .findOne(filter);
                //console.log(loggedUser.favorites[req.body.category])                            
                if(await loggedUser.favorites[req.body.category].some(element => element.id ==req.body.id)){
                    res.status(200).json({"favorite":true})
                    //console.log(JSON.stringify(loggedUser.favorites[req.body.category]))
                }//se non è già presente allora lo devo invece aggiungere
                else res.status(200).json({"favorite":false})
                pwmClient.close()
            }
        })
    }
}
/*
    FUNZIONI ASSORTITE per lavorare con le playlists
*/
function newPlaylist(req,email){
    var a = {
        "name":"",
        "songs":[],
        "description":"",
        "tags":[],
        "public":false, //default privata
        "groups":[],
        "owner":email
    }
    if (
        req.body.newPlaylist.nome!=undefined&&req.body.newPlaylist.nome!=null&&
        req.body.newPlaylist.descrizione!=undefined&&req.body.newPlaylist.descrizione!=null
        )
        {
            a.name=req.body.newPlaylist.nome+"_"+email
            a.description=req.body.newPlaylist.descrizione
            return a
        }
    return null;
}

function isOwner(playlist,email){
    return playlist.owner==email
}

function addSong(playlist,song){
    playlist.songs.push(song)
    return playlist
}

async function removeSong(playlist,song){
    var elementToRemove = await playlist.songs.find(element => element.id == song.id)
    playlist.songs.splice(indexOf(elementToRemove),1)
    return playlist
}

function publish(playlist){
    playlist.visibility=true;
    return playlist;
}

function makePrivate(playlist){
    playlist.visibility=false;
    return playlist;
}

function changeOwner(playlist,newOwner){
    playlist.owner=newOwner;
    return playlist;
}

function canSee(playlist, groupList, user){
    return playlist.visibility || /*await groupList.playlists.some(group => await group.some(element => element == playlist.name)) || STILL TO DO*/ playlist.owner == user.email
}


/*
    FINE FUNZIONI ASSORTITE per lavorare con le playlists
*/

async function playlistOperations(req,res){
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(400).json({"reason": `Invalid login`})
    else{
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(400).json(err)
                pwmClient.close()
            }
            else{
                /*
                    Struttura di una playlist:
                        {
                            "nome":Stringa,
                            "canzoni":[
                                {
                                    "titolo":Stringa,
                                    "durata":numero (ms),
                                    "cantante":Stringa,
                                    "genere":Stringa,
                                    "anno_di_pubblicazione":Stringa,
                                },
                                ...
                            ],
                            "descrizione":Testo,
                            "tag":[
                                Stringa,
                                ...
                            ],
                            "public":Boolean //pubblica=>false,privata=>true,se privata => gruppi?
                            "gruppi_concessi":[
                                Stringa,
                                ...
                            ],
                            "owner":email
                        }
                */
                //mi assicuro che ci sia l'utente
                var filter = {"email":decoded.email}
                var loggedUser = await pwmClient.db("pwm_project")
                            .collection('users')
                            .findOne(filter);
                //ora faccio uno switch in base alle operazioni:
                switch (req.body.operation) {
                    case "delete":
                        //elimino una playlist
                        try{
                            let a = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": req.body.name})
                            if(a != null && a != undefined && isOwner(a,decoded.email)){
                                //-3. per ogni utente, diverso dall'owner, elimino la playlist da quelle seguite, laddove presente.
                                let allUsers = pwmClient.db("pwm_project").collection("users").find({"email":{$not: decoded.email}})
                                for(let user in allUsers){
                                    if(await user.playlistsFollowed.some(element => element == a.name)){
                                        user.playlistsFollowed.splice(await user.playlistsFollowed.indexOf(a.name),1)
                                        await pwmClient.db("pwm_project").collection('users').updateOne({"email":user.email},user)
                                    }
                                }
                                //STILL TO DO CON I GRUPPI
                                //-2. elimino, dall'utente che la possedeva, la playlist, sia da quelle seguite che da quelle totali (aka assicuro integrità referenziale)
                                let userToUpdate = await pwmClient.db("pwm_project").collection('users').findOne({"email":decoded.email});
                                userToUpdate.playlistsOwned.splice(await userToUpdate.indexOf(a.name),1)
                                userToUpdate.playlistsFollowed.splice(await userToUpdate.indexOf(a.name),1)
                                await pwmClient.db("pwm_project").collection('users').updateOne({"email":decoded.email},userToUpdate);
                                //-1. elimino la playlist
                                await pwmClient.db("pwm_project").collection('playlists').deleteOne(a)
                                //se non è esploso niente allora è tutto okay, spero
                                res.status(200).json({"reason":"done correctly"})
                            }
                            else res.status(400).json({"reason":"Probably you haven't specified the right params"})
                        }
                        catch(e){
                            //l'inserimento non è andato a buon fine?
                            res.status(400).json(e)
                        }
                        break;
                    case "new":
                        try{
                            if(newPlaylist(req,filter.email)!=null){
                                let playlistToAdd = newPlaylist(req,filter.email)
                                await pwmClient.db("pwm_project").collection('playlists').insertOne(playlistToAdd)
                                let userToUpdate = await pwmClient.db("pwm_project").collection('users').findOne({"email":decoded.email});
                                userToUpdate.playlistsOwned.push(playlistToAdd.name)
                                userToUpdate.playlistsFollowed.push(playlistToAdd.name)
                                await pwmClient.db("pwm_project").collection("users").updateOne({"email":decoded.email},userToUpdate)
                                res.status(200).json({"reason":"inserted correctly"})
                            }
                            else res.status(400).json({"reason":"Probably you haven't specified the right params"})
                        }
                        catch(e){
                            //insermento non andato a buon fine?
                            res.status(400).json(e)
                        }
                        break;
                    case "follow":
                        //aggiungo al profilo la playlist seguita (essa deve essere pubblica o visibile per me)
                        try{
                            let a = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": req.body.name})
                            let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                            //TO DO ottenere i gruppi di cui fa parte
                            if(canSee(a,undefined,user)){
                                user.playlistsFollowed.push(a.name)
                                await pwmClient.db("pwm_project").collection("users").updateOne({"email":decoded.email},user)
                                res.status(200).json({"reason":"ok"})
                            }
                            else res.status(400).json({"reason":"this playlist does not exist or you can't see it"})
                        }
                        catch(e){res.status(400).json(e)}
                        break;
                    case "unfollow":
                        //rimuovo dal profilo la playlist seguita. 
                        try{
                            let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                            let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": req.body.name})
                            if(await user.playlistsFollowed.some(name => name == playlist.name)){
                                user.playlistsFollowed.splice(indexOf(playlist.name),1)
                                await pwmClient.db("pwm_project").collection("users").updateOne({"email":decoded.email},user)
                                res.status(200).json({"reason":"ok"})
                            }
                        }catch(e){res.status(400).json(e)}
                        break;
                    case "add song":
                        try{
                            let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                            let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": req.body.name})
                            if(isOwner(playlist,user.email)){
                                let details = await fetch(`/requireInfo/tracks/${req.body.song_id}`)
                                details = await details.json()
                                let song = {
                                    titolo : details.name,
                                    durata : details.duration_ms,
                                    cantante: details.artists[0].name,
                                    //genere: TODO: non c'è nei dati restituiti
                                    anno_di_pubblicazione: details.album.releaseDate.split("-")[0]
                                }
                                if(! await playlist.songs.some(element => element.id == song_id)){
                                    playlist = addSong(playlist,song)
                                    await pwmClient.db("pwm_project").collection('playlists').updateOne({"name":playlist.name},playlist)
                                }
                                res.status(200).json({"reason":"done"})
                            }
                            else res.status(400).json({"reason":"you are not the owner of this playlist"})
                        }catch(e){res.status(400).json({"reason":e})}
                        //aggiungo una canzone con tutti i dettagli alla playlist
                        break;
                    case "remove song":
                        try{
                            let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                            let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": req.body.name})
                            if(isOwner(playlist,user.email)){
                                let details = await fetch(`/requireInfo/tracks/${req.body.song_id}`)
                                details = await details.json()
                                let song = {
                                    titolo : details.name,
                                    durata : details.duration_ms,
                                    cantante: details.artists[0].name,
                                    //genere: TODO: non c'è nei dati restituiti
                                    anno_di_pubblicazione: details.album.releaseDate.split("-")[0]
                                }
                                if(await playlist.songs.some(element => element.id == song_id)) {
                                    playlist = await removeSong(playlist,song)
                                    await pwmClient.db("pwm_project").collection('playlists').updateOne({"name":playlist.name},playlist)
                                }
                                res.status(200).json({"reason":"done"})
                            }
                            else res.status(400).json({"reason":"you are not the owner of this playlist"})
                        }catch(e){res.status(400).json({"reason":e})}
                        //rimuovo una canzone con tutti i dettagli dalla playlist
                        break;
                    case "transfer ownership":
                        try{
                            let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                            let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": req.body.name})
                            if(isOwner(playlist,user.email) & validator.isEmail(req.body.new_owner) && await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})!=null && await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})!=undefined){
                                changeOwner(playlist,req.body.new_owner)
                                res.status(200).json({"reason":"ok"})
                            }
                            else res.status(400).json({"reason":"you do not own this playlist, or some other data you inserted is not valid. Stop trying to hack me, please"})
                        }catch(e){res.status(400).json(e)}
                        //trasferisco la proprietà della playlist a un altro user
                        break;
                    case "share":
                        //condivido la playlist con un gruppo TODO
                        break;
                    case "do not share":
                        //rimuovo la condivisione con un gruppo TODO
                        break;
                    case "publish":
                        //rendo la playlist visibile world-wide
                        try{
                            let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                            let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": req.body.name})
                            if(isOwner(playlist,user.email)){
                                playlist = publish(playlist)
                                await pwmClient.db("pwm_project").collection('playlists').updateOne({"name": req.body.name},playlist)
                                res.status(200).json({"reason":"ok"})
                            }
                            else res.status(400).json({"reason":"not owner"})
                        }catch(e){res.status(400).json(e)}
                        break;
                    case "make private":
                        //rendo la playlist privata
                        try{
                            let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                            let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": req.body.name})
                            if(isOwner(playlist,user.email)){
                                playlist = makePrivate(playlist)
                                await pwmClient.db("pwm_project").collection('playlists').updateOne({"name": req.body.name},playlist)
                                res.status(200).json({"reason":"ok"})
                            }
                            else res.status(400).json({"reason":"not owner"})
                        }catch(e){res.status(400).json(e)}
                        break;
                    case "get info":
                        try{
                            let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                            let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": req.body.name})
                            //TODO groups      vvvvvvvvv
                            if(canSee(playlist,undefined,user)){
                                res.json(200).json(playlist)
                            }
                            else{
                                res.json(401).json({"reason":"you cannot access this"})
                            }
                        }catch(e){res.status(400).json(e)}
                        //ottengo le informazioni sulla playlist
                        break;
                    default:
                        //non ho capito che operazione si voglia fare, nel dubbio:
                        res.status(400).json({"reason":"Are you trying to hack me?"})
                        break;
                }
                pwmClient.close()
            }
        })
    }
}

app.use('/',express.static(__dirname + '/static'))
app.use('/images',express.static(__dirname+'/static/resources/imgs'))
app.use('/scripts',express.static(__dirname+'/static/resources/srcs'))
app.use('/styles',express.static(__dirname+'/static/resources/css'))

app.get('/coffee', (req, res) => {
    res.status(418).json({"answer":"I'm not a teapot, but I cannot brew coffee..."})
})

app.get('/genres',(req,res)=>{
    //console.log(token.hasExpired())
    perform(getGenres,req,res);
})
app.get('/types',(req,res)=>{
    res.status(200).json(
        [
            "album",
            "episode",
            "track",
            "audiobook",
            "artist",
            "show"
        ]
            .sort())
})

app.post("/register",mongoSanitize,(req, res)=>{
    perform(register,res,req.body)
})
app.post("/login",mongoSanitize, (req, res)=>{
    perform(login,res,req.body)
})

app.post("/search",(req,res)=>{
    perform(askSpotify,res,req.body);
})

app.get('/requireInfo/:kind',(req,res)=>{
    const details = {
        kind: req.params.kind,
        id : req.query.id
    }
    perform(getInfo,details,res)
})

app.get(`/logout`,mongoSanitize,(req,res)=>{
    try{res.status(200).clearCookie(`token`).json({success:true})}
    catch(e){res.status(400).json({success:false})}
})

app.get(`/checkLogin`,mongoSanitize,(req,res)=>{
    perform(checkLogin,req,res)
})

app.post('/addOrRemoveFavorite',mongoSanitize,(req,res)=>{
    perform(addOrRemoveFavorite,req,res)
})

app.post('/isStarred',mongoSanitize,(req,res) =>{
    perform(isStarred,req,res)
})

app.post('/playlistOperations',mongoSanitize,(req,res)=>{
    perform(playlistOperations,req,res)
})

app.get("*", (req, res) => {
    //console.log(path.join(__dirname,'/static/not_found.html'))
    res.status(404).sendFile(path.join(__dirname, '/static/not_found.html'));
})

app.listen(process.env.PORT, "0.0.0.0", () => {
    console.log(`Server started. Port ${process.env.PORT}. http://localhost:${process.env.PORT}/index.html`)
})