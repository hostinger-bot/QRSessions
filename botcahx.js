/**
© BOTCAHX 
Minimal kasih credits kalo mau repost☕
Thanks to AzRyCb
**/
var {
    default: WASocket,
    fetchLatestBaileysVersion,
    MessageRetryMap,
    useMultiFileAuthState,
    DisconnectReason
} = require("@api/whatsapp");
var pino = require("pino");
var msgRetryCounterMap = MessageRetryMap || {}
var startSock = async () => {
    var {
        state,
        saveCreds
    } = await useMultiFileAuthState('sessions')
    var {
        version,
        isLatest
    } = await fetchLatestBaileysVersion()
    console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`)
    var sock = WASocket({
        browser: ['Baileys', 'Chrome', ''], //cutom nama,browser,version
        version,
        logger: pino({
        level: 'silent'
        }),
        printQRInTerminal: true,
        auth: state,
        markOnlineOnConnect: false,
        connectTimeoutMs: 60_000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000
    })
    sock.ev.process(async (events) => {
        if (events['connection.update']) {
            var update = events['connection.update']
            var {
                connection,
                lastDisconnect
            } = update
            if (connection === 'close') {
                if ((lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut) {
                    await startSock()
                }
                else {
                    console.log('Connection closed. You are logged out.')
                }
            }
            console.log('connection update', update)
        }
        if (events['presence.update']) {
            await sock.sendPresenceUpdate('unavailable')
        }
        if (events['messages.upsert']) {
            var upsert = events['messages.upsert']
            console.log(JSON.stringify(upsert, '', 2))
            for (var msg of upsert.messages) {
                if (msg.key.remoteJid === 'status@broadcast') return
            }
        }
        if (events['creds.update']) {
            await saveCreds()
        }
    })
    return sock
}
startSock()
process.on('uncaughtException', console.error)
