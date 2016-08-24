# Live Stream Chat Retriever

[![](https://david-dm.org/Noxalus/Live-Stream-Chat-Retriever.svg)](https://david-dm.org/Noxalus/Live-Stream-Chat-Retriever)

Retrieve live streams chat messages from different sources (Twitch, YouTube Gaming, Dailymotion, etc...).

If you have an optical fiber connection, you might want to send your live streams to multiple services to reach a wider audience. But in this case, if you want to display the chat on your stream, you need to make a choice.

The purpose of this project is to display an HTML page that will retrieve all chat messages from these different sources to display them in real time.

## Features

Supported services:
* [Youtube Gaming](https://gaming.youtube.com/)
* [Twitch](https://www.twitch.tv/)
* [Hitbox](https://www.hitbox.tv/)
* [Beam](https://www.beam.pro/)
* [Dailymotion Games](http://games.dailymotion.com/)

## Prerequisites

You need to install [Node.js](https://nodejs.org/en/download/) and launch `npm install` in the root folder.

## Usage

Rename the *config.template.json* file to **config.json** and complete the missing information with yours.

If you need more information about how to fill this config file, please read the [corresponding part](https://github.com/Noxalus/Live-Stream-Chat-Retriever/wiki/Configuration-file) from the wiki.

Once that is done, you can run this command from the root folder: ``npm start``

Then, you should see the chat messages if you browse to [*http://localhost:4242*](http://localhost:4242).

## Known issue

* Beam socket seems to disconnect after an undefined amount of time
