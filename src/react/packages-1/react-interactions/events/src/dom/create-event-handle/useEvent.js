/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';

const {useLayoutEffect, useRef} = React;
const {unstable_createEventHandle} = ReactDOM;

export default function useEvent(event, options) {
  const handleRef = useRef(null);
  let useEventHandle = handleRef.current;

  if (useEventHandle === null) {
    const setEventHandle = unstable_createEventHandle(event, options);
    const clears = new Map();
    useEventHandle = {
      setListener(target, callback) {
        let clear = clears.get(target);
        if (clear !== undefined) {
          clear();
        }
        if (callback === null) {
          clears.delete(target);
          return;
        }
        clear = setEventHandle(target, callback);
        clears.set(target, clear);
      },
      clear() {
        clears.forEach((c) => {
          c();
        });
        clears.clear();
      },
    };
    handleRef.current = useEventHandle;
  }

  useLayoutEffect(() => {
    return () => {
      if (useEventHandle !== null) {
        useEventHandle.clear();
      }
      handleRef.current = null;
    };
  }, [useEventHandle]);

  return useEventHandle;
}
