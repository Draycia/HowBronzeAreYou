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
  let userRegion = req.subdomains[0] || 'na';
  let userRegionSan = util.getRegion(userRegion);
  let comparisonRegion = req.query.otherRegion || 'na';
  let comparisonRegionSan = util.getRegion(comparisonRegion);

  if (req.query.summonerName && req.query.otherSummoner) {
    util.getMatch(urlencode(req.query.summonerName), userRegionSan).then(userData => {
      if (!userData.isSet) return res.render('errors', { error: 'There was an error getting a match for the 1st summoner!' });
      util.getMatch(urlencode(req.query.otherSummoner), comparisonRegionSan).then(comparisonData => {
        if (!comparisonData.isSet) return res.render('errors', { error: 'There was an error getting a match for the 2nd summoner!' });
        if (userData.status == 0 && comparisonData.status == 0) {
          renderSummoner(userData, comparisonData, res, true, userRegion);
        } else if (userData.status == 1 || comparisonData.status == 1) {
          res.render('errors', { error: "Seems one of the summoners doesn't exist..." });
        } else if (userData.status == 2 || comparisonData.status == 2) {
          res.render('errors', { error: "Seems one of the summoners doesn't have any recent games on Summoner's Rift..." });
        } else {
          res.render('error');
        }
      });
    });
  } else if (req.query.summonerName) {
    util.getMatch(urlencode(req.query.summonerName), userRegionSan).then(userData => {
      if (!userData.isSet) return res.render('errors', { error: 'There was an error getting a match for your summoner!' });
      if (userData.status == 0) {
        let champData = util.getChampData().data[`${userData.match.championId}`];
        if (!champData) return res.render('errors', { error: "Seems we failed to obtain information on the champion you last played in Summoner's Rift... :(" });
        let comparisonData = util.getDataFromCGG(champData);
        renderSummoner(userData, comparisonData, res, false, userRegion);
      } else if (userData.status == 1) {
        res.render('errors', { error: "Seems that summoner doesn't exist..." });
      } else if (userData.status == 2) {
        res.render('errors', { error: "Seems that summoner doesn't have any recent games on Summoner's Rift..." });
      } else {
        res.render('error');
      }
    });
  } else {
    res.render('index', { region: userRegion });
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

function renderSummoner(userData, compareData, res, isSVS, region) {
  let scores = util.getAllScores(userData, compareData);
  let messages = util.getMessages(scores);
  let userKDA = util.getKDA(userData);
  let proKDA = util.getKDA(compareData);
  let rank = util.getAverageScore(scores);
  let userKeystone = util.getKeystoneName(userData);
  let proKeystone = util.getKeystoneName(compareData);
  let version = util.getVersion();
  let versus = isSVS ? `${compareData.summonerInfo.name}` : 'the average challenger player';
  res.render('summoner', { version, userData, proData: compareData, scores, messages, userKDA, proKDA, rank, userKeystone, proKeystone, region, versus });
}

module.exports = app;