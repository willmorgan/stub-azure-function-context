import {
    AzureFunction,
    BindingDefinition,
    Context,
    ContextBindings,
    HttpRequest, HttpResponseFull,
} from '@azure/functions';
import {
    AugmentContextCallback,
    createContextForFunction,
} from './context-builder';

import { Binding } from './types';
import { extractBindings } from './utils';

export async function functionRunner(azFunction: AzureFunction, bindingDefinitions: BindingDefinition[] | string = [], bindingData: Record<string, Binding> = {}, augmentContext?: AugmentContextCallback): Promise<any> {
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
