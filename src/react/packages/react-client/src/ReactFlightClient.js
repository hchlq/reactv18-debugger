/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {
  resolveModuleReference,
  preloadModule,
  requireModule,
  parseModel,
} from './ReactFlightClientHostConfig';

import {
  REACT_LAZY_TYPE,
  REACT_BLOCK_TYPE,
  REACT_ELEMENT_TYPE,
} from 'shared/ReactSymbols';

const PENDING = 0;
const RESOLVED_MODEL = 1;
const INITIALIZED = 2;
const ERRORED = 3;

function Chunk(status, value, response) {
  this._status = status;
  this._value = value;
  this._response = response;
}
Chunk.prototype.then = function (resolve) {
  const chunk = this;
  if (chunk._status === PENDING) {
    if (chunk._value === null) {
      chunk._value = [];
    }
    chunk._value.push(resolve);
  } else {
    resolve();
  }
};

function readChunk(chunk) {
  switch (chunk._status) {
    case INITIALIZED:
      return chunk._value;
    case RESOLVED_MODEL:
      return initializeModelChunk(chunk);
    case PENDING:
      // eslint-disable-next-line no-throw-literal
      throw chunk;
    default:
      throw chunk._value;
  }
}

function readRoot() {
  const response = this;
  const chunk = getChunk(response, 0);
  return readChunk(chunk);
}

function createPendingChunk(response) {
  return new Chunk(PENDING, null, response);
}

function createErrorChunk(response, error) {
  return new Chunk(ERRORED, error, response);
}

function wakeChunk(listeners) {
  if (listeners !== null) {
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i];
      listener();
    }
  }
}

function triggerErrorOnChunk(chunk, error) {
  if (chunk._status !== PENDING) {
    // We already resolved. We didn't expect to see this.
    return;
  }
  const listeners = chunk._value;
  const erroredChunk = chunk;
  erroredChunk._status = ERRORED;
  erroredChunk._value = error;
  wakeChunk(listeners);
}

function createResolvedModelChunk(response, value) {
  return new Chunk(RESOLVED_MODEL, value, response);
}

function resolveModelChunk(chunk, value) {
  if (chunk._status !== PENDING) {
    // We already resolved. We didn't expect to see this.
    return;
  }
  const listeners = chunk._value;
  const resolvedChunk = chunk;
  resolvedChunk._status = RESOLVED_MODEL;
  resolvedChunk._value = value;
  wakeChunk(listeners);
}

function initializeModelChunk(chunk) {
  const value = parseModel(chunk._response, chunk._value);
  const initializedChunk = chunk;
  initializedChunk._status = INITIALIZED;
  initializedChunk._value = value;
  return value;
}

// Report that any missing chunks in the model is now going to throw this
// error upon read. Also notify any pending promises.
export function reportGlobalError(response, error) {
  response._chunks.forEach((chunk) => {
    // If this chunk was already resolved or errored, it won't
    // trigger an error but if it wasn't then we need to
    // because we won't be getting any new data to resolve it.
    triggerErrorOnChunk(chunk, error);
  });
}

function readMaybeChunk(maybeChunk) {
  if (maybeChunk == null || !(maybeChunk instanceof Chunk)) {
    // $FlowFixMe
    return maybeChunk;
  }
  const chunk = maybeChunk;
  return readChunk(chunk);
}

function createElement(type, key, props) {
  const element = {
    // This tag allows us to uniquely identify this as a React Element
    $$typeof: REACT_ELEMENT_TYPE,

    // Built-in properties that belong on the element
    type: type,
    key: key,
    ref: null,
    props: props,

    // Record the component responsible for creating this element.
    _owner: null,
  };
  if (__DEV__) {
    // We don't really need to add any of these but keeping them for good measure.
    // Unfortunately, _store is enumerable in jest matchers so for equality to
    // work, I need to keep it or make _store non-enumerable in the other file.
    element._store = {};
    Object.defineProperty(element._store, 'validated', {
      configurable: false,
      enumerable: false,
      writable: true,
      value: true, // This element has already been validated on the server.
    });
    Object.defineProperty(element, '_self', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: null,
    });
    Object.defineProperty(element, '_source', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: null,
    });
  }
  return element;
}

function initializeBlock(tuple) {
  // Require module first and then data. The ordering matters.
  const moduleMetaData = readMaybeChunk(tuple[1]);
  const moduleReference = resolveModuleReference(moduleMetaData);
  // TODO: Do this earlier, as the chunk is resolved.
  preloadModule(moduleReference);

  const moduleExport = requireModule(moduleReference);

  // The ordering here is important because this call might suspend.
  // We don't want that to prevent the module graph for being initialized.
  const data = readMaybeChunk(tuple[2]);

  return {
    $$typeof: REACT_BLOCK_TYPE,
    _status: -1,
    _data: data,
    _render: moduleExport,
  };
}

function createLazyBlock(tuple) {
  const lazyType = {
    $$typeof: REACT_LAZY_TYPE,
    _payload: tuple,
    _init: initializeBlock,
  };
  return lazyType;
}

function getChunk(response, id) {
  const chunks = response._chunks;
  let chunk = chunks.get(id);
  if (!chunk) {
    chunk = createPendingChunk(response);
    chunks.set(id, chunk);
  }
  return chunk;
}

export function parseModelString(response, parentObject, value) {
  if (value[0] === '$') {
    if (value === '$') {
      return REACT_ELEMENT_TYPE;
    } else if (value[1] === '$' || value[1] === '@') {
      // This was an escaped string value.
      return value.substring(1);
    } else {
      const id = parseInt(value.substring(1), 16);
      const chunk = getChunk(response, id);
      if (parentObject[0] === REACT_BLOCK_TYPE) {
        // Block types know how to deal with lazy values.
        return chunk;
      }
      // For anything else we must Suspend this block if
      // we don't yet have the value.
      return readChunk(chunk);
    }
  }
  if (value === '@') {
    return REACT_BLOCK_TYPE;
  }
  return value;
}

export function parseModelTuple(response, value) {
  const tuple = value;
  if (tuple[0] === REACT_ELEMENT_TYPE) {
    // TODO: Consider having React just directly accept these arrays as elements.
    // Or even change the ReactElement type to be an array.
    return createElement(tuple[1], tuple[2], tuple[3]);
  } else if (tuple[0] === REACT_BLOCK_TYPE) {
    // TODO: Consider having React just directly accept these arrays as blocks.
    return createLazyBlock(tuple);
  }
  return value;
}

export function createResponse() {
  const chunks = new Map();
  const response = {
    _chunks: chunks,
    readRoot: readRoot,
  };
  return response;
}

export function resolveModel(response, id, model) {
  const chunks = response._chunks;
  const chunk = chunks.get(id);
  if (!chunk) {
    chunks.set(id, createResolvedModelChunk(response, model));
  } else {
    resolveModelChunk(chunk, model);
  }
}

export function resolveError(response, id, message, stack) {
  const error = new Error(message);
  error.stack = stack;
  const chunks = response._chunks;
  const chunk = chunks.get(id);
  if (!chunk) {
    chunks.set(id, createErrorChunk(response, error));
  } else {
    triggerErrorOnChunk(chunk, error);
  }
}

export function close(response) {
  // In case there are any remaining unresolved chunks, they won't
  // be resolved now. So we need to issue an error to those.
  // Ideally we should be able to early bail out if we kept a
  // ref count of pending chunks.
  reportGlobalError(response, new Error('Connection closed.'));
}
