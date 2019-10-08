/* see https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook */

function addTrigger(context, definition, trigger) {
    const { name } = definition;
    const request = {
        data: 'http',
        http: trigger,
    };
    Object.assign(context.bindings, {
        [name]: trigger,
    });
    Object.assign(context.bindingData, {
        $request: request,
        ...trigger.body,
        query: trigger.query,
        headers: trigger.headers,
        req: request,
    });
    Object.assign(context, {
        req: trigger,
    });
}

/**
 * see https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node#response-object
 * see https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node#accessing-the-request-and-response
 * @param {{}} context
 */
function addOutputBinding(context) {
    const res = {
        headers: {},
        cookies: [],
        _done: () => {},
    };
    const setHeader = (header, value) => {
        if (header.toLowerCase() === 'cookie') {
            res.cookies.push(value);
        } else {
            res.headers[header.toLowerCase()] = value;
        }
    };
    const getHeader = (header) => {
        return res.headers[header.toLowerCase()];
    };
    Object.assign(res, {
        send: (body) => {
            res.body = body;
            Object.assign(context, {
                res: {
                    status: 200,
                    body: res.body,
                    headers: Object.assign(res.headers, {
                        cookie: res.cookies,
                    }),
                    isRaw: false,
                },
            });
            res._done();
        },
        set: setHeader,
        get: getHeader,
        header: setHeader,
    });
    Object.assign(context, {
        res,
    });
}

function addInputBinding() {
    throw new Error('Http cannot be an input binding');
}

/**
 * see https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node#request-object
 *
 * @param {string} [method]
 * @param {string} [url]
 * @param {{}} [headers]
 * @param {{}} [params]
 * @param {*} [body]
 * @param {{}} [query]
 * @param {string} [originalUrl]
 * @param {string} [rawBody]
 * @returns {{headers: {}, rawBody: string, method: string, query: {}, originalUrl: string, params: {}, body: *, url: string}}
 */
function createTrigger(method = 'GET', url = 'http://example.com/', headers = {}, params = {}, body, query = {}, originalUrl, rawBody) {
    let outBody;
    let outRawBody;
    if (body || rawBody) {
        outBody = body || JSON.parse(rawBody);
        outRawBody = rawBody || JSON.stringify(body);
    }
    return {
        method: method.toUpperCase(),
        url: url || originalUrl,
        originalUrl: originalUrl || url,
        headers,
        query,
        params,
        body: outBody,
        rawBody: outRawBody,
    };
}

function handles({ type }) {
    return ['http', 'httptrigger'].includes(type.toLowerCase());
}

module.exports = {
    addTrigger,
    addOutputBinding,
    addInputBinding,
    createTrigger,
    handles,
};
