/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {canUseDOM} from 'shared/ExecutionEnvironment';

// 用来判断浏览器是否支持 addEventListener 是否支持是对象的情况
export let passiveBrowserEventsSupported = false;

// Check if browser support events with passive listeners
// https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#Safely_detecting_option_support
if (canUseDOM) {
  try {
    const options = {};
    // $FlowFixMe: Ignore Flow complaining about needing a value
    Object.defineProperty(options, 'passive', {
      get: function () {
        passiveBrowserEventsSupported = true;
      },
    });
    window.addEventListener('test', options, options);
    window.removeEventListener('test', options, options);
  } catch (e) {
    passiveBrowserEventsSupported = false;
  }
}
