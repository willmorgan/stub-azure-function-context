const { runStubFunctionFromBindings } = require('../lib/function-runner');
const http = require('../lib/bindings/http');
const { expect } = require('chai');

describe('runStubFunctionFromBindings', () => {
    describe('resolves', () => {
        const bindings = [{
            type: 'httpTrigger', name: 'res', direction: 'in', data: http.createTrigger(),
        }];
        it('resolves a context using a Promise', async () => {
            const context = await runStubFunctionFromBindings(() => {
                return Promise.resolve();
            }, bindings);
            expect(context).to.be.an('object');
            expect(context).to.have.all.keys(
                'executionContext',
                'bindings',
                'log',
                'bindingData',
                'bindingDefinitions',
                'req',
                'innvocationId',
                'done',
            );
        });
        it('rejects with an error', async () => {
            const expectedError = new Error('synthetic error');
            try {
                await runStubFunctionFromBindings(() => {
                    return Promise.reject(expectedError);
                }, bindings);
            } catch (err) {
                expect(err).to.equal(expectedError);
                return;
            }
            expect.fail('Expected error not thrown');
        });
        it('returns the return value for $return bindings', async () => {
            const output = await runStubFunctionFromBindings(() => {
                return Promise.resolve({ test: true });
            }, bindings.concat([{ name: '$return', direction: 'out', type: 'http' }]));
            expect(output).to.deep.equal({ test: true });
        });
        it('resolves a context using the done callback', async () => {
            const context = await runStubFunctionFromBindings((ctx) => {
                ctx.done();
            }, bindings);
            expect(context).to.be.an('object');
            expect(context).to.have.all.keys(
                'executionContext',
                'bindings',
                'log',
                'bindingData',
                'bindingDefinitions',
                'req',
                'innvocationId',
                'done',
            );
        });
        it('rejects with an error sent to the done callback', async () => {
            const expectedError = new Error('synthetic error');
            try {
                await runStubFunctionFromBindings((ctx) => {
                    ctx.done(expectedError);
                }, bindings);
            } catch (err) {
                expect(err).to.equal(expectedError);
                return;
            }
            expect.fail('Expected error not thrown');
        });
        it('returns the return value for $return bindings', async () => {
            const output = await runStubFunctionFromBindings((ctx) => {
                ctx.done(null, { test: true });
            }, bindings.concat([{ name: '$return', direction: 'out', type: 'http' }]));
            expect(output).to.deep.equal({ test: true });
        });
    });
    describe('http', () => {
        const bindings = [
            {
                type: 'httpTrigger', direction: 'in', name: 'req', data: http.createTrigger(),
            },
            { type: 'http', direction: 'out', name: 'res' },
        ];
        it('creates an input and output binding', async () => {
            let outCtx;
            const context = await runStubFunctionFromBindings((ctx, req) => {
                outCtx = ctx;
                expect(ctx).to.have.property('res');
                expect(ctx.bindings).to.have.property('req', req);
                ctx.done();
            }, bindings);
            expect(outCtx).to.equal(context);
        });
        it('assigns a response to res', async () => {
            const context = await runStubFunctionFromBindings((ctx) => {
                // eslint-disable-next-line no-param-reassign
                ctx.res = {
                    status: 200,
                    body: { test: true },
                };
                ctx.done();
            }, bindings);
            expect(context.res).to.deep.equal({ status: 200, body: { test: true } });
            expect(context.bindings.res).to.equal(context.res);
        });
        it('assigns a response to the named binding', async () => {
            const context = await runStubFunctionFromBindings((ctx) => {
                // eslint-disable-next-line no-param-reassign
                ctx.bindings.res = {
                    status: 200,
                    body: { test: true },
                };
                ctx.done();
            }, bindings);
            expect(context.res).to.deep.equal({ status: 200, body: { test: true } });
            expect(context.bindings.res).to.equal(context.res);
        });
        it('assigns a response when using res.send', async () => {
            const context = await runStubFunctionFromBindings((ctx) => {
                ctx.res.send({ test: true });
            }, bindings);
            expect(context.res).to.deep.equal({
                status: 200,
                headers: {},
                body: { test: true },
                isRaw: false,
            });
        });
    });
});
