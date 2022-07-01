/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import * as React from 'react';
import useEvent from './useEvent';

const {useCallback, useEffect, useLayoutEffect, useRef} = React;

const isMac =
  typeof window !== 'undefined' && window.navigator != null
    ? /^Mac/.test(window.navigator.platform)
    : false;

const hasPointerEvents =
  typeof window !== 'undefined' && window.PointerEvent != null;

const globalFocusVisibleEvents = hasPointerEvents
  ? ['keydown', 'pointermove', 'pointerdown', 'pointerup']
  : [
      'keydown',
      'mousedown',
      'mousemove',
      'mouseup',
      'touchmove',
      'touchstart',
      'touchend',
    ];

// Global state for tracking focus visible and emulation of mouse
let isGlobalFocusVisible = true;
let hasTrackedGlobalFocusVisible = false;

function trackGlobalFocusVisible() {
  globalFocusVisibleEvents.forEach((type) => {
    window.addEventListener(type, handleGlobalFocusVisibleEvent, true);
  });
}

function isValidKey(nativeEvent) {
  const {metaKey, altKey, ctrlKey} = nativeEvent;
  return !(metaKey || (!isMac && altKey) || ctrlKey);
}

function isTextInput(nativeEvent) {
  const {key, target} = nativeEvent;
  if (key === 'Tab' || key === 'Escape') {
    return false;
  }
  const {isContentEditable, tagName} = target;
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || isContentEditable;
}

function handleGlobalFocusVisibleEvent(nativeEvent) {
  if (nativeEvent.type === 'keydown') {
    if (isValidKey(nativeEvent)) {
      isGlobalFocusVisible = true;
    }
  } else {
    const nodeName = nativeEvent.target.nodeName;
    // Safari calls mousemove/pointermove events when you tab out of the active
    // Safari frame.
    if (nodeName === 'HTML') {
      return;
    }
    // Handle all the other mouse/touch/pointer events
    isGlobalFocusVisible = false;
  }
}

function handleFocusVisibleTargetEvents(event, callback) {
  if (event.type === 'keydown') {
    const {nativeEvent} = event;
    if (isValidKey(nativeEvent) && !isTextInput(nativeEvent)) {
      callback(true);
    }
  } else {
    callback(false);
  }
}

function isRelatedTargetWithin(focusWithinTarget, relatedTarget) {
  if (relatedTarget == null) {
    return false;
  }
  // As the focusWithinTarget can be a Scope Instance (experimental API),
  // we need to use the containsNode() method. Otherwise, focusWithinTarget
  // must be a Node, which means we can use the contains() method.
  return typeof focusWithinTarget.containsNode === 'function'
    ? focusWithinTarget.containsNode(relatedTarget)
    : focusWithinTarget.contains(relatedTarget);
}

function setFocusVisibleListeners(focusVisibleHandles, focusTarget, callback) {
  focusVisibleHandles.forEach((focusVisibleHandle) => {
    focusVisibleHandle.setListener(focusTarget, (event) =>
      handleFocusVisibleTargetEvents(event, callback),
    );
  });
}

function useFocusVisibleInputHandles() {
  return [
    useEvent('mousedown'),
    useEvent(hasPointerEvents ? 'pointerdown' : 'touchstart'),
    useEvent('keydown'),
  ];
}

function useFocusLifecycles() {
  useEffect(() => {
    if (!hasTrackedGlobalFocusVisible) {
      hasTrackedGlobalFocusVisible = true;
      trackGlobalFocusVisible();
    }
  }, []);
}

export function useFocus(
  focusTargetRef,
  {disabled, onBlur, onFocus, onFocusChange, onFocusVisibleChange},
) {
  // Setup controlled state for this useFocus hook
  const stateRef = useRef({isFocused: false, isFocusVisible: false});
  const focusHandle = useEvent('focusin');
  const blurHandle = useEvent('focusout');
  const focusVisibleHandles = useFocusVisibleInputHandles();

  useLayoutEffect(() => {
    const focusTarget = focusTargetRef.current;
    const state = stateRef.current;

    if (focusTarget !== null && state !== null && focusTarget.nodeType === 1) {
      // Handle focus visible
      setFocusVisibleListeners(
        focusVisibleHandles,
        focusTarget,
        (isFocusVisible) => {
          if (state.isFocused && state.isFocusVisible !== isFocusVisible) {
            state.isFocusVisible = isFocusVisible;
            if (onFocusVisibleChange) {
              onFocusVisibleChange(isFocusVisible);
            }
          }
        },
      );

      // Handle focus
      focusHandle.setListener(focusTarget, (event) => {
        if (disabled === true) {
          return;
        }
        if (!state.isFocused && focusTarget === event.target) {
          state.isFocused = true;
          state.isFocusVisible = isGlobalFocusVisible;
          if (onFocus) {
            onFocus(event);
          }
          if (onFocusChange) {
            onFocusChange(true);
          }
          if (state.isFocusVisible && onFocusVisibleChange) {
            onFocusVisibleChange(true);
          }
        }
      });

      // Handle blur
      blurHandle.setListener(focusTarget, (event) => {
        if (disabled === true) {
          return;
        }
        if (state.isFocused) {
          state.isFocused = false;
          state.isFocusVisible = isGlobalFocusVisible;
          if (onBlur) {
            onBlur(event);
          }
          if (onFocusChange) {
            onFocusChange(false);
          }
          if (state.isFocusVisible && onFocusVisibleChange) {
            onFocusVisibleChange(false);
          }
        }
      });
    }
  }, [
    blurHandle,
    disabled,
    focusHandle,
    focusTargetRef,
    focusVisibleHandles,
    onBlur,
    onFocus,
    onFocusChange,
    onFocusVisibleChange,
  ]);

  // Mount/Unmount logic
  useFocusLifecycles();
}

export function useFocusWithin(
  focusWithinTargetRef,

  {
    disabled,
    onAfterBlurWithin,
    onBeforeBlurWithin,
    onBlurWithin,
    onFocusWithin,
    onFocusWithinChange,
    onFocusWithinVisibleChange,
  },
) {
  // Setup controlled state for this useFocus hook
  const stateRef = useRef({isFocused: false, isFocusVisible: false});
  const focusHandle = useEvent('focusin');
  const blurHandle = useEvent('focusout');
  const afterBlurHandle = useEvent('afterblur');
  const beforeBlurHandle = useEvent('beforeblur');
  const focusVisibleHandles = useFocusVisibleInputHandles();

  const useFocusWithinRef = useCallback(
    (focusWithinTarget) => {
      // Handle the incoming focusTargetRef. It can be either a function ref
      // or an object ref.
      if (typeof focusWithinTargetRef === 'function') {
        focusWithinTargetRef(focusWithinTarget);
      } else {
        focusWithinTargetRef.current = focusWithinTarget;
      }
      const state = stateRef.current;

      if (focusWithinTarget !== null && state !== null) {
        // Handle focus visible
        setFocusVisibleListeners(
          focusVisibleHandles,
          // $FlowFixMe focusWithinTarget is not null here
          focusWithinTarget,
          (isFocusVisible) => {
            if (state.isFocused && state.isFocusVisible !== isFocusVisible) {
              state.isFocusVisible = isFocusVisible;
              if (onFocusWithinVisibleChange) {
                onFocusWithinVisibleChange(isFocusVisible);
              }
            }
          },
        );

        // Handle focus
        // $FlowFixMe focusWithinTarget is not null here
        focusHandle.setListener(focusWithinTarget, (event) => {
          if (disabled) {
            return;
          }
          if (!state.isFocused) {
            state.isFocused = true;
            state.isFocusVisible = isGlobalFocusVisible;
            if (onFocusWithinChange) {
              onFocusWithinChange(true);
            }
            if (state.isFocusVisible && onFocusWithinVisibleChange) {
              onFocusWithinVisibleChange(true);
            }
          }
          if (!state.isFocusVisible && isGlobalFocusVisible) {
            state.isFocusVisible = isGlobalFocusVisible;
            if (onFocusWithinVisibleChange) {
              onFocusWithinVisibleChange(true);
            }
          }
          if (onFocusWithin) {
            onFocusWithin(event);
          }
        });

        // Handle blur
        // $FlowFixMe focusWithinTarget is not null here
        blurHandle.setListener(focusWithinTarget, (event) => {
          if (disabled) {
            return;
          }
          const {relatedTarget} = event.nativeEvent;

          if (
            state.isFocused &&
            !isRelatedTargetWithin(focusWithinTarget, relatedTarget)
          ) {
            state.isFocused = false;
            if (onFocusWithinChange) {
              onFocusWithinChange(false);
            }
            if (state.isFocusVisible && onFocusWithinVisibleChange) {
              onFocusWithinVisibleChange(false);
            }
            if (onBlurWithin) {
              onBlurWithin(event);
            }
          }
        });

        // Handle before blur. This is a special
        // React provided event.
        // $FlowFixMe focusWithinTarget is not null here
        beforeBlurHandle.setListener(focusWithinTarget, (event) => {
          if (disabled) {
            return;
          }
          if (onBeforeBlurWithin) {
            onBeforeBlurWithin(event);
            // Add an "afterblur" listener on document. This is a special
            // React provided event.
            afterBlurHandle.setListener(document, (afterBlurEvent) => {
              if (onAfterBlurWithin) {
                onAfterBlurWithin(afterBlurEvent);
              }
              // Clear listener on document
              afterBlurHandle.setListener(document, null);
            });
          }
        });
      }
    },
    [
      afterBlurHandle,
      beforeBlurHandle,
      blurHandle,
      disabled,
      focusHandle,
      focusWithinTargetRef,
      onAfterBlurWithin,
      onBeforeBlurWithin,
      onBlurWithin,
      onFocusWithin,
      onFocusWithinChange,
      onFocusWithinVisibleChange,
    ],
  );

  // Mount/Unmount logic
  useFocusLifecycles();

  return useFocusWithinRef;
}
