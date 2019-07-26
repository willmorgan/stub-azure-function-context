'use strict';

const uuid = require('uuid/v4');

let logger = console;

function setContextLogger(newLogger) {
    logger = newLogger;
}

function wrapConsole(wrapLevel) {
    const level = (logger === console && wrapLevel === 'verbose') ? 'debug' : wrapLevel;
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
 * @param {{}} [triggers] - object keyed by trigger name
 * @param {{}} [outputs] - object keyed by output name
 * @returns {Promise}
 */
function stubContext(functionUnderTest, triggers, outputs) {
    if (triggers === undefined) {
        triggers = deepCopy(defaultTriggers); // eslint-disable-line no-param-reassign
    }
    if (outputs === undefined) {
        outputs = deepCopy(defaultOutputs); // eslint-disable-line no-param-reassign
    }
    return new Promise((resolve) => {
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
        context.log.info = wrapConsole('info');
        context.log.warn = wrapConsole('warn');
        context.log.verbose = wrapConsole('verbose');
        try {
            const result = functionUnderTest(context, ...Object.values(triggers));
            // async func
            if (result && typeof result.then === 'function') {
                result.then((val) => {
                    // see: https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node#exporting-an-async-function
                    Object.assign(context.bindings, {
                        $return: val,
                    });
                    context.done();
                }).catch(context.done);
            }
        } catch (e) {
            context.done(e);
        }
    });
}

/**
 * Create a stub context from a binding definition - currently only supports queueTriggers
 *
 * @param {function} functionUnderTest
 * @param {[{}]} bindingDefinitions The binding definitions as would be defined in function.json
 * @param incomingTrigger The incoming trigger data (eg: request object or queue message)
 * @returns {Promise<{}>}
 */
function stubContextFromBindingDefinition(functionUnderTest, bindingDefinitions, incomingTrigger) {
    const triggerDefinition = bindingDefinitions.find((definition) => {
        return definition.direction.toLowerCase() === 'in';
    });
    const outputDefinition = bindingDefinitions.find((definition) => {
        return definition.direction.toLowerCase() === 'out';
    });
    const invocationId = uuid();
    const bindings = {};
    const normalisedBindingData = {};
    switch (triggerDefinition.type) {
    case 'queueTrigger':
        Object.assign(bindings, {
            [triggerDefinition.name]: incomingTrigger.messageText,
        });
        // map an actual queue message to binding names
        Object.entries({
            messageText: 'queueTrigger',
            dequeueCount: 'dequeueCount',
            expirationTime: 'expirationTime',
            messageId: 'id',
            insertionTime: 'insertionTime',
            timeNextVisible: 'nextVisibleTime',
            popReceipt: 'popReceipt',
        }).forEach(([from, to]) => {
            Object.assign(normalisedBindingData, {
                [to]: incomingTrigger[from],
            });
        });
        break;
    default:
        throw new Error(`Binding type '${triggerDefinition.type}' not currently supported, use stubContext instead`);
    }
    const bindingData = {
        invocationId,
        ...normalisedBindingData,
        sys: {
            methodName: '',
            utcName: (new Date()).toJSON(),
            randGuid: uuid(),
        },
    };
    return new Promise((resolve) => {
        const context = {
            invocationId,
            executionContext: {
                invocationId,
                // functionName: '',
                // functionDirectory: '',
            },
            bindings,
            log: function testLog() { return logger.log.apply(console, Array.from(arguments)); },
            bindingData,
            bindingDefinitions,
            done: (err = null, propertyBag = {}) => resolve({ context, err, propertyBag }),
        };
        context.log.error = wrapConsole('error');
        context.log.info = wrapConsole('info');
        context.log.warn = wrapConsole('warn');
        context.log.verbose = wrapConsole('verbose');
        try {
            const result = functionUnderTest(context, bindings[triggerDefinition.name]);
            if (result && typeof result.then === 'function') {
                result.then((val) => {
                    if (outputDefinition && outputDefinition.name) {
                        Object.assign(context.bindings, {
                            [outputDefinition.name]: val,
                        });
                    }
                    context.done();
                }).catch(context.done);
            }
        } catch (e) {
            context.done(e);
        }
    });
}

module.exports = {
    stubContext,
    stubContextFromBindingDefinition,
    setContextLogger,
};
