/*

NanoRoute.js: a minimalist monadic router/interpreter

Extends NanoStream to include routing messages to specific observer, as well as provide multple reducer functions. NanoRoute is an implementation of the free monad that provides a method of creating a domain-specific language with abstract syntax tree (AST) having one or more interpreters that execute the AST.

Monad type: free

*/

import NanoRoute from './NanoStream';

// initialize
NanoRoute.prototype.init = function (newModel) {
  this.model = newModel;
  Object.freeze(this.model);
  this.routeDestination = {};
  this.reduceRouteProcessor = {};
  return this;
}

NanoRoute.prototype.addRoute = function (address, route) {
  this.routeDestination[address] = route;
  return this;
}

NanoRoute.prototype.removeRoute = function (address) {
  if (this.routeDestination[address] === undefined) return;
  delete this.routeDestination[address];
  return this;
}

NanoRoute.prototype.reduceRoute = function (address, reducer) {
  this.reduceRouteProcessor[address] = reducer;
  return this;
}

NanoRoute.prototype.removeReducer = function (address) {
  if (this.reduceRouteProcessor[address] === undefined) return;
  delete this.reduceRouteProcessor[address];
  return this;
}

NanoRoute.prototype.route = function (address, reducer, newModel) {
  if (this.routeDestination[address] === undefined) return;
  var updatedModel = {};
  if (newModel !== undefined) {
    updatedModel = (this.reduceRouteProcessor[reducer] !== undefined) ? this.reduceRouteProcessor[reducer](this.model, newModel) : this.reducer(this.model, newModel);
    if (updatedModel === undefined) return;
    Object.freeze(updatedModel)
    this.model = updatedModel;
  }
  // send updated model to specified address
  this.routeDestination[address](updatedModel);
}

module.exports = NanoRoute;
