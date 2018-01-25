#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

/*global require, process, module*/

require("systemjs")
var parseArgs = require('minimist'),
    lvm = require('lively.modules'),
    path = require('path'),
    defaultRootDirectory = process.cwd(),
    isMain = !module.parent,
    baseURL = "file://" + path.resolve(path.join(__dirname, ".."));
const util = require('util');
const winston = require('winston');

if (isMain) {
  var args = parseArgs(process.argv.slice(2));
  if (!args.userdb)
    throw new Error("Need --userdb, a path to the user database!")

  Promise.resolve()
    .then(() => setupSystem())
    .then(() => lively.modules.registerPackage(baseURL))
    .then(() => lvm.module(baseURL + "/server/server.js").load())
    .then(serverMod => serverMod.start(args))
    .catch(err => {
      console.error(`Error starting server: ${err.stack}`);
      process.exit(1);
    });
}


function setupSystem() {
  setupLogger();

  var livelySystem = lively.modules.getSystem("lively-for-auth-server", {baseURL});
  lively.modules.changeSystem(livelySystem, true);
  var registry = livelySystem["__lively.modules__packageRegistry"] = new lvm.PackageRegistry(livelySystem);
  if (process.env.FLATN_PACKAGE_COLLECTION_DIRS)
    registry.packageBaseDirs = process.env.FLATN_PACKAGE_COLLECTION_DIRS.split(":").map(ea => lively.resources.resource(`file://${ea}`));
  if (process.env.FLATN_PACKAGE_DIRS)
    registry.packageDirs = process.env.FLATN_PACKAGE_DIRS.split(":").map(ea => lively.resources.resource(`file://${ea}`));
  if (process.env.FLATN_DEV_PACKAGE_DIRS)
    registry.devPackageDirs = process.env.FLATN_DEV_PACKAGE_DIRS.split(":").map(ea => lively.resources.resource(`file://${ea}`));
  return registry.update();
}

function formatArgs(args){
  return [util.format.apply(util.format, Array.prototype.slice.call(args))];
}

function setupLogger() {
  let logger = new winston.Logger();
  logger.add(winston.transports.Console, {colorize: true, timestamp: true});
  console.livelyLogger = logger;
  console.log = function() { logger.info.apply(logger, formatArgs(arguments)); };
  console.info = function() { logger.info.apply(logger, formatArgs(arguments)); };
  console.warn = function() { logger.warn.apply(logger, formatArgs(arguments)); };
  console.error = function() { logger.error.apply(logger, formatArgs(arguments)); };
  console.debug = function() { logger.debug.apply(logger, formatArgs(arguments)); };
  return logger;
}
