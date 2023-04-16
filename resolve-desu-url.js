const { Util } = require('odesus');
const { otakudesuUrl } = require('./config.js');

module.exports = async (url) => {
    try {
        const originUrl = new URL(otakudesuUrl);
        const targetUrl = new URL(url);

        if (originUrl.hostname !== targetUrl.hostname) return undefined;
        targetUrl.search = '';
        targetUrl.hash = '';

        return Util.resolveSlug(targetUrl.href);
    } catch {
        return undefined;
    }
}
