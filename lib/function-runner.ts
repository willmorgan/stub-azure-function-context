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

export async function functionRunner(azFunction: AzureFunction, bindingDefinitions: BindingDefinition[] | string = [], bindingData: Record<string, Binding> = {}, augmentContext?: AugmentContextCallback): Promise<any> {
    const context: Context = createContextForFunction(azFunction, bindingDefinitions, bindingData, augmentContext) as Context;
    const { triggers, inputs, outputs } = context.bindingDefinitions.reduce<{ inputs: BindingDefinition[]; outputs: BindingDefinition[]; triggers: BindingDefinition[] }>((definitions, next) => {
        if (next.type.toLowerCase().endsWith('trigger')) {
            definitions.triggers.push(next);
        } else if (next.direction === 'in') {
            definitions.inputs.push(next);
        } else if (next.direction === 'out') {
            definitions.outputs.push(next);
        }
        return definitions;
    }, { inputs: [], outputs: [], triggers: [] });
    if (triggers.length > 1) {
        throw new Error('Invalid binding definition, only one trigger can be defined');
    }
    const trigger = triggers.length ? bindingData[triggers[0].name]?.toTrigger(): undefined;
    if (trigger) {
        const binding = bindingData[triggers[0].name].toContextBinding();
        Object.assign(context.bindings, {
            [triggers[0].name]: binding,
        });
        Object.assign(context.bindingData, {
            ...binding,
        });
        if (triggers[0].type === 'http') {
            context.req = binding as HttpRequest;
        }
    }
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
    const httpOutput = outputs.find(({ type }) => type.toLowerCase() === 'http');
    let doneCalled = false;
    return new Promise((resolve, reject) => {
        const done = function (this: Context, err: Error | string | null, result: any) {
            if (doneCalled) {
                return;
            }
            doneCalled = true;
            if (err) {
                reject(err);
            } else if (outputs.some(({ name }) => name === '$return')) {
                if (httpOutput?.name === '$return') {
                    Object.assign(context, { res: result });
                }
                resolve(result);
            } else {
                if (result) {
                    Object.assign(context.bindings, result);
                } else if (httpOutput) {
                    // special case for HTTP outputs, the response can either be `context.res`
                    // or the named binding.
                    if (context.bindings[httpOutput.name]) {
                        Object.assign(context, {
                            res: context.bindings[httpOutput.name],
                        });
                    } else {
                        Object.assign(context.bindings, {
                            [httpOutput.name]: context.res,
                        });
                    }
                }
                resolve(context);
            }
        };
        context.done = done.bind(context);
        if (httpOutput) {
            Object.assign(context, {
                res: {
                    statusCode: 200,
                    headers: {},
                    cookies: [],
                    status(statusCode: number | string) {
                        this.statusCode = statusCode;
                        return this;
                    },
                    setHeader(header: string, val: any): HttpResponseFull {
                        if (header.toLowerCase() === 'cookie') {
                            this.cookies?.push(val);
                        } else {
                            this.headers = Object.assign(this.headers ?? {}, {
                                [header.toLowerCase()]: val,
                            });
                        }
                        return this;
                    },
                    getHeader(header: string): any {
                        if (this.headers) {
                            return this.headers[header.toLowerCase()];
                        }
                    },
                    set(field: string, val: any): HttpResponseFull {
                        return this.setHeader(field, val);
                    },
                    get(field: string): any {
                        return this.getHeader(field);
                    },
                    removeHeader(field: string): HttpResponseFull {
                        if (this.headers) {
                            delete this.headers[field.toLowerCase()];
                        }
                        return this;
                    },
                    type(type: string): HttpResponseFull {
                        this.setHeader('content-type', type);
                        return this;
                    },
                    send(body?: any): HttpResponseFull {
                        this.body = body;
                        context.done();
                        return this;
                    },
                    sendStatus(statusCode: string | number): HttpResponseFull {
                        this.statusCode = statusCode;
                        context.done();
                        return this;
                    },
                    header(field: string, val: any): HttpResponseFull {
                        return this.setHeader(field, val);
                    },
                    json(body?: any) {
                        this.type('application/json');
                        this.send(body);
                    },
                    end(body?: any): HttpResponseFull {
                        return this.send(body);
                    },
                } as HttpResponseFull,
            });
        }
        try {
            const result = azFunction(context, ...[trigger, ...Object.values(inputBindings)].filter((val) => !!val));
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
