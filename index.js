const {
    executionAsyncResource
} = require('async_hooks');
const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const {
    measureMemory
} = require('vm');
const fetch = require('node-fetch')
const createBar = require("string-progressbar");
const {MessageEmbed} = require("discord.js")

const {
    YTSearcher
} = require('ytsearcher');

const searcher = new YTSearcher({
    key: "api key here",
    revealed: true
});

const client = new Discord.Client();

const queue = new Map();

client.on("ready", () => {
    console.log("I am online!")
    client.user.setActivity(`g!help in ${client.guilds.cache.size} servers `, {
        type: "WATCHING"
    });
})

client.on("message", async (message) => {
    try {
        if (message.channel.type === 'dm') return
       

        if (message.content == 'g!help') {
            const emb = new Discord.MessageEmbed()
                .setTitle('HELP')
                .setDescription('Here are List of Commands ,usuage - \`g![command]\`\nFor detailed info of command - [click here](https://fncanuragop.wixsite.com/website/commands)\nInvite link - [click to invite me](https://discord.com/api/oauth2/authorize?client_id=784173787146485760&permissions=8&scope=bot)\n\n<a:starblue:782715795812646932> **VC moderation**\n\`vcbanall\` , \`vckickall\`\n\n<a:music:785802339758899241> **Music**\n\`play\` , \`stop\` , \`skip\` , \`vskip\` , \`pause\` , \`resume\` , \`loop\` , \`queue\` , \`lyrics\` , \`dc\`')

                .setColor('#00ffe2')
                .setFooter('Bot developed by MEPHISTO#2606')
                .setThumbnail(client.user.displayAvatarURL())
            message.channel.send(emb).then(m => m.delete({
                timeout: 19000
            }));

        }

        const prefix = 'g!';

        const serverQueue = queue.get(message.guild.id);
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/g)
        const command = args.shift().toLowerCase();

        switch (command) {
            case 'p':
                execute(message, serverQueue);
                break;
            case 'play':
                execute(message, serverQueue);
                break;
            case 'stop':
                stop(message, serverQueue);
                break;
            case 'skip':
                skip(message, serverQueue);
                break;
            case 'vskip':
                vSkip(serverQueue);
                break;
            case 'pause':
                pause(serverQueue);
                break;
            case 'resume':
                resume(serverQueue);
                break;
            case 'loop':
                Loop(args, serverQueue);
                break;
            case 'queue':
                Queue(serverQueue);
                break;
            case 'lyrics':
                lyrics(serverQueue, message);
                break;
            case 'vcbanall':
                vcbanall(message, args);
                break;
            case 'vckickall':
                vckickall(message, args);
                break;
            case 'dc':
                dc(message, serverQueue);
                break;
            case 'leave':
                dc(message, serverQueue);
                break;
            case 'volume':
                vol(message, serverQueue, args);
                break;
            case 'vol':
                vol(message, serverQueue, args);
                break;
            case 'np':
                np(message,serverQueue);
                break;
        }

        async function execute(message, serverQueue) {
            if (args.length <= 0)
                return message.channel.send("Please write the name of the song")

            let vc = message.member.voice.channel;
            if (!vc) {
                return message.channel.send("Please join a voice chat first");
            } else {
                let msg = await message.channel.send(`<a:load:803433149748609054> **Searching** ...!`)

                result = await searcher.search(args.join(" "), {
                    type: "video"
                })
                let songInfo;
                try {
                    songInfo = await ytdl.getInfo(result.first.url)
                } catch (err) {
                    return msg.edit('🚫 No result found')
                }
                let song = {
                    title: songInfo.videoDetails.title,
                    url: songInfo.videoDetails.video_url,
                    duration: songInfo.videoDetails.lengthSeconds,
                    thumbnail: `https://img.youtube.com/vi/${songInfo.videoDetails.videoId}/maxresdefault.jpg`,
                    requestedBy: message.author.id,
                    author: songInfo.videoDetails.author.name

                };

                if (!serverQueue) {
                    const queueConstructor = {
                        txtChannel: message.channel,
                        vChannel: vc,
                        connection: null,
                        songs: [],
                        volume: 10,
                        playing: true,
                        loopone: false,
                        loopall: false,
                        skipVotes: []
                    };
                    queue.set(message.guild.id, queueConstructor);

                    queueConstructor.songs.push(song);

                    try {
                        let connection = await vc.join();
                        queueConstructor.connection = connection;
                        message.guild.me.voice.setSelfDeaf(true);
                        play(message.guild, queueConstructor.songs[0]);
                        msg.delete()
                    } catch (err) {
                        console.error(err);
                        queue.delete(message.guild.id);
                        return msg.edit(`<:cross:785589842280972288> Unable to join the voice chat ${err}`)
                    }
                } else {
                    serverQueue.songs.push(song);
                    return msg.edit(`<:tick:785135871975620639> Added \`${song.title}\` to the queue`);
                }
            }
        }
        async function play(guild, song) {
            const serverQueue = queue.get(guild.id);
            if (!song) {
                queue.delete(guild.id);
                
                message.guild.me.voice.channel.leave()
                return;
            }
            const dispatcher = serverQueue.connection
                .play(ytdl(song.url))
                .on('finish', () => {
                    if (serverQueue.loopone) {
                        play(guild, serverQueue.songs[0]);
                    } else if (serverQueue.loopall) {
                        serverQueue.songs.push(serverQueue.songs[0])
                        serverQueue.songs.shift()
                    } else {
                        serverQueue.songs.shift()
                    }
                    play(guild, serverQueue.songs[0]);
                })

            serverQueue.txtChannel.send(`<:tick:785135871975620639> Now Playing  \`${serverQueue.songs[0].title}\``)
        }

        function stop(message, serverQueue) {
            if (!serverQueue)
                return message.channel.send("There is no music playing!")
            if (message.member.voice.channel != message.guild.me.voice.channel)
                return message.channel.send("You need to join the voice chat first!")
            serverQueue.songs = [];
            serverQueue.connection.dispatcher.end();
            serverQueue.txtChannel.send('<:tick:785135871975620639> Successfully cleared the Queue')
        }

        function skip(message, serverQueue) {
            if (message.member.voice.channel != message.guild.me.voice.channel)
                return message.channel.send("You need to join the voice chat first");
            if (!serverQueue)
                return message.channel.send("There is nothing to skip!");

            let roleN = message.guild.roles.cache.find(role => role.name === "DJ") || message.guild.roles.cache.find(role => role.name === "dj") || message.guild.roles.cache.find(role => role.name === "Dj")
            if (!roleN) return message.channel.send(`<:cross:785589842280972288> No DJ role Found on server`)
            if (!message.member.roles.cache.get(roleN.id))
                return message.channel.send("<a:cross:785589842280972288> You don't have the DJ role");
            serverQueue.connection.dispatcher.end();
            serverQueue.skipVotes = [];
            message.channel.send("<:tick:785135871975620639> Song has been skipped")
        }

        function vSkip(serverQueue) {
            if (!serverQueue)
                return message.channel.send("There is no music currently playing!");
            if (message.member.voice.channel != message.guild.me.voice.channel)
                return message.channel.send("You are not in the voice channel!");

            let usersC = message.member.voice.channel.members.size;
            let required = Math.ceil(usersC / 2);

            if (serverQueue.skipVotes.includes(message.member.id))
                return message.channel.send("You already voted to skip!")

            serverQueue.skipVotes.push(message.member.id)
            message.channel.send(`You voted to skip the song \`${serverQueue.skipVotes.length}/${required}\` votes`)

            if (serverQueue.skipVotes.length >= required) {
                serverQueue.connection.dispatcher.end();
                serverQueue.skipVotes = [];
                message.channel.send("<:tick:785135871975620639> Song has been skipped")
            }
        }

        function pause(serverQueue) {
            if (!serverQueue)
                return message.channel.send("There is no music currently playing!");
            if (message.member.voice.channel != message.guild.me.voice.channel)
                return message.channel.send("You are not in the voice channel!")
            if (serverQueue.connection.dispatcher.paused)
                return message.channel.send("The song is already paused");
            serverQueue.connection.dispatcher.pause();
            message.channel.send("The song has been paused!");
        }

        function resume(serverQueue) {
            if (!serverQueue)
                return message.channel.send("There is no music currently playing!");
            if (message.member.voice.channel != message.guild.me.voice.channel)
                return message.channel.send("You are not in the voice channel!")
            if (serverQueue.connection.dispatcher.resumed)
                return message.channel.send("The song is already playing!");
            serverQueue.connection.dispatcher.resume();
            message.channel.send("The song has been resumed!");
        }

        function Loop(args, serverQueue) {
            if (!serverQueue)
                return message.channel.send("There is no music currently playing!");
            if (message.member.voice.channel != message.guild.me.voice.channel)
                return message.channel.send("You are not in the voice channel!")
            if (!args[0]) return message.channel.send("Please provide args \`one\`,\`all\` or \`off\`")
            switch (args[0].toLowerCase()) {
                case 'all':
                    serverQueue.loopall = !serverQueue.loopall;
                    serverQueue.loopone = false;

                    if (serverQueue.loopall === true)
                        message.channel.send("Loop all has been turned on!");
                    else
                        message.channel.send("Loop all has been truned off!");

                    break;
                case 'one':
                    serverQueue.loopone = !serverQueue.loopone;
                    serverQueue.loopall = false;

                    if (serverQueue.loopone === true)
                        message.channel.send("Loop one has been turned on!");
                    else
                        message.channel.send("Loop one has been truned off!");
                    break;
                case 'off':
                    serverQueue.loopall = false;
                    serverQueue.loopone = false;

                    message.channel.send("Loop has been turned off!");
                    break;
                default:
                    message.channel.send("<a:cross:785589842280972288> Please specify what loop you want. m/loop <one/all/off>");
            }
        }

        function Queue(serverQueue) {
            if (!serverQueue)
                return message.channel.send("There is no music currently playing!");
            if (message.member.voice.channel != message.guild.me.voice.channel)
                return message.channel.send("You are not in the voice channel!")

            let nowPlaying = serverQueue.songs[0];
            let qMsg = `__**Now playing**__: [${nowPlaying.title}](${nowPlaying.url})\n\n __**UP Next**__-\n`

            for (var i = 1; i < serverQueue.songs.length; i++) {
                qMsg += `\`${i}\`. [${serverQueue.songs[i].title}](${serverQueue.songs[i].url})\n`
            }
            const emb = new Discord.MessageEmbed()
                .setFooter(message.author.username, message.author.displayAvatarURL({
                    dynamic: true
                }))
                .setTitle('QUEUE')
                .setDescription(qMsg)
                .setColor('#33ccff')

            message.channel.send(emb);
        }
        async function lyrics(serverQueue, message) {
            if (!serverQueue)
                return message.channel.send("There is no music currently playing!");
            if (message.member.voice.channel != message.guild.me.voice.channel) {
                return message.channel.send("You are not in the voice channel!")
            }
            const queue = serverQueue;
        
      
        
            try {
                let msg = await message.channel.send(`<a:load:803433149748609054> Fetching lyrics`)
                let nowPlaying = serverQueue.songs[0].title;
                var res = await fetch(`https://some-random-api.ml/lyrics?title=${encodeURIComponent(nowPlaying)}`)
                var lyrics = await res.json()
                if (lyrics.error) return msg.edit(':frowning: Sorry I could not find that song')
                if (lyrics.lyrics.length >= 2048) {
                    var cut = lyrics.lyrics.length - 2000
                    lyrics.lyrics = lyrics.lyrics.slice(0, -cut) + "..."
                }
                var lyricembed = new Discord.MessageEmbed()
                    .setTitle(lyrics.title + " lyrics")
                    .setDescription(lyrics.lyrics)
                    .setColor('BLUE')
                msg.edit(`Lyrics found`,lyricembed)
               
              if (!lyrics) lyrics = `No lyrics found for ${queue.songs[0].title}.`;
            } catch (error) {
              lyrics = `No lyrics found for ${queue.songs[0].title}.`;
            }
        
            
        }

        function vckickall(message, args) {
            if (!message.member.hasPermission('ADMINISTRATOR'))
                message.reply("You don't have permission to use that command.");
            else {
                let channelID = args[0];
                if (!args[0]) return message.reply(`Please provide channel id`)
                let j;
                try {
                    j = message.guild.channels.cache.get(channelID);
                } catch (err) {
                    message.reply(`could\'t find vc with that id`)
                    return;
                }
                try {
                    j.members.forEach((member) => {
                        member.voice.kick();


                    })
                } catch (err) {
                    message.reply(`Missing perms`)
                }
                message.channel.send(`Successfully Kicked all members! from ${j}`)
            }
        }

        function vcbanall(message, args) {
            if (!message.member.hasPermission('ADMINISTRATOR'))
                message.reply("You don't have permission to use that command.");
            else {
                let channelID = args[0];
                if (!args[0]) return message.reply(`Please provide channel id`)
                let j;
                try {
                    j = message.guild.channels.cache.get(channelID);
                } catch (err) {
                    message.reply(`could\'t find vc with that id`)
                    return;
                }
                try {
                    j.members.forEach((member) => {
                        j.createOverwrite(member, {
                            CONNECT: false
                        })


                    })
                } catch (err) {
                    message.reply(`Missing perms`)
                }
                message.channel.send(`Successfully Banned all members in vc from ${j}`)
            }
        }

        function dc(message, serverQueue) {

            queue.delete(message.guild.id);
            message.guild.me.voice.channel.leave()
            message.channel.send(`<a:Piku:785589455007907870> Left vc `)

        }

        function vol(message, serverQueue, args) {
            if (!serverQueue) return message.reply("There is nothing playing.").catch(console.error);
            if (message.member.voice.channel != message.guild.me.voice.channel)
                return message.reply("You need to join a voice channel first!").catch(console.error);

            if (!args[0]) return message.reply(`🔊 The current volume is: **${serverQueue.volume}%**`).catch(console.error);
            if (isNaN(args[0])) return message.reply("Please use a number to set volume.").catch(console.error);
            if (Number(args[0]) > 100 || Number(args[0]) < 0)
                return message.reply("Please use a number between 0 - 100.").catch(console.error);

            serverQueue.volume = args[0];
            serverQueue.connection.dispatcher.setVolumeLogarithmic(args[0] / 100);

            return message.channel.send(`🔊 Volume set to: **${args[0]}%**`).catch(console.error);

        }
     async   function np(message, serverQueue, args) {
            const queue = serverQueue;
            if (!queue) return message.reply("There is nothing playing.").catch(console.error);
        
            const song = serverQueue.songs[0];
            const seek = (queue.connection.dispatcher.streamTime - queue.connection.dispatcher.pausedTime) / 1000;
            const left = song.duration - seek;
          //  var info = await ytdl.getInfo(song);
             let nowPlaying = new MessageEmbed()
              .setTitle(song.author)
              .setDescription(`**[${song.title}](${song.url})**`)
              .setColor("#F8AA2A")
              .setThumbnail(song.thumbnail)
              
              
              //.addField('music.nowplaying.duration', `${parseMS(serverQueue.player.streamTime + serverQueue.startTime * 1000)} / ${parseMS(serverQueue.song.duration * 1000)}`, true)
              if (song.duration > 0) {
                nowPlaying.addField(
                  new Date(seek * 1000).toISOString().substr(11, 8) +
                    "[" +
                   createBar(song.duration == 0 ? seek : song.duration, seek, 20)[0] +
                    "]" +
                    (song.duration == 0 ? " ◉ LIVE" : new Date(song.duration * 1000).toISOString().substr(11, 8)),`**Requested By** - <@${song.requestedBy}>`
                );
                nowPlaying.setFooter("Time Remaining: " + new Date(left * 1000).toISOString().substr(11, 8));
              }
    
        
            return message.channel.send(nowPlaying);
        }

    } catch (err) {
        console.log(err)
    }
})
function parseMS(ms) {
    ms /= 1000;
    const h = Math.floor(ms / 60 / 60);
    const m = Math.floor((ms / 60 / 60 - h) * 60);
    const s = Math.floor(((ms / 60 / 60 - h) * 60 - m) * 60);

    return {
        hours: h,
        minutes: m,
        seconds: s,
        toString() {
            return `${this.hours ?? 0}h ${this.minutes ?? 0}m ${this.seconds ?? 0}s`;
        },
    };
}
client.login(TOKen)