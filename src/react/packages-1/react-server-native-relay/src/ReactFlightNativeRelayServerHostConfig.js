/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import hasOwnProperty from 'shared/hasOwnProperty';
import isArray from 'shared/isArray';

import JSResourceReferenceImpl from 'JSResourceReferenceImpl';

import {resolveModelToJSON} from 'react-server/src/ReactFlightServer';

import {
  emitRow,
  close,
  resolveModuleMetaData as resolveModuleMetaDataImpl,
} from 'ReactFlightNativeRelayServerIntegration';

export function isModuleReference(reference) {
  return reference instanceof JSResourceReferenceImpl;
}

export function getModuleKey(reference) {
  // We use the reference object itself as the key because we assume the
  // object will be cached by the bundler runtime.
  return reference;
}

export function resolveModuleMetaData(config, resource) {
  return resolveModuleMetaDataImpl(config, resource);
}

export function processErrorChunk(request, id, message, stack) {
  return [
    'E',
    id,
    {
      message,
      stack,
    },
  ];
}

function convertModelToJSON(request, parent, key, model) {
  const json = resolveModelToJSON(request, parent, key, model);
  if (typeof json === 'object' && json !== null) {
    if (isArray(json)) {
      const jsonArray = [];
      for (let i = 0; i < json.length; i++) {
        jsonArray[i] = convertModelToJSON(request, json, '' + i, json[i]);
      }
      return jsonArray;
    } else {
      const jsonObj = {};
      for (const nextKey in json) {
        if (hasOwnProperty.call(json, nextKey)) {
          jsonObj[nextKey] = convertModelToJSON(
            request,
            json,
            nextKey,
            json[nextKey],
          );
        }
      }
      return jsonObj;
    }
  }
  return json;
}

export function processModelChunk(request, id, model) {
  const json = convertModelToJSON(request, {}, '', model);
  return ['J', id, json];
}

export function processModuleChunk(request, id, moduleMetaData) {
  // The moduleMetaData is already a JSON serializable value.
  return ['M', id, moduleMetaData];
}

export function processProviderChunk(request, id, contextName) {
  return ['P', id, contextName];
}

export function processSymbolChunk(request, id, name) {
  return ['S', id, name];
}

export function scheduleWork(callback) {
  callback();
}

export function flushBuffered(destination) {}

export function beginWriting(destination) {}

export function writeChunk(destination, chunk) {
  emitRow(destination, chunk);
}

export function writeChunkAndReturn(destination, chunk) {
  emitRow(destination, chunk);
  return true;
}

export function completeWriting(destination) {}

export {close};

export function closeWithError(destination, error) {
  close(destination);
}
