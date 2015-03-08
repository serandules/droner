var log = require('logger')('droner:lib:drone');
var child_process = require('child_process');
var rimraf = require('rimraf');
var fork = child_process.fork;

var summary = function (drone) {
    log.debug({
        id: drone.id,
        main: drone.main
    });
};

var parent = function (path) {
    return path.substring(0, path.lastIndexOf('/'));
};

var Drone = function (id, repo, parent, main, env) {
    this.id = id;
    this.repo = repo;
    this.main = main;
    this.parent = parent;
    this.env = env;
    this.child = null;
    this.status = 'fresh';
};
module.exports = Drone;

Drone.prototype.start = function (done) {
    var drone = this;
    var child = fork(drone.parent + '/' + drone.main, {
        cwd: drone.parent,
        env: drone.env
    });
    var close = function (code, signal) {
        log.error('error starting drone %s (%s)', drone.id, signal || code);
        if (log.debug) {
            summary(drone);
        }
        done(true);
    };
    var error = function (code, signal) {
        log.error('error starting drone %s (%s)', drone.id, signal || code);
        if (log.debug) {
            summary(drone);
        }
        done(true);
    };
    child.on('close', close);
    child.on('error', error);
    drone.child = child;
    var procevent = require('procevent')(child);
    procevent.once('started', function (address) {
        procevent.destroy();
        drone.status = 'started';
        child.removeListener('close', close);
        child.removeListener('error', error);
        done(false, child, address);
    });
};

Drone.prototype.stop = function (done) {
    var drone = this;
    drone.child.once('close', function (code, signal) {
        if (log.debug) {
            summary(drone);
        }
        rimraf.sync(drone.parent);
        done();
    });
    drone.child.once('error', function () {
        log.error('error stopping drone %s', drone.id);
        if (log.debug) {
            summary(drone);
        }
        rimraf.sync(drone.parent);
        done(true);
    });
    drone.child.kill('SIGKILL');
};

