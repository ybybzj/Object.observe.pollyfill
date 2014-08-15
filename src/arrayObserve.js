define(['./observe', './utils'], function(OB, Utils) {
  var mutationFns = ['splice', 'pop', 'shift', 'unshift', 'push'],
    wrappedMutationFn = Object.create(Array.prototype);
  mutationFns.forEach(wrapMutation);

  function ArrayObserve(array, observer) {
    argumentMutationFns(array);
    return OB.observe(array, observer, ['update', 'add', 'delete', 'splice']);
  }

  function ArrayUnobserve(array, observer) {
    restoreMutationFn(array);
    return OB.unobserve(array, observer);
  }

  function argumentMutationFns(array) {
    if (!array.__mutateWatched__) {
      Utils.oDef(array, '__mutateWatched__', true, 'hidden');
      mutationFns.forEach(function(fnName) {
        Utils.oDef(array, fnName, wrappedMutationFn[fnName], 'hidden');
      });
    }
    return array;
  }

  function restoreMutationFn(array) {
    if (array.__mutateWatched__) {
      mutationFns.forEach(function(fnName) {
        delete array[fnName];
      });
    }
    delete array.__mutateWatched__;
    return array;
  }

  function wrapMutation(fnName) {
    Utils.oDef(wrappedMutationFn, fnName, function() {
      var original = Array.prototype[fnName],
        arrObj = this,
        notifier = OB.getNotifier(this),
        arrObjLen = arrObj.length,
        args, argsLen, index, inserted, removed, result;
      args = Array.prototype.slice.call(arguments);
      argsLen = args.length;
      inserted = [];
      removed = [];
      notifier.performChange('splice', function() {
        var spliceIdx;
        switch (fnName) {
          case 'push':
            index = arrObjLen;
            inserted = range(arrObjLen, arrObjLen + argsLen - 1);
            break;
          case 'unshift':
            index = 0;
            inserted = range(0, argsLen - 1);
            break;
          case 'pop':
            index = arrObjLen - 1;
            removed = [arrObjLen - 1];
            break;
          case 'shift':
            index = 0;
            removed = [0];
            break;
          case 'splice':
            spliceIdx = args[0] < 0 ? arrObjLen + args[0] : args[0];
            spliceIdx = spliceIdx < 0 ? 0 : spliceIdx;
            index = spliceIdx;
            if (argsLen === 1) {
              removed = range(spliceIdx, arrObjLen - 1);
            } else if (argsLen === 2) {
              if (args[1] > 0) {
                removed = range(spliceIdx, spliceIdx + args[1] - 1);
              }
            } else {
              if (args[1] > 0) {
                removed = range(spliceIdx, spliceIdx + args[1] - 1);
              }
              inserted = range(spliceIdx, spliceIdx + args.slice(2).length - 1);
            }
        }
        result = original.apply(arrObj, args);
        if (arrObj.length !== arrObjLen) {
          return {
            method: fnName,
            inserted: inserted,
            removed: removed,
            index: index
          };
        }else{
          return false;
        }
      });
      return result;
    });
  }

  function range(start, end) {
    var i, _i, _results;
    _results = [];
    for (i = _i = start; start <= end ? _i <= end : _i >= end; i = start <= end ? ++_i : --_i) {
      _results.push(i);
    }
    return _results;
  };
  return {
    observe: ArrayObserve,
    unobserve: ArrayUnobserve
  };
});