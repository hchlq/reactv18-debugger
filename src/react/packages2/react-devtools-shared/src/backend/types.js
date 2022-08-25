/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

// DEV

// TODO: If it's useful for the frontend to know which types of data an Element has
// (e.g. props, state, context, hooks) then we could add a bitmask field for this
// to keep the number of attributes small.

// Profiling data collected by the renderer interface.
// This information will be passed to the frontend and combined with info it collects.

export const InspectElementErrorType = 'error';
export const InspectElementFullDataType = 'full-data';
export const InspectElementNoChangeType = 'no-change';
export const InspectElementNotFoundType = 'not-found';

// Renderers use these APIs to report profiling data to DevTools at runtime.
// They get passed from the DevTools backend to the reconciler during injection.
