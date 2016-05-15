CartoDB Redirector
==================

Purpose
-------

For using Cartodb maps in apps which accept custom tile sources in the format of `/{z}/{x}/{y}.png`. 

Overview
--------

A server which responds with 302 redirects to the cartob tiles of a named map. The server will initiate the named map every 10 mins.

Requirements
------------

A namedmap's template id. To generate a named map, check out [CartoDB's docs](http://docs.cartodb.com/tutorials/named_maps/) or [CartoDB's node module](https://github.com/CartoDB/cartodb-nodejs).

Usage
-----

```Bash
API_KEY="your api key" \
TEMPLATE_ID="template id" \
USERNAME="your cartodb username" \
PORT=3333 \
node app.server.js
```
