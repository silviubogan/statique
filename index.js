// Dependencies
var Url = require ("url")
  , Fs  = require ("fs")
  , Path = require("path")
  , Events = require("events")
  ;

// MIME types
const MIME_TYPES = {
    "html": "text/html"
  , "jpeg": "image/jpeg"
  , "jpg":  "image/jpeg"
  , "png":  "image/png"
  , "js":   "text/javascript"
  , "css":  "text/css"
};

/**
 * Le Statique
 * -----------
 * A node-static minimalist alternative.
 * Licensed under the MIT license. See the LICENSE file.
 *
 *
 * Documentation can be found in README and on GitHub:
 * http://github.com/IonicaBizau/node-statique
 */
var Statique = module.exports = {};

/**
 * Sets the root of the public folder.
 *
 * @param {Object} options an object containing the following fields:
 *  - root: string representing the absolute path to the public folder.
 *  - cache: the number of seconds of cache
 * @return {Object} Statique object
 */
Statique.server = function (options) {
    if (typeof options === "string") {
        options = {
            root: options
        }
    }
    if (options.root.slice (-1) !== "/") {
        options.root += "/";
    }

    Statique._root = options.root;
    Statique._cache = options.cache || 3600;

    return Statique;
};

/**
 * Sets the routes of the website.
 *
 * @param {Object} routes an object containing fields and values in the
 * following format:
 *  {
 *      "/":       "/html/index.html"
 *    , "/foo/":   { url: "/html/foo.html" }
 *    , "/another-foo": "/html/myfoo.html"
 *    , "/some/api": function (req, res) {
 *          res.end("Hello World!");
 *      }
 *  }
 *
 *  See test file for more examples.
 * @return {Object} Statique object
 */
Statique.setRoutes = function (routes) {
    Statique._routes = routes;
    return Statique;
};

/**
 * Gets the route by providing an @url
 *
 * @param {String} url a string representing the url of the page that
 * must be served
 * @return {Object} the route object that contains the following fields:
 *  - url
 *  - handler
 */
Statique.getRoute = function (url) {

    var route = {};

    // remove slash at the end of the string
    if (url.slice (-1) === "/") {
        url = url.substring (0, url.length - 1);
    }

    // get the route that was set in the configuration
    var routeObj = Statique._routes[url] || Statique._routes[url + "/"] || null;
    route.url = (routeObj || {}).url || routeObj;
    route.reqUrl = route.url || url;

    // handle url as function
    if (typeof route.url === "function") {
        route.handler = route.url;
        delete route.url;
    }

    if (routeObj && typeof routeObj.handler === "function") {
        routeObj.handler = routeObj.handler;
    }

    return route;
};

/**
 * Checks if a route exists.
 *
 * @param {Object} req the request object
 * @return {Boolean} true, if the route was found, else false
 */
Statique.exists = function (req) {
    return Boolean (Statique.getRoute(Url.parse(req.url).pathname));
};

/**
 * Reads the file and callbacks the content.
 *
 * @param {String} file the relative path to the file
 * @param {Function} callback the callback function that will be called with an
 * err (first argument) and the content of the file (second argument)
 * @return {Buffer} the raw buffer
 */
Statique.readFile = function (file, callback) {
    return Fs.readFile (Statique._root + file, function (err, buffer) {
        if (err) { return callback (err); }
        callback (null, buffer.toString())
    });
};

/**
 * Serves the HTML file according by providing the @req and @res parameters
 *
 * @param {Object} req the request object
 * @param {Object} res the response object
 * @return {Object} the Statique instance
 */
Statique.serve = function (req, res) {
    return Statique.serveRoute(undefined, req, res);
};

/**
 * This function is used for sending custom status messages and content
 * If the @content parameter is not provided or is not a string, the response
 * will not be ended. The status code and the headers will be set
 *
 * @param {Object} res the response object
 * @param {Number} statusCode the response status code
 * @param {String} mimeType the response mime type
 * @param {String} content the content that you want to send via response
 * @param {Object} otherHeaders Aditional headers that will be merged with
 * the basic ones. They have greater priority than basic headers.
 * @return {Object} the Statique instance
 */
Statique.sendRes = function (res, statusCode, mimeType, content, otherHeaders) {

    var headers = {
        "Content-Type": mimeType || "plain/text"
      , "Server": "Statique Server"
    };

    for (var h in otherHeaders) {
        headers[h] = otherHeaders[h] || headers[h];
    }

    res.writeHead(statusCode, headers);

    if (typeof content === "string") {
        res.end (content);
    }

    return Statique;
};

/**
 * serveRoute
 * Serves a provided route.
 *
 * @name serveRoute
 * @function
 * @param {String} route The route that should be served
 * @param {Object} req The request object
 * @param {Object} res The response object
 * @return {Object} The Statique instance
 */
Statique.serveRoute = function (route, req, res) {

    var parsedUrl = Url.parse (req.url)
      , routeToServe = Statique.getRoute(
            route || parsedUrl.pathname
        ) || parsedUrl.pathname
      , stats = null
      , fileName = Statique._root + (routeToServe.url || routeToServe.reqUrl)
      , method = req.method.toLowerCase()
      , form = {
            data: ""
          , error: ""
          , _emitter: new Events.EventEmitter()
        }
      ;

    req.on("data", function (chunk) {
        form.data += chunk;
    });

    req.on("error", function (err) {
        form.error += err;
    });

    req.on("end", function () {
        form._emitter.emit("done", form);
    });

    if (routeToServe.url && typeof routeToServe.url[method] === "function") {
        routeToServe.url[method](req, res, form._emitter);
        return Statique;
    }

    if (typeof routeToServe.handler === "function") {
        routeToServe.handler(req, res, form._emitter);
        return Statique;
    }

    try {
        stats = Fs.lstatSync (fileName);
    } catch (e) {
        Statique.sendRes (res, 404, "html", "404 - Not found");
        return Statique;
    }

    // no file, no fun
    if (!stats.isFile()) { return Statique; }

    // cache stuff
    var mtime = Date.parse(stats.mtime)
      , clientETag = req.headers['if-none-match']
      , clientMTime = Date.parse(req.headers['if-modified-since'])
      , contentType = MIME_TYPES[
            Path.extname(routeToServe.reqUrl).substring(1)
        ]
      , headers = {
            "Etag": JSON.stringify([stats.ino, stats.size, mtime].join('-'))
          , "Date": (new Date()).toUTCString()
          , "Last-Modified": (new Date(stats.mtime)).toUTCString()
          , "Content-Type": contentType
          , "Content-Length": stats.size
        }
      ;

    // Conditional GET
    // If the "If-Modified-Since" or "If-None-Match" headers
    // match the conditions, send a 304 Not Modified.
    // Thanks! https://github.com/cloudhead/node-static/blob/4858a8212c580fa831b9614825275f38791df579/lib/node-static.js#L250
    if ((clientMTime  || clientETag) &&
        (!clientETag  || clientETag === headers['Etag']) &&
        (!clientMTime || clientMTime >= mtime)) {
        // 304 response should not contain entity headers
        ['Content-Encoding',
         'Content-Language',
         'Content-Length',
         'Content-Location',
         'Content-MD5',
         'Content-Range',
         'Content-Type',
         'Expires',
         'Last-Modified'].forEach(function(entityHeader) {
            delete headers[entityHeader];
        });
        Statique.sendRes(res, 304, contentType, null, headers);
        res.end();
        return Statique;
    }

    // Set cache-control  header
    headers["cache-control"] = "max-age=" + Statique._cache;

    // file should cached
    Statique.sendRes(res, 200, contentType, null, headers)

    var fileStream = Fs.createReadStream(fileName);
    fileStream.pipe(res);

    return Statique;
};
