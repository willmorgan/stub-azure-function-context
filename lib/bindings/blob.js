/* see https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-blob */

function addTrigger(context, definition, trigger) {
    const { name } = definition;
    Object.assign(context.bindings, {
        [name]: trigger.data,
    });
    Object.assign(context.bindingData, {
        blobTrigger: trigger.path,
    });
}

function addInputBinding(contexst, definition, binding) {
    const { name } = definition;
    Object.assign(context.bindings, {
        [name]: binding.data,
    });
}

function addOutputBinding() {
    // noop
}

function createTrigger(path, data) {
    return {
        path,
        data,
    };
}

function handles({ type }) {
    return ['blob', 'blobtrigger'].includes(type.toLowerCase());
}

module.exports = {
    addTrigger,
    addOutputBinding,
    addInputBinding,
    createTrigger,
    handles,
};
