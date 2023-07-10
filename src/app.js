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
    question.string = validator.escape(validator.trim(question.string)) //just to improve security
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
    if((typeof user.userName !== 'string' &&!( user.userName instanceof String)) || (typeof user.email !== 'string' &&!( user.email instanceof String)) || (typeof user.password !== 'string' &&!( user.password instanceof String))) res.status(400).json({code:1,reason: `Don't try to mess with me...`})
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
    if((typeof user.userName !== 'string' &&!( user.userName instanceof String)) || (typeof user.email !== 'string' &&!( user.email instanceof String)) || (typeof user.password !== 'string' &&!( user.password instanceof String))) res.status(400).json({code:1,reason: `Don't try to mess with me...`})
    else if(user.name==undefined || user.password==undefined || user.surname == undefined || user.userName == undefined || user.birthDate == undefined || user.favoriteGenres == undefined || user.email == undefined) res.status(400).json({code:-1,reason: `You are missing some fields...`})
    else{
        [`name`,`surname`,`userName`,`birthDate`,`password`,`email`].forEach(key => {
            
            user[key] = validator.escape(validator.trim(user[key]))
        })
        for (let i = 0; i < user.favoriteGenres.length; i++){
            user.favoriteGenres[i] = validator.escape(validator.trim(user.favoriteGenres[i]))
        }
        if(!validator.isEmail(user.email)) res.status(400).json({code:1,reason:`Are you sure ${user.email} is an email?`})
        else if(!validator.isStrongPassword(user.password)) res.status(400).json({code:2,reason:`The password you inserted is not strong enough as a password. It MUST contain at least 8 characters, a Capital letter, a lowercase letter, a number and a special character`})
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
    if(token == undefined) res.status(401).json({"reason":"Invalid login"}) 
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
                        try {
                            await pwmClient.db("pwm_project").collection('users').updateOne({"userName":utente.userName},
                                {$set:{
                                    "email":user.email.toLowerCase(),
                                    "password":hash(user.password),
                                    "name":user.name,
                                    "surname":user.surname,
                                    "birthDate":user.birthDate,
                                    "favoriteGenres":user.favoriteGenres}})
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
    if(token == undefined) res.status(401).json({"reason":"Invalid login"}) 
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
                    await pwmClient.db("pwm_project").collection("playlists").deleteMany({"owner":user.userName})
                    //-1 elimino l'account dell'utente
                    await pwmClient.db('pwm_project').collection('users').deleteOne({"email":decoded.email})
                    //0. forse è andato tutto liscio, e spero di non aver lasciato riferimenti pending da qualche parte
                    pwmClient.close()
                    res.status(200).json({"reason":"ok"}) 
                }catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");
                    res.status(400).json({reason:`Generic error: ${e.toString()}`});pwmClient.close()
                }
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
                
                if(loggedUser.favorites[req.body.category].some(element => element.id ==req.body.id)){
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
            a.name=validator.escape(validator.trim(req.body.nome))
            a.description=validator.escape(validator.trim(req.body.descrizione))
            return a
        }
    return null;
}
function isOwner(playlist,userName){
    return playlist.owner==userName
}
function addSong(playlist,song){
    playlist.songs.push(song)
    playlist.totalTime+=song.durata
    return playlist
}
function removeSong(playlist,song){
    var elementToRemove = playlist.songs.find(element => element.id == song.id)
    playlist.songs.splice(playlist.songs.indexOf(elementToRemove),1)
    playlist.totalTime-=song.durata
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
    console.log(playlist,user)
    if(playlist==null) return false
    if(playlist.visibility) return true
    if(user==null) return false
    if(playlist.owner == user.userName) return true
    if(groupList!=null) return playlist.visibility /*La playlist è visibile globalmente*/ || groupList.some(group => {return group.users.includes(user.userName)/*Seguo un gruppo*/ && group.playlistsShared.includes(playlist.name)/*e in quel gruppo c'è la playlist*/}) || playlist.owner == user.userName /*O la possiedo io direttamente*/
    return false
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
                    let a = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": validator.escape(validator.trim(req.params.name))})
                    //-3. per ogni utente, diverso dall'owner, elimino la playlist da quelle seguite, laddove presente.
                    let allUsers = await pwmClient.db("pwm_project").collection("users").find({"email":{$ne: decoded.email}}).toArray()
                    try{for(let index in allUsers){
                        
                        let user=allUsers[index]
                        if(user.playlistsFollowed.some(element => element == a.name)){
                            user.playlistsFollowed.splice(user.playlistsFollowed.indexOf(a.name),1)
                            await pwmClient.db("pwm_project").collection('users').updateOne({"email":user.email},{$set:{"playlistsFollowed":user.playlistsFollowed}})
                        }
                    }}catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");}
                    //-2.5. per ogni gruppo elimino la playlist da quelle seguite, laddove presente
                    let allGroups = await pwmClient.db("pwm_project").collection("groups").find({}).toArray()
                    try{for(let index in allGroups){
                        let group = allGroups[index]
                        if(group.playlistsShared.some(element => element == a.name)){
                            group.playlistsShared.splice(group.playlistsShared.indexOf(a.name),1)
                            await pwmClient.db("pwm_project").collection('groups').updateOne({"name":group.name},{$set:{"playlistsShared":group.playlistsShared}})
                        }
                    }}catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");}
                    //e ora la posso togliere
                    let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                    let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": validator.escape(validator.trim(req.params.name))})
                    if(isOwner(playlist,user.userName)){
                        playlist = makePrivate(playlist)
                        await pwmClient.db("pwm_project").collection('playlists').updateOne({"name": validator.escape(validator.trim(req.params.name))},{$set:{"visibility":playlist.visibility}})
                        res.status(200).json({"reason":"ok"})
                    }
                    else res.status(400).json({"reason":"not owner"})
                }catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");res.status(400).json({reason:`Generic error: ${e.toString()}`})}
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
                    let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": validator.escape(validator.trim(req.params.name))})
                    if(isOwner(playlist,user.userName)){
                        playlist = publish(playlist)
                        await pwmClient.db("pwm_project").collection('playlists').updateOne({"name": validator.escape(validator.trim(req.params.name))},{$set:{"visibility":playlist.visibility}})
                        res.status(200).json({"reason":"ok"})
                    }
                    else res.status(400).json({"reason":"not owner"})
                }catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");res.status(400).json({reason:`Generic error: ${e.toString()}`})}
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
                    let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": validator.escape(validator.trim(req.body.name))})
                    if(isOwner(playlist,user.userName)&&validator.escape(req.body.tag)!=null&&validator.escape(req.body.tag)!=undefined){
                        removeTag(playlist,validator.escape(validator.trim(req.body.tag.toLowerCase())))
                        await pwmClient.db('pwm_project').collection('playlists').updateOne({"name":playlist.name},{$set:{"tags":playlist.tags}})
                        res.status(200).json({"reason":"ok"})
                    }
                    else{
                        res.status(400).json({"reason":"bad data or not owner"})
                    }
                }catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");res.status(400).json({reason:`Generic error: ${e.toString()}`})}
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
                    let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": validator.escape(validator.trim(req.body.name))})
                    if(isOwner(playlist,user.userName)&&validator.escape(req.body.tag)!=null&&validator.escape(req.body.tag)!=undefined){
                        addTag(playlist,validator.escape(validator.trim(req.body.tag.toLowerCase())))
                        await pwmClient.db('pwm_project').collection('playlists').updateOne({"name":playlist.name},{$set:{"tags":playlist.tags}})
                        res.status(200).json({"reason":"ok"})
                    }
                    else{
                        res.status(400).json({"reason":"bad data or not owner"})
                    }
                }catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");res.status(400).json({reason:`Generic error: ${e.toString()}`})}
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
                    let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": validator.escape(validator.trim(req.body.name))})
                    if(isOwner(playlist,user.userName)){
                        let details = await fetch(`http://0.0.0.0:${process.env.PORT}/requireInfo/tracks/${validator.escape(validator.trim(req.body.song_id))}`)
                        details = await details.json()
                        let song = {
                            id : details.id,
                            titolo : details.name,
                            durata : details.duration_ms,
                            cantante: details.artists[0].name,
                            anno_di_pubblicazione: details.album.release_date.split("-")[0],
                            id : validator.escape(validator.trim(req.body.song_id))
                        }
                        if(await playlist.songs.some(element => element.id == song.id)) {
                            playlist = removeSong(playlist,song)
                            await pwmClient.db("pwm_project").collection('playlists').updateOne({"name":playlist.name},{$set:{"songs":playlist.songs,"totalTime":playlist.totalTime}})
                        }
                        res.status(200).json({"reason":"done"})
                    }
                    else res.status(401).json({"reason":"you are not the owner of this playlist"})
                }catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");res.status(400).json({"reason":`Generic error: ${e.toString()}`})}
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
                    let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": validator.escape(validator.trim(req.params.name))})
                    if(await user.playlistsFollowed.some(name => name == playlist.name)){
                        user.playlistsFollowed.splice(user.playlistsFollowed.indexOf(playlist.name),1)
                        await pwmClient.db("pwm_project").collection("users").updateOne({"email":decoded.email},{$set:{"playlistsFollowed":user.playlistsFollowed}})
                        res.status(200).json({"reason":"ok"})
                    }
                }catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");res.status(400).json({"reason":`Generic error: ${e.toString()}`})}
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
                    let a = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": validator.escape(validator.trim(req.params.name))})
                    let user = await pwmClient.db("pwm_project").collection('users').findOne({"email": decoded.email})
                    let allGroups = await pwmClient.db("pwm_project").collection("groups").find({}).toArray()
                    if(canSee(a,allGroups,user)){
                        user.playlistsFollowed.push(a.name)
                        await pwmClient.db("pwm_project").collection("users").updateOne({"email":decoded.email},{$set:{"playlistsFollowed":user.playlistsFollowed}})
                        res.status(200).json({"reason":"ok"})
                    }
                    else res.status(400).json({"reason":"this playlist does not exist or you can't see it"})
                }
                catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");res.status(400).json({reason:`Generic error: ${e.toString()}`})}
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
                    let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": validator.escape(validator.trim(req.body.name))})
                    if(isOwner(playlist,user.userName)){
                        let details = await fetch(`http://0.0.0.0:${process.env.PORT}/requireInfo/tracks/${validator.escape(validator.trim(req.body.song_id))}`)
                        details = await details.json()
                        let song = {
                            id: details.id,
                            titolo : details.name,
                            durata : details.duration_ms,
                            cantante: details.artists[0].name,
                            anno_di_pubblicazione: details.album.release_date.split("-")[0]
                        }
                        if(! await playlist.songs.some(element => element.id == song.id)){
                            playlist = addSong(playlist,song)
                            await pwmClient.db("pwm_project").collection('playlists').updateOne({"name":playlist.name},{$set:{"songs":playlist.songs,"totalTime":playlist.totalTime}})
                        }
                        res.status(200).json({"reason":"done"})
                    }
                    else res.status(401).json({"reason":"you are not the owner of this playlist"})
                }catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");res.status(400).json({"reason":`Generic error: ${e.toString()}`})}
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
                    let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": validator.escape(validator.trim(req.body.name))})
                    let new_owner = await pwmClient.db("pwm_project").collection('users').findOne({"userName": validator.escape(validator.trim(req.body.new_owner))})
                    if(isOwner(playlist,user.userName) && new_owner!=null && new_owner!=undefined){
                        changeOwner(playlist,new_owner.userName)
                        await pwmClient.db('pwm_project').collection('playlists').updateOne({"name":playlist.name},{$set:{"owner":playlist.owner}})
                        new_owner.playlistsOwned.push(playlist.name)
                        new_owner.playlistsFollowed.push(playlist.name)
                        user.playlistsOwned.splice(user.playlistsOwned.indexOf(element => element == playlist.name),1)
                        user.playlistsFollowed.splice(user.playlistsOwned.indexOf(element => element == playlist.name),1)
                        await pwmClient.db('pwm_project').collection('users').updateOne({"userName":validator.escape(validator.trim(req.body.new_owner))},{$set:{"playlistsOwned":new_owner.playlistsOwned,"playlistsFollowed":new_owner.playlistsFollowed}})
                        await pwmClient.db('pwm_project').collection('users').updateOne({"email":decoded.email},{$set:{"playlistsOwned":user.playlistsOwned,"playlistsFollowed":user.playlistsFollowed}})
                        res.status(200).json({"reason":"ok"})
                    }
                    else res.status(400).json({"reason":"you do not own this playlist, or some other data you inserted is not valid. Stop trying to hack me, please"})
                }catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");res.status(400).json({reason:`Generic error: ${e.toString()}`})}
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
                    let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": validator.escape(validator.trim(req.body.name))})
                    if(isOwner(playlist,user.userName)){
                        playlist.description=validator.escape(validator.trim(req.body.new_description))
                        await pwmClient.db('pwm_project').collection('playlists').updateOne({"name":playlist.name},{$set:{"description":playlist.description}})
                        res.status(200).json({"reason":"ok"})
                    }
                    else res.status(400).json({"reason":"you do not own this playlist, or some other data you inserted is not valid. Stop trying to hack me, please"})
                }catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");res.status(400).json({reason:`Generic error: ${e.toString()}`})}
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
                catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");
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
                    let a = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": validator.escape(validator.trim(req.params.name))})
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
                        }catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");}
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
                        }catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");}
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
                catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");
                    //l'inserimento non è andato a buon fine?
                    res.status(400).json({reason:`Generic error: ${e.toString()}`})
                }
                pwmClient.close()
            }
        })
    }
}
async function sortPlaylist(req,res){
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
                    let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": validator.escape(validator.trim(req.params.name))})
                    if(isOwner(playlist,user.userName)){
                        let new_songs = []
                        for(i=1;i<req.body.order.length;i++){
                            req.body.order[i]=validator.escape(validator.trim(req.body.order[i]))
                            for(let j=0;j<playlist.songs.length;j++){
                                if(playlist.songs[j].id==req.body.order[i]){
                                    new_songs.push(playlist.songs[j])
                                    playlist.songs.splice(j,1)
                                    break;
                                }
                            }
                        }
                        await pwmClient.db("pwm_project").collection('playlists').updateOne({"name": validator.escape(validator.trim(req.params.name))},{$set:{"songs":new_songs}})
                        res.status(200).json({"reason":"everything is fine"})
                    }
                    else{
                        res.status(401).json({"reason":"you cannot access this"})
                    }
                }catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");res.status(400).json({reason:`Generic error: ${e.toString()}`})}
                //ottengo le informazioni sulla playlist
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
                    let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name": validator.escape(validator.trim(req.params.name))})
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
                }catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");res.status(400).json({reason:`Generic error: ${e.toString()}`})}
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
        "name":validator.escape(validator.trim(req.body.nome)),
        "description":validator.escape(validator.trim(req.body.descrizione)),
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
    return (playlist.owner==userName && group.users.some(element => element == userName) && group.playlistsShared.some(element => element == playlist.name)) || group.owner==userName
}
function canAdd(group, playlist, userName){
    return playlist.owner==userName && group.users.some(element => element == userName) && !group.playlistsShared.some(element => element == playlist.name)
}
function removePlaylist(group, playlist){
    group.playlistsShared.splice(group.playlistsShared.indexOf(playlist.name),1)
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
                }catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");res.status(400).json({reason:`Generic error: ${e.toString()}`})}
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
                    let a = await pwmClient.db("pwm_project").collection('groups').findOne({"name": validator.escape(validator.trim(req.params.name))})
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
                }catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");res.status(400).json({reason:`Generic error: ${e.toString()}`})}
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
                    let group = await pwmClient.db("pwm_project").collection('groups').findOne({"name": validator.escape(validator.trim(req.body.name))})
                    let new_owner = await pwmClient.db("pwm_project").collection('users').findOne({"userName": validator.escape(validator.trim(req.body.new_owner))})
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
                }catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");res.status(400).json({reason:`Generic error: ${e.toString()}`})}
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
                    let group = await pwmClient.db("pwm_project").collection('groups').findOne({"name": validator.escape(validator.trim(req.body.group_name))})
                    let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name":validator.escape(validator.trim(req.body.playlist_name))})
                    if(canAdd(group,playlist,user.userName)){
                        addPlaylist(group,playlist)
                        await pwmClient.db("pwm_project").collection('groups').updateOne({"name": validator.escape(validator.trim(req.body.group_name))},{$set:{"playlistsShared":group.playlistsShared}})
                        res.status(200).json({"reason":"done successfully"})
                    }
                    else res.status(400).json({"reason":"invalid data or wrong permissions"})
                }catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");res.status(400).json({reason:`Generic error: ${e.toString()}`})}
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
                    let group = await pwmClient.db("pwm_project").collection('groups').findOne({"name":validator.trim( validator.escape(req.body.group_name))})
                    let playlist = await pwmClient.db("pwm_project").collection('playlists').findOne({"name":validator.escape(validator.trim(req.body.playlist_name))})
                    if(canRemove(group,playlist,user.userName)){
                        removePlaylist(group,playlist)
                        await pwmClient.db("pwm_project").collection('groups').updateOne({"name":group.name},{$set:{"playlistsShared":group.playlistsShared}})
                        res.status(200).json({"reason":"done successfully"})
                    }
                    else res.status(400).json({"reason":"invalid data or wrong permissions"})
                }catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");res.status(400).json({reason:`Generic error: ${e.toString()}`})}
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
                    let group = await pwmClient.db("pwm_project").collection('groups').findOne({"name": validator.escape(validator.trim(req.params.name))})
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
                }catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");res.status(400).json({reason:`Generic error: ${e.toString()}`})}
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
                    let group = await pwmClient.db("pwm_project").collection('groups').findOne({"name": validator.escape(validator.trim(req.params.name))})
                    if(user!=null && group!=null && group.users.some(element => element == user.userName)){
                        // devo modificare lo user in modo che non contenga il nome del gruppo
                        user.groupsFollowed.splice(user.groupsFollowed.indexOf(group.name),1)
                        await pwmClient.db("pwm_project").collection("users").updateOne({"email":decoded.email},{$set:{"groupsFollowed":user.groupsFollowed}})
                        // devo modificare il gruppo in modo che non contenga lo username
                        group.users.splice(group.users.indexOf(user.userName),1)
                        // devo eliminare ogni playlist che era presente da quell'user
                        playlists = group.playlistsShared //ottengo la lista di playlist
                        let allUsers = await pwmClient.db("pwm_project").collection('users').find({"email":{$ne:decoded.email}}).toArray()
                        for(let i = 0;i<playlists.length;i++){
                            //per ogni playlist ne recupero l'utente, e se è uguale a quello di user allora devo rimuovere tale playlist dal gruppo
                            let questa = await pwmClient.db("pwm_project").collection("playlists").findOne({"name":playlists[i]})
                            if(questa.owner==user.userName){//la playlist apparteneva davvero a quell'utente che è uscito, ora non può rimanere condivisa con tutti
                                playlists.splice(i,1)
                                //devo eliminare dagli altri user ogni playlist tolta dal gruppo che non fosse pubblica
                                for(let j = 0;j<allUsers.length;j++){
                                    if(allUsers[j].playlistsFollowed.includes(playlists[i])){
                                        allUsers[j].playlistsFollowed.splice(allUsers[j].playlistsFollowed.indexOf(playlists[i]),1)
                                        await pwmClient.db("pwm_project").collection('users').updateOne({"email":allUsers[j].email},{$set:{"playlistsFollowed":playlistsFollowed}})
                                    }
                                }
                            }
                        }
                        await pwmClient.db("pwm_project").collection("groups").updateOne({"name":group.name},{$set:{"users":group.users,"playlistsShared":playlists}})
                        res.status(200).json({"reason":"ok"})
                    }
                    else res.status(400).json({"reason":"bad data or not in this group"})
                }catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");res.status(400).json({reason:`Generic error: ${e.toString()}`})}
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
                    let group = await pwmClient.db("pwm_project").collection('groups').findOne({"name": validator.escape(validator.trim(req.params.name))})
                    if(user!=null && group!=null){
                        group.doIOwnIt = (group.owner==user.userName)
                        group.following = group.users.some(element => element == user.userName)
                        delete group._id
                        res.status(200).json(group)
                    }
                    else res.status(400).json({"reason":"bad data"})
                }catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");res.status(400).json({reason:`Generic error: ${e.toString()}`})}
                pwmClient.close()
            }
        })
    }
}

async function getGroupList(req,res){
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
                    if(await pwmClient.db('pwm_project').collection('users').findOne({"email":decoded.email})==null) throw new Error()
                    let group = await pwmClient.db("pwm_project").collection('groups').find({}).toArray()
                    console.log(group)
                    res.status(200).json(group)
                }catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");res.status(400).json({reason:`Generic error: ${e.toString()}`})}
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
                    let group = await pwmClient.db("pwm_project").collection('groups').findOne({"name": validator.escape(validator.trim(req.body.name))})
                    if(isGroupOwner(group,user.userName)){
                        group.description=validator.escape(validator.trim(req.body.new_description))
                        await pwmClient.db('pwm_project').collection('groups').updateOne({"name":group.name},{$set:{"description":group.description}})
                        res.status(200).json({"reason":"ok"})
                    }
                    else res.status(400).json({"reason":"you do not own this group, or some other data you inserted is not valid. Stop trying to hack me, please"})
                }catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");res.status(400).json({reason:`Generic error: ${e.toString()}`})}
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
                }catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");res.status(400).json({reason:`Generic error: ${e.toString()}`})}
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
                }catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");res.status(400).json({reason:`Generic error: ${e.toString()}`})}
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
    /*
    #swagger.tags = ['Test']
    #swagger.responses[418] = {
        schema : {
            answer:"I'm not a teapot, but I cannot brew coffee..."
        }
    }
    */
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[34mGET\x1b[0m\t/coffee`)
    res.status(418).json({"answer":"I'm not a teapot, but I cannot brew coffee..."})
})

app.get('/genres',(req,res)=>{
    /*
    #swagger.tags = ['General','GET']
    #swagger.summary = 'Gets a list of genres'
    #swagger.responses[200] = {
		description:'The result of the query is sent back',
        schema : {
            "status": 200,
            "results": [
                "acoustic",
                "afrobeat",
                "alt-rock",
                "alternative"
            ]
        }
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[34mGET\x1b[0m\t/genres`)
    perform(getGenres,req,res);
})
app.get('/types',(req,res)=>{
    /*
    #swagger.tags = ['General','GET']
    #swagger.summary = 'Gets a list of types'
    #swagger.responses[200] = {
		description:'The known types are sent back',
        schema : [
            "album",
            "artist",
            "episode",
            "show",
            "track"
        ]
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[34mGET\x1b[0m\t/types`)
    res.status(200).json(
        [
            "album",
            "episode",
            "track",
            "artist",
            "show"
        ]
            .sort())
})

app.post("/search",(req,res)=>{
    /*
    #swagger.tags = ['Data','POST']
    #swagger.summary = 'Performs a search on Spotify'
    #swagger.parameters['obj'] = { 
        in: 'body', 
        		description: 'User data.', 
        schema: { 
            $string: 'the string to search for', 
            $type: ['album','track'], 
            $limit: 18, 
            $offset: 0,
        } 
    }
    #swagger.responses[200] = {
		description:'The result is sent back'
        }
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[32mPOST\x1b[0m\t/search`)
    perform(askSpotify,res,req.body);
})

app.get('/requireInfo/:kind/:id',(req,res)=>{
    /*
    #swagger.tags = ['Data','GET']
    #swagger.summary = 'Gets infos about a specific item'
    #swagger.responses[200] = {
		description:'The result is sent back'
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[34mGET\x1b[0m\t/requireInfo/${req.params.kind}/${req.params.id}`)
    const details = {
        kind: req.params.kind,
        id : req.params.id
    }
    perform(getInfo,details,res)
})

app.post('/addOrRemoveFavorite',mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['Favorites','POST']
    #swagger.summary = 'Adds or removes favorites'
    #swagger.parameters['obj'] = { 
        in: 'body', 
        		description: 'User data.', 
        schema: { 
            $category: 'album', 
            $id: '1kCHru7uhxBUdzkm4gzRQc', 
            $name: 'Hamilton (Original Broadway Cast Recording)',
        } 
    }
    #swagger.responses[200] = {
		description:'The query was executed correctly',
        schema : {"removed":true}
	}
    #swagger.responses[401] = {
		description:'The user was not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[32mPOST\x1b[0m\t/addOrRemoveFavorite`)
    perform(addOrRemoveFavorite,req,res)
})

app.post('/isStarred',mongoSanitize,(req,res) =>{
    /* #swagger.tags = ['Favorites','POST']
    #swagger.summary = 'Checks if something is in the favorites'
    #swagger.parameters['obj'] = { 
        in: 'body', 
        		description: 'User data.', 
        schema: { 
            $category: 'album', 
            $id: '1kCHru7uhxBUdzkm4gzRQc',
        } 
    }
    #swagger.responses[200] = {
		description:'A boolean value is sent back to indicate if the element is starred or not',
        schema: {"favorite":true}
	}
    #swagger.responses[401] = {
		description:'The user was not logged in',
        schema : {"reason": `Invalid login`}
    }
    */
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[32mPOST\x1b[0m\t/isStarred`)
    perform(isStarred,req,res)
})

///////////////////////////////////////////////////////////////////////////////////////////////////////////

app.post('/register',mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['User','POST'] 
    #swagger.summary = 'Creates a new user'
    #swagger.parameters['obj'] = { 
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
    }
    #swagger.responses[200] = {
		description:'The user has been inseted into the database'
	}
    #swagger.responses[400] = {
		description:'The user was already registered, or at least his email or username were, or some other invalid data was inserted',
        schema : {code:-1,reason: `You are missing some fields...`}
	}
    #swagger.responses[500] = {
		description:'The database refused the insertion, more details are provided in the response',
        schema : {code:6,reason:`Generic error: explanation`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[32mPOST\x1b[0m\t/register`)
    perform(register,res,req.body)
})

app.post("/login",mongoSanitize, (req, res)=>{
    /*#swagger.tags = ['User','POST']
    #swagger.summary = 'Logs in'
    #swagger.parameters['obj'] = { 
        in: 'body', 
        		description: 'User data.', 
        schema: { 
            $email: 'my@email.com', 
            $password: 'Asup3rs3cur3P4ssw0rd!!!',
        } 
    }
    #swagger.responses[200] = {
		description:'The user has correctly logged in',
        schema: {code:4,reason:`Logged successfully!`}
	}
    #swagger.responses[400] = {
		description:'The email was not an email',
        schema : {code:2,reason:`This isn't really an email, is it?`}
	}
    #swagger.responses[401] = {
		description:'A user with such credentials does not exist',
        schema: {code:3,reason:`This user does not exist or its password is not the one you inserted.`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[32mPOST\x1b[0m\t/login`)
    perform(login,res,req.body)
})

app.get(`/logout`,mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['User','GET']
    #swagger.summary = 'Performs logout'
    #swagger.responses[200] = {
		description:'The logout was successful',
        schema : {success:true}
	}
    #swagger.responses[400] = {
		description:'The logout failed - probably the user was not logged in',
        schema : {success:false}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[34mGET\x1b[0m\t/logout`)
    try{res.status(200).clearCookie(`token`).json({success:true});}
    catch(e){log(e.name+": "+e.message+"\n\t"+e.stack.split(/\n/)[1]+"\n------------------------------------------------------------------------------------------------");res.status(400).json({success:false})}
})

app.get(`/checkLogin`,mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['User','GET']
    #swagger.summary = 'Checks if the user is logged in'
    #swagger.responses[200] = {
		description:'The user is logged in',
        schema : {
            "name": "Name",
            "surname": "Surname",
            "userName": "User Name",
            "email": "email@email.email",
            "birthDate": "YYYY-MM-DD",
            "favoriteGenres": [],
            "favorites": {
                "album": [],
                "artist": [],
                "audiobook": [],
                "episode": [],
                "show": [],
                "track": []
            },
            "playlistsFollowed": [],
            "playlistsOwned": [],
            "groupsOwned": [
            ],
            "groupsFollowed": [
            ]
        }
	}
    #swagger.responses[401] = {
		description:'The user is not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[34mGET\x1b[0m\t/checkLogin`)
    perform(checkLogin,req,res)
})

app.put('/user',mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['User','PUT'] 
    #swagger.summary = 'Updates a user's data'
    #swagger.parameters['obj'] = { 
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
    }
    #swagger.responses[200] = {
		description:'The user successfully updates his data',
        schema : {code:0,"explanation":`you will now be logged out. Please re-login with your new credentials`}
	}
    #swagger.responses[400] = {
		description:'A user with such an email is already present. The email needs to be unique.',
        schema : {code:5,reason:"Already present user: please choose a different username or email"}
	}
    #swagger.responses[401] = {
		description:'The user is not logged in',
        schema : {"reason": `Invalid login`}
	}
    #swagger.responses[500] = {
		description:'The database refused the operation. More details are available in the response',
        schema : {code:6,reason:`Generic error: Explanation`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[33mPUT\x1b[0m\t/user`)
    perform(updateUser,req,res)
})

app.delete('/user', mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['User','DELETE'] 
    #swagger.summary = 'Deletes an user'
    #swagger.responses[200] = {
		description:'The user was successfully deleted',
        schema : {"reason":"ok"}
	}
    #swagger.responses[400] = {
		description:'There was an error. More details in the response',
        schema : {reason:`Generic error: Explanation`}
	}
    #swagger.responses[401] = {
		description:'The user is not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[35mDELETE\x1b[0m\t/user`)
    perform(deleteUser,req,res)
})

///////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get('/group/:name',mongoSanitize,(req,res)=>{
    /*#swagger.tags = ['Groups','GET']
    #swagger.summary = 'Gets infos about a group'
    #swagger.responses[200] = {
		description:'The response contains the data requested',
        schema : {
            "name":"myGroup",
            "decription":"This is a group for ...",
            "playlistsShared":[
                "classicalMusic",
                "musicaClassica",
            ],
            "owner":"userName",
            "users":[
                "userName",
                "user42",
                "lambda",
                "SophosIoun"
            ],
            "doIOwnIt": false,
            "following": true
        }
	}
    #swagger.responses[400] = {
		description:'Invalid data was providen',
        schema: {"reason":"bad data"}
	}
    #swagger.responses[401] = {
		description:'The user was not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[34mGET\x1b[0m\t/group/${req.params.name}`)
    perform(getGroupInfo,req,res)
})

app.get('/grouplist',mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['Groups','GET']
    #swagger.summary = 'Get a list of all groups'
    #swagger.responses[200] = {
		description:'The response contains the requested data',
        schema : [
            {
                "name":"myGroup",
                "decription":"This is a group for ...",
                "playlistsShared":[
                    "classicalMusic",
                    "musicaClassica",
                ],
                "owner":"userName",
                "users":[
                    "userName",
                    "user42",
                    "lambda",
                    "SophosIoun"
                ]
            },         
        ]
	}
    #swagger.responses[400] = {
		description:'Something failed. Refer to the response for more details',
        schema : {reason:`Generic error: Explanation`}
	}
    #swagger.responses[401] = {
		description:'The user is not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[34mGET\x1b[0m\t/grouplist`)
    perform(getGroupList,req,res)
})

app.post('/group',mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['Groups','POST']
    #swagger.summary = 'Creates a group'
    #swagger.parameters['obj'] = {
        in: 'body',
		description: 'Group data.',
        schema: {
            $nome: 'The name of your new group',
            $descrizione: 'The description of your new group',
        }
    }
    #swagger.responses[200] = {
		description:'A new group was created',
        schema : {"reason":"inserted correctly"}
	}
    #swagger.responses[400] = {
		description:'Something failed. Refer to the response for more details',
        schema : {"reason":"Probably you haven't specified the right params"}
	}
    #swagger.responses[401] = {
		description:'The user is not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[32mPOST\x1b[0m\t/group`)
    perform(createGroup,req,res)
})

app.put('/group/owner',mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['Groups','PUT']
    #swagger.summary = 'Updates a group status: changes the owner'
    #swagger.parameters['obj'] = {
        in: 'body',
		description: 'Group data.',
        schema: {
            $name: 'The name of the group',
            $new_owner: 'The username of the new owner',
        }
    }
    #swagger.responses[200] = {
		description:'The owner was changed, according to the request',
        schema : {"reason":"ok"}
	}
    #swagger.responses[400] = {
		description:'Something failed. Refer to the response for more details',
        schema : {"reason":"you do not own this group, or some other data you inserted is not valid. Stop trying to hack me, please"}
	}
    #swagger.responses[401] = {
		description:'The user is not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[33mPUT\x1b[0m\t/group/owner`)
    perform(transferGroupOwnership,req,res)
})

app.put('/group/description',mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['Groups','PUT']
    #swagger.summary = 'Updates a group status: changes the description'
    #swagger.parameters['obj'] = {
        in: 'body',
		description: 'Group data.',
        schema: {
            $name: 'The name of the group',
            $new_description: 'The new description',
        }
    }
    #swagger.responses[200] = {
		description:'The description was changed, according to the request',
        schema : {"reason":"ok"}
	}
    #swagger.responses[400] = {
		description:'Something failed. Refer to the response for more details',
        schema : {"reason":"you do not own this group, or some other data you inserted is not valid. Stop trying to hack me, please"}
	}
    #swagger.responses[401] = {
		description:'The user is not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[33mPUT\x1b[0m\t/group/description`)
    perform(changeGroupDescription,req,res)
})

app.post('/group/playlist',mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['Groups','POST']
    #swagger.summary = 'Updates a group status: adds a playlist'
    #swagger.parameters['obj'] = {
        in: 'body',
		description: 'Group data.',
        schema: {
            $group_name: 'The name of the group',
            $playlist_name: 'The name of the playlist to add',
        }
    }
    #swagger.responses[200] = {
		description:'The playlist was added, according to the request',
        schema : {"reason":"done successfully"}
	}
    #swagger.responses[400] = {
		description:'Something failed. Refer to the response for more details',
        schema : {"reason":"invalid data or wrong permissions"}
	}
    #swagger.responses[401] = {
		description:'The user is not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[32mPOST\x1b[0m\t/group/playlist`)
    perform(addPlaylistToGroup,req,res)
})

app.delete('/group/playlist',mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['Groups','DELETE']
    #swagger.summary = 'Updates a group status: removes a playlist'
    #swagger.parameters['obj'] = {
        in: 'body',
		description: 'Group data.',
        schema: {
            $group_name: 'The name of the group',
            $playlist_name: 'The name of the playlist to remove',
        }
    }
    #swagger.responses[200] = {
		description:'The playlist was removed, according to the request',
        schema : {"reason":"done successfully"}
	}
    #swagger.responses[400] = {
		description:'Something failed. Refer to the response for more details',
        schema : {"reason":"invalid data or wrong permissions"}
	}
    #swagger.responses[401] = {
		description:'The user is not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[35mDELETE\x1b[0m\t/group/playlist`)
    perform(removePlaylistFromGroup,req,res)
})

app.put('/group/join/:name',mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['Groups','PUT']
    #swagger.summary = 'Updates a group status: joins a group'
    #swagger.responses[200] = {
		description:'The user joined the group, according to the request',
        schema : {"reason":"ok"}
	}
    #swagger.responses[400] = {
		description:'Something failed. Refer to the response for more details',
        schema : {"reason":"bad data or already in this group"}
	}
    #swagger.responses[401] = {
		description:'The user is not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[33mPUT\x1b[0m\t/group/join/${req.params.name}`)
    perform(joinGroup,req,res)
})

app.put('/group/leave/:name',mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['Groups','PUT']
    #swagger.summary = 'Updates a group status: leaves a group'
    #swagger.responses[200] = {
		description:'The user left the group, according to the request',
        schema : {"reason":"ok"}
	}
    #swagger.responses[400] = {
		description:'Something failed. Refer to the response for more details',
        schema : {"reason":"bad data or not in this group"}
	}
    #swagger.responses[401] = {
		description:'The user is not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[33mPUT\x1b[0m\t/group/leave/${req.params.name}`)
    perform(leaveGroup,req,res)
})

app.delete('/group/:name',mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['Groups','DELETE']
    #swagger.summary = 'Delete a group'
    #swagger.responses[200] = {
		description:'The group was deleted',
        schema : {"reason":"ok"}
	}
    #swagger.responses[400] = {
		description:'Something failed. Refer to the response for more details',
        schema : {reason:`Generic error: Explanation`}
	}
    #swagger.responses[401] = {
		description:'The user is not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[35mDELETE\x1b[0m\t/group/${req.params.name}`)
    perform(deleteGroup,req,res)
})

///////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get('/playlist/info/:name',mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['Playlists','GET']
    #swagger.summary = 'Gets infos about a playlist'
    #swagger.responses[200] = {
		description:'The response contains the requested informations',
        schema : {
            "name": "myList",
            "description": "this is a playlist about old finnish songs",
            "tags":[
                "finnish",
                "old",
                "42"
            ],
            "visibility": true,
            "owner": "userName",
            "doIOwnIt":false,
            following: true
        }
    }
    #swagger.responses[400] = {
		description:'Something failed. Refer to the response for more details',
        schema : {reason:`Generic error: Explanation`}
	}
    #swagger.responses[401] = {
		description:'The user is not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[34mGET\x1b[0m\t/playlist/info/${req.params.name}`)
    perform(getPlaylistInfos,req,res)
})

app.get('/playlist/search/name/:name',mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['Playlists','GET']
    #swagger.summary = 'Gets playlist with that name as a substring of theirs'
    #swagger.responses[200] = {
		description:'The response contains the requested informations',
        schema : [
            {
                "name": "myList",
                "description": "this is a playlist about old finnish songs",
                "tags":[
                    "finnish",
                    "old",
                    "42"
                ],
                "visibility": true,
                "owner": "userName"
            }
        ]
	}
    #swagger.responses[400] = {
		description:'Something failed. Refer to the response for more details',
        schema : {reason:`Generic error: Explanation`}
	}
    #swagger.responses[401] = {
		description:'The user is not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[34mGET\x1b[0m\t/playlist/search/name/${req.params.name}`)
    perform(searchPlaylistsByName,req,res)
})

app.get('/playlist/search/tag/:tag',mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['Playlists','GET']
    #swagger.summary = 'Gets playlist with that tag in their tags'
    #swagger.responses[200] = {
		description:'The response contains the requested informations',
        schema : [
            {
                "name": "myList",
                "description": "this is a playlist about old finnish songs",
                "tags":[
                    "finnish",
                    "old",
                    "42"
                ],
                "visibility": true,
                "owner": "userName"
            }
        ]
	}
    #swagger.responses[400] = {
		description:'Something failed. Refer to the response for more details',
        schema : {reason:`Generic error: Explanation`}
	}
    #swagger.responses[401] = {
		description:'The user is not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[34mGET\x1b[0m\t/playlist/search/tag/${req.params.tag}`)
    perform(searchPlaylistsByTag,req,res)

})

app.post('/playlist',mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['Playlists','POST']
    #swagger.summary = 'Creates a group'
    #swagger.parameters['obj'] = {
        in: 'body',
		description: 'Playlist data.',
        schema: {
            $nome: 'The name of your new playlist',
            $descrizione: 'The description of your new playlist',
        }
    }
    #swagger.responses[200] = {
		description:'A playlist was created successfully',
        schema : {"reason":"inserted correctly"}
	}
    #swagger.responses[400] = {
		description:'Something failed. Refer to the response for more details',
        schema : {"reason":"Probably you haven't specified the right params"}
	}
    #swagger.responses[401] = {
		description:'The user is not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[32mPOST\x1b[0m\t/playlist`)
    perform(createPlaylist,req,res)
})

app.put('/playlist/sort/:name',mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['Playlists','PUT']
    #swagger.summary = 'Updates a playlist status: adds a song'
    #swagger.parameters['obj'] = {
        in: 'body',
		description: 'Playlist data.',
        schema: {
            $order:[
                "7m9XR7FquXLP1FewdAcNS9",
                "6oF8ueLn5hIl4PRp17sxW6",
                "6p7jXaTJdpzGWnOJoK2jYr",
                "3lXyAQ0kekAvY5LodpWmUs",
                "27MB0qHaYAZiTlwg25js1Y",
                "7EqpEBPOohgk7NnKvBGFWo",
                "1CzeuSrm71wHP9qsjg7p3F",
                "3dP0pLbg9OfVwssDjp9aT0",
                "54Sc7mZQ1RM03STpk4SfaA",
                "2yBMVrq96wb9OHbMdBs0lF",
                "3nJYcY9yvKP8Oi2Ml8brXt",
                "6OG1S805gIrH5nAQbEOPY3",
                "2G9lekfCh83S0lt2yfffBz",
                "71X7bPDljJHrmEGYCe7kQ8",
                "0NJWhm3hUwIZSy5s0TGJ8q",
                "4cxvludVmQxryrnx1m9FqL",
                "6dr7ekfhlbquvsVY8D7gyk",
                "4TTV7EcfroSLWzXRY6gLv6"
            ]
        }
    }
    #swagger.responses[200] = {
		description:'The order of the songs was changed successfully',
        schema : {"reason":"everything is fine"}
	}
    #swagger.responses[400] = {
		description:'Something failed. Refer to the response for more details',
        schema : {reason:`Generic error: Explanation`}
	}
    #swagger.responses[401] = {
		description:'The user is not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[33mPUT\x1b[0m\t/playlist/sort/${req.params.name}`)
    perform(sortPlaylist,req,res)
})

app.post('/playlist/song',mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['Playlists','POST']
    #swagger.summary = 'Updates a playlist status: adds a song'
    #swagger.parameters['obj'] = {
        in: 'body',
		description: 'Playlist data.',
        schema: {
            $name: 'The name of the playlist',
            $song_id: 'The id of the song to add',
        }
    }
    #swagger.responses[200] = {
		description:'The song was added successfully',
        schema : {"reason":"done"}
	}
    #swagger.responses[400] = {
		description:'Something failed. Refer to the response for more details',
        schema : {reason:`Generic error: Explanation`}
	}
    #swagger.responses[401] = {
		description:'The user is not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[32mPOST\x1b[0m\t/playlist/song`)
    perform(addSongToPlaylist,req,res)
})

app.delete('/playlist/song',mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['Playlists','DELETE']
    #swagger.summary = 'Updates a playlist status: removes a song'
    #swagger.parameters['obj'] = {
        in: 'body',
		description: 'Playlist data.',
        schema: {
            $name: 'The name of the playlist',
            $song_id: 'The id of the song to add',
        }
    }
    #swagger.responses[200] = {
		description:'The song was removed successfully',
        schema : {"reason":"done"}
	}
    #swagger.responses[400] = {
		description:'Something failed. Refer to the response for more details',
        schema : {reason:`Generic error: Explanation`}
	}
    #swagger.responses[401] = {
		description:'The user is not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[35mDELETE\x1b[0m\t/playlist/song`)
    perform(removeSongFromPlaylist,req,res)
})

app.put('/playlist/owner',mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['Playlists','PUT']
    #swagger.summary = 'Updates a playlist status: changes the owner'
    #swagger.parameters['obj'] = {
        in: 'body',
		description: 'Playlist data.',
        schema: {
            $name: 'The name of the playlist',
            $new_owner: 'The username of the new owner',
        }
    }
    #swagger.responses[200] = {
		description:'The owner changed, as requested',
        schema : {"reason":"ok"}
	}
    #swagger.responses[400] = {
		description:'Something failed. Refer to the response for more details',
        schema : {reason:`Generic error: Explanation`}
	}
    #swagger.responses[401] = {
		description:'The user is not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[33mPUT\x1b[0m\t/playlist/owner`)
    perform(transferPlaylistOwnership,req,res)
})

app.put('/playlist/description',mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['Playlists','PUT']
    #swagger.summary = 'Updates a playlist status: changes the description'
    #swagger.parameters['obj'] = {
        in: 'body',
		description: 'Playlist data.',
        schema: {
            $name: 'The name of the playlist',
            $new_description: 'The new description',
        }
    }
    #swagger.responses[200] = {
		description:'The playlist changed, as requested',
        schema : {"reason":"ok"}
	}
    #swagger.responses[400] = {
		description:'Something failed. Refer to the response for more details',
        schema : {reason:`Generic error: Explanation`}
	}
    #swagger.responses[401] = {
		description:'The user is not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[33mPUT\x1b[0m\t/playlist/description`)
    perform(changePlaylistDescription,req,res)
})

app.put('/playlist/follow/:name',mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['Playlists','PUT']
    #swagger.summary = 'Updates a playlist status: start following'
    #swagger.responses[200] = {
		description:'The user is now following the playlist',
        schema : {"reason":"ok"}
	}
    #swagger.responses[400] = {
		description:'Something failed. Refer to the response for more details',
        schema : {reason:`Generic error: Explanation`}
	}
    #swagger.responses[401] = {
		description:'The user is not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[33mPUT\x1b[0m\t/playlist/follow/${req.params.name}`)
    perform(followPlaylist,req,res)
})

app.put('/playlist/unfollow/:name',mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['Playlists','PUT']
    #swagger.summary = 'Updates a playlist status: stop following'
    #swagger.responses[200] = {
		description:'The user has ceased following the playlist',
        schema : {"reason":"ok"}
	}
    #swagger.responses[400] = {
		description:'Something failed. Refer to the response for more details',
        schema : {reason:`Generic error: Explanation`}
	}
    #swagger.responses[401] = {
		description:'The user is not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[33mPUT\x1b[0m\t/playlist/unfollow/${req.params.name}`)
    perform(unfollowPlaylist,req,res)
})

app.post('/playlist/tag',mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['Playlists','POST']
    #swagger.summary = 'Updates a playlist status: adds a tag'
    #swagger.parameters['obj'] = {
        in: 'body',
		description: 'Playlist data.',
        schema: {
            $name: 'The name of the playlist',
            $tag: 'The new tag',
        }
    }
    #swagger.responses[200] = {
		description:'A tag was added to the playlist successfully'
	}
    #swagger.responses[400] = {
		description:'Something failed. Refer to the response for more details',
        schema : {reason:`Generic error: Explanation`}
	}
    #swagger.responses[401] = {
		description:'The user is not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[32mPOST\x1b[0m\t/playlist/tag`)
    perform(addTagToPlaylist,req,res)
})

app.delete('/playlist/tag',mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['Playlists','DELETE']
    #swagger.summary = 'Updates a playlist status: removes a tag'
    #swagger.parameters['obj'] = {
        in: 'body',
		description: 'Playlist data.',
        schema: {
            $name: 'The name of the playlist',
            $tag: 'The old tag',
        }
    }
    #swagger.responses[200] = {
		description:'A tag was removed from the playlist successfully',
        schema : {"reason":"ok"}
	}
    #swagger.responses[400] = {
		description:'Something failed. Refer to the response for more details',
        schema : {reason:`Generic error: Explanation`}
	}
    #swagger.responses[401] = {
		description:'The user is not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[35mDELETE\x1b[0m\t/playlist/tag`)
    perform(removeTagFromPlaylist,req,res)
})

app.put('/playlist/publish/:name',mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['Playlists','PUT']
    #swagger.summary = 'Updates a playlist status: publishes it'
    #swagger.responses[200] = {
		description:'The playlist is now public',
        schema : {"reason":"ok"}
	}
    #swagger.responses[400] = {
		description:'Something failed. Refer to the response for more details',
        schema : {reason:`Generic error: Explanation`}
	}
    #swagger.responses[401] = {
		description:'The user is not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[33mPUT\x1b[0m\t/playlist/publish/${req.params.name}`)
    perform(publishPlaylist,req,res)
})

app.put('/playlist/private/:name',mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['Playlists','PUT']
    #swagger.summary = 'Updates a playlist status: makes it private'
    #swagger.responses[200] = {
		description:'The playlist is now private',
        schema : {"reason":"ok"}
	}
    #swagger.responses[400] = {
		description:'Something failed. Refer to the response for more details',
        schema : {reason:`Generic error: Explanation`}
	}
    #swagger.responses[401] = {
		description:'The user is not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[33mPUT\x1b[0m\t/playlist/private/${req.params.name}`)
    perform(makePlaylistPrivate,req,res)
})

app.delete('/playlist/:name',mongoSanitize,(req,res)=>{
    /*
    #swagger.tags = ['Playlists','DELETE']
    #swagger.summary = 'Delete a playlist'
    #swagger.responses[200] = {
		description:'The playlist was successfully deleted',
        schema : {"reason":"done correctly"}
	}
    #swagger.responses[400] = {
		description:'Something failed. Refer to the response for more details',
        schema : {reason:`Generic error: Explanation`}
	}
    #swagger.responses[401] = {
		description:'The user is not logged in',
        schema : {"reason": `Invalid login`}
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[35mDELETE\x1b[0m\t/playlist/${req.params.name}`)
    perform(deletePlaylist,req,res)
})

///////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("*", (req, res) => {
    /*
    #swagger.tags = ['Everything else','GET']
    #swagger.responses[404] = {
		description:'The requested resource was not found'
	}
	*/
    log(`\t\x1b[36m${req.ip}\x1b[0m\t\x1b[34mGET\x1b[0m\t* invoked`)
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