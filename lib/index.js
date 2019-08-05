const {Model} = require('racer')
const isPlainObject = require('lodash.isplainobject')
const isString = require('lodash.isstring')

Model.prototype.serverQuery = function(collection, queryName, params, options) {
  params = params || {}

  const query = {
    $queryName: queryName,
    $params: params,
  }

  if (options) {
    query['$options'] = isString(options) ? {db: options} : options
  }

  return this.query(collection, query)
}

const QUERIES = {}
let ALLOW_REGULAR_QUERIES = false

const errors = {
  access_denied:
    "403: access denied - only server-queries are allowed, collection: '{0}', query: '{2}'",
  unknown_name:
    "403: there is no such server-query, name: '{1}', collection: '{0}'",
  query_error:
    "403: there is an error inside server query, name: '{1}', collection: '{0}', params: '{3}', error: '{4}'"
}

module.exports = function (backend, allowRegularQueries){
  ALLOW_REGULAR_QUERIES = allowRegularQueries
  backend.use("query", handleQuery)
  backend.addServerQuery = function(collection, queryName, queryFunction) {
    QUERIES[collection + "." + queryName] = queryFunction
  }
}

module.exports.QUERIES = QUERIES

function handleQuery(shareRequest, done) {
  let queryName, queryParams
  const { agent, collection, query, options } = shareRequest

  if (isIdsQuery(query)) return done()
  if (ALLOW_REGULAR_QUERIES && isRegularQuery(query)) return done()

  queryName = query["$queryName"]
  queryParams = query["$params"] || {}

  if (!queryName) return done(err("access_denied"))

  const queryFunction = QUERIES[collection + "." + queryName]

  if (!queryFunction) return done(err("unknown_name"))

  const $options = isString(query["$options"]) ? {db: query["$options"]} : query["$options"]

  if (isPlainObject($options)) {
    for (const key in $options) {
      options[key] = $options[key]
    }
  }

  queryFunction(queryParams, shareRequest, agent).then(function(serverQuery) {
    if (isString(serverQuery)) {
      return done(err("query_error", serverQuery))
    }
    shareRequest.query = serverQuery
    done()
  }).catch(function(error) {
    done(error)
  })

  function err(name, text) {
    return formatString(
      errors[name],
      collection,
      queryName,
      JSON.stringify(query),
      JSON.stringify(queryParams),
      String(text)
    )
  }
}

function isRegularQuery(query) {
  return !query["$queryName"]
}

function isIdsQuery(query) {
  const idQuery = query && query["_id"]
  const inQuery = query && query["_id"] && query["_id"]["$in"]
  return oneField(query) && oneField(idQuery) && isArray(inQuery)
}

function isArray(obj) {
  return Array.isArray(obj)
}

function oneField(obj) {
  if (!(obj instanceof Object)) return false
  return Object.keys(obj).length === 1
}

function formatString(str) {
  const args = arguments
  return str.replace(/{(\d+)}/g, function(match, number) {
    return typeof args[+number + 1] != "undefined" ? args[+number + 1] : match
  })
}
