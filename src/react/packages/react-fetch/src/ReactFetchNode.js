/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import * as http from 'http';
import * as https from 'https';

import {readCache} from 'react/unstable-cache';

function nodeFetch(url, options, onResolve, onReject) {
  const {hostname, pathname, search, port, protocol} = new URL(url);
  const nodeOptions = {
    hostname,
    port,
    path: pathname + search,
    // TODO: cherry-pick supported user-passed options.
  };
  const nodeImpl = protocol === 'https:' ? https : http;
  const request = nodeImpl.request(nodeOptions, (response) => {
    // TODO: support redirects.
    onResolve(new Response(response));
  });
  request.on('error', (error) => {
    onReject(error);
  });
  request.end();
}

const Pending = 0;
const Resolved = 1;
const Rejected = 2;

const fetchKey = {};

function readResultMap() {
  const resources = readCache().resources;
  let map = resources.get(fetchKey);
  if (map === undefined) {
    map = new Map();
    resources.set(fetchKey, map);
  }
  return map;
}

function readResult(result) {
  if (result.status === Resolved) {
    return result.value;
  } else {
    throw result.value;
  }
}

function Response(nativeResponse) {
  this.headers = nativeResponse.headers;
  this.ok = nativeResponse.statusCode >= 200 && nativeResponse.statusCode < 300;
  this.redirected = false; // TODO
  this.status = nativeResponse.statusCode;
  this.statusText = nativeResponse.statusMessage;
  this.type = 'basic';
  this.url = nativeResponse.url;

  this._response = nativeResponse;
  this._blob = null;
  this._json = null;
  this._text = null;

  const callbacks = [];
  function wake() {
    // This assumes they won't throw.
    while (callbacks.length > 0) {
      const cb = callbacks.pop();
      cb();
    }
  }
  const result = (this._result = {
    status: Pending,
    value: {
      then(cb) {
        callbacks.push(cb);
      },
    },
  });
  const data = [];
  nativeResponse.on('data', (chunk) => data.push(chunk));
  nativeResponse.on('end', () => {
    if (result.status === Pending) {
      const resolvedResult = result;
      resolvedResult.status = Resolved;
      resolvedResult.value = Buffer.concat(data);
      wake();
    }
  });
  nativeResponse.on('error', (err) => {
    if (result.status === Pending) {
      const rejectedResult = result;
      rejectedResult.status = Rejected;
      rejectedResult.value = err;
      wake();
    }
  });
}

Response.prototype = {
  constructor: Response,
  arrayBuffer() {
    const buffer = readResult(this._result);
    return buffer;
  },
  blob() {
    // TODO: Is this needed?
    throw new Error('Not implemented.');
  },
  json() {
    const buffer = readResult(this._result);
    return JSON.parse(buffer.toString());
  },
  text() {
    const buffer = readResult(this._result);
    return buffer.toString();
  },
};

function preloadResult(url, options) {
  const map = readResultMap();
  let entry = map.get(url);
  if (!entry) {
    if (options) {
      if (options.method || options.body || options.signal) {
        // TODO: wire up our own cancellation mechanism.
        // TODO: figure out what to do with POST.
        throw Error('Unsupported option');
      }
    }
    const callbacks = [];
    const wakeable = {
      then(cb) {
        callbacks.push(cb);
      },
    };
    const wake = () => {
      // This assumes they won't throw.
      while (callbacks.length > 0) {
        const cb = callbacks.pop();
        cb();
      }
    };
    const result = (entry = {
      status: Pending,
      value: wakeable,
    });
    nodeFetch(
      url,
      options,
      (response) => {
        if (result.status === Pending) {
          const resolvedResult = result;
          resolvedResult.status = Resolved;
          resolvedResult.value = response;
          wake();
        }
      },
      (err) => {
        if (result.status === Pending) {
          const rejectedResult = result;
          rejectedResult.status = Rejected;
          rejectedResult.value = err;
          wake();
        }
      },
    );
    map.set(url, entry);
  }
  return entry;
}

export function preload(url, options) {
  preloadResult(url, options);
  // Don't return anything.
}

export function fetch(url, options) {
  const result = preloadResult(url, options);
  return readResult(result);
}
