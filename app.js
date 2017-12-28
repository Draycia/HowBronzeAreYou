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
const util = require('./bin/util.js');
const noBots = require('express-nobots');
const urlencode = require('urlencode');

const publicDir = path.join(__dirname, 'public');
const date = new Date();
const app = express();

util.init();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .use(nib())
}

app.use(noBots());

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

proData = {
  summonerInfo: { name: 'chowdog', iconId: 7 },
  match:
    {
      perks:
        {
          mainPerk: 8300,
          subPerk: 8200,
          perk0Id: 8359,
          perk1Id: 8313,
          perk2Id: 8304,
          perk3Id: 8347,
          perk4Id: 8226,
          perk5Id: 8234
        },
      gameDuration: 2082,
      queueId: 420,
      mapId: 11,
      championId: 119,
      spell1Id: 4,
      spell2Id: 7,
      kills: 11,
      deaths: 9,
      assists: 9,
      totalDamageDealt: 202145,
      goldEarned: 17975,
      wardsPlaced: 17,
      pinksPlaced: 1,
      creepScore: 220
    }
}

app.get('/', (req, res) => {
  if (req.query.summonerName) {
    let region = 'na1';
    if (req.subdomains[0]) region = util.getRegion(req.subdomains[0]);
    if (req.query.region) region = util.getRegion(req.query.region);

    util.getMatch(urlencode(req.query.summonerName), region).then(userData => {
      if (!userData.isSet) {
        res.render('errors', { error: "Oh no! Seems the poros were released." });
        return;
      }
      if (userData.status == 0) {
        let scores = util.getAllScores(userData, proData);
        let messages = util.getMessages(scores);
        let userKDA = util.getKDA(userData);
        let proKDA = util.getKDA(proData);
        let rank = util.getAverageScore(scores);
        let userKeystone = util.getKeystoneName(userData);
        let proKeystone = util.getKeystoneName(proData);
        let version = util.getVersion();
        res.render('summoner', { version: version, userData: userData, proData: proData, scores: scores, messages: messages, userKDA: userKDA, proKDA: proKDA, rank: rank, userKeystone: userKeystone, proKeystone: proKeystone });
      } else if (userData.status == 1) {
        res.render('errors', { error: "Seems that summoner doesn't exist..." });
      } else if (userData.status == 2) {
        res.render('errors', { error: "Seems that summoner doesn't have any recent games on Summoner's Rift..." });
      } else {
        res.render('error');
      }
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
