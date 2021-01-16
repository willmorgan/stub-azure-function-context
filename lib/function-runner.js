const { v4: uuid } = require('uuid');
const { stubContextFromBindingDefinitions } = require('./context-builder');
const moment = require('moment');

function prepareContext(context, functionName = 'stubTest', resolver, now) {
    const invocationId = uuid();
    const randGuid = uuid();
    Object.assign(context, {
        invocationId,
        done: resolver,
    });
    Object.assign(context.executionContext, {
        invocationId,
        functionName,
        functionDirectory: __dirname,
    });
    Object.assign(context.bindingData, {
        sys: {
            methodName: functionName,
            utcNow: moment(now),
            randGuid,
        },
    });
}

function extractTrigger(context) {
    const definition = context.bindingDefinitions.find(({ type }) => {
        return type.substr(-7).toLowerCase() === 'trigger';
    });
    if (!definition) {
        throw new Error('No trigger found');
    }
    return context.bindings[definition.name];
}

function extractInputs(context) {
    return context.bindingDefinitions.filter(({ direction, type }) => {
        return direction === 'in' && type.substr(-7).toLowerCase() !== 'trigger';
    }).map(({ name }) => {
        return context.bindings[name];
    });
}

function extractOutputs(context) {
    return context.bindingDefinitions.filter((definition) => {
        return definition.direction === 'out';
    });
}

/**
 * Replicate the execution of a function app function. This prepares the context (adding things like
 * a invocationId, randGuid and other binding data). It adds a `done` function to the context which
 * is used to resolve the execution promise and it resolves the appropriate output binding data or
 * returned value from the function app.
 *
 * @param {{}} context
 * @param {Function} func
 * @param {Date|int} [now]
 * @returns {Promise.<{}>}
 */
function callFunction(context, func, now) {
    const trigger = extractTrigger(context);
    const inputs = extractInputs(context);
    const outputs = extractOutputs(context);
    const httpOutput = outputs.find(({ type }) => type.toLowerCase() === 'http');
    let doneCalled = false;
    return new Promise((resolve, reject) => {
        // see https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node#contextdone-method
        const done = (err, propertyBag) => {
            if (doneCalled) {
                return;
            }
            doneCalled = true;
            if (err) {
                reject(err);
            } else if (outputs.some(({ name }) => name === '$return')) {
                if (httpOutput.name === '$return') {
                    Object.assign(context, { res: propertyBag });
                }
                resolve(propertyBag);
            } else {
                if (propertyBag) {
                    Object.assign(context.bindings, propertyBag);
                } else if (httpOutput) {
                    // special case for HTTP outputs, the response can either be `context.res`
                    // or the named binding.
                    if (context.bindings[httpOutput.name]) {
                        Object.assign(context, {
                            res: context.bindings[httpOutput.name],
                        });
                    } else {
                        Object.assign(context.bindings, {
                            [httpOutput.name]: context.res,
                        });
                    }
                }
                resolve(context);
            }
        };
        prepareContext(context, func.name, done, now);
        // special handler for http outputs
        if (httpOutput) {
            // eslint-disable-next-line no-underscore-dangle
            context.res._done = () => {
                Object.assign(context.bindings, {
                    [httpOutput.name]: context.res,
                });
                done();
            };
        }
        // see https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node#inputs
        try {
            const result = func(context, trigger, ...inputs);
            if (result && typeof result.then === 'function') {
                result.then((output) => {
                    return done(null, output);
                }).catch(done);
            }
        } catch (err) {
            done(err);
        }
    });
}

/**
 *
 * @param {function} func Function to test
 * @param {Array.<{type: string, name: string, direction: string, ?data: *}>}bindingDefinitions
 * @param {function} [amendContext] callback to manipulate the mocked context object
 * @param {number} [now] timestamp representing the execution time
 * @return {Promise.<*>}
 */
function runStubFunctionFromBindings(func, bindingDefinitions = [], amendContext, now) {
    const contextCallback = typeof amendContext === 'function' ? amendContext : undefined;
    const timestamp = contextCallback ? now : amendContext;
    const context = stubContextFromBindingDefinitions(bindingDefinitions, contextCallback);
    return callFunction(context, func, timestamp);
}

module.exports = {
    callFunction,
    runStubFunctionFromBindings,
};
