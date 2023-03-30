import { expect } from 'chai';
import { TimerBinding } from '../lib';

describe('TimerBinding', () => {
    describe('.toBindingData', () => {
        it('returns the idiosyncratic date', () => {
            const now = new Date('2023-03-30T13:01:04.123Z');
            const timer = new TimerBinding({
                now,
                interval: 5 * 60,
            });
            expect(timer.toBindingData()).to.deep.equal({ timerTrigger: '30/03/2023 13:01:04' });
        });
    });
});
