import {
    AzureFunction,
    BindingDefinition,
    Context,
    ContextBindings,
} from '@azure/functions';
import { createContextForFunction } from './context-builder';
import { Binding } from './types';
import { extractBindings } from './utils';

export type AugmentContextCallback = (context: Context) => void;

export async function functionRunner<T extends AzureFunction = AzureFunction>(azFunction: T, bindingDefinitions: BindingDefinition[] | string = [], bindingData: Record<string, Binding> = {}, augmentContext?: AugmentContextCallback): Promise<Awaited<ReturnType<T>> extends void ? Context : Awaited<ReturnType<T>>> {
    return new Promise((resolve, reject) => {
        const resolver = (err: null | Error, result?: any) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        }
        const context: Context = createContextForFunction(azFunction, bindingDefinitions, bindingData, resolver);
        if (augmentContext) {
            augmentContext(context);
        }
        const { trigger, inputs, outputs } = extractBindings(context.bindingDefinitions);
        const triggerData = trigger ? bindingData[trigger.name]?.toTrigger(): undefined;
        const inputBindings: Record<string, ContextBindings> = inputs.reduce((bindings, { name }) => {
            const binding = bindingData[name];
            if (binding) {
                return {
                    ...bindings,
                    [name]: binding.toContextBinding(),
                };
            }
            return bindings;
        }, {});
        try {
            const result = azFunction(context, ...[triggerData, ...Object.values(inputBindings)].filter((val) => !!val));
            if (result && typeof result.then === 'function') {
                result.then((output) => {
                    if (outputs.some(({ name }) => name === '$return')) {
                        context.done(null, output);
                    } else {
                        context.done(null, context.bindings);
                    }
                }).catch(context.done);
            }
        } catch (e) {
            context.done(e as Error);
        }
    });
}
