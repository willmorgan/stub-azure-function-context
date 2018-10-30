# stub-azure-function-context

[![Build Status](https://semaphoreci.com/api/v1/willmorgan/stub-azure-function-context/branches/develop/badge.svg)](https://semaphoreci.com/willmorgan/stub-azure-function-context)

Aims to implement the context object as described on the [Azure Functions JavaScript Developer Guide](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node#context-object).

### Usage

By default the behaviour assumes a `req` HTTP trigger and a `res` HTTP output, but if you have more exotic config, then
you can set that up!

If you follow the "ordered argument" pattern then you'll need to define the triggers/outputs in the same order
as in your `function.json`.

From 1.0.3 this library supports endpoint handlers returning Promise objects, and by extension, the async/await style.

`stubContext` resolves with an object containing:

```
{
    context: context, // the actual stubbed context object after your function manipulates it
    err: null|Error,  // any error thrown or passed to context.done; eg: context.done(new Error("Oops"))
    propertyBag: {},  // object of any overrides you want to make on your outputs
}
```

By default, logging uses `console` as a backend, although you can import and use `setContextLogger` to set your own.

Only the methods defined in the developer guide are available in the `stubContext` call:

  * `error`
  * `warn`
  * `info`
  * `verbose`


### Usage examples:

```js

const { stubContext, setContextLogger } = require('stub-azure-function-context');
const functionToTest = require('../function-under-test');

// Optional step to direct context.log output elsewhere:
const logger = require('./your-own-logger');
setContextLogger(logger);

describe('app code', () => {
	it('returns 200', async () => {
	    const { context, err, propertyBag, } = await stubContext(functionToTest);
	    expect(context).to.have.nested.property('res.status', 200);
	});
	it('returns 200 in promise/a+ style', (done) => {
		stubContext(functionToTest)
			.then(({ context, err, propertyBag }) => {
				expect(context).to.have.nested.property('res.status', 200);
				done();
			})
			.catch(done);
	});
	it('change trigger values before calling your function under test', async () => {
		const { context } = await stubContext((context, req, ...otherTriggers) => {
		    req.body = { 'helpful': 'test object' };
		    return functionToTest(context, req, ...otherTriggers);
		});
		expect(context).to.have.nested.property('res.body.helpful', 'test object');
	});
});
```
