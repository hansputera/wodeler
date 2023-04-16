module.exports = (stream) => new Promise((resolve, reject) => {
    let buff = Buffer.alloc(0);
    stream.on('data', (chunk) => {
        buff = Buffer.concat([buff, chunk]);
    }).on('end', () => {
        resolve(buff);
    }).on('error', reject);
});
