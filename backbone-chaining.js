// Generated by CoffeeScript 1.6.3
/*
backbone-chaining 0.1.3
http://github.com/ronen/backbone-chaining
*/


(function() {
  var Chaining,
    _this = this,
    __slice = [].slice;

  if (!((window.Backbone != null) && (Backbone.Model != null) && (Backbone.Events != null))) {
    throw "Backbone must be loaded before backbone-chaining";
  }

  if (Backbone.Chaining != null) {
    return;
  }

  Chaining = Backbone.Chaining = {
    install: function() {
      _.extend(Backbone.Model.prototype, Chaining.Model);
      _.extend(Backbone.Model.prototype, Chaining.Events);
      return _.extend(Backbone.Collection.prototype, Chaining.Events);
    },
    throwMalformed: function(attr, msg) {
      throw "Backbone.Chaining: malformed chain '" + attr + "': " + msg;
    },
    throwNullSet: function(head, tail) {
      throw "Backbone.Chaining: can't set '" + head + ".tail': no value for '" + head + "'";
    },
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
      on: function(name, callback, context) {
        var event;
        if (_.isString(name) && name.search(/\s/) === -1 && (event = Chaining.parseEvent(name))) {
          if (this._eventChainProxies == null) {
            this._eventChainProxies = [];
          }
          this._eventChainProxies.push(new Chaining.EventChainProxy(this, event.name, event.attr, callback, context));
          return;
        }
        return this._primitiveOn.apply(this, arguments);
      },
      off: function(name, callback, context) {
        var event,
          _this = this;
        if (this._eventChainProxies && (!name || (event = Chaining.parseEvent(name)))) {
          this._eventChainProxies = _.reject(this._eventChainProxies, function(eventChain) {
            if (eventChain.match(_this, event != null ? event.name : void 0, event != null ? event.attr : void 0, callback, context)) {
              eventChain.close();
              return true;
            }
          });
          if (this._eventChainProxies.length === 0) {
            delete this._eventChainProxies;
          }
          if (name) {
            return;
          }
        }
        return this._primitiveOff.apply(this, arguments);
      }
    }
  };

  Backbone.Chaining.EventChainProxy = (function() {
    _.extend(EventChainProxy.prototype, Backbone.Events);

    function EventChainProxy(requester, eventName, attr, callback, context) {
      this.requester = requester;
      this.eventName = eventName;
      this.attr = attr;
      this.callback = callback;
      this.context = context;
      this.context || (this.context = this.requester);
      this.thisEvent = "" + this.eventName + "@" + this.attr;
      this.listenToRemotes();
    }

    EventChainProxy.prototype.listenToRemotes = function() {
      var _ref,
        _this = this;
      if (this.requester.models) {
        _.each(this.requester.models, function(model) {
          return _this.listenTo(model, _this.thisEvent, function() {
            var args;
            args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
            return _this.callback.apply(_this.context, args);
          });
        });
        this.listenTo(this.requester, "add remove reset", this.reset);
        return;
      }
      _.each(Chaining.toArray(this.requester.get(this.attr)), function(remote) {
        if (remote && _.isFunction(remote.on)) {
          return _this.listenTo(remote, _this.eventName, function() {
            var args;
            args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
            return _this.callback.apply(_this.context, args);
          });
        }
      });
      this.walkBack(this.attr, function(watch, residue) {
        var updateEvent;
        updateEvent = residue.index ? "add remove reset sort" : "change:" + residue.tail;
        return _.each(Chaining.toArray(_this.requester.get(watch)), function(container) {
          if (container) {
            return _this.listenTo(container, updateEvent, _this.reset);
          }
        });
      });
      this.updateEvent = "change:" + (((_ref = Chaining.parseChain(this.attr)) != null ? _ref.head : void 0) || this.attr);
      return this.listenTo(this.requester, this.updateEvent, this.reset, this);
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

  Chaining.install();

}).call(this);
