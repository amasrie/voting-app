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
var moment = require('moment');
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
    if( (req.path == "/signin" || req.path == "/signup") && req.session.name ){
        res.redirect("/mypolls");
    }else if((req.path == "/mypolls" || req.path == "/newpoll") && !req.session.name){
        res.redirect("/signin");
    }else{
        next();
    }
}

app.use(middleware);

app.get('/', function(req, res){
    res.redirect('/polls');
});

app.get('/polls', function(req, res){
    var numberPage = req.query.page ? req.query.page : 0;
    //getting the list of created polls
    poll.find({})
    .sort({date: -1})
    .skip(numberPage * 4)
    .limit(4)
    .exec(function(error, foundPolls){
        if(error){
            res.render('index', {user: req.session, polls: [], error: 'An error ocurred while trying to load the polls'});
        }else{
            poll.count({})
            .exec(function(error, count){
                if(error){
                    res.render('index', {user: req.session, polls: [], error: 'An error ocurred while trying to load the polls'});
                }else{
                    getPollOptions(0, foundPolls, [], res, req, true, numberPage, count);
                }                
            })
        }
    })    
});

var getPollOptions = function(num, foundPolls, list, res, req, isIndex, current, count){
    if(num < foundPolls.length){
        option.find({poll: foundPolls[num]._id})
        .exec(function(error, pollOptions){
            if(error){
                res.render('index', {user: req.session, polls: [], error: 'An error ocurred while trying to load a poll options'});
            }else{
                var json = {};
                json.poll = foundPolls[num];
                json.options = pollOptions;
                var votes = 0;
                var mostVoted;
                var mostVotes = 0;
                for(var i = 0; i < pollOptions.length; i++){
                    if(pollOptions[i].vote > mostVotes){
                        mostVotes = pollOptions[i].vote;
                        mostVoted = pollOptions[i].name;
                    }else if(pollOptions[i].vote > 0 && pollOptions[i].vote == mostVotes){
                        mostVoted = 'needing a tiebreak';
                    }
                    votes += pollOptions[i].vote;
                }
                if(!mostVotes){
                    mostVoted = 'not defined yet';
                }
                json.vote = votes;
                json.mostVoted = mostVoted;
                json.dateFormat = moment(json.poll.date).format('LL');
                list.push(json);
                getPollOptions(num + 1, foundPolls, list, res, req, isIndex, current, count);
            }
        })
    }else{
        if(isIndex){
            res.render('index', {user: req.session, polls: list, error: null, current: current, last: Math.floor(count / 4)});
        }else{
            res.render('mypolls', {user: req.session, polls: list, error: null, current: current, last: Math.floor(count / 4)});
        }
    }
}

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
        res.redirect('/polls');
    });
});

app.get('/mypolls', function(req, res){
    var numberPage = req.query.page ? req.query.page : 0;
    //getting the list of user's created polls
    poll.find({owner: req.session.email})
    .sort({date: -1})
    .skip(numberPage * 4)
    .limit(4)
    .exec(function(error, foundPolls){
        if(error){
            res.render('mypolls', {user: req.session, polls: [], error: 'An error ocurred while trying to load the polls'});
        }else{
            poll.count({owner: req.session.email})
            .exec(function(error, count){
                if(error){
                    res.render('index', {user: req.session, polls: [], error: 'An error ocurred while trying to load the polls'});
                }else{
                    getPollOptions(0, foundPolls, [], res, req, false, numberPage, count);
                }                
            })
        }
    })
});

app.get('/newpoll', function(req, res){
    res.render('newpoll', {user: req.session, error: null});
});

app.post('/newpoll', function(req, res){
    //check that every field has text (including every extra option added)
    var hasNull = false;
    for(var attr in req.body){
        if(!req.body[attr]){
            hasNull = true;
            break;
        }
    }
    if(hasNull){
        res.render('newpoll', {user: req.session, error: 'All fields must be filled'});
    }else{
        //create the poll
        var createdPoll = new poll({
            owner: req.session.email,
            question: req.body.questionPoll
        });
        createdPoll.save(function(error, poll){
            if(error){
                console.log(error);
                res.render('newpoll', {user: req.session, error: 'An error ocurred during the creation of the poll'});
            }else{
                //create each option
                createOption(req, res, 1, poll._id);
            }
        });
    }
});

var createOption = function(req, res, num, pollId){
    if(!req.body["option"+num]){
        //redirect to mypolls
        res.redirect('/mypolls');
    }else{
        var createdOption = new option({
            poll: pollId,
            name: req.body["option"+num]
        });
        createdOption.save(function(error){
            if(error){
                console.log(error);
                res.render('newpoll', {user: req.session, error: 'An error ocurred during the creation of the poll options'});
            }else{
                //create next option
                createOption(req, res, num+1, pollId);
            }
        });        
    }
}

app.get('/vote/:poll_id', function(req, res){
    getPollInfo(req, res, req.params.poll_id, null);
});

app.post('/vote/:poll_id', function(req, res){
    if(req.body.selectOption == 'Choose'){
        getPollInfo(req, res, req.params.poll_id, "An option must be selected.");
    }else{
        //get user identificator
        var userId = req.session.email ? req.session.email : req.ip;
        //creating the vote instance
        var createdVote = new vote({
            user: userId,
            poll: req.params.poll_id
        });
        createdVote.save(function(error, vote){
            if(error){
                console.log(error);
                getPollInfo(req, res, req.params.poll_id, 'An error ocurred while trying to save your vote. Please try again.');
            }else{
                //adding the vote to the option
                option.update({_id: req.body.selectOption}, {$inc: {vote: 1} },
                    function(err, response){
                        if(err){
                            console.log(err);
                            getPollInfo(req, res, req.params.poll_id, 'An error ocurred while trying to add your vote.');
                        }else{
                            //go back to the voting page
                            getPollInfo(req, res, req.params.poll_id, null);
                        }
                    });
            }
        });

    }
});

var getPollInfo = function(req, res, pollId, errMsg){
    var userId = req.session.email ? req.session.email : req.ip;
    //find the poll
    poll.find({_id: pollId})
    .exec(function(error, foundPoll){
        if(error){
            res.render('vote', {user: req.session, userVoted: true, poll: {pollQuestion: null} ,error: 'An error ocurred while trying to load the poll'});
        }else{
            var json = {pollQuestion: foundPoll[0]};
            json.dateFormat = moment(json.pollQuestion.date).format('LL');
            json.vote = 0;
            //get the poll options
            option.find({poll: json.pollQuestion._id})
            .exec(function(error, pollOptions){
                if(error){
                    console.log(error)
                    res.render('vote', {user: req.session, userVoted: true, poll: {pollQuestion: null} ,error: 'An error ocurred while trying to load the poll options'});
                }else{
                    json.pollOptions = pollOptions;
                    for(var i = 0; i < pollOptions.length; i++){
                        json.vote += pollOptions[i].vote;
                    }
                    //check if the user already voted
                    vote.find({user: userId, poll: pollId}, function(err, found){
                        if(error){
                            console.log(error)
                            res.render('vote', {user: req.session, userVoted: true, poll: {pollQuestion: null} ,error: 'An error ocurred while trying to determine if the user has already voted in this poll'});
                        }else{
                            console.log("found ", found)
                            res.render('vote', {user: req.session, userVoted: found.length > 0 ,poll: json, error: errMsg});
                        }
                    })
                }
            });
        }
    })
}

app.get('/delete/:poll_id', function(req, res){
    poll.remove({_id: req.params.poll_id}, function(err){
        if(err){
            console.log(err);
            res.render('mypolls', {user: req.session, polls: [], error: 'An error ocurred while trying to delete a poll'});
        }else{
            res.redirect('/mypolls');
        }
    })
});

app.get('*', function(req, res){
  res.redirect('/polls');
});

app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + process.env.PORT);
});
