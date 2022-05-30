/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

/**
 * A function that takes a list of subviews, currently laid out in
 * `existingLayout`, and lays them out into `containingFrame`.
 */

function viewToLayoutInfo(view) {
  return {view, frame: view.frame};
}

export function viewsToLayout(views) {
  return views.map(viewToLayoutInfo);
}

/**
 * Applies `layout`'s `frame`s to its corresponding `view`.
 */
export function collapseLayoutIntoViews(layout) {
  layout.forEach(({view, frame}) => view.setFrame(frame));
}

/**
 * A no-operation layout; does not modify the layout.
 */
export const noopLayout = (layout) => layout;

/**
 * Layer views on top of each other. All views' frames will be set to `containerFrame`.
 *
 * Equivalent to composing:
 * - `alignToContainerXLayout`,
 * - `alignToContainerYLayout`,
 * - `containerWidthLayout`, and
 * - `containerHeightLayout`.
 */
export const layeredLayout = (layout, containerFrame) => {
  return layout.map((layoutInfo) => ({...layoutInfo, frame: containerFrame}));
};

/**
 * Stacks `views` vertically in `frame`.
 * All views in `views` will have their widths set to the frame's width.
 */
export const verticallyStackedLayout = (layout, containerFrame) => {
  let currentY = containerFrame.origin.y;
  return layout.map((layoutInfo) => {
    const desiredSize = layoutInfo.view.desiredSize();
    const height = desiredSize
      ? desiredSize.height
      : containerFrame.origin.y + containerFrame.size.height - currentY;
    const proposedFrame = {
      origin: {x: containerFrame.origin.x, y: currentY},
      size: {width: containerFrame.size.width, height},
    };
    currentY += height;
    return {
      ...layoutInfo,
      frame: proposedFrame,
    };
  });
};

/**
 * A layouter that aligns all frames' lefts to the container frame's left.
 */
export const alignToContainerXLayout = (layout, containerFrame) => {
  return layout.map((layoutInfo) => ({
    ...layoutInfo,
    frame: {
      origin: {
        x: containerFrame.origin.x,
        y: layoutInfo.frame.origin.y,
      },
      size: layoutInfo.frame.size,
    },
  }));
};

/**
 * A layouter that aligns all frames' tops to the container frame's top.
 */
export const alignToContainerYLayout = (layout, containerFrame) => {
  return layout.map((layoutInfo) => ({
    ...layoutInfo,
    frame: {
      origin: {
        x: layoutInfo.frame.origin.x,
        y: containerFrame.origin.y,
      },
      size: layoutInfo.frame.size,
    },
  }));
};

/**
 * A layouter that sets all frames' widths to `containerFrame.size.width`.
 */
export const containerWidthLayout = (layout, containerFrame) => {
  return layout.map((layoutInfo) => ({
    ...layoutInfo,
    frame: {
      origin: layoutInfo.frame.origin,
      size: {
        width: containerFrame.size.width,
        height: layoutInfo.frame.size.height,
      },
    },
  }));
};

/**
 * A layouter that sets all frames' heights to `containerFrame.size.height`.
 */
export const containerHeightLayout = (layout, containerFrame) => {
  return layout.map((layoutInfo) => ({
    ...layoutInfo,
    frame: {
      origin: layoutInfo.frame.origin,
      size: {
        width: layoutInfo.frame.size.width,
        height: containerFrame.size.height,
      },
    },
  }));
};

/**
 * A layouter that sets all frames' heights to the desired height of its view.
 * If the view has no desired size, the frame's height is set to 0.
 */
export const desiredHeightLayout = (layout) => {
  return layout.map((layoutInfo) => {
    const desiredSize = layoutInfo.view.desiredSize();
    const height = desiredSize ? desiredSize.height : 0;
    return {
      ...layoutInfo,
      frame: {
        origin: layoutInfo.frame.origin,
        size: {
          width: layoutInfo.frame.size.width,
          height,
        },
      },
    };
  });
};

/**
 * A layouter that sets all frames' heights to the height of the tallest frame.
 */
export const uniformMaxSubviewHeightLayout = (layout) => {
  const maxHeight = Math.max(
    ...layout.map((layoutInfo) => layoutInfo.frame.size.height),
  );
  return layout.map((layoutInfo) => ({
    ...layoutInfo,
    frame: {
      origin: layoutInfo.frame.origin,
      size: {
        width: layoutInfo.frame.size.width,
        height: maxHeight,
      },
    },
  }));
};

/**
 * A layouter that sets heights in this fashion:
 * - If a frame's height >= `containerFrame.size.height`, the frame is left unchanged.
 * - Otherwise, sets the frame's height to `containerFrame.size.height`.
 */
export const atLeastContainerHeightLayout = (layout, containerFrame) => {
  return layout.map((layoutInfo) => ({
    ...layoutInfo,
    frame: {
      origin: layoutInfo.frame.origin,
      size: {
        width: layoutInfo.frame.size.width,
        height: Math.max(
          containerFrame.size.height,
          layoutInfo.frame.size.height,
        ),
      },
    },
  }));
};

/**
 * Create a layouter that applies each layouter in `layouters` in sequence.
 */
export function createComposedLayout(...layouters) {
  if (layouters.length === 0) {
    return noopLayout;
  }

  const composedLayout = (layout, containerFrame) => {
    return layouters.reduce(
      (intermediateLayout, layouter) =>
        layouter(intermediateLayout, containerFrame),
      layout,
    );
  };
  return composedLayout;
}
