var log = require('logger')('droner:lib:index');
var async = require('async');

var Drone = require('./drone');

var prod = process.env.PRODUCTION;
if (!prod) {
    log.info('PRODUCTION mode is not set, running on DEVELOPMENT mode');
}

var mod = prod ? require('./prod') : require('./dev');

var parent = process.env.DRONES_DIR;
if (!parent) {
    throw 'DRONES_DIR env variable needs to be specified';
}

var drones = {};

var startQ = async.queue(function (job, next) {
    var id = job.id;
    var repo = job.repo;
    var main = job.main;
    var done = job.done;
    mod.setup(id, parent, repo, function (err, dir) {
        if (err) {
            log.error('error starting : %s', repo);
            done(err);
            return next(err);
        }
        if (log.debug) {
            log.debug('creating drone for main %s', dir + '/' + main);
        }
        var drone = new Drone(id, repo, dir, main, process.env);
        drone.start(function (err, process, address) {
            done(err, process, address);
            next(err);
        });
        drones[id] = drone;
    });
}, 1);

var stopQ = async.queue(function (job, next) {
    var id = job.id;
    var drone = job.drone;
    var done = job.done;
    drone.stop(function (err) {
        if (err) {
            done(err);
            return next(err);
        }
        delete drones[id];
        done();
        next();
    });
});

var start = function (id, repo, main, done) {
    if (log.debug) {
        log.debug('starting repo %s in %s', repo, parent);
    }
    if (!done) {
        done = main;
        main = 'index.js';
    }
    startQ.push({
        id: id,
        repo: repo,
        main: main,
        done: done
    });
};

var stop = function (id, done) {
    var drone = drones[id];
    if (!drone) {
        log.error('drone %s cannot be found', id);
        return done(true);
    }
    stopQ.push({
        id: id,
        drone: drone,
        done: done
    });
};

var restart = function (id, done) {
    var drone = drones[id];
    if (!drone) {
        log.error('drone %s cannot be found', id);
        return done(true);
    }
    stop(id, function (err) {
        start(id, drone.repo, drone.main, function (err, process, address) {
            log.debug('drone restarted id:%s', id);
            done(err, process, address);
        });
    });
};

module.exports.start = start;

module.exports.stop = stop;

module.exports.restart = restart;