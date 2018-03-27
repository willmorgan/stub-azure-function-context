'use strict';

/* eslint-disable security/detect-object-injection */

const { stubContext } = require('../stub-azure-function-context');
const { expect } = require('chai');
const { spy } = require('sinon');
const {
    httpFunctionOK,
    httpFunctionError,
    httpFunctionPropertyBag,
    multiTriggerFunction,
    httpFunctionMultiOutput,
    httpFunctionLogs,
} = require('./support/test-functions');

describe('stub-azure-function-context', () => {
    describe('.stubContext', () => {
        it('returns a context, err, and propertyBag', async () => {
            const { context, err, propertyBag } = await stubContext(httpFunctionOK);
            expect(context).to.have.nested.property('res.status', 200);
            expect(err).to.equal(null);
            expect(propertyBag).to.be.an('object');
        });
        it('passes through the propertyBag, if any', async () => {
            const { propertyBag } = await stubContext((context, req) => {
                Object.assign(req.params, { test: 'TEST' });
                httpFunctionPropertyBag(context, req);
            });
            expect(propertyBag).to.have.property('testParam', 'TEST');
        });
        it('passes through multiple triggers', async () => {
            const TRIGGER_1 = { message: 'trigger1' };
            const TRIGGER_2 = { message: 'trigger2' };
            const multiTrigger = spy(multiTriggerFunction);
            const { context } = await stubContext(multiTrigger, {
                trigger1: TRIGGER_1,
                trigger2: TRIGGER_2,
            });
            expect(multiTrigger.calledWith(context, TRIGGER_1, TRIGGER_2)).to.equal(true);
        });
        it('passes through multiple outputs', async () => {
            const MULTI_OUTPUTS = {
                res: {},
                queueMessage: {},
            };
            const { context } = await stubContext(
                httpFunctionMultiOutput,
                undefined, // fall back to default
                MULTI_OUTPUTS
            );
            expect(context).to.have.nested.property('bindings.queueMessage', 'MSG');
            expect(context).to.have.nested.property('bindings.res.body', 'OK');
            expect(context.res).to.equal(context.bindings.res);
        });
        it('passes through errors, if any', async () => {
            const { err } = await stubContext(httpFunctionError);
            expect(err).to.have.nested.property('constructor.name', 'Error');
        });
        it('supports log methods', async () => {
            const logMethodSpies = {};
            const logMethods = ['info', 'warn', 'error', 'verbose'];
            let logMainSpy;
            await stubContext((context, req) => {
                logMainSpy = spy(context, 'log');
                logMethods.forEach((method) => {
                    logMethodSpies[method] = spy(context.log, method);
                });
                httpFunctionLogs(context, req);
            });
            logMethods.forEach((method) => {
                expect(logMethodSpies[method].called).to.equal(true, 'Expected context.log method invoke for ' + method);
            });
            expect(logMainSpy.called).to.equal(true, 'Expected main context.log method to call');
        });
    });
});
