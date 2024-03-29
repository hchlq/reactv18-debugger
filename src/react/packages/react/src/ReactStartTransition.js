/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import ReactCurrentBatchConfig from './ReactCurrentBatchConfig';

export function startTransition(scope) {
  const prevTransition = ReactCurrentBatchConfig.transition;

  // 重新赋值 transition 对象
  ReactCurrentBatchConfig.transition = {};

  try {
    scope();
  } finally {
    ReactCurrentBatchConfig.transition = prevTransition;
  }
}
