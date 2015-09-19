var log = require('logger')('droner:lib:dev');
var child_process = require('child_process');
var spawn = child_process.spawn;

var name = function (repo) {
    return repo.substring(repo.lastIndexOf('/') + 1, repo.lastIndexOf('.'));
};

var locals = process.env.LOCAL_REPO;
if(!locals) {
    throw 'LOCAL_REPO env variable needs to be specified';
}
log.info('using locals : %s', locals);

var linkMods = function () {
    var cmd = 'mkdir node_modules;';
    cmd += 'for dir in ' + locals + '/serandules/*; do rm -rf `pwd`/node_modules/$(basename "$dir");';
    cmd += 'ln -s ' + locals + '/serandules/$(basename "$dir") `pwd`/node_modules/$(basename "$dir"); done;\n';
    return cmd;
};

var linkComps = function () {
    var cmd = 'mkdir components;';
    cmd += 'for dir in ' + locals + '/serandomps/*; do mkdir -p `pwd`/components/serandomps/$(basename "$dir");';
    cmd += 'ln -s ' + locals + '/serandomps/$(basename "$dir") `pwd`/components/serandomps/$(basename "$dir")/master; done;';
    cmd += 'ln -s ' + locals + '/components/visionmedia `pwd`/components/visionmedia;';
    cmd += 'ln -s ' + locals + '/components/pillarjs `pwd`/components/pillarjs;';
    cmd += 'ln -s ' + locals + '/components/tj `pwd`/components/tj\n';
    return cmd;
};

/**
 * sets up the development environment for the given repo
 * @param id
 * @param parent
 * @param repo
 * @param done
 */
module.exports.setup = function (id, parent, repo, done) {
    var n = name(repo);
    var dir = parent + '/' + id;
    if (log.debug) {
        log.debug('using local repo %s', locals);
        log.debug('setting up repo %s in %s', n, dir);
    }
    var bash = spawn('bash');
    bash.stdout.pipe(process.stdout);
    bash.stderr.pipe(process.stderr);
    bash.stdin.write('mkdir -p ' + dir + '\n');
    bash.stdin.write('cp -rf ' + locals + '/serandules/' + n + '/* ' + dir + '\n');
    bash.stdin.write('cd ' + dir + '\n');
    //bash.stdin.write('find . -type l | xargs rm\n');
    bash.stdin.write(linkMods() + '\n');
    bash.stdin.write(linkComps() + '\n');
    bash.stdin.write('kill -9 ' + bash.pid + '\n');

    bash.on('close', function (code, signal) {
        if (log.debug) {
            log.debug('setup process exited (%s)', signal || code);
        }
        done(false, dir);
    });
};