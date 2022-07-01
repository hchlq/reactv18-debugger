/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *       strict-local
 */

import {__PERFORMANCE_PROFILE__} from './constants';

const supportsUserTiming =
  typeof performance !== 'undefined' &&
  typeof performance.mark === 'function' &&
  typeof performance.clearMarks === 'function';

const supportsPerformanceNow =
  typeof performance !== 'undefined' && typeof performance.now === 'function';

function mark(markName) {
  if (supportsUserTiming) {
    performance.mark(markName + '-start');
  }
}

function measure(markName) {
  if (supportsUserTiming) {
    performance.mark(markName + '-end');
    performance.measure(markName, markName + '-start', markName + '-end');
    performance.clearMarks(markName + '-start');
    performance.clearMarks(markName + '-end');
  }
}

function now() {
  if (supportsPerformanceNow) {
    return performance.now();
  }
  return Date.now();
}

export async function withAsyncPerfMeasurements(
  markName,
  callback,
  onComplete,
) {
  const start = now();
  if (__PERFORMANCE_PROFILE__) {
    mark(markName);
  }
  const result = await callback();

  if (__PERFORMANCE_PROFILE__) {
    measure(markName);
  }

  if (onComplete != null) {
    const duration = now() - start;
    onComplete(duration);
  }

  return result;
}

export function withSyncPerfMeasurements(markName, callback, onComplete) {
  const start = now();
  if (__PERFORMANCE_PROFILE__) {
    mark(markName);
  }
  const result = callback();

  if (__PERFORMANCE_PROFILE__) {
    measure(markName);
  }

  if (onComplete != null) {
    const duration = now() - start;
    onComplete(duration);
  }

  return result;
}

export function withCallbackPerfMeasurements(markName, callback, onComplete) {
  const start = now();
  if (__PERFORMANCE_PROFILE__) {
    mark(markName);
  }

  const done = () => {
    if (__PERFORMANCE_PROFILE__) {
      measure(markName);
    }

    if (onComplete != null) {
      const duration = now() - start;
      onComplete(duration);
    }
  };
  return callback(done);
}
