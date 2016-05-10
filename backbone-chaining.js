// Generated by CoffeeScript 1.9.0

/*
backbone-chaining 0.1.4
http://github.com/ronen/backbone-chaining
 */

(function() {
  var __slice = [].slice;

  (function(factory) {
    if (typeof define === "function" && define.amd) {
      define(["underscore", "backbone"], factory);
    } else if (typeof exports === "object") {
      module.exports = factory(require("underscore"), require("backbone"));
    } else {
      if (!((window.Backbone != null) && (Backbone.Model != null) && (Backbone.Events != null))) {
        throw "Backbone must be loaded before backbone-chaining";
      }
      if (Backbone.Chaining != null) {
        return;
      }
      factory(_, Backbone);
    }
  })(function(_, Backbone) {
    var Chaining;
    Chaining = Backbone.Chaining = {
      install: (function(_this) {
        return function() {
          _.extend(Backbone.Model.prototype, Chaining.Model);
          _.extend(Backbone, Chaining.Events);
          _.extend(Backbone.Events, Chaining.Events);
          _.extend(Backbone.Collection.prototype, Chaining.Events);
          _.extend(Backbone.History.prototype, Chaining.Events);
          _.extend(Backbone.Model.prototype, Chaining.Events);
          _.extend(Backbone.Router.prototype, Chaining.Events);
          _.extend(Backbone.View.prototype, Chaining.Events);
          return Chaining;
        };
      })(this),
      throwMalformed: (function(_this) {
        return function(attr, msg) {
          throw "Backbone.Chaining: malformed chain '" + attr + "': " + msg;
        };
      })(this),
      throwNullSet: (function(_this) {
        return function(head, tail) {
          throw "Backbone.Chaining: can't set '" + head + ".tail': no value for '" + head + "'";
        };
      })(this),
      pattern: /[\.\[\]]/,
      parseChain: function(attr, options) {
        var head, i, index, sep, tail;
        i = attr != null ? attr.search(Chaining.pattern) : void 0;
        if (!(i >= 0)) {
          return null;
        }
        options = _.extend({
          "throw": true
        }, options != null ? options : {});
        if (options.trailing) {
          i = attr.length - 1 - attr.split('').reverse().join('').search(Chaining.pattern);
        }
        sep = attr[i];
        head = attr.slice(0, i);
        tail = attr.slice(i + 1);
        if (tail.length === 0) {
          if (options["throw"]) {
            Chaining.throwMalformed(attr, "no attribute after '" + sep + "'");
          }
          return null;
        }
        if (!options.trailing) {
          switch (sep) {
            case "]":
              Chaining.throwMalformed(attr, "unbalanced ']'");
              break;
            case "[":
              i = tail.indexOf(']');
              if (i === -1) {
                Chaining.throwMalformed(attr, "unbalanced '['");
              }
              index = tail.slice(0, i);
              if (!(index === '*' || index === '#')) {
                index = parseInt(index);
              }
              if (i === tail.length - 1) {
                tail = null;
              } else {
                if (tail[i + 1] !== '.') {
                  Chaining.throwMalformed(attr, "missing '.' after ']'");
                }
                tail = tail.slice(i + 2);
                if (tail.length === 0) {
                  Chaining.throwMalformed(attr, "no text after '.'");
                }
              }
          }
        }
        return {
          head: head,
          tail: tail,
          index: index
        };
      },
      parseEvent: function(event) {
        var attr, i, name;
        i = event.indexOf('@');
        if (i === -1) {
          return false;
        }
        name = event.slice(0, i);
        attr = event.slice(i + 1);
        if (attr.length === 0) {
          Chaining.throwMalformed(event, "missing attributes after '@'");
        }
        if (attr.indexOf('@') !== -1) {
          Chaining.throwMalformed(event, "too many '@'s");
        }
        return {
          name: name,
          attr: attr
        };
      },
      toArray: function(thing) {
        return _.compact(_.isArray(thing) ? _.flatten(thing) : [thing]);
      },
      valuesAtIndex: function(collection, index) {
        var result;
        switch (index) {
          case '*':
            result = collection.models.slice();
            result.multiple = true;
            return result;
          case '#':
            return [collection.last()];
          default:
            return [collection.at(index)];
        }
      },
      Model: {
        _primitiveGet: Backbone.Model.prototype.get,
        _primitiveSet: Backbone.Model.prototype.set,
        get: function(attr) {
          var chain, multiple, result, val;
          if (!(chain = Chaining.parseChain(attr))) {
            return this._primitiveGet(attr);
          }
          if (!(val = this._primitiveGet(chain.head))) {
            return void 0;
          }
          if (chain.index != null) {
            result = Chaining.valuesAtIndex(val, chain.index);
            multiple = result.multiple;
            if (chain.tail) {
              result = _.map(result, function(item) {
                return item != null ? item.get(chain.tail) : void 0;
              });
            }
            if (!multiple) {
              result = result[0];
            }
          } else {
            result = val.get(chain.tail);
          }
          return result;
        },
        set: function(key, val, options) {
          var attr, attrs, chain, objects, result;
          switch (false) {
            case typeof key !== 'object':
              attrs = key;
              options = val;
              break;
            case !key:
              (attrs = {})[key] = val;
          }
          if (_.isEmpty(attrs)) {
            return this._primitiveSet.apply(this, arguments);
          }
          result = this;
          for (attr in attrs) {
            val = attrs[attr];
            if (!(chain = Chaining.parseChain(attr, {
              trailing: true
            }))) {
              continue;
            }
            objects = this.get(chain.head);
            if (objects == null) {
              if (!options.ifExists) {
                Chaining.throwNullSet(chain.head, chain.tail);
              }
              continue;
            }
            _.each(Chaining.toArray(objects), function(object) {
              if (!object.set(chain.tail, val, options)) {
                return result = false;
              }
            });
            delete attrs[attr];
          }
          if (!_.isEmpty(attrs)) {
            if (!this._primitiveSet(attrs, options)) {
              result = false;
            }
          }
          return result;
        }
      },
      Events: {
        _primitiveOn: Backbone.Events.on,
        _primitiveOff: Backbone.Events.off,
        _primitiveListenTo: Backbone.Events.listenTo,
        _dummyEvent: "__backbone_chaining_dummy__",
        _splitEvents: function(names) {
          var chainEvents, primitives;
          if (!_.isString(names)) {
            return [null, names];
          }
          primitives = [];
          chainEvents = [];
          _.each(names.split(/\s+/), function(name) {
            var event;
            if (event = Chaining.parseEvent(name)) {
              return chainEvents.push(event);
            } else {
              return primitives.push(name);
            }
          });
          return [chainEvents, primitives ? primitives.join(' ') : void 0];
        },
        _addEventChainProxy: function(event, callback, context) {
          if (this._eventChainProxies == null) {
            this._eventChainProxies = [];
          }
          return this._eventChainProxies.push(new Chaining.EventChainProxy(this, event.name, event.attr, callback, context));
        },
        _removeEventChainProxy: function(event, callback, context) {
          this._eventChainProxies = _.reject(this._eventChainProxies, (function(_this) {
            return function(eventChain) {
              if (eventChain.match(_this, event != null ? event.name : void 0, event != null ? event.attr : void 0, callback, context)) {
                _this.stopListening(eventChain.requester, _this._dummyEvent);
                eventChain.close();
                return true;
              }
            };
          })(this));
          if (this._eventChainProxies.length === 0) {
            return delete this._eventChainProxies;
          }
        },
        _setupChaining: function(names, callback, context, chainedCB) {
          var chainEvents, primitives, _ref;
          _ref = this._splitEvents(names), chainEvents = _ref[0], primitives = _ref[1];
          _.each(chainEvents, (function(_this) {
            return function(event) {
              return _this._addEventChainProxy(event, callback, context);
            };
          })(this));
          if ((chainEvents != null ? chainEvents.length : void 0) > 0 && _.isFunction(chainedCB)) {
            chainedCB();
          }
          return primitives;
        },
        on: function(names, callback, context) {
          var primitives;
          primitives = this._setupChaining(names, callback, context);
          if (primitives) {
            return this._primitiveOn(primitives, callback, context);
          }
        },
        listenTo: function(obj, names, callback) {
          var primitives;
          primitives = obj._setupChaining(names, callback, this, (function(_this) {
            return function() {
              return _this._primitiveListenTo(obj, _this._dummyEvent, function() {});
            };
          })(this));
          if (primitives) {
            return this._primitiveListenTo(obj, primitives, callback);
          }
        },
        off: function(names, callback, context) {
          var chainEvents, primitives, _ref;
          if (names) {
            _ref = this._splitEvents(names), chainEvents = _ref[0], primitives = _ref[1];
          }
          if (this._eventChainProxies && (chainEvents || !names)) {
            _.each(chainEvents, (function(_this) {
              return function(event) {
                return _this._removeEventChainProxy(event, callback, context);
              };
            })(this));
            if (!names) {
              this._removeEventChainProxy(null, callback, context);
            }
          }
          return this._primitiveOff(primitives, callback, context);
        }
      }
    };
    Backbone.Chaining.EventChainProxy = (function() {
      _.extend(EventChainProxy.prototype, Backbone.Events);

      _.extend(EventChainProxy.prototype, Chaining.Events);

      function EventChainProxy(_at_requester, _at_eventName, _at_attr, _at_callback, _at_context) {
        this.requester = _at_requester;
        this.eventName = _at_eventName;
        this.attr = _at_attr;
        this.callback = _at_callback;
        this.context = _at_context;
        this.context || (this.context = this.requester);
        this.thisEvent = this.eventName + "@" + this.attr;
        this.listenToRemotes();
      }

      EventChainProxy.prototype.listenToRemotes = function() {
        var _ref;
        if (this.requester.models) {
          _.each(this.requester.models, (function(_this) {
            return function(model) {
              return _this.listenTo(model, _this.thisEvent, function() {
                var args;
                args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
                return _this.callback.apply(_this.context, args);
              });
            };
          })(this));
          this.listenTo(this.requester, "add remove reset", this.reset);
          return;
        }
        if (_.isFunction(this.requester.get)) {
          _.each(Chaining.toArray(this.requester.get(this.attr)), (function(_this) {
            return function(remote) {
              if (remote && _.isFunction(remote.on)) {
                return _this.listenTo(remote, _this.eventName, function() {
                  var args;
                  args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
                  return _this.callback.apply(_this.context, args);
                });
              }
            };
          })(this));
          this.walkBack(this.attr, (function(_this) {
            return function(watch, residue) {
              var updateEvent;
              updateEvent = residue.index ? "add remove reset sort" : "change:" + residue.tail;
              return _.each(Chaining.toArray(_this.requester.get(watch)), function(container) {
                if (container) {
                  return _this.listenTo(container, updateEvent, _this.reset);
                }
              });
            };
          })(this));
          this.updateEvent = "change:" + (((_ref = Chaining.parseChain(this.attr)) != null ? _ref.head : void 0) || this.attr);
          return this.listenTo(this.requester, this.updateEvent, this.reset, this);
        }
      };

      EventChainProxy.prototype.walkBack = function(attr, func) {
        var chain, i, residue;
        while (true) {
          if (_.last(attr) === ']') {
            i = attr.lastIndexOf('[');
            residue = {
              index: attr.substring(i + 1, attr.length - 1)
            };
            attr = attr.substring(0, i);
          } else {
            chain = Chaining.parseChain(attr, {
              trailing: true
            });
            if (!chain) {
              return;
            }
            residue = {
              tail: chain.tail
            };
            attr = chain.head;
          }
          func(attr, residue);
        }
      };

      EventChainProxy.prototype.reset = function() {
        this.stop();
        return this.listenToRemotes();
      };

      EventChainProxy.prototype.stop = function() {
        return this.stopListening();
      };

      EventChainProxy.prototype.close = function() {
        if (this.closed) {
          return;
        }
        this.closed = true;
        return this.stop();
      };

      EventChainProxy.prototype.match = function(requester, eventName, attr, callback, context) {
        if (this.requester !== requester) {
          return false;
        }
        if (eventName) {
          if (this.eventName !== eventName) {
            return false;
          }
        }
        if (attr) {
          if (this.attr !== attr) {
            return false;
          }
        }
        if (callback) {
          if (this.callback !== callback) {
            return false;
          }
        }
        if (context) {
          if (this.context !== context) {
            return false;
          }
        }
        return true;
      };

      return EventChainProxy;

    })();
    return Chaining.install();
  });

}).call(this);
