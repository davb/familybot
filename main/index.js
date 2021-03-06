import 'babel-polyfill'
import express from 'express'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'
import vhost from 'vhost'
dotenv.load({silent: process.env.NODE_ENV === 'production'})


const app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
app.set('port', process.env.PORT || 5000)


// Import controllers for each bot
import learningbot from './learningbot'
import moodbot from './moodbot'
import newsbot from './newsbot'


// Map each bot to its own hostname
// For development you can use ngrok and set up a dedicated *.ngrok.io domain for each bot
// For production, you should set up your DNS to point different domain names to your server
const botSetups = [
  {controller: learningbot, hostname: (process.env.LEARNINGBOT_HOSTNAME || 'learningbot.local')},
  {controller: moodbot, hostname: (process.env.MOODBOT_HOSTNAME || 'moodbot.local')},
  {controller: newsbot, hostname: (process.env.NEWSBOT_HOSTNAME || 'newsbot.local')},
]


// Mount the bots on the main app
botSetups.forEach(({controller, hostname}) => {
  console.log(`Mounting ${controller.config.app_name} bot on ${hostname}`)
  // create a dedicated express app for the bot
  const botApp = express()
  // force port and hostname, used by botkit
  controller.config.port = app.get('port')
  controller.config.hostname = hostname
  // use botkit to set up endpoints on the dedicated app
  controller
    .createWebhookEndpoints(botApp)
    .createHomepageEndpoint(botApp)
    .createOauthEndpoints(botApp, (err, req, res) => {
      if (err) return res.status(500).send('ERROR: ' + err)
      res.send('Success!')
    })
  // mount the botApp on the main app, on its own hostname
  app.use(vhost(hostname, botApp))
})


// Start the main app
app.listen(app.get('port'), () => {
  console.log(`Family of ${botSetups.length} bots listening on port ${app.get('port')}!`)
})
