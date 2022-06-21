import { ContextBindings } from '@azure/functions';

export interface Binding {
    toTrigger(): ContextBindings | string;

    toContextBinding(): ContextBindings;
}
