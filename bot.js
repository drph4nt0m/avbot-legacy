const Discord = require("discord.js");
const express = require("express");
const mongoose = require('mongoose');
const request = require("request");
const http = require("http");
const dotenv = require("dotenv");
const inly = require("inly");
const path = require("path");
const fs = require("fs");
const DBL = require("dblapi.js");

const icao = require("icao");
const notams = require("notams");
const winston = require("winston");
const moment = require("moment-timezone");
const functions = require("./functions.js");

dotenv.config();

const app = express();

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname + '/index.html'));
});

app.listen(process.env.PORT || 4040, () => console.log(`AvBot Started`));

// const logger = winston.createLogger({
//   level: "info",
//   exitOnError: false,
//   format: winston.format.combine(
//     winston.format.timestamp({
//       format: "YYYY-MM-DD HH:mm:ss"
//     }),
//     winston.format.printf(info => `${info.timestamp} ${info.level.toUpperCase()}: ${info.message}`)
//   ),
//   transports: [
//     new winston.transports.Console({
//       level: "info",
//       format: winston.format.combine(
//         winston.format.colorize(),
//         winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
//       )
//     }),
//     new winston.transports.File({
//       filename: "log"
//     })
//   ]
// });


mongoose.connect(process.env.mLab, {useNewUrlParser: true});

var guildSchema = new mongoose.Schema({
  guild_id    : {type: String, unique: true},
  guild_name  : String,
  prefix      : { type: String, default: '!' },
  language    : { type: String, default: 'english' }
});

var Guild = mongoose.model('guilds', guildSchema);

const prefix = "!";
const successColor = "#1a8fe3";
const errorColor = "#bf3100";
const avwx = "https://avwx.rest/api/";

const cwd = process.cwd();
const name = 'whazzup.txt.gz';
const to = cwd + '/';
const from = path.join(cwd, name);

let lastTimeUpdate = 0;
const pilotRatings = ['', 'Observer', 'FS1', 'FS2', 'FS3', 'PP', 'SPP', 'CP', 'ATP', 'SFI', 'CFI'];
const facilityTypes = ['Observer', 'Flight Information', 'Delivery', 'Ground', 'Tower', 'Approach', 'ACC', 'Departure'];
const facilityTypes2 = ['Observer', 'Flight Information', 'Delivery', 'Ground', 'Tower', 'Approach', 'Control', 'Departure'];
const administrativeRatings = ['Suspended', 'Observer', 'User', '', '', '', '', '', '', '', '', 'Supervisor', 'Administrator'];
const atcRatings = ['', 'Observer', 'AS1', 'AS2', 'AS3', 'ADC', 'APC', 'ACC', 'SEC', 'SAI', 'CAI'];

const bot = new Discord.Client();
const dbl = new DBL(process.env.dblToken, bot);

bot.on("error", e => functions.logger(`error`, e));
bot.on("warn", e => functions.logger(`warn`, e));

dbl.on('posted', () => functions.logger('info', 'Server count posted!'));
dbl.on('error', e => functions.logger(`error`, `${e}`));

bot.on("ready", async () => {
  let start_time = moment.tz(bot.readyAt, "Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
  functions.logger(`info`, `AvBot v2 is online`);

  let guildIds = bot.guilds.map(e => e.id);
  let guildNames = bot.guilds.map(e => e.name);
  
  let guildArray = [];

  for(let i = 0; i < guildIds.length; i++) {
    guildArray.push({guild_id: guildIds[i], guild_name: guildNames[i]});
  }

  Guild.insertMany(guildArray, (err, guilds) => {
    if(err) console.log(err);
    else console.log(guilds);
  });

  console.log("– - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -");
  console.log(`
          ____                 _______                 __       __         __   _____                                          
         /    \\  ___      ___ |  ___  \\  ________   __|  |__    \\  \\      /  / /__   \\
        /  /\\  \\ \\  \\    /  / |  |_/  / |   __   | |__    __|    \\  \\    /  /     )  /
       /  /__\\  \\ \\  \\  /  /  |  |_  |  |  |  |  |    |  |        \\  \\  /  /     /  /
      /  /____\\  \\ \\  \\/  /   |  |_\\  \\ |  |__|  |    |  |         \\  \\/  /     /  /_
     /__/      \\__\\ \\____/    |_______/ |________|    |__|          \\____/     |_____|
                                                                                           
	`);
  console.log(`${start_time}\t\t\t${bot.user.id}\t\t\tRahul Singh`);
  console.log("– - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -");

  let restartEmbed = new Discord.RichEmbed()
    .setTitle(`Bot Restarted`)
    .setColor(successColor)
    .setFooter(`${moment.tz(moment.utc(), "Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss")}`);

  bot.channels
    .find(channel => channel.id === process.env.RestartChannel)
    .send(restartEmbed);

  bot.user.setStatus("online");
  bot.user.setActivity(`${prefix}help`, {
    type: "WATCHING"
  });

  setInterval(() => {
    dbl.postStats(bot.guilds.size, null, null);
  }, 1800000);


  fs.readFile('whazzup.txt', 'utf8', function (err, contents) {
		if (err) {
			var file = fs.createWriteStream('whazzup.txt.gz');
			var req = http.get('http://whazzup.ivao.aero/whazzup.txt.gz', function (response) {
				response.pipe(file);
				response.on("end", () => {
          functions.logger(`info`, `Whazzup downloaded`);
					const extract = inly(from, to);

					extract.on('end', () => {
            functions.logger(`info`, `Whazzup extracted`);
						fs.readFile('whazzup.txt', 'utf8', function (err, contents) {
							contents = contents.split('!GENERAL')[1];
							let general = contents.split('!CLIENTS')[0];
							let generalArray = general.split('\n');
							lastTimeUpdate = generalArray[3].split(' = ')[1];
							functions.logger(`info`, `Whazzup updated at ${lastTimeUpdate}`);
						});
					});
				});
			});
		} else {
			contents = contents.split('!GENERAL')[1];
			let general = contents.split('!CLIENTS')[0];
			let generalArray = general.split('\n');
			lastTimeUpdate = generalArray[3].split(' = ')[1];

			if (parseInt(lastTimeUpdate, 10) + 400 < moment.utc().format('YYYYMMDDHHmmss')) {
				var file = fs.createWriteStream('whazzup.txt.gz');
				var req = http.get('http://whazzup.ivao.aero/whazzup.txt.gz', function (response) {
					response.pipe(file);
					response.on("end", () => {
            functions.logger(`info`, `Whazzup downloaded`);
						const extract = inly(from, to);

						extract.on('end', () => {
              functions.logger(`info`, `Whazzup extracted`);
							fs.readFile('whazzup.txt', 'utf8', function (err, contents) {
								contents = contents.split('!GENERAL')[1];
								let general = contents.split('!CLIENTS')[0];
								let generalArray = general.split('\n');
								lastTimeUpdate = generalArray[3].split(' = ')[1];
								functions.logger(`info`, `Whazzup updated at ${lastTimeUpdate}`);
							});
						});
					});
				});
			} else {
				functions.logger(`info`, `Whazzup last updated at ${lastTimeUpdate}`);
			}
		}
	});
});

bot.on("guildCreate", guild => {
  functions.logger(`info`, `New guild added ${guild.name}, (guilds id is ${guild.id}). The guild added has ${guild.memberCount} members!`);

  let welcomeEmbed = new Discord.RichEmbed()
    .setTitle(`Hello ${guild.name} and thank you for choosing AvBot`)
    .setColor(successColor)
    .setDescription(`If you need any help regarding AvBot or have any suggestions join our [AvBot Support Server](${process.env.AvBotSupportServer}). To get started try ${prefix}help.`)
    .setFooter(`regards targaryen#6615`);

  guild.channels
    .filter(c => c.type === "text")
    .first()
    .send(welcomeEmbed)
    .then(functions.logger(`info`, `Sent Welcome Message to ${guild.name}.`));

  let time_join = moment.tz(guild.joined_at, "Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
  let owner = bot.users.find(user => user.id === guild.ownerID);
  let newGuildEmbed = new Discord.RichEmbed()
    .setTitle(`Bot Added to Guild`)
    .setColor(successColor)
    .addField(`Name`, `${guild.name}`)
    .addField(`ID`, `${guild.id}`)
    .addField(`Owner ID`, `${guild.ownerID}`)
    .addField(`Owner`, `${owner.username}#${owner.discriminator}`)
    .addField(`Members`, `${guild.memberCount}`)
    .addField(`Region`, `${guild.region}`)
    .setFooter(`Joined at ${time_join}`);

  bot.channels
    .find(channel => channel.id === process.env.GuildsChannel)
    .send(newGuildEmbed);
  
  Guild.create({guild_id: guild.id, guild_name: guild.name}, (err, guild) => {
    if(err) console.log(err);
    else console.log(guild);
  });
});

bot.on("guildDelete", guild => {
  functions.logger(`info`, `Guild Remove ${guild.name}, (guilds id is ${guild.id}). The guild added has ${guild.memberCount} members!`);

  let time_join = moment.tz(guild.joined_at, "Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
  let owner = bot.users.find(user => user.id === guild.ownerID);
  let removeGuildEmbed = new Discord.RichEmbed()
    .setTitle(`Bot Removed from Guild`)
    .setColor(errorColor)
    .addField(`Name`, `${guild.name}`)
    .addField(`ID`, `${guild.id}`)
    .addField(`Owner ID`, `${guild.ownerID}`)
    .addField(`Owner`, `${owner.username}#${owner.discriminator}`)
    .addField(`Members`, `${guild.memberCount}`)
    .addField(`Region`, `${guild.region}`)
    .setFooter(`Joined at ${time_join}`);

  bot.channels
    .find(channel => channel.id === process.env.GuildsChannel)
    .send(removeGuildEmbed);
});

bot.on("message", async msg => {
  if (msg.author.bot) return;

  let args = msg.content.split(" ");
  let cmd = args[0].toLowerCase();
  let ICAO = args[args.length - 1].toUpperCase();
  let tempParams = args.slice(1, args.length);
  let params = [];
  tempParams.forEach(ele => {
    if (ele != "") params[params.length] = ele;
  });

  let time = moment.utc();
	let timeform = time.format('YYYY-MM-DD HH:mm:ss Z');
	let timeform2 = time.format('HH:mm:ss');
  let timeform3 = time.format('DD/MM HH:mm');
  
  if(cmd == `${prefix}ivao` || cmd == `${prefix}online` || cmd == `${prefix}chart` || cmd == `${prefix}charts` || cmd == `${prefix}metar` || cmd == `${prefix}taf` || cmd == `${prefix}notam` || cmd == `${prefix}notams` || cmd == `${prefix}icao` || cmd == `${prefix}zulu` || cmd == `${prefix}brief` || cmd == `${prefix}link` || cmd == `${prefix}invite` || cmd == `${prefix}guild` || cmd == `${prefix}guilds` || cmd == `${prefix}purge` || cmd == `${prefix}uptime` || cmd == `${prefix}ping` || cmd == `${prefix}restart` || cmd == `${prefix}help`) {
    functions.logger(`message`, `[${msg.guild.name}] "${msg}" by ${msg.author.tag}`);
  }

  
  if (cmd == `${prefix}ivao`) {

		if (parseInt(lastTimeUpdate, 10) + 400 < moment.utc().format('YYYYMMDDHHmmss')) {
			var file = fs.createWriteStream('whazzup.txt.gz');
			var req = http.get('http://whazzup.ivao.aero/whazzup.txt.gz', function (response) {
				response.pipe(file);
				response.on("end", () => {
          functions.logger(`info`, `Whazzup downloaded`);
					const extract = inly(from, to);

					extract.on('end', () => {
            functions.logger(`info`, `Whazzup extracted`);
						fs.readFile('whazzup.txt', 'utf8', function (err, contents) {
							contents = contents.split('!GENERAL')[1];
							let general = contents.split('!CLIENTS')[0];
							contents = contents.split('!CLIENTS')[1];
							let clients = contents.split('!AIRPORTS')[0];
							contents = contents.split('!AIRPORTS')[1];
							let airports = contents.split('!SERVERS')[0];
							let servers = contents.split('!SERVERS')[1];

							let generalArray = general.split('\n');
							lastTimeUpdate = generalArray[3].split(' = ')[1];
              functions.logger(`info`, `Whazzup updated at ${lastTimeUpdate}`);
							let clientsArray = clients.split('\n');
							let presentFlag = false;
							clientsArray.forEach(client => {
								let decoded = client.split(':');
								if (decoded[0] == ICAO) {
									if (decoded[3] == 'PILOT') {
										presentFlag = true;
										let dt = 0;
										if (decoded[22].length == 2) {
											dt = '00' + ':' + decoded[22].substring(0, 2);
										} else if (decoded[22].length == 3) {
											dt = '0' + decoded[22].substring(0, 1) + ':' + decoded[22].substring(1, 3);
										} else {
											dt = decoded[22].substring(0, 2) + ':' + decoded[22].substring(2, 4);
										}
										let eeth = 0;
										if (decoded[24].length == 1) {
											eeth = '0' + decoded[24];
										} else {
											eeth = decoded[24];
										}
										let eetm = 0;
										if (decoded[25].length == 1) {
											eetm = '0' + decoded[25];
										} else {
											eetm = decoded[25];
										}
										let ivaoEmbed = new Discord.RichEmbed()
											.setTitle(`IVAO : ${ICAO}`)
											.setColor(successColor)
											.addField(`Call Sign`, `${decoded[0]}`, true)
											.addField(`VID`, `${decoded[1]}`, true)
											.addField(`Rating`, `${pilotRatings[decoded[41]]}`, true)
											.addField(`Departure`, `${decoded[11]}`, true)
											.addField(`Destination`, `${decoded[13]}`, true)
											.addField(`Transponder`, `${decoded[17]}`, true)
											.addField(`Latitude`, `${decoded[5]}`, true)
											.addField(`Longitude`, `${decoded[6]}`, true)
											.addField(`Altitude`, `${decoded[7]} ft`, true)
											.addField(`Groundspeed`, `${decoded[8]} Knots`, true)
											.addField(`Cruising Speed`, `${decoded[10]}`, true)
											.addField(`Cruising Level`, `${decoded[12]}`, true)
											.addField(`Departure Time`, `${dt} Zulu`, true)
											.addField(`EET`, `${eeth}:${eetm}`, true)
											.addField(`Aircraft`, `${decoded[9].split('/')[1]}`, true)
											.addField(`Route`, `${decoded[30]}`, true)
											.setFooter(`Source: IVAO API`);
                    
                    msg.channel.send(ivaoEmbed);
                    functions.logger(`info`, `IVAO details for ${ICAO} sent to ${msg.author.tag}`);
									} else if (decoded[3] == 'ATC') {
										presentFlag = true;

										var url = `${avwx}station/${ICAO.substring(0,4)}`
										request(url, function (err, response, body) {
											let info = JSON.parse(body);
											if (info.error) {
												let ivaoEmbed = new Discord.RichEmbed()
													.setTitle(`IVAO : ${ICAO}`)
													.setColor(successColor)
													.addField(`Call Sign`, `${decoded[0]}`, true)
													.addField(`VID`, `${decoded[1]}`, true)
													.addField(`Rating`, `${atcRatings[decoded[41]]}`, true)
													.addField(`Position`, `${facilityTypes[decoded[18]]}`, true)
													.addField(`Frequency`, `${decoded[4]}`, true)
													.addField(`ATIS`, `${decoded[35]}`, true)
													.setFooter(`Source: IVAO API`);
                        
                        msg.channel.send(ivaoEmbed);
                        functions.logger(`info`, `IVAO details for ${ICAO} sent to ${msg.author.tag}`);
											} else {
												let ivaoEmbed = new Discord.RichEmbed()
													.setTitle(`IVAO : ${info.city} ${facilityTypes2[decoded[18]]}`)
													.setColor(successColor)
													.addField(`Call Sign`, `${decoded[0]}`, true)
													.addField(`VID`, `${decoded[1]}`, true)
													.addField(`Rating`, `${atcRatings[decoded[41]]}`, true)
													.addField(`Position`, `${facilityTypes[decoded[18]]}`, true)
													.addField(`Frequency`, `${decoded[4]}`, true)
													.addField(`ATIS`, `${decoded[35]}`, true)
													.setFooter(`Source: IVAO API`);
                        
                        msg.channel.send(ivaoEmbed);
                        functions.logger(`info`, `IVAO details for ${ICAO} sent to ${msg.author.tag}`);
											}
										});
									}
                }
							});
							if (!presentFlag) {
								let ivaoErrorEmbed = new Discord.RichEmbed()
									.setTitle(`IVAO : ${ICAO}`)
									.setColor(errorColor)
									.setDescription(`No Pilot/ATC with Call Sign '${ICAO}' is online on IVAO network`)
									.setFooter(`Source: IVAO API`);
                
                msg.channel.send(ivaoErrorEmbed);
                functions.logger(`error`, `IVAO details requested by ${msg.author.tag} for ${ICAO} not available`);
							}
						});
					});
				});
			});
		} else {
			fs.readFile('whazzup.txt', 'utf8', function (err, contents) {
				contents = contents.split('!GENERAL')[1];
				let general = contents.split('!CLIENTS')[0];
				contents = contents.split('!CLIENTS')[1];
				let clients = contents.split('!AIRPORTS')[0];
				contents = contents.split('!AIRPORTS')[1];
				let airports = contents.split('!SERVERS')[0];
				let servers = contents.split('!SERVERS')[1];
				let clientsArray = clients.split('\n');
				let presentFlag = false;
				clientsArray.forEach(client => {
					let decoded = client.split(':');
					if (decoded[0] == ICAO) {
						if (decoded[3] == 'PILOT') {
							presentFlag = true;
							let dt = 0;
							if (decoded[22].length == 2) {
								dt = '00' + ':' + decoded[22].substring(0, 2);
							} else if (decoded[22].length == 3) {
								dt = '0' + decoded[22].substring(0, 1) + ':' + decoded[22].substring(1, 3);
							} else {
								dt = decoded[22].substring(0, 2) + ':' + decoded[22].substring(2, 4);
							}
							let eeth = 0;
							if (decoded[24].length == 1) {
								eeth = '0' + decoded[24];
							} else {
								eeth = decoded[24];
							}
							let eetm = 0;
							if (decoded[25].length == 1) {
								eetm = '0' + decoded[25];
							} else {
								eetm = decoded[25];
							}
							let ivaoEmbed = new Discord.RichEmbed()
								.setTitle(`IVAO : ${ICAO}`)
								.setColor(successColor)
								.addField(`Call Sign`, `${decoded[0]}`, true)
								.addField(`VID`, `${decoded[1]}`, true)
								.addField(`Rating`, `${pilotRatings[decoded[41]]}`, true)
								.addField(`Departure`, `${decoded[11]}`, true)
								.addField(`Destination`, `${decoded[13]}`, true)
								.addField(`Transponder`, `${decoded[17]}`, true)
								.addField(`Latitude`, `${decoded[5]}`, true)
								.addField(`Longitude`, `${decoded[6]}`, true)
								.addField(`Altitude`, `${decoded[7]} ft`, true)
								.addField(`Groundspeed`, `${decoded[8]} Knots`, true)
								.addField(`Cruising Speed`, `${decoded[10]}`, true)
								.addField(`Cruising Level`, `${decoded[12]}`, true)
								.addField(`Departure Time`, `${dt} Zulu`, true)
								.addField(`EET`, `${eeth}:${eetm}`, true)
								.addField(`Aircraft`, `${decoded[9].split('/')[1]}`, true)
								.addField(`Route`, `${decoded[30]}`, true)
								.setFooter(`Source: IVAO API`);
              
              msg.channel.send(ivaoEmbed);
              functions.logger(`info`, `IVAO details for ${ICAO} sent to ${msg.author.tag}`);
						} else if (decoded[3] == 'ATC') {
							presentFlag = true;

							var url = `${avwx}station/${ICAO.substring(0,4)}`
							request(url, function (err, response, body) {
								let info = JSON.parse(body);
								if (info.error) {
									let ivaoEmbed = new Discord.RichEmbed()
										.setTitle(`IVAO : ${ICAO}`)
										.setColor(successColor)
										.addField(`Call Sign`, `${decoded[0]}`, true)
										.addField(`VID`, `${decoded[1]}`, true)
										.addField(`Rating`, `${atcRatings[decoded[41]]}`, true)
										.addField(`Position`, `${facilityTypes[decoded[18]]}`, true)
										.addField(`Frequency`, `${decoded[4]}`, true)
										.addField(`ATIS`, `${decoded[35]}`, true)
										.setFooter(`Source: IVAO API`);
                  
                  msg.channel.send(ivaoEmbed);
                  functions.logger(`info`, `IVAO details for ${ICAO} sent to ${msg.author.tag}`);
								} else {
									let ivaoEmbed = new Discord.RichEmbed()
										.setTitle(`IVAO : ${info.city} ${facilityTypes2[decoded[18]]}`)
										.setColor(successColor)
										.addField(`Call Sign`, `${decoded[0]}`, true)
										.addField(`VID`, `${decoded[1]}`, true)
										.addField(`Rating`, `${atcRatings[decoded[41]]}`, true)
										.addField(`Position`, `${facilityTypes[decoded[18]]}`, true)
										.addField(`Frequency`, `${decoded[4]}`, true)
										.addField(`ATIS`, `${decoded[35]}`, true)
										.setFooter(`Source: IVAO API`);
                  
                  msg.channel.send(ivaoEmbed);
                  functions.logger(`info`, `IVAO details for ${ICAO} sent to ${msg.author.tag}`);
								}
							});
						}
					}
				});
				if (!presentFlag) {
					let ivaoErrorEmbed = new Discord.RichEmbed()
						.setTitle(`IVAO : ${ICAO}`)
						.setColor(errorColor)
						.setDescription(`No Pilot/ATC with Call Sign '${ICAO}' is online on IVAO network`)
						.setFooter(`Source: IVAO API`);
          
          msg.channel.send(ivaoErrorEmbed);
          functions.logger(`error`, `IVAO details requested by ${msg.author.tag} for ${ICAO} not available`);
				}
			});
		}
  }
  

  if (cmd == `${prefix}online`) {
    FIR = ICAO.substring(0,2);
    console.log(FIR);
		if (parseInt(lastTimeUpdate, 10) + 400 < moment.utc().format('YYYYMMDDHHmmss')) {
			var file = fs.createWriteStream('whazzup.txt.gz');
			var req = http.get('http://whazzup.ivao.aero/whazzup.txt.gz', function (response) {
				response.pipe(file);
				response.on("end", () => {
          functions.logger(`info`, `Whazzup downloaded`);
					const extract = inly(from, to);

					extract.on('end', () => {
            functions.logger(`info`, `Whazzup extracted`);
						fs.readFile('whazzup.txt', 'utf8', function (err, contents) {
							contents = contents.split('!GENERAL')[1];
							let general = contents.split('!CLIENTS')[0];
							contents = contents.split('!CLIENTS')[1];
							let clients = contents.split('!AIRPORTS')[0];
							contents = contents.split('!AIRPORTS')[1];
							let airports = contents.split('!SERVERS')[0];
							let servers = contents.split('!SERVERS')[1];

							let generalArray = general.split('\n');
							lastTimeUpdate = generalArray[3].split(' = ')[1];
              functions.logger(`info`, `Whazzup updated at ${lastTimeUpdate}`);
							let clientsArray = clients.split('\n');
              
              let presentFlag = false;
              let found = [];
							clientsArray.forEach(client => {
								let decoded = client.split(':');
								if (decoded[0].substring(0,2) == FIR) {
									if (decoded[3] == 'ATC') {
                    presentFlag = true;
                    let temp = {
                      callSign  : decoded[0],
                      vid       : decoded[1],
                      position  : facilityTypes[decoded[18]],
                      frequency : decoded[4],
                    }
                    found.push(temp);
									}
                }
              });
              if (presentFlag) {
                let onlineEmbed = new Discord.RichEmbed()
                  .setTitle(`IVAO : ${ICAO}`)
                  .setColor(successColor)
                  .setFooter(`Source: IVAO API`);
              
                found.forEach(ele => {
                onlineEmbed.addField(`${ele.callSign}`, `VID: ${ele.vid}, Frequency: ${ele.frequency}`);
                });
      
                msg.channel.send(onlineEmbed);
                functions.logger(`info`, `Online details for ${ICAO} FIR sent to ${msg.author.tag}`);
              } else {
								let onlineErrorEmbed = new Discord.RichEmbed()
									.setTitle(`IVAO : ${ICAO}`)
									.setColor(errorColor)
									.setDescription(`No ATC is online under ${ICAO} FIR on IVAO network`)
									.setFooter(`Source: IVAO API`);
                
                msg.channel.send(onlineErrorEmbed);
                functions.logger(`error`, `Online details requested by ${msg.author.tag} for ${ICAO} not available`);
							}
						});
					});
				});
			});
		} else {
			fs.readFile('whazzup.txt', 'utf8', function (err, contents) {
				contents = contents.split('!GENERAL')[1];
				let general = contents.split('!CLIENTS')[0];
				contents = contents.split('!CLIENTS')[1];
				let clients = contents.split('!AIRPORTS')[0];
				contents = contents.split('!AIRPORTS')[1];
				let airports = contents.split('!SERVERS')[0];
				let servers = contents.split('!SERVERS')[1];
        let clientsArray = clients.split('\n');
        
				let presentFlag = false;
        found = [];
        clientsArray.forEach(client => {
          let decoded = client.split(':');
          if (decoded[0].substring(0,2) == FIR) {
            if (decoded[3] == 'ATC') {
              presentFlag = true;
              temp = {
                callSign  : decoded[0],
                vid       : decoded[1],
                position  : facilityTypes[decoded[18]],
                frequency : decoded[4],
              }
              found.push(temp);
            }
          }
        });
        if (presentFlag) {
          let onlineEmbed = new Discord.RichEmbed()
            .setTitle(`IVAO : ${ICAO}`)
            .setColor(successColor)
            .setFooter(`Source: IVAO API`);
          
          found.forEach(ele => {
           onlineEmbed.addField(`${ele.callSign}`, `VID: ${ele.vid}, Frequency: ${ele.frequency}`);
          });

          msg.channel.send(onlineEmbed);
          functions.logger(`info`, `Online details for ${ICAO} FIR sent to ${msg.author.tag}`);
        } else {
          let onlineErrorEmbed = new Discord.RichEmbed()
            .setTitle(`IVAO : ${ICAO}`)
            .setColor(errorColor)
            .setDescription(`No ATC is online under ${ICAO} FIR on IVAO network`)
            .setFooter(`Source: IVAO API`);
          
          msg.channel.send(onlineErrorEmbed);
          functions.logger(`error`, `Online details requested by ${msg.author.tag} for ${ICAO} not available`);
        }
			});
		}
	}


  if (cmd == `${prefix}chart` || cmd == `${prefix}charts`) {
    if (args.length === 1) return;
    
      let options = {
        method: "HEAD",
        host: "vau.aero",
        port: 80,
        path: `/navdb/chart/${ICAO}.pdf`
      };

      let req = http.request(options, function (res) {
        if (res.statusCode == 200) {
          let chartsEmbed = new Discord.RichEmbed()
            .setTitle(`Chart for ${ICAO}`)
            .setColor(successColor)
            .setDescription(`[Click here for ${ICAO} Charts](http://vau.aero/navdb/chart/${ICAO}.pdf)`)
            .setFooter(`This is not a source for official charts. Please obtain an official chart from the appropriate agency`);

          msg.author.send(chartsEmbed);
          functions.logger(`info`, `${ICAO} charts sent to ${msg.author.tag}`);

          if (msg.guild != null) {
            chartsEmbed = new Discord.RichEmbed()
              .setTitle(`Chart for ${ICAO}`)
              .setColor(successColor)
              .setDescription(`${msg.author}, ${ICAO} chart has been sent to you`);

            msg.channel.send(chartsEmbed);
          }
        } else {

          request(`https://avbotserver4.herokuapp.com/chart/${ICAO}`, (err, res2, body) => {
						if (res2.statusCode == 200) {
							let chartsWebsiteLink2 = `https://avbotserver4.herokuapp.com/chart/${ICAO}`;
							let chartsEmbed = new Discord.RichEmbed()
                .setTitle(`Chart for ${ICAO}`)
                .setColor(successColor)
                .setDescription(`[Click here for ${ICAO} Charts](${chartsWebsiteLink2})`)
                .setFooter(`This is not a source for official charts. Please obtain an official chart from the appropriate agency`);

              msg.author.send(chartsEmbed);
              functions.logger(`info`, `${ICAO} charts sent to ${msg.author.tag}`);

              if (msg.guild != null) {
                chartsEmbed = new Discord.RichEmbed()
                  .setTitle(`Chart for ${ICAO}`)
                  .setColor(successColor)
                  .setDescription(`${msg.author}, ${ICAO} chart has been sent to you`);

                msg.channel.send(chartsEmbed);
              }
            } else {

              if (icao[ICAO]) {
                let chartErrorEmbed = new Discord.RichEmbed()
                  .setTitle(`Chart for ${ICAO}`)
                  .setColor(errorColor)
                  .setDescription(`Sorry ${msg.author}, ${ICAO} chart is not available in our database`);
  
                msg.channel.send(chartErrorEmbed);
                functions.logger(`warn`, `${msg.author.tag} asked for ${ICAO} charts but was not available in our database`);
              } else {
                let chartErrorEmbed = new Discord.RichEmbed()
                  .setTitle(`Chart for ${ICAO}`)
                  .setColor(errorColor)
                  .setDescription(`${msg.author}, ${ICAO} is not a valid ICAO`);
          
                msg.channel.send(chartErrorEmbed);
                functions.logger(`warn`, `${msg.author.tag} asked for ${ICAO} charts but ${ICAO} is an invalid ICAO`);
              }
            }
          })
        }
      });
      req.end();
    
  }


  if (cmd == `${prefix}metar`) {
    if (args.length === 1) return;

      let url = avwx + `metar/${ICAO}?options=info,translate,speech`;

      request(url, function (err, response, body) {
        let metar = JSON.parse(body);
        if (metar.error) {
          if (icao[ICAO]) {

            let metarErrorEmbed = new Discord.RichEmbed()
              .setTitle(`METAR for ${ICAO}`)
              .setColor(errorColor)
              .setDescription(`${msg.author}, no METAR station available at the moment near ${ICAO}`);

            msg.channel.send(metarErrorEmbed);
            functions.logger(`warn`, `${msg.author.tag} asked for ${ICAO} METAR but got error::: ${metar.error}`);
          } else {
            let metarErrorEmbed = new Discord.RichEmbed()
              .setTitle(`METAR for ${ICAO}`)
              .setColor(errorColor)
              .setDescription(`${msg.author}, ${ICAO} is not a valid ICAO `);
      
            msg.channel.send(metarErrorEmbed);
            functions.logger(`warn`, `${msg.author.tag} asked for ${ICAO} METAR but ${ICAO} is an invalid ICAO `);
          }
        } else {
          let raw = metar.raw;
          let readable = "";

          readable += `**Station : ** `;

          if (metar.info.icao) {
            readable += `${metar.info.icao}`;
          } else {
            readable += `${metar.station}`;
          }

          if (metar.info.name || metar.info.city) {
            readable += ` (`;
            if (metar.info.name) {
              readable += `${metar.info.name}`;
              if (metar.info.city) {
                readable += `, ${metar.info.city}`;
              }
            } else {
              if (metar.info.city) {
                readable += `${metar.info.city}`;
              }
            }
            readable += `)`;
          }

          readable += `\n`;

          readable += `**Observed at : ** ${moment.tz(metar.meta.timestamp, "Etc/Zulu").format("YYYY-MM-DD HH:mm:ss")} Z\n`;

          if (metar.wind_speed) {
            readable += `**Wind : **`;
            if (metar.wind_speed.value === 0) {
              readable += `Calm`;
            } else {
              if (metar.wind_variable_direction.length > 0) {
                readable += `${metar.wind_direction.spoken} (variable ${metar.wind_variable_direction[0].spoken} to ${metar.wind_variable_direction[1].spoken}) at ${metar.wind_speed.repr}${metar.units.wind_speed}`;
              } else {
                readable += `${metar.wind_direction.spoken} at ${metar.wind_speed.repr}${metar.units.wind_speed}`;
              }
            }
            readable += `\n`;
          }

          if (metar.wind_gust) {
            readable += `**Wind Gust : **${metar.wind_gust.spoken} \n`;
          }
          if (metar.visibility) {
            if (metar.visibility.value < 9999) {
              if (metar.units.visibility === "m") {
                if (metar.visibility.value < 1000) {
                  readable += `**Visibility : **${metar.visibility.spoken} meters \n`;
                } else if (metar.visibility.value > 1000) {
                  readable += `**Visibility : **${functions.ntw(Math.floor(metar.visibility.repr / 1000))} kilometers \n`;
                }
              } else if (metar.units.visibility === "sm") {
                readable += `**Visibility : **${metar.visibility.spoken} miles \n`;
              } else {
                readable += `**Visibility : **${metar.visibility.spoken} ${metar.units.visibility} \n`;
              }
            } else {
              readable += `**Visibility : ** one zero kilometers \n`;
            }
          }

          if (metar.temperature) {
            let temperatureInF = 0;
            if (metar.units.temperature === "C") {
              temperatureInF = metar.temperature.value * (9 / 5) + 32;
            }
            if (temperatureInF < 0) {
              temperatureInF = `minus ${functions.ntw(Math.floor(temperatureInF) * -1)}`;
            } else {
              temperatureInF = functions.ntw(temperatureInF);
            }
            readable += `**Temperature : **${metar.temperature.spoken} degrees Celcius (${temperatureInF} degrees Fahrenheit) \n`;
          }

          if (metar.dewpoint) {
            let dewpointInF = 0;
            if (metar.units.temperature === "C") {
              dewpointInF = metar.dewpoint.value * (9 / 5) + 32;
            }
            if (dewpointInF < 0) {
              dewpointInF = `minus ${functions.ntw(Math.floor(dewpointInF) * -1)}`;
            } else {
              dewpointInF = functions.ntw(dewpointInF);
            }
            readable += `**Dew Point : **${metar.dewpoint.spoken} degrees Celcius (${dewpointInF} degrees Fahrenheit) \n`;
          }

          if (metar.altimeter && metar.units.altimeter === "hPa") {
            let altimeterInHg = 0
            altimeterInHg = metar.altimeter.value / 33.8638866666667;
            altimeterInHg = functions.ntw(altimeterInHg);
            readable += `**Altimeter : ** ${metar.altimeter.spoken} in hPa (${altimeterInHg} in Hg) \n`;
          } else if (metar.altimeter && metar.units.altimeter === "inHg") {
            let altimeterInhPa = 0
            altimeterInhPa = metar.altimeter.value * 33.8638866666667;
            altimeterInhPa = functions.ntw(altimeterInhPa);
            readable += `**Altimeter : ** ${altimeterInhPa} in hPa (${metar.altimeter.spoken} in Hg) \n`;
          }

          if (metar.translate.clouds) {
            readable += `**Sky Condition : **\n`
            let clouds = metar.translate.clouds.split('-')
            if (clouds.length == 1) {
              readable += `${clouds[0]}\n`
            } else {
              clouds = clouds[0].split(', ')
              clouds.forEach(cloud => {
                readable += `${cloud}\n`
              });
            }
          }

          if (metar.translate.other) {
            readable += `**Weather Phenomena : **${metar.translate.other}\n`;
          }

          if (metar.flight_rules) {
            readable += `**Flight Rules : **${metar.flight_rules}`
          }

          let metarEmbed = new Discord.RichEmbed()
            .setTitle(`METAR for ${ICAO}`)
            .setColor(successColor)
            .addField("Raw Report", raw)
            .addField("Readable Report", readable)
            .setFooter(`This is not a source for official weather briefing. Please obtain a weather briefing from the appropriate agency `);

          msg.channel.send(metarEmbed);
          functions.logger(`info`, `${ICAO} METAR sent to ${msg.author.tag}`);
        }
      });
  }

  if (cmd == `${prefix}taf`) {
    if (args.length === 1) return;

      let url = avwx + `taf/${ICAO}?options=info,translate,speech`;

      request(url, function (err, response, body) {
        let taf = JSON.parse(body);
        if (taf.error) {
          if (icao[ICAO]) {
            let tafErrorEmbed = new Discord.RichEmbed()
              .setTitle(`TAF for ${ICAO}`)
              .setColor(errorColor)
              .setDescription(`${msg.author}, TAF not found for ${ICAO}. There might not be a current report in ADDS.`);

            msg.channel.send(tafErrorEmbed);
            functions.logger(`warn`, `${msg.author.tag} asked for ${ICAO} TAF but got error::: ${taf.error}`);
          } else {
            let tafErrorEmbed = new Discord.RichEmbed()
              .setTitle(`TAF for ${ICAO}`)
              .setColor(errorColor)
              .setDescription(`${msg.author}, ${ICAO} is not a valid ICAO `);
      
            msg.channel.send(tafErrorEmbed);
            functions.logger(`warn`, `${msg.author.tag} asked for ${ICAO} TAF but ${ICAO} is an invalid ICAO `);
          }
        } else {
          let raw = `**Raw Report**\n ${taf.raw}\n`;
          let readable = `${raw}\n **Readable Report**\n`;

          readable += `**Station : ** `;

          if (taf.info.icao) {
            readable += `${taf.info.icao}`;
          } else {
            readable += `${taf.station}`;
          }

          if (taf.info.name || taf.info.city) {
            readable += ` (`;
            if (taf.info.name) {
              readable += `${taf.info.name}`;
              if (taf.info.city) {
                readable += `, ${taf.info.city}`;
              }
            } else {
              if (taf.info.city) {
                readable += `${taf.info.city}`;
              }
            }
            readable += `)`;
          }

          readable += `\n`;

          readable += `**Observed at : ** ${moment.tz(taf.meta.timestamp, "Etc/Zulu").format("YYYY-MM-DD HH:mm:ss")} Z\n`;

          readable += `**Report : ** \n${taf.speech}`;

          let tafEmbed = new Discord.RichEmbed()
            .setTitle(`TAF for ${ICAO}`)
            .setColor(successColor)
            .setDescription(readable)
            .setFooter(`This is not a source for official weather briefing. Please obtain a weather briefing from the appropriate agency `);

          msg.channel.send(tafEmbed);
          functions.logger(`info`, `${ICAO} TAF sent to ${msg.author.tag}`);
        }
      })

  }

  if (cmd == `${prefix}notam` || cmd == `${prefix}notams`) {
    if (args.length === 1) return;

      notams(`${ICAO}`, {
        format: 'DOMESTIC'
      }).then(result => {
        if (result[0].notams[1]) {
          let notamEmbed = new Discord.RichEmbed()
            .setTitle(`NOTAMs for ${result[0].icao}`)
            .setColor(successColor)
            .setDescription(`${result[0].notams[1]}`)
            .setFooter('This is not a source for official briefing. Please use the appropriate forums');
          
          msg.channel.send(notamEmbed);
          functions.logger(`info`, `${ICAO} NOTAM sent to ${msg.author.tag}`);
        } else {
          if (icao[ICAO]) {

            let notamErrorEmbed = new Discord.RichEmbed()
              .setTitle(`NOTAMs for ${ICAO}`)
              .setColor(errorColor)
              .setDescription(`${msg.author}, NOTAM not found for ${ICAO}.`);

            msg.channel.send(notamErrorEmbed);
            functions.logger(`warn`, `${msg.author.tag} asked for ${ICAO} NOTAM but NOTAM not available.`);
          } else {
            let notamErrorEmbed = new Discord.RichEmbed()
              .setTitle(`NOTAMs for ${ICAO}`)
              .setColor(errorColor)
              .setDescription(`${msg.author}, ${ICAO} is not a valid ICAO `);
      
            msg.channel.send(notamErrorEmbed);
            functions.logger(`warn`, `${msg.author.tag} asked for ${ICAO} NOTAMs but ${ICAO} is an invalid ICAO `);
          }
        }
      });
    
  }
  
  if (cmd == `${prefix}icao`) { 
    if (args.length === 1) return;

      let url = avwx + `station/${ICAO}`;

      request(url, function (err, response, body) {
        let info = JSON.parse(body);
        if (info.error) {
          if (icao[ICAO]) {
            let icaoErrorEmbed = new Discord.RichEmbed()
              .setTitle(`${ICAO}`)
              .setColor(errorColor)
              .setDescription(`${msg.author}, Information not available for ${ICAO}`);

            msg.channel.send(icaoErrorEmbed);
            functions.logger(`warn`, `${msg.author.tag} asked for ${ICAO} Info but got error::: ${info.error}`);
          } else {
            let icaoErrorEmbed = new Discord.RichEmbed()
              .setTitle(`${ICAO}`)
              .setColor(errorColor)
              .setDescription(`${msg.author}, ${ICAO} is not a valid ICAO`);
      
            msg.channel.send(icaoErrorEmbed);
            functions.logger(`warn`, `${msg.author.tag} asked for ${ICAO} Info but ${ICAO} is an invalid ICAO `);
          }
        } else {
          let icaoEmbed = new Discord.RichEmbed()
            .setTitle(`${ICAO}`)
            .setColor(successColor)
            if(info.icao) {
              icaoEmbed.addField(`ICAO`, info.icao, true)
            }
            if(info.iata) {
              icaoEmbed.addField(`IATA`, info.iata, true)
            }
            if(info.name) {
              icaoEmbed.addField(`Name`, info.name)
            }
            if(info.city) {
              icaoEmbed.addField(`City`, info.city, true)
            }
            if(info.country) {
              icaoEmbed.addField(`Country`, info.country, true)
            }
            if(info.type) {
              icaoEmbed.addField(`Type`, `${functions.capsFirst(info.type.split('_')[0])} Airport`, true)
            }
            if(info.latitude) {
              icaoEmbed.addField(`Latitude`, info.latitude, true)
            }
            if(info.longitude) {
              icaoEmbed.addField(`Longitude`, info.longitude, true)
            }
            if(info.elevation_ft) {
              icaoEmbed.addField(`Elevation`, `${info.elevation_ft} ft`, true)
            }
            if(info.runways) {
              let r = info.runways;
              let runways = "";
              r.forEach(rw => {
                if(rw.length_ft!=0 && rw.width_ft!=0) {
                  runways += `${rw.ident1}-${rw.ident2} : Length - ${rw.length_ft}, Width - ${rw.width_ft}\n`
                } else {
                  runways += `${rw.ident1}-${rw.ident2} : Length - NA, Width - NA\n`
                }
              });
              icaoEmbed.addField(`Runways`, runways)
            }
            if(info.website || info.wiki) {
              let links = '';
              if(info.website) {
                links += `Official Website: ${info.website}`;
                if(info.wiki) {
                links += `\nWikipedia: ${info.wiki}`;
                }
              } else if(info.wiki) {
                links += `\nWikipedia: ${info.wiki}`;
              }
              icaoEmbed.addField(`More Info`, links)
            }

            msg.channel.send(icaoEmbed);
            functions.logger(`info`, `${ICAO} Info sent to ${msg.author.tag}`);
        }
      })
    
  }

  if (cmd == `${prefix}zulu`) {
    if (args.length === 1) {
      let zuluEmbed = new Discord.RichEmbed()
				.setTitle('ZULU Time')
        .setColor(successColor)
				.setDescription(`${timeform3} Z`)
        
      msg.channel.send(zuluEmbed);
      functions.logger(`info`, `Zulu time sent to ${msg.author.tag}`);
    } else {
      if(params.length == 2) {

        ICAO = params[0].toUpperCase();
        let timeParam = params[1];
        var hh = parseInt(timeParam[0] + timeParam[1]);
        var mm = parseInt(timeParam[2] + timeParam[3]);
        
        if (icao[ICAO]) {
          if ((hh < 0 || hh > 23) || (mm < 0 || mm > 59) || timeParam.length > 4) {
            let zuluErrorEmbed = new Discord.RichEmbed()
              .setTitle(`ZULU Time`)
              .setColor(errorColor)
              .setDescription(`${timeParam} is not a valid time`)
              .setFooter(`Hint: Time should be in 24 hours and of format HHMM`)

            msg.channel.send(zuluErrorEmbed);
            functions.logger(`warn`, `${msg.author.tag} asked for ZULU Time at ${ICAO} but ${timeParam} is not a valid time`);
          } else {
            var latLong = icao[ICAO];
            var lat = latLong[0];
            var long = latLong[1];
            let url = `http://api.geonames.org/timezoneJSON?formatted=true&lat=${lat}&lng=${long}&username=targaryen&style=full`;
            request(url, function (err, response, body) {
              if (err) {
                let state = false;
              } else {
                body = JSON.parse(body);
                var timeZone = body.timezoneId;
                var timeTemp = time.format('YYYY-MM-DD ');
                if (hh < 10) {
                  hh = "0" + hh;
                }
                if (mm < 10) {
                  mm = "0" + mm;
                }
                timeTemp += hh + ":" + mm;
                timeTemp = moment.tz(timeTemp, timeZone);
                let timeToSend = timeTemp.utc().format('DD/MM HH:mm');
                
                let zuluEmbed = new Discord.RichEmbed()
                  .setTitle(`ZULU time at ${ICAO} when local time is ${timeParam}hrs`)
                  .setColor(successColor)
                  .setDescription(`${timeToSend} Z`)
                
                msg.channel.send(zuluEmbed);
                functions.logger(`info`, `ZULU ${ICAO} ${timeParam} sent to ${msg.author.tag}`);
              }
            });
          }
        } else {
          let zuluErrorEmbed = new Discord.RichEmbed()
            .setTitle(`ZULU Time`)
            .setColor(errorColor)
            .setDescription(`${msg.author}, ${ICAO} is not a valid ICAO`)
        
          msg.channel.send(zuluErrorEmbed);
          functions.logger(`warn`, `${msg.author.tag} asked for ZULU Time at ${ICAO} but ${ICAO} is an invalid ICAO `);
        }
        
      } else {
				let zuluErrorEmbed = new Discord.RichEmbed()
					.setTitle(`ZULU Time`)
					.setColor(errorColor)
          .setDescription(`${msg.author}, Invalid Arguments`)
          .setFooter(`Hint : ${prefix}zulu [ICAO] [Local Time]`)
        
        msg.channel.send(zuluErrorEmbed);
        functions.logger(`warn`, `${msg.author.tag} asked for Zulu time but arguments were invalid`);
			}
    }
  }

  if (cmd == `${prefix}brief`) {
    if (args.length === 1) return;

      let metarURL = avwx + `metar/${ICAO}?options=info,translate,speech`;
			let chartURL = `http://vau.aero/navdb/chart/${ICAO}.pdf`;

      let metarAvailable = true;
      let chartAvailable = true;
      
      request(metarURL, function (err, response, body) {
        let metar = JSON.parse(body);
        let readableMetar  = "";
        if (metar.error) {
          metarAvailable = false;
        } else {
          rawMetar = metar.raw;
          readableMetar = metar.speech;
        }

        let options = {
          method: "HEAD",
          host: "vau.aero",
          port: 80,
          path: `/navdb/chart/${ICAO}.pdf`
        };
  
        let req = http.request(options, function (res) {
          if (res.statusCode != 200) { 
            chartAvailable = false;
          }

          if (metarAvailable || chartAvailable) {
            let briefEmbed = new Discord.RichEmbed()
              .setTitle(`Briefing for ${ICAO}`)
              .setColor(successColor)
              .setFooter('This is not a source for official briefing. Please use the appropriate forums.')

            if (metarAvailable) {
              briefEmbed.addField(`**METAR**`, `**Raw Report**\n${rawMetar}\n**Readable Report**\n${readableMetar}`)
            }

            if (chartAvailable) {
              briefEmbed.addField(`**CHART**`, `[Click here for ${ICAO} Charts](${chartURL})`)
            }

            briefEmbed.addField(`**Zulu**`, `${timeform3} Z`)

            msg.channel.send(briefEmbed);
            functions.logger(`info`, `${ICAO} Briefing sent to ${msg.author.tag}`);
          } else {
            if (icao[ICAO]) {
              let briefErrorEmbed = new Discord.RichEmbed()
                .setTitle(`Briefing for ${ICAO}`)
                .setColor(errorColor)
                .setDescription(`${msg.author}, no briefing available for ${ICAO}`)

              msg.channel.send(briefErrorEmbed);
              functions.logger(`warn`, `${msg.author.tag} asked for briefing ${ICAO} but briefing not available`);
            } else {
              let briefErrorEmbed = new Discord.RichEmbed()
                .setTitle(`Briefing for ${ICAO}`)
                .setColor(errorColor)
                .setDescription(`${msg.author}, ${ICAO} is not a valid ICAO`)
            
              msg.channel.send(briefErrorEmbed);
              functions.logger(`warn`, `${msg.author.tag} asked for briefing ${ICAO} but ${ICAO} is an invalid ICAO `);
            }
          }
        });
        req.end();
      })
    
  }

  if (cmd == `${prefix}link`) {
    var inviteURL = `https://discordapp.com/oauth2/authorize?client_id=${bot.user.id}&scope=bot&permissions=251904`;

    let linkEmbed = new Discord.RichEmbed()
      .setTitle('AvBot Link')
      .setColor(successColor)
      .setDescription(`[Click here to add AvBot to your Discord server](${inviteURL})`)

    msg.author.send(linkEmbed);
    functions.logger(`info`, `Bot link sent to ${msg.author.tag}`);

    if (msg.guild != null) {
      let linkEmbed2 = new Discord.RichEmbed()
        .setTitle('AvBot Link')
        .setColor(successColor)
        .setDescription(`${msg.author}, link for adding **AvBot** to your Discord server has been sent to you.`)

      msg.channel.send(linkEmbed2);
    
    }
	}

	if (cmd == `${prefix}invite`) {

    var inviteEmbed = new Discord.RichEmbed()
      .setTitle('AvBot Support Server')
      .setColor(successColor)
      .setDescription(`[Click here to join our AvBot Support Server](${process.env.AvBotSupportServer})`)
    
    msg.author.send(inviteEmbed);
    functions.logger(`info`, `Server link sent to ${msg.author.tag}`);

    if (msg.guild != null) {
      let inviteEmbed2 = new Discord.RichEmbed()
        .setTitle('AvBot Support Server')
        .setColor(successColor)
        .setDescription(`${msg.author}, link for joining our **AvBot Support Server** has been sent to you.`)
    
      msg.channel.send(inviteEmbed2);
    }
	}
  
  if(cmd == `${prefix}guild` || cmd == `${prefix}guilds`) {
    if (msg.author.id !== process.env.myID) {
      functions.logger(`error`, `${msg.author.tag} tried to check guilds`);
      return;
    }
    
    let guildsEmbed = new Discord.RichEmbed()
      .setTitle(`AvBot Guilds`)
      .setColor(successColor)
      .setDescription(`\`\`\`${bot.guilds.size}\`\`\``)

    msg.channel.send(guildsEmbed);
    functions.logger(`info`, `Guilds sent to ${msg.author.tag}`);
  }

  if (cmd == `${prefix}purge`) {
    if (msg.author.id !== process.env.myID) {
      functions.logger(`error`, `${msg.author.tag} tried to delete messages `);
      return;
    }
    async function clear() {
      msg.delete();
      const fetched = await msg.channel.fetchMessages({
        limit: 50
      });
      msg.channel.bulkDelete(fetched);
    }
    clear();
    functions.logger(`info`, `Messages deleted by ${msg.author.tag}`);
  }

  if (cmd == `${prefix}uptime`) {
    if (msg.author.id !== process.env.myID) {
      functions.logger(`error`, `${msg.author.tag} tried to check uptime `);
      return;
    }
    let totalSeconds = bot.uptime / 1000;
    let hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds % 60;
    let uptimeEmbed = new Discord.RichEmbed()
      .setTitle("AvBot Uptime")
      .setColor(successColor)
      .setDescription(`\`\`\`${hours} hrs, ${minutes} mins, ${~~seconds} secs.\`\`\``)
      .setFooter("Wowie, maybe this is the longest time AvBot has been up?!?!?!!");

    msg.channel.send(uptimeEmbed);
    functions.logger(`info`, `Sent uptime (${hours} hrs, ${minutes} mins, ${~~seconds} secs) to ${msg.author.tag}`);
  }

  if (cmd == `${prefix}ping`) {
    if (msg.author.id !== process.env.myID) {
      functions.logger(`error`, `${msg.author.tag} tried to ping`);
      return;
    }
    let temp = new Discord.RichEmbed()
      .setTitle("🏓 Ping!")
      .setColor([53, 254, 75]);

    let editMsg = await msg.channel.send(temp);
    let pingEmbed = new Discord.RichEmbed()
      .setTitle("🏓 Pong!")
      .setColor([53, 254, 75])
      .addField("Roundtrip", `${editMsg.createdTimestamp - msg.createdTimestamp}ms`, true)
      .addField("Heartbeat", `${~~bot.ping}ms`, true);
    editMsg.edit(pingEmbed);
    functions.logger(`info`, `Sent ping (Roundtrip: ${editMsg.createdTimestamp - msg.createdTimestamp}ms, Heartbeat: ${~~bot.ping}ms) to ${msg.author.tag}`);
  }

  if (cmd == `${prefix}restart`) {
    if (msg.author.id !== process.env.myID) {
      functions.logger(`error`, `${msg.author.tag} tried to restart the bot`);
      return;
    }
    let restartEmbed = new Discord.RichEmbed()
      .setTitle("Restarting...")
      .setColor(errorColor);

    await msg.channel
      .send(restartEmbed)
      .then(message => bot.destroy())
      .then(() => bot.login(process.env.token))
      .then(message => {
        msg.channel.lastMessage.delete();
      });
    functions.logger(`info`, `Manually restarted the bot by ${msg.author.tag}`);
  }

  // if (cmd == `${prefix}leave`) {
  //   if (msg.author.id !== msg.guild.ownerID || msg.guild.id === process.env.supportServerID) {
  //     functions.logger(`error`, `${msg.author.tag} tried to remove the bot from ${msg.guild.name}`);
  //     return;
  //   }
  //   msg.guild.leave();
  //   functions.logger(`info`, `${msg.author.tag} removed the bot from ${msg.guild.name}`);
  // }


  if (cmd == `${prefix}help`) {

		let helpEmbed = new Discord.RichEmbed()
			.setTitle('AvBot to the rescue!')
			.setColor(successColor)
			.addField(`${prefix}help`, `This command...`)
			.addField(`${prefix}chart [ICAO]`, `Example \”${prefix}chart VABB\". Gives you the latest chart of the chosen airport.`)
			.addField(`${prefix}metar [ICAO]`, `Example \"${prefix}metar VABB\". Gives you live METAR of the chosen airport.`)
			.addField(`${prefix}taf [ICAO]`, `Example \"${prefix}taf VABB\". Gives you live TAF of the chosen airport.`)
			.addField(`${prefix}notam [ICAO]`, `Example \"${prefix}notam VABB\". Gives you live NOTAMs of the chosen airport.`, true)
			.addField(`${prefix}brief [ICAO]`, `Example \"${prefix}brief VABB\". Gives you live METAR, TAF and the latest chart of the chosen airport.`)
			.addField(`${prefix}icao [ICAO]`, `Example \"${prefix}icao VABB\". Gives you information of the chosen airport.`)
			.addField(`${prefix}ivao [CALLSIGN]`, `Example \"${prefix}ivao AIC001\" or \"${prefix}ivao VIDP_TWR\". Gives you information about the chosen call sign on the IVAO network.`)
			.addField(`${prefix}online [FIR]`, `Example \"${prefix}online VABF\". Gives you information about all ATCs online under the chosen FIR on the IVAO network (currently matches by first two characters) [Under Development].`)
			.addField(`${prefix}zulu`, `Gives you the current Zulu time.`)
			.addField(`${prefix}zulu [ICAO] [Local Time]`, `Example \"${prefix}zulu VABB 1350\". Gives you the Zulu time at the airport at the specified local time in 24hrs.`)
			.addField(`${prefix}link`, `Gives you the link to add AvBot to your Discord server.`)
			.addField(`${prefix}invite`, `Gives you the invite link to join our AvBot Support Server.`)

    msg.channel.send(helpEmbed);
    functions.logger(`info`, `Help message sent to ${msg.author.tag}`);
	}
});

bot.login(process.env.token);
