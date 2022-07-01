/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import EventEmitter from './events';

const BATCH_DURATION = 100;

// This message specifies the version of the DevTools protocol currently supported by the backend,
// as well as the earliest NPM version (e.g. "4.13.0") that protocol is supported by on the frontend.
// This enables an older frontend to display an upgrade message to users for a newer, unsupported backend.

// Bump protocol version whenever a backwards breaking change is made
// in the messages sent between BackendBridge and FrontendBridge.
// This mapping is embedded in both frontend and backend builds.
//
// The backend protocol will always be the latest entry in the BRIDGE_PROTOCOL array.
//
// When an older frontend connects to a newer backend,
// the backend can send the minNpmVersion and the frontend can display an NPM upgrade prompt.
//
// When a newer frontend connects with an older protocol version,
// the frontend can use the embedded minNpmVersion/maxNpmVersion values to display a downgrade prompt.
export const BRIDGE_PROTOCOL = [
  // This version technically never existed,
  // but a backwards breaking change was added in 4.11,
  // so the safest guess to downgrade the frontend would be to version 4.10.
  {
    version: 0,
    minNpmVersion: '"<4.11.0"',
    maxNpmVersion: '"<4.11.0"',
  },
  // Versions 4.11.x – 4.12.x contained the backwards breaking change,
  // but we didn't add the "fix" of checking the protocol version until 4.13,
  // so we don't recommend downgrading to 4.11 or 4.12.
  {
    version: 1,
    minNpmVersion: '4.13.0',
    maxNpmVersion: '4.21.0',
  },
  // Version 2 adds a StrictMode-enabled and supports-StrictMode bits to add-root operation.
  {
    version: 2,
    minNpmVersion: '4.22.0',
    maxNpmVersion: null,
  },
];

export const currentBridgeProtocol =
  BRIDGE_PROTOCOL[BRIDGE_PROTOCOL.length - 1];

class Bridge extends EventEmitter {
  _isShutdown = false;
  _messageQueue = [];
  _timeoutID = null;
  _wall;
  _wallUnlisten = null;

  constructor(wall) {
    super();

    this._wall = wall;

    this._wallUnlisten =
      wall.listen((message) => {
        if (message && message.event) {
          this.emit(message.event, message.payload);
        }
      }) || null;

    // Temporarily support older standalone front-ends sending commands to newer embedded backends.
    // We do this because React Native embeds the React DevTools backend,
    // but cannot control which version of the frontend users use.
    this.addListener('overrideValueAtPath', this.overrideValueAtPath);
  }

  // Listening directly to the wall isn't advised.
  // It can be used to listen for legacy (v3) messages (since they use a different format).
  get wall() {
    return this._wall;
  }

  send(event, ...payload) {
    if (this._isShutdown) {
      console.warn(
        `Cannot send message "${event}" through a Bridge that has been shutdown.`,
      );
      return;
    }

    // When we receive a message:
    // - we add it to our queue of messages to be sent
    // - if there hasn't been a message recently, we set a timer for 0 ms in
    //   the future, allowing all messages created in the same tick to be sent
    //   together
    // - if there *has* been a message flushed in the last BATCH_DURATION ms
    //   (or we're waiting for our setTimeout-0 to fire), then _timeoutID will
    //   be set, and we'll simply add to the queue and wait for that
    this._messageQueue.push(event, payload);
    if (!this._timeoutID) {
      this._timeoutID = setTimeout(this._flush, 0);
    }
  }

  shutdown() {
    if (this._isShutdown) {
      console.warn('Bridge was already shutdown.');
      return;
    }

    // Queue the shutdown outgoing message for subscribers.
    this.send('shutdown');

    // Mark this bridge as destroyed, i.e. disable its public API.
    this._isShutdown = true;

    // Disable the API inherited from EventEmitter that can add more listeners and send more messages.
    // $FlowFixMe This property is not writable.
    this.addListener = function () {};
    // $FlowFixMe This property is not writable.
    this.emit = function () {};
    // NOTE: There's also EventEmitter API like `on` and `prependListener` that we didn't add to our Flow type of EventEmitter.

    // Unsubscribe this bridge incoming message listeners to be sure, and so they don't have to do that.
    this.removeAllListeners();

    // Stop accepting and emitting incoming messages from the wall.
    const wallUnlisten = this._wallUnlisten;
    if (wallUnlisten) {
      wallUnlisten();
    }

    // Synchronously flush all queued outgoing messages.
    // At this step the subscribers' code may run in this call stack.
    do {
      this._flush();
    } while (this._messageQueue.length);

    // Make sure once again that there is no dangling timer.
    if (this._timeoutID !== null) {
      clearTimeout(this._timeoutID);
      this._timeoutID = null;
    }
  }

  _flush = () => {
    // This method is used after the bridge is marked as destroyed in shutdown sequence,
    // so we do not bail out if the bridge marked as destroyed.
    // It is a private method that the bridge ensures is only called at the right times.

    if (this._timeoutID !== null) {
      clearTimeout(this._timeoutID);
      this._timeoutID = null;
    }

    if (this._messageQueue.length) {
      for (let i = 0; i < this._messageQueue.length; i += 2) {
        this._wall.send(this._messageQueue[i], ...this._messageQueue[i + 1]);
      }
      this._messageQueue.length = 0;

      // Check again for queued messages in BATCH_DURATION ms. This will keep
      // flushing in a loop as long as messages continue to be added. Once no
      // more are, the timer expires.
      this._timeoutID = setTimeout(this._flush, BATCH_DURATION);
    }
  };

  // Temporarily support older standalone backends by forwarding "overrideValueAtPath" commands
  // to the older message types they may be listening to.
  overrideValueAtPath = ({id, path, rendererID, type, value}) => {
    switch (type) {
      case 'context':
        this.send('overrideContext', {
          id,
          path,
          rendererID,
          wasForwarded: true,
          value,
        });
        break;
      case 'hooks':
        this.send('overrideHookState', {
          id,
          path,
          rendererID,
          wasForwarded: true,
          value,
        });
        break;
      case 'props':
        this.send('overrideProps', {
          id,
          path,
          rendererID,
          wasForwarded: true,
          value,
        });
        break;
      case 'state':
        this.send('overrideState', {
          id,
          path,
          rendererID,
          wasForwarded: true,
          value,
        });
        break;
    }
  };
}

export default Bridge;
