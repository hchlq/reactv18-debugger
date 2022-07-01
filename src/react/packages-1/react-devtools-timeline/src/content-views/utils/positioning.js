/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

export function positioningScaleFactor(intrinsicWidth, frame) {
  return frame.size.width / intrinsicWidth;
}

export function timestampToPosition(timestamp, scaleFactor, frame) {
  return frame.origin.x + timestamp * scaleFactor;
}

export function positionToTimestamp(position, scaleFactor, frame) {
  return (position - frame.origin.x) / scaleFactor;
}

export function durationToWidth(duration, scaleFactor) {
  return duration * scaleFactor;
}

export function widthToDuration(width, scaleFactor) {
  return width / scaleFactor;
}
