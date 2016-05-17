const phantom = require('phantom');
const co = require('co');

const config = require('./config');

console.log(config);


let phantomInstance = null;

const main = co.wrap(function *() {
    phantomInstance = yield phantom.create();
})

main().then(() => {
    phantomInstance.exit();
}).catch(() => {
    phantomInstance.exit();
});;