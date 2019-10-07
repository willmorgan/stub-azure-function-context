const uuid = require('uuid/v4');
const { stubContextFromBindingDefinitions } = require('./context-builder');
const moment = require('moment');

function prepareContext(context, functionName = 'stubTest', resolver, now) {
    const innvocationId = uuid();
    const randGuid = uuid();
    Object.assign(context, {
        innvocationId,
    });
    Object.assign(context.executionContext, {
        innvocationId,
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
    return context.bindingDefinitions.filter((definition) => {
        return definition.direction === 'in';
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
 * @param {Date|int} now
 * @returns {Promise.<{}>}
 */
function callFunction(context, func, now) {
    const trigger = extractTrigger(context);
    const inputs = extractInputs(context);
    const outputs = extractOutputs(context);
    return new Promise((resolve, reject) => {
        // see https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node#contextdone-method
        const done = (err, propertyBag = {}) => {
            if (err) {
                reject(err);
            } else if (outputs.some(({ name }) => name === '$return')) {
                resolve(propertyBag);
            } else {
                if (propertyBag) {
                    Object.assign(context.bindings, propertyBag);
                }
                resolve(context);
            }
        };
        prepareContext(context, func.name, done, now);
        // see https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node#inputs
        return Promise.resolve(func(context, trigger, ...inputs)).then((output) => {
            return done(null, output);
        }).catch(done);
    });
}

function runStubFunctionFromBindings(func, bindingDefinitions, now) {
    const context = stubContextFromBindingDefinitions(bindingDefinitions);
    return callFunction(context, func, now);
}

module.exports = {
    callFunction,
    runStubFunctionFromBindings,
};
