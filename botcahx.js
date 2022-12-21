

var {
    default: makeWASocket, 
    fetchLatestBaileysVersion, 
    MessageRetryMap, 
    useMultiFileAuthState, 
    DisconnectReason, 
    delay
} = require('@api/whatsapp')
let P = require('pino')
const msgRetryCounterMap = MessageRetryMap || { }

var startSock = async() => {
    var { 
     state,
     saveCreds
 } = await useMultiFileAuthState('sessions')
	var { 
          version, 
           isLatest
               } = await fetchLatestBaileysVersion()
	console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`)
	
    const sock = makeWASocket({
		version,
		logger: P({ level: 'silent' }),
		printQRInTerminal: true,
		auth: state,
		markOnlineOnConnect: false
	})
	sock.ev.process(
		async(events) => {
			if(events['connection.update']) {
				const update = events['connection.update']
				const { connection, lastDisconnect } = update
				if(connection === 'close') {
					if ((lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut) {
						await startSock()
					} else {
					    console.log('Connection closed. You are logged out.')
					}
				}
				console.log('connection update', update)
			}
			if(events['presence.update']) {
				await sock.sendPresenceUpdate('unavailable')
			}
			if(events['messages.upsert']) {
			  const upsert = events['messages.upsert']
			  console.log(JSON.stringify(upsert, '', 2))
			  for (let msg of upsert.messages) {
				if (msg.key.remoteJid === 'status@broadcast') return
              }
			}
			if(events['creds.update']) {
				await saveCreds()
			}


		}
	)

	return sock
}

startSock()
process.on('uncaughtException', console.error)
