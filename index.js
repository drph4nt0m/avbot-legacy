const {
  ShardingManager
} = require('discord.js');
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const manager = new ShardingManager('./bot.js', {
  token: process.env.TOKEN
});

manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));
manager.spawn();

const app = express();

app.get('/', (req, res) => {
  res.sendFile(path.join(`${__dirname}/index.html`));
});

app.listen(process.env.PORT || 4040, () => console.log(`AvBot Started`));

console.log(`Environment: ${app.get('env')}`);