/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {copy} from 'clipboard-js';
import {dehydrate} from '../hydration';

export function cleanForBridge(data, isPathAllowed, path = []) {
  if (data !== null) {
    const cleanedPaths = [];
    const unserializablePaths = [];
    const cleanedData = dehydrate(
      data,
      cleanedPaths,
      unserializablePaths,
      path,
      isPathAllowed,
    );

    return {
      data: cleanedData,
      cleaned: cleanedPaths,
      unserializable: unserializablePaths,
    };
  } else {
    return null;
  }
}

export function copyToClipboard(value) {
  const safeToCopy = serializeToString(value);
  const text = safeToCopy === undefined ? 'undefined' : safeToCopy;
  const {clipboardCopyText} = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;

  // On Firefox navigator.clipboard.writeText has to be called from
  // the content script js code (because it requires the clipboardWrite
  // permission to be allowed out of a "user handling" callback),
  // clipboardCopyText is an helper injected into the page from.
  // injectGlobalHook.
  if (typeof clipboardCopyText === 'function') {
    clipboardCopyText(text).catch((err) => {});
  } else {
    copy(text);
  }
}

export function copyWithDelete(obj, path, index = 0) {
  const key = path[index];
  const updated = Array.isArray(obj) ? obj.slice() : {...obj};
  if (index + 1 === path.length) {
    if (Array.isArray(updated)) {
      updated.splice(key, 1);
    } else {
      delete updated[key];
    }
  } else {
    // $FlowFixMe number or string is fine here
    updated[key] = copyWithDelete(obj[key], path, index + 1);
  }
  return updated;
}

// This function expects paths to be the same except for the final value.
// e.g. ['path', 'to', 'foo'] and ['path', 'to', 'bar']
export function copyWithRename(obj, oldPath, newPath, index = 0) {
  const oldKey = oldPath[index];
  const updated = Array.isArray(obj) ? obj.slice() : {...obj};
  if (index + 1 === oldPath.length) {
    const newKey = newPath[index];
    // $FlowFixMe number or string is fine here
    updated[newKey] = updated[oldKey];
    if (Array.isArray(updated)) {
      updated.splice(oldKey, 1);
    } else {
      delete updated[oldKey];
    }
  } else {
    // $FlowFixMe number or string is fine here
    updated[oldKey] = copyWithRename(obj[oldKey], oldPath, newPath, index + 1);
  }
  return updated;
}

export function copyWithSet(obj, path, value, index = 0) {
  if (index >= path.length) {
    return value;
  }
  const key = path[index];
  const updated = Array.isArray(obj) ? obj.slice() : {...obj};
  // $FlowFixMe number or string is fine here
  updated[key] = copyWithSet(obj[key], path, value, index + 1);
  return updated;
}

export function serializeToString(data) {
  const cache = new Set();
  // Use a custom replacer function to protect against circular references.
  return JSON.stringify(data, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        return;
      }
      cache.add(value);
    }
    // $FlowFixMe
    if (typeof value === 'bigint') {
      return value.toString() + 'n';
    }
    return value;
  });
}
