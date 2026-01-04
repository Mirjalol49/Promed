
const https = require('https');

const projectId = "graft-24962";
const databaseId = "primed";
const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`;

console.log(`Checking URL: ${url}`);

https.get(url, (res) => {
    console.log(`STATUS: ${res.statusCode}`);

    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log("BODY_START:", data.substring(0, 200));
    });

}).on('error', (err) => {
    console.error('Error:', err.message);
});
