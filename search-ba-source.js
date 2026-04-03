import fs from 'fs';
import path from 'path';

function searchInDir(dir, searchString) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            searchInDir(fullPath, searchString);
        } else if (file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.cjs')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes(searchString)) {
                console.log(`Found "${searchString}" in: ${fullPath}`);
            }
        }
    }
}

searchInDir('node_modules/better-auth/dist', 'forget-password');
searchInDir('node_modules/better-auth/dist', 'forgot-password');
