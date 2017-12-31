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
const aa = require('express-async-await')

const publicDir = path.join(__dirname, 'public');
const date = new Date();
const app = aa(express());

let champData;

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

app.get('/', function(req, res) {
  if (req.query.summonerName && req.query.otherSummoner) {
    let userRegion = 'na';
    let region = 'na1';
    let otherRegion = 'na1';
    if (req.subdomains[0]) {
      region = util.getRegion(req.subdomains[0]);
      userRegion = req.subdomains[0];
    }
    if (req.query.region) region = util.getRegion(req.query.region);
    if (req.query.otherRegion) otherRegion = util.getRegion(req.query.otherRegion);

    util.getMatch(urlencode(req.query.summonerName), region).then(userData => {
      if (!userData.isSet) {
        res.render('errors', { error: "Oh no! Seems the poros were released." });
        return;
      }
      util.getMatch(urlencode(req.query.otherSummoner), otherRegion).then(compData => {
        if (!compData.isSet) {
          res.render('errors', { error: "Oh no! Seems the poros were released. AAAAAAAAAAA" }); // I know it's ugly. I'm rushing this last day...
          return;
        }
        if (userData.status == 0 && compData.status == 0) {
          let scores = util.getAllScores(userData, compData);
          let messages = util.getMessages(scores);
          let userKDA = util.getKDA(userData);
          let proKDA = util.getKDA(compData);
          let rank = util.getAverageScore(scores);
          let userKeystone = util.getKeystoneName(userData);
          let proKeystone = util.getKeystoneName(compData);
          let version = util.getVersion();
          res.render('summoner', { version: version, userData: userData, proData: compData, scores: scores, messages: messages, userKDA: userKDA, proKDA: proKDA, rank: rank, userKeystone: userKeystone, proKeystone: proKeystone, region: userRegion });
        } else if (userData.status == 1 || compData.status == 1) {
          res.render('errors', { error: "Seems one of the summoners doesn't exist..." });
        } else if (userData.status == 2 || compData.status == 2) {
          res.render('errors', { error: "Seems one of the summoners doesn't have any recent games on Summoner's Rift..." });
        } else {
          res.render('error');
        }
      })
    });
  } else {
    let region = 'na';
    if (req.subdomains[0]) region = req.subdomains[0];
    res.render('index', { region: region });
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
module.exports.champData = champData;