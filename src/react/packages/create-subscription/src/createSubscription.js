/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import * as React from 'react';
import invariant from 'shared/invariant';

export function createSubscription(config) {
  const {getCurrentValue, subscribe} = config;

  if (__DEV__) {
    if (typeof getCurrentValue !== 'function') {
      console.error('Subscription must specify a getCurrentValue function');
    }
    if (typeof subscribe !== 'function') {
      console.error('Subscription must specify a subscribe function');
    }
  }

  // Reference: https://gist.github.com/bvaughn/d569177d70b50b58bff69c3c4a5353f3
  class Subscription extends React.Component {
    state = {
      source: this.props.source,
      value:
        this.props.source != null
          ? getCurrentValue(this.props.source)
          : undefined,
    };

    _hasUnmounted = false;
    _unsubscribe = null;

    static getDerivedStateFromProps(nextProps, prevState) {
      if (nextProps.source !== prevState.source) {
        return {
          source: nextProps.source,
          value:
            nextProps.source != null
              ? getCurrentValue(nextProps.source)
              : undefined,
        };
      }

      return null;
    }

    componentDidMount() {
      this.subscribe();
    }

    componentDidUpdate(prevProps, prevState) {
      if (this.state.source !== prevState.source) {
        this.unsubscribe();
        this.subscribe();
      }
    }

    componentWillUnmount() {
      this.unsubscribe();

      // Track mounted to avoid calling setState after unmounting
      // For source like Promises that can't be unsubscribed from.
      this._hasUnmounted = true;
    }

    render() {
      return this.props.children(this.state.value);
    }

    subscribe() {
      const {source} = this.state;
      if (source != null) {
        const callback = (value) => {
          if (this._hasUnmounted) {
            return;
          }

          this.setState((state) => {
            // If the value is the same, skip the unnecessary state update.
            if (value === state.value) {
              return null;
            }

            // If this event belongs to an old or uncommitted data source, ignore it.
            if (source !== state.source) {
              return null;
            }

            return {value};
          });
        };

        // Store the unsubscribe method for later (in case the subscribable prop changes).
        const unsubscribe = subscribe(source, callback);
        invariant(
          typeof unsubscribe === 'function',
          'A subscription must return an unsubscribe function.',
        );

        // It's safe to store unsubscribe on the instance because
        // We only read or write that property during the "commit" phase.
        this._unsubscribe = unsubscribe;

        // External values could change between render and mount,
        // In some cases it may be important to handle this case.
        const value = getCurrentValue(this.props.source);
        if (value !== this.state.value) {
          this.setState({value});
        }
      }
    }

    unsubscribe() {
      if (typeof this._unsubscribe === 'function') {
        this._unsubscribe();
      }
      this._unsubscribe = null;
    }
  }

  return Subscription;
}
