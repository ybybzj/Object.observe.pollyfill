// export as Common JS module...
if ( typeof module !== "undefined" && module.exports ) {
        module.exports = index;
}

// ... or as AMD module
else if ( typeof define === "function" && define.amd ) {
        define( function () {
                return index;
        });
}

// ... or as browser global
else {
        utils.oDef(Object, 'observe', index.observe);
        utils.oDef(Object, 'unobserve', index.unobserve);
        utils.oDef(Object, 'getNotifier', index.getNotifier);
        utils.oDef(Array, 'observe', index.ArrayObserve);
        utils.oDef(Array, 'unobserve', index.ArrayUnobserve);

}

}( typeof window !== 'undefined' ? window : this ));