/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {enableTransitionTracing} from 'shared/ReactFeatureFlags';
import {createCursor, push, pop} from './ReactFiberStack.new';
import {getWorkInProgressTransitions} from './ReactFiberWorkLoop.new';

export function processTransitionCallbacks(
  pendingTransitions,
  endTime,
  callbacks,
) {
  if (enableTransitionTracing) {
    if (pendingTransitions !== null) {
      const transitionStart = pendingTransitions.transitionStart;
      if (transitionStart !== null) {
        transitionStart.forEach((transition) => {
          if (callbacks.onTransitionStart != null) {
            callbacks.onTransitionStart(
              transition.transitionName,
              transition.startTime,
            );
          }
        });
      }

      const markerComplete = pendingTransitions.markerComplete;
      if (markerComplete !== null) {
        markerComplete.forEach((transition) => {
          if (callbacks.onMarkerComplete != null) {
            callbacks.onMarkerComplete(
              transition.transitionName,
              transition.markerName,
              transition.startTime,
              endTime,
            );
          }
        });
      }

      const transitionComplete = pendingTransitions.transitionComplete;
      if (transitionComplete !== null) {
        transitionComplete.forEach((transition) => {
          if (callbacks.onTransitionComplete != null) {
            callbacks.onTransitionComplete(
              transition.transitionName,
              transition.startTime,
              endTime,
            );
          }
        });
      }
    }
  }
}

// For every tracing marker, store a pointer to it. We will later access it
// to get the set of suspense boundaries that need to resolve before the
// tracing marker can be logged as complete
// This code lives separate from the ReactFiberTransition code because
// we push and pop on the tracing marker, not the suspense boundary
const markerInstanceStack = createCursor(null);

export function pushRootMarkerInstance(workInProgress) {
  if (enableTransitionTracing) {
    // On the root, every transition gets mapped to it's own map of
    // suspense boundaries. The transition is marked as complete when
    // the suspense boundaries map is empty. We do this because every
    // transition completes at different times and depends on different
    // suspense boundaries to complete. We store all the transitions
    // along with its map of suspense boundaries in the root incomplete
    // transitions map. Each entry in this map functions like a tracing
    // marker does, so we can push it onto the marker instance stack
    const transitions = getWorkInProgressTransitions();
    const root = workInProgress.stateNode;

    if (transitions !== null) {
      transitions.forEach((transition) => {
        if (!root.incompleteTransitions.has(transition)) {
          root.incompleteTransitions.set(transition, {
            transitions: new Set([transition]),
            pendingSuspenseBoundaries: null,
          });
        }
      });
    }

    const markerInstances = [];
    // For ever transition on the suspense boundary, we push the transition
    // along with its map of pending suspense boundaries onto the marker
    // instance stack.
    root.incompleteTransitions.forEach((markerInstance) => {
      markerInstances.push(markerInstance);
    });
    push(markerInstanceStack, markerInstances, workInProgress);
  }
}

export function popRootMarkerInstance(workInProgress) {
  if (enableTransitionTracing) {
    pop(markerInstanceStack, workInProgress);
  }
}

export function pushMarkerInstance(workInProgress, markerInstance) {
  if (enableTransitionTracing) {
    if (markerInstanceStack.current === null) {
      push(markerInstanceStack, [markerInstance], workInProgress);
    } else {
      push(
        markerInstanceStack,
        markerInstanceStack.current.concat(markerInstance),
        workInProgress,
      );
    }
  }
}

export function popMarkerInstance(workInProgress) {
  if (enableTransitionTracing) {
    pop(markerInstanceStack, workInProgress);
  }
}

export function getMarkerInstances() {
  if (enableTransitionTracing) {
    return markerInstanceStack.current;
  }
  return null;
}
