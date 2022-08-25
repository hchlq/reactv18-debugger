/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {__DEBUG__} from 'react-devtools-shared/src/constants';

import {withCallbackPerfMeasurements} from './PerformanceLoggingUtils';
import {logEvent} from './Logger';

const TIMEOUT = 30000;

const Pending = 0;
const Resolved = 1;
const Rejected = 2;

function readRecord(record) {
  if (record.status === Resolved) {
    // This is just a type refinement.
    return record;
  } else if (record.status === Rejected) {
    // This is just a type refinement.
    return record;
  } else {
    throw record.value;
  }
}

// This is intentionally a module-level Map, rather than a React-managed one.
// Otherwise, refreshing the inspected element cache would also clear this cache.
// TODO Rethink this if the React API constraints change.
// See https://github.com/reactwg/react-18/discussions/25#discussioncomment-980435
let map = new WeakMap();

export function hasAlreadyLoadedHookNames(element) {
  const record = map.get(element);
  return record != null && record.status === Resolved;
}

export function loadHookNames(
  element,
  hooksTree,
  loadHookNamesFunction,
  fetchFileWithCaching,
) {
  let record = map.get(element);

  if (__DEBUG__) {
    console.groupCollapsed('loadHookNames() record:');
    console.log(record);
    console.groupEnd();
  }

  if (!record) {
    const callbacks = new Set();
    const wakeable = {
      then(callback) {
        callbacks.add(callback);
      },

      // Optional property used by Timeline:
      displayName: `Loading hook names for ${element.displayName || 'Unknown'}`,
    };

    let timeoutID;
    let didTimeout = false;
    let status = 'unknown';
    let resolvedHookNames = null;

    const wake = () => {
      if (timeoutID) {
        clearTimeout(timeoutID);
        timeoutID = null;
      }

      // This assumes they won't throw.
      callbacks.forEach((callback) => callback());
      callbacks.clear();
    };

    const handleLoadComplete = (durationMs) => {
      // Log duration for parsing hook names
      logEvent({
        event_name: 'load-hook-names',
        event_status: status,
        duration_ms: durationMs,
        inspected_element_display_name: element.displayName,
        inspected_element_number_of_hooks: resolvedHookNames?.size ?? null,
      });
    };

    const newRecord = (record = {
      status: Pending,
      value: wakeable,
    });

    withCallbackPerfMeasurements(
      'loadHookNames',
      (done) => {
        loadHookNamesFunction(hooksTree, fetchFileWithCaching).then(
          function onSuccess(hookNames) {
            if (didTimeout) {
              return;
            }

            if (__DEBUG__) {
              console.log('[hookNamesCache] onSuccess() hookNames:', hookNames);
            }

            if (hookNames) {
              const resolvedRecord = newRecord;
              resolvedRecord.status = Resolved;
              resolvedRecord.value = hookNames;
            } else {
              const notFoundRecord = newRecord;
              notFoundRecord.status = Rejected;
              notFoundRecord.value = null;
            }

            status = 'success';
            resolvedHookNames = hookNames;
            done();
            wake();
          },
          function onError(error) {
            if (didTimeout) {
              return;
            }

            if (__DEBUG__) {
              console.log('[hookNamesCache] onError()');
            }

            console.error(error);

            const thrownRecord = newRecord;
            thrownRecord.status = Rejected;
            thrownRecord.value = null;

            status = 'error';
            done();
            wake();
          },
        );

        // Eventually timeout and stop trying to load names.
        timeoutID = setTimeout(function onTimeout() {
          if (__DEBUG__) {
            console.log('[hookNamesCache] onTimeout()');
          }

          timeoutID = null;

          didTimeout = true;

          const timedoutRecord = newRecord;
          timedoutRecord.status = Rejected;
          timedoutRecord.value = null;

          status = 'timeout';
          done();
          wake();
        }, TIMEOUT);
      },
      handleLoadComplete,
    );
    map.set(element, record);
  }

  const response = readRecord(record).value;
  return response;
}

export function getHookSourceLocationKey({fileName, lineNumber, columnNumber}) {
  if (fileName == null || lineNumber == null || columnNumber == null) {
    throw Error('Hook source code location not found.');
  }
  return `${fileName}:${lineNumber}:${columnNumber}`;
}

export function clearHookNamesCache() {
  map = new WeakMap();
}
