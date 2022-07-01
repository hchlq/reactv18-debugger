/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *       strict-local
 */

import {enableLogger} from 'react-devtools-feature-flags';

let logFunctions = [];
export const logEvent =
  enableLogger === true
    ? function logEvent(event) {
        logFunctions.forEach((log) => {
          log(event);
        });
      }
    : function logEvent() {};

export const registerEventLogger =
  enableLogger === true
    ? function registerEventLogger(logFunction) {
        if (enableLogger) {
          logFunctions.push(logFunction);
          return function unregisterEventLogger() {
            logFunctions = logFunctions.filter((log) => log !== logFunction);
          };
        }
        return () => {};
      }
    : function registerEventLogger(logFunction) {
        return () => {};
      };
