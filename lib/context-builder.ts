import {
    AzureFunction,
    BindingDefinition,
    Context,
    ContextBindings,
    Logger,
} from '@azure/functions';
import { v4 as uuid } from 'uuid';

export type AugmentContextCallback = (context: Omit<Context, 'done'>) => void;

function createConsoleLogger(): Logger {
    const logger = (...args: any[]) => console.log(...args);
    logger.verbose = (...args: any[]) => console.debug(...args);
    logger.info = (...args: any[]) => console.info(...args);
    logger.warn = (...args: any[]) => console.warn(...args);
    logger.error = (...args: any[]) => console.error(...args);
    return logger;
}

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
export type FunctionJson = {
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

export function createContextForFunction(azFunction: AzureFunction, bindingDefinitions: BindingDefinition[] | string, bindingData: Record<string, ContextBindings>, augmentContext?: AugmentContextCallback): Omit<Context, 'done'> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const context = createBaseContext(azFunction, typeof bindingDefinitions === 'string' ? require(bindingDefinitions).bindings : bindingDefinitions);
    // iterate over binding definitions creating triggers/inputs/outputs
    if (augmentContext) {
        augmentContext(context);
    }
    return context;
}
