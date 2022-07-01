/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

// eslint-disable-next-line no-unused-vars

const MODULE_TAG = Symbol.for('react.module.reference');

export function getModuleKey(reference) {
  return reference.filepath + '#' + reference.name;
}

export function isModuleReference(reference) {
  return reference.$$typeof === MODULE_TAG;
}

export function resolveModuleMetaData(config, moduleReference) {
  return config[moduleReference.filepath][moduleReference.name];
}
