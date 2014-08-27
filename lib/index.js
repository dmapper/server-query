module.exports = function (racer){

  var Model = racer.Model;

  Model.prototype.serverQuery = function(collection, queryName, params) {
    params = params || {};

    return this.query(collection, {
      $queryName: queryName,
      $params: params
    });
  };

  if (racer.util.isServer){
    var storePlugin = racer.util.serverRequire(module, './storePlugin');
    storePlugin(racer);
  }

};