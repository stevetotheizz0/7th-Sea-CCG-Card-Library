"use strict";
var cardSearchApp = angular.module('cardSearchApp');
cardSearchApp.service('CDFService', [function() {

  var CARD_TYPE_SEARCH_STRING = {
    ACTION: "Action",
    ADVENTURE: "Adventure",
    ATTACHMENT: "Attachment",
    CAPTAIN: "Captain",
    CHANTEY: "Chantey",
    CREW: "Crew",
    SHIP: "Ship",
  };

  this.getTypeSearchStringFromType = function(cardTypeEnum) {
    console.log("getTypeSearchStringFromType", cardTypeEnum);
    if (CARD_TYPE_SEARCH_STRING[cardTypeEnum]) {
      return CARD_TYPE_SEARCH_STRING[cardTypeEnum];
    }
    return "";
  };


  function cardsFromCdfData(data) {
    var cards = [];

    // By lines
    var lines = data.split('\n');
    for(var line = 0; line < lines.length; line++){
      var lineInfo = lines[line];

      if (0 === lineInfo.indexOf("card")) {
        //console.log("Detected Card: " + lineInfo);

        // Get the card name from the line
        var card = cardFromLine(lineInfo);
        // ##TODO Add MRP filter here
        cards.push(card);
      }
    }

    return cards;
  }
  this.cardsFromCdfData = cardsFromCdfData;

  function fixSlashes(str) {
    return str;
  }

  function cardFromLine(cardLine) {

    if (cardLine.indexOf("card") !== 0) {
      return null;
    }

    var card = {
      Name: "",
      Type: "",
      Rarity: "",
      Set: "",
      Faction: "",
      Affiliation: "",
      Cost: "",
      Cannon: "",
      Sail: "",
      Adventure: "",
      Influence: "",
      Swashbuckling: "",
      BoardingAttack: "",
      Trait: "",
      Text: "",
      FlavorText: "",
      Artist: "",
      Errata: "",
      MRP: "",
      ChangesOnMRP: "",
      Picture: ""
    };


    // Full Line:
    // card "/starwars/DeathStarII-Dark/t_accuser" "Accuser (1)\nDark Starship - Capital: Imperial-Class Star Destroyer [R]\nSet: Death Star II\nPower: 7 Armor: 5 Hyperspeed: 4\nDeploy: 8 Forfeit: 9\nIcons: Pilot, Nav Computer, Scomp Link\n\nLore: Modified for optimal crisis response time. Veteran crew experienced at monitoring shipping lanes and Imperial port traffic.\n\nText: May deploy -3 as a 'react'. May add 6 pilots, 8 passengers, 2 vehicles and 4 TIEs. Has ship-docking capability. Permanent pilot provides ability of 1."
    var iFirstSpace = cardLine.indexOf(" ");
    var iSecondSpace = cardLine.indexOf(" ", iFirstSpace + 1);
    var cardData = cardLine.substring(iSecondSpace + 2).trim();

    //console.log(cardLine);

    cardData = cardData.replace(/[^\x00-\x80]/g, "\u2022"); // //jshint ignore:line

    // Split the card into it's fields
    var cardFields = cardData.split("\\n");
    for (var j = 0; j < cardFields.length; j++) {
      if (j === 0) {
        processTitleLine(cardFields[j].trim(), card);
      } else {
        processLabeledLine(cardFields[j].trim(), card);
      }
    }

    return card;
  }

  function getSimpleName(cardName) {
    var titleSortable = cardName.replace("•", "");
    titleSortable = titleSortable.replace("•", "");
    titleSortable = titleSortable.replace("•", "");
    titleSortable = titleSortable.replace("•", "");

    titleSortable = titleSortable.replace("<>", "");
    titleSortable = titleSortable.replace("<>", "");
    titleSortable = titleSortable.replace("<>", "");

    titleSortable = titleSortable.toLowerCase();
    titleSortable = titleSortable.replace("é", "e");

    titleSortable = titleSortable.replace("ï¿½", "e");

    titleSortable = titleSortable.replace(/\'/g, "");
    titleSortable = titleSortable.replace(/\"/g, "");

    return titleSortable;
  }
  this.getSimpleName = getSimpleName;

  function processTitleLine(line, card) {
    card.title = line.trim();
    card.titleSortable = getSimpleName(card.title);
  }

  function processLabeledLine(line, card){

    // Handle the full special lines first!
    if (line.indexOf("Name:") === 0) {
      card.FlavorText += line.substring(6).trim();
      return;
    } else if (line.indexOf("Type:") === 0) {
      card.Type += line.substring(6).trim();
      return;
    } else if (line.indexOf("Rarity:") === 0) {
      card.Rarity += line.substring(8).trim();
      return;
    } else if (line.indexOf("Set:") === 0) {
      card.Set += line.substring(5).trim();
      return;
    } else if (line.indexOf("Faction:") === 0) {
      card.Faction = line.substring(9).trim();
      return;
    } else if (line.indexOf("Affiliation:") === 0) {
      card.Affiliation = line.substring(13).trim();
      return;
    } else if (line.indexOf("Cost:") === 0) {
      card.Cost = line.substring(6).trim();
      return;
    } else if (line.indexOf("BoardingAttack:") === 0) {
      card.BoardingAttack = line.substring(16).trim();
      return;
    } else if (line.indexOf("Trait:") === 0) {
      card.Trait = line.substring(7).trim();
      return;
    } else if (line.indexOf("Text:") === 0) {
      card.Text = line.substring(6).trim();
      return;
    } else if (line.indexOf("FlavorText:") === 0) {
      card.FlavorText = line.substring(12).trim();
      return;
    } else if (line.indexOf("Artist:") === 0) {
      card.Artist = line.substring(8).trim();
      return;
    } else if (line.indexOf("Errata:") === 0) {
      card.Errata= line.substring(8).trim();
      return;
    } else if (line.indexOf("MRP:") === 0) {
      card.MRP = line.substring(5).trim();
      return;
    } else if (line.indexOf("ChangesOnMRP:") === 0) {
      card.ChangesOnMRP = line.substring(14).trim();
      return;
    } else if (line.indexOf("Picture:") === 0) {
      card.Picture = line.substring(9).trim();
      return;
    } 


    var isPowerLine = (-1 !== line.indexOf("ower:"));

    var splitLine = line.trim().split(" ");
    var lastFieldNameLower = "";
    for (var i = 0; i < splitLine.length; i++) {

      // Store the 'data' value
      var data = splitLine[i].trim();

      // Fields are labeled, so every other data chunk is a value and it's previous value was the label
      if (i % 2 !== 0) {
        if (lastFieldNameLower === "Cannon:") {
          card.Cannon = data;
        } else if (lastFieldNameLower === "Sail:") {
          card.Sail = data;
        } else if (lastFieldNameLower === "Adventure:") {
          card.Adventure = data;
        } else if (lastFieldNameLower === "Influence:") {
          card.Influence = data;
        } else if (lastFieldNameLower === "Swashbuckling:") {
          card.Swashbuckling = data;
        } 


      } else{
        lastFieldNameLower = data.toLowerCase().trim();

        if (isPowerLine &&  (-1 === lastFieldNameLower.indexOf(":"))) {
          // We are on the power line, and just encountered non-labeled text.
          // This (and the rest of the line) must be things like "Force-Sensitive" or "Jedi Knight", "Assassin Droid", etc
          for (var j = i; j < splitLine.length; j++) {
            card.extraText += " " + splitLine[j];
            card.extraText = card.extraText.trim();
          }

        }

      }
    }
  }

  /**
   * Builds a mapping of:
   * {
   *   'type"; ["interrupt", "effect", "character"],
   *   'subType"; ["used interrupt", "utinni effect", "rebel', 'alient'],
   *   'characteristics': [ 'Black Sun Agent', 'ISB Agent', ...],
   *   'side': [ 'light', 'dark']
   *   'set': ['Tatooine', 'Death Star II', etc]
   *   ...
   * }
   */
  function getCardValueMap(cards) {
    console.log("getCardValueMap: ", cards);

    var fieldValueMap = {};

    // Add every field we know about based on the card DB
    cards.forEach(function(card) {
      for (var field in card) { //jshint ignore:line
        fieldValueMap[field] = null;
      }
    });
    console.log("fieldValueMap: ", fieldValueMap);
    
    // Add auto-complete to specific fields
    fieldValueMap.Type = getValuesForFieldName('Type', cards);
    fieldValueMap.Set = getValuesForFieldName('Set', cards);
    fieldValueMap.Rarity = getValuesForFieldName('Rarity', cards);
    fieldValueMap.Cost = getValuesForFieldName('Cost', cards);
    fieldValueMap.Faction = getValuesForFieldName('Faction', cards);
    fieldValueMap.Artist = getValuesForFieldName('Artist', cards);
    
    console.log("fieldValueMap updated: ", fieldValueMap);
    // Remove fields that we don't want to show to the user
    delete fieldValueMap.links;
    delete fieldValueMap.links_large;
    delete fieldValueMap.titleSortable;
    // delete fieldValueMap.id;
    delete fieldValueMap.Picture;
    console.log("fieldValueMap from CDF: ", fieldValueMap);
    return fieldValueMap;
  }
  this.getCardValueMap = getCardValueMap;


  function getValuesForFieldName(fieldName, cards) {

    // Keep a hash for quick access
    /*
    var possibleValues = {
      'Black Sun Agent': true,
      'ISB Agent': true
    };
    */
    var possibleValues = {};

    // Get possibilities for each card
    for (var i = 0; i < cards.length; i++) {
      var card  = cards[i];

      var values = [];

      if (card[fieldName] && Array.isArray(card[fieldName])) {
        values = values.concat(card[fieldName]);
      } else if (card[fieldName] && typeof card[fieldName] === 'string') {
        values.push(card[fieldName]);
      }

      for (var j = 0; j < values.length; j++) {
        if (!values[j]) {
          var p = 0;
        }
        var value = values[j].toLowerCase();
        possibleValues[value] = true;
      }
    }

    // Now, consolidate all of those values into an array
    var possibleValueArray = [];
    for (var val in possibleValues) { //jshint ignore:line
      possibleValueArray.push(val);
    }
    return possibleValueArray;
  }
  this.getValuesForFieldName = getValuesForFieldName;
}]);
