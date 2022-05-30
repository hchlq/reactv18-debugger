/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {unstable_getCacheForType as getCacheForType} from 'react';
import {searchGitHubIssues} from './githubAPI';

const API_TIMEOUT = 3000;

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

function createMap() {
  return new Map();
}

function getRecordMap() {
  return getCacheForType(createMap);
}

export function findGitHubIssue(errorMessage) {
  errorMessage = normalizeErrorMessage(errorMessage);

  const map = getRecordMap();
  let record = map.get(errorMessage);

  if (!record) {
    const callbacks = new Set();
    const wakeable = {
      then(callback) {
        callbacks.add(callback);
      },

      // Optional property used by Timeline:
      displayName: `Searching GitHub issues for error "${errorMessage}"`,
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

    let didTimeout = false;

    searchGitHubIssues(errorMessage)
      .then((maybeItem) => {
        if (didTimeout) {
          return;
        }

        if (maybeItem) {
          const resolvedRecord = newRecord;
          resolvedRecord.status = Resolved;
          resolvedRecord.value = maybeItem;
        } else {
          const notFoundRecord = newRecord;
          notFoundRecord.status = Rejected;
          notFoundRecord.value = null;
        }

        wake();
      })
      .catch((error) => {
        const thrownRecord = newRecord;
        thrownRecord.status = Rejected;
        thrownRecord.value = null;

        wake();
      });

    // Only wait a little while for GitHub results before showing a fallback.
    setTimeout(() => {
      didTimeout = true;

      const timedoutRecord = newRecord;
      timedoutRecord.status = Rejected;
      timedoutRecord.value = null;

      wake();
    }, API_TIMEOUT);

    map.set(errorMessage, record);
  }

  const response = readRecord(record).value;
  return response;
}

function normalizeErrorMessage(errorMessage) {
  // Remove Fiber IDs from error message (as those will be unique).
  errorMessage = errorMessage.replace(/"[0-9]+"/, '');
  return errorMessage;
}
