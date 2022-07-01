/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {VerticalScrollBarView} from './VerticalScrollBarView';
import {withVerticalScrollbarLayout} from './withVerticalScrollbarLayout';
import {View} from '../View';
import {VerticalScrollView} from '../VerticalScrollView';

export class VerticalScrollOverflowView extends View {
  _contentView;
  _isProcessingOnChange = false;
  _isScrolling = false;
  _scrollOffset = 0;
  _scrollBarView;
  _verticalScrollView;

  constructor(surface, frame, contentView, viewState) {
    super(surface, frame, withVerticalScrollbarLayout);

    this._contentView = contentView;
    this._verticalScrollView = new VerticalScrollView(
      surface,
      frame,
      contentView,
      viewState,
      'VerticalScrollOverflowView',
    );
    this._verticalScrollView.onChange(this._onVerticalScrollViewChange);

    this._scrollBarView = new VerticalScrollBarView(surface, frame, this);

    this.addSubview(this._verticalScrollView);
    this.addSubview(this._scrollBarView);
  }

  layoutSubviews() {
    super.layoutSubviews();

    const contentSize = this._contentView.desiredSize();

    // This should be done after calling super.layoutSubviews() – calling it
    // before somehow causes _contentView to need display on every mousemove
    // event when the scroll bar is shown.
    this._scrollBarView.setContentHeight(contentSize.height);
  }

  setScrollOffset(newScrollOffset, maxScrollOffset) {
    const deltaY = newScrollOffset - this._scrollOffset;

    if (!this._isProcessingOnChange) {
      this._verticalScrollView.scrollBy(-deltaY);
    }

    this._scrollOffset = newScrollOffset;

    this.setNeedsDisplay();
  }

  _onVerticalScrollViewChange = (scrollState, containerLength) => {
    const maxOffset = scrollState.length - containerLength;
    if (maxOffset === 0) {
      return;
    }

    const percentage = Math.abs(scrollState.offset) / maxOffset;
    const maxScrollThumbY = this._scrollBarView.getMaxScrollThumbY();

    this._isProcessingOnChange = true;
    this._scrollBarView.setScrollThumbY(percentage * maxScrollThumbY);
    this._isProcessingOnChange = false;
  };
}
