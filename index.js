const http = require('http');
var ComfyJS = require("comfy.js");
require('dotenv').config()
const osc = require('osc');

// Initialize a UDP Server
var udpPort = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: process.env.UDP_PORT || 5000,
  metadata: true
});

/**
 * Send message to Sonic PI
 *
 * @param {String} address
 * @param {String} message
 */
const sendUDPMessage = (address, message = '') => {
    const splits = message.split(',');

    // Build an array of integer from the comma seperated list of values
    const args = splits.reduce(function (acc, value) {
      // Value must be an integer
      const result = parseInt(value);

      if (!result) return acc;

      // Push new integer value type that we plan to send
      acc.push({
        type: 'i',
        value: result,
      });

      return acc;
    }, []);

    console.log('Send message %s to %s', JSON.stringify(args), address);

    // Send accumulated args to address, Sonic Pi
    udpPort.send(
      {
        address, // That channel were sending to
        args,
      },
      'localhost',
      4560, // Port Sonic Pi listens to
    );
};

ComfyJS.onCommand = ( user, command, message, flags, extra ) => {
  if( command === "note" ) { // Catches "!note 40, 50, 5"
    sendUDPMessage('/twitchchat', message);
  } else if( command === "playback" ) { // Catches "!playback" chat message
    sendUDPMessage('/twitchmusic');
  }
}

const server = http.createServer((request, response) => {
    response.writeHead(200, {"Content-Type": "text/plain"});
    response.end("Hello World!");
});

const port = process.env.PORT || 1337;
server.listen(port);
udpPort.open()

console.log("Server running at http://localhost:%d", port);

ComfyJS.Init("TWITCH_CHANNEL_TO_CONNECT_TO" );
udpPort.on("ready", function () {
  console.log('Connection ready to jam')
})
