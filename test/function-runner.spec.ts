import { functionRunner, QueueBinding } from '../lib';
import { match, stub } from 'sinon';
import { expect } from 'chai';
import { resolve } from 'path';

const contextMatcher = match({
    invocationId: match.string,
    executionContext: {
        invocationId: match.string,
        functionName: 'functionStub',
        functionDirectory: match.string,
        retryContext: null,
    },
    bindings: match.any,
    bindingData: {
        invocationId: match.string,
    },
    traceContext: {
        traceparent: null,
        tracestate: null,
        attributes: null,
    },
    bindingDefinitions: match.array,
});

describe('function-runner', () => {
    it ('calls the context augment callback', async () => {
        const functionStub = stub().resolves();
        const augmentor = stub();
        await functionRunner(functionStub, [], {}, augmentor);
        expect(functionStub).to.have.callCount(1);
        expect(augmentor).to.have.callCount(1);
    });
    it('returns the function result if out name is $return', async () => {
        const functionStub = stub().resolves('response value');
        const result = await functionRunner(functionStub, [{ type: 'queue', direction: 'out', name: '$return' }]);
        expect(functionStub).to.have.callCount(1);
        expect(result).to.equal('response value');
    });
    it('returns the context when value sent to done callback', async () => {
        const functionStub = stub().callsFake((ctx) => {
            ctx.done(null, { myOutput: 'My message' });
        });
        const result = await functionRunner(functionStub, [{ type: 'queue', direction: 'out', name: 'myOutput' }]);
        expect(contextMatcher.test(result)).to.equal(true);
    });
    it('returns the context if nothing returned', async () => {
        const functionStub = stub().callsFake((ctx) => ctx.done());
        const result = await functionRunner(functionStub);
        expect(contextMatcher.test(result)).to.equal(true);
    });
    it('throws an error if an error is thrown', async () => {
        const syntheticError = new Error('synthetic error');
        const functionStub = stub().rejects(syntheticError);
        try {
            await functionRunner(functionStub);
        } catch (e) {
            expect(e).to.equal(syntheticError);
            return;
        }
        expect.fail('Expected to throw');
    });
    it('loads bindings from a function.json file', async () => {
        const functionStub = stub().resolves('response value');
        await functionRunner(functionStub, resolve(__dirname, './etc/function.json'), {
            myTrigger: QueueBinding.createFromMessageText('test'),
        });
        expect(functionStub).to.have.been.calledOnceWithExactly(match.any, 'test');
    });
});
