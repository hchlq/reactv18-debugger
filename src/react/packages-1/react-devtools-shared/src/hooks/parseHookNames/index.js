/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {withAsyncPerfMeasurements} from 'react-devtools-shared/src/PerformanceLoggingUtils';
import WorkerizedParseSourceAndMetadata from './parseSourceAndMetadata.worker';

import {flattenHooksList, loadSourceAndMetadata} from './loadSourceAndMetadata';

const workerizedParseHookNames = WorkerizedParseSourceAndMetadata();

export function parseSourceAndMetadata(
  hooksList,
  locationKeyToHookSourceAndMetadata,
) {
  return workerizedParseHookNames.parseSourceAndMetadata(
    hooksList,
    locationKeyToHookSourceAndMetadata,
  );
}

export const purgeCachedMetadata = workerizedParseHookNames.purgeCachedMetadata;

const EMPTY_MAP = new Map();

export async function parseHookNames(hooksTree, fetchFileWithCaching) {
  return withAsyncPerfMeasurements('parseHookNames', async () => {
    const hooksList = flattenHooksList(hooksTree);
    if (hooksList.length === 0) {
      // This component tree contains no named hooks.
      return EMPTY_MAP;
    }

    // Runs on the main/UI thread so it can reuse Network cache:
    const locationKeyToHookSourceAndMetadata = await loadSourceAndMetadata(
      hooksList,
      fetchFileWithCaching,
    );

    // Runs in a Worker because it's CPU intensive:
    return parseSourceAndMetadata(
      hooksList,
      locationKeyToHookSourceAndMetadata,
    );
  });
}
