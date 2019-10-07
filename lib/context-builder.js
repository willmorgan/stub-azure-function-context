const uuid = require('uuid/v4');
const { http } = require('./bindings');

function createBaseContext(bindingDefinitions) {
    const logger = console;
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
        if (definition.direction.toLowerCase() === 'in') {
            switch (definition.type.toLowerCase()) {
            case 'httptrigger':
                http.addTrigger(context, definition, definition.data);
                break;
            default:
                throw new Error(`Unsupported trigger type ${definition.type}`);
            }
        } else if (definition.direction.toLowerCase() === 'out') {
            switch (definition.type.toLowerCase()) {
            case 'http':
                http.addOutputBinding(context);
                break;
            default:
                throw new Error(`Unsupported output type ${definition.type}`);
            }
        } else {
            throw new Error(`Unsupported binding direction ${definition.direction}`);
        }
    });
    return context;
}

module.exports = {
    stubContextFromBindingDefinitions,
};
