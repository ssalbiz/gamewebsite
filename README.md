Untitled Website For Games
--------------------------

On first install:

* `make getdeps` to get the required node modules.
* `cp config.js.sample config.js` and edit it.
* `cp redis/redis.conf.sample redis/redis.conf` and potentially edit it (maybe change the port?)

Running the server:

* To start redis, `./redis/ctl start`.
* To start redis with a clean db, `./redis/ctl start clean`
* To stop redis, `./redis/ctl stop`
* To run the server, `./index.js`
