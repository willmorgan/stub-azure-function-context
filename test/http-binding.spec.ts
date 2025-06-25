import { match, stub } from 'sinon';
import { functionRunner, HttpBinding } from '../lib';
import { expect } from 'chai';
import { Context, HttpResponse } from '@azure/functions';

describe('http-binding', () => {
    it('executes an Http Trigger', async () => {
        const functionStub = stub().resolves();
        const httpBinding = new HttpBinding();
        await functionRunner(
            functionStub,
            [
                { name: 'req', type: 'httpTrigger', direction: 'in' },
            ],
            { req: httpBinding },
        );
        expect(functionStub).to.have.been.calledOnceWithExactly(match.any, httpBinding.toContextBinding());
    });
    it('assigns the output res correctly', async () => {
        const response: HttpResponse = {
            status: 400,
            body: {
                message: 'Something went wrong',
            },
        };
        const functionStub = stub<[], Promise<HttpResponse>>().resolves(response);
        const result = await functionRunner(functionStub, [{ name: '$return', type: 'http', direction: 'out' }]);
        expect(result).to.deep.equal(response);
    });
    it('assigns the http response to the context', async () => {
        const response: HttpResponse = {
            status: 200,
            body: {
                message: 'hello, world!',
            },
        };
        const functionStub = stub<[Context], void>().callsFake((ctx) => {
            Object.assign(ctx.bindings, {
                myResponse: response,
            });
            ctx.done();
        });
        const result = await functionRunner(functionStub, [{ name: 'myResponse', type: 'http', direction: 'out' }]);
        expect(result).to.have.property('res', response);
    });
    it('executes an Http Trigger with params', async () => {
        const req = { params: { id: 'testId' } };
        const functionStub = stub<[], Promise<void>>().resolves();
        const httpBinding = new HttpBinding(req);
        const result = await functionRunner(
            functionStub,
            [
                { name: 'req', type: 'httpTrigger', direction: 'in' },
            ],
            { req: httpBinding },
        );
        expect(functionStub).to.have.been.calledOnceWithExactly(match.any, httpBinding.toContextBinding());
        expect(result.bindingData.params).to.have.property('id', 'testId');
        expect(result.bindingData.params).to.deep.equal(req.params);
    });
});
