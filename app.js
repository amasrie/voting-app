var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
require('dotenv').load();

var app = express();

mongoose.connect(process.env.MONGO, {useMongoClient: true});

var user = require('./models/user')(mongoose);
var poll = require('./models/poll')(mongoose);
var vote = require('./models/vote')(mongoose);
var option = require('./models/option')(mongoose);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon(__dirname + '/public/images/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var middleware = function(req, res, next){
    if( ((req.path == "/signin" || req.path == "/signup") && req.session) || 
        ((req.path == "/mypolls" || req.path == "/newpoll") && !req.session) ){
            res.redirect("/");
    }else{
        next();
    }
}

app.use(middleware);

app.get('/', function(req, res){
    res.render('index');
});

app.get('/signup', function(req, res){
    res.render('signup');
});

app.get('/signin', function(req, res){
    res.render('signin');
});

app.get('/mypolls', function(req, res){
    res.render('mypolls');
});

app.get('/newpoll', function(req, res){
    res.render('newpoll');
});

app.get('/vote/:poll_id', function(req, res){
    res.render('vote');
});

app.get('*', function(req, res){
  res.redirect('/');
});

app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + process.env.PORT);
});
