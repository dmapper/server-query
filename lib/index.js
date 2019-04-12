module.exports = function (racer, whitelist){

  const Model = racer.Model

  Model.prototype.serverQuery = function(collection, queryName, params) {
    params = params || {}

    return this.query(collection, {
      $queryName: queryName,
      $params: params
    })
  }

  if (racer.util.isServer){
    const storePlugin = racer.util.serverRequire(module, './storePlugin')
    storePlugin(racer, whitelist)
  }
}
