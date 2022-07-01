/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 *       strict
 */

// We either force that `diff` and `process` always use mixed,
// or we allow them to define specific types and use this hack

/**
 * Flat ReactNative renderer bundles are too big for Flow to parse efficiently.
 * Provide minimal Flow typing for the high-level RN API and call it a day.
 */

// Imperative LayoutAnimation API types
//
