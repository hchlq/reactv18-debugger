/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *       strict-local
 */

export function sourceMapIncludesSource(sourcemap, source) {
  if (source == null) {
    return false;
  }
  if (sourcemap.mappings === undefined) {
    const indexSourceMap = sourcemap;
    return indexSourceMap.sections.some((section) => {
      return sourceMapIncludesSource(section.map, source);
    });
  }

  const basicMap = sourcemap;
  return basicMap.sources.some(
    (s) => s === 'Inline Babel script' || source.endsWith(s),
  );
}
