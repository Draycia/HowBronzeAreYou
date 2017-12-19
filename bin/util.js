const config = require("./configuration.js")
const TeemoJS = require("teemojs")
const api = new TeemoJS(config.key)

/*
 * For now, we're only getting one match.
 * This will be converted to getMatchlist in the future.
 */

async function getMatch(summonerName, region) {
  let dataObject = {
    "summonerInfo": {},
    "match": {
      "perks": {}
    },
  }
  let summonerInfo = await api.get(region, "summoner.getBySummonerName", summonerName);
  let matchlist = await api.get(region, "match.getMatchlist", summonerInfo.accountId, { beginIndex: 0, endIndex: 20 });
  let match = await api.get(region, "match.getMatch", matchlist.matches[0].gameId);
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

module.exports = {
  getMatch: getMatch
}