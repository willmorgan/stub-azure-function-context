const { callFunction, runStubFunctionFromBindings } = require('./lib/function-runner');
const { stubContextFromBindingDefinitions, setContextLogger } = require('./lib/context-builder');
const {
    blob: { createTrigger: createBlobTrigger },
    http: { createTrigger: createHttpTrigger },
    queue: {
        createTrigger: createQueueTrigger,
        createTriggerFromQueueMessage: createQueueTriggerFromMessage,
    },
    table: { createTrigger: createTableTrigger },
    timer: { createTrigger: createTimerTrigger },
} = require('./lib/bindings');

module.exports = {
    callFunction,
    runStubFunctionFromBindings,
    stubContextFromBindingDefinitions,
    setContextLogger,
    createBlobTrigger,
    createHttpTrigger,
    createQueueTrigger,
    createQueueTriggerFromMessage,
    createTableTrigger,
    createTimerTrigger,
};
