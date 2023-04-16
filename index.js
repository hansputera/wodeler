require('dotenv/config');

const {
    default: makeWASocket, Browsers, DisconnectReason
} = require('@gampang-pkg/baileys-edge');
const { Odesus } = require('odesus');
const { generateKey, useSafeMultiAuthState } = require('safe-usemultiauthstate');
const { prefixes, limits, otakudesuUrl } = require('./config.js');
const resolveDesuUrl = require('./resolve-desu-url.js');

/**
 * @param {string} text Text want to parse
 * @return {{ prefix: string, command: string, args: string[]} | undefined}
 */
const parseText = (text) => {
    for (const prefix of prefixes)
    {
        if (text.startsWith(prefix.toLowerCase()))
        {
            const [command, ...args] = text.slice(prefix.length).trim().split(/\s+/g);
            return { prefix, command, args };
        }
    }

    return undefined;
}

/**
 * @param {ReturnType<makeWASocket>} sock Socket
 */
async function create_socket(sock)
{
    const authKey = await generateKey(process.env.KEY, process.env.SALT);
    const auth = await useSafeMultiAuthState(authKey, 'sessions');

    sock = makeWASocket({
        auth: auth.state,
        browser: Browsers.ubuntu('Firefox'),
        printQRInTerminal: true,
    });
    const ods = new Odesus(otakudesuUrl);

    sock.ev.on('creds.update', auth.saveCreds);
    sock.ev.on('connection.update', conn => {
        if (conn.lastDisconnect?.error?.output) {
            switch(conn.lastDisconnect.error?.output.statusCode) {
                case DisconnectReason.loggedOut:
                    console.log('Logged out');
                    sock.ws.close();
                    break;
                case DisconnectReason.badSession:
                case DisconnectReason.restartRequired:
                    create_socket(sock);
                default:
                    console.log('unhandled disconnectReason');
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages.at(0);
        if (!msg) return;

        const parses = parseText(msg.message?.conversation || msg.message?.extendedTextMessage?.text || '');
        if (!parses) return;

        switch(parses.command)
        {
            case 's':
            case 'search':
            case 'cari':
            case 'c':
                const query = parses.args.join(' ');
                if (!query.length) return;

                const results = await ods.search(query);
                if (!results.length) {
                    await sock.sendMessage(msg.key.remoteJid, {
                        text: 'No results found'
                    }, {
                        quoted: msg,
                    });
                    return;
                }
                await sock.sendMessage(msg.key.remoteJid, {
                    text: `*Search results for ${query}*\n\n${results.map((r, i) => `${i + 1}. ${r.name} (${r.url})`).join('\n\n')}`,
                }, { quoted: msg });
            
            case 'i':
            case 'info':
            case 'infoanime':
            case 'anime':
                const url = parses.args.at(0);
                if (!url) return;

                const slug = await resolveDesuUrl(url);
                if (slug?.type !== 'anime') return;

                const anime = await ods.getAnimeInfo(slug);
                if (!anime) return;

                anime.episodes = anime.episodes.filter(x => !/batch/gi.test(x.url));
                await sock.sendMessage(msg.key.remoteJid, {
                    text: `*${anime.name}*\n\n${anime.synopsis}\n\n*Genres:*\n${anime.genres.map(x => x.name).join(', ')}\n\n*Status:*\n${anime.status}\n\n*Rating:*\n${anime.rating}\n\n*Episodes:*\n${anime.episodes.slice(0, 5).map(
                        (e, i) => `     ${i + 1}. ${e.title} (${e.url})`
                    ).join('\n')}\n\n*Duration:*\n${anime.duration}\n\n*Release:*\n${anime.releasedAt}\n\n*Studio:*\n${anime.studio}\n\n*Link:*\n${anime.url}`,
                    image: {
                        url: anime.image,
                    },
                }, { quoted: msg });
            default:
                return;
        }
    });
}

void create_socket({});
