/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {
  unstable_getCacheForType as getCacheForType,
  startTransition,
} from 'react';
import Store from './devtools/store';
import {inspectElement as inspectElementMutableSource} from './inspectedElementMutableSource';

const Pending = 0;
const Resolved = 1;
const Rejected = 2;

function readRecord(record) {
  if (record.status === Resolved) {
    // This is just a type refinement.
    return record;
  } else {
    throw record.value;
  }
}

function createMap() {
  return new WeakMap();
}

function getRecordMap() {
  return getCacheForType(createMap);
}

function createCacheSeed(element, inspectedElement) {
  const newRecord = {
    status: Resolved,
    value: inspectedElement,
  };
  const map = createMap();
  map.set(element, newRecord);
  return [createMap, map];
}

/**
 * Fetches element props and state from the backend for inspection.
 * This method should be called during render; it will suspend if data has not yet been fetched.
 */
export function inspectElement(element, path, store, bridge) {
  const map = getRecordMap();
  let record = map.get(element);
  if (!record) {
    const callbacks = new Set();
    const wakeable = {
      then(callback) {
        callbacks.add(callback);
      },

      // Optional property used by Timeline:
      displayName: `Inspecting ${element.displayName || 'Unknown'}`,
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

    const rendererID = store.getRendererIDForElement(element.id);
    if (rendererID == null) {
      const rejectedRecord = newRecord;
      rejectedRecord.status = Rejected;
      rejectedRecord.value = new Error(
        `Could not inspect element with id "${element.id}". No renderer found.`,
      );

      map.set(element, record);

      return null;
    }

    inspectElementMutableSource({
      bridge,
      element,
      path,
      rendererID: rendererID,
    }).then(
      ([inspectedElement]) => {
        const resolvedRecord = newRecord;
        resolvedRecord.status = Resolved;
        resolvedRecord.value = inspectedElement;

        wake();
      },

      (error) => {
        console.error(error);

        const rejectedRecord = newRecord;
        rejectedRecord.status = Rejected;
        rejectedRecord.value = error;

        wake();
      },
    );
    map.set(element, record);
  }

  const response = readRecord(record).value;
  return response;
}

/**
 * Asks the backend for updated props and state from an expected element.
 * This method should never be called during render; call it from an effect or event handler.
 * This method will schedule an update if updated information is returned.
 */
export function checkForUpdate({bridge, element, refresh, store}) {
  const {id} = element;
  const rendererID = store.getRendererIDForElement(id);
  if (rendererID != null) {
    inspectElementMutableSource({
      bridge,
      element,
      path: null,
      rendererID: rendererID,
    }).then(
      ([inspectedElement, responseType]) => {
        if (responseType === 'full-data') {
          startTransition(() => {
            const [key, value] = createCacheSeed(element, inspectedElement);
            refresh(key, value);
          });
        }
      },

      // There isn't much to do about errors in this case,
      // but we should at least log them so they aren't silent.
      (error) => {
        console.error(error);
      },
    );
  }
}

export function clearCacheBecauseOfError(refresh) {
  startTransition(() => {
    const map = createMap();
    refresh(createMap, map);
  });
}
