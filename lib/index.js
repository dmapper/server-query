const {Model} = require('racer')

Model.prototype.serverQuery = function(collection, queryName, params) {
  params = params || {}

  return this.query(collection, {
    $queryName: queryName,
    $params: params
  })
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

function handleQuery(shareRequest, done) {
   handleQueryAsync(shareRequest)
    .then((res) => done(res))
    .catch((err) => done(err))
}

async function handleQueryAsync(shareRequest) {
  let queryName, queryParams, serverQuery
  const { agent, collection, query } = shareRequest

  if (isIdsQuery(query)) return
  if (ALLOW_REGULAR_QUERIES && isRegularQuery(query)) return

  queryName = query["$queryName"]
  queryParams = query["$params"] || {}

  if (!queryName) return err("access_denied")

  const queryFunction = QUERIES[collection + "." + queryName]

  if (!queryFunction) return err("unknown_name")

  try {
    serverQuery = await queryFunction(queryParams, shareRequest, agent)
  } catch (e) {
    return err("query_error", e)
  }

  if (isString(serverQuery)) return err("query_error", serverQuery)

  shareRequest.query = serverQuery

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

function isString(obj) {
  return typeof obj === "string" || obj instanceof String
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

