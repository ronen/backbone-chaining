$(document).ready ->

    unless window.console
        window.console = {}
        names = [ 'log', 'debug', 'info', 'warn', 'error', 'assert', 'dir', 'dirxml',
            'group', 'groupEnd', 'time', 'timeEnd', 'count', 'trace', 'profile', 'profileEnd' ]
        for name in names
            window.console[name] = ->

    window.models = models = {}
    collections = {}


    noEvents = (other) ->
        ok(_.all(_.compact _.flatten([models, collections, other]), (sender) ->
            return false if sender._eventChains
            return false unless _.isEmpty(_.omit(sender._events, 'all')) # ignore 'all' events, created by collection
            true
        ), "all events and chains removed")

    testEvent = (options) ->
        options.model.on options.event, options.handler, options.context
        options.trigger()
        if options.update
            options.update()
            options.trigger()
        options.model.off options.event
        noEvents()

    QUnit.module "Backbone.Chaining",
        setup: ->
            models.a = new Backbone.Model name: "a"
            models.b = new Backbone.Model name: "b"
            models.c = new Backbone.Model name: "c"
            models.item0 = new Backbone.Model name: "item0"
            models.item1 = new Backbone.Model name: "item1"
            models.sub0 = new Backbone.Model name: "sub0"
            models.sub1 = new Backbone.Model name: "sub1"
            models.agent = new Backbone.Model name: "agent"

            collections.p = new Backbone.Collection [models.item0, models.item1]

            models.a.set 'chain', models.b
            models.b.set 'chain', models.c
            models.item0.set 'sub', models.sub0
            models.item1.set 'sub', models.sub1
            models.a.set 'coll', collections.p

    QUnit.test "get with null attribute", ->
        equal models.a.get(null), null

    QUnit.test "get without chain", 1, ->
        equal models.a.get('name'), 'a'

    QUnit.test "get malformed chain -- missing tail", 1, ->
        throws (-> models.a.get 'chain.'), /malformed chain/

    QUnit.test "get malformed chain -- unbalanced left bracket", 1, ->
        throws (-> models.a.get 'chain]here'), /malformed chain/

    QUnit.test "get malformed chain -- unbalanced bracket", 1, ->
        throws (-> models.a.get 'chain[here'), /malformed chain/

    QUnit.test "get malformed chain -- missing dot", 1, ->
        throws (-> models.a.get 'chain[2]x'), /malformed chain/

    QUnit.test "get malformed chain -- missing tail after bracket", 1, ->
        throws (-> models.a.get 'chain[2].'), /malformed chain/

    QUnit.test "get single chain", 1, ->
        equal models.a.get('chain.name'), 'b'

    QUnit.test "get double chain", 1, ->
        equal models.a.get('chain.chain.name'), 'c'

    QUnit.test "get chain with collection index", 3, ->
        equal models.a.get('coll[0]'), models.item0, "index 0"
        equal models.a.get('coll[1]'), models.item1, "index 1"
        equal models.a.get('coll[#]'), models.item1, "index 1"

    QUnit.test "get chain with collection index chain", 3, ->
        equal models.a.get('coll[0].sub.name'), 'sub0', "index 0"
        equal models.a.get('coll[1].sub.name'), 'sub1', "index 1"
        equal models.a.get('coll[#].sub.name'), 'sub1', "index 1"

    QUnit.test "get chain with collection star", 1, ->
        deepEqual models.a.get('coll[*]'), [models.item0, models.item1]

    QUnit.test "get chain with collection star chained", 1, ->
        deepEqual models.a.get('coll[*].sub.name'), ['sub0', 'sub1']

    QUnit.test "get broken single chain", 1, ->
        models.a.set 'chain', null
        equal models.a.get('chain.name'), undefined

    QUnit.test "get broken double chain", 1, ->
        models.b.set 'chain', null
        equal models.a.get('chain.chain.name'), undefined

    QUnit.test "get broken collection index chain", 1, ->
        models.a.set 'coll', null
        equal models.a.get('coll[0].sub.name'), undefined

    QUnit.test "get invalid collection index chain", 1, ->
        equal models.a.get('coll[2].sub.name'), undefined

    QUnit.test "set without chain", 1, ->
        models.a.set 'attr', 'val'
        equal models.a.get('attr'), 'val'

    QUnit.test "set malformed chain -- no attribute", 1, ->
        throws (-> models.a.set 'chain.', 'val'), /malformed chain/

    QUnit.test "set single chain", 1, ->
        models.a.set 'chain.attr', 'val'
        equal models.b.get('attr'), 'val'

    QUnit.test "set double chain", 1, ->
        models.a.set 'chain.chain.attr', 'val'
        equal models.c.get('attr'), 'val'

    QUnit.test "set chain with collection index", 1, ->
        models.a.set 'coll[0].sub.attr', 'val'
        equal models.sub0.get('attr'), 'val'

    QUnit.test "set chain with collection last index", 1, ->
        models.a.set 'coll[#].sub.attr', 'val'
        equal models.sub1.get('attr'), 'val'

    QUnit.test "set chain with collection star", 2, ->
        models.a.set 'coll[*].sub.attr', 'val'
        equal models.sub0.get('attr'), 'val'
        equal models.sub1.get('attr'), 'val'

    QUnit.test "event malformed chain -- missing attr", 1, ->
        throws (-> models.a.on "name@"), /malformed chain/

    QUnit.test "event malformed chain -- too many atsigns", 1, ->
        throws (-> models.a.on "name@here@there"), /malformed chain/

    QUnit.test "event without chain", 2, ->
        testEvent
            model: models.a
            event: "sample"
            handler: -> ok(true, "got sample")
            trigger: -> models.a.trigger "sample"

    QUnit.test "event chain", 3, ->
        testEvent
            model: models.a
            event: "sample@chain"
            handler: ->
                ok(true, "got sample@chain")
                equal @, models.a
            trigger: -> models.b.trigger "sample"

    QUnit.test "event chain context", 2, ->
        testEvent
            model: models.a
            context: {ctx: "test"}
            event: "sample@chain"
            handler: -> equal @ctx, "test"
            trigger: -> models.b.trigger "sample"


    QUnit.test "event double chain", 2, ->
        testEvent
            model: models.a
            event: "sample@chain.chain"
            handler: -> ok(true, "got sample@chain@chain")
            trigger: -> models.c.trigger "sample"

    QUnit.test "event chain with collection index", 2, ->
        testEvent
            model: models.a
            event: "sample@coll[0].sub"
            handler: (val) -> equal(val, "yes", "got sample@coll[0].sub")
            trigger: ->
                models.sub0.trigger "sample", "yes"
                models.sub1.trigger "sample", "no"

    QUnit.test "event chain with collection index", 2, ->
        testEvent
            model: models.a
            event: "sample@coll[#].sub"
            handler: (val) -> equal(val, "yes", "got sample@coll[#].sub")
            trigger: ->
                models.sub0.trigger "sample", "no"
                models.sub1.trigger "sample", "yes"

    QUnit.test "event chain with collection star", 3, ->
        testEvent
            model: models.a
            event: "sample@coll[*].sub"
            handler: (val) -> equal(val, "yes", "got sample@coll[*].sub")
            trigger: ->
                models.sub0.trigger "sample", "yes"
                models.sub1.trigger "sample", "yes"

    QUnit.test "event pass-through collection", 3, ->
        container = new Backbone.Collection [models.a]
        testEvent
            model: container
            event: "add@coll"
            handler: ->
                ok(true, "got add@coll")
                equal @, container, "context"
            trigger: ->
                models.a.get('coll').add new Backbone.Model name: "added"


    QUnit.test "change event chain", 4, ->
        models.b.set 'attr', 'previous'
        testEvent
            model: models.a
            event: "change@chain"
            handler: (model, options) ->
                equal model, models.b
                equal(model.previous('attr'), 'previous')
                equal(model.get('attr'), 'new')
            trigger: -> models.b.set 'attr', 'new'

    QUnit.test "change:attr event chain", 5, ->
        models.b.set 'attr', 'previous'
        testEvent
            model: models.a
            event: "change:attr@chain"
            handler: (model, value, options) ->
                equal model, models.b
                equal value, 'new'
                equal model.previous('attr'), 'previous'
                equal model.get('attr'), 'new'
            trigger: -> models.b.set 'attr', 'new'

    QUnit.test "change:attr event double chain", 5, ->
        models.c.set 'attr', 'previous'
        testEvent
            model: models.a
            event: "change:attr@chain.chain"
            handler: (model, value, options) ->
                equal model, models.c
                equal value, 'new'
                equal(model.previous('attr'), 'previous')
                equal(model.get('attr'), 'new')
            trigger: -> models.c.set 'attr', 'new'

    QUnit.test "change:attr event double chain", 5, ->
        models.c.set 'attr', 'previous'
        testEvent
            model: models.a
            event: "change:attr@chain.chain"
            handler: (model, value, options) ->
                equal model, models.c
                equal value, 'new'
                equal(model.previous('attr'), 'previous')
                equal(model.get('attr'), 'new')
            trigger: -> models.c.set 'attr', 'new'

    QUnit.test "update event chain -- break chain", 4, ->
        testEvent
            model: models.a
            event: "sample@coll[*].sub"
            handler: -> ok(true, "got sample@coll[*].sub")
            update: -> models.item0.set 'sub', null
            trigger: ->
                models.sub0.trigger "sample"
                models.sub1.trigger "sample"

    QUnit.test "update event chain -- remove from collection", 4, ->
        testEvent
            model: models.a
            event: "sample@coll[*].sub"
            handler: -> ok(true, "got sample@coll[*].sub")
            update: -> collections.p.remove(models.item0)
            trigger: ->
                models.sub0.trigger "sample"
                models.sub1.trigger "sample"

    QUnit.test "update event chain -- make chain: add field", 1, ->
        models.a.on "sample@coll[*].sub.extra.chain", -> ok(true, "got sample@coll[*].sub.extra.chain")
        models.sub1.set 'extra', models.b
        models.c.trigger "sample"

    QUnit.test "update event chain -- make chain: add element", 1, ->
        models.a.on "sample@coll[2].sub", -> ok(true, "got sample@coll[*].sub.extra.chain")
        sub2 = new Backbone.Model name: "sub2"
        collections.p.add new Backbone.Model name: "item2", sub: sub2
        sub2.trigger "sample"

    QUnit.test "update event chain -- change root", 2, ->
        newTail = new Backbone.Model name: "newTail"
        newHead = new Backbone.Model name: "newHead", chain: newTail
        models.a.on "sample@chain.chain", (expected) -> equal expected, 'yes'
        models.b.trigger "sample", "no"
        models.c.trigger "sample", "yes"
        newHead.trigger "sample", "no"
        newTail.trigger "sample", "no"
        models.b.trigger "sample", "no"
        models.a.set "chain", newHead
        models.c.trigger "sample", "no"
        newHead.trigger "sample", "no"
        newTail.trigger "sample", "yes"

    QUnit.test "remove chain -- event name", 3, ->
        cb = (expected) -> equal expected, 'yes'
        models.a.on "event1@chain", cb
        models.a.on "event2@chain", cb

        models.b.trigger "event1", "yes"
        models.b.trigger "event2", "yes"

        models.a.off "event1@chain"

        models.b.trigger "event1", "no"
        models.b.trigger "event2", "yes"

    QUnit.test "remove chain -- attr", 3, ->
        cb = (expected) -> equal expected, 'yes'
        models.a.on "sample@chain", cb
        models.a.on "sample@coll", cb

        models.b.trigger "sample",      "yes"
        collections.p.trigger "sample", "yes"

        models.a.off "sample@chain"

        models.b.trigger "sample",      "no"
        collections.p.trigger "sample", "yes"

    QUnit.test "remove chain -- callback", 3, ->
        cb1 = (expected) -> ok(true)

        cb2ok = true
        cb2 = (expected) -> ok(cb2ok)

        models.a.on "sample@chain", cb1
        models.a.on "sample@chain", cb2

        models.b.trigger "sample" # both callbacks

        models.a.off null, cb2
        cb2ok = false

        models.b.trigger "sample" # only cb1

    QUnit.test "remove chain -- context", 3, ->
        ctx1 = { ok: true }
        ctx2 = { ok: true}

        cb = -> ok @ok

        models.a.on "sample@chain", cb, ctx1
        models.a.on "sample@chain", cb, ctx2

        models.b.trigger "sample" # both callbacks

        models.a.off null, null, ctx2
        ctx2.ok = false

        models.b.trigger "sample" # only ctx1 callback

    listenToChain = (listener) ->
        listener.listenTo models.a, "sample@chain.chain", ->
            ok(true, "got sample@chain.chain")
        models.c.trigger "sample"

        listener.stopListening()
        noEvents(listener)

    QUnit.test "listenTo chain", 2, ->
        listenToChain models.item0

    QUnit.test "backbone listenTo chain", 2, ->
        listenToChain Backbone

    QUnit.test "generic listener listenTo", 2, ->
        listenToChain new class
            _.extend @::, Backbone.Events

    _.each {
        model:      Backbone.Model
        collection: Backbone.Collection
        view:       Backbone.View
        router:     Backbone.Router
        history:    Backbone.History
    }, (klass, name) ->
        QUnit.test "#{name} listenTo chain", 2, ->
            listenToChain new klass

    QUnit.test "listenTo chain stopListening to model", 2, ->
        models.agent.listenTo models.a, "sample@chain.chain", ->
            ok(true, "got sample@chain.chain")
        models.c.trigger "sample" # handled
        models.agent.stopListening models.a
        models.c.trigger "sample" # not handled
        noEvents()

    QUnit.test "listenTo chain, stopListening to event", 2, ->
        models.agent.listenTo models.a, "sample@chain.chain", ->
            ok(true, "got sample@chain.chain")
        models.c.trigger "sample" # handled

        models.agent.stopListening models.a, "sample@chain.chain"
        models.c.trigger "sample" # not handled

        noEvents()

    QUnit.test "listenTo chain stopListening to other event", 3, ->
        models.agent.listenTo models.a, "sample@chain.chain", ->
            ok(true, "got sample@chain.chain")
        models.c.trigger "sample" # handled

        models.agent.stopListening models.a, "other@chain.chain"
        models.c.trigger "sample" # handled

        models.agent.stopListening()
        noEvents()


