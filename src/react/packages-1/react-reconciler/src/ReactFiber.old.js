/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import {
  createRootStrictEffectsByDefault,
  enableCache,
  enableStrictEffects,
  enableProfilerTimer,
  enableScopeAPI,
  enableLegacyHidden,
  enableSyncDefaultUpdates,
  allowConcurrentByDefault,
  enableTransitionTracing,
  enableDebugTracing,
} from 'shared/ReactFeatureFlags';
import {NoFlags, Placement, StaticMask} from './ReactFiberFlags';
import {ConcurrentRoot} from './ReactRootTags';
import {
  IndeterminateComponent,
  ClassComponent,
  HostRoot,
  HostComponent,
  HostText,
  HostPortal,
  ForwardRef,
  Fragment,
  Mode,
  ContextProvider,
  ContextConsumer,
  Profiler,
  SuspenseComponent,
  SuspenseListComponent,
  DehydratedFragment,
  FunctionComponent,
  MemoComponent,
  SimpleMemoComponent,
  LazyComponent,
  ScopeComponent,
  OffscreenComponent,
  LegacyHiddenComponent,
  CacheComponent,
  TracingMarkerComponent,
} from './ReactWorkTags';
import getComponentNameFromFiber from 'react-reconciler/src/getComponentNameFromFiber';

import {isDevToolsPresent} from './ReactFiberDevToolsHook.old';
import {
  resolveClassForHotReloading,
  resolveFunctionForHotReloading,
  resolveForwardRefForHotReloading,
} from './ReactFiberHotReloading.old';
import {NoLanes} from './ReactFiberLane.old';
import {
  NoMode,
  ConcurrentMode,
  DebugTracingMode,
  ProfileMode,
  StrictLegacyMode,
  StrictEffectsMode,
  ConcurrentUpdatesByDefaultMode,
} from './ReactTypeOfMode';
import {
  REACT_FORWARD_REF_TYPE,
  REACT_FRAGMENT_TYPE,
  REACT_DEBUG_TRACING_MODE_TYPE,
  REACT_STRICT_MODE_TYPE,
  REACT_PROFILER_TYPE,
  REACT_PROVIDER_TYPE,
  REACT_CONTEXT_TYPE,
  REACT_SUSPENSE_TYPE,
  REACT_SUSPENSE_LIST_TYPE,
  REACT_MEMO_TYPE,
  REACT_LAZY_TYPE,
  REACT_SCOPE_TYPE,
  REACT_OFFSCREEN_TYPE,
  REACT_LEGACY_HIDDEN_TYPE,
  REACT_CACHE_TYPE,
  REACT_TRACING_MARKER_TYPE,
} from 'shared/ReactSymbols';

let hasBadMapPolyfill;

if (__DEV__) {
  hasBadMapPolyfill = false;
  try {
    const nonExtensibleObject = Object.preventExtensions({});
    /* eslint-disable no-new */
    new Map([[nonExtensibleObject, null]]);
    new Set([nonExtensibleObject]);
    /* eslint-enable no-new */
  } catch (e) {
    // TODO: Consider warning about bad polyfills
    hasBadMapPolyfill = true;
  }
}

// fiber 节点实例
function FiberNode(tag, pendingProps, key, mode) {
  // Instance
  this.tag = tag;
  this.key = key;
  this.elementType = null;
  this.type = null;
  this.stateNode = null;

  // Fiber
  this.return = null;
  this.child = null;
  this.sibling = null;
  this.index = 0;

  this.ref = null;

  this.pendingProps = pendingProps;
  this.memoizedProps = null;
  this.updateQueue = null;
  this.memoizedState = null;
  this.dependencies = null;

  // LegacyRoot 或者 ConcurrentRoot
  this.mode = mode;

  // Effects
  this.flags = NoFlags; // 自己身上的 effects
  this.subtreeFlags = NoFlags; // 子元素的 effects
  this.deletions = null; // 被删除的节点的 effect

  this.lanes = NoLanes; // 自己的更新任务
  this.childLanes = NoLanes; // 孩子的更新任务

  // flags 和 lanes 的区别
  // flags 是 reconciler 中发现的节点的增删改 effect
  // lanes 是更新任务对应的车道

  // 自己在另外一个 fiber 树的一个映射，在第一次更新之后如果复用了该节点，那么这个值就会被赋值
  this.alternate = null;

  // if (enableProfilerTimer) {
  //   // Note: The following is done to avoid a v8 performance cliff.
  //   //
  //   // Initializing the fields below to smis and later updating them with
  //   // double values will cause Fibers to end up having separate shapes.
  //   // This behavior/bug has something to do with Object.preventExtension().
  //   // Fortunately this only impacts DEV builds.
  //   // Unfortunately it makes React unusably slow for some applications.
  //   // To work around this, initialize the fields below with doubles.
  //   //
  //   // Learn more about this here:
  //   // https://github.com/facebook/react/issues/14365
  //   // https://bugs.chromium.org/p/v8/issues/detail?id=8538
  //   this.actualDuration = Number.NaN;
  //   this.actualStartTime = Number.NaN;
  //   this.selfBaseDuration = Number.NaN;
  //   this.treeBaseDuration = Number.NaN;

  //   // It's okay to replace the initial doubles with smis after initialization.
  //   // This won't trigger the performance cliff mentioned above,
  //   // and it simplifies other profiler code (including DevTools).
  //   this.actualDuration = 0;
  //   this.actualStartTime = -1;
  //   this.selfBaseDuration = 0;
  //   this.treeBaseDuration = 0;
  // }

  // if (__DEV__) {
  //   // This isn't directly used but is handy for debugging internals:

  //   this._debugSource = null;
  //   this._debugOwner = null;
  //   this._debugNeedsRemount = false;
  //   this._debugHookTypes = null;
  //   if (!hasBadMapPolyfill && typeof Object.preventExtensions === 'function') {
  //     Object.preventExtensions(this);
  //   }
  // }
}

// This is a constructor function, rather than a POJO constructor, still
// please ensure we do the following:
// 1) Nobody should add any instance methods on this. Instance methods can be
//    more difficult to predict when they get optimized and they are almost
//    never inlined properly in static compilers.
// 2) Nobody should rely on `instanceof Fiber` for type testing. We should
//    always know when it is a fiber.
// 3) We might want to experiment with using numeric keys since they are easier
//    to optimize in a non-JIT environment.
// 4) We can easily go from a constructor to a createFiber object literal if that
//    is faster.
// 5) It should be easy to port this to a C struct and keep a C implementation
//    compatible.
// 创建 fiber 实例
const createFiber = function (tag, pendingProps, key, mode) {
  // $FlowFixMe: the shapes are exact here but Flow doesn't like constructors
  return new FiberNode(tag, pendingProps, key, mode);
};

/**
 * 判断是不是类组件
 *
 * 区别函数组件和类组件
 */
function shouldConstruct(Component) {
  const prototype = Component.prototype;
  return !!(prototype && prototype.isReactComponent);
}

/**
 * 判断是不是简单的函数组件
 */
export function isSimpleFunctionComponent(type) {
  // 1. 类型是函数
  // 2. 不是类组件
  // 3. defaultProps 是 undefined
  return (
    typeof type === 'function' &&
    !shouldConstruct(type) &&
    type.defaultProps === undefined
  );
}

/**
 * 解析 React.lazy 懒加载的 JSX 类型
 */
export function resolveLazyComponentTag(Component) {
  if (typeof Component === 'function') {
    return shouldConstruct(Component) ? ClassComponent : FunctionComponent;
  } else if (Component !== undefined && Component !== null) {
    // 对象类型

    const $$typeof = Component.$$typeof;
    if ($$typeof === REACT_FORWARD_REF_TYPE) {
      // React.forwardRef
      return ForwardRef;
    }

    if ($$typeof === REACT_MEMO_TYPE) {
      // React.memo
      return MemoComponent;
    }
  }

  // 其他的类型返回 IndeterminateComponent，即不确定的组件
  return IndeterminateComponent;
}

// This is used to create an alternate fiber to do work on.
// 创建一个 alternate fiber，即复用 current 的 fiber
export function createWorkInProgress(current, pendingProps) {
  let workInProgress = current.alternate;

  // alternate 为空，首次复用
  if (workInProgress === null) {
    // We use a double buffering pooling technique because we know that we'll
    // only ever need at most two versions of a tree. We pool the "other" unused
    // node that we're free to reuse. This is lazily created to avoid allocating
    // extra objects for things that are never updated. It also allow us to
    // reclaim the extra memory if needed.

    // 复用 current 的信息去创建 fiber
    workInProgress = createFiber(
      current.tag,
      pendingProps,
      current.key,
      current.mode,
    );

    // 复用 current 的 elementType, type, stateNode

    // 一般情况下，elementType 和 type 一样
    workInProgress.elementType = current.elementType;
    workInProgress.type = current.type;
    // fiber 对应的节点. e.g.
    // 普通元素：元素 dom 本身，类组件：类实例，函数组件：null
    workInProgress.stateNode = current.stateNode;

    //! workInProgress 和 current 建立关系
    // 通过 alternate 指向对方
    workInProgress.alternate = current;
    current.alternate = workInProgress;
  } else {
    // alternate 不为空，说明是第二次更新阶段

    // 复用 props
    workInProgress.pendingProps = pendingProps;

    // Needed because Blocks store data on type.
    // 复用 type
    workInProgress.type = current.type;

    // We already have an alternate.
    // Reset the effect tag.
    // 重置该 fiber 本身的 effect
    workInProgress.flags = NoFlags;

    // The effects are no longer valid.
    // 重置 subtreeFlags 和 deletions
    workInProgress.subtreeFlags = NoFlags;
    workInProgress.deletions = null;
  }

  // Reset all effects except static ones.
  // Static effects are not specific to a render.
  // 排除所有的 effect，除了 static之外
  workInProgress.flags = current.flags & StaticMask;

  // 复用 childLanes 和 lanes
  // debugger
  workInProgress.childLanes = current.childLanes;
  workInProgress.lanes = current.lanes;
  // let t = workInProgress.lanes
  // Object.defineProperty(workInProgress, 'lanes', {
  //   set(n) {
  //     if (n === 0) debugger;
  //     t = n
  //   },
  //   get() {
  //     return t
  //   }
  // })

  // 复用孩子
  workInProgress.child = current.child;

  // 复用老的 props
  workInProgress.memoizedProps = current.memoizedProps;
  // 复用老的 state
  workInProgress.memoizedState = current.memoizedState;
  // 复用 updateQueue
  workInProgress.updateQueue = current.updateQueue;

  // Clone the dependencies object. This is mutated during the render phase, so
  // it cannot be shared with the current fiber.
  // 克隆 Context 的依赖项
  const currentDependencies = current.dependencies;
  workInProgress.dependencies =
    currentDependencies === null
      ? null
      : {
          lanes: currentDependencies.lanes,
          firstContext: currentDependencies.firstContext,
        };

  // These will be overridden during the parent's reconciliation
  workInProgress.sibling = current.sibling;
  workInProgress.index = current.index;
  workInProgress.ref = current.ref;


  return workInProgress;
}

// Used to reuse a Fiber for a second pass.
// 返回值的 fiber 用于复用
export function resetWorkInProgress(workInProgress, renderLanes) {
  // This resets the Fiber to what createFiber or createWorkInProgress would
  // have set the values to before during the first pass. Ideally this wouldn't
  // be necessary but unfortunately many code paths reads from the workInProgress
  // when they should be reading from current and writing to workInProgress.

  // We assume pendingProps, index, key, ref, return are still untouched to
  // avoid doing another reconciliation.

  // Reset the effect flags but keep any Placement tags, since that's something
  // that child fiber is setting, not the reconciliation.
  // 只保留 StaticMask 和 Placement 的 effect
  workInProgress.flags &= StaticMask | Placement;

  // The effects are no longer valid.

  const current = workInProgress.alternate;
  if (current === null) {
    // Reset to createFiber's initial values.
    workInProgress.childLanes = NoLanes;
    workInProgress.lanes = renderLanes;

    workInProgress.child = null;
    workInProgress.subtreeFlags = NoFlags;
    workInProgress.memoizedProps = null;
    workInProgress.memoizedState = null;
    workInProgress.updateQueue = null;

    workInProgress.dependencies = null;

    workInProgress.stateNode = null;

    // if (enableProfilerTimer) {
    //   // Note: We don't reset the actualTime counts. It's useful to accumulate
    //   // actual time across multiple render passes.
    //   workInProgress.selfBaseDuration = 0;
    //   workInProgress.treeBaseDuration = 0;
    // }
  } else {
    // Reset to the cloned values that createWorkInProgress would've.
    workInProgress.childLanes = current.childLanes;
    workInProgress.lanes = current.lanes;

    workInProgress.subtreeFlags = NoFlags;
    workInProgress.deletions = null;

    workInProgress.child = current.child;

    workInProgress.memoizedProps = current.memoizedProps;
    workInProgress.memoizedState = current.memoizedState;
    workInProgress.updateQueue = current.updateQueue;
    // Needed because Blocks store data on type.
    workInProgress.type = current.type;

    // Clone the dependencies object. This is mutated during the render phase, so
    // it cannot be shared with the current fiber.
    const currentDependencies = current.dependencies;
    workInProgress.dependencies =
      currentDependencies === null
        ? null
        : {
            lanes: currentDependencies.lanes,
            firstContext: currentDependencies.firstContext,
          };

    // if (enableProfilerTimer) {
    //   // Note: We don't reset the actualTime counts. It's useful to accumulate
    //   // actual time across multiple render passes.
    //   workInProgress.selfBaseDuration = current.selfBaseDuration;
    //   workInProgress.treeBaseDuration = current.treeBaseDuration;
    // }
  }

  return workInProgress;
}

/**
 * 创建 hostRootFiber
 */
export function createHostRootFiber(
  tag,
  isStrictMode,
  concurrentUpdatesByDefaultOverride,
) {
  let mode;
  if (tag === ConcurrentRoot) { // createRoot
    // 默认是 ConcurrentMode
    mode = ConcurrentMode;
    if (isStrictMode === true) {
      mode |= StrictLegacyMode;

      if (enableStrictEffects) {
        // enableStrictEffects: 开发环境下为 true
        mode |= StrictEffectsMode;
      }
    }
    // else if (enableStrictEffects && createRootStrictEffectsByDefault) {
    //   // enableStrictEffects: 开发环境下为 true
    //   // createRootStrictEffectsByDefault: false
    //   mode |= StrictLegacyMode | StrictEffectsMode;
    // }

    // if (
    //   // We only use this flag for our repo tests to check both behaviors.
    //   // TODO: Flip this flag and rename it something like "forceConcurrentByDefaultForTesting"
    //   // enableSyncDefaultUpdates: true
    //   !enableSyncDefaultUpdates ||
    //   // Only for internal experiments.
    //   // allowConcurrentByDefault: false
    //   (allowConcurrentByDefault && concurrentUpdatesByDefaultOverride)
    // ) {
    //   mode |= ConcurrentUpdatesByDefaultMode;
    // }
  } else {
    // render
    mode = NoMode;
  }

  // 开发环境下开启
  if (enableProfilerTimer && isDevToolsPresent) {
    // Always collect profile timings when DevTools are present.
    // This enables DevTools to start capturing timing at any point–
    // Without some nodes in the tree having empty base times.
    mode |= ProfileMode;
  }

  // 创建 fiber 实例
  return createFiber(HostRoot, null, null, mode);
}

/**
 * 从 type 和 props 创建 fiber
 */
export function createFiberFromTypeAndProps(
  type, // React$ElementType
  key,
  pendingProps,
  owner,
  mode,
  lanes,
) {
  // 默认是不确定的组件
  let fiberTag = IndeterminateComponent;

  // The resolved type is set if we know what the final type will be. I.e. it's not lazy.
  let resolvedType = type;

  if (typeof type === 'function') {
    if (shouldConstruct(type)) {
      // 类组件
      fiberTag = ClassComponent;
    }
    //! 函数组件的类型是 IndeterminateComponent
    // see https://github.com/facebook/react/pull/8089
  } else if (typeof type === 'string') {
    // 普通元素
    fiberTag = HostComponent;
  } else {
    getTag: switch (type) {
      case REACT_FRAGMENT_TYPE:
        // fragment
        return createFiberFromFragment(pendingProps.children, mode, lanes, key);
      case REACT_STRICT_MODE_TYPE:
        fiberTag = Mode;

        mode |= StrictLegacyMode;
        // enableStrictEffects: 依赖开发环境
        if (enableStrictEffects && (mode & ConcurrentMode) !== NoMode) {
          // Strict effects should never run on legacy roots
          mode |= StrictEffectsMode;
        }
        break;
      case REACT_PROFILER_TYPE:
        return createFiberFromProfiler(pendingProps, mode, lanes, key);
      case REACT_SUSPENSE_TYPE:
        // suspense
        return createFiberFromSuspense(pendingProps, mode, lanes, key);
      case REACT_SUSPENSE_LIST_TYPE:
        // suspenseList
        return createFiberFromSuspenseList(pendingProps, mode, lanes, key);
      case REACT_OFFSCREEN_TYPE:
        // offscreen
        return createFiberFromOffscreen(pendingProps, mode, lanes, key);
      case REACT_LEGACY_HIDDEN_TYPE:
        if (enableLegacyHidden) {
          return createFiberFromLegacyHidden(pendingProps, mode, lanes, key);
        }
      // eslint-disable-next-line no-fallthrough
      case REACT_SCOPE_TYPE:
        if (enableScopeAPI) {
          return createFiberFromScope(type, pendingProps, mode, lanes, key);
        }
      // eslint-disable-next-line no-fallthrough
      case REACT_CACHE_TYPE:
        if (enableCache) {
          return createFiberFromCache(pendingProps, mode, lanes, key);
        }
      // eslint-disable-next-line no-fallthrough
      case REACT_TRACING_MARKER_TYPE:
        if (enableTransitionTracing) {
          return createFiberFromTracingMarker(pendingProps, mode, lanes, key);
        }
      // eslint-disable-next-line no-fallthrough
      case REACT_DEBUG_TRACING_MODE_TYPE:
        if (enableDebugTracing) {
          fiberTag = Mode;
          mode |= DebugTracingMode;
          break;
        }
      // eslint-disable-next-line no-fallthrough
      default: {
        if (typeof type === 'object' && type !== null) {
          switch (type.$$typeof) {
            case REACT_PROVIDER_TYPE:
              // Provider
              fiberTag = ContextProvider;
              break getTag;
            case REACT_CONTEXT_TYPE:
              // This is a consumer
              // Consumer
              fiberTag = ContextConsumer;
              break getTag;
            case REACT_FORWARD_REF_TYPE:
              // forwardRef
              fiberTag = ForwardRef;
              break getTag;
            case REACT_MEMO_TYPE:
              // memo
              fiberTag = MemoComponent;
              break getTag;
            case REACT_LAZY_TYPE:
              // lazy
              fiberTag = LazyComponent;
              // resolveType 为 null
              resolvedType = null;
              break getTag;
          }
        }
        let info = '';
        throw new Error(
          'Element type is invalid: expected a string (for built-in ' +
            'components) or a class/function (for composite components) ' +
            `but got: ${type == null ? type : typeof type}.${info}`,
        );
      }
    }
  }

  // 创建 fiber 节点
  const fiber = createFiber(fiberTag, pendingProps, key, mode);

  // 一般的 elementType 和 type 一样，lazy 除外
  fiber.elementType = type;
  // lazy 组件的 type 为空
  fiber.type = resolvedType;

  // 给 lanes 赋值
  fiber.lanes = lanes;

  return fiber;
}

/**
 * 为 element 创建 fiber
 */
export function createFiberFromElement(element, mode, lanes) {
  let owner = null;

  const type = element.type;
  const key = element.key;
  const pendingProps = element.props;

  const fiber = createFiberFromTypeAndProps(
    type,
    key,
    pendingProps,
    owner,
    mode,
    lanes,
  );

  return fiber;
}

/**
 * 为 fragment 创建 fiber
 */
export function createFiberFromFragment(elements, mode, lanes, key) {
  const fiber = createFiber(Fragment, elements, key, mode);

  fiber.lanes = lanes;

  return fiber;
}

/**
 * 给文本节点创建 fiber
 */
export function createFiberFromText(content, mode, lanes) {
  const fiber = createFiber(HostText, content, null, mode);
  fiber.lanes = lanes;
  return fiber;
}


function createFiberFromScope(scope, pendingProps, mode, lanes, key) {
  const fiber = createFiber(ScopeComponent, pendingProps, key, mode);
  fiber.type = scope;
  fiber.elementType = scope;
  fiber.lanes = lanes;
  return fiber;
}

function createFiberFromProfiler(pendingProps, mode, lanes, key) {
  if (__DEV__) {
    if (typeof pendingProps.id !== 'string') {
      console.error(
        'Profiler must specify an "id" of type `string` as a prop. Received the type `%s` instead.',
        typeof pendingProps.id,
      );
    }
  }

  const fiber = createFiber(Profiler, pendingProps, key, mode | ProfileMode);
  fiber.elementType = REACT_PROFILER_TYPE;
  fiber.lanes = lanes;

  if (enableProfilerTimer) {
    fiber.stateNode = {
      effectDuration: 0,
      passiveEffectDuration: 0,
    };
  }

  return fiber;
}

export function createFiberFromSuspense(pendingProps, mode, lanes, key) {
  const fiber = createFiber(SuspenseComponent, pendingProps, key, mode);
  fiber.elementType = REACT_SUSPENSE_TYPE;
  fiber.lanes = lanes;
  return fiber;
}

export function createFiberFromSuspenseList(pendingProps, mode, lanes, key) {
  const fiber = createFiber(SuspenseListComponent, pendingProps, key, mode);
  fiber.elementType = REACT_SUSPENSE_LIST_TYPE;
  fiber.lanes = lanes;
  return fiber;
}

export function createFiberFromOffscreen(pendingProps, mode, lanes, key) {
  const fiber = createFiber(OffscreenComponent, pendingProps, key, mode);
  fiber.elementType = REACT_OFFSCREEN_TYPE;
  fiber.lanes = lanes;
  const primaryChildInstance = {};
  fiber.stateNode = primaryChildInstance;
  return fiber;
}

export function createFiberFromLegacyHidden(pendingProps, mode, lanes, key) {
  const fiber = createFiber(LegacyHiddenComponent, pendingProps, key, mode);
  fiber.elementType = REACT_LEGACY_HIDDEN_TYPE;
  fiber.lanes = lanes;
  return fiber;
}

export function createFiberFromCache(pendingProps, mode, lanes, key) {
  const fiber = createFiber(CacheComponent, pendingProps, key, mode);
  fiber.elementType = REACT_CACHE_TYPE;
  fiber.lanes = lanes;
  return fiber;
}

export function createFiberFromTracingMarker(pendingProps, mode, lanes, key) {
  const fiber = createFiber(TracingMarkerComponent, pendingProps, key, mode);
  fiber.elementType = REACT_TRACING_MARKER_TYPE;
  fiber.lanes = lanes;
  return fiber;
}

export function createFiberFromHostInstanceForDeletion() {
  const fiber = createFiber(HostComponent, null, null, NoMode);
  fiber.elementType = 'DELETED';
  return fiber;
}

export function createFiberFromDehydratedFragment(dehydratedNode) {
  const fiber = createFiber(DehydratedFragment, null, null, NoMode);
  fiber.stateNode = dehydratedNode;
  return fiber;
}

export function createFiberFromPortal(portal, mode, lanes) {
  const pendingProps = portal.children !== null ? portal.children : [];
  const fiber = createFiber(HostPortal, pendingProps, portal.key, mode);
  fiber.lanes = lanes;
  fiber.stateNode = {
    containerInfo: portal.containerInfo,
    pendingChildren: null, // Used by persistent updates
    implementation: portal.implementation,
  };
  return fiber;
}

// Used for stashing WIP properties to replay failed work in DEV.
export function assignFiberPropertiesInDEV(target, source) {
  if (target === null) {
    // This Fiber's initial properties will always be overwritten.
    // We only use a Fiber to ensure the same hidden class so DEV isn't slow.
    target = createFiber(IndeterminateComponent, null, null, NoMode);
  }

  // This is intentionally written as a list of all properties.
  // We tried to use Object.assign() instead but this is called in
  // the hottest path, and Object.assign() was too slow:
  // https://github.com/facebook/react/issues/12502
  // This code is DEV-only so size is not a concern.

  target.tag = source.tag;
  target.key = source.key;
  target.elementType = source.elementType;
  target.type = source.type;
  target.stateNode = source.stateNode;
  target.return = source.return;
  target.child = source.child;
  target.sibling = source.sibling;
  target.index = source.index;
  target.ref = source.ref;
  target.pendingProps = source.pendingProps;
  target.memoizedProps = source.memoizedProps;
  target.updateQueue = source.updateQueue;
  target.memoizedState = source.memoizedState;
  target.dependencies = source.dependencies;
  target.mode = source.mode;
  target.flags = source.flags;
  target.subtreeFlags = source.subtreeFlags;
  target.deletions = source.deletions;
  target.lanes = source.lanes;
  target.childLanes = source.childLanes;
  target.alternate = source.alternate;
  if (enableProfilerTimer) {
    target.actualDuration = source.actualDuration;
    target.actualStartTime = source.actualStartTime;
    target.selfBaseDuration = source.selfBaseDuration;
    target.treeBaseDuration = source.treeBaseDuration;
  }

  target._debugSource = source._debugSource;
  target._debugOwner = source._debugOwner;
  target._debugNeedsRemount = source._debugNeedsRemount;
  target._debugHookTypes = source._debugHookTypes;
  return target;
}
