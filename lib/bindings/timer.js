const moment = require('moment');

/* see https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-timer */

function addTrigger(context, definition, trigger) {
    const { name } = definition;
    Object.assign(context.bindings, {
        [name]: trigger,
    });
    Object.assign(context.bindingData, {
        timerTrigger: moment(context.bindingData.sys.utcNow).format('DD/MM/Y HH:mm:ss'),
    });
}

function addInputBinding() {
    throw new Error('Timers cannot be used as input bindings');
}

function addOutputBinding() {
    throw new Error('Timers cannot be used as output bindings');
}

/**
 * @param {*} [now]
 * @param {number} [interval]
 * @param {boolean} [IsPastDue]
 * @param {boolean} [AdjustForDST]
 * @returns {{IsPastDue: boolean, Schedule: {}, ScheduleStatus: (null|{})}}
 */
function createTrigger(now, interval, IsPastDue = false, AdjustForDST = true) {
    const Schedule = {};
    if (AdjustForDST) {
        Object.assign(Schedule, {
            AdjustForDST,
        });
    }
    let ScheduleStatus = null;
    if (interval) {
        ScheduleStatus = {
            Last: moment(now).subtract(interval, 'seconds').toJSON(),
            LastUpdated: moment(now).toJSON(),
            Next: moment(now).add(interval, 'seconds').toJSON(),
        };
    }
    return {
        Schedule,
        ScheduleStatus,
        IsPastDue,
    };
}

function handles({ type }) {
    return type.toLowerCase() === 'timertrigger';
}

module.exports = {
    addTrigger,
    addInputBinding,
    addOutputBinding,
    createTrigger,
    handles,
};
