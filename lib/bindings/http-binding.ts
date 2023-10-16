import { ContextBindings, Form, FormPart, HttpRequest } from '@azure/functions';
import { parse as parseContentType } from 'content-type';
import { URL } from 'url';
import { Binding } from '../types';

function safeJSONParse(text: string, reviver?: (this: any, key: string, value: any) => any) {
    try {
        return JSON.parse(text, reviver);
    } catch (e) {
        return undefined;
    }
}

class ObjectIterator<T extends Record<string, any>> implements Iterator<[keyof T, T]> {
    private data: [keyof T, T][];
    private index = 0;
    constructor(data: Record<keyof T, T>) {
        this.data = Object.entries<T>(data);
    }
    next(): IteratorResult<[keyof T, T], any> {
        try {
            return {
                value: this.data[this.index],
                done: this.data.length === this.index,
            }
        } finally {
            this.index++;
        }
    }
}

class FormData implements Form {
    private readonly data;
    constructor(data: Record<string, FormPart>) {
        this.data = data;
    }

    get length(): number {
        return Object.keys(this.data).length;
    }

    [Symbol.iterator](): Iterator<[string, FormPart]> {
        return new ObjectIterator(this.data);
    }

    get(name: string): FormPart | null {
        return this.data[name] ?? null;
    }

    getAll(name: string): FormPart[] {
        if (this.has(name)) {
            return [this.get(name) as FormPart];
        }
        return [];
    }

    has(name: string): boolean {
        return Object.prototype.hasOwnProperty.call(this.data, name);
    }
}

function createHttpRequest(data: Partial<HttpRequest> = {}): HttpRequest {
    return {
        headers: Object.entries(data.headers || {}).reduce((headers, [key, value]) => {
            return {
                ...headers,
                [key.toLowerCase()]: value,
            };
        }, {}),
        get(field: string): string | undefined {
            return this.headers[field.toLowerCase()];
        },
        bufferBody: data.bufferBody ?? data.rawBody ? Buffer.from(data.rawBody) : Buffer.from(data.body ? JSON.stringify(data.body) : []),
        body: data.body ?? safeJSONParse(data.rawBody) ?? data.rawBody,
        method: data.method ?? 'GET',
        params: data.params ?? {},
        query: data.query ?? {},
        rawBody: data.rawBody ?? JSON.stringify(data.body),
        url: data.url ?? 'https://example.com/',
        user: data.user ?? null,
        parseFormBody(): Form {
            if (!this.headers['content-type']) {
                throw new Error('No content-type specified, cannot parse form body');
            }
            const contentType = parseContentType(this.headers['content-type']);
            if (['multipart/form-data', 'application/x-www-form-urlencoded'].includes(contentType.type)) {
                throw new Error('content-type must be one of multipart/form-data or application/x-www-form-urlencoded');
            }
            if (contentType.type === 'application/x-www-form-urlencoded') {
                const data = new URL(this.rawBody);
                return new FormData(Object.entries(data.searchParams).reduce((formData, [name, value]) => {
                    return {
                        ...formData,
                        [name]: { value: Buffer.from(value) },
                    };
                }, {}));
            }
            throw new Error('multipart/form-data support not yet implemented');
        },
        ...data.params,
    }
}

export class HttpBinding implements Binding {
    private readonly data: HttpRequest;
    constructor(bindingData?: Partial<Omit<HttpRequest, 'parseFormBody'>>) {
        this.data = createHttpRequest(bindingData);
    }

    toTrigger(): HttpRequest {
        return this.data;
    }

    toContextBinding(): ContextBindings {
        return this.data;
    }

    toBindingData(): ContextBindings {
        return this.data;
    }
}
