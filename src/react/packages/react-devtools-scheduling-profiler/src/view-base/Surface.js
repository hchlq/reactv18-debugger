/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *      
 */

                                                        
                                     

import memoize from 'memoize-one';

import {View} from './View';
import {zeroPoint} from './geometry';

// hidpi canvas: https://www.html5rocks.com/en/tutorials/canvas/hidpi/
function configureRetinaCanvas(canvas, height, width) {
  const dpr         = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  return dpr;
}

const getCanvasContext = memoize(
  (
    canvas                   ,
    height        ,
    width        ,
    scaleCanvas          = true,
  )                           => {
    const context = canvas.getContext('2d', {alpha: false});
    if (scaleCanvas) {
      const dpr = configureRetinaCanvas(canvas, height, width);
      // Scale all drawing operations by the dpr, so you don't have to worry about the difference.
      context.scale(dpr, dpr);
    }
    return context;
  },
);

/**
 * Represents the canvas surface and a view heirarchy. A surface is also the
 * place where all interactions enter the view heirarchy.
 */
export class Surface {
  rootView       ;
  _context                           ;
  _canvasSize       ;

  setCanvas(canvas                   , canvasSize      ) {
    this._context = getCanvasContext(
      canvas,
      canvasSize.height,
      canvasSize.width,
    );
    this._canvasSize = canvasSize;

    if (this.rootView) {
      this.rootView.setNeedsDisplay();
    }
  }

  displayIfNeeded() {
    const {rootView, _canvasSize, _context} = this;
    if (!rootView || !_context || !_canvasSize) {
      return;
    }
    rootView.setFrame({
      origin: zeroPoint,
      size: _canvasSize,
    });
    rootView.setVisibleArea({
      origin: zeroPoint,
      size: _canvasSize,
    });
    rootView.displayIfNeeded(_context);
  }

  handleInteraction(interaction             ) {
    if (!this.rootView) {
      return;
    }
    this.rootView.handleInteractionAndPropagateToSubviews(interaction);
  }
}
