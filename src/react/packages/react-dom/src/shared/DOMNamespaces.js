/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
export const MATH_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';
export const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

// Assumes there is no parent namespace.
// 根据元素的类型，获取命名空间
export function getIntrinsicNamespace(type) {
  switch (type) {
    case 'svg':
      return SVG_NAMESPACE;
    case 'math':
      return MATH_NAMESPACE;
    default:
      // 默认返回 HTML_NAMESPACE
      return HTML_NAMESPACE;
  }
}

export function getChildNamespace(
  parentNamespace,
  type
){
  if (parentNamespace == null || parentNamespace === HTML_NAMESPACE) {
    // 父元素为空 或者 父元素的命名空间是 HTML_NAMESPACE
    // No (or default) parent namespace: potential entry point.
    return getIntrinsicNamespace(type);
  }

  if (parentNamespace === SVG_NAMESPACE && type === 'foreignObject') {
    // We're leaving SVG.
    // 父元素命名空间是 svg, 当前元素标签是 foreignObject
    return HTML_NAMESPACE;
  }

  // By default, pass namespace below.
  return parentNamespace;
}
