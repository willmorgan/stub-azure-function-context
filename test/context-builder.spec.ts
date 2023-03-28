import { Binding, createContextForFunction, HttpBinding } from '../lib';
import { BindingDefinition, Context, ContextBindings } from '@azure/functions';
import { expect } from 'chai';
import { stub } from 'sinon';

class MyTrigger implements Binding
{
    toContextBinding(): ContextBindings {
        return {};
    }

    toTrigger(): ContextBindings | string {
        return {};
    }

    toBindingData(): Record<string, ContextBindings | string> {
        return {};
    }
}

describe('context-builder', () => {
    it('creates a context for a function', () => {
        const bindingDefinitions: BindingDefinition[] = [{ name: "myTrigger", type: "manualTrigger", direction: "in" }];
        const context = createContextForFunction(
            function myTestFunction() {
                // noop
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
    describe('http', () => {
        it('sets status correctly', () => {
            function myTestFunction(context: Context) {
                context.res?.status(403);
            }
            const bindingDefinitions: BindingDefinition[] = [{
                name: "req", type: "httpTrigger", direction: "in",
            }, {
                name: "res", type: "http", direction: "out",
            }];
            const context = createContextForFunction(
                myTestFunction,
                bindingDefinitions,
                { req: new HttpBinding() },
                stub(),
            );
            myTestFunction(context);
            expect(context.res).to.have.property('statusCode', 403);
        });
        it('sets a header correctly using setHeader', () => {
            function myTestFunction(context: Context) {
                context.res?.setHeader('Content-Type', 'application/json');
            }
            const bindingDefinitions: BindingDefinition[] = [{
                name: "req", type: "httpTrigger", direction: "in",
            }, {
                name: "res", type: "http", direction: "out",
            }];
            const context = createContextForFunction(
                myTestFunction,
                bindingDefinitions,
                { req: new HttpBinding() },
                stub(),
            );
            myTestFunction(context);
            expect(context.res).to.have.nested.property('headers.content-type', 'application/json');
        });
        it('sets a header correctly using set', () => {
            function myTestFunction(context: Context) {
                context.res?.set('Cache-Control', 'no-cache,no-store');
            }
            const bindingDefinitions: BindingDefinition[] = [{
                name: "req", type: "httpTrigger", direction: "in",
            }, {
                name: "res", type: "http", direction: "out",
            }];
            const context = createContextForFunction(
                myTestFunction,
                bindingDefinitions,
                { req: new HttpBinding() },
                stub(),
            );
            myTestFunction(context);
            expect(context.res).to.have.nested.property('headers.cache-control', 'no-cache,no-store');
        });
        it('gets a header correctly using getHeader', () => {
            function myTestFunction(context: Context) {
                context.res?.setHeader('Content-Type', 'application/json');
            }
            const bindingDefinitions: BindingDefinition[] = [{
                name: "req", type: "httpTrigger", direction: "in",
            }, {
                name: "res", type: "http", direction: "out",
            }];
            const context = createContextForFunction(
                myTestFunction,
                bindingDefinitions,
                { req: new HttpBinding() },
                stub(),
            );
            myTestFunction(context);
            expect(context.res?.getHeader('content-type')).to.equal('application/json');
            expect(context.res?.getHeader('Content-Type')).to.equal('application/json');
            expect(context.res?.getHeader('CONTENT-TYPE')).to.equal('application/json');
        });
        it('gets a header correctly using get', () => {
            function myTestFunction(context: Context) {
                context.res?.setHeader('Content-Type', 'application/json');
            }
            const bindingDefinitions: BindingDefinition[] = [{
                name: "req", type: "httpTrigger", direction: "in",
            }, {
                name: "res", type: "http", direction: "out",
            }];
            const context = createContextForFunction(
                myTestFunction,
                bindingDefinitions,
                { req: new HttpBinding() },
                stub(),
            );
            myTestFunction(context);
            expect(context.res?.get('content-type')).to.equal('application/json');
            expect(context.res?.get('Content-Type')).to.equal('application/json');
            expect(context.res?.get('CONTENT-TYPE')).to.equal('application/json');
        });
        it('removes a header', () => {
            function myTestFunction(context: Context) {
                context.res?.setHeader('Content-Type', 'application/json');
            }
            const bindingDefinitions: BindingDefinition[] = [{
                name: "req", type: "httpTrigger", direction: "in",
            }, {
                name: "res", type: "http", direction: "out",
            }];
            const context = createContextForFunction(
                myTestFunction,
                bindingDefinitions,
                { req: new HttpBinding() },
                stub(),
            );
            myTestFunction(context);
            context.res?.removeHeader('content-type');
            expect(context.res).to.not.have.nested.property('headers.content-type');
        });
        it('sets the content type', () => {
            function myTestFunction(context: Context) {
                context.res?.type('text/html');
            }
            const bindingDefinitions: BindingDefinition[] = [{
                name: "req", type: "httpTrigger", direction: "in",
            }, {
                name: "res", type: "http", direction: "out",
            }];
            const context = createContextForFunction(
                myTestFunction,
                bindingDefinitions,
                { req: new HttpBinding() },
                stub(),
            );
            myTestFunction(context);
            expect(context.res).to.have.nested.property('headers.content-type', 'text/html');
        });
        it('send sets body and calls done', () => {
            const done = stub();
            function myTestFunction(context: Context) {
                context.res?.send('my body');
            }
            const bindingDefinitions: BindingDefinition[] = [{
                name: "req", type: "httpTrigger", direction: "in",
            }, {
                name: "res", type: "http", direction: "out",
            }];
            const context = createContextForFunction(
                myTestFunction,
                bindingDefinitions,
                { req: new HttpBinding() },
                done,
            );
            myTestFunction(context);
            expect(done).to.have.been.callCount(1);
            expect(context.res).to.have.property('body', 'my body');
        });
        it('sendStatus sets status and calls done', () => {
            const done = stub();
            function myTestFunction(context: Context) {
                context.res?.sendStatus(403);
            }
            const bindingDefinitions: BindingDefinition[] = [{
                name: "req", type: "httpTrigger", direction: "in",
            }, {
                name: "res", type: "http", direction: "out",
            }];
            const context = createContextForFunction(
                myTestFunction,
                bindingDefinitions,
                { req: new HttpBinding() },
                done,
            );
            myTestFunction(context);
            expect(done).to.have.been.callCount(1);
            expect(context.res).to.have.property('statusCode', 403);
        });
        it('header sets header correctly', () => {
            const done = stub();
            const now = new Date();
            function myTestFunction(context: Context) {
                context.res?.header('date', now.toISOString());
            }
            const bindingDefinitions: BindingDefinition[] = [{
                name: "req", type: "httpTrigger", direction: "in",
            }, {
                name: "res", type: "http", direction: "out",
            }];
            const context = createContextForFunction(
                myTestFunction,
                bindingDefinitions,
                { req: new HttpBinding() },
                done,
            );
            myTestFunction(context);
            expect(context.res).to.have.nested.property('headers.date', now.toISOString());
        });
        it('json sets and sends json data', () => {
            const done = stub();
            function myTestFunction(context: Context) {
                context.res?.json({ test: true });
            }
            const bindingDefinitions: BindingDefinition[] = [{
                name: "req", type: "httpTrigger", direction: "in",
            }, {
                name: "res", type: "http", direction: "out",
            }];
            const context = createContextForFunction(
                myTestFunction,
                bindingDefinitions,
                { req: new HttpBinding() },
                done,
            );
            myTestFunction(context);
            expect(context.res).to.have.nested.property('headers.content-type', 'application/json');
            expect(context.res?.body).to.deep.equal({ test: true });
        });
        it('end sets body and calls done', () => {
            const done = stub();
            function myTestFunction(context: Context) {
                context.res?.end('another body');
            }
            const bindingDefinitions: BindingDefinition[] = [{
                name: "req", type: "httpTrigger", direction: "in",
            }, {
                name: "res", type: "http", direction: "out",
            }];
            const context = createContextForFunction(
                myTestFunction,
                bindingDefinitions,
                { req: new HttpBinding() },
                done,
            );
            myTestFunction(context);
            expect(done).to.have.been.callCount(1);
            expect(context.res).to.have.property('body', 'another body');
        });
        it('done only gets called once', () => {
            const done = stub();
            function myTestFunction(context: Context) {
                context.res?.send('another body');
                context.res?.end();
            }
            const bindingDefinitions: BindingDefinition[] = [{
                name: "req", type: "httpTrigger", direction: "in",
            }, {
                name: "res", type: "http", direction: "out",
            }];
            const context = createContextForFunction(
                myTestFunction,
                bindingDefinitions,
                { req: new HttpBinding() },
                done,
            );
            myTestFunction(context);
            expect(done).to.have.been.callCount(1);
        });
    });
});
