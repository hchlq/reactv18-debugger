/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

// Each element on the frontend corresponds to a Fiber on the backend.
// Some of its information (e.g. id, type, displayName) come from the backend.
// Other bits (e.g. weight and depth) are computed on the frontend for windowing and display purposes.
// Elements are updated on a push basis– meaning the backend pushes updates to the frontend when needed.

// TODO: Add profiling type
