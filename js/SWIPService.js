"use strict";
var cardSearchApp = angular.module('cardSearchApp');
cardSearchApp.service('SWIPService', ['CDFService', function(CDFService) {

  var idHeaderIndex = -1;
  var nameHeaderIndex = -1;
  var expansionIndexHeader = -1;
  var pullsHeaderIndex = -1;
  var isPulledHeaderIndex = -1;
  var counterpartHeaderIndex = -1;
  var comboHeaderIndex = -1;
  var matchingHeaderIndex = -1;
  var matchingWeaponHeaderIndex = -1;
  var isCanceledByHeaderIndex = -1;
  var cancelsHeaderIndex = -1;
  var abreviationHeaderIndex = -1;
  var uniquenessHeaderIndex = -1;

  function getDataAtIndex(splitData, index) {
    if (index !== -1 && splitData[index]) {
      return splitData[index];
    }
    return "";
  }

  function getId(splitData) {
    return parseInt(getDataAtIndex(splitData, idHeaderIndex));
  }
  function getExpansion(splitData) {
    var setName = getDataAtIndex(splitData, expansionIndexHeader);

    // CDF's list the set as "Virtual Set X"
    // SWIP lists the set as "Virtual Card Set #X"
    //
    // Transform SWIP data to match :)
    setName = setName.replace("Enhanced Premiere Pack", "Enhanced Premiere");
    setName = setName.replace("Virtual Card Set #", "Virtual Set ");
    setName = setName.replace("Empire Strikes Back 2 Player", "Empire Strikes Back Introductory Two Player Game");
    setName = setName.replace("Virtual Defensive Shields", "Virtual Set 0");
    setName = setName.replace("Demonstration Deck Premium Card Set", "Demo Deck");
    setName = setName.replace("Premiere 2 Player", "Premiere Introductory Two Player Game");
    return setName;
  }

  function getUniqueness(splitData) {
    return getDataAtIndex(splitData, uniquenessHeaderIndex);
  }
  function getCardName(splitData) {
    return getDataAtIndex(splitData, nameHeaderIndex);
  }
  function getPulls(splitData) {
    return getDataAtIndex(splitData, pullsHeaderIndex);
  }
  function getPulledBy(splitData) {
    return getDataAtIndex(splitData, isPulledHeaderIndex);
  }
  function getCounterpart(splitData) {
    return getDataAtIndex(splitData, counterpartHeaderIndex);
  }
  function getCombo(splitData) {
    return getDataAtIndex(splitData, comboHeaderIndex);
  }
  function getMatching(splitData) {
    return getDataAtIndex(splitData, matchingHeaderIndex);
  }
  function getMatchingWeapon(splitData) {
    return getDataAtIndex(splitData, matchingWeaponHeaderIndex);
  }
  function getCanceledBy(splitData) {
    return getDataAtIndex(splitData, isCanceledByHeaderIndex);
  }
  function getCancels(splitData) {
    return getDataAtIndex(splitData, cancelsHeaderIndex);
  }
  function getAbbreviations(splitData) {
    return getDataAtIndex(splitData, abreviationHeaderIndex);
  }


  function getCardWithName(name, expansion, existingCards) {
    var simpleName = CDFService.getSimpleName(name);
    for (var i = 0; i < existingCards.length; i++) {
      var existingCard = existingCards[i];
      if ((existingCard.titleLowerNoSet === simpleName)) {

        // Looks like we have a match!  Let's make extra sure though...
        if (existingCard.set.toLowerCase().trim() === expansion.toLowerCase().trim()) {
          return existingCard;
        }

      }

    }
    return null;
  }


  function processHeaders(firstLine) {
    var headers = firstLine.split('|');
    idHeaderIndex = headers.indexOf('id');
    nameHeaderIndex = headers.indexOf('CardName');
    expansionIndexHeader = headers.indexOf('Expansion');
    pullsHeaderIndex = headers.indexOf('Pulls');
    isPulledHeaderIndex = headers.indexOf('IsPulled');
    counterpartHeaderIndex = headers.indexOf('Counterpart');
    comboHeaderIndex = headers.indexOf('Combo');
    matchingHeaderIndex = headers.indexOf('Matching');
    matchingWeaponHeaderIndex = headers.indexOf('MatchingWeapon');
    cancelsHeaderIndex = headers.indexOf('Cancels');
    isCanceledByHeaderIndex = headers.indexOf('IsCanceledBy');
    abreviationHeaderIndex = headers.indexOf('Abbreviation');
    uniquenessHeaderIndex = headers.indexOf("Uniqueness");
  }

  function addSwipDataFromSwipDump(data, existingCards) {
    var cards = [];

    // By lines
    var lines = data.split('\n');

    // Get the Headers first
    var firstLine = lines[0];
    processHeaders(firstLine);

    // Process each data line
    for(var line = 1; line < lines.length; line++){
      var cardLine = lines[line];
      cardLine = fixNewlines(cardLine);

      var cardDataFields = cardLine.split('|');
      var cardName = getCardName(cardDataFields);
      if (!cardName) {
        continue;
      }
      var cardWithoutSetInfo = CDFService.removeSetFromTitle(cardName);
      var cardExpansion = getExpansion(cardDataFields);

      var existingCard = getCardWithName(cardWithoutSetInfo, cardExpansion, existingCards);
      if (existingCard) {
        // Add the extra data from SWIP!!
        existingCard.id = getId(cardDataFields);
        existingCard.pulls = getPulls(cardDataFields);
        existingCard.pulledBy = getPulledBy(cardDataFields);
        existingCard.counterpart = getCounterpart(cardDataFields);
        existingCard.combo = getCombo(cardDataFields);
        existingCard.matching = getMatching(cardDataFields);
        existingCard.matchingWeapon = getMatchingWeapon(cardDataFields);
        existingCard.canceledBy = getCanceledBy(cardDataFields);
        existingCard.cancels = getCancels(cardDataFields);
        existingCard.abbreviation = getAbbreviations(cardDataFields);
        existingCard.uniqueness = getUniqueness(cardDataFields);
      } else {
        console.log("Failed to find card: " + cardWithoutSetInfo + " cardExpansion: " + cardExpansion);
      }

    }

    return cards;
  }
  this.addSwipDataFromSwipDump = addSwipDataFromSwipDump;

  function fixNewlines(line) {
    while (line.indexOf("\\par") !== -1) {
      line = line.replace("\\par", "<br>");
    }

    while (line.indexOf("\\b0") !== -1) {
      line = line.replace("\\b0", "<br>");
    }

    while (line.indexOf("\\b") !== -1) {
      line = line.replace("\\b", "<br>");
    }
    line = line.trim();
    return line;
  }

}]);
