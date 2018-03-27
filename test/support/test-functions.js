'use strict';

/* eslint-disable no-unused-vars */

function httpFunctionOK(context, req) {
    context.res.status = 200;
    context.res.body = 'OK';
    context.done();
}

function httpFunctionError(context, req) {
    context.done(new Error('Test error'));
}

function httpFunctionPropertyBag(context, req) {
    context.done(null, {
        testParam: req.params.test,
    });
}

function multiTriggerFunction(context, trigger1, trigger2) {
    context.done();
}

function httpFunctionMultiOutput(context, req) {
    context.res.body = 'OK';
    context.bindings.queueMessage = 'MSG';
    context.done();
}

function httpFunctionLogs(context, req) {
    context.log('Log default');
    context.log.info('info');
    context.log.warn('warn');
    context.log.error('error');
    context.log.verbose('verbose');
    context.done();
}

module.exports = {
    httpFunctionOK,
    httpFunctionError,
    httpFunctionPropertyBag,
    multiTriggerFunction,
    httpFunctionMultiOutput,
    httpFunctionLogs,
};
