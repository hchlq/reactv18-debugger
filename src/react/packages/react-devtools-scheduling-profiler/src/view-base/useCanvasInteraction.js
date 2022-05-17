/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {useEffect} from 'react';
import {normalizeWheel} from './utils/normalizeWheel';

let canvasBoundingRectCache = null;
function cacheFirstGetCanvasBoundingRect(canvas) {
  if (
    canvasBoundingRectCache &&
    canvas.width === canvasBoundingRectCache.width &&
    canvas.height === canvasBoundingRectCache.height
  ) {
    return canvasBoundingRectCache.rect;
  }
  canvasBoundingRectCache = {
    width: canvas.width,
    height: canvas.height,
    rect: canvas.getBoundingClientRect(),
  };
  return canvasBoundingRectCache.rect;
}

export function useCanvasInteraction(canvasRef, interactor) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    function localToCanvasCoordinates(localCoordinates) {
      const canvasRect = cacheFirstGetCanvasBoundingRect(canvas);
      return {
        x: localCoordinates.x - canvasRect.left,
        y: localCoordinates.y - canvasRect.top,
      };
    }

    const onCanvasMouseDown = (event) => {
      interactor({
        type: 'mousedown',
        payload: {
          event,
          location: localToCanvasCoordinates({x: event.x, y: event.y}),
        },
      });
    };

    const onDocumentMouseMove = (event) => {
      interactor({
        type: 'mousemove',
        payload: {
          event,
          location: localToCanvasCoordinates({x: event.x, y: event.y}),
        },
      });
    };

    const onDocumentMouseUp = (event) => {
      interactor({
        type: 'mouseup',
        payload: {
          event,
          location: localToCanvasCoordinates({x: event.x, y: event.y}),
        },
      });
    };

    const onCanvasWheel = (event) => {
      event.preventDefault();
      event.stopPropagation();

      const location = localToCanvasCoordinates({x: event.x, y: event.y});
      const delta = normalizeWheel(event);

      if (event.shiftKey) {
        interactor({
          type: 'wheel-shift',
          payload: {event, location, delta},
        });
      } else if (event.ctrlKey) {
        interactor({
          type: 'wheel-control',
          payload: {event, location, delta},
        });
      } else if (event.metaKey) {
        interactor({
          type: 'wheel-meta',
          payload: {event, location, delta},
        });
      } else {
        interactor({
          type: 'wheel-plain',
          payload: {event, location, delta},
        });
      }

      return false;
    };

    document.addEventListener('mousemove', onDocumentMouseMove);
    document.addEventListener('mouseup', onDocumentMouseUp);

    canvas.addEventListener('mousedown', onCanvasMouseDown);
    canvas.addEventListener('wheel', onCanvasWheel);

    return () => {
      document.removeEventListener('mousemove', onDocumentMouseMove);
      document.removeEventListener('mouseup', onDocumentMouseUp);

      canvas.removeEventListener('mousedown', onCanvasMouseDown);
      canvas.removeEventListener('wheel', onCanvasWheel);
    };
  }, [canvasRef, interactor]);
}
