import {
    AzureFunction,
    BindingDefinition as BaseBindingDefinition,
    Context,
    ContextBindings,
    HttpRequest,
    HttpResponseFull,
    Logger,
} from '@azure/functions';
import { v4 as uuid } from 'uuid';
import { extractBindings } from './utils';

function createConsoleLogger(): Logger {
    const logger = (...args: any[]) => console.log(...args);
    logger.verbose = (...args: any[]) => console.debug(...args);
    logger.info = (...args: any[]) => console.info(...args);
    logger.warn = (...args: any[]) => console.warn(...args);
    logger.error = (...args: any[]) => console.error(...args);
    return logger;
}

interface QueueBindingDefinition extends BaseBindingDefinition {
    queueName: string,
    connection: string;
}

interface TableBindingDefinition extends BaseBindingDefinition {
    tableName: string;
    partitionKey?: string;
    rowKey?: string;
    take?: number;
    filter?: string;
    connection: string;
}

export type BindingDefinition = QueueBindingDefinition | TableBindingDefinition | BaseBindingDefinition;

function createBaseContext(azFunction: AzureFunction, bindingDefinitions: BindingDefinition[]): Omit<Context, 'done'> {
    const invocationId = uuid();
    return {
        invocationId: invocationId,
        executionContext: {
            invocationId,
            functionName: azFunction.name,
            functionDirectory: __dirname,
            retryContext: null,
        },
        bindings: {},
        bindingData: {
            invocationId,
        },
        traceContext: {
            traceparent: null,
            tracestate: null,
            attributes: null,
        },
        bindingDefinitions,
        log: createConsoleLogger(),
    };
}

// see https://json.schemastore.org/function
export interface FunctionJson {
    disabled?: boolean;
    excluded?: boolean;
    scriptFile?: string;
    entryPoint?: string;
    retry?: {
        strategy?: 'exponentialBackoff' | 'fixedDelay';
        maxRetryCount?: number;
        delayInterval?: string;
        minimumInterval?: string;
        maximumInterval?: string;
    };
    bindings: BindingDefinition[];
}

export function createContextForFunction(azFunction: AzureFunction, bindingDefinitions: BindingDefinition[] | string, bindingData: Record<string, ContextBindings>, resolver: (err: null | Error, result?: any) => void): Context {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const context: Context = createBaseContext(azFunction, typeof bindingDefinitions === 'string' ? require(bindingDefinitions).bindings : bindingDefinitions) as Context;
    // iterate over binding definitions creating triggers/inputs/outputs
    const { trigger, inputs, outputs } = extractBindings(context.bindingDefinitions);
    if (trigger) {
        const binding = bindingData[trigger.name].toContextBinding();
        Object.assign(context.bindings, {
            [trigger.name]: binding,
        });
        Object.assign(context.bindingData, {
            ...bindingData[trigger.name].toBindingData(),
        });
        if (trigger.type.toLowerCase() === 'httptrigger') {
            context.req = binding as HttpRequest;
        }
    }
    inputs.forEach((input) => {
        const binding = bindingData[input.name].toContextBinding();
        Object.assign(context.bindings, {
            [input.name]: binding,
        });
        Object.assign(context.bindingData, {
            ...bindingData[trigger.name].toBindingData(),
        });
    });
    const httpOutput = outputs.find(({ type }) => type.toLowerCase() === 'http');
    let doneCalled = false;
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
                    this.headers = Object.assign(this.headers ?? {}, {
                        [header.toLowerCase()]: val,
                    });
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
    const done = function (this: Context, err: Error | string | null, result: any) {
        if (doneCalled) {
            return;
        }
        doneCalled = true;
        if (err) {
            resolver(err as Error);
        } else if (outputs.some(({ name }) => name === '$return')) {
            if (httpOutput?.name === '$return') {
                Object.assign(context, { res: result });
            }
            resolver(null, result);
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
            resolver(null, context);
        }
    };
    Object.assign(context, {
        done: done.bind(context),
    });
    return context;
}
