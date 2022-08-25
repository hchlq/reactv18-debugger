/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {importFile as importFileWorker} from './import-worker';

const Pending = 0;
const Resolved = 1;
const Rejected = 2;

// This is intentionally a module-level Map, rather than a React-managed one.
// Otherwise, refreshing the inspected element cache would also clear this cache.
// Profiler file contents are static anyway.
const fileNameToProfilerDataMap = new Map();

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

export function importFile(file) {
  const fileName = file.name;
  let record = fileNameToProfilerDataMap.get(fileName);

  if (!record) {
    const callbacks = new Set();
    const wakeable = {
      then(callback) {
        callbacks.add(callback);
      },

      // Optional property used by Timeline:
      displayName: `Importing file "${fileName}"`,
    };

    const wake = () => {
      // This assumes they won't throw.
      callbacks.forEach((callback) => callback());
      callbacks.clear();
    };

    const newRecord = (record = {
      status: Pending,
      value: wakeable,
    });

    importFileWorker(file).then((data) => {
      switch (data.status) {
        case 'SUCCESS':
          const resolvedRecord = newRecord;
          resolvedRecord.status = Resolved;
          resolvedRecord.value = data.processedData;
          break;
        case 'INVALID_PROFILE_ERROR':
        case 'UNEXPECTED_ERROR':
          const thrownRecord = newRecord;
          thrownRecord.status = Rejected;
          thrownRecord.value = data.error;
          break;
      }

      wake();
    });

    fileNameToProfilerDataMap.set(fileName, record);
  }

  const response = readRecord(record).value;
  return response;
}
