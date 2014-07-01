###
backbone-chaining 0.1.4
http://github.com/ronen/backbone-chaining
###

((factory) ->
  if typeof define is "function" and define.amd
    # Register as an AMD module if available...
    define [
      "underscore"
      "backbone"
    ], factory
  else if typeof exports is "object"
    # Next for Node.js, CommonJS, browserify...
    module.exports = factory require("underscore"), require("backbone")
  else
    # Browser globals for the unenlightened...
    throw "Backbone must be loaded before backbone-chaining" unless window.Backbone? and Backbone.Model? and Backbone.Events?
    return if Backbone.Chaining?
    factory _, Backbone
  return
) (_, Backbone) ->

  Chaining = Backbone.Chaining =

      install: =>
          _.extend Backbone.Model::, Chaining.Model
          _.extend Backbone.Model::, Chaining.Events
          _.extend Backbone.Collection::, Chaining.Events
          Chaining

      throwMalformed: (attr, msg) => throw "Backbone.Chaining: malformed chain '#{attr}': #{msg}"
      throwNullSet: (head, tail) => throw "Backbone.Chaining: can't set '#{head}.tail': no value for '#{head}'"

      pattern: ///
                  [
                      \.
                      \[
                      \]
                  ]
               ///

      parseChain: (attr, options) ->
          i = attr?.search Chaining.pattern
          return null unless i >= 0

          options = _.extend({throw: true}, options ? {})
          if options.trailing
              i = attr.length-1 - attr.split('').reverse().join('').search(Chaining.pattern)

          sep = attr[i]
          head = attr.slice 0, i
          tail = attr.slice i+1
          if tail.length == 0
              Chaining.throwMalformed attr, "no attribute after '#{sep}'" if options.throw
              return null

          unless options.trailing
              switch sep
                  when "]" then Chaining.throwMalformed attr, "unbalanced ']'"
                  when "["
                      i = tail.indexOf ']'
                      Chaining.throwMalformed attr, "unbalanced '['" if i == -1
                      index = tail.slice 0, i
                      index = parseInt(index) unless index == '*' or index == '#'
                      if i == tail.length-1
                          tail = null
                      else
                          Chaining.throwMalformed attr, "missing '.' after ']'" if tail[i+1] != '.'
                          tail = tail.slice i+2
                          Chaining.throwMalformed attr, "no text after '.'" if tail.length == 0

          return {} =
              head: head
              tail: tail
              index: index

      parseEvent: (event) ->
          i = event.indexOf('@')
          return false if i == -1

          name = event.slice 0, i
          attr = event.slice i+1
          Chaining.throwMalformed event, "missing attributes after '@'" if attr.length == 0
          Chaining.throwMalformed event, "too many '@'s" if attr.indexOf('@') != -1
          return {} =
              name: name
              attr: attr

      toArray: (thing) -> _.compact(if _.isArray(thing) then _.flatten(thing) else [thing])

      valuesAtIndex: (collection, index) ->
          switch index
              when '*'
                  result = collection.models.slice()
                  result.multiple = true
                  result
              when '#'
                  [ collection.last() ]
              else
                  [ collection.at index ]

      Model:
          _primitiveGet: Backbone.Model::get
          _primitiveSet: Backbone.Model::set

          get: (attr) ->
              unless chain = Chaining.parseChain attr
                  return @_primitiveGet(attr)

              unless val = @_primitiveGet(chain.head)
                  return undefined

              if chain.index?
                  result = Chaining.valuesAtIndex val, chain.index
                  multiple = result.multiple
                  result = _.map(result, (item) -> item?.get(chain.tail)) if chain.tail
                  result = result[0] unless multiple
              else
                  result = val.get chain.tail

              return result


          set: (key, val, options) ->
              switch
                  when typeof key == 'object'
                      attrs = key
                      options = val
                  when key
                      (attrs = {})[key] = val

              return @_primitiveSet(arguments...) if _.isEmpty attrs

              result = @
              for attr, val of attrs
                  continue unless chain = Chaining.parseChain attr, trailing: true

                  objects = @get(chain.head)
                  unless objects?
                      Chaining.throwNullSet chain.head, chain.tail unless options.ifExists
                      continue
                  _.each Chaining.toArray(objects), (object) ->
                      result = false if !object.set(chain.tail, val, options)
                  delete attrs[attr]

              unless _.isEmpty attrs
                  result = false if !@_primitiveSet(attrs, options)

              return result

      Events:
          _primitiveOn: Backbone.Events.on
          _primitiveOff: Backbone.Events.off

          on: (name, callback, context) ->
              if _.isString(name) && name.search(/\s/) == -1 && event = Chaining.parseEvent(name)
                  @_eventChainProxies ?= []
                  @_eventChainProxies.push new Chaining.EventChainProxy(@, event.name, event.attr, callback, context)
                  return

              @_primitiveOn(arguments...)

          off: (name, callback, context) ->
              if @_eventChainProxies && (!name || event = Chaining.parseEvent(name))
                  @_eventChainProxies = _.reject @_eventChainProxies, (eventChain) =>
                      if eventChain.match(@, event?.name, event?.attr, callback, context)
                          eventChain.close()
                          true
                  delete @_eventChainProxies if @_eventChainProxies.length == 0
                  return if name

              @_primitiveOff(arguments...)

  class Backbone.Chaining.EventChainProxy

      _.extend @::, Backbone.Events

      constructor: (@requester, @eventName, @attr, @callback, @context) ->
          @context ||= @requester
          @thisEvent = "#{@eventName}@#{@attr}"
          @listenToRemotes()

      listenToRemotes: ->

          # set up proxy listener(s)

          if @requester.models #
              # a collection normally passes through events raised by its
              # members. but since chained events aren't raised, need to simulate that by proxying to the members.
              _.each @requester.models, (model) =>
                  @listenTo model, @thisEvent, (args...) => @callback.apply @context, args
              @listenTo @requester, "add remove reset", @reset
              return

          _.each Chaining.toArray(@requester.get(@attr)), (remote) =>
              if remote && _.isFunction(remote.on)
                  @listenTo remote, @eventName, (args...) => @callback.apply @context, args

          # watch chain for updates
          @walkBack @attr, (watch, residue) =>
              updateEvent = if residue.index then "add remove reset sort" else "change:#{residue.tail}"
              _.each Chaining.toArray(@requester.get(watch)), (container) =>
                  if container
                      @listenTo container, updateEvent, @reset
          @updateEvent = "change:#{Chaining.parseChain(@attr)?.head || @attr}"
          @listenTo @requester, @updateEvent, @reset, @ # use primitiveOn to avoid infinite recursion

      walkBack: (attr, func) ->
          while true
              if _.last(attr) == ']'
                  i = attr.lastIndexOf('[')
                  residue = {index: attr.substring(i+1, attr.length-1)}
                  attr = attr.substring(0, i)
              else
                  chain = Chaining.parseChain(attr, trailing: true)
                  return if !chain
                  residue = {tail: chain.tail}
                  attr = chain.head
              func(attr, residue)

      reset: ->
          @stop()
          @listenToRemotes()

      stop: ->
          @stopListening()

      close: ->
          return if @closed
          @closed = true
          @stop()

      match: (requester, eventName, attr, callback, context) ->
          return false unless @requester == requester
          if eventName
              return false unless @eventName == eventName
          if attr
              return false unless @attr == attr
          if callback
              return false unless @callback == callback
          if context
              return false unless @context == context
          true

  Chaining.install()
