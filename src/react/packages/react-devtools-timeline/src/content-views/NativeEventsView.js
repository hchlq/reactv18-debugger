/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {
  durationToWidth,
  positioningScaleFactor,
  positionToTimestamp,
  timestampToPosition,
} from './utils/positioning';
import {drawText} from './utils/text';
import {formatDuration} from '../utils/formatting';
import {
  View,
  Surface,
  rectContainsPoint,
  rectIntersectsRect,
  intersectionOfRects,
} from '../view-base';
import {COLORS, NATIVE_EVENT_HEIGHT, BORDER_SIZE} from './constants';

const ROW_WITH_BORDER_HEIGHT = NATIVE_EVENT_HEIGHT + BORDER_SIZE;

export class NativeEventsView extends View {
  _depthToNativeEvent;
  _hoveredEvent = null;
  _intrinsicSize;
  _maxDepth = 0;
  _profilerData;

  onHover = null;

  constructor(surface, frame, profilerData) {
    super(surface, frame);

    this._profilerData = profilerData;

    this._performPreflightComputations();
  }

  _performPreflightComputations() {
    this._depthToNativeEvent = new Map();

    const {duration, nativeEvents} = this._profilerData;

    nativeEvents.forEach((event) => {
      const depth = event.depth;

      this._maxDepth = Math.max(this._maxDepth, depth);

      if (!this._depthToNativeEvent.has(depth)) {
        this._depthToNativeEvent.set(depth, [event]);
      } else {
        // $FlowFixMe This is unnecessary.
        this._depthToNativeEvent.get(depth).push(event);
      }
    });

    this._intrinsicSize = {
      width: duration,
      height: (this._maxDepth + 1) * ROW_WITH_BORDER_HEIGHT,
      hideScrollBarIfLessThanHeight: ROW_WITH_BORDER_HEIGHT,
    };
  }

  desiredSize() {
    return this._intrinsicSize;
  }

  setHoveredEvent(hoveredEvent) {
    if (this._hoveredEvent === hoveredEvent) {
      return;
    }
    this._hoveredEvent = hoveredEvent;
    this.setNeedsDisplay();
  }

  /**
   * Draw a single `NativeEvent` as a box/span with text inside of it.
   */
  _drawSingleNativeEvent(
    context,
    rect,
    event,
    baseY,
    scaleFactor,
    showHoverHighlight,
  ) {
    const {frame} = this;
    const {depth, duration, timestamp, type, warning} = event;

    baseY += depth * ROW_WITH_BORDER_HEIGHT;

    const xStart = timestampToPosition(timestamp, scaleFactor, frame);
    const xStop = timestampToPosition(timestamp + duration, scaleFactor, frame);
    const eventRect = {
      origin: {
        x: xStart,
        y: baseY,
      },
      size: {width: xStop - xStart, height: NATIVE_EVENT_HEIGHT},
    };
    if (!rectIntersectsRect(eventRect, rect)) {
      return; // Not in view
    }

    const width = durationToWidth(duration, scaleFactor);
    if (width < 1) {
      return; // Too small to render at this zoom level
    }

    const drawableRect = intersectionOfRects(eventRect, rect);
    context.beginPath();
    if (warning !== null) {
      context.fillStyle = showHoverHighlight
        ? COLORS.WARNING_BACKGROUND_HOVER
        : COLORS.WARNING_BACKGROUND;
    } else {
      context.fillStyle = showHoverHighlight
        ? COLORS.NATIVE_EVENT_HOVER
        : COLORS.NATIVE_EVENT;
    }
    context.fillRect(
      drawableRect.origin.x,
      drawableRect.origin.y,
      drawableRect.size.width,
      drawableRect.size.height,
    );

    const label = `${type} - ${formatDuration(duration)}`;

    drawText(label, context, eventRect, drawableRect);
  }

  draw(context) {
    const {
      frame,
      _profilerData: {nativeEvents},
      _hoveredEvent,
      visibleArea,
    } = this;

    context.fillStyle = COLORS.PRIORITY_BACKGROUND;
    context.fillRect(
      visibleArea.origin.x,
      visibleArea.origin.y,
      visibleArea.size.width,
      visibleArea.size.height,
    );

    // Draw events
    const scaleFactor = positioningScaleFactor(
      this._intrinsicSize.width,
      frame,
    );

    nativeEvents.forEach((event) => {
      this._drawSingleNativeEvent(
        context,
        visibleArea,
        event,
        frame.origin.y,
        scaleFactor,
        event === _hoveredEvent,
      );
    });

    // Render bottom borders.
    for (let i = 0; i <= this._maxDepth; i++) {
      const borderFrame = {
        origin: {
          x: frame.origin.x,
          y: frame.origin.y + NATIVE_EVENT_HEIGHT,
        },
        size: {
          width: frame.size.width,
          height: BORDER_SIZE,
        },
      };
      if (rectIntersectsRect(borderFrame, visibleArea)) {
        const borderDrawableRect = intersectionOfRects(
          borderFrame,
          visibleArea,
        );
        context.fillStyle = COLORS.PRIORITY_BORDER;
        context.fillRect(
          borderDrawableRect.origin.x,
          borderDrawableRect.origin.y,
          borderDrawableRect.size.width,
          borderDrawableRect.size.height,
        );
      }
    }
  }

  /**
   * @private
   */
  _handleMouseMove(interaction, viewRefs) {
    const {frame, _intrinsicSize, onHover, visibleArea} = this;
    if (!onHover) {
      return;
    }

    const {location} = interaction.payload;
    if (!rectContainsPoint(location, visibleArea)) {
      onHover(null);
      return;
    }

    const scaleFactor = positioningScaleFactor(_intrinsicSize.width, frame);
    const hoverTimestamp = positionToTimestamp(location.x, scaleFactor, frame);

    const adjustedCanvasMouseY = location.y - frame.origin.y;
    const depth = Math.floor(adjustedCanvasMouseY / ROW_WITH_BORDER_HEIGHT);
    const nativeEventsAtDepth = this._depthToNativeEvent.get(depth);

    if (nativeEventsAtDepth) {
      // Find the event being hovered over.
      for (let index = nativeEventsAtDepth.length - 1; index >= 0; index--) {
        const nativeEvent = nativeEventsAtDepth[index];
        const {duration, timestamp} = nativeEvent;

        if (
          hoverTimestamp >= timestamp &&
          hoverTimestamp <= timestamp + duration
        ) {
          viewRefs.hoveredView = this;
          onHover(nativeEvent);
          return;
        }
      }
    }

    onHover(null);
  }

  handleInteraction(interaction, viewRefs) {
    switch (interaction.type) {
      case 'mousemove':
        this._handleMouseMove(interaction, viewRefs);
        break;
    }
  }
}
