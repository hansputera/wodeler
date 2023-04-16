module.exports = {
    prefixes: ['$', '>'],
    limits: {
        max: 10,
        delayBetween: 60_000, // 1 minute
        delayAfterMax: 60_000 * 60, // 1 hour
    },
    otakudesuUrl: 'https://otakudesu.lol',
}