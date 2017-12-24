const config = require("./configuration.js");
const TeemoJS = require("teemojs");
const api = new TeemoJS(config.key);
const messages = require('./messages.js');
const queues = require('./queues.js').queues;
const Repeat = require('repeat');
const request = require('request');

let runesReforged;
let version = "7.24.2";

function init() {
  Repeat(updateVersion).every(60, 'minutes').start.in(1, 'sec');
  Repeat(updateRunes).every(60, 'minutes').start.in(5, 'sec'); // Increase if it's too fast for you
}

function getVersion() {
  return version;
}

function updateVersion() {
  request.get('http://ddragon.leagueoflegends.com/api/versions.json', (err, response, body) => {
    version = JSON.parse(body)[0];
    console.log('Updated version to: ' + version);
    return;
  });
}

function updateRunes() {
  request.get('http://ddragon.leagueoflegends.com/cdn/' + version + '/data/en_US/runesReforged.json', (err, response, body) => {
    runesReforged = JSON.parse(body);
    console.log('Updated runes.');
  });
}

/*
 * For now, we're only getting one match.
 * This will be converted to getMatchlist in the future.
 * 
 * Return codes: 
 * 0 = all good
 * 1 = missing summoner
 * 2 = no matches / no SR games
 */
async function getMatch(summonerName, region) {
  let dataObject = {
    "summonerInfo": {},
    "match": {
      "perks": {}
    },
    "status": 0,
    "isSet": false
  }
  let summonerInfo = await api.get(region, "summoner.getBySummonerName", summonerName);

  if (!summonerInfo) {
    dataObject.status = 1
    return dataObject;
  }

  let matchlist = await api.get(region, "match.getMatchlist", summonerInfo.accountId, { beginIndex: 0, endIndex: 20 });

  let queue5v5;
  for(let i = 0; i < 20; i++) {
    if(queues.includes(matchlist.matches[i].queue) && matchlist.matches[i].platformId == region.toUpperCase()) {
      queue5v5 = i;
      break;
    }
  }

  if (!matchlist || typeof queue5v5 === 'undefined') {
    dataObject.status = 2;
    return dataObject;
  }

  let match = await api.get(region, "match.getMatch", matchlist.matches[queue5v5].gameId);
  let arrIndex;
  let stats;
  for(let i = 0; i < match.participantIdentities.length; i++) {
    if(summonerInfo.accountId === match.participantIdentities[i].player.currentAccountId) {
      // arrIndex is used for easiness in finding the plater in participant arrays
      // stats is used for laziness tbh
      arrIndex = match.participantIdentities[i].participantId - 1
      stats = match.participants[arrIndex].stats;
      // Fill the object with the info needed
      dataObject.summonerInfo.name = summonerInfo.name;
      dataObject.summonerInfo.iconId = summonerInfo.profileIconId;
      dataObject.match.gameDuration = match.gameDuration
      dataObject.match.queueId = match.queueId;
      dataObject.match.mapId = match.mapId;
      dataObject.match.championId = match.participants[arrIndex].championId;
      dataObject.match.perks.perk0Id = stats.perk0;
      dataObject.match.perks.perk1Id = stats.perk1;
      dataObject.match.perks.perk2Id = stats.perk2;
      dataObject.match.perks.perk3Id = stats.perk3;
      dataObject.match.perks.perk4Id = stats.perk4;
      dataObject.match.perks.perk5Id = stats.perk5;
      dataObject.match.spell1Id = match.participants[arrIndex].spell1Id;
      dataObject.match.spell2Id = match.participants[arrIndex].spell2Id;
      dataObject.match.kills = stats.kills;
      dataObject.match.deaths = stats.deaths;
      dataObject.match.assists = stats.assists;
      dataObject.match.totalDamageDealt = stats.totalDamageDealt;
      dataObject.match.goldEarned = stats.goldEarned;
      dataObject.match.wardsPlaced = stats.wardsPlaced;
      dataObject.match.pinksPlaced = stats.visionWardsBoughtInGame;
      dataObject.match.creepScore = stats.totalMinionsKilled;

      return dataObject;
    }
  }
  return dataObject;
}

function getAllScores(userData, proData) {
  let userKDA = (userData.match.kills + userData.match.assists) / userData.match.deaths;
  let proKDA = (proData.match.kills + proData.match.assists) / proData.match.deaths;

  let dataObject = {}

  dataObject.pinksPlaced = getScore(userData.match.pinksPlaced, proData.match.pinksPlaced);
  dataObject.wardsPlaced = getScore(userData.match.wardsPlaced, proData.match.wardsPlaced);
  dataObject.creepScore = getScore(userData.match.creepScore, proData.match.creepScore);
  dataObject.kda = getScoreByKDA(userKDA, proKDA);

  return dataObject;
}

function getScore(userValue, proValue) {
  let yolo = proValue / 5;
  let yoloIntensifies = userValue / yolo;
  let MEGAYOLO = "";

  if (yoloIntensifies >= 5)
    MEGAYOLO = 1;
  else if (yoloIntensifies >= 4)
    MEGAYOLO = 2;
  else if (yoloIntensifies >= 3)
    MEGAYOLO = 3;
  else if (yoloIntensifies >= 2)
    MEGAYOLO = 4;
  else
    MEGAYOLO = 5;

  return MEGAYOLO;
}

function getAverageScore(scores) {

}

function getScoreByKDA(userKDA, proKDA) {
  return getScore(userKDA * 10, proKDA * 10);
}

function getMessages(scores) {
  let messageObject = {}

  messageObject.pinksPlaced = messages.pinks[scores.pinksPlaced];
  messageObject.wardsPlaced = messages.wards[scores.wardsPlaced];
  messageObject.kda = messages.kda[scores.kda];

  return messageObject;
}

module.exports = {
  getMatch: getMatch,
  getAllScores: getAllScores,
  getAverageScore: getAverageScore,
  getMessages: getMessages
}