/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {ResizeBarView} from './ResizeBarView';
import {Surface} from '../Surface';
import {View} from '../View';
import {rectContainsPoint} from '../geometry';
import {noopLayout} from '../layouter';
import {clamp} from '../utils/clamp';

const RESIZE_BAR_HEIGHT = 8;
const RESIZE_BAR_WITH_LABEL_HEIGHT = 16;

const HIDDEN_RECT = {
  origin: {x: 0, y: 0},
  size: {width: 0, height: 0},
};

export class ResizableView extends View {
  _canvasRef;
  _layoutState;
  _mutableViewStateKey;
  _resizeBar;
  _resizingState = null;
  _subview;
  _viewState;

  constructor(surface, frame, subview, viewState, canvasRef, label) {
    super(surface, frame, noopLayout);

    this._canvasRef = canvasRef;
    this._layoutState = {barOffsetY: 0};
    this._mutableViewStateKey = label + ':ResizableView';
    this._subview = subview;
    this._resizeBar = new ResizeBarView(surface, frame, label);
    this._viewState = viewState;

    this.addSubview(this._subview);
    this.addSubview(this._resizeBar);

    this._restoreMutableViewState();
  }

  desiredSize() {
    const subviewDesiredSize = this._subview.desiredSize();

    if (this._shouldRenderResizeBar()) {
      const resizeBarDesiredSize = this._resizeBar.desiredSize();

      return {
        width: this.frame.size.width,
        height: this._layoutState.barOffsetY + resizeBarDesiredSize.height,
      };
    } else {
      return {
        width: this.frame.size.width,
        height: subviewDesiredSize.height,
      };
    }
  }

  layoutSubviews() {
    this._updateLayoutState();
    this._updateSubviewFrames();

    super.layoutSubviews();
  }

  _restoreMutableViewState() {
    if (
      this._viewState.viewToMutableViewStateMap.has(this._mutableViewStateKey)
    ) {
      this._layoutState = this._viewState.viewToMutableViewStateMap.get(
        this._mutableViewStateKey,
      );

      this._updateLayoutStateAndResizeBar(this._layoutState.barOffsetY);
    } else {
      this._viewState.viewToMutableViewStateMap.set(
        this._mutableViewStateKey,
        this._layoutState,
      );

      const subviewDesiredSize = this._subview.desiredSize();
      this._updateLayoutStateAndResizeBar(
        subviewDesiredSize.maxInitialHeight != null
          ? Math.min(
              subviewDesiredSize.maxInitialHeight,
              subviewDesiredSize.height,
            )
          : subviewDesiredSize.height,
      );
    }

    this.setNeedsDisplay();
  }

  _shouldRenderResizeBar() {
    const subviewDesiredSize = this._subview.desiredSize();
    return subviewDesiredSize.hideScrollBarIfLessThanHeight != null
      ? subviewDesiredSize.height >
          subviewDesiredSize.hideScrollBarIfLessThanHeight
      : true;
  }

  _updateLayoutStateAndResizeBar(barOffsetY) {
    if (barOffsetY <= RESIZE_BAR_WITH_LABEL_HEIGHT - RESIZE_BAR_HEIGHT) {
      barOffsetY = 0;
    }

    this._layoutState.barOffsetY = barOffsetY;

    this._resizeBar.showLabel = barOffsetY === 0;
  }

  _updateLayoutState() {
    const {frame, _resizingState} = this;

    // Allow bar to travel to bottom of the visible area of this view but no further
    const subviewDesiredSize = this._subview.desiredSize();
    const maxBarOffset = subviewDesiredSize.height;

    let proposedBarOffsetY = this._layoutState.barOffsetY;
    // Update bar offset if dragging bar
    if (_resizingState) {
      const {mouseY, cursorOffsetInBarFrame} = _resizingState;
      proposedBarOffsetY = mouseY - frame.origin.y - cursorOffsetInBarFrame;
    }

    this._updateLayoutStateAndResizeBar(
      clamp(0, maxBarOffset, proposedBarOffsetY),
    );
  }

  _updateSubviewFrames() {
    const {
      frame: {
        origin: {x, y},
        size: {width},
      },
      _layoutState: {barOffsetY},
    } = this;

    const resizeBarDesiredSize = this._resizeBar.desiredSize();

    if (barOffsetY === 0) {
      this._subview.setFrame(HIDDEN_RECT);
    } else {
      this._subview.setFrame({
        origin: {x, y},
        size: {width, height: barOffsetY},
      });
    }

    this._resizeBar.setFrame({
      origin: {x, y: y + barOffsetY},
      size: {width, height: resizeBarDesiredSize.height},
    });
  }

  _handleClick(interaction) {
    if (!this._shouldRenderResizeBar()) {
      return;
    }

    const cursorInView = rectContainsPoint(
      interaction.payload.location,
      this.frame,
    );
    if (cursorInView) {
      if (this._layoutState.barOffsetY === 0) {
        // Clicking on the collapsed label should expand.
        const subviewDesiredSize = this._subview.desiredSize();
        this._updateLayoutStateAndResizeBar(subviewDesiredSize.height);
        this.setNeedsDisplay();

        return true;
      }
    }
  }

  _handleDoubleClick(interaction) {
    if (!this._shouldRenderResizeBar()) {
      return;
    }

    const cursorInView = rectContainsPoint(
      interaction.payload.location,
      this.frame,
    );
    if (cursorInView) {
      if (this._layoutState.barOffsetY > 0) {
        // Double clicking on the expanded view should collapse.
        this._updateLayoutStateAndResizeBar(0);
        this.setNeedsDisplay();

        return true;
      }
    }
  }

  _handleMouseDown(interaction) {
    const cursorLocation = interaction.payload.location;
    const resizeBarFrame = this._resizeBar.frame;
    if (rectContainsPoint(cursorLocation, resizeBarFrame)) {
      const mouseY = cursorLocation.y;
      this._resizingState = {
        cursorOffsetInBarFrame: mouseY - resizeBarFrame.origin.y,
        mouseY,
      };

      return true;
    }
  }

  _handleMouseMove(interaction) {
    const {_resizingState} = this;
    if (_resizingState) {
      this._resizingState = {
        ..._resizingState,
        mouseY: interaction.payload.location.y,
      };
      this.setNeedsDisplay();

      return true;
    }
  }

  _handleMouseUp(interaction) {
    if (this._resizingState) {
      this._resizingState = null;
    }
  }

  getCursorActiveSubView(interaction) {
    const cursorLocation = interaction.payload.location;
    const resizeBarFrame = this._resizeBar.frame;
    if (rectContainsPoint(cursorLocation, resizeBarFrame)) {
      return this;
    } else {
      return null;
    }
  }

  handleInteraction(interaction, viewRefs) {
    switch (interaction.type) {
      case 'click':
        return this._handleClick(interaction);
      case 'double-click':
        return this._handleDoubleClick(interaction);
      case 'mousedown':
        return this._handleMouseDown(interaction);
      case 'mousemove':
        return this._handleMouseMove(interaction);
      case 'mouseup':
        return this._handleMouseUp(interaction);
    }
  }
}
