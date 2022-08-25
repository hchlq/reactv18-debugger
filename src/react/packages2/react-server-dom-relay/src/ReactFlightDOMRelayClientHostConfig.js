/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {
  parseModelString,
  parseModelTuple,
} from 'react-client/src/ReactFlightClient';

export {
  preloadModule,
  requireModule,
} from 'ReactFlightDOMRelayClientIntegration';

import {resolveModuleReference as resolveModuleReferenceImpl} from 'ReactFlightDOMRelayClientIntegration';

import isArray from 'shared/isArray';

export function resolveModuleReference(bundlerConfig, moduleData) {
  return resolveModuleReferenceImpl(moduleData);
}

function parseModelRecursively(response, parentObj, value) {
  if (typeof value === 'string') {
    return parseModelString(response, parentObj, value);
  }
  if (typeof value === 'object' && value !== null) {
    if (isArray(value)) {
      const parsedValue = [];
      for (let i = 0; i < value.length; i++) {
        parsedValue[i] = parseModelRecursively(response, value, value[i]);
      }
      return parseModelTuple(response, parsedValue);
    } else {
      const parsedValue = {};
      for (const innerKey in value) {
        parsedValue[innerKey] = parseModelRecursively(
          response,
          value,
          value[innerKey],
        );
      }
      return parsedValue;
    }
  }
  return value;
}

const dummy = {};

export function parseModel(response, json) {
  return parseModelRecursively(response, dummy, json);
}
