/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

// Do not use the below two methods directly!
// Instead use constants exported from DOMTopLevelEventTypes in ReactDOM.
// (It is the only module that is allowed to access these methods.)

export function unsafeCastStringToDOMTopLevelType(topLevelType) {
  return topLevelType;
}

export function unsafeCastDOMTopLevelTypeToString(topLevelType) {
  return topLevelType;
}
