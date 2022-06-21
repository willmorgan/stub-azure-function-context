import { createContextForFunction } from '../lib';
import { BindingDefinition, Context } from '@azure/functions';
import { expect } from 'chai';
import { stub } from 'sinon';

describe('context-builder', () => {
    it('creates a context for a function', () => {
        const bindingDefinitions: BindingDefinition[] = [{ name: "myTrigger", type: "manualTrigger", direction: "in" }];
        const augmentStub = stub();
        const context = createContextForFunction(
            function myTestFunction(context: Context) {
                context.log('test');
            },
            bindingDefinitions,
            { myTrigger: {} },
            augmentStub,
        );
        const { invocationId } = context;
        expect(context).to.deep.equal({
            invocationId,
            bindingData: { invocationId },
            bindingDefinitions,
            bindings: {},
            executionContext: {
                functionDirectory: context.executionContext.functionDirectory,
                functionName: 'myTestFunction',
                invocationId,
                retryContext: null,
            },
            log: context.log,
            traceContext: {
                attributes: null,
                traceparent: null,
                tracestate: null,
            },
        });
        expect(augmentStub).to.have.callCount(1);
        expect(augmentStub).to.have.been.calledWith(context);
    });
    it('creates a context and augments it', () => {
        const bindingDefinitions: BindingDefinition[] = [{ name: "myTrigger", type: "manualTrigger", direction: "in" }];
        const context = createContextForFunction(
            function myTestFunction(context: Context) {
                context.log('test');
            },
            bindingDefinitions,
            { myTrigger: {} },
            (context: Omit<Context, 'done'>) => {
                context.traceContext.traceparent = '123';
            },
        );
        const { invocationId } = context;
        expect(context).to.deep.equal({
            invocationId,
            bindingData: { invocationId },
            bindingDefinitions,
            bindings: {},
            executionContext: {
                functionDirectory: context.executionContext.functionDirectory,
                functionName: 'myTestFunction',
                invocationId,
                retryContext: null,
            },
            log: context.log,
            traceContext: {
                attributes: null,
                traceparent: '123',
                tracestate: null,
            },
        });
    });
});
