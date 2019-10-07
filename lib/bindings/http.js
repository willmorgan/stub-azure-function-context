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

function addOutputBinding(context) {
    Object.assign(context, {
        res: {
            headers: {},
            status: 200,
            body: '',
            bodyRaw: '',
            isRaw: false,
        },
    });
}

function createTrigger(method, url, headers, params, body, query, originalUrl, rawBody) {
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

module.exports = {
    addTrigger,
    addOutputBinding,
    createTrigger,
};
