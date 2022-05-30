/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {unstable_getCacheForType} from 'react';
import * as fs from 'fs/promises';
import {isAbsolute, normalize} from 'path';

const Pending = 0;
const Resolved = 1;
const Rejected = 2;

function createRecordFromThenable(thenable) {
  const record = {
    status: Pending,
    value: thenable,
    cache: null,
  };
  thenable.then(
    (value) => {
      if (record.status === Pending) {
        const resolvedRecord = record;
        resolvedRecord.status = Resolved;
        resolvedRecord.value = value;
      }
    },
    (err) => {
      if (record.status === Pending) {
        const rejectedRecord = record;
        rejectedRecord.status = Rejected;
        rejectedRecord.value = err;
      }
    },
  );
  return record;
}

function readRecord(record) {
  if (record.status === Resolved) {
    // This is just a type refinement.
    return record;
  } else {
    throw record.value;
  }
}

// We don't want to normalize every path ourselves in production.
// However, relative or non-normalized paths will lead to cache misses.
// So we encourage the developer to fix it in DEV and normalize on their end.
function checkPathInDev(path) {
  if (__DEV__) {
    if (!isAbsolute(path)) {
      console.error(
        'The provided path was not absolute: "%s". ' +
          'Convert it to an absolute path first.',
        path,
      );
    } else if (path !== normalize(path)) {
      console.error(
        'The provided path was not normalized: "%s". ' +
          'Convert it to a normalized path first.',
        path,
      );
    }
  }
}

function createAccessMap() {
  return new Map();
}

export function access(path, mode) {
  checkPathInDev(path);
  if (mode == null) {
    mode = 0; // fs.constants.F_OK
  }
  const map = unstable_getCacheForType(createAccessMap);
  let accessCache = map.get(path);
  if (!accessCache) {
    accessCache = [];
    map.set(path, accessCache);
  }
  let record;
  for (let i = 0; i < accessCache.length; i += 2) {
    const cachedMode = accessCache[i];
    if (mode === cachedMode) {
      const cachedRecord = accessCache[i + 1];
      record = cachedRecord;
      break;
    }
  }
  if (!record) {
    const thenable = fs.access(path, mode);
    record = createRecordFromThenable(thenable);
    accessCache.push(mode, record);
  }
  readRecord(record); // No return value.
}

function createLstatMap() {
  return new Map();
}

export function lstat(path, options) {
  checkPathInDev(path);
  let bigint = false;
  if (options && options.bigint) {
    bigint = true;
  }
  const map = unstable_getCacheForType(createLstatMap);
  let lstatCache = map.get(path);
  if (!lstatCache) {
    lstatCache = [];
    map.set(path, lstatCache);
  }
  let record;
  for (let i = 0; i < lstatCache.length; i += 2) {
    const cachedBigint = lstatCache[i];
    if (bigint === cachedBigint) {
      const cachedRecord = lstatCache[i + 1];
      record = cachedRecord;
      break;
    }
  }
  if (!record) {
    const thenable = fs.lstat(path, {bigint});
    record = createRecordFromThenable(thenable);
    lstatCache.push(bigint, record);
  }
  const stats = readRecord(record).value;
  return stats;
}

function createReaddirMap() {
  return new Map();
}

export function readdir(path, options) {
  checkPathInDev(path);
  let encoding = 'utf8';
  let withFileTypes = false;
  if (typeof options === 'string') {
    encoding = options;
  } else if (options != null) {
    if (options.encoding) {
      encoding = options.encoding;
    }
    if (options.withFileTypes) {
      withFileTypes = true;
    }
  }
  const map = unstable_getCacheForType(createReaddirMap);
  let readdirCache = map.get(path);
  if (!readdirCache) {
    readdirCache = [];
    map.set(path, readdirCache);
  }
  let record;
  for (let i = 0; i < readdirCache.length; i += 3) {
    const cachedEncoding = readdirCache[i];
    const cachedWithFileTypes = readdirCache[i + 1];
    if (encoding === cachedEncoding && withFileTypes === cachedWithFileTypes) {
      const cachedRecord = readdirCache[i + 2];
      record = cachedRecord;
      break;
    }
  }
  if (!record) {
    const thenable = fs.readdir(path, {encoding, withFileTypes});
    record = createRecordFromThenable(thenable);
    readdirCache.push(encoding, withFileTypes, record);
  }
  const files = readRecord(record).value;
  return files;
}

function createReadFileMap() {
  return new Map();
}

export function readFile(path, options) {
  checkPathInDev(path);
  const map = unstable_getCacheForType(createReadFileMap);
  let record = map.get(path);
  if (!record) {
    const thenable = fs.readFile(path);
    record = createRecordFromThenable(thenable);
    map.set(path, record);
  }
  const resolvedRecord = readRecord(record);
  const buffer = resolvedRecord.value;
  if (!options) {
    return buffer;
  }
  let encoding;
  if (typeof options === 'string') {
    encoding = options;
  } else {
    const flag = options.flag;
    if (flag != null && flag !== 'r') {
      throw Error(
        'The flag option is not supported, and always defaults to "r".',
      );
    }
    if (options.signal) {
      throw Error('The signal option is not supported.');
    }
    encoding = options.encoding;
  }
  if (typeof encoding !== 'string') {
    return buffer;
  }
  const textCache = resolvedRecord.cache || (resolvedRecord.cache = []);
  for (let i = 0; i < textCache.length; i += 2) {
    if (textCache[i] === encoding) {
      return textCache[i + 1];
    }
  }
  const text = buffer.toString(encoding);
  textCache.push(encoding, text);
  return text;
}

function createReadlinkMap() {
  return new Map();
}

export function readlink(path, options) {
  checkPathInDev(path);
  let encoding = 'utf8';
  if (typeof options === 'string') {
    encoding = options;
  } else if (options != null) {
    if (options.encoding) {
      encoding = options.encoding;
    }
  }
  const map = unstable_getCacheForType(createReadlinkMap);
  let readlinkCache = map.get(path);
  if (!readlinkCache) {
    readlinkCache = [];
    map.set(path, readlinkCache);
  }
  let record;
  for (let i = 0; i < readlinkCache.length; i += 2) {
    const cachedEncoding = readlinkCache[i];
    if (encoding === cachedEncoding) {
      const cachedRecord = readlinkCache[i + 1];
      record = cachedRecord;
      break;
    }
  }
  if (!record) {
    const thenable = fs.readlink(path, {encoding});
    record = createRecordFromThenable(thenable);
    readlinkCache.push(encoding, record);
  }
  const linkString = readRecord(record).value;
  return linkString;
}

function createRealpathMap() {
  return new Map();
}

export function realpath(path, options) {
  checkPathInDev(path);
  let encoding = 'utf8';
  if (typeof options === 'string') {
    encoding = options;
  } else if (options != null) {
    if (options.encoding) {
      encoding = options.encoding;
    }
  }
  const map = unstable_getCacheForType(createRealpathMap);
  let realpathCache = map.get(path);
  if (!realpathCache) {
    realpathCache = [];
    map.set(path, realpathCache);
  }
  let record;
  for (let i = 0; i < realpathCache.length; i += 2) {
    const cachedEncoding = realpathCache[i];
    if (encoding === cachedEncoding) {
      const cachedRecord = realpathCache[i + 1];
      record = cachedRecord;
      break;
    }
  }
  if (!record) {
    const thenable = fs.realpath(path, {encoding});
    record = createRecordFromThenable(thenable);
    realpathCache.push(encoding, record);
  }
  const resolvedPath = readRecord(record).value;
  return resolvedPath;
}

function createStatMap() {
  return new Map();
}

export function stat(path, options) {
  checkPathInDev(path);
  let bigint = false;
  if (options && options.bigint) {
    bigint = true;
  }
  const map = unstable_getCacheForType(createStatMap);
  let statCache = map.get(path);
  if (!statCache) {
    statCache = [];
    map.set(path, statCache);
  }
  let record;
  for (let i = 0; i < statCache.length; i += 2) {
    const cachedBigint = statCache[i];
    if (bigint === cachedBigint) {
      const cachedRecord = statCache[i + 1];
      record = cachedRecord;
      break;
    }
  }
  if (!record) {
    const thenable = fs.stat(path, {bigint});
    record = createRecordFromThenable(thenable);
    statCache.push(bigint, record);
  }
  const stats = readRecord(record).value;
  return stats;
}
