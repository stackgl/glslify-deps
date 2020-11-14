var tokenize = require('glsl-tokenizer/string')
var inherits = require('inherits')
var path     = require('path')
var Depper = require('./depper')

var {
  getImportName,
  extractPreprocessors
} = require('./utils');

module.exports = DepperSync

/**
 * Creates a new instance of glslify-deps. Generally, you'll
 * want to use one instance per bundle.
 *
 * @class
 * @param {String} cwd The root directory of your shader. Defaults to process.cwd()
 */
inherits(DepperSync, Depper)
function DepperSync(opts) {
  if (!(this instanceof DepperSync)) return new DepperSync(opts)
  Depper.call(this, opts)
}

/**
 * Adds a shader file to the graph, including its dependencies
 * which are resolved in this step. Transforms are also applied
 * in the process too, as they may potentially add or remove dependent
 * modules.
 *
 * @param {String} filename The absolute path of this file.
 *
 * Returns an array of dependencies discovered so far as its second argument.
 */
DepperSync.prototype.add = function(filename) {
  var basedir = path.dirname(filename = path.resolve(filename))
  var self    = this
  var exports = []
  var imports = []

  var dep = {
      id: this._i++
    , deps: {}
    , file: filename
    , source: null
    , entry: this._i === 1
  }

  this._deps.push(dep)
  var src = this.readFile(filename)
  var trs = self.getTransformsForFile(filename)
  self.emit('file', filename)
  src = self.applyTransforms(filename, src, trs)
  dep.source = src
  extractPreprocessors(dep.source, imports, exports)

  self._resolveImports(imports, {
    basedir: basedir,
    deps: dep.deps
  })

  return self._deps
}

/**
 * Internal sync method to retrieve dependencies
 * resolving imports using the internal cache
 *
 * @param {string[]} imports
 * @param {object} opts extends options for https://www.npmjs.com/package/resolve
 * @param {object} opts.deps existing dependencies
 * @return {object} resolved dependencies
 */
DepperSync.prototype._resolveImports = function(imports, opts) {
  var self = this
  var deps = opts && opts.deps || {}

  imports.forEach(function (imp) {
    var importName = getImportName(imp)

    var resolved = self.resolve(importName, opts)
    if (self._cache[resolved]) {
      deps[importName] = self._cache[resolved].id
    }
    var i = self._i
    self._cache[resolved] = self.add(resolved)[i]
    deps[importName] = self._cache[resolved].id
  })

  return deps
}
