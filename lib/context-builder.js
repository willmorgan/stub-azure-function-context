const uuid = require('uuid/v4');
const bindings = require('./bindings');

let logger = console;

function setContextLogger(newLogger) {
    logger = newLogger;
}

function createBaseContext(bindingDefinitions) {
    const log = () => { logger.log(...arguments); };
    log.verbose = () => { logger.debug(...arguments); };
    log.info = () => { logger.info(...arguments); };
    log.warn = () => { logger.warn(...arguments); };
    log.error = () => { logger.error(...arguments); };
    return {
        executionContext: {},
        bindings: {},
        log,
        bindingData: {},
        bindingDefinitions,
    };
}

function stubContextFromBindingDefinitions(bindingDefinitions) {
    const context = createBaseContext(bindingDefinitions, uuid());
    bindingDefinitions.forEach((definition) => {
        const handler = Object.values(bindings).find(({ handles }) => handles(definition));
        if (!handler) {
            throw new Error(`Unsupported output type ${definition.type}`);
        }
        if (definition.direction.toLowerCase() === 'out') {
            handler.addOutputBinding(context, definition, definition.data);
        } else if (definition.type.substr(-7).toLowerCase() === 'trigger') {
            handler.addTrigger(context, definition, definition.data);
        } else {
            handler.addInputBinding(context, definition, definition.data);
        }
    });
    return context;
}

module.exports = {
    setContextLogger,
    stubContextFromBindingDefinitions,
};
