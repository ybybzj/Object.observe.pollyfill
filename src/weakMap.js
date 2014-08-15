define(function(){
  var WeakMapShim,
      HIDDEN_PREFIX, counter, getOwnPropertyNameOrg, mascot = {};
  if(typeof WeakMap !== 'undefined'){
    WeakMapShim = WeakMap;
  }else{
    HIDDEN_PREFIX = '__weakmap:' + (Math.random() * 1e9 >>> 0);
    counter = (new Date().getTime()) % 1e9;

    WeakMapShim = function(){
      this.name = HIDDEN_PREFIX + (Math.random() * 1e9 >>> 0) + ((counter++) + '__');
    };

    WeakMapShim.prototype = {
      has: function(key){
        return key && Object.prototype.hasOwnProperty.call(key , this.name);
      },
      get: function(key){
        var value = key && key[this.name];
        return value === mascot ? undefined: value;
      },
      set: function(key, value){
        Object.defineProperty(key, this.name, {
          value: typeof value === 'undefined' ? mascot : value,
          enumerable: false,
          writable: true,
          configurable: true
        });
      },
      'delete': function(key){
        return delete key[this.name];
      }
    };
    getOwnPropertyNameOrg = Object.getOwnPropertyNames;
    Object.defineProperty(Object, 'getOwnPropertyNames', {
      value: function fakeGetOwnPropertyNames(obj) {
        return getOwnPropertyNameOrg(obj).filter(function(name){
          return name.indexOf(HIDDEN_PREFIX) === 0;
        });
      },
      writable: true,
      enumerable: false,
      configurable: true
    });
  }

  return WeakMapShim;
});