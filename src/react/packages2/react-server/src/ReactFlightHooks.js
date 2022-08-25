/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {REACT_SERVER_CONTEXT_TYPE} from 'shared/ReactSymbols';
import {readContext as readContextImpl} from './ReactFlightNewContext';

let currentRequest = null;

export function prepareToUseHooksForRequest(request) {
  currentRequest = request;
}

export function resetHooksForRequest() {
  currentRequest = null;
}

function readContext(context) {
  if (__DEV__) {
    if (context.$$typeof !== REACT_SERVER_CONTEXT_TYPE) {
      console.error('Only ServerContext is supported in Flight');
    }
    if (currentCache === null) {
      console.error(
        'Context can only be read while React is rendering. ' +
          'In classes, you can read it in the render method or getDerivedStateFromProps. ' +
          'In function components, you can read it directly in the function body, but not ' +
          'inside Hooks like useReducer() or useMemo().',
      );
    }
  }
  return readContextImpl(context);
}

export const Dispatcher = {
  useMemo(nextCreate) {
    return nextCreate();
  },
  useCallback(callback) {
    return callback;
  },
  useDebugValue() {},
  useDeferredValue: unsupportedHook,
  useTransition: unsupportedHook,
  getCacheForType(resourceType) {
    if (!currentCache) {
      throw new Error('Reading the cache is only supported while rendering.');
    }

    let entry = currentCache.get(resourceType);
    if (entry === undefined) {
      entry = resourceType();
      // TODO: Warn if undefined?
      currentCache.set(resourceType, entry);
    }
    return entry;
  },
  readContext,
  useContext: readContext,
  useReducer: unsupportedHook,
  useRef: unsupportedHook,
  useState: unsupportedHook,
  useInsertionEffect: unsupportedHook,
  useLayoutEffect: unsupportedHook,
  useImperativeHandle: unsupportedHook,
  useEffect: unsupportedHook,
  useId,
  useMutableSource: unsupportedHook,
  useSyncExternalStore: unsupportedHook,
  useCacheRefresh() {
    return unsupportedRefresh;
  },
};

function unsupportedHook() {
  throw new Error('This Hook is not supported in Server Components.');
}

function unsupportedRefresh() {
  if (!currentCache) {
    throw new Error(
      'Refreshing the cache is not supported in Server Components.',
    );
  }
}

let currentCache = null;

export function setCurrentCache(cache) {
  currentCache = cache;
  return currentCache;
}

export function getCurrentCache() {
  return currentCache;
}

function useId() {
  if (currentRequest === null) {
    throw new Error('useId can only be used while React is rendering');
  }
  const id = currentRequest.identifierCount++;
  // use 'S' for Flight components to distinguish from 'R' and 'r' in Fizz/Client
  return ':' + currentRequest.identifierPrefix + 'S' + id.toString(32) + ':';
}
