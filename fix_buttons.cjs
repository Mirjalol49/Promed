const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

function processFile(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.jsx')) return;

    let content = fs.readFileSync(filePath, 'utf8');

    let newContent = content;

    // Replace the previous quirky spring with a much faster, tighter spring
    newContent = newContent.replace(
        /<motion\.button whileTap=\{\{ scale: 0\.96 \}\} transition=\{\{ type: "spring", stiffness: 400, damping: 17 \}\}/g,
        '<motion.button whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 800, damping: 35 }}'
    );

    if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log('Fixed button animation in:', filePath);
    }
}

walkDir('./src', processFile);
console.log('Done script execution!');
