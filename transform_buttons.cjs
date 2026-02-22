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

    // Check if there are any <button tags
    if (!/<button(?=[\s>])/g.test(content)) return;

    let newContent = content;

    // Check if motion is imported
    let hasMotionImport = /import\s+.*\{?\s*motion\s*\}?.*from\s+['"]framer-motion['"]/.test(content);

    if (!hasMotionImport) {
        // If it has other imports from framer-motion like AnimatePresence, we should append motion to it
        let hasFramerMotion = /import\s+\{([^}]+)\}\s+from\s+['"]framer-motion['"]/.test(newContent);
        if (hasFramerMotion) {
            newContent = newContent.replace(/import\s+\{([^}]+)\}\s+from\s+['"]framer-motion['"]/, "import { $1, motion } from 'framer-motion'");
        } else {
            let useClientMatch = /^(["']use client["'];?(?:\r?\n)+)/.exec(newContent);
            if (useClientMatch) {
                newContent = newContent.substring(0, useClientMatch[0].length) + "import { motion } from 'framer-motion';\n" + newContent.substring(useClientMatch[0].length);
            } else {
                newContent = "import { motion } from 'framer-motion';\n" + newContent;
            }
        }
    }

    // Replace <button with <motion.button whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}
    newContent = newContent.replace(/<button(?=[\s>])/g, '<motion.button whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}');

    // Replace </button> with </motion.button>
    newContent = newContent.replace(/<\/button>/g, "</motion.button>");

    if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log('Updated', filePath);
    }
}

walkDir('./src', processFile);
console.log('Done script execution!');
