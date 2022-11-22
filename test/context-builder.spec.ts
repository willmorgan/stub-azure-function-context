import { Binding, createContextForFunction } from '../lib';
import { BindingDefinition, Context, ContextBindings } from '@azure/functions';
import { expect } from 'chai';

class MyTrigger implements Binding
{
    toContextBinding(): ContextBindings {
        return {};
    }

    toTrigger(): ContextBindings | string {
        return {};
    }
}

describe('context-builder', () => {
    it('creates a context for a function', () => {
        const bindingDefinitions: BindingDefinition[] = [{ name: "myTrigger", type: "manualTrigger", direction: "in" }];
        const context = createContextForFunction(
            function myTestFunction(context: Context) {
                context.log('test');
            },
            bindingDefinitions,
            { myTrigger: new MyTrigger() },
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            () => {},
        );
        const { done, invocationId, log } = context;

        expect(context).to.deep.equal({
            invocationId,
            bindingData: { invocationId },
            bindingDefinitions,
            bindings: {
                myTrigger: {},
            },
            done,
            executionContext: {
                functionDirectory: context.executionContext.functionDirectory,
                functionName: 'myTestFunction',
                invocationId,
                retryContext: null,
            },
            log,
            traceContext: {
                attributes: null,
                traceparent: null,
                tracestate: null,
            },
        });
    });
});
