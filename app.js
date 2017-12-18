var express = require('express');
var stylus = require('stylus')
var nib = require('nib')
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var compression = require('compression');
var minify = require('express-minify');
var request = require('request');

var publicDir = path.join(__dirname, 'public');
var date = new Date();
var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .use(nib())
}

app.use(stylus.middleware({
  src: __dirname + '/public',
  compile: compile
}))

app.use(favicon(path.join(__dirname, 'public', 'bronze.ico')));
app.use(compression());
app.use(logger('common'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// app.get('*', function(req, res, next) {
//     if (!req.secure) {
//         return res.redirect('https://' + req.get('host') + req.originalUrl);
//     }
//     return next();
// });

app.get('/', (req, res) => {
  if (req.query.summonerName) {
    request.get('http://ddragon.leagueoflegends.com/api/versions.json', (err, response, body) => {
      res.render('summoner', { summonerName: req.query.summonerName, verion: JSON.parse(body)[0], wardCount: 8, pinkCount: 2 });
    });
  } else {
    res.render('index');
  }
});

app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});
module.exports = app;