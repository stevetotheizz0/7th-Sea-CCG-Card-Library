'use strict';
var cardSearchApp = angular.module('cardSearchApp');
cardSearchApp.controller('CardSearchController', ['$scope', '$document', '$http', '$timeout', '$window', '$location', 'CDFService', 'SWIPService',  function($scope, $document, $http, $timeout, $window, $location, CDFService, SWIPService) {

  var LOCAL_STORAGE_DATA_KEY = "scomp_data";

  var filterAddMode = {
    AND: "AND",
    OR: "OR",
    NOT: "NOT"
  };
  // Convert 'number' fields into strings  (power, etc)
  var numberFields = [
    "Cannon",
    "Sail",
    "Adventure",
    "Influence",
    "Swashbuckling"
  ];

  // This is the data that is currently being downloaded
  // We stage that data here first and then swap
  $scope.downloadedData = {
    cardList: [],
    sets: [],
    loading7thSea: true,
    loadingSets: true,
    cardValueMap: null,
    cardFields: []
  };

  $scope.data = {
    matches: [],
    cardList: [], // From 7thSea.json
    sets: [], // From sets.json
    loading7thSea: true,
    loadingSets: true,
    performedSearch: false,
    noResultsFound: false,
    selectedCard: null,
    lastSelectedCard: null,
    showAdvancedSearch: false,
    imageLoadFailure: false,
    textOnly: false,
    mrp: false,
    showExtraData: true,
    cardValueMap: null,
    cardFields: [],
    advancedFieldSelect: {},
    advancedField: 'gametext',
    advancedOperator: 'contains',
    advancedValue: "",
    advancedConditions: [],
    operators: [
      { name: 'contains'},
      { name: "doesn't contain"},
      { name: '>' },
      { name: '<' },
      { name: '=' },
      { name: '<=' },
      { name: '>=' },
      { name: 'not'}
    ],
    filterAddMode: filterAddMode.AND
  };

  function getCurrentSelectedCardIndex() {
    if ($scope.data.lastSelectedCard !== null) {
      for (var i = 0; i < $scope.data.matches.length; i++) {
        var card = $scope.data.matches[i];
        if (card === $scope.data.lastSelectedCard) {
          return i;
        }
      }
    }
    return -1;
  }
  function moveDown() {
    var selectedCardIndex = getCurrentSelectedCardIndex();
    if (selectedCardIndex !== -1) {
      selectCardAtIndex(selectedCardIndex+1);
    }
  }
  function moveUp() {
    var selectedCardIndex = getCurrentSelectedCardIndex();
    if (selectedCardIndex !== -1) {
      selectCardAtIndex(selectedCardIndex-1);
    }
  }
  function selectCardAtIndex(index) {
    var indexToSelect = index;
    if (index < 0) {
      indexToSelect = 0;
    } else if (index >= $scope.data.matches.length) {
      indexToSelect = $scope.data.matches.length - 1;
    }
    $scope.selectCard($scope.data.matches[indexToSelect]);
    $scope.$apply();
  }

  $scope.selectCard = function(card, $event) {
    $scope.data.lastSelectedCard = card;
    $scope.data.selectedCard = card;
    $scope.data.imageLoadFailure = false;

    if ($event) {
      $event.stopPropagation();
    }
  };

  $scope.clickedCardData = function($event) {
    $event.stopPropagation();
  };


  function registerKeyEvents() {
    jQuery($document).keydown(function(event) {
      if (event.which === 38) {
        moveUp();
        event.preventDefault();
        event.stopPropagation();
      } else if (event.which === 40) {
        moveDown();
        event.preventDefault();
        event.stopPropagation();
      }
    });
  }


  // Transform the set of advanced filters into a nice string
  function conditionToString(condition) {
    var conditionString = "";
    if (condition.group) {
      for (var i = 0; i < condition.group.rules.length; i++) {
        var rule = condition.group.rules[i];
        if (conditionString !== "") {
          conditionString += " OR " + conditionToString(rule);
        } else {
          conditionString += rule.field + " " + rule.condition + " " + rule.data;
        }
      }
    }
    if (condition.isExcludeCondition) {
      conditionString = "NOT (" + conditionString + ")";
    }
    return conditionString;
  }
  $scope.conditionToString = conditionToString;

  $scope.selectCondition = function(condition) {
    console.log("select condition");
    for (var i = 0; i < $scope.data.advancedConditions.length; i++) {
      var cond = $scope.data.advancedConditions[i];
      cond.selected = false;
    }
    condition.selected = true;
  };

  $scope.updateAdvancedSearchText = function($event, $select) {
    $scope.data.advancedValue = $select.search;
    
    if ($event.keyCode === 13) {
      $scope.addAdvancedCondition($select);
      $select.search = "";
    }
  };
  
  
  $scope.addAdvancedCondition = function($select) {
    var textSearch = $scope.data.advancedValue;
    var operator = $scope.data.advancedOperator;
    var fieldName = $scope.data.advancedField;
    var condition = buildRule(fieldName, textSearch, operator);
    var mrp = $scope.data.mrp

    // If no search text, don't do anything
    if (!textSearch || textSearch.trim() === "") {
      return;
    }

    var addToEnd = true;
    if ($scope.data.filterAddMode === filterAddMode.OR) {
      // Append this to the last condition (if one exists). Otherwise
      // just add it to the end
      var conditionCount = $scope.data.advancedConditions.length;
      if (conditionCount > 0) {
        var lastCondition = $scope.data.advancedConditions[conditionCount - 1];
        lastCondition.group.rules.push(condition);
        addToEnd = false;
      }
    } else if ($scope.data.filterAddMode === filterAddMode.NOT) {
      condition.isExcludeCondition = true;
    }

    if (addToEnd) {
      $scope.data.advancedConditions.push(condition);
    }

    $scope.data.advancedValue = "";
    console.log("$select: ", $select);
    $select.search = "";

    doSearch();
  };

  $scope.removeCondition = function() {
    for (var i = 0; i < $scope.data.advancedConditions.length; i++) {
      var condition = $scope.data.advancedConditions[i];
      if (condition.selected) {
        $scope.data.advancedConditions.splice(i, 1);
        break;
      }
    }
    doSearch();
  };

  $scope.clearFilter = function() {
    console.log("clear filter");
    $scope.data.advancedConditions = [];
    $scope.data.advancedField = "Text";
    $scope.data.advancedOperator = "contains";
    doSearch();
  };



  function buildRule(fieldName, text, operator) {
    var condition = {
      group: {
        operator: 'OR',
        rules: [
          {
            condition: operator,
            field: fieldName,
            data: text
          }
        ]
      }
    };
    return condition;

  }


  /**
   * This is the basic structure of filters. They can be
   * either a 'group' (in which case it has sub-rules) or a 'condition'
   * in which case it matches a given field with given data
   *
  $scope.filter = {
    group: {
      operator: 'AND',
      rules: [
        {
          condition: 'contains',
          field: 'gametext',
          data: ''
        },
        {
          condition: 'contains',
          field: 'gametext',
          data: ''
        }
      ]
    }
  };
  */


  $scope.search = {
    type: "ALL",
    searchField: "NAME",
    text: ""
  };

  $scope.done = function() {
    alert("done!");
  };

  $scope.advancedSearchBuilder = function() {
    $scope.data.showAdvancedSearch = true;
  };



  /**
   * Build up a list of all requirements from the left-hand pane
   * Store them as an array of requirements in the filter-format
   */
  function getBasicAndSearches() {

    var andSearches = [];
    var searchText = $scope.search.text.toLowerCase().trim();
    console.log("searchText: ", searchText, "$scope.search:", $scope.search); 
    
    // Specific Search Fields
    if (searchText !== "" && $scope.search.searchField === "ALL") {
      andSearches.push({
        group: {
          operator: 'OR',
          rules: [
            {
              condition: 'contains',
              field: 'Text',
              data: searchText
            },
            {
              condition: 'contains',
              field: 'FlavorText',
              data: searchText
            },
            {
              condition: 'contains',
              field: 'Name',
              data: searchText
            },
            
          ]
        }
      });
    }
    console.log("searchText: ", searchText, "$scope.search:", $scope.search); 
    if (searchText !== "" && $scope.search.searchField === "TEXT") {
      andSearches.push({
        condition: 'contains',
        field: 'Text',
        data: searchText
      });
    }
    console.log("searchText: ", searchText, "$scope.search:", $scope.search); 
    if (searchText !== "" && $scope.search.searchField === "FLAVORTEXT") {
      andSearches.push({
        condition: 'contains',
        field: 'FlavorText',
        data: searchText
      });
    }
    console.log("searchText: ", searchText, "$scope.search:", $scope.search); 
    if (searchText !== "" && $scope.search.searchField === "TRAIT") {
      andSearches.push({
        condition: 'contains',
        field: 'Trait',
        data: searchText
      });
    }
    console.log("searchText: ", searchText, "$scope.search:", $scope.search); 
    if (searchText !== "" && $scope.search.searchField === "NAME") {
      andSearches.push({
        condition: 'contains',
        field: 'Name',
        data: searchText
      });
    }
    console.log("searchText: ", searchText, "$scope.search:", $scope.search); 
    if ($scope.search.type !== "ALL") {
      var requiredType = CDFService.getTypeSearchStringFromType($scope.search.type);
      andSearches.push({
        condition: 'contains',
        field: 'Type',
        data: requiredType
      });
    }
    console.log("searchText: ", searchText, "$scope.search:", $scope.search); 
    if ($scope.data.mrp) {
      andSearches.push({
        condition: '=',
        field: 'MRP',
        data: "MRP"
      });
    }
    console.log("searchText: ", searchText, "$scope.search:", $scope.search); 
    console.log("andSearches:", andSearches);

    return andSearches;
  }


  /*
   * Build the search parameters based on the left-hand panel
   * and optionally advanced settings!
   */
  function buildCumulativeSearch() {

    var basicSearches = getBasicAndSearches();
    console.log("basic searches: ", basicSearches)
    var cumulativeSearch = {
      group: {
        operator: "AND",
        rules: basicSearches
      }
    };
    console.log( "$scope.data.advancedConditions: ", $scope.data.advancedConditions);
    for (var i = 0; i < $scope.data.advancedConditions.length; i++) {
      var condition = $scope.data.advancedConditions[i];
      console.log("condition: ", condition);
      if (!condition.isExcludeCondition) {
        cumulativeSearch.group.rules.push(condition);
      }
    }

    // If no search criteria, just return an empty search
    if (basicSearches.length < 1 && $scope.data.advancedConditions.length < 1) {
      return null;
    }

    return cumulativeSearch;
  }

  /*
   * Build a query which shows which cards to NOT include
   */
  function buildSearchToExclude() {
    var excludeSearch = {
      group: {
        operator: "OR",
        rules: []
      }
    };

    for (var i = 0; i < $scope.data.advancedConditions.length; i++) {
      var condition = $scope.data.advancedConditions[i];
      if (condition.isExcludeCondition) {
        excludeSearch.group.rules.push(condition);
      }
    }

    return excludeSearch;
  }

  $scope.swallowClick = function($event) {
    $event.stopPropagation();
  };

  $scope.cancelAdvanced = function() {
    $scope.data.showAdvancedSearch = false;
  };

  $scope.hideCardData = function() {
    $scope.data.selectedCard = null;
  };

  $scope.toggleExtraData = function() {
    $scope.data.showExtraData = !$scope.data.showExtraData;
  };

  // Load cached data if available!
  loadCachedData();

  function reloadCards() {

    $scope.downloadedData.cardList = [];

    $http.get('7thSea.json').success(function(data) {
      console.log(data);
      addCardsFromJson(data);
      $scope.downloadedData.loading7thSea = false;
  
      massageData();
    }).error(function(err) {
      console.error("Data load failure. Defaulting to text-only");
      $scope.data.textOnly = true;
    });
    console.log("cards reloaded");

  };



  $http.get('sets.json').success(function(setsData) {
    $scope.downloadedData.sets = setsData;
    $scope.downloadedData.loadingSets = false;

    massageData();
  }).error(function(err) {
    console.error("Data load failure. Defaulting to text-only");
    $scope.data.textOnly = true;
  });


  /**
   * Massage the data so that it can be searched and utilized easier
   */
  function massageData() {
    flattenCardData($scope.downloadedData);
    loadSearchData($scope.downloadedData);

    // For small screens (probably mobile), hide the extra data by default
    // var w = angular.element($window);
    // if (w.width() < 800) {
    //   $scope.data.showExtraData = false;
    // }

    // Once we have all of the real data loaded. Move it into the active data!
    if (!$scope.downloadedData.loading7thSea &&
        !$scope.downloadedData.loadingSets)
    {
      swapActiveDataWithLoadedData($scope.downloadedData);
      doSearch();
    }
  }

  function swapActiveDataWithLoadedData(downloadedData) {
    console.log("downloadedData, cardValueMap: ", downloadedData.cardValueMap)
    $scope.data.cardList = downloadedData.cardList;
    $scope.data.sets = downloadedData.sets;
    $scope.data.loading7thSea = downloadedData.loading7thSea;
    $scope.data.loadingSets = downloadedData.loadingSets;
    $scope.data.cardValueMap = downloadedData.cardValueMap;
    $scope.data.cardFields = downloadedData.cardFields;

    try {
      // Store the loaded data into LocalStorage for fast loading later
      // Note: This is approaching 3.8 MB. If we exceed 5MB, this will start failing
      localStorage.setItem(LOCAL_STORAGE_DATA_KEY, JSON.stringify($scope.data));
    }
    catch(ex) {
      console.error("Error saving data into LocalStorage. Cache will not be availalbe");
    }
    
  }

  function loadCachedData() {
    try {
      var cachedDataString = localStorage.getItem(LOCAL_STORAGE_DATA_KEY);
      if (cachedDataString) {
        var cachedData = JSON.parse(cachedDataString);
        console.log("loadCachedData: ", cachedData);

        $scope.data.cardList = cachedData.cardList;
        $scope.data.sets = cachedData.sets;
        $scope.data.loading7thSea = cachedData.loading7thSea;
        $scope.data.loadingSets = cachedData.loadingSets;
        $scope.data.cardValueMap = cachedData.cardValueMap;
        $scope.data.cardFields = cachedData.cardFields;
      }
    }
    catch(ex) {
      console.error("Error loading data from LocalStorage.");
    }
  }

  /**
   * We want the card data in a flat data structure so we can
   * search it really easily
   */
  function flattenCardData(data) {
    console.log(data);

    // var setNameMapping = {};
    // data.sets.forEach(function(set) {
    //   setNameMapping[set.id] = set.Name;
    // });

    for (var i = 0; i < data.cardList.length; i++) {
      var card = data.cardList[i];
      card.titleSortable = CDFService.getSimpleName(card.Name) + card.Set;
      
      card.links = [card.Picture];
      card.links_large = card.links;
      if (card.links_large.length > 0) {
        card.links_large[0] = card.links_large[0].replace("?raw=true", "");
      }
      if (card.links_large.length > 1) {
        card.links_large[1] = card.links_large[1].replace("?raw=true", "");
      }

      convertNumberDataFromStrings(card);

    }

    console.log("Added titles for card count: " + $scope.data.cardList.length);
  }

  function sortIgnoreCase(a, b) {
    if (a.toLowerCase() < b.toLowerCase()) return -1;
    if (a.toLowerCase() > b.toLowerCase()) return 1;
    return 0;
  }

  /*
   * In the DB, many of our fields are stored as strings (power, etc)
   * due to needing to support '*' and multi-value cards. For Scomp link, just
   * convert these string values into numbers, which works for all of our purposes
   */
  function convertNumberDataFromStrings(cardFrontOrBack){
    if (cardFrontOrBack) {
      numberFields.forEach((fieldName) => {
        if (cardFrontOrBack[fieldName]) {
          var value = parseFloat(cardFrontOrBack[fieldName]);
          if (value) {
            cardFrontOrBack[fieldName] = value;
          }
        }
      });
    }
  }

  function addCardsFromJson(cardData) {
    console.log("addCardsFromJson(cardData): ", cardData);
    var cards = cardData;
    console.log(cards, "card length: ", cards.length);
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      $scope.downloadedData.cardList.push(card);
    }
    // console.log($scope.downloadedData.cardList);
  }

  /**
   * Build a list of all of the card fields
   */
  function loadSearchData(data) {
    data.cardValueMap = CDFService.getCardValueMap(data.cardList);
    data.cardFields = [];
    for (var fieldName in data.cardValueMap) { //jshint ignore:line
      data.cardFields.push(fieldName);
    }
  }

  function getSimpleName(cardName) {
    var titleSortable = titleSortable.toLowerCase();
    titleSortable = titleSortable.replace("é", "e");
    return titleSortable;
  }

  $scope.searchIfNotEmpty = function() {
    console.log("search if not empty");
    if ($scope.search.text.trim() !== "") {
      $scope.doSearch();
    }
  };


  /**
   * Compare the given field, returning true on match and false otherwise
   */
  function compareFields(card, fieldName, compareType, value) {
    return compareFieldsToCardSide(card, fieldName, compareType, value) ;
  }

  function compareFieldsToCardSide(card, fieldName, compareType, value) {
    if (!card || typeof card[fieldName] === 'undefined' || card[fieldName] === null) {
      return false;
    }

    /*
    { name: '=' },
    { name: '<' },
    { name: '<=' },
    { name: '>' },
    { name: '>=' },
    { name: 'contains'},
    { name: 'not'},
    { name: "doesn't contain"}
    */

    var valueToCompare = value;
    var cardFields = [];

    // If the card data is of type number, then compare using numbers
    // If the card data is of type string, then do string compares
    if (typeof card[fieldName] === 'string')
    {
      cardFields.push(card[fieldName].toLowerCase());
      valueToCompare = value.toLowerCase();
    }
    else if (typeof card[fieldName] === 'number')
    {
      cardFields.push(parseFloat(card[fieldName]));
      valueToCompare = parseFloat(value);
    }
    else if (Array.isArray(card[fieldName]))
    {
      // Add all string values from the array
      card[fieldName].forEach(function(txt) {
        cardFields.push(txt.toLowerCase());
      });
      valueToCompare = value.toLowerCase();
    }
    else 
    {
      cardFields.push(card[fieldName]);
      valueToCompare = value;
    }

    // For "contains", treat them all as strings
    if ((compareType === "contains") || (compareType === "doesn't contain"))
    {
      cardFields.push(("" + card[fieldName]).toLowerCase());
      valueToCompare = value.toLowerCase();
    }

    // Some fields like 'icons' have multiple fields, so loop over each possibility
    var doesCardMatch = false;
    
    if (compareType != "doesn't contain") {
      var anyMatches = false;
      cardFields.forEach(function(cardField) {
        anyMatches = anyMatches || compareField(compareType, cardField, valueToCompare);
      });
      doesCardMatch = anyMatches;
    } 
    else {
      // For "doesn't contain", then they ALL need to evaluate to true
      var noMatches = true;
      cardFields.forEach(function(cardField) {
        noMatches = noMatches && compareField(compareType, cardField, valueToCompare);
      });
      doesCardMatch = noMatches;
    }
    

    return doesCardMatch;
  }

  function compareField(compareType, cardField, valueToCompare) {
    // console.log("compateField:", compareType, cardField, valueToCompare);
    if (compareType === '=') {
      return cardField == valueToCompare; //jshint ignore:line
    } else if (compareType === 'not') {
      return cardField != valueToCompare; //jshint ignore:line
    } else if (compareType === '<') {
      return cardField < valueToCompare; //jshint ignore:line
    } else if (compareType === '<=') {
      return cardField <= valueToCompare; //jshint ignore:line
    } else if (compareType === '>') {
      return cardField > valueToCompare; //jshint ignore:line
    } else if (compareType === '>=') {
      return cardField >= valueToCompare; //jshint ignore:line
    } else if (compareType === 'contains') {
      return -1 !== cardField.indexOf(valueToCompare); //jshint ignore:line
    } else if (compareType === "doesn't contain") {
      return -1 === cardField.indexOf(valueToCompare); //jshint ignore:line
    } else {
      console.error("Unknown compare type: " + compareType);
      return false;
    }
  }

  /**
   * Get a list of all cards that exist in either list #1 or list #2
   */
  function getCardsInAnyList(list1, list2) {
    var cumulativeCards = [];

    var i = 0;
    var card = null;

    for (i = 0; i < list1.length; i++) {
      card = list1[i];
      addCardToList(card, cumulativeCards);
    }

    for (i = 0; i < list2.length; i++) {
      card = list2[i];
      addCardToList(card, cumulativeCards);
    }

    return cumulativeCards;
  }


  /**
   * Adds a card to the given list
   */
  function addCardToList(card, list) {
    var alreadyExists = false;
    for (var j = 0; j < list.length; j++) {
      var existingCard = list[j];
      if (0 === compareCards(existingCard, card)) {
        alreadyExists = true;
        break;
      }
    }

    if (!alreadyExists) {
      list.push(card);
    }
  }


  /**
   * Find all cards that exist in both list #1 and list #2
   */
  function getCardsInBothLists(list1, list2) {
    var cardsInBothLists = [];
    for (var i = 0; i < list1.length; i++) {
      var card1 = list1[i];

      for (var j = 0; j < list2.length; j++) {
        var card2 = list2[j];
        if (!card2 || !card1) {
          console.log("error: bad card????");
        }

        if (0 === compareCards(card1, card2)) {
          cardsInBothLists.push(card2);
          break;
        }
      }
    }
    return cardsInBothLists;
  }

    /**
   * Match cards based on a given rule
   */
     function getCardsMatchingSimpleRule(rule) {
      // console.log("getCardsMatchingSimpleRule: ", rule);
      var matches = [];
      for (var i = 0; i < $scope.data.cardList.length; i++) {
        var card = $scope.data.cardList[i];
        //if (card.legacy) {
        //  continue;
        //}
  
        // Empty field. Just ignore it!
        if (rule.data === "") {
          matches.push(card);
          continue;
        }
  
        if (compareFields(card, rule.field, rule.condition, rule.data)) {
          matches.push(card);
        }
        
      }
      // console.log("matches: ", matches, "$scope.data.matches",  $scope.data.matches);
      return matches;
    }

  /**
   * Match cards based on a group of data
   */
  function getCardsMatchingRuleGroup(group) {
    // Evaluate the group of rules using AND or OR
    // console.log("getCardsMatchingRuleGroup I THINK ISSUE IS HERE", group);
    var firstRule = true;
    var cumulativeCardsMatchingRules = [];

    for (var i = 0; i < group.rules.length; i++) {
      var subRule = group.rules[i];
      var cardsMatchingRule = getCardsMatchingRule(subRule);

      if (group.operator === "AND") {
        if (firstRule) {
          cumulativeCardsMatchingRules = cardsMatchingRule;
          firstRule = false;
        }
        cumulativeCardsMatchingRules = getCardsInBothLists(cumulativeCardsMatchingRules, cardsMatchingRule);
      } else if (group.operator === "OR") {
        cumulativeCardsMatchingRules = getCardsInAnyList(cumulativeCardsMatchingRules, cardsMatchingRule);
      }
    }
    // console.log("getCardsMatchingRuleGroup I THINK ISSUE IS HERE", cumulativeCardsMatchingRules);
    return cumulativeCardsMatchingRules;
  }


  /**
   * Match cards based on a group of data
   */
   function getCardsMatchingRuleGroup(group) {
    // Evaluate the group of rules using AND or OR
    var firstRule = true;
    var cumulativeCardsMatchingRules = [];

    for (var i = 0; i < group.rules.length; i++) {
      var subRule = group.rules[i];
      var cardsMatchingRule = getCardsMatchingRule(subRule);

      if (group.operator === "AND") {
        if (firstRule) {
          cumulativeCardsMatchingRules = cardsMatchingRule;
          firstRule = false;
        }
        cumulativeCardsMatchingRules = getCardsInBothLists(cumulativeCardsMatchingRules, cardsMatchingRule);
      } else if (group.operator === "OR") {
        cumulativeCardsMatchingRules = getCardsInAnyList(cumulativeCardsMatchingRules, cardsMatchingRule);
      }
    }

    return cumulativeCardsMatchingRules;
  }


  function removeCardsFromList(cardList, cardsToExclude) {
    var filteredList = [];

    for (var i = 0; i < cardList.length; i++) {
      var card = cardList[i];
      var exclude = false;

      for (var j = 0; j < cardsToExclude.length; j++) {
        var excludedCard = cardsToExclude[j];
        if (card === excludedCard) {
          exclude = true;
          break;
        }
      }

      if (!exclude) {
        filteredList.push(card);
      }
    }

    return filteredList;
  }



  /**
   * Get cards that match a given rule (may be complex or simple)
   */
  function getCardsMatchingRule(rule) {
    // console.log("getCardsMatchingRuleGroup I THINK ISSUE IS HERE", rule);
    if (rule.condition) {

      // This is a specific condition, not another rule
      const simpleRuleMatch = getCardsMatchingSimpleRule(rule);
      // console.log("simple rule", simpleRuleMatch);
      return simpleRuleMatch;

    } else if (rule.group) {
      // console.log("rule group", rule.group);
      let ruleGroup  = getCardsMatchingRuleGroup(rule.group);
      return ruleGroup;
      
    }
  }

  function clearSearch() {
    // console.log("clear search");
    $scope.search.type = "ALL";
    $scope.search.searchField = "TITLE";
    $scope.search.text = "";
    doSearch();
  }
  $scope.clearSearch = clearSearch;

  /**
   * Perform a search
   */
  function doSearch() {
    // console.log("do search");
    var cumulativeSearch = buildCumulativeSearch();
    var searchToExclude = buildSearchToExclude();
    // console.log("cumulativeSearch", cumulativeSearch,"searchToExclude: ", searchToExclude );

    performSearchAndDisplayResults(cumulativeSearch, searchToExclude);
  }
  $scope.doSearch = doSearch;

  function compareCards(a, b) {
    if(a.titleSortable < b.titleSortable) {
      return -1;
    }
    if(a.titleSortable > b.titleSortable) {
      return 1;
    }
    if(a.Type < b.Type) {
      return -1;
    }
    if(a.Type > b.Type) {
      return 1;
    }
    if(a.Set < b.Set) {
      return -1;
    }
    if(a.Set > b.Set) {
      return 1;
    }

    return 0;
  }

  function sortByName(a, b){
    return compareCards(a, b);
  }


  /**
   * Perform the given search and update the search results pane
   */
  function performSearchAndDisplayResults(searchCriteria, excludeCriteria) {
    $scope.data.selectedCard = null;
    $scope.data.lastSelectedCard = null;
    $scope.data.noResultsFound = false;
    $scope.data.performedSearch = true;
    $scope.data.matches = [];
    console.log("search criteria", searchCriteria);

    if (!searchCriteria) {
      $scope.data.performedSearch = false;
      return;
    }
    console.log("this should be before line 804");
    var matchingCards = getCardsMatchingRule(searchCriteria);
    // var excludeCards = getCardsMatchingRule(excludeCriteria);
    console.log("matching Cards: ", matchingCards);

    // matchingCards = removeCardsFromList(matchingCards, excludeCards);
    $scope.data.matches = matchingCards;
    console.log("$scope.data.matches: ", $scope.data.matches)
    
    if ($scope.data.matches.length === 0) {
      $scope.data.noResultsFound = true;
      /*
      * If the length of the found cards is exactly 1 card,
      * then click the card and display it.
      */
    } else if ($scope.data.matches.length === 1) {
      $scope.data.noResultsFound = false;
      selectCardAtIndex(0);
    } else {
      $scope.data.noResultsFound = false;
    }
    
    $scope.data.matches.sort(sortByName);
    console.log("$scope.data.matches: ", $scope.data.matches)
    $scope.data.showAdvancedSearch = false;
  } // function performSearchAndDisplayResults


  $scope.onImageLoadError = function() {
    console.error("Error loading image!");
    $scope.data.imageLoadFailure = true;
  };

  $scope.onImageLoadSuccess = function() {
    console.log("Image Loaded");
    $scope.data.imageLoadFailure = false;
  };

  $scope.swallow = function($event) {
    $event.stopPropagation();
  };

  $scope.hasExtraData = function(card) {
    return  card.Name ||
            card.Type ||
            card.Rarity ||
            card.Set ||
            card.Faction ||
            card.Affiliation ||
            card.Cost ||
            card.Cannon ||
            card.Sail ||
            card.Adventure ||
            card.Influence ||
            card.Swashbuckling ||
            card.Trait ||
            card.Text ||
            card.Errata ||
            card.MRP ||
            card.Artist;
  };


  $timeout(function() {
    /*
     * Load the card database in to memory
     */
    reloadCards();
    /*
     * Check if a search string was passed via the ?s= location.
     * If a search string was passed, then populate the "Search Text" box and trigger a search.
     * Example: ?s=%E2%80%A2Kalit%27s%20Sandcrawler
     */
    console.log("s:",$location.search().s,typeof $location.search().s);
    if ((typeof $location.search().s != undefined) && ($location.search().s != undefined)) {
      $scope.search.text = $location.search().s;
      console.log("Searching for:",$scope.search.text);
      doSearch();
    }
  }) // timeout


  // Listen for events on load
  setTimeout(registerKeyEvents, 1500);

}]);
