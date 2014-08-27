## server-query

Derby/racer server-query plugin. It allows only server-defined queries and denies arbitrary client queries.

### install

With [npm](https://npmjs.org) do:

```
npm install server-query
```

### usage

In our derby-app:

```js
derby.use(require('server-query'));
```

On the server:
```js

// Add server queries  

derby.on('serverQuery', function(store){ // Or racer.on

  // function addServerQuery accept
  // 'collection' - collection name
  // 'queryName'  - name of query
  // 'cb' - function that accept 'params' and 'session'
  // and return a query-object or error-string
  
  store.addServerQuery('items', 'main', function(params, session){
    return {type: 'public'};
  });
  
  store.addServerQuery('items', 'myItems', function(params, session){
    return {ownerId: session.userId};
  });
  
  store.addServerQuery('items', 'byType', function(params, session){
    
    // ++++++++++++++++++++++++++++
    // Should check params here!!!!
    // it's a security issue
    // ++++++++++++++++++++++++++++
    
    return {type: params.type};
  });
}

```

Using queries on the client:

```js
  var type = params.type;
  
  // function serverQuery accepts 3 arguments:
  // 'collection' - collection name (should match one from addServerQuery)
  // 'queryName' - name of query (should match one from addServerQuery)
  // 'params' - object with query-params
  
  var query = model.serverQuery('items', 'byType', {
    type: type
  });

  model.subscribe(query, function(){
    page.render('home');
  });
```

What is still allowed:
```js

// You still can use path-query
var query = model.server('items', '_page.itemIds');

model.subscribe(query, function(){
  page.render('home');
});

// one-item fetch/subscriptions also aren't dennied
var itemId = params.itemId

var item = model.at('items.'+itemId);

model.subscribe(item,  function(){
  //...
});

// Or just
model.subscribe('items.' + itemId,  function(){
  //...
});

// But

model.subscribe('items',  function(err){
  // Will get Error here!!!!!
});
```

## MIT License
Copyright (c) 2014 by Artur Zayats

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
