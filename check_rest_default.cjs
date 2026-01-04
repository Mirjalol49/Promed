
const https = require('https');

const projectId = "graft-24962";
const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

console.log(`Checking URL: ${url}`);

https.get(url, (res) => {
    console.log(`STATUS: ${res.statusCode}`);

    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        // Just print first 100 chars
        console.log("BODY:", data.substring(0, 100));
    });

}).on('error', (err) => {
    console.error('Error:', err.message);
});
