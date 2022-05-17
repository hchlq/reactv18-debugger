/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {
  scheduleWork,
  beginWriting,
  writeChunk,
  completeWriting,
  flushBuffered,
  close,
  processModelChunk,
  processErrorChunk,
  resolveModuleMetaData,
} from './ReactFlightServerConfig';

import {
  REACT_BLOCK_TYPE,
  REACT_ELEMENT_TYPE,
  REACT_DEBUG_TRACING_MODE_TYPE,
  REACT_FORWARD_REF_TYPE,
  REACT_FRAGMENT_TYPE,
  REACT_LAZY_TYPE,
  REACT_LEGACY_HIDDEN_TYPE,
  REACT_MEMO_TYPE,
  REACT_OFFSCREEN_TYPE,
  REACT_PROFILER_TYPE,
  REACT_SCOPE_TYPE,
  REACT_SERVER_BLOCK_TYPE,
  REACT_STRICT_MODE_TYPE,
  REACT_SUSPENSE_TYPE,
  REACT_SUSPENSE_LIST_TYPE,
} from 'shared/ReactSymbols';

import * as React from 'react';
import ReactSharedInternals from 'shared/ReactSharedInternals';
import invariant from 'shared/invariant';

const ReactCurrentDispatcher = ReactSharedInternals.ReactCurrentDispatcher;

export function createRequest(model, destination, bundlerConfig) {
  const pingedSegments = [];
  const request = {
    destination,
    bundlerConfig,
    nextChunkId: 0,
    pendingChunks: 0,
    pingedSegments: pingedSegments,
    completedJSONChunks: [],
    completedErrorChunks: [],
    flowing: false,
    toJSON: function (key, value) {
      return resolveModelToJSON(request, this, key, value);
    },
  };
  request.pendingChunks++;
  const rootSegment = createSegment(request, () => model);
  pingedSegments.push(rootSegment);
  return request;
}

function attemptResolveElement(element) {
  const type = element.type;
  const props = element.props;
  if (typeof type === 'function') {
    // This is a server-side component.
    return type(props);
  } else if (typeof type === 'string') {
    // This is a host element. E.g. HTML.
    return [REACT_ELEMENT_TYPE, type, element.key, element.props];
  } else if (type[0] === REACT_SERVER_BLOCK_TYPE) {
    return [REACT_ELEMENT_TYPE, type, element.key, element.props];
  } else if (
    type === REACT_FRAGMENT_TYPE ||
    type === REACT_STRICT_MODE_TYPE ||
    type === REACT_PROFILER_TYPE ||
    type === REACT_SCOPE_TYPE ||
    type === REACT_DEBUG_TRACING_MODE_TYPE ||
    type === REACT_LEGACY_HIDDEN_TYPE ||
    type === REACT_OFFSCREEN_TYPE ||
    // TODO: These are temporary shims
    // and we'll want a different behavior.
    type === REACT_SUSPENSE_TYPE ||
    type === REACT_SUSPENSE_LIST_TYPE
  ) {
    return element.props.children;
  } else if (type != null && typeof type === 'object') {
    switch (type.$$typeof) {
      case REACT_FORWARD_REF_TYPE: {
        const render = type.render;
        return render(props, undefined);
      }
      case REACT_MEMO_TYPE: {
        const nextChildren = React.createElement(type.type, element.props);
        return attemptResolveElement(nextChildren);
      }
    }
  }
  invariant(false, 'Unsupported type.');
}

function pingSegment(request, segment) {
  const pingedSegments = request.pingedSegments;
  pingedSegments.push(segment);
  if (pingedSegments.length === 1) {
    scheduleWork(() => performWork(request));
  }
}

function createSegment(request, query) {
  const id = request.nextChunkId++;
  const segment = {
    id,
    query,
    ping: () => pingSegment(request, segment),
  };
  return segment;
}

function serializeIDRef(id) {
  return '$' + id.toString(16);
}

function escapeStringValue(value) {
  if (value[0] === '$' || value[0] === '@') {
    // We need to escape $ or @ prefixed strings since we use those to encode
    // references to IDs and as special symbol values.
    return '$' + value;
  } else {
    return value;
  }
}

export function resolveModelToJSON(request, parent, key, value) {
  // Special Symbols
  switch (value) {
    case REACT_ELEMENT_TYPE:
      return '$';
    case REACT_SERVER_BLOCK_TYPE:
      return '@';
    case REACT_LAZY_TYPE:
    case REACT_BLOCK_TYPE:
      invariant(
        false,
        'React Blocks (and Lazy Components) are expected to be replaced by a ' +
          'compiler on the server. Try configuring your compiler set up and avoid ' +
          'using React.lazy inside of Blocks.',
      );
  }

  if (parent[0] === REACT_SERVER_BLOCK_TYPE) {
    // We're currently encoding part of a Block. Look up which key.
    switch (key) {
      case '1': {
        // Module reference
        const moduleReference = value;
        try {
          const moduleMetaData = resolveModuleMetaData(
            request.bundlerConfig,
            moduleReference,
          );
          return moduleMetaData;
        } catch (x) {
          request.pendingChunks++;
          const errorId = request.nextChunkId++;
          emitErrorChunk(request, errorId, x);
          return serializeIDRef(errorId);
        }
      }
      case '2': {
        // Load function
        const load = value;
        try {
          // Attempt to resolve the data.
          return load();
        } catch (x) {
          if (
            typeof x === 'object' &&
            x !== null &&
            typeof x.then === 'function'
          ) {
            // Something suspended, we'll need to create a new segment and resolve it later.
            request.pendingChunks++;
            const newSegment = createSegment(request, load);
            const ping = newSegment.ping;
            x.then(ping, ping);
            return serializeIDRef(newSegment.id);
          } else {
            // This load failed, encode the error as a separate row and reference that.
            request.pendingChunks++;
            const errorId = request.nextChunkId++;
            emitErrorChunk(request, errorId, x);
            return serializeIDRef(errorId);
          }
        }
      }
      default: {
        invariant(
          false,
          'A server block should never encode any other slots. This is a bug in React.',
        );
      }
    }
  }

  if (typeof value === 'string') {
    return escapeStringValue(value);
  }

  // Resolve server components.
  while (
    typeof value === 'object' &&
    value !== null &&
    value.$$typeof === REACT_ELEMENT_TYPE
  ) {
    // TODO: Concatenate keys of parents onto children.
    const element = value;
    try {
      // Attempt to render the server component.
      value = attemptResolveElement(element);
    } catch (x) {
      if (typeof x === 'object' && x !== null && typeof x.then === 'function') {
        // Something suspended, we'll need to create a new segment and resolve it later.
        request.pendingChunks++;
        const newSegment = createSegment(request, () => value);
        const ping = newSegment.ping;
        x.then(ping, ping);
        return serializeIDRef(newSegment.id);
      } else {
        // Something errored. Don't bother encoding anything up to here.
        throw x;
      }
    }
  }

  return value;
}

function emitErrorChunk(request, id, error) {
  // TODO: We should not leak error messages to the client in prod.
  // Give this an error code instead and log on the server.
  // We can serialize the error in DEV as a convenience.
  let message;
  let stack = '';
  try {
    if (error instanceof Error) {
      message = '' + error.message;
      stack = '' + error.stack;
    } else {
      message = 'Error: ' + error;
    }
  } catch (x) {
    message = 'An error occurred but serializing the error message failed.';
  }

  const processedChunk = processErrorChunk(request, id, message, stack);
  request.completedErrorChunks.push(processedChunk);
}

function retrySegment(request, segment) {
  const query = segment.query;
  let value;
  try {
    value = query();
    while (
      typeof value === 'object' &&
      value !== null &&
      value.$$typeof === REACT_ELEMENT_TYPE
    ) {
      // TODO: Concatenate keys of parents onto children.
      const element = value;
      // Attempt to render the server component.
      // Doing this here lets us reuse this same segment if the next component
      // also suspends.
      segment.query = () => value;
      value = attemptResolveElement(element);
    }
    const processedChunk = processModelChunk(request, segment.id, value);
    request.completedJSONChunks.push(processedChunk);
  } catch (x) {
    if (typeof x === 'object' && x !== null && typeof x.then === 'function') {
      // Something suspended again, let's pick it back up later.
      const ping = segment.ping;
      x.then(ping, ping);
      return;
    } else {
      // This errored, we need to serialize this error to the
      emitErrorChunk(request, segment.id, x);
    }
  }
}

function performWork(request) {
  const prevDispatcher = ReactCurrentDispatcher.current;
  ReactCurrentDispatcher.current = Dispatcher;

  const pingedSegments = request.pingedSegments;
  request.pingedSegments = [];
  for (let i = 0; i < pingedSegments.length; i++) {
    const segment = pingedSegments[i];
    retrySegment(request, segment);
  }
  if (request.flowing) {
    flushCompletedChunks(request);
  }

  ReactCurrentDispatcher.current = prevDispatcher;
}

let reentrant = false;
function flushCompletedChunks(request) {
  if (reentrant) {
    return;
  }
  reentrant = true;
  const destination = request.destination;
  beginWriting(destination);
  try {
    const jsonChunks = request.completedJSONChunks;
    let i = 0;
    for (; i < jsonChunks.length; i++) {
      request.pendingChunks--;
      const chunk = jsonChunks[i];
      if (!writeChunk(destination, chunk)) {
        request.flowing = false;
        i++;
        break;
      }
    }
    jsonChunks.splice(0, i);
    const errorChunks = request.completedErrorChunks;
    i = 0;
    for (; i < errorChunks.length; i++) {
      request.pendingChunks--;
      const chunk = errorChunks[i];
      if (!writeChunk(destination, chunk)) {
        request.flowing = false;
        i++;
        break;
      }
    }
    errorChunks.splice(0, i);
  } finally {
    reentrant = false;
    completeWriting(destination);
  }
  flushBuffered(destination);
  if (request.pendingChunks === 0) {
    // We're done.
    close(destination);
  }
}

export function startWork(request) {
  request.flowing = true;
  scheduleWork(() => performWork(request));
}

export function startFlowing(request) {
  request.flowing = true;
  flushCompletedChunks(request);
}

function unsupportedHook() {
  invariant(false, 'This Hook is not supported in Server Components.');
}

const Dispatcher = {
  useMemo(nextCreate) {
    return nextCreate();
  },
  useCallback(callback) {
    return callback;
  },
  useDebugValue() {},
  useDeferredValue(value) {
    return value;
  },
  useTransition() {
    return [() => {}, false];
  },
  readContext: unsupportedHook,
  useContext: unsupportedHook,
  useReducer: unsupportedHook,
  useRef: unsupportedHook,
  useState: unsupportedHook,
  useLayoutEffect: unsupportedHook,
  useImperativeHandle: unsupportedHook,
  useEffect: unsupportedHook,
  useOpaqueIdentifier: unsupportedHook,
  useMutableSource: unsupportedHook,
};
