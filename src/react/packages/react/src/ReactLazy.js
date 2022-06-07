/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {REACT_LAZY_TYPE} from 'shared/ReactSymbols';

const Uninitialized = -1;
const Pending = 0;
const Resolved = 1;
const Rejected = 2;

function lazyInitializer(payload) {
  if (payload._status === Uninitialized) {
    const ctor = payload._result;
    const thenable = ctor();
    // Transition to the next state.
    // This might throw either because it's missing or throws. If so, we treat it
    // as still uninitialized and try again next time. Which is the same as what
    // happens if the ctor or any wrappers processing the ctor throws. This might
    // end up fixing it if the resolution was a concurrency bug.
    thenable.then(
      (moduleObject) => {
        if (payload._status === Pending || payload._status === Uninitialized) {
          // Transition to the next state.
          const resolved = payload;
          resolved._status = Resolved;
          resolved._result = moduleObject;
        }
      },
      (error) => {
        if (payload._status === Pending || payload._status === Uninitialized) {
          // Transition to the next state.
          const rejected = payload;
          rejected._status = Rejected;
          rejected._result = error;
        }
      },
    );
    if (payload._status === Uninitialized) {
      // In case, we're still uninitialized, then we're waiting for the thenable
      // to resolve. Set it as pending in the meantime.
      const pending = payload;
      pending._status = Pending;
      pending._result = thenable;
    }
  }
  if (payload._status === Resolved) {
    const moduleObject = payload._result;
    return moduleObject.default;
  } else {
    //! 抛出错误 
    throw payload._result;
  }
}

export function lazy(ctor) {
  const payload = {
    // We use these fields to store the result.
    _status: Uninitialized,
    _result: ctor,
  };

  const lazyType = {
    $$typeof: REACT_LAZY_TYPE,
    _payload: payload,
    _init: lazyInitializer,
  };

  return lazyType;
}
