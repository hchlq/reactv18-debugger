/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import invariant from 'shared/invariant';

import ReactCurrentDispatcher from './ReactCurrentDispatcher';

function resolveDispatcher() {
  const dispatcher = ReactCurrentDispatcher.current;
  invariant(
    dispatcher !== null,
    'Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for' +
      ' one of the following reasons:\n' +
      '1. You might have mismatching versions of React and the renderer (such as React DOM)\n' +
      '2. You might be breaking the Rules of Hooks\n' +
      '3. You might have more than one copy of React in the same app\n' +
      'See https://reactjs.org/link/invalid-hook-call for tips about how to debug and fix this problem.',
  );
  return dispatcher;
}

export function useContext(Context, unstable_observedBits) {
  const dispatcher = resolveDispatcher();
  if (__DEV__) {
    if (unstable_observedBits !== undefined) {
      console.error(
        'useContext() second argument is reserved for future ' +
          'use in React. Passing it is not supported. ' +
          'You passed: %s.%s',
        unstable_observedBits,
        typeof unstable_observedBits === 'number' && Array.isArray(arguments[2])
          ? '\n\nDid you call array.map(useContext)? ' +
              'Calling Hooks inside a loop is not supported. ' +
              'Learn more at https://reactjs.org/link/rules-of-hooks'
          : '',
      );
    }

    // TODO: add a more generic warning for invalid values.
    if (Context._context !== undefined) {
      const realContext = Context._context;
      // Don't deduplicate because this legitimately causes bugs
      // and nobody should be using this in existing code.
      if (realContext.Consumer === Context) {
        console.error(
          'Calling useContext(Context.Consumer) is not supported, may cause bugs, and will be ' +
            'removed in a future major release. Did you mean to call useContext(Context) instead?',
        );
      } else if (realContext.Provider === Context) {
        console.error(
          'Calling useContext(Context.Provider) is not supported. ' +
            'Did you mean to call useContext(Context) instead?',
        );
      }
    }
  }
  return dispatcher.useContext(Context, unstable_observedBits);
}

export function useState(initialState) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useState(initialState);
}

export function useReducer(reducer, initialArg, init) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useReducer(reducer, initialArg, init);
}

export function useRef(initialValue) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useRef(initialValue);
}

export function useEffect(create, deps) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useEffect(create, deps);
}

export function useLayoutEffect(create, deps) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useLayoutEffect(create, deps);
}

export function useCallback(callback, deps) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useCallback(callback, deps);
}

export function useMemo(create, deps) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useMemo(create, deps);
}

export function useImperativeHandle(ref, create, deps) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useImperativeHandle(ref, create, deps);
}

export function useDebugValue(value, formatterFn) {
  if (__DEV__) {
    const dispatcher = resolveDispatcher();
    return dispatcher.useDebugValue(value, formatterFn);
  }
}

export const emptyObject = {};

export function useTransition() {
  const dispatcher = resolveDispatcher();
  return dispatcher.useTransition();
}

export function useDeferredValue(value) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useDeferredValue(value);
}

export function useOpaqueIdentifier() {
  const dispatcher = resolveDispatcher();
  return dispatcher.useOpaqueIdentifier();
}

export function useMutableSource(source, getSnapshot, subscribe) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useMutableSource(source, getSnapshot, subscribe);
}
