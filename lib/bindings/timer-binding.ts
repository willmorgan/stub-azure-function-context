// see https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-timer?tabs=in-process&pivots=programming-language-javascript
import { Binding } from '../types';
import { ContextBindings, Timer } from '@azure/functions';

export type TimerBindingData = {
    isPastDue?: boolean;
    adjustForDst?: boolean;
    now: Date;
    interval: number;
};

export class TimerBinding implements Binding {
    private readonly data: Timer;

    private readonly now: Date;

    constructor(timerData: TimerBindingData) {
        this.now = timerData.now;
        this.data = {
            isPastDue: timerData.isPastDue ?? false,
            schedule: {
                adjustForDST: timerData.adjustForDst ?? true,
            },
            scheduleStatus: {
                last: new Date(timerData.now.getTime() - (timerData.interval * 1000)).toISOString(),
                next: new Date(timerData.now.getTime() + (timerData.interval * 1000)).toISOString(),
                lastUpdated: timerData.now.toISOString(),
            },
        };
    }

    toContextBinding(): ContextBindings {
        return this.data;
    }

    toTrigger(): Timer {
        return this.data;
    }

    toBindingData(): Record<string, string> {
        // 26/01/2023 11:15:00
        const date = [
            this.now.getUTCDate().toString().padStart(2, '0'),
            '/',
            (this.now.getUTCMonth() + 1).toString().padStart(2, '0'),
            '/',
            this.now.getUTCFullYear(),
            ' ',
            this.now.getUTCHours().toString().padStart(2, '0'),
            ':',
            this.now.getUTCMinutes().toString().padStart(2, '0'),
            ':',
            this.now.getUTCSeconds().toString().padStart(2, '0'),
        ].join('');
        return { timerTrigger: date };
    }
}
