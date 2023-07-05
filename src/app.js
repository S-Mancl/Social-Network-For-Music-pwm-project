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
            
            this.value=tokenResponse.access_token
            
            func_to_apply(paramA,paramB)
        })                   
    },
    hasExpired : function(){
        
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
const { Timestamp } = require('mongodb');
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
        
    });
    url = url.slice(0,-1)
    url += "&limit="+question.limit+"&offset="+question.offset
    
    return url
}
function askSpotify(res,question){
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
            playlistsFollowed: array of strings (names)
            playlistsOwned: array of strings (names)
        }
    */

    if(user.name==undefined || user.password==undefined || user.surname == undefined || user.userName == undefined || user.birthDate == undefined || user.favoriteGenres == undefined || user.email == undefined) res.status(400).json({code:-1,reason: `You are missing some fields...`})
    else{
        [`name`,`surname`,`userName`,`birthDate`,`password`,`email`].forEach(key => {
            
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
                show: [],
                track: []
            }
            user.playlistsFollowed=[]
            user.playlistsOwned=[]
            user.groupsFollowed=[]
            user.groupsOwned=[]
            var pwmClient = await new mongoClient(mongoUrl).connect()
            try {
                var items = await pwmClient.db("pwm_project").collection('users').insertOne(user)
                delete items.insertedId
                res.status(200).json({code:0,items:items})
                pwmClient.close()
            }
            catch (e) {
                
                if (e.code == 11000) {
                    res.status(400).json({code:5,reason:"Already present user: please choose a different username or email"})
                    return
                }
                res.status(500).json({code:6,reason:`Generic error: ${e.toString()}`})
                pwmClient.close()
            };
        }
    }
}
async function updateUser(req,res){
    var pwmClient = await new mongoClient(mongoUrl).connect() 
    const token = req.cookies.token 
    if(token == undefined) res.status(400).json({"reason":"Invalid login"}) 
    else{ 
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{ 
            if(err){ 
                res.status(401).json(err) 
                pwmClient.close() 
            } 
            else{
                //TROVO L'UTENTE
                let utente = await pwmClient.db("pwm_project").collection("users").findOne({"email":decoded.email})
                //controllo la validità dei campi
                user = req.body
                if(user.name==undefined || user.password==undefined || user.surname == undefined || user.birthDate == undefined || user.favoriteGenres == undefined || user.email == undefined) res.status(400).json({code:-1,reason: `You are missing some fields...`})
                else{
                    [`name`,`surname`,`birthDate`,`password`,`email`].forEach(key => {
                        
                        user[key] = validator.escape(validator.trim(user[key]))
                    })
                    for (let i = 0; i < user.favoriteGenres.length; i++){
                        user.favoriteGenres[i] = validator.escape(validator.trim(user.favoriteGenres[i]))
                    }
                    if(!validator.isEmail(user.email)) res.status(400).json({code:1,reason:`Are you sure ${user.email} is an email?`})
                    else if(!validator.isStrongPassword(user.password)) res.status(400).json({code:2,reason:`${user.password} is not strong enough as a password`})
                    else if(!validator.isDate(user.birthDate)) res.status(400).json({code:3,reason:`${user.birthDate} is not an accepted birth date`})
                    else if(!validator.isAlpha(user.name)||!validator.isAlpha(user.surname)) res.status(400).json({code:4,reason:`${user.name} ${user.surname} is not an accepted name... It contains numbers or it's empty!`})
                    /*else if(user.userName=="") res.status(400).json({code:7,reason:`You have selected an invalid username. Please try again`})*/
                    else{
                        utente.email = user.email.toLowerCase()
                        utente.password = hash(user.password)
                        utente.name=user.name
                        utente.surname=user.surname
                        utente.birthDate=user.birthDate
                        utente.favoriteGenres=user.favoriteGenres
                        try {
                            await pwmClient.db("pwm_project").collection('users').updateOne({"userName":utente.userName},{$set:{"email":utente.email,"password":utente.password,"name":utente.name,"surname":utente.surname,"birthDate":utente.birthDate,"favoriteGenres":user.favoriteGenres}})
                            pwmClient.close()
                            res.status(200).clearCookie(`token`).json({code:0,"explanation":`you will now be logged out. Please re-login with your new credentials`})
                        }
                        catch (e) {
                            
                            if (e.code == 11000) {
                                res.status(400).json({code:5,reason:"Already present user: please choose a different username or email"})
                                return
                            }
                            res.status(500).json({code:6,reason:`Generic error: ${e.toString()}`})
                            pwmClient.close()
                        };
                    }
                }
            }
        })
    }
}
async function deleteUser(req,res){ 
    var pwmClient = await new mongoClient(mongoUrl).connect() 
    const token = req.cookies.token 
    if(token == undefined) res.status(400).json({"reason":"Invalid login"}) 
    else{ 
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{ 
            if(err){ 
                res.status(401).json(err) 
                pwmClient.close() 
            } 
            else{ 
                //elimino l'utente 
                try{
                    let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                    //-3 elimino l'utente da ogni gruppo in cui è, ed elimino ogni gruppo che sia owned, rimuovendolo prima da ogni utente che sia in quel gruppo
                    let allGroups = await pwmClient.db("pwm_project").collection("groups").find({}).toArray()
                    for(let index in allGroups){
                        let group = allGroups[index]
                        if(group.users.some(element => element == user.userName)){
                            group.users.splice(group.users.indexOf(user.userName),1)
                            await pwmClient.db("pwm_project").collection('groups').updateOne({"name":group.name},{$set:{"users":group.users}})
                        }
                    }
                    //-3 bis elimino ogni gruppo posseduto dall'utente
                    await pwmClient.db("pwm_project").collection("groups").deleteMany({"owner":user.userName})
                    //-2 elimino ogni playlist dell'utente da ogni lista di playlist seguite altrui
                    allGroups = await pwmClient.db("pwm_project").collection("groups").find({}).toArray()
                    let allPlaylists = pwmClient.db("pwm_project").collection("playlists").find({"owner":user.userName}).toArray()
                    let allUsers = pwmClient.db("pwm_project").collection("playlists").find({"email":{$ne:decoded.email}}).toArray()
                    for(let index1 in allPlaylists){
                        let playlist = allPlaylists[index1]
                        for(let index2 in allUsers){
                            let utente = allUsers[index2]
                            if(utente.playlistsFollowed.some(element => element == playlist.name)){
                                utente.playlistsFollowed.splice(utente.playlistsFollowed.indexOf(playlist.name),1)
                                await pwmClient.db("pwm_project").collection("users").updateOne({"email":utente.email},{$set:{"playlistsFollowed":utente.playlistsFollowed}})
                            }
                        }
                        for(let index in allGroups){
                            let group = allGroups[index]
                            if(group.playlistsShared.some(element => element == playlist.name)){
                                group.playlistsShared.splice(group.playlistsShared.indexOf(playlist.name),1)
                                await pwmClient.db("pwm_project").collection("groups").updateOne({"name":group.name},{$set:{"playlistsShared":group.playlistsShared}})
                            }
                        }
                    }
                    //-2 bis elimino ogni playlist owned dall'utente
                    await pwmClient.db("pwm_project").collection("playlists").deleteMany({"owner":utente.userName})
                    //-1 elimino l'account dell'utente
                    await pwmClient.db('pwm_project').collection('users').deleteOne({"email":decoded.email})
                    //0. forse è andato tutto liscio, e spero di non aver lasciato riferimenti pending da qualche parte
                    res.status(200).json({"reason":"ok"}) 
                }catch(e){
                    res.status(400).json({reason:`Generic error: ${e.toString()}`})
                }
                pwmClient.close() 
            } 
        }) 
    } 
}
function checkLogin(req,res){
    if(req.cookies.token == undefined) res.status(401).json({})
    else{
        var token = req.cookies.token
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(401).json(err)
            }
            else{
                
                var pwmClient = await new mongoClient(mongoUrl).connect()
            var filter = {"email": decoded.email}
            var loggedUser = await pwmClient.db("pwm_project")
                .collection('users')
                .findOne(filter);
            if(loggedUser == null) res.status(401).clearCookie(`token`).json({code:3,reason:`Somehow you are logged as a user that does not exist... are you trying to mess with me?`})
            else{
                delete loggedUser._id
                delete loggedUser.password
                log("Logged: "+JSON.stringify(loggedUser))
                res.status(200).json(loggedUser)
            }        
            pwmClient.close()
            }
        })
    }
}
async function addOrRemoveFavorite(req,res){
    
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(401).json({"reason": `Invalid login`})
    else{
        const user = jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(401).json(err)                
                pwmClient.close()
            }
            else{
                var filter = {"email":decoded.email}
                var loggedUser = await pwmClient.db("pwm_project")
                            .collection('users')
                            .findOne(filter);
                //così ho trovato l'utente loggato
                //ora devo ricavarne i campi da modificare
                
                if(await loggedUser.favorites[req.body.category].some(element => element.id ==req.body.id)){
                    loggedUser.favorites[req.body.category].splice(loggedUser.favorites[req.body.category].indexOf({"name":req.body.name,"id":req.body.id}),1)
                    res.status(200).json({"removed":true})
                    
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
    
    //connect to DB, evaluate if present, else... etc
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(401).json({"reason": `Invalid login`})
    else{
        const user = jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(401).json(err)
                pwmClient.close()
            }
            else{
                var filter = {"email":decoded.email}
                var loggedUser = await pwmClient.db("pwm_project")
                            .collection('users')
                            .findOne(filter);
                
                if(await loggedUser.favorites[req.body.category].some(element => element.id ==req.body.id)){
                    res.status(200).json({"favorite":true})
                    
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
function newPlaylist(req,userName){
    var a = {
        "name":"",
        "songs":[],
        "description":"",
        "tags":[],
        "visibility":false, //default privata
        "totalTime":0,
        "owner":userName
    }
    if (
        validator.escape(req.body.nome)!=undefined && validator.escape(req.body.nome)!=null &&
        validator.escape(req.body.descrizione)!=undefined && validator.escape(req.body.descrizione)!=null
        ){
            a.name=validator.escape(req.body.nome)
            a.description=validator.escape(req.body.descrizione)
            return a
        }
    return null;
}
function isOwner(playlist,userName){
    return playlist.owner==userName
}
function addSong(playlist,song){
    playlist.songs.push(song)
    playlist.totalTime+=song.duration
    return playlist
}
async function removeSong(playlist,song){
    var elementToRemove = await playlist.songs.find(element => element.id == song.id)
    playlist.songs.splice(indexOf(elementToRemove),1)
    playlist.totalTime-=song.duration
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
    try{
        return playlist.visibility /*La playlist è visibile globalmente*/ || groupList.some(group => {group.users.some(element == user.userName)/*Seguo un gruppo*/ && group.playlistsFollowed.some(element => element == playlist.name)/*e in quel gruppo c'è la playlist*/}) || playlist.owner == user.userName /*O la possiedo io direttamente*/
    }
    catch(e){
        return playlist.visibility || playlist.owner == user.userName
    }
}
function addTag(playlist,tag){
    if(!playlist.tags.some(element => element == tag)) playlist.tags.push(tag)
    return playlist
}
async function removeTag(playlist,tag){
    if(playlist.tags.some(element => element == tag)){
        playlist.tags.splice(playlist.tags.indexOf(tag),1)
    }
    return playlist
}
/*
    FINE FUNZIONI ASSORTITE per lavorare con le playlists
*/

async function makePlaylistPrivate(req,res){
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(401).json({"reason": `Invalid login`})
    else{
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(401).json(err)
                pwmClient.close()
            }
            else{
                //rendo la playlist privata
                try{
                    //la faccio 'dimenticare' ad ogni user o group che l'aveva, come per la delete
                    let a = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": validator.escape(req.params.name)})
                    //-3. per ogni utente, diverso dall'owner, elimino la playlist da quelle seguite, laddove presente.
                    let allUsers = await pwmClient.db("pwm_project").collection("users").find({"email":{$ne: decoded.email}}).toArray()
                    try{for(let index in allUsers){
                        
                        let user=allUsers[index]
                        if(user.playlistsFollowed.some(element => element == a.name)){
                            user.playlistsFollowed.splice(user.playlistsFollowed.indexOf(a.name),1)
                            await pwmClient.db("pwm_project").collection('users').updateOne({"email":user.email},{$set:{"playlistsFollowed":user.playlistsFollowed}})
                        }
                    }}catch(e){log(e.toString())}
                    //-2.5. per ogni gruppo elimino la playlist da quelle seguite, laddove presente
                    let allGroups = await pwmClient.db("pwm_project").collection("groups").find({}).toArray()
                    try{for(let index in allGroups){
                        let group = allGroups[index]
                        if(group.playlistsShared.some(element => element == a.name)){
                            group.playlistsShared.splice(group.playlistsShared.indexOf(a.name),1)
                            await pwmClient.db("pwm_project").collection('groups').updateOne({"name":group.name},{$set:{"playlistsShared":group.playlistsShared}})
                        }
                    }}catch(e){}
                    //e ora la posso togliere
                    let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                    let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": validator.escape(req.params.name)})
                    if(isOwner(playlist,user.userName)){
                        playlist = makePrivate(playlist)
                        await pwmClient.db("pwm_project").collection('playlists').updateOne({"name": validator.escape(req.params.name)},{$set:{"visibility":playlist.visibility}})
                        res.status(200).json({"reason":"ok"})
                    }
                    else res.status(400).json({"reason":"not owner"})
                }catch(e){res.status(400).json({reason:`Generic error: ${e.toString()}`})}
                pwmClient.close()
            }
        })
    }
}
async function publishPlaylist(req,res){
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(401).json({"reason": `Invalid login`})
    else{
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(401).json(err)
                pwmClient.close()
            }
            else{
                //rendo la playlist visibile world-wide
                try{
                    let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                    let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": validator.escape(req.params.name)})
                    if(isOwner(playlist,user.userName)){
                        playlist = publish(playlist)
                        await pwmClient.db("pwm_project").collection('playlists').updateOne({"name": validator.escape(req.params.name)},{$set:{"visibility":playlist.visibility}})
                        res.status(200).json({"reason":"ok"})
                    }
                    else res.status(400).json({"reason":"not owner"})
                }catch(e){res.status(400).json({reason:`Generic error: ${e.toString()}`})}
                pwmClient.close()
            }
        })
    }
}
async function removeTagFromPlaylist(req,res){
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(401).json({"reason": `Invalid login`})
    else{
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(401).json(err)
                pwmClient.close()
            }
            else{
                try{
                    let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                    let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": validator.escape(req.body.name)})
                    if(isOwner(playlist,user.userName)&&validator.escape(req.body.tag)!=null&&validator.escape(req.body.tag)!=undefined){
                        removeTag(playlist,validator.escape(req.body.tag.toLowerCase()))
                        await pwmClient.db('pwm_project').collection('playlists').updateOne({"name":playlist.name},{$set:{"tags":playlist.tags}})
                        res.status(200).json({"reason":"ok"})
                    }
                    else{
                        res.status(400).json({"reason":"bad data or not owner"})
                    }
                }catch(e){res.status(400).json({reason:`Generic error: ${e.toString()}`})}
                pwmClient.close()
            }
        })
    }
}
async function addTagToPlaylist(req,res){
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(401).json({"reason": `Invalid login`})
    else{
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(401).json(err)
                pwmClient.close()
            }
            else{
                try{
                    let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                    let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": validator.escape(req.body.name)})
                    if(isOwner(playlist,user.userName)&&validator.escape(req.body.tag)!=null&&validator.escape(req.body.tag)!=undefined){
                        addTag(playlist,validator.escape(req.body.tag.toLowerCase()))
                        await pwmClient.db('pwm_project').collection('playlists').updateOne({"name":playlist.name},{$set:{"tags":playlist.tags}})
                        res.status(200).json({"reason":"ok"})
                    }
                    else{
                        res.status(400).json({"reason":"bad data or not owner"})
                    }
                }catch(e){res.status(400).json({reason:`Generic error: ${e.toString()}`})}
                pwmClient.close()
            }
        })
    }
}
async function removeSongFromPlaylist(req,res){
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(401).json({"reason": `Invalid login`})
    else{
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(401).json(err)
                pwmClient.close()
            }
            else{
                try{
                    let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                    let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": validator.escape(req.body.name)})
                    if(isOwner(playlist,user.userName)){
                        let details = await fetch(`/requireInfo/tracks/${validator.escape(req.body.song_id)}`)
                        details = await details.json()
                        let song = {
                            titolo : details.name,
                            durata : details.duration_ms,
                            cantante: details.artists[0].name,
                            anno_di_pubblicazione: details.album.releaseDate.split("-")[0],
                            id : validator.escape(req.body.song_id)
                        }
                        if(await playlist.songs.some(element => element.id == song_id)) {
                            playlist = await removeSong(playlist,song)
                            await pwmClient.db("pwm_project").collection('playlists').updateOne({"name":playlist.name},{$set:{"songs":playlist.songs}})
                        }
                        res.status(200).json({"reason":"done"})
                    }
                    else res.status(400).json({"reason":"you are not the owner of this playlist"})
                }catch(e){res.status(400).json({"reason":e})}
                //rimuovo una canzone con tutti i dettagli dalla playlist
                pwmClient.close()
            }
        })
    }
}
async function unfollowPlaylist(req,res){
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(401).json({"reason": `Invalid login`})
    else{
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(401).json(err)
                pwmClient.close()
            }
            else{
                //rimuovo dal profilo la playlist seguita. 
                try{
                    let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                    let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": validator.escape(req.params.name)})
                    if(await user.playlistsFollowed.some(name => name == playlist.name)){
                        user.playlistsFollowed.splice(user.playlistsFollowed.indexOf(playlist.name),1)
                        await pwmClient.db("pwm_project").collection("users").updateOne({"email":decoded.email},{$set:{"playlistsFollowed":user.playlistsFollowed}})
                        res.status(200).json({"reason":"ok"})
                    }
                }catch(e){res.status(400).json({reason:`Generic error: ${e.toString()}`})}
                pwmClient.close()
            }
        })
    }
}
async function followPlaylist(req,res){
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(401).json({"reason": `Invalid login`})
    else{
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(401).json(err)
                pwmClient.close()
            }
            else{
                //aggiungo al profilo la playlist seguita (essa deve essere pubblica o visibile per me)
                try{
                    let a = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": validator.escape(req.params.name)})
                    let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                    let allGroups = await pwmClient.db("pwm_project").collection("groups").find({}).toArray()
                    if(canSee(a,allGroups,user)){
                        user.playlistsFollowed.push(a.name)
                        await pwmClient.db("pwm_project").collection("users").updateOne({"email":decoded.email},{$set:{"playlistsFollowed":user.playlistsFollowed}})
                        res.status(200).json({"reason":"ok"})
                    }
                    else res.status(400).json({"reason":"this playlist does not exist or you can't see it"})
                }
                catch(e){res.status(400).json({reason:`Generic error: ${e.toString()}`})}
                pwmClient.close()
            }
        })
    }
}
async function addSongToPlaylist(req,res){
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(401).json({"reason": `Invalid login`})
    else{
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(401).json(err)
                pwmClient.close()
            }
            else{
                try{
                    let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                    let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": validator.escape(req.body.name)})
                    if(isOwner(playlist,user.userName)){
                        let details = await fetch(`/requireInfo/tracks/${validator.escape(req.body.song_id)}`)
                        details = await details.json()
                        let song = {
                            titolo : details.name,
                            durata : details.duration_ms,
                            cantante: details.artists[0].name,
                            anno_di_pubblicazione: details.album.releaseDate.split("-")[0]
                        }
                        if(! await playlist.songs.some(element => element.id == song_id)){
                            playlist = addSong(playlist,song)
                            await pwmClient.db("pwm_project").collection('playlists').updateOne({"name":playlist.name},{$set:{"songs":playlist.songs}})
                        }
                        res.status(200).json({"reason":"done"})
                    }
                    else res.status(400).json({"reason":"you are not the owner of this playlist"})
                }catch(e){res.status(400).json({"reason":e})}
                //aggiungo una canzone con tutti i dettagli alla playlist
                pwmClient.close()
            }
        })
    }
}
async function transferPlaylistOwnership(req,res){
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(401).json({"reason": `Invalid login`})
    else{
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(401).json(err)
                pwmClient.close()
            }
            else{
                try{
                    let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                    let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": validator.escape(req.body.name)})
                    let new_owner = await pwmClient.db("pwm_project").collection('users').findOne({"userName": validator.escape(req.body.new_owner)})
                    if(isOwner(playlist,user.userName) && new_owner!=null && new_owner!=undefined){
                        changeOwner(playlist,new_owner.userName)
                        await pwmClient.db('pwm_project').collection('playlists').updateOne({"name":playlist.name},{$set:{"owner":playlist.owner}})
                        new_owner.playlistsOwned.push(playlist.name)
                        new_owner.playlistsFollowed.push(playlist.name)
                        user.playlistsOwned.splice(user.playlistsOwned.indexOf(element => element == playlist.name),1)
                        user.playlistsFollowed.splice(user.playlistsOwned.indexOf(element => element == playlist.name),1)
                        await pwmClient.db('pwm_project').collection('users').updateOne({"userName":validator.escape(req.body.new_owner)},{$set:{"playlistsOwned":new_owner.playlistsOwned,"playlistsFollowed":new_owner.playlistsFollowed}})
                        await pwmClient.db('pwm_project').collection('users').updateOne({"email":decoded.email},{$set:{"playlistsOwned":user.playlistsOwned,"playlistsFollowed":user.playlistsFollowed}})
                        res.status(200).json({"reason":"ok"})
                    }
                    else res.status(400).json({"reason":"you do not own this playlist, or some other data you inserted is not valid. Stop trying to hack me, please"})
                }catch(e){res.status(400).json({reason:`Generic error: ${e.toString()}`})}
                //trasferisco la proprietà della playlist a un altro user
                pwmClient.close()
            }
        })
    }
}
async function changePlaylistDescription(req,res){
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(401).json({"reason": `Invalid login`})
    else{
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(401).json(err)
                pwmClient.close()
            }
            else{
                try{
                    let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                    let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": validator.escape(req.body.name)})
                    if(isOwner(playlist,user.userName)){
                        playlist.description=validator.escape(req.body.new_description)
                        await pwmClient.db('pwm_project').collection('playlists').updateOne({"name":playlist.name},{$set:{"description":playlist.description}})
                        res.status(200).json({"reason":"ok"})
                    }
                    else res.status(400).json({"reason":"you do not own this playlist, or some other data you inserted is not valid. Stop trying to hack me, please"})
                }catch(e){res.status(400).json({reason:`Generic error: ${e.toString()}`})}
                pwmClient.close()
            }
        })
    }
}
async function createPlaylist(req,res){
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(401).json({"reason": `Invalid login`})
    else{
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(401).json(err)
                pwmClient.close()
            }
            else{
                let userToUpdate = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                try{
                    if(newPlaylist(req,userToUpdate.userName)!=null){
                        let playlistToAdd = newPlaylist(req,userToUpdate.userName)
                        await pwmClient.db("pwm_project").collection('playlists').insertOne(playlistToAdd)
                        userToUpdate.playlistsOwned.push(playlistToAdd.name)
                        userToUpdate.playlistsFollowed.push(playlistToAdd.name)
                        await pwmClient.db("pwm_project").collection("users").updateOne({"email":decoded.email},{$set:{"playlistsOwned":userToUpdate.playlistsOwned,"playlistsFollowed":userToUpdate.playlistsFollowed}})
                        res.status(200).json({"reason":"inserted correctly"})
                    }
                    else res.status(400).json({"reason":"Probably you haven't specified the right params"})
                }
                catch(e){
                    //insermento non andato a buon fine?
                    if (e.code == 11000) {
                        res.status(400).json({"reason":"Already present playlist: please choose a different name"})
                        return
                    }
                    res.status(500).json({"reason":`Generic error: ${e.toString()}`})
                }
                pwmClient.close()
            }
        })
    }
}
async function deletePlaylist(req,res){
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(401).json({"reason": `Invalid login`})
    else{
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(401).json(err)
                pwmClient.close()
            }
            else{
                //elimino una playlist
                try{
                    let a = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": validator.escape(req.params.name)})
                    let userToUpdate = await pwmClient.db("pwm_project").collection('users').findOne({"email":decoded.email});
                    if(a != null && a != undefined && isOwner(a,userToUpdate.userName)){
                        //-3. per ogni utente, diverso dall'owner, elimino la playlist da quelle seguite, laddove presente.
                        let allUsers = pwmClient.db("pwm_project").collection("users").find({"email":{$ne: decoded.email}}).toArray()
                        try{
                            for(let index in allUsers){
                                let user = allUsers[index]
                                if(user.playlistsFollowed.some(element => element == a.name)){
                                    user.playlistsFollowed.splice(user.playlistsFollowed.indexOf(a.name),1)
                                    await pwmClient.db("pwm_project").collection('users').updateOne({"email":user.email},{$set:{"playlistsFollowed":user.playlistsFollowed}})
                                }
                            }
                        }catch(e){}
                        //-2.5. per ogni gruppo elimino la playlist da quelle seguite, laddove presente
                        let allGroups = await pwmClient.db("pwm_project").collection("groups").find({}).toArray()
                        try{
                            for(let index in allGroups){
                                let group = allGroups[index]
                                if(group.playlistsShared.some(element => element == a.name)){
                                    group.playlistsShared.splice(group.playlistsShared.indexOf(a.name),1)
                                    await pwmClient.db("pwm_project").collection('groups').updateOne({"name":group.name},{$set:{"playlistsShared":group.playlistsShared}})
                                }
                            }
                        }catch(e){}
                        //-2. elimino, dall'utente che la possedeva, la playlist, sia da quelle seguite che da quelle totali (aka assicuro integrità referenziale)
                        userToUpdate.playlistsOwned.splice(await userToUpdate.playlistsOwned.indexOf(a.name),1)
                        userToUpdate.playlistsFollowed.splice(await userToUpdate.playlistsFollowed.indexOf(a.name),1)
                        await pwmClient.db("pwm_project").collection('users').updateOne({"email":decoded.email},{$set:{"playlistsFollowed":userToUpdate.playlistsFollowed,"playlistsOwned":userToUpdate.playlistsOwned}});
                        //-1. elimino la playlist
                        await pwmClient.db("pwm_project").collection('playlists').deleteOne(a)
                        //se non è esploso niente allora è tutto okay, spero
                        res.status(200).json({"reason":"done correctly"})
                    }
                    else res.status(400).json({"reason":"Probably you haven't specified the right params"})
                }
                catch(e){
                    //l'inserimento non è andato a buon fine?
                    res.status(400).json({reason:`Generic error: ${e.toString()}`})
                }
                pwmClient.close()
            }
        })
    }
}
async function getPlaylistInfos(req,res){
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(401).json({"reason": `Invalid login`})
    else{
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(401).json(err)
                pwmClient.close()
            }
            else{
                try{
                    let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                    let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": validator.escape(req.params.name)})
                    let allGroups = await pwmClient.db("pwm_project").collection('groups').find({}).toArray()
                    if(canSee(playlist,allGroups,user)){
                        delete playlist._id
                        playlist.doIOwnIt = (playlist.owner==user.userName)
                        playlist.following=user.playlistsFollowed.some(element => element == playlist.name)
                        res.status(200).json(playlist)
                    }
                    else{
                        res.status(401).json({"reason":"you cannot access this"})
                    }
                }catch(e){res.status(400).json({reason:`Generic error: ${e.toString()}`})}
                //ottengo le informazioni sulla playlist
                pwmClient.close()
            }
        })
    }
}

/*
    FUNZIONI ASSORTITE per lavorare con i gruppi
*/
function newGroup(req,userName){
    var a = {
        "name":validator.escape(req.body.nome),
        "description":validator.escape(req.body.descrizione),
        "playlistsShared":[],
        "owner":userName,
        "users":[userName]
    }
    if (
        validator.escape(req.body.nome)!=undefined&&validator.escape(req.body.nome)!=null&&
        validator.escape(req.body.descrizione)!=undefined&&validator.escape(req.body.descrizione)!=null
        )
        return a
    return null;
}
function isGroupOwner(group, username){
    return group.owner==username
}
function canRemove(group, playlist, userName){
    return playlist.owner==userName && group.members.some(element => element == userName) && group.playlistsShared.some(element => element == playlist.name)
}
function canAdd(group, playlist, userName){
    return playlist.owner==userName && group.members.some(element => element == userName) && !group.playlistsShared.some(element => element == playlist.name)
}
function removePlaylist(group, playlist){
    group.playlistsShared.splice(indexOf(playlist.name),1)
    return group
}
function addPlaylist(group,playlist){
    group.playlistsShared.push(playlist.name)
    return group
}
function changeGroupOwner(group,new_owner){
    group.owner = new_owner.userName
    return group
}

/*
    FINE FUNZIONI ASSORTITE per lavorare con i gruppi
*/
/*
    1. Oni utente può condividere playlist con un gruppo, a patto che le possegga
    2. Un utente che ha condiviso una playlist può rimuoverla da quel gruppo. L'utente deve possedere quella playlist.
    3. Un utente amministratore (owner) può aggiungere o togliere dal gruppo qualsiasi playlist pubblica o che sia in grado di vedere.
*/
async function createGroup(req,res){
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(401).json({"reason": `Invalid login`})
    else{
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(401).json(err)
                pwmClient.close()
            }
            else{
                //creo un gruppo
                try{
                    let userToUpdate = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                    if(newGroup(req,userToUpdate.userName)!=null){
                        let groupToAdd = newGroup(req,userToUpdate.userName)
                        await pwmClient.db("pwm_project").collection('groups').insertOne(groupToAdd)
                        userToUpdate.groupsOwned.push(groupToAdd.name)
                        userToUpdate.groupsFollowed.push(groupToAdd.name)
                        await pwmClient.db("pwm_project").collection("users").updateOne({"email":decoded.email},{$set:{"groupsOwned":userToUpdate.groupsOwned,"groupsFollowed":userToUpdate.groupsFollowed}})
                        res.status(200).json({"reason":"inserted correctly"})
                    }
                    else res.status(400).json({"reason":"Probably you haven't specified the right params"})
                }catch(e){res.status(400).json({reason:`Generic error: ${e.toString()}`})}
                pwmClient.close()
            }
        })
    }
}
async function deleteGroup(req,res){
    
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(401).json({"reason": `Invalid login`})
    else{
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(401).json(err)
                pwmClient.close()
            }
            else{
                //elimino un gruppo
                try{
                    let a = await pwmClient.db("pwm_project").collection('groups').findOne({"name": validator.escape(req.params.name)})
                    //-3. elimino dagli utenti non owner ogni riferimento a quel gruppo
                    let allUsers = await pwmClient.db("pwm_project").collection("users").find({"email":{$ne: decoded.email}}).toArray()
                    for(let index in allUsers){
                        let user = allUsers[index]
                        if(user.groupsFollowed.some(element => element == a.name)){
                            user.groupsFollowed.splice(user.groupsFollowed.indexOf(a.name),1)
                            await pwmClient.db("pwm_project").collection('users').updateOne({"email":user.email},{$set:{"groupsFollowed":user.groupsFollowed}})
                        }
                    }
                    //-2. elimino dall'owner il gruppo, sia owned che followed
                    let userToUpdate = await pwmClient.db("pwm_project").collection("users").findOne({"email":decoded.email})
                    userToUpdate.groupsFollowed.splice(await userToUpdate.groupsFollowed.indexOf(a.name),1)
                    userToUpdate.groupsOwned.splice(await userToUpdate.groupsOwned.indexOf(a.name),1)
                    await pwmClient.db("pwm_project").collection('users').updateOne({"email":decoded.email},{$set:{"groupsFollowed":userToUpdate.groupsFollowed,"groupsOwned":userToUpdate.groupsOwned}});
                    //-1 elimino il gruppo
                    await pwmClient.db("pwm_project").collection('groups').deleteOne(a)
                    //0. forse è andato tutto liscio
                    res.status(200).json({"reason":"ok"})
                }catch(e){res.status(400).json({reason:`Generic error: ${e.toString()}`})}
                pwmClient.close()
            }
        })
    }
}
async function transferGroupOwnership(req,res){
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(401).json({"reason": `Invalid login`})
    else{
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(401).json(err)
                pwmClient.close()
            }
            else{
                //trasferisco la proprietà del gruppo
                try{
                    let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                    let group = await pwmClient.db("pwm_project").collection('groups').findOne({"name": validator.escape(req.body.name)})
                    let new_owner = await pwmClient.db("pwm_project").collection('users').findOne({"userName": validator.escape(req.body.new_owner)})
                    if(isGroupOwner(group,user.userName) && new_owner!=null && new_owner!=undefined){
                        changeGroupOwner(group,new_owner)
                        //aggiorno il gruppo
                        await pwmClient.db("pwm_project").collection("groups").updateOne({"name":group.name},{$set:{"owner":group.owner}})
                        //aggiorno il nuovo utente aggiungendolo negli owned
                        new_owner.groupsOwned.push(group.name)
                        if(!new_owner.groupsFollowed.some(element => element == group.name)) new_owner.groupsFollowed.push(group.name)
                        await pwmClient.db("pwm_project").collection("users").updateOne({"userName":new_owner.userName},{$set:{"groupsOwned":new_owner.groupsOwned,"groupsFollowed":new_owner.groupsFollowed}})
                        //aggiorno il vecchio utente togliendolo dagli owned
                        user.groupsOwned.splice(user.groupsOwned.indexOf(group.name),1)
                        await pwmClient.db("pwm_project").collection("users").updateOne({"userName":user.userName},{$set:{"groupsOwned":user.groupsOwned}})
                        res.status(200).json({"reason":"ok"})
                    }
                    else res.status(400).json({"reason":"you do not own this group, or some other data you inserted is not valid. Stop trying to hack me, please"})
                }catch(e){res.status(400).json({reason:`Generic error: ${e.toString()}`})}
                pwmClient.close()
            }
        })
    }
}
async function addPlaylistToGroup(req,res){
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(401).json({"reason": `Invalid login`})
    else{
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(401).json(err)
                pwmClient.close()
            }
            else{
                //aggiungo una playlist
                try{
                    let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                    let group = await pwmClient.db("pwm_project").collection('groups').findOne({"name": validator.escape(req.body.group_name)})
                    let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name":validator.escape(req.body.playlist_name)})
                    if(canAdd(group,playlist,user.userName)){
                        addPlaylist(group,playlist)
                    }
                    else res.status(400).json({"reason":"invalid data or wrong permissions"})
                }catch(e){res.status(400).json({reason:`Generic error: ${e.toString()}`})}
                pwmClient.close()
            }
        })
    }
}
async function removePlaylistFromGroup(req,res){
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(401).json({"reason": `Invalid login`})
    else{
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(401).json(err)
                pwmClient.close()
            }
            else{
                //rimuovo una playlist
                try{
                    let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                    let group = await pwmClient.db("pwm_project").collection('groups').findOne({"name": validator.escape(req.body.group_name)})
                    let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name":validator.escape(req.body.playlist_name)})
                    if(canRemove(group,playlist,user.userName)){
                        removePlaylist(group,playlist)
                    }
                    else res.status(400).json({"reason":"invalid data or wrong permissions"})
                }catch(e){res.status(400).json({reason:`Generic error: ${e.toString()}`})}
                pwmClient.close()
            }
        })
    }
}
async function joinGroup(req,res){
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(401).json({"reason": `Invalid login`})
    else{
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(401).json(err)
                pwmClient.close()
            }
            else{
                //mi unisco a un gruppo
                try{
                    let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                    let group = await pwmClient.db("pwm_project").collection('groups').findOne({"name": validator.escape(req.params.name)})
                    if(user!=null && group!=null && ! group.users.some(element => element == user.userName)){
                        // devo modificare lo user in modo che contenga il nome del gruppo
                        user.groupsFollowed.push(group.name)
                        await pwmClient.db("pwm_project").collection("users").updateOne({"email":decoded.email},{$set:{"groupsFollowed":user.groupsFollowed}})
                        // devo modificare il gruppo in modo che contenga lo username
                        group.users.push(user.userName)
                        await pwmClient.db("pwm_project").collection("groups").updateOne({"name":group.name},{$set:{"users":group.users}})
                        res.status(200).json({"reason":"ok"})
                    }
                    else res.status(400).json({"reason":"bad data or already in this group"})
                }catch(e){res.status(400).json({reason:`Generic error: ${e.toString()}`})}
                pwmClient.close()
            }
        })
    }
}
async function leaveGroup(req,res){
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(401).json({"reason": `Invalid login`})
    else{
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(401).json(err)
                pwmClient.close()
            }
            else{
                //Esco da un gruppo
                try{
                    let user = await pwmClient.db("pwm_project").collection('users').findOne({"email":decoded.email})
                    let group = await pwmClient.db("pwm_project").collection('groups').findOne({"name": validator.escape(req.params.name)})
                    if(user!=null && group!=null && group.users.some(element => element == user.userName)){
                        // devo modificare lo user in modo che non contenga il nome del gruppo
                        let userToUpdate = await pwmClient.db("pwm_project").collection('users').findOne({"email":decoded.email})
                        user.groupsFollowed.splice(user.groupsFollowed.indexOf(group.name),1)
                        await pwmClient.db("pwm_project").collection("users").updateOne({"email":decoded.email},{$set:{"groupsFollowed":userToUpdate.groupsFollowed}})
                        // devo modificare il gruppo in modo che non contenga lo username
                        group.users.splice(group.users.indexOf(user.userName),1)
                        await pwmClient.db("pwm_project").collection("groups").updateOne({"name":group.name},{$set:{"users":group.users}})
                        res.status(200).json({"reason":"ok"})
                    }
                    else res.status(400).json({"reason":"bad data or not in this group"})
                }catch(e){res.status(400).json({reason:`Generic error: ${e.toString()}`})}
                pwmClient.close()
            }
        })
    }
}
async function getGroupInfo(req,res){
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(401).json({"reason": `Invalid login`})
    else{
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(401).json(err)
                pwmClient.close()
            }
            else{
                try{
                    let user = await pwmClient.db("pwm_project").collection('users').findOne({"email":decoded.email})
                    let group = await pwmClient.db("pwm_project").collection('groups').findOne({"name": validator.escape(req.params.name)})
                    if(user!=null && group!=null){
                        group.doIOwnIt = (group.owner==user.userName)
                        group.following = group.users.some(element => element == user.userName)
                        res.status(200).json(group)
                    }
                    else res.status(400).json({"reason":"bad data"})
                }catch(e){res.status(400).json({reason:`Generic error: ${e.toString()}`})}
                pwmClient.close()
            }
        })
    }
}
async function changeGroupDescription(req,res){
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(401).json({"reason": `Invalid login`})
    else{
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(401).json(err)
                pwmClient.close()
            }
            else{
                try{
                    let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                    let group = await pwmClient.db("pwm_project").collection('groups').findOne({"name": validator.escape(req.body.name)})
                    if(isGroupOwner(group,user.userName)){
                        group.description=validator.escape(req.body.new_description)
                        await pwmClient.db('pwm_project').collection('groups').updateOne({"name":group.name},{$set:{"description":group.description}})
                        res.status(200).json({"reason":"ok"})
                    }
                    else res.status(400).json({"reason":"you do not own this group, or some other data you inserted is not valid. Stop trying to hack me, please"})
                }catch(e){res.status(400).json({reason:`Generic error: ${e.toString()}`})}
                pwmClient.close()
            }
        })
    }
}
async function searchPlaylistsByName(req,res){
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(401).json({"reason": `Invalid login`})
    else{
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(401).json(err)
                pwmClient.close()
            }
            else{
                try{
                    let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                    let all = await pwmClient.db("pwm_project").collection("playlists").find({"name": { '$regex' : req.params.name, '$options' : 'i' }}).toArray()
                    let allGroups = await pwmClient.db("pwm_project").collection("groups").find({}).toArray()
                    let saw = []
                    for(let a in all) if(canSee(all[a],allGroups,user)) saw.push(all[a])
                    res.status(200).json(saw)
                }catch(e){res.status(400).json({reason:`Generic error: ${e.toString()}`})}
                pwmClient.close()
            }
        })
    }
}
async function searchPlaylistsByTag(req,res){
    var pwmClient = await new mongoClient(mongoUrl).connect()
    const token = req.cookies.token
    if(token == undefined) res.status(401).json({"reason": `Invalid login`})
    else{
        jwt.verify(token,process.env.SECRET, async (err,decoded) =>{
            if(err){
                res.status(401).json(err)
                pwmClient.close()
            }
            else{
                try{
                    let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                    let all = await pwmClient.db("pwm_project").collection("playlists").find({}).toArray()
                    let allGroups = await pwmClient.db("pwm_project").collection("groups").find({}).toArray()
                    let saw = []
                    for(let a in all) if(all[a].tags.some(element => element == req.params.tag.toLowerCase()) && canSee(all[a],allGroups,user)) saw.push(all[a])
                    res.status(200).json(saw)
                }catch(e){res.status(400).json({reason:`Generic error: ${e.toString()}`})}
                pwmClient.close()
            }
        })
    }
}

app.use('/',express.static(__dirname + '/static'))
app.use('/images',express.static(__dirname+'/static/resources/imgs'))
app.use('/scripts',express.static(__dirname+'/static/resources/srcs'))
app.use('/styles',express.static(__dirname+'/static/resources/css'))

app.get('/coffee', (req, res) => {//ne ho bisogno per verificare se il server è up o down quando tutto il resto non va
    // #swagger.tags = ['Test']
    res.status(418).json({"answer":"I'm not a teapot, but I cannot brew coffee..."})
})

app.get('/genres',(req,res)=>{
    // #swagger.tags = ['General','GET']
    // #swagger.summary = 'Gets a list of genres'
    perform(getGenres,req,res);
})
app.get('/types',(req,res)=>{
    // #swagger.tags = ['General','GET']
    // #swagger.summary = 'Gets a list of types'
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

app.post("/search",(req,res)=>{
    // #swagger.tags = ['Data','POST']
    // #swagger.summary = 'Performs a search on Spotify'
    /* #swagger.parameters['obj'] = { 
         in: 'body', 
         description: 'User data.', 
         schema: { 
             $string: 'the string to search for', 
             $type: ['album','track'], 
             $limit: 0, 
             $offset: 18,
         } 
     }*/
    perform(askSpotify,res,req.body);
})

app.get('/requireInfo/:kind/:id',(req,res)=>{
    // #swagger.tags = ['Data','GET']
    // #swagger.summary = 'Gets infos about a specific item'
    const details = {
        kind: req.params.kind,
        id : req.params.id
    }
    perform(getInfo,details,res)
})

app.post('/addOrRemoveFavorite',mongoSanitize,(req,res)=>{
    // #swagger.tags = ['Favorites','POST']
    // #swagger.summary = 'Adds or removes favorites'
    /* #swagger.parameters['obj'] = { 
         in: 'body', 
         description: 'User data.', 
         schema: { 
             $category: 'album', 
             $id: '1kCHru7uhxBUdzkm4gzRQc', 
             $name: 'Hamilton (Original Broadway Cast Recording)',
         } 
     }*/
    perform(addOrRemoveFavorite,req,res)
})

app.post('/isStarred',mongoSanitize,(req,res) =>{
    // #swagger.tags = ['Favorites','POST']
    // #swagger.summary = 'Checks if something is in the favorites'
    /* #swagger.parameters['obj'] = { 
         in: 'body', 
         description: 'User data.', 
         schema: { 
             $category: 'album', 
             $id: '1kCHru7uhxBUdzkm4gzRQc',
         } 
     }*/
    perform(isStarred,req,res)
})

///////////////////////////////////////////////////////////////////////////////////////////////////////////

app.post('/register',mongoSanitize,(req,res)=>{
    // #swagger.tags = ['User','POST'] 
     // #swagger.summary = 'Creates a new user'
    /* #swagger.parameters['obj'] = { 
         in: 'body', 
         description: 'User data.', 
         schema: { 
             $email: 'The@new.email', 
             $name: 'Mario', 
             $surname: 'Rossi', 
             $userName: 'rossimario42',
             $birthDate: '01-01-2000',
             $favoriteGenres: ['classical','broadway'],
             $password: 'Asup3rs3cur3P4ssw0rd!!!',
         } 
     }*/
     perform(register,res,req.body)
})

app.post("/login",mongoSanitize, (req, res)=>{
    // #swagger.tags = ['User','POST']
    // #swagger.summary = 'Logs in'
    /* #swagger.parameters['obj'] = { 
         in: 'body', 
         description: 'User data.', 
         schema: { 
             $email: 'my@email.com', 
             $password: 'Asup3rs3cur3P4ssw0rd!!!',
         } 
     }*/

    
    /*
        Format of user
        user = {
            email: email,
            password: password,
        }
    */
    perform(login,res,req.body)
})

app.get(`/logout`,mongoSanitize,(req,res)=>{
    // #swagger.tags = ['User','GET']
    // #swagger.summary = 'Performs logout'
    try{res.status(200).clearCookie(`token`).json({success:true})}
    catch(e){res.status(400).json({success:false})}
})

app.get(`/checkLogin`,mongoSanitize,(req,res)=>{
    // #swagger.tags = ['User','GET']
    // #swagger.summary = 'Checks if the user is logged in'
    perform(checkLogin,req,res)
})

app.put('/user',mongoSanitize,(req,res)=>{
    // #swagger.tags = ['User','PUT'] 
     // #swagger.summary = 'Updates a user's data'
    /* #swagger.parameters['obj'] = { 
         in: 'body', 
         description: 'User data.', 
         schema: { 
             $email: 'The@new.email', 
             $name: 'Mario', 
             $surname: 'Rossi', 
             $birthDate: '01-01-2000',
             $favoriteGenres: ['classical','broadway'],
             $password: 'Asup3rs3cur3P4ssw0rd!!!',
         } 
     }*/
     perform(updateUser,req,res)
})

app.delete('/user', mongoSanitize,(req,res)=>{
    // #swagger.tags = ['User','DELETE'] 
    // #swagger.summary = 'Deletes an user'
    perform(deleteUser,req,res)
})

///////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get('/group/:name',mongoSanitize,(req,res)=>{
    // #swagger.tags = ['Groups','GET']
    // #swagger.summary = 'Gets infos about a group'
    perform(getGroupInfo,req,res)
})

app.post('/group',mongoSanitize,(req,res)=>{
    // #swagger.tags = ['Groups','POST']
    // #swagger.summary = 'Creates a group'
    /* #swagger.parameters['obj'] = {
        in: 'body',
        description: 'Group data.',
        schema: {
            $nome: 'The name of your new group',
            $descrizione: 'The description of your new group',
        }
    }*/
    perform(createGroup,req,res)
})

app.put('/group/owner',mongoSanitize,(req,res)=>{
    // #swagger.tags = ['Groups','PUT']
    // #swagger.summary = 'Updates a group status: changes the owner'
    /* #swagger.parameters['obj'] = {
        in: 'body',
        description: 'Group data.',
        schema: {
            $name: 'The name of the group',
            $new_owner: 'The username of the new owner',
        }
    }*/
    perform(transferGroupOwnership,req,res)
})

app.put('/group/description',mongoSanitize,(req,res)=>{
    // #swagger.tags = ['Groups','PUT']
    // #swagger.summary = 'Updates a group status: changes the description'
    /* #swagger.parameters['obj'] = {
        in: 'body',
        description: 'Group data.',
        schema: {
            $name: 'The name of the group',
            $new_description: 'The new description',
        }
    }*/
    perform(changeGroupDescription,req,res)
})

app.put('/group/playlists/add',mongoSanitize,(req,res)=>{
    // #swagger.tags = ['Groups','PUT']
    // #swagger.summary = 'Updates a group status: adds a playlist'
    /* #swagger.parameters['obj'] = {
        in: 'body',
        description: 'Group data.',
        schema: {
            $group_name: 'The name of the group',
            $playlist_name: 'The name of the playlist to add',
        }
    }*/
    perform(addPlaylistToGroup,req,res)
})

app.put('/group/playlists/remove',mongoSanitize,(req,res)=>{
    // #swagger.tags = ['Groups','PUT']
    // #swagger.summary = 'Updates a group status: removes a playlist'
    /* #swagger.parameters['obj'] = {
        in: 'body',
        description: 'Group data.',
        schema: {
            $group_name: 'The name of the group',
            $playlist_name: 'The name of the playlist to remove',
        }
    }*/
    perform(removePlaylistFromGroup,req,res)
})

app.put('/group/join/:name',mongoSanitize,(req,res)=>{
    // #swagger.tags = ['Groups','PUT']
    // #swagger.summary = 'Updates a group status: joins a group'
    perform(joinGroup,req,res)
})

app.put('/group/leave/:name',mongoSanitize,(req,res)=>{
    // #swagger.tags = ['Groups','PUT']
    // #swagger.summary = 'Updates a group status: leaves a group'
    perform(leaveGroup,req,res)
})

app.delete('/group/:name',mongoSanitize,(req,res)=>{
    // #swagger.tags = ['Groups','DELETE']
    // #swagger.summary = 'Delete a group'
    perform(deleteGroup,req,res)
})

///////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get('/playlist/info/:name',mongoSanitize,(req,res)=>{
    // #swagger.tags = ['Playlists','GET']
    // #swagger.summary = 'Gets infos about a playlist'
    perform(getPlaylistInfos,req,res)
})

app.get('/playlist/search/name/:name',mongoSanitize,(req,res)=>{
    // #swagger.tags = ['Playlists','GET']
    // #swagger.summary = 'Gets playlist with that name as a substring of theirs'
    perform(searchPlaylistsByName,req,res)
})

app.get('/playlist/search/tag/:tag',mongoSanitize,(req,res)=>{
    // #swagger.tags = ['Playlists','GET']
    // #swagger.summary = 'Gets playlist with that tag in their tags'
    perform(searchPlaylistsByTag,req,res)

})

app.post('/playlist',mongoSanitize,(req,res)=>{
    // #swagger.tags = ['Playlists','POST']
    // #swagger.summary = 'Creates a group'
    /* #swagger.parameters['obj'] = {
        in: 'body',
        description: 'Playlist data.',
        schema: {
            $nome: 'The name of your new playlist',
            $descrizione: 'The description of your new playlist',
        }
    }*/
    perform(createPlaylist,req,res)
})

app.put('/playlist/songs/add',mongoSanitize,(req,res)=>{
    // #swagger.tags = ['Playlists','PUT']
    // #swagger.summary = 'Updates a playlist status: adds a song'
    /* #swagger.parameters['obj'] = {
        in: 'body',
        description: 'Playlist data.',
        schema: {
            $name: 'The name of the playlist',
            $song_id: 'The id of the song to add',
        }
    }*/
    perform(addSongToPlaylist,req,res)
})

app.put('/playlist/songs/remove',mongoSanitize,(req,res)=>{
    // #swagger.tags = ['Playlists','PUT']
    // #swagger.summary = 'Updates a playlist status: removes a song'
    /* #swagger.parameters['obj'] = {
        in: 'body',
        description: 'Playlist data.',
        schema: {
            $name: 'The name of the playlist',
            $song_id: 'The id of the song to add',
        }
    }*/
    perform(removeSongFromPlaylist,req,res)
})

app.put('/playlist/owner',mongoSanitize,(req,res)=>{
    // #swagger.tags = ['Playlists','PUT']
    // #swagger.summary = 'Updates a playlist status: changes the owner'
    /* #swagger.parameters['obj'] = {
        in: 'body',
        description: 'Playlist data.',
        schema: {
            $name: 'The name of the playlist',
            $new_owner: 'The username of the new owner',
        }
    }*/
    perform(transferPlaylistOwnership,req,res)
})

app.put('/playlist/description',mongoSanitize,(req,res)=>{
    // #swagger.tags = ['Playlists','PUT']
    // #swagger.summary = 'Updates a playlist status: changes the description'
    /* #swagger.parameters['obj'] = {
        in: 'body',
        description: 'Playlist data.',
        schema: {
            $name: 'The name of the playlist',
            $new_description: 'The new description',
        }
    }*/
    perform(changePlaylistDescription,req,res)
})

app.put('/playlist/follow/:name',mongoSanitize,(req,res)=>{
    // #swagger.tags = ['Playlists','PUT']
    // #swagger.summary = 'Updates a playlist status: start following'
    perform(followPlaylist,req,res)
})

app.put('/playlist/unfollow/:name',mongoSanitize,(req,res)=>{
    // #swagger.tags = ['Playlists','PUT']
    // #swagger.summary = 'Updates a playlist status: stop following'
    perform(unfollowPlaylist,req,res)
})

app.put('/playlist/tags/add',mongoSanitize,(req,res)=>{
    // #swagger.tags = ['Playlists','PUT']
    // #swagger.summary = 'Updates a playlist status: adds a tag'
    /* #swagger.parameters['obj'] = {
        in: 'body',
        description: 'Playlist data.',
        schema: {
            $name: 'The name of the playlist',
            $tag: 'The new tag',
        }
    }*/
    perform(addTagToPlaylist,req,res)
})

app.put('/playlist/tags/remove',mongoSanitize,(req,res)=>{
    // #swagger.tags = ['Playlists','PUT']
    // #swagger.summary = 'Updates a playlist status: removes a tag'
    /* #swagger.parameters['obj'] = {
        in: 'body',
        description: 'Playlist data.',
        schema: {
            $name: 'The name of the playlist',
            $tag: 'The old tag',
        }
    }*/
    perform(removeTagFromPlaylist,req,res)
})

app.put('/playlist/publish/:name',mongoSanitize,(req,res)=>{
    // #swagger.tags = ['Playlists','PUT']
    // #swagger.summary = 'Updates a playlist status: publishes it'
    perform(publishPlaylist,req,res)
})

app.put('/playlist/private/:name',mongoSanitize,(req,res)=>{
    // #swagger.tags = ['Playlists','PUT']
    // #swagger.summary = 'Updates a playlist status: makes it private'
    perform(makePlaylistPrivate,req,res)
})

app.delete('/playlist/:name',mongoSanitize,(req,res)=>{
    // #swagger.tags = ['Playlists','DELETE']
    // #swagger.summary = 'Delete a playlist'
    perform(deletePlaylist,req,res)
})

///////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("*", (req, res) => {
    // #swagger.tags = ['Everything else','GET']
    res.status(404).sendFile(path.join(__dirname, '/static/not_found.html'));
})

///////////////////////////////////////////////////////////////////////////////////////////////////////////
function datetime(){
    var currentdate = new Date();
    var datetime =    currentdate.getDate() + "-"
    + (currentdate.getMonth()+1)  + "-" 
                    + currentdate.getFullYear() + " @ "  
                    + currentdate.getHours() + ":"  
                    + currentdate.getMinutes() + ":" 
                    + currentdate.getSeconds();
    return datetime
}
function log(message){console.log(`${datetime()}. ${message}`)}

app.listen(process.env.PORT, "0.0.0.0", () => {
    log(`Server started. Port ${process.env.PORT}. http://localhost:${process.env.PORT}/index.html`)
})