# stub-azure-function-context

Aims to implement the context object as described on the [Azure Functions JavaScript Developer Guide](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node#context-object)
and allow developers to call azure functions for testing purposes.

## Usage

This library works by accepting a set of binding definitions much like you would place in the `function.json` file.

There is support for the different [input styles](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node#inputs)
 which allow for:

1. Ordered arguments to your function, eg: `function (context, myTrigger, myInput, myOtherInput, ...)`
2. Named bindings to the context object: eg: `context.bindings.myTrigger`, `context.bindings.myInput`, etc

And the different [output styles](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node#outputs)
which allow for:

1. A function which is a Promise and resolves to an object with keys that match output bindings, eg:
 `return { myOutput: 'message', myOtherOutout: { body: 'success' } }`
2. Returning a value for a specified binding, eg: by using `name: '$return'` in the binding definition
3. Assigning values to `context.bindings`, eg: `context.bindings.myOutput = 'message'`, etc
4. Special support for HTTP Responses, eg: (`context.res.send(body?)`)

When the function has resolved the library will return either the manipulated context object to make assertions
against or the returned value *if* the special `$return` name is used for one of the output bindings.

If you follow the "ordered argument" pattern then you'll need to define the triggers/outputs in the same order
as in your `function.json`.

By default, logging uses `console` as a backend, although you can import and use `setContextLogger` to set your own.
Your logger will need to conform to the same interface as `console` and will be wrapped to work with the `context.log` interface.

Only the logger methods defined in the developer guide are available in the `stubContext` call:

  * `error`
  * `warn`
  * `info`
  * `verbose`

## Supported triggers and bindings

At the moment the following binding types are supported:

 - blob
 - http
 - queue
 - table
 - timer
 
 Complete list of bindings: https://docs.microsoft.com/bs-latn-ba/azure/azure-functions/functions-triggers-bindings#supported-bindings

## Function runner

The `runStubFunctionFromBindings` function is designed to take a function that conforms to the azure function spec, an array of bindings
which are defined in a similar way to those in `function.json`, and an optional `now` value (for mocking the time).

The function then builds a mocked `context` object and calls the function as it would be by the azure function runtime.
`runStubFunctionFromBindings` will return a `Promise` that will resolve once the function being tested calls `context.done`
or, if it's a Promise itself, when it resolves. The `runStubFunctionFromBindings` will resolve as either the `context` object
with the output bindings assigned (allowing assertions to be made against it) OR as the value that the Promise resolved to *if*
the binding name `$return` was used.

If the function errors, an error will be thrown.

It is possible to build your own custom context object and run that against the function using `callFunction` and is intended for
advanced uses where the `runStubFunctionFromBindings` does not meet requirements (such as returning both a `$return` and context
object is required - though this is not recommended by azure).

### Binding definitions

The binding definitions accepted by the function runner are designed to accept the same syntax as the `function.json` file with a
few differences. The most crucial is that triggers (eg: `httpTrigger`, `timerTrigger`) need a trigger object so that we can bind
a mocked trigger to the context object. This should be placed in the property `data` eg:

```js
runStubFunctionFromBindings(functionToTest, [
    { name: 'req', type: 'httpTrigger', direction: 'in', data: createHttpTrigger() },
]);
```

A set of helper methods have been exposed to make creating the triggers more simple:

 - `createHttpTrigger`
 - `createBlobTrigger`
 - `createQueueTrigger`
 - `createQueueTriggerFromMessage`
 - `createTableTrigger`
 - `createTimerTrigger`
 
 These all take a set of arguments to quickly create a trigger object that will conform to the expected trigger shapes.
 However, if these don't meet your needs, you can supply your own object or augment the returned object.
 
 It is worth noting that the `queue` trigger shape does not conform to the queue messages shape received from actual azure queues.
 Therefore another helper method has been provided: `createQueueTriggerFromMessage` which takes 1 argument (the queue message) and
 maps it to the expected shape for the trigger. This allows better integration with a mocked environment when using something
 like [azurite](https://hub.docker.com/_/microsoft-azure-storage-azurite).

### HTTP examples:

```js

const { runStubFunctionFromBindings, createHttpTrigger } = require('stub-azure-function-context');
const functionToTest = require('../function-under-test');

// Optional step to direct context.log output elsewhere:
const logger = require('./your-own-logger');
setContextLogger(logger);

describe('app code', () => {
	it('returns 200', async () => {
        const context = await runStubFunctionFromBindings(functionToTest, [
            { type: 'httpTrigger', name: 'req', direction: 'in', data: createHttpTrigger('GET', 'http://example.com') },
            { type: 'http', name: 'res', direction: 'out' },
        ], new Date());
	    expect(context).to.have.nested.property('res.status', 200);
	});
	it('returns 200 in promise/a+ style', (done) => {
		runStubFunctionFromBindings(functionToTest, [
            { type: 'httpTrigger', name: 'req', direction: 'in', data: createHttpTrigger('GET', 'http://example.com') },
            { type: 'http', name: 'res', direction: 'out' },
        ], new Date())
			.then((context) => {
				expect(context).to.have.nested.property('res.status', 200);
				done();
			})
			.catch(done);
	});
    it('supports $return values', async () => {
        const response = await runStubFunctionFromBindings(functionToTest, [
            { type: 'httpTrigger', name: 'req', direction: 'in', data: createHttpTrigger('GET', 'http://example.com') },
            { type: 'http', name: '$return', direction: 'out' },
        ], new Date());
        expect(response).to.have.nested.property('status', 200);
    });
});
```

### Queue examples

```js
const { 
    runStubFunctionFromBindings,
    createQueueTrigger,
    createQueueTriggerFromMessage,
} = require('stub-azure-function-context');
const functionToTest = require('./function-to-tes');
const { promisify } = require('util');
const { createQueueService, QueueMessageEncoder } = require('azure-storage');

describe('queue triggered message', () => {
    let queue;
    before('set up queue', () => {
        const queueSvc = createQueueService();
        queueSvc.messageEncoder = new QueueMessageEncoder.TextBase64QueueMessageEncoder();
        queue = {
            get: promisify(queueSvc.getMessage.bind(queueSvc)),
            create: promisify(queueSvc.createMessage.bind(queueSvc)),
        };
        return queue.create('my-message');
    });
    it('accepts a message', async () => {
        const message = await queue.get();
        const context = await runStubFunctionFromBindings(functionToTest, [
            { name: 'myInput', direction: 'in', type: 'queueTrigger', data: createQueueTriggerFromMessage(message) }
        ]);
        expect(context.bindings.myInput).to.have.property('queueTrigger', 'my-message');
    });
    it('accepts a mocked message', async () => {
        const messageText = 'my-other-message';
        const context = await runStubFunctionFromBindings(functionToTest, [
            { name: 'myInput', direction: 'in', type: 'queueTrigger', data: createQueueTrigger(messageText) }
        ]);
        expect(context.bindings.myInput).to.have.property('queueTrigger', 'my-other-message');
    });
});
```
