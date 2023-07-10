# stub-azure-function-context

[![Build Status](https://github.com/willmorgan/stub-azure-function-context/actions/workflows/nodejs.yml/badge.svg)](https://github.com/willmorgan/stub-azure-function-context/actions/workflows/nodejs.yml)

Aims to implement the context object as described on the [Azure Functions JavaScript Developer Guide](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node#context-object)
and allow developers to execute azure functions for testing purposes.

## Usage

This library works by accepting an Azure Function, the binding definitions (as you'd place in the `function.json` file),
and trigger data.

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

If you follow the "ordered argument" pattern then you'll need to define the triggers in the same order
as in your `function.json`.

By default, logging uses `console`, you can change this by manipulating the context object before it is passed to
your function:

```js
const { functionRunner } = require('stub-azure-function-context');
const myFunction = require('./path/to/function');
const myLogger = require('./path/to/logger');

functionRunner(myFunction, [], {}, (context) => {
    context.log = myLogger;
});
```

Only the logger methods defined in the developer guide are available in the `stubContext` call:

  * `error`
  * `warn`
  * `info`
  * `verbose`

## Supported triggers and bindings

The library ships with built-in support for Table, Queue, Timer, and HTTP triggers. Other triggers can be supported
simply by providing an object that conforms to the `Binding` interface (it provides `toTrigger()`, `toBindingData()`,
and `toContextBinding()` methods).

The `toTrigger()` method returns the object/value that is passed to the Azure Function as the second parameter.
For example, queue triggers are the message text or objects (in servicebus queue).

The `toContextBinding()` method should return the object shape that is bound to the `bindingData` property of the context
for the input binding/trigger. For example, this would be the entire queue message object for queue triggers.

Complete list of bindings: https://docs.microsoft.com/bs-latn-ba/azure/azure-functions/functions-triggers-bindings#supported-bindings

## Function runner

The function runner takes up to 4 arguments: `functionRunner(azFunction, bindingDefinitions = [], bindingData = {}, augmentContext)`.

The first argument `azFunction` is the azure function you wish to execute.

The second argument `bindingDefinitions` is the array of bindings associated with the function, this is what is found in the
`bindings` property defined in the `function.json` file for your function. Alternatively you can provide a string, which represents
the location of the `function.json` file on the filesystem and the library will load the binding definitions from there.

The third argument `bindingData` is a map of [binding name] => `bindingData`. The `bindingData` object must conform to the
`Binding` interface (see above section) and the binding name must match that used in the `bindingDefinitions`.

The fourth argument `augmentContext` is a callback function that is passed the context object before the function is executed.
This allows any "just in time" changes to the context object or even a way to reference it in your tests if you need to spy on
it. This function should change the context by reference, the return value of the function is not used.

### Running a function

The function runner builds a mocked `context` object and calls the azure function as it would be by the azure function runtime.
`functionRunner` will return a `Promise` that will resolve once the function being tested calls `context.done`
or, if it's a Promise itself, when it resolves. The returned `Promise` will resolve as either the `context` object
with the output bindings assigned (allowing assertions to be made against it) OR as the value that the Promise resolved to *if*
the binding name `$return` was used.

If the function errors, an error will be thrown.

## Usage

### HTTP examples:

```js

const { functionRunner, HttpBinding } = require('stub-azure-function-context');
const { expect } = require('chai');
const functionToTest = require('../function-under-test');

describe('app code', () => {
    it('returns 200', async () => {
        const context = await functionRunner(functionToTest, [
            { type: 'httpTrigger', name: 'req', direction: 'in' },
            { type: 'http', name: 'res', direction: 'out' },
        ], { req: new HttpBinding({ method: 'GET', body: { hello: 'world!' } }) });
        expect(context).to.have.nested.property('res.status', 200);
    });
    it('returns 200 in promise/a+ style', (done) => {
        functionRunner(functionToTest, [
            { type: 'httpTrigger', name: 'req', direction: 'in' },
            { type: 'http', name: 'res', direction: 'out' },
        ], { req: new HttpBinding({ method: 'GET', body: { hello: 'world!' } }) })
            .then((context) => {
                expect(context).to.have.nested.property('res.status', 200);
                done();
            })
            .catch(done);
    });
    it('supports $return values', async () => {
        const response = await functionRunner(functionToTest, [
            { type: 'httpTrigger', name: 'req', direction: 'in' },
            { type: 'http', name: '$return', direction: 'out' },
        ], { req: new HttpBinding({ method: 'GET', body: { hello: 'world!' } }) });
        expect(response).to.have.nested.property('status', 200);
    });
});
```

### Queue examples

```js
const {
    functionRunner,
    QueueBinding,
} = require('stub-azure-function-context');
const functionToTest = require('./function-to-tes');
const { QueueServiceClient } = require("@azure/storage-queue");

const queueServiceClient = QueueServiceClient.fromConnectionString('UseDevelopmentStorage=true');

describe('queue triggered message', () => {
    let queue;
    before('create a test queue', () => {
        return queueServiceClient.getQueueClient('my-queue').create();
    });
    after('delete the test queue', () => {
        return queueServiceClient.getQueueClient('my-queue').delete();
    });
    beforeEach('insert a base64 encoded queue message', () => {
        return queueServiceClient.getQueueClient('my-queue').sendMessage(Buffer.from('my-message').toString('base64'));
    });
    it('accepts a message', async () => {
        // fetch a message and decode the base64 message
        const [message] = await queueServiceClient.getQueueClient('my-queue').receiveMessages({
            numOfMessages: 1,
        }).then((messages) => messages.map((message) => ({
            ...message,
            messageText: Buffer.from(message.messageText, 'base64').toString(),
        })));
        const context = await functionRunner(functionToTest, [
            { name: 'myInput', direction: 'in', type: 'queueTrigger' }
        ], { myInput: QueueBinding.createFromDequeuedMessageItem(message) });
        expect(context.bindings.myInput).to.have.property('queueTrigger', 'my-message');
    });
    it('accepts a mocked message', async () => {
        const messageText = 'my-other-message';
        const context = await functionRunner(functionToTest, [
            { name: 'myInput', direction: 'in', type: 'queueTrigger' }
        ], { myInput: QueueBinding.createFromMessageText('my-other-message') });
        expect(context.bindings.myInput).to.have.property('queueTrigger', 'my-other-message');
    });
});
```
