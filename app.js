var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var session = require('express-session');
var mongoStore = require('connect-mongo')(session);
var md5 = require('md5');
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

app.use(
    session({
        name: 'voting.key',
        secret: process.env.SESSION_KEY,
        resave: false,
        saveUninitialized: true,
        store: new mongoStore({
            expires: 120 * 60 * 1000,
            mongooseConnection: mongoose.connection,
            collection: 'voting_sessions'
        })
    })
);

var middleware = function(req, res, next){
    if( ((req.path == "/signin" || req.path == "/signup") && req.session.name) || 
        ((req.path == "/mypolls" || req.path == "/newpoll") && !req.session.name) ){
            res.redirect("/");
    }else{
        next();
    }
}

app.use(middleware);

app.get('/', function(req, res){
    res.render('index', {user: req.session});
});

app.get('/signup', function(req, res){
    res.render('signup', {user: req.session, error: null});
});

app.get('/signin', function(req, res){
    res.render('signin', {user: req.session, error: null});
});

app.post('/signup', function(req, res){
    //at any error, render with the corresponding message
    //check if all fields were filled (req.body.(input name))
    if(req.body.fullName && req.body.email &&
        req.body.password && req.body.confirmPassword){
        //check if password was repeated correctly
        if(req.body.password == req.body.confirmPassword){
            //cipher password
            var cipher = md5(req.body.password);
            //save in Mongo
            //check email format (already in mongoose)
            //check if email already exists (index unique by mongoose)
            var createdUser = new user({
                name: req.body.fullName, 
                email: req.body.email, 
                password: cipher
            });
            createdUser.save(function(error){
              if(error){
                if(error.errors){
                    res.render('signup', {user: req.session, error: error.errors['email'].message});
                }else{
                    res.render('signup', {user: req.session, error: 'Email address already in use'});
                }
              }else{
                //add req.session.name and email
                req.session.name = req.body.fullName;
                req.session.email = req.body.email;
                //save new req.session
                req.session.save(function(err){
                    if(err){
                        res.render('signup', {user: req.session, error: 'Could\'nt sign up. Please try later'});
                    }else{
                        //redirect to mypolls
                        res.redirect('/mypolls');                        
                    }
                })
              }  
            })
        }else{
            res.render('signup', {user: req.session, error: 'The passwords did\'nt match'});
        }
    }else{
        res.render('signup', {user: req.session, error: 'All fields must be filled'});
    }
});

app.post('/signin', function(req, res){
    //at any error, render with the corresponding message
    //check if all fields were filled (req.body.(input name))
    if(req.body.email && req.body.password){
        //cipher password
        var cipher = md5(req.body.password);
        //check if email exists
        //check if password is the same
        user.find({
            email: req.body.email,
            password: cipher
        }).exec(function(error, foundUser){
            if(error || foundUser.length == 0){
                res.render('signin', {user: req.session, error: 'User email or password did\'nt match'});
            }else{
                //add req.session.name and email
                req.session.name = foundUser[0].name;
                req.session.email = foundUser[0].email;
                //save new req.session
                req.session.save(function(err){
                    if(err){
                        res.render('signin', {user: req.session, error: 'Could\'nt sign in. Please try again later'});
                    }else{
                        //redirect to mypolls
                        res.redirect('/mypolls');                        
                    }
                })
            }
        })
    }else{
        res.render('signin', {user: req.session, error: 'All fields must be filled'});
    }
});

app.get('/signout', function(req,res,next){
    req.session.destroy(function(err){
        if (err) {
            console.log("error: ", err);
        }
        res.redirect('/');
    });
});

app.get('/mypolls', function(req, res){
    res.render('mypolls', {user: req.session});
});

app.get('/newpoll', function(req, res){
    res.render('newpoll', {user: req.session});
});

app.post('/newpoll', function(req, res){
    res.redirect('/mypolls');
});

app.get('/vote/:poll_id', function(req, res){
    res.render('vote', {user: req.session});
});

app.get('*', function(req, res){
  res.redirect('/');
});

app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + process.env.PORT);
});
