const config = require("./configuration.js");
const TeemoJS = require("teemojs");
const api = new TeemoJS(config.key);
const cGG = new TeemoJS(config.cGGKey, TeemoJS.championGGConfig);
const fs = require("fs");

const app = require('../app.js');

const messages = require('./messages.js');
const queues = require('./queues.js').queues;
const Repeat = require('repeat');
const request = require('request');

function decimalRound(number, precision){
  let factor = Math.pow(10, precision);
  let tempNumber = number * factor;
  let roundedTempNumber = Math.round(tempNumber);
  return roundedTempNumber / factor;
}

let runesReforged;
let version = "7.24.2";

function init() {
  Repeat(updateVersion).every(60, 'minutes').start.in(1, 'sec');
  Repeat(updateRunes).every(60, 'minutes').start.in(1, 'sec');
  Repeat(createChampFile).every(60, 'minutes').start.in(1, 'sec');
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
  runesReforged = JSON.parse(fs.readFileSync('./bin/perks.json'));
  console.log('Loaded runes json');
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

  console.log("summoner name: " + summonerName + ", region: " + region);

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
      dataObject.match.perks.mainPerk = stats.perkPrimaryStyle;
      dataObject.match.perks.subPerk = stats.perkSubStyle;
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

      // Set isSet to true, this defaults to 0 in case as an exception
      dataObject.isSet = true;

      return dataObject;
    }
  }
}

function createChampFile() {
  cGG.get("champion.getAllChampions", {"champData": ["kda", "damage", "minions", "wards", "goldEarned", "hashes"]}).then(data => {
    let dumpObjects = {data: []};
    let matchArray = [];
    // hi rito owo
    for (let temp in data) {
      let champId = data[temp]._id.championId;
      let ezData = data[temp];
      if (!data.hasOwnProperty(temp)) continue;
      if (!matchArray.includes(champId)) {
        matchArray += champId;

        dumpObjects.data[`${champId}`] = {"runes": []};
        dumpObjects.data[`${champId}`];

        dumpObjects.data[`${champId}`].champId = champId
        dumpObjects.data[`${champId}`].winRate = decimalRound(ezData.winRate, 2);
        dumpObjects.data[`${champId}`].kills = decimalRound(ezData.kills, 1);
        dumpObjects.data[`${champId}`].deaths = decimalRound(ezData.deaths, 1);
        dumpObjects.data[`${champId}`].assists = decimalRound(ezData.assists, 1);
        dumpObjects.data[`${champId}`].creepScore = decimalRound(ezData.minionsKilled, 1);
        dumpObjects.data[`${champId}`].wardsPlaced = decimalRound(ezData.wardPlaced, 1);
        dumpObjects.data[`${champId}`].goldEarned = Math.round(ezData.goldEarned);

        let hash = ezData.hashes.runehash.highestCount;
        let runeIds = hash.hash.replace(/-/g, " ").split(" ");

        for (let i = 0; i < runes.length; i++) {
          dumpObjects.data[`${champId}`].runes[i] = runeIds[i];
        }
      } else if (matchArray.includes(champId)) {
        console.log("There was a repeat while writing to the champStats.json file. Don't worry, this isn't an error. I just needed something to put in an else if statement. Hi mom!");
      } else {
        console.log("lol that screwed");
      }
    }
    app.champData = dumpObjects;

  }).then(console.log("Champ stats have been updated. Time: " + Date.now())).catch(err => console.log("There was an error: \n" + err));
}

function getAllScores(userData, proData) {
  let userKDA = getKDA(userData);
  let proKDA = getKDA(proData);

  let dataObject = {}

  dataObject.pinksPlaced = getScore(userData.match.pinksPlaced, proData.match.pinksPlaced);
  dataObject.wardsPlaced = getScore(userData.match.wardsPlaced, proData.match.wardsPlaced);
  dataObject.creepScore = getScore(userData.match.creepScore, proData.match.creepScore);
  dataObject.kda = getScoreByKDA(userKDA, proKDA);
  [dataObject.runes, dataObject.runeMatches] = getScoreByRunes(userData, proData); // POGCHAMP
  dataObject.goldEarned = getScore(userData.match.goldEarned, proData.match.goldEarned);

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

// Magic
function getAverageScore(scores) {
  let total = sum(scores);
  let size = objSize(scores);
  return Math.round(total / size);
}

// Lesser magic
function getScoreByKDA(userKDA, proKDA) {
  return getScore(userKDA * 10, proKDA * 10);
}

// Even lesser magic
function getScoreByRunes(userData, proData) {
  let matches = 0;
  for (let i = 0; i < 6; i++) {
    if (userData.match.perks["perk" + i + "Id"] == proData.match.perks["perk" + i + "Id"]) {
      matches++;
    }
  }
  return [getScore(matches + 1.5, 6), matches];
}


function getKDA(userData) {
  return ((userData.match.kills + userData.match.assists) / userData.match.deaths).toFixed(2);
}

function getMessages(scores) {
  let messageObject = {}

  messageObject.pinksPlaced = messages.pinks[scores.pinksPlaced];
  messageObject.wardsPlaced = messages.wards[scores.wardsPlaced];
  messageObject.kda = messages.kda[scores.kda];
  messageObject.runes = messages.runes[scores.runes];

  return messageObject;
}

// Deprecated
// function getKeystoneName(userData) {
//   let keystoneType = userData.match.perks.mainPerk;
//   let keystoneId = userData.match.perks.perk0Id;
//   for (let i = 0; i < Object.keys(runesReforged).length; i++) {
//     let type = runesReforged[i];
//     if (type.id == keystoneType) {
//       for (let j = 0; j < Object.keys(type.slots).length; j++) {
//         let runes = type.slots[j].runes;
//         for (let k = 0; k < Object.keys(runes).length; k++) {
//           let rune = runes[k];
//           if (rune.id == keystoneId) {
//             return rune.name;
//           }
//         }
//       }
//     }
//   }
// }

function getKeystoneName(userData) {
  let keystoneType = userData.match.perks.mainPerk;
  let keystoneId = userData.match.perks.perk0Id;
  for (let i = 0; i < Object.keys(runesReforged).length; i++) {
    if (runesReforged[i].id == keystoneId) {
      return runesReforged[i].name;
    }
  }
}

function sum(obj) {
  var sum = 0;
  for (var el in obj) {
    if (obj.hasOwnProperty(el)) {
      sum += parseFloat(obj[el]);
    }
  }
  return sum;
}

function objSize(obj) {
  var count = 0;

  for (var prop in obj) {
    if (obj.hasOwnProperty(prop))
      ++count;
  }

  return count;
}

function getRegion(region) {
  region = region.toLowerCase();
  let rgReturn;
  
  switch(region) {
    case "ru":
      rgReturn = "ru";
      break;
    case "kr":
      rgReturn = "kr";
      break;
    case "br":
      rgReturn = "br1";
      break;
    case "oce":
      rgReturn = "oc1";
      break;
    case "jp":
      rgReturn = "jp1";
      break;
    case "na":
      rgReturn = "na1";
      break;
    case "eune":
      rgReturn = "eun1";
      break;
    case "euw":
      rgReturn = "euw1";
      break;
    case "tr":
      rgReturn = "tr1";
      break;
    case "las":
      rgReturn = "la1";
      break;
    case "lan":
      rgReturn = "la2";
      break;
    default:
      rgReturn = "na1";
      break;
  }

  return rgReturn;
}

module.exports = {
  getMatch: getMatch,
  createChampFile: createChampFile,
  getAllScores: getAllScores,
  getAverageScore: getAverageScore,
  getMessages: getMessages,
  getKDA: getKDA,
  getRegion: getRegion,
  getKeystoneName: getKeystoneName,
  getVersion: getVersion,
  init: init
}