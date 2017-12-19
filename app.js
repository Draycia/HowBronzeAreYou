const express = require('express');
const stylus = require('stylus')
const nib = require('nib')
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const compression = require('compression');
const minify = require('express-minify');
const request = require('request');

const publicDir = path.join(__dirname, 'public');
const date = new Date();
const app = express();

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

userData = {
  summonerInfo: { name: 'Rito Bandito', iconId: 3186 },
  match:
    {
      perks:
        {
          perk0Id: 8229,
          perk1Id: 8226,
          perk2Id: 8234,
          perk3Id: 8237,
          perk4Id: 9104,
          perk5Id: 8014
        },
      queueId: 400,
      mapId: 11,
      championId: 202,
      spell1Id: 7,
      spell2Id: 4,
      kills: 5,
      deaths: 7,
      assists: 8,
      totalDamageDealt: 52337,
      goldEarned: 9058,
      gameLength: 1502,
      wardsPlaced: 4,
      pinksPlaced: 2
    }
}

proData = {
  summonerInfo: { name: 'Imaqtpie', iconId: 7 },
  match:
    {
      perks:
        {
          perk0Id: 8229,
          perk1Id: 8226,
          perk2Id: 8234,
          perk3Id: 8237,
          perk4Id: 9104,
          perk5Id: 8014
        },
      queueId: 400,
      mapId: 11,
      championId: 202,
      spell1Id: 7,
      spell2Id: 4,
      kills: 5,
      deaths: 7,
      assists: 8,
      totalDamageDealt: 52337,
      goldEarned: 17783,
      gameLength: 2100,
      wardsPlaced: 4,
      pinksPlaced: 2
    }
}

app.get('/', (req, res) => {
  if (req.query.summonerName) {
    request.get('http://ddragon.leagueoflegends.com/api/versions.json', (err, response, body) => {
      res.render('summoner', { version: JSON.parse(body)[0], userData: userData, proData: proData });
    });
  } else {
    res.render('index');
  }
});

app.use(function (req, res, next) {
  let err = new Error('Not Found');
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
