// see https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-queue
import { Binding } from '../types';
import { v4 as uuid } from 'uuid';
import { ContextBindings } from '@azure/functions';

export type QueueBindingData = {
    id: string;
    queueTrigger: string;
    dequeueCount: number;
    expirationTime: string;
    insertionTime: string;
    nextVisibleTime: string;
    popReceipt: string;
};

declare interface DequeuedMessageItem {
    /** The Id of the Message. */
    messageId: string;
    /** The time the Message was inserted into the Queue. */
    insertedOn: Date;
    /** The time that the Message will expire and be automatically deleted. */
    expiresOn: Date;
    /** This value is required to delete the Message. If deletion fails using this popreceipt then the message has been dequeued by another client. */
    popReceipt: string;
    /** The time that the message will again become visible in the Queue. */
    nextVisibleOn: Date;
    /** The number of times the message has been dequeued. */
    dequeueCount: number;
    /** The content of the Message. */
    messageText: string;
}

const MESSAGE_MAP: Record<keyof DequeuedMessageItem, keyof QueueBindingData> = {
    messageId: 'id',
    messageText: 'queueTrigger',
    dequeueCount: 'dequeueCount',
    expiresOn: 'expirationTime',
    insertedOn: 'insertionTime',
    nextVisibleOn: 'nextVisibleTime',
    popReceipt: 'popReceipt',
};

export class QueueBinding implements Binding {
    static createFromMessageText(queueTrigger: string): QueueBinding {
        const now = Date.now();
        return new QueueBinding({
            id: uuid(),
            queueTrigger,
            dequeueCount: 1,
            insertionTime: new Date(now).toJSON(),
            expirationTime: new Date(now + (7 * 24 * 60 * 60 * 1000)).toJSON(),
            nextVisibleTime: new Date(now + (5 * 60 * 1000)).toJSON(),
            popReceipt: uuid(),
        });
    }

    static createFromDequeuedMessageItem(messageItem: DequeuedMessageItem): QueueBinding {
        const keys = Object.keys(MESSAGE_MAP) as (keyof DequeuedMessageItem)[];
        const bindingData = keys.reduce<QueueBindingData>((bindingData, messageKey) => {
            const key = MESSAGE_MAP[messageKey];
            return {
                ...bindingData,
                [key]: messageItem[messageKey],
            };
        }, {} as QueueBindingData);
        return new QueueBinding(bindingData);
    }

    private readonly data: QueueBindingData;

    constructor(bindingData: QueueBindingData) {
        this.data = bindingData;
    }

    toContextBinding(): ContextBindings {
        return this.data;
    }

    toTrigger(): string {
        return this.data.queueTrigger;
    }
}
