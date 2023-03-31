import { expect } from 'chai';
import { TableBinding } from '../lib';

describe('TableBinding', () => {
    describe('.toContextBinding()', () => {
        it('converts the rowKey/partitionKey props to title case', () => {
            const entity = {
                rowKey: 'an id',
                partitionKey: 'partition1',
                Prop1: 'test',
                Prop2: 'test 2',
            };
            const binding = new TableBinding(entity);
            expect(binding.toContextBinding()).to.deep.equal({
                RowKey: 'an id',
                PartitionKey: 'partition1',
                Prop1: 'test',
                Prop2: 'test 2',
            });
        });
    });
});
