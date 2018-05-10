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
        params: {},
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

const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));

/**
 * Implements: https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node#context-object
 * @param {function} functionUnderTest - function to test
 * @param {{}} triggers - object keyed by trigger name
 * @param {{}} outputs - object keyed by output name
 * @returns {Promise}
 */
function stubContext(functionUnderTest, triggers, outputs) {
    if (triggers === undefined) {
        triggers = deepCopy(defaultTriggers);
    }
    if (outputs === undefined) {
        outputs = deepCopy(defaultOutputs);
    }
    return new Promise((resolve, reject) => {
        const context = {
            ...triggers,
            ...outputs,
            bindings: {
                ...triggers,
                ...outputs,
            },
            log: function testLog() { return logger.log.apply(console, Array.from(arguments)); },
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
    stubContext,
};
