7th Sea CCG Card Library
=================

This README needs to be updated since being converted from SWCCG to 7th Sea. 

Welcome to the 7th Sea CCG Card Search website! This repository contains all of the UI for searching and displaying all of the existing 7th Sea cards.

For more information about 7th Sea CCG, check out the 7th Sea CCg fansite here: https://www.7thSea.info/


## Passing search terms via the URL

* A search string can be passed by the URL using the `?s=` search parameter.
* For example: `https://www.stephenskilton.com/7th-Sea-CCG-Card-Library/?s=Reis`


## Where Does The Data Come From?
* The card data comes from the [7th-Sea-Card-Data](https://docs.google.com/spreadsheets/d/1yXurAXZDd8s68FSAX1osuRJ7PFJBqN_oeYBq32wOoUw/edit?usp=sharing) and is converted into JSON format


## Where Are The Images?
* All of the images originate from the Google Library of the old card lookup app. If you have a full scan of all the cards, we would love to update it!


## How Does It Work?
* Javascript + AngularJS
* The Website downloads the `7thSea.json` card database file
* Inspects the database for all possible values of fields (for auto-complete and dropdowns)
* Searches are 100% client-side.


## Interesting Features
* Dropdowns automatically update when new content is added to the JSON file. No code changes required!
* Optionally supports "text-only" mode so that we can support new cards in the system, even if images aren't ready yet. This also lets you easily copy-paste from the cards



## How To Contribute?
* If you see bugs in the current site, please create an issue on GitHub or create a Pull request.

### Contributing Code:
1. Create a Fork of the code
2. Create a new branch inside The fok
3. Commit The changes in that branch
4. Create a pull request
5. Someone on the team will review the pull request and merge it.

### Contributing code using git

Anyone may contribute to this project!

We use GIT to manage our source code repository. If you are not familiar with GIT,
think of it like this:  If you want to submit a change, you'll need to make a "Pull Request".
 
1.  You make a branch of the code for yourself
2.  You make changes
3.  You submit your branch of code
4.  You create a Pull Request which means "you want the SWCCG community to pull in your changes"
5.  We review your changes, and merge your branch into the main branch

Here is a nice tutorial which details the steps for creating a Pull Request
https://www.thinkful.com/learn/github-pull-request-tutorial/Time-to-Submit-Your-First-PR#Time-to-Submit-Your-First-PR

### Run a simple webserver locally using Python3

The website code can be run from any static website hosting platform, including apache2, nginx, s3, or python's built-in http server.

The easiest way to run this locally is to use Python's built-in http server module. 

1. Open a command prompt
2. Navigate to the folder containing this code
3. Start the HTTP server with the command: `python3 -m http.server`
4. Open any browser to "localhost:8000/index.html"

Done! You should be able to play around with the site locally now.



## Attribution
* [The 7th Sea Library was converted from another app, Scomp,  created by Thomas Marlin](https://github.com/thomasmarlin)

