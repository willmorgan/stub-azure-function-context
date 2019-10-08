# stub-azure-function-context

[![Build Status](https://semaphoreci.com/api/v1/willmorgan/stub-azure-function-context/branches/develop/badge.svg)](https://semaphoreci.com/willmorgan/stub-azure-function-context)

Aims to implement the context object as described on the [Azure Functions JavaScript Developer Guide](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node#context-object)
and allow developers to call azure functions for testing purposes.

### Usage

This library works by accepting a set of binding definitions much like you would place in the `function.json` file.

The is support for the different [input styles](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node#inputs)
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

### Supported triggers and bindings

At the moment the following binding types are supported:

 - blob
 - http
 - queue
 - table
 - timer
 
 Complete list of bindings: https://docs.microsoft.com/bs-latn-ba/azure/azure-functions/functions-triggers-bindings#supported-bindings

### Usage examples:

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
    })
});
```
