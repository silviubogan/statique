johnnys-node-static
===================

Simplified version of node-static module.

![](https://nodei.co/npm/statique.png)

## Documentation

<table>
  <thead>
    <tr>
      <th>Function</th>
      <th>Description</th>
      <th>Example</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>server</code></td>
      <td>Sets the static server.</td>
      <td>See the example below</td>
    </tr>
    <tr>
      <td><code>setRoutes</code></td>
      <td>Sets the routes object.</td>
      <td>See the example below</td>
    </tr>
    <tr>
      <td><code>getRoute</code></td>
      <td>Get a route providing an url</td>
      <td>See the example below</td>
    </tr>
    <tr>
      <td><code>exists</code></td>
      <td>Verifies if the route does exist and returns <code>true</code> or <code>false</code>.</td>
      <td>See the example below</td>
    </tr>
    <tr>
      <td><code>readFile</code></td>
      <td>Reads a file from root providing the file path</td>
      <td></td>
    </tr>
    <tr>
      <td><code>sendRes</code></td>
      <td>Serves the file specified in routes object.</td>
      <td></td>
    </tr>
  </tbody>
</table>

## Example

File structure:
```
root/
├── index.js
└── public/
    └── html/
        ├── index.html
        ├── test1.html
        └── test2.html
```

For the file structure above, the following routes would serve files for each url:

```JSON
{
    "/":       "/html/index.html"
  , "/test1/": "/html/test1.html"
  , "/test2/": "/html/test2.html"
}
```

This is the content for `index.js` file.

```js
// require statique
var Statique = require("statique")

    // require http
  , http = require('http')
  ;

// set static server: public folder
Statique.server({root: __dirname + "/public"});

// set routes
Statique.setRoutes({
    "/":       "/html/index.html"
  , "/test1/": "/html/test1.html"
  , "/test2/": "/html/test2.html"
});

// create http server
http.createServer(function(req, res) {

    // safe serve
    if (Statique.exists(req, res)) {

        // serve file
        Statique.sendRes (req, res, function (err) {

            // not found error
            if (err.code === "ENOENT") {

                // write head
                res.writeHead(404, {"Content-Type": "text/html"});

                // send response
                res.end("404 - Not found.");

                // return
                return;
            }

            // other error
            res.end(JSON.stringify(err));
        });

        // return
        return;
    }

    // if the route doesn't exist, it's a 404!
    res.end("404 - Not found");

}).listen(8000);

// output
console.log("Listening on 8000.");
```

## Test

```
npm install statique
npm test # or ./test.sh
```

## Changelog

### v0.2.0
 - Deprecated `johnnys-node-static` module
 - Refactored the code
 - Removed `node-static` as dependency

### v0.1.3
 - Fixed route setting.

### v0.1.2
 - Fixed the bug related to the status code.

### v0.1.1
 - Added `serveAll` method.

### v0.1.0
 - Initial release.

## Licence
See LICENSE file.
