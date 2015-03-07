var log = require('logger')('hubber:lib:drone');
var child_process = require('child_process');
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

var Drone = function (id, main, env) {
    this.id = id;
    this.main = main;
    this.env = env;
    this.child = null;
    this.status = 'fresh';
};
module.exports = Drone;

Drone.prototype.start = function (done) {
    var that = this;
    var child = fork(this.main, {
        cwd: parent(this.main),
        env: this.env
    });
    var close = function (code, signal) {
        log.error('error starting drone %s (%s)', that.id, signal || code);
        if (log.debug) {
            summary(that);
        }
        done(true);
    };
    var error = function (code, signal) {
        log.error('error starting drone %s (%s)', that.id, signal || code);
        if (log.debug) {
            summary(that);
        }
        done(true);
    };
    child.on('close', close);
    child.on('error', error);
    this.child = child;
    var procevent = require('procevent')(child);
    procevent.once('started', function (address) {
        procevent.destroy();
        that.status = 'started';
        child.removeListener('close', close);
        child.removeListener('error', error);
        done(false, child, address);
    });
};

Drone.prototype.stop = function (done) {
    var that = this;
    this.child.once('close', function (code, signal) {
        if (log.debug) {
            summary(that);
        }
        done();
    });
    this.child.once('error', function () {
        log.error('error stopping drone %s', that.id);
        if (log.debug) {
            summary(that);
        }
        done(true);
    });
    this.child.kill('SIGKILL');
};

Drone.prototype.restart = function (done) {
    var that = this;
    this.stop(function (err) {
        if (err) {
            return done(err);
        }
        that.start(done);
    });
};

