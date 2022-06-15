/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {enableCreateEventHandleAPI} from 'shared/ReactFeatureFlags';

export const allNativeEvents = new Set();

// 支持自定义事件
if (enableCreateEventHandleAPI) {
  allNativeEvents.add('beforeblur');
  allNativeEvents.add('afterblur');
}

/**
 * Mapping from registration name to event name
 * 映射注册的名字到事件名字
 */
export const registrationNameDependencies = {};

/**
 * Mapping from lowercase registration names to the properly cased version,
 * used to warn in the case of missing event handlers. Available
 * only in __DEV__.
 * @type {Object}
 */
export const possibleRegistrationNames = __DEV__ ? {} : null;
// Trust the developer to only use possibleRegistrationNames in __DEV__

// 注册两个阶段的事件
export function registerTwoPhaseEvent(registrationName, dependencies) {
  registerDirectEvent(registrationName, dependencies);
  registerDirectEvent(registrationName + 'Capture', dependencies);
}

/**
 * 注册事件
 * @param {*} registrationName react 名字 e.g. onClick
 * @param {*} dependencies 事件名列表
 */
export function registerDirectEvent(registrationName, dependencies) {

  registrationNameDependencies[registrationName] = dependencies;

  for (let i = 0; i < dependencies.length; i++) {
    allNativeEvents.add(dependencies[i]);
  }
}
