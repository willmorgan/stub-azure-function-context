/* see https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-table */

function addTrigger() {
    throw new Error('tables do not support triggers');
}

function addInputBinding(context, definition, binding) {
    const { name } = definition;
    Object.assign(context.bindings, {
        [name]: binding.data,
    });
}

function addOutputBinding() {
    // noop
}

function createTrigger(RowKey, PartitionKey, data) {
    return {
        ...data,
        RowKey,
        PartitionKey,
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
