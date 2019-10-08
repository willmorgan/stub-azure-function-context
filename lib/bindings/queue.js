const moment = require('moment');
const uuid = require('uuid/v4');

/* see https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-queue */

const QUEUE_MAP = {
    queueTrigger: 'messageText',
    dequeueCount: 'dequeueCount',
    expirationTime: 'expirationTime',
    id: 'messageId',
    insertionTime: 'insertionTime',
    nextVisibleTime: 'timeNextVisible',
    popReceipt: 'popReceipt',
};

function addTrigger(context, definition, trigger) {
    const { name } = definition;
    Object.assign(context.bindings, {
        [name]: trigger,
    });
    Object.assign(context.bindingData, trigger);
}

function addInputBinding() {

}

function addOutputBinding() {
    // noop
}

function createTrigger(messageText, dequeueCount = 1, now) {
    return {
        queueTrigger: messageText,
        dequeueCount,
        expirationTime: moment(now).add(7, 'days').toJSON(),
        id: uuid(),
        insertionTime: moment(now).toJSON(),
        nextVisibleTime: moment(now).add(5, 'minutes').toJSON(),
        popReceipt: uuid(),
    };
}

function createTriggerFromQueueMessage(message) {
    return Object.entries(QUEUE_MAP).reduce((mapped, [targetKey, messageKey]) => {
        if (Object.prototype.hasOwnProperty.call(message, messageKey)) {
            Object.assign(mapped, {
                [targetKey]: message[messageKey],
            });
        }
        return mapped;
    }, {});
}

function handles({ type }) {
    return ['queue', 'queuetrigger'].includes(type.toLowerCase());
}

module.exports = {
    addTrigger,
    addInputBinding,
    addOutputBinding,
    createTrigger,
    createTriggerFromQueueMessage,
    handles,
};
