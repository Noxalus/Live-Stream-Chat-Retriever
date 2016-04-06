# Live Stream Chat Retriever
Retrieve live streams chat messages from different sources (Twitch, YouTube Gaming, Dailymotion, etc...).

If you have an optical fiber connection, you might want to send your live streams to multiple services to reach a wider audience. But in this case, if you want to display the chat on your stream, you need to make a choice.

The purpose of this project is to display an HTML page that will retrieve all chat messages from these different sources to display them in real time.

## Features

Supported services:
* [Youtube Gaming](https://gaming.youtube.com/)
* [Twitch](https://www.twitch.tv/)
* [Hitbox](https://www.hitbox.tv/)
* [Beam](https://www.beam.pro/)

## Prerequisites

You need to install [Node.js](https://nodejs.org/en/download/) and launch `npm install` in the root folder.

## Usage

Rename the *config.template.json* file to **config.json** and complete the missing information with yours.

To find your Youtube *client_id* and *client_secret*, you need to create OAuth 2.0 credientials. The [official documentation](https://developers.google.com/youtube/registering_an_application) explains how to do that. Please make sure that you added all redirect URIs from the **redirect_uris** array into your application when you create your OAuth 2.0 credentials.

Once that is done, you can run this command from the root folder: ``npm start``

Then, you should see the chat messages if you browse to [*http://localhost:4242*](http://localhost:4242).
