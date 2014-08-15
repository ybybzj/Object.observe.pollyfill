define(['./weakMap'], function(WeakMap) {
  return {
    observerCallbacks: [],
    notifierMap: new WeakMap(), // store corresponding notifier to an object
    changeObserversMap: new WeakMap(),
    activeChangesMap: new WeakMap(),
    pendingChangesMap: new WeakMap(), // store reference to a list of pending changeRecords in observer callback.
    attachedNotifierCountMap: new WeakMap(), // store a count of associated notifier to a function
    watchedObjectMap: new WeakMap(), // store a object's watched properties and values to its notifier
  };
});