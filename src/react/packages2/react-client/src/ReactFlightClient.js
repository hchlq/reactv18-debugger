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

import {REACT_LAZY_TYPE, REACT_ELEMENT_TYPE} from 'shared/ReactSymbols';

import {getOrCreateServerContext} from 'shared/ReactServerContextRegistry';

const PENDING = 0;
const RESOLVED_MODEL = 1;
const RESOLVED_MODULE = 2;
const INITIALIZED = 3;
const ERRORED = 4;

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
    case RESOLVED_MODULE:
      return initializeModuleChunk(chunk);
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

function createInitializedChunk(response, value) {
  return new Chunk(INITIALIZED, value, response);
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

function createResolvedModuleChunk(response, value) {
  return new Chunk(RESOLVED_MODULE, value, response);
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

function resolveModuleChunk(chunk, value) {
  if (chunk._status !== PENDING) {
    // We already resolved. We didn't expect to see this.
    return;
  }
  const listeners = chunk._value;
  const resolvedChunk = chunk;
  resolvedChunk._status = RESOLVED_MODULE;
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

function initializeModuleChunk(chunk) {
  const value = requireModule(chunk._value);
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

function createLazyChunkWrapper(chunk) {
  const lazyType = {
    $$typeof: REACT_LAZY_TYPE,
    _payload: chunk,
    _init: readChunk,
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
  switch (value[0]) {
    case '$': {
      if (value === '$') {
        return REACT_ELEMENT_TYPE;
      } else if (value[1] === '$' || value[1] === '@') {
        // This was an escaped string value.
        return value.substring(1);
      } else {
        const id = parseInt(value.substring(1), 16);
        const chunk = getChunk(response, id);
        return readChunk(chunk);
      }
    }
    case '@': {
      const id = parseInt(value.substring(1), 16);
      const chunk = getChunk(response, id);
      // We create a React.lazy wrapper around any lazy values.
      // When passed into React, we'll know how to suspend on this.
      return createLazyChunkWrapper(chunk);
    }
  }
  return value;
}

export function parseModelTuple(response, value) {
  const tuple = value;

  if (tuple[0] === REACT_ELEMENT_TYPE) {
    // TODO: Consider having React just directly accept these arrays as elements.
    // Or even change the ReactElement type to be an array.
    return createElement(tuple[1], tuple[2], tuple[3]);
  }
  return value;
}

export function createResponse(bundlerConfig) {
  const chunks = new Map();
  const response = {
    _bundlerConfig: bundlerConfig,
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

export function resolveProvider(response, id, contextName) {
  const chunks = response._chunks;
  chunks.set(
    id,
    createInitializedChunk(
      response,
      getOrCreateServerContext(contextName).Provider,
    ),
  );
}

export function resolveModule(response, id, model) {
  const chunks = response._chunks;
  const chunk = chunks.get(id);
  const moduleMetaData = parseModel(response, model);
  const moduleReference = resolveModuleReference(
    response._bundlerConfig,
    moduleMetaData,
  );

  // TODO: Add an option to encode modules that are lazy loaded.
  // For now we preload all modules as early as possible since it's likely
  // that we'll need them.
  preloadModule(moduleReference);

  if (!chunk) {
    chunks.set(id, createResolvedModuleChunk(response, moduleReference));
  } else {
    resolveModuleChunk(chunk, moduleReference);
  }
}

export function resolveSymbol(response, id, name) {
  const chunks = response._chunks;
  // We assume that we'll always emit the symbol before anything references it
  // to save a few bytes.
  chunks.set(id, createInitializedChunk(response, Symbol.for(name)));
}

export function resolveError(response, id, message, stack) {
  // eslint-disable-next-line react-internal/prod-error-codes
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
