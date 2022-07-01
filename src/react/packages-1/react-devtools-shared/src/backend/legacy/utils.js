/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

export function decorate(object, attr, fn) {
  const old = object[attr];
  object[attr] = function (instance) {
    return fn.call(this, old, arguments);
  };
  return old;
}

export function decorateMany(source, fns) {
  const olds = {};
  for (const name in fns) {
    olds[name] = decorate(source, name, fns[name]);
  }
  return olds;
}

export function restoreMany(source, olds) {
  for (const name in olds) {
    source[name] = olds[name];
  }
}

export function forceUpdate(instance) {
  if (typeof instance.forceUpdate === 'function') {
    instance.forceUpdate();
  } else if (
    instance.updater != null &&
    typeof instance.updater.enqueueForceUpdate === 'function'
  ) {
    instance.updater.enqueueForceUpdate(this, () => {}, 'forceUpdate');
  }
}
