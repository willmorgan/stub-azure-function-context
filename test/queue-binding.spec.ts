import { match, stub } from 'sinon';
import { functionRunner, QueueBinding } from '../lib';
import { expect } from 'chai';
import { v4 as uuid } from 'uuid';

describe('queue-binding', () => {
    it('executes a queue trigger', async () => {
        const functionStub = stub().resolves();
        const queueBinding = QueueBinding.createFromMessageText('test');
        await functionRunner(
            functionStub,
            [{ name: 'queueMessage', type: 'queueTrigger', direction: 'in' }],
            { queueMessage: queueBinding },
        );
        expect(functionStub).to.have.been.calledOnceWithExactly(match.any, 'test');
    });
    it('executes a queue trigger from a dequeued message', async () => {
        const functionStub = stub().resolves();
        const now = new Date();
        const queueBinding = QueueBinding.createFromDequeuedMessageItem({
            dequeueCount: 1,
            expiresOn: now,
            insertedOn: now,
            messageId: uuid(),
            messageText: 'test-message',
            nextVisibleOn: now,
            popReceipt: uuid(),
        });
        await functionRunner(
            functionStub,
            [{ name: 'queueMessage', type: 'queueTrigger', direction: 'in' }],
            { queueMessage: queueBinding },
        );
        expect(functionStub).to.have.been.calledOnceWithExactly(match.any, 'test-message');
    });
});
