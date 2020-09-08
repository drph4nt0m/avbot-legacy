const {
  ShardingManager
} = require('discord.js');
const dotenv = require('dotenv');

dotenv.config();

const manager = new ShardingManager('./bot.js', {
  token: process.env.TOKEN
});

manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));
manager.spawn();