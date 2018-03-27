'use strict';

const logger = console;

function wrapConsole(level) {
    return function wrappedConsole() {
        // eslint-disable-next-line security/detect-object-injection
        return logger[level].apply(logger, arguments);
    };
}

const defaultTriggers = {
    // override: https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node#request-object
    req: {
        // the runtime lowercases all header names:
        headers: {
            'user-agent': 'stub-azure-function-context.js',
        },
        body: {},
    },
};

const defaultOutputs = {
    // override: https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node#response-object
    res: {
        headers: {},
        body: {},
    },
};

/**
 * Implements: https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node#context-object
 * @param {function} functionUnderTest - function to test
 * @param {{}} triggers - an object with one or more keys (eg: req) whose values are probably objects
 * @param {{}} outputs - an object with one or more keys (eg: res)
 * @returns {Promise}
 */
function stubAzureFunctionContext(functionUnderTest, triggers = defaultTriggers, outputs = defaultOutputs) {
    return new Promise((resolve, reject) => {
        const context = {
            ...triggers,
            ...outputs,
            bindings: {
                ...triggers,
                ...outputs,
            },
            log: () => logger.log.apply(console, arguments),
            done: (err = null, propertyBag = {}) => resolve({ context, err, propertyBag }),
        };
        context.log.error = wrapConsole('error');
        context.log.info = wrapConsole('log');
        context.log.warn = wrapConsole('warn');
        context.log.verbose = wrapConsole('debug');
        try {
            functionUnderTest(context, ...Object.values(triggers));
        } catch (e) {
            reject(e);
        }
    });
}

module.exports = {
    stubAzureFunctionContext,
};
