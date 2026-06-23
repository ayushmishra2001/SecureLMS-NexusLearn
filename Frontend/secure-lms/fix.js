const fs = require('fs');
let c = fs.readFileSync('src/app/core/services/api.service.ts', 'utf8');
c = c.replace(/\\\$\{this\.base\}([^,)]+)/g, '`${this.base}$1`');
fs.writeFileSync('src/app/core/services/api.service.ts', c);
