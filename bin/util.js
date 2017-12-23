const config = require("./configuration.js")
const TeemoJS = require("teemojs")
const api = new TeemoJS(config.key)
const cGG = new TeemoJS(config.cGGKey, TeemoJS.championGGConfig)
const fs = require("fs")
// Default region
let region = "NA1"

/*
 * For now, we're only getting one match.
 * This will be converted to getMatchlist in the future.
 */

function decimalRound(number, precision){
  let factor = Math.pow(10, precision);
  let tempNumber = number * factor;
  let roundedTempNumber = Math.round(tempNumber);
  return roundedTempNumber / factor;
}

async function getMatch(summonerName) {
  let dataObject = {
    "summonerInfo": {},
    "match": {
      "perks": {}
    },
  }
  let summonerInfo = await api.get(region, "summoner.getBySummonerName", summonerName);
  let matchlist = await api.get(region, "match.getMatchlist", summonerInfo.accountId, { beginIndex: 0, endIndex: 20 });

  let queue5v5;
  for(let i = 0; i < 20; i++) {
    if(matchlist.matches[i].queue >= 400 && matchlist.matches[i].queue <= 440) {
      queue5v5 = i;
      break;
    }
    if (matchlist.matches[19].queue !== queue5v5) return;
  }

  let match = await api.get(region, "match.getMatch", matchlist.matches[queue5v5].gameId);
  let arrIndex;
  let stats;
  for(let i = 0; i < match.participantIdentities.length; i++) {
    if(summonerInfo.accountId === match.participantIdentities[i].player.accountId) {
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

      return dataObject;
    }
  }
}

function createChampFile() {
  cGG.get("champion.getAllChampions", {"champData": ["kda", "damage", "minions", "wards", "goldEarned"]}).then(data => {
    let dumpObjects = []
    let matchArray = []

    for(let temp in data) {
      let champId = data[temp]._id.championId
      let ezData = data[temp]
      if(!data.hasOwnProperty(temp)) continue
      if(!matchArray.includes(champId)) {
        matchArray += champId

        dumpObjects[`${champId}`] = {}

        dumpObjects[`${champId}`].champId = champId
        dumpObjects[`${champId}`].winRate = decimalRound(ezData.winRate, 2)
        dumpObjects[`${champId}`].kills = decimalRound(ezData.kills, 1)
        dumpObjects[`${champId}`].deaths = decimalRound(ezData.deaths, 1)
        dumpObjects[`${champId}`].assists = decimalRound(ezData.assists, 1)
        dumpObjects[`${champId}`].creepScore = decimalRound(ezData.minionsKilled, 1)
        dumpObjects[`${champId}`].wardsPlaced = decimalRound(ezData.wardPlaced, 1)
        dumpObjects[`${champId}`].goldEarned = Math.round(ezData.goldEarned)
      } else if(matchArray.includes(champId)) {
        console.log("there was a repeat")
      } else {
        console.log("lol that screwed")

      }
    }
    console.log(dumpObjects)
  })
}


module.exports = {
  getMatch: getMatch,
}