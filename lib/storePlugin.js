var QUERIES = {},
    COLLECTIONS_WHITELIST = [];

var errors = {
  'access_denied': "403: access denied - only server-queries are allowed, collection: '{0}', query: '{2}'",
  'unknown_name': "403: there is no such server-query, name: '{1}', collection: '{0}'",
  'query_error': "403: there is an error inside server query, name: '{1}', collection: '{0}', params: '{3}', error: '{4}'"
};

var once;

module.exports = function (racer, whitelist){

  if (whitelist && Array.isArray(whitelist)) {
    COLLECTIONS_WHITELIST = COLLECTIONS_WHITELIST.concat(whitelist);
  }
  
  if (once) return;

  racer.on('store', function(store){
    
    store.shareClient.use('query', handleQuery);

    store.addServerQuery = function(collection, queryName, queryFunction){
      QUERIES[collection + '.' + queryName] = queryFunction;
    };
    
    racer.emit('serverQuery', store);

  });

  once = true;

};

function handleQuery(shareRequest, next) {
  var query, collection, session, queryName, queryParams, serverQuery;

  query       = shareRequest.query;
  collection  = shareRequest.collection;

  session = shareRequest.agent.connectSession;

  if (isIdsQuery(query)) return next();
  if (COLLECTIONS_WHITELIST.indexOf(collection) >= 0) return next();

  queryName = query['$queryName'];
  queryParams = query['$params'] || {};

  if (!queryName) return next(err('access_denied'));

  var queryFunction = QUERIES[collection + '.' + queryName];

  if (!queryFunction) return next(err('unknown_name'));

  try{
    serverQuery = queryFunction(queryParams, session);
  } catch(e){
    return next(err('query_error', e));
  }

  if (isString(serverQuery)) return next(err('query_error', serverQuery));

  shareRequest.query = serverQuery;

  return next();

  function err(name, text){

    return formatString(
      errors[name],
      collection,
      queryName,
      JSON.stringify(query),
      JSON.stringify(queryParams),
      String(text)
    );
  }
}

function isIdsQuery(query){
  var idQuery = query && query['_id'];
  var inQuery = query && query['_id'] && query['_id']['$in'];

  return oneField(query) && oneField(idQuery) && isArray(inQuery);
}


function isArray(obj){
  return Array.isArray(obj);
}

function isString(obj){
  return typeof obj === 'string' || obj instanceof String;
}

function oneField(obj){
  if (!(obj instanceof Object)) return false;
  return Object.keys(obj).length === 1;
}

function formatString(str) {
  var args = arguments;
  return str.replace(/{(\d+)}/g, function(match, number) {
    return typeof args[+number+1] != 'undefined' ? args[+number+1]: match;
  });
}
