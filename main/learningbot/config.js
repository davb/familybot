/**
 * Created by thomasjeanneau on 08/02/2017.
 */

import localTunnel from 'localtunnel'
import Botkit from 'mangrove-botkit'
import BotkitStorageMongo from 'botkit-storage-mongo'

const _bots = {}
const {
  LEARNINGBOT_SLACK_CLIENT_ID,
  LEARNINGBOT_SLACK_CLIENT_SECRET,
  LEARNINGBOT_PORT,
  LEARNINGBOT_MONGODB_URI,
  NODE_ENV
} = process.env

if (!LEARNINGBOT_SLACK_CLIENT_ID || !LEARNINGBOT_SLACK_CLIENT_SECRET || !LEARNINGBOT_PORT || !LEARNINGBOT_MONGODB_URI || !NODE_ENV) {
  console.log('Error: Specify LEARNINGBOT_SLACK_CLIENT_ID, LEARNINGBOT_SLACK_CLIENT_SECRET, LEARNINGBOT_PORT and LEARNINGBOT_MONGODB_URI in a .env file')
  process.exit(1)
}

if (NODE_ENV === 'DEVELOPMENT') {
  const tunnel = localTunnel(LEARNINGBOT_PORT, {subdomain: 'familybot'}, (err, tunnel) => {
    if (err) console.log(err)
    console.log(`Bots running at the url: ${tunnel.url}`)
  })
  tunnel.on('close', () => {
    console.log('Tunnel is closed')
  })
}

const trackBot = (bot) => {
  _bots[bot.config.token] = bot
}

const mongoStorage = new BotkitStorageMongo({
  mongoUri: LEARNINGBOT_MONGODB_URI
})

const controller = Botkit.slackbot({
  debug: false,
  interactive_replies: true,
  require_delivery: true,
  storage: mongoStorage,
  app_name: 'learningbot'
})

controller.configureSlackApp({
  clientId: LEARNINGBOT_SLACK_CLIENT_ID,
  clientSecret: LEARNINGBOT_SLACK_CLIENT_SECRET,
  scopes: ['bot', 'chat:write:bot', 'groups:history', 'groups:read', 'groups:write', 'users:read', 'users:read.email']
})

controller.on('create_bot', (bot, config) => {
  if (_bots[bot.config.token]) {
    // already online! do nothing.
  } else {
    bot.startRTM((err) => {
      if (!err) trackBot(bot)
      bot.startPrivateConversation({user: config.createdBy}, (err, convo) => {
        if (err) return console.log(err)
        convo.say('I am a bot that has just joined your team')
        convo.say('You must now /invite me to a channel so that I can be of use!')
      })
    })
  }
})

controller.on('rtm_open', () => {
  console.log('** The RTM api just connected!')
})

controller.on('rtm_close', () => {
  console.log('** The RTM api just closed')
})

controller.storage.teams.all((err, teams) => {
  if (err) throw new Error(err)
  for (let t in teams) {
    if (teams[t].bot) {
      controller.spawn(teams[t]).startRTM((err, bot) => {
        if (err) return console.log('Error connecting bot to Slack:', err)
        trackBot(bot)
      })
    }
  }
})

export { controller }
