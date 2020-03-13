Twitch + Sonic Pi Integration
[![Sonic Pi With Twitch Youtube Video](http://img.youtube.com/vi/T-H9NZZQGyU/0.jpg)](http://www.youtube.com/watch?v=T-H9NZZQGyU)
## Requirements

- Sonic Pi - The music synth goodness [http://sonic-pi.net/](http://sonic-pi.net/)
- node.js - Our server that will connect to Twitch Chat and then send messages to Sonic Pi [https://nodejs.org/en/](https://nodejs.org/en/)
- Twitch Account - Well be using your Twitch accounts channel chat to send messages to Sonic Pi  [https://www.twitch.tv/](https://www.twitch.tv/)

## Getting Sonic Pi Ready

In order to communicate to Sonic Pi you will have to enable OSC - Open Sound Control.

For security reasons, by default Sonic Pi does not let remote machines send it OSC messages. But it's easy to enable it. You can enable it in:

> Preferences > IO > Network > Receive Remote OSC Messages

Once you’ve enabled this, you can receive OSC messages from any computer on your network. With that done let's focus on getting our node.js server going.

## Getting the Example Code

Both the node.js example code and the code for Sonic Pi can be found in a Github repository I created for this fun experiment. [https://github.com/talk2MeGooseman/twitch-sonic-pi-messager](https://github.com/talk2MeGooseman/twitch-sonic-pi-messager)

Let's clone the repository so we can get things up and running in the next few steps.
```
git clone git@github.com:talk2MeGooseman/twitch-sonic-pi-messager.git
```
Nice, we got the code now let's take a short tour of what's going on.

## What it Takes to Create the Twitch + Sonic Pi Magic

To get things all wired up on the node.js side doesn't require much. You will just need to use 2 different node packages.

- Comfy.js - Beautifully simple library to connect to Twitch Chat [https://github.com/instafluff/ComfyJS](https://github.com/instafluff/ComfyJS)
- osc- Open Sound Control package with UDP support to send messages to Sonic Pi [https://github.com/colinbdclark/osc.js#udp-in-nodejs](https://github.com/colinbdclark/osc.js#udp-in-nodejs)

If you take a moment to open up `package.json`, you will notice these two project dependencies have already been added for you. Now all you have to do is install them. Let's do that now with the following command.
```bash
npm install
```
With the dependencies ready to go, lets next move on to the code that will run our node.js server.

### Touring Through the Server Code

Now let's open up `index.js` file. Here is where the message pass through magic is happening between sending commands through Twitch Chat and receiving them in Sonic Pi. If it's your a little overwhelmed looking at all this code, no need to worry, I am going to try to break down the important bits of the code you would need to focus on in a way the application might run. You will notice were going to be jumping around in the file to different parts of it but this is just so we can follow how the server is running things easier.

### Establishing Connections

In this little bit of code, we're creating a UDP server running local to our computer and setting 5000 if we don't have a `UDP_PORT` specified in a `.env` file. We will use the created `udpPort` object to send messages to Sonic Pi a little later. You can keep the code as is, but if you want to set the port using a `.env` file. The project does include an example one called `.env.example` that you can rename to `.env` and put whatever value you like. Just remember what value you put in for later �.
```javascript
    // Initialize a UDP Server
    var udpPort = new osc.UDPPort({
      localAddress: "0.0.0.0",
      localPort: process.env.UDP_PORT || 5000,
      metadata: true
    });
```
Next, we're going to startup Comfy.js. This is the library we will use to listen to Twitch Chat on our channel. This will allow us to detect when someone triggers certain commands. You will need to edit this part of the code and change `TWITCH_CHANNEL_TO_CONNECT_TO` to the name of your user account so `Comfy.js` can connect to your accounts channel chat. In my case, my username on Twitch is `talk2megooseman` so I would change it to that.
```javascript
ComfyJS.Init("TWITCH_CHANNEL_TO_CONNECT_TO" );
```
> For this next section, you will need to have your Twitch account created and have your Twitch Channel's Chat open. You can open your chat using this URL format: https://www.twitch.tv/popout/{your twitch username here}/chat?popout=

### Listening for to Twitch Chat Commands

Now with `Comfy.js` listening to your chat, we need to write some code to capture when someone does a command. In `Comfy.js`, commands are any message sent into the chat that starts with a `!` . When it sees a `!` command it will call the `onCommand` it will give you information about that username who called it and the message. If you look at the code below, when we receive a `onCommand` event, it is checking to see if someone typed `!note` or `!playback` . 

> But wait, in those checks down below your not check if `command === "!note"` your check if it's `command === "note"` ? Yep, you're not seeing things. `Comfy.js` makes it easy on us and just remove the `!` from the beginning of the command since it always has to be there to trigger the `onCommand` event.

Once we captured a `!note` command we send the message to a specific channel address called `/twitchchat` with the message contents that appears after the `!note` command. Like `!note 40, 50, 5` these values correspond to note the user wants to play, the sustain, and cutoff that we will see a little later in the Sonic Pi code. What really matters here is that we're getting the Twitch Chat users input.
```javascript
    ComfyJS.onCommand = ( user, command, message, flags, extra ) => {
      if( command === "note" ) { // Catches "!note 40, 50, 5"
        sendUDPMessage('/twitchchat', message);
      } else if( command === "playback" ) { // Catches "!playback" chat message
        sendUDPMessage('/twitchmusic');
      }
    }
```
### Sending Command Notes to Sonic Pi

Now that we captured the command and the information that a Twitch Chat user wants to send, we need to send that information to Sonic Pi. That's where the `sendUDPMessage` function comes in. `sendUDPMessage` expects two arguments, `address`, and `message`. The first thing we need to do is format the message to send to Sonic Pi.

The message a user sends should look like a comma-separated string between 1-3 values, `40, 50, 5`. What we need to with this string is create an array of values to send as `args` to Sonic PI. To do that we first split the original string by `,` so that we get an array of for each value. Next, we use the `reduce` method on `splits` variable to build a new array with the arguments we will send using the UDP library. After we called our `args`, we call `udpPort.send` to send our message to Sonic Pi.
```javascript
    const sendUDPMessage = (address, message = '') => {
        const splits = message.split(','); // Returns ['40', '50', '5']
    
        // Build an array of integer from the comma seperated list of values
        // Returns [{ type: 'i', value: 40 }, { type: 'i', value: 50 }, { type: 'i', value: 5 }]
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
```
Let's start the server up. Inside the terminal, in the project directory, enter the command.
```
npm start
```
This should start up the node server and kick off everything we covered thus far.

You can test if things seem to be working by going into your accounts Twitch Channel and entering `!note 40, 50, 5` in the chat. You should see a log message in your terminal along the lines of `Send message [{ type: 'i', value: 40 },...] to /twitchchat`. Now our message should be on their way to Sonic Pi.

### Playing Our Messages In Sonic Pi

Ok, so not we're listening to Twitch Chat for `!note` commands entered in. We then have taken those messages, formatted them, sent them to the OSC port Sonic Pi is listening too. Now comes listening to those messages on the Sonic Pi side and playing the note.

In the example repository, open the file called `sonic-pi-listener.rb`. This will be all the code you will need to play the sent in notes and a little bit more. Cool huh? I thought so when I got it all working.

Let's focus in on the most important part of the code, the first `live_loop` block.
```ruby
    # Creating a set with an empty array
    set :notes, [] 
    
    # The beginning of our listener loop
    live_loop :note do
      use_real_time
      # Wait to receive a message from the twitchchat channel from our running node server
      note = sync "/osc:127.0.0.1:5000/twitchchat"
      
      # Grab the notes from the notes array
      notes = get[:notes]
      
      # Add a new note to end of out array of notes, kinda messy but it works
      set :notes, notes + [note]
      
      # Play a synth with the note, cutoff and sustain passed ie. from [40, 50, 5] 
      synth :prophet, note: note[0], cutoff: note[1], sustain: note[2]
    end
```
Hopefully, the code makes a tiny bit of sense, I added some comments in there to help illustrate whats going on. If you haven't already, take the code in `sonic-pi-listener.rb` and pasted it into Sonic Pi. Now click the `Run` button on the top left.

Wait... Nothing happened. Yep, nothing happened. But that's because now Sonic Pi is waiting to receive a message. What it did so far was:

1. Create our `set` named `:notes` with an empty array. 
2. Afterward it kicks off our `live_loop`, think of it like an infinite loop.
3. When it hits the `sync` call, pauses execution. Now it sits and waits to move like a kid waiting for the bell to ring in the last class of the day.

Now comes the cool part! In your channel's Twitch Chat, do another `!note 40, 50, 5`. Hopefully, you heard a note play! AHHH!

Ok, so what happened in the code? Once Sonic Pi gets the message: 

1. `sync` takes the message, which looks like this `[40, 50, 5]`,  and stores it in the `note` variable
2. Next line, it grabs all the `notes` in the `set` and puts that in another variable
3. Now it updates our set with the existing notes and append the new note
4. This is the best part, we call `synth` with the `:prophet` synth sound and then pass in the 3 values. Which is then plays!

Boom!

## From Twitch Chat to Music Playing

Now we're at the end of our musical journey in creating an interactive way to create music with other people on Twitch. Hopefully, you enjoyed this article and wasn't too hard of a read. I enjoyed creating this project and I hope that I was successful and transferring my excitement on to you and potentially motivate you to play around with what you can do to make interactive music.

### Bonus Time:

You might have noticed that I glossed over the second half of `sonic-pi-listener.rb`. I want to leave this part are an experiment/learning exercise for you. What I will tell you, play several notes with the `!note` command in your Twitch Chat. After you played a few notes then enter `!playback` into the chat. Hopefully, it works and you hear something. Have fun!
