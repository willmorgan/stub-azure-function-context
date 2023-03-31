import { Binding } from '../types';
import { ContextBindings } from '@azure/functions';

/**
 * A set of key-value pairs representing the table entity.
 */
export type TableEntity<T extends object = Record<string, any>> = T & {
    /**
     * The PartitionKey property of the entity.
     */
    partitionKey: string;
    /**
     * The RowKey property of the entity.
     */
    rowKey: string;
};

export class TableBinding implements Binding {
    private readonly data: TableEntity;

    constructor(data: TableEntity) {
        this.data = data;
    }

    toTrigger() {
        return this.data;
    }

    toContextBinding() {
        const binding: ContextBindings = {
            ...this.data,
            RowKey: this.data.rowKey,
            PartitionKey: this.data.partitionKey,
        };
        delete binding.rowKey;
        delete binding.partitionKey;
        return binding;
    }

    toBindingData() {
        return this.data;
    }
}
