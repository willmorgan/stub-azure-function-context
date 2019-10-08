const blob = require('./blob');
const http = require('./http');
const queue = require('./queue');
const table = require('./table');
const timer = require('./timer');

/* see https://docs.microsoft.com/en-us/azure/azure-functions/functions-triggers-bindings */

module.exports = {
    blob,
    http,
    queue,
    table,
    timer,
};
