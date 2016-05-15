// CartoDB Proxy
// =============
//
// Overview
// --------
//
// Creates a proxy tile server to access a named map on cartdo.
// Named maps need to be created before using this app to get the
// template id. This all will periodically re-generate an instance
// of the namesmap

// Modules
// =======

var CartoDB = require( 'cartodb' );
var util = require( 'util' );
var http = require( 'http' );
var W = require( 'w-js' );
var url = require( 'url' );

// Config
// ======

var API_KEY = process.env.API_KEY;
var TEMPLATE_ID = process.env.TEMPLATE_ID;
var USERNAME = process.env.USERNAME;
var PORT = process.env.PORT;
var initiateMapEvery = 10 * 60 * 1000; // 10 mins

if ( W.isUndefined( API_KEY ) ) {
    console.error( "Missing API_KEY env" );
    return;
}

if ( W.isUndefined( TEMPLATE_ID ) ) {
    console.error( "Missing TEMPLATE_ID env" );
    return;
}

if ( W.isUndefined( USERNAME ) ) {
    console.error( "Missing USERNAME env" );
    return;
}

if ( W.isUndefined( PORT ) ) {
    console.error( "Missing PORT env" );
    return;
}

// Cartodb Middleware
// ==================

var namedMaps = new CartoDB.Maps.Named({
    user: USERNAME,
    api_key: API_KEY
});

var tileSystem = (function () {

    // State
    // -----

    var Status = {
        REQUESTING : "Requesting",
        OK : "OK",
        ERRORED : "Errored"
    };
    
    var currentStatus = Status.OK;
    var queue = [];
    var lastUpdate = Number.MIN_VALUE;
    
    // CartoDB
    // -------
    var namedMaps = new CartoDB.Maps.Named({
        user: USERNAME,
        api_key: API_KEY
    });
    var layergroupid = "";
    var cdn = "";

    // Proxy
    // -----
    function redirect ( req, res ) {

        var urlTarget = 'http://' + cdn + '/' + USERNAME + '/api/v1/map/' + layergroupid + req.url;
        
        res.writeHead(302, {
            'Location': urlTarget
        });
        res.end();
    }

    return {
        middleware: function ( req, res ) {

            var shouldReinit = false;

            if ( currentStatus == Status.OK ) {
                if ( Date.now() - lastUpdate > initiateMapEvery ) {
                    currentStatus = Status.REQUESTING;
                    shouldReinit = true;
                    debug( '-- will reinit ' );
                }
            }

            if ( currentStatus == Status.REQUESTING  || currentStatus == Status.ERRORED ) {
                queue.push( [ req, res ] );
                debug( '-- added to queue ' );
            }

            if ( currentStatus == Status.OK ) {
                debug( '-- proxing ' );
                return redirect( req, res );
            }

            if ( shouldReinit || currentStatus == Status.ERRORED ) {
                currentStatus = Status.REQUESTING;

                debug( '-- initiasing ' );
                
                namedMaps.instantiate({
                    template_id: TEMPLATE_ID
                }).on( 'done', function( res ) {

                    debug( '--- initited ' );

                    var wasError = false;

                    try  {
                        layergroupid = res.layergroupid;
                        cdn = res.cdn_url.http;
                    } catch ( err ) {
                        wasError = true;
                    }

                    if ( wasError || W.isUndefined( layergroupid ) || W.isUndefined( cdn ) ) {
                        currentStatus = Status.ERRORED;
                        console.error( "Failed to capture layergroupid and/or cdb from cartodb response to init map" );
                        console.error( "Error was:", util.inspect( res, { showHidden: false, depth: null, colors: true } )  );
                        throw new Error( "Failed to parse response" );
                    }

                    
                    currentStatus = Status.OK;

                    queue.forEach( function ( args ) {
                        debug( '---- calling queued item ' );
                        redirect( args[0], args[1] );
                    });

                    queue = [];
                    
                });
            }

        }
    };

}());

// Server
// ======

http.createServer( function( req, res ) {
    debug( '- http recived req' );
    tileSystem.middleware( req, res );
}).listen( PORT );


function debug( msg ) {
    return; 
    console.log( msg );
}
