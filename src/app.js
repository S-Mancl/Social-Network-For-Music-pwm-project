const express = require('express')
require('dotenv').config()
const validator = require('validator');
const crypto = require('crypto')
const cors = require('cors')
const mongoClient = require('mongodb').MongoClient;
const mongoUrl = "mongodb+srv://"+process.env.MONGONAME+":"+process.env.MONGOPASSWORD+"@pwm.hwxyajg.mongodb.net/?retryWrites=true&w=majority"

const app = express()
app.use(express.json())
app.use(cors())//per i cors

var token = {
    value: "none",
    expiration: 42,
    regenAndThen : function(func_to_apply,paramA,paramB){
        this.expiration = new Date().getTime(); //ms since doesn't matter
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
    genres: "https://api.spotify.com/v1/recommendations/available-genre-seeds"
}

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger-output.json');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

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
    url = baseUrls.search+"q="+question.string+"&type="
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

app.use('/',express.static(__dirname + '/static'))
app.use('/images',express.static(__dirname+'/static/resources/imgs'))
app.use('/scripts',express.static(__dirname+'/static/resources/srcs'))
app.use('/styles',express.static(__dirname+'/static/resources/css'))

app.get('/coffee', (req, res) => {
    res.status(418).json({"answer":"I'm not a teapot, but I cannot brew coffee..."})
})

app.get('/genres',(req,res)=>{
    //console.log(token.hasExpired())
    if(token.hasExpired()) token.regenAndThen(getGenres,req,res);
    else getGenres(req,res)
})
app.get('/types',(req,res)=>{
    res.status(200).json(["album","playlist","episode","track","audiobook","artist","show"].sort())
})

app.post("/register", (req, res)=>{
    
})

app.post("/search",(req,res)=>{
    if(token.hasExpired()) token.regenAndThen(askSpotify,res,req.body);
    else askSpotify(res,req.body)
})

app.listen(process.env.PORT, () => {
    console.log(`Server started. Port ${process.env.PORT}. http://localhost:${process.env.PORT}/index.html`)
})