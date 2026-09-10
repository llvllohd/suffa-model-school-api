require('dotenv').config();
const encryptPassword = require('./encryptPassword');

// take password from command line: node src/utils/generatePassword.js Test@1234
const plain = process.argv[2] || 'Test@1234';
const encrypted = encryptPassword(plain);

console.log(`\nPlain: ${plain}`);
console.log(`Encrypted: ${encrypted}\n`);
