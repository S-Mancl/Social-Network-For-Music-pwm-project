const express = require('express')
require('dotenv').config()
const validator = require('validator');
const crypto = require('crypto')
const cors = require('cors')
const mongoClient = require('mongodb').MongoClient;
const mongoUrl = "mongodb+srv://"+process.env.MONGONAME+":"+process.env.MONGOPASSWORD+"@pwm.hwxyajg.mongodb.net/?retryWrites=true&w=majority"
const path = require('path')

const app = express()
app.use(express.json())
app.use(cors())//per i cors

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
        }
    */

    if(user.name==undefined || user.password==undefined || user.surname == undefined || user.userName == undefined || user.birthDate == undefined || user.favoriteGenres == undefined || user.email == undefined) res.status(400).json({reason: `You are missing some fields...`})
    else{
        [`name`,`surname`,`userName`,`birthDate`,`password`,`email`].forEach(key => {
            //console.log(user[key])
            user[key] = validator.escape(validator.trim(user[key]))
        })
        for (let i = 0; i < user.favoriteGenres.length; i++){
            user.favoriteGenres[i] = validator.escape(validator.trim(user.favoriteGenres[i]))
        }
        if(!validator.isEmail(user.email)) res.status(400).json({reason:`Are you sure ${user.email} is an email?`})
        else if(!validator.isStrongPassword(user.password)) res.status(400).json({reason:`${user.password} is not strong enough as a password`})
        else if(!validator.isDate(user.birthDate)) res.status(400).json({reason:`${user.birthDate} is not an accepted birth date`})
        else if(!validator.isAlpha(user.name)||!validator.isAlpha(user.surname)) res.status(400).json({reason:`${user.name} ${user.surname} is not an accepted name... It contains numbers!`})
        else{
            user.email = validator.normalizeEmail(user.email)
            user.password = hash(user.password)
            var pwmClient = await new mongoClient(mongoUrl).connect()
            try {
                var items = await pwmClient.db("pwm_project").collection('users').insertOne(user)
                delete items.insertedId
                res.status(200).json(items)
            }
            catch (e) {
                console.log('catch in test');
                if (e.code == 11000) {
                    res.status(400).json({reason:"Already present user: please choose a different username or email"})
                    return
                }
                res.status(500).json({reason:`Generic error: ${e}`})
        
            };
        }
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
            "playlist",
            "episode",
            "track",
            "audiobook",
            "artist",
            "show"
        ]
            .sort())
})

app.post("/register", (req, res)=>{
    perform(register,res,req.body)
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

app.get("*", (req, res) => {
    //console.log(path.join(__dirname,'/static/not_found.html'))
    res.status(404).sendFile(path.join(__dirname, '/static/not_found.html'));
})

app.listen(process.env.PORT, "0.0.0.0", () => {
    console.log(`Server started. Port ${process.env.PORT}. http://localhost:${process.env.PORT}/index.html`)
})