# Backbone-Chaining

[![GitHub version](https://badge.fury.io/gh/ronen%2Fbackbone-chaining.png)](http://badge.fury.io/gh/ronen%2Fbackbone-chaining) [![Build Status](https://travis-ci.org/ronen/backbone-chaining.png?branch=master)](https://travis-ci.org/ronen/backbone-chaining)

Backbone-Chaining extends [Backbone](http://backbonejs.org) Models' `set()` and `get()` methods and event handling to be able to act across attribute chains such as "post.comments[0].author"

Backbone-Chaining was inspired by [Backbone-Relational](http://backbonerelational.org)'s `dotNotation` option and [Backbone-Associations](http://dhruvaray.github.io/backbone-associations/)' similar 'fully qualified paths' -- and was very specifically inspired by [Backbone-Associations](http://dhruvaray.github.io/backbone-Associations/)' introduction of fully-qualified event paths.  Backbone-Chaining however is agnostic as to whether you use either of those libraries or a different library, or none at all.

## Summary

Backbone-Chaining provides:

* Chained Get:

         model.get('other.things[2].widget')

* Chained Set:

         model.set('other.things[2].widget.color', "red")

* Chained Events:

         model.on('change:color@other.things[2].widget', callback)

## Details

### Chained Get

A chained get essentially provides a shorthand to get values:

    post.get('author.name.first')

    // shorthand for
    post.get('author').get('name').get('first')

You can also chain through collections:

    comment.get('author.posts[0].date.month.days[28]')

    // shorthand for
    comment.get('author').get(posts).at(0).get('date').get('month').get('days').at(28)

Two special indexes are provided for collections.  `#` lets you get the last element

    comment.get('author.posts[#].date.month')

    // shorthand for
    comment.get('author').get(posts).last().get('date').get('month')

More fancy, `*` causes the chained get to return an array of values:

    comment.get('author.posts[*].date.month')

    // shorthand for
    comment.get('author').get('posts').map(function(post) { post.get('date').get('month') })

One key difference between the chained get and the long form is that if any step along the way returns falsy, the chained get returns `undefined` rather than throwing an error.

### Chained Set

A chained set essentially provides a shorthand:

    comment.set('author.posts[#].date.month', 'February')

    // shorthand for
    comment.get('author.posts[#].date').set('month', 'February')

That is, it does a `get` on the body of the chain, and sets the tail.

A collection index `*` causes the set operation to be performed on all the values:

    comment.set('author.posts[*].date.month', 'February')

    // shorthand for
    comment.get('author.posts[*]).each(function(post) { post.get('date').set('month', 'February') })

By default if the get on the chain body returns null, the attempt to set will throw an error.  If you pass the option `ifExists: true`, the attempt to set will quietly do nothing in that case.

### Chained Event Handling

Chained event handling essentially provides a shorthand:

    comment.on("eventName@author.posts[0].date", callback)

    // shorthand for
    comment.get("author.posts[0].date").on("eventName", callback)

Of course in practice you'd generally use `listenTo` rather than `on`. You can remove a chained event as usual using `off` or `stopListening`.  Also, `once` and `listenToOnce` work as expected.

#### Dynamic binding

The key difference between chained event handling and the long form is that the chained event is bound *dynamically* rather than statically to whatever is at the end of the chain (if anything).  For example:

    nest = new Backbone.Model();			           // create an empty nest
    nest.on("chirp@bird.children[#]", function () {    // set up event for the future
      alert("youngest baby bird chirped!")
    });

    robin = new Backbone.Model({name: "Mrs Robin"});    // create a bird...
	robin.set('children', new Backbone.Collection);
    jack = robin.get('children').add(new Backbone.Model({name: "Jack}")); // ...with one child

	jack.trigger("chirp"); // => does not alert; robin is not in the nest

    nest.set('bird', robin);
	jack.trigger("chirp"); // => alerts
	
	jill = robin.get('children').add(new Backbone.Model({name: "Jill}")); // add younger child
	
	jill.trigger("chirp");  // => alerts
	jack.trigger("chirp");	// => does not alert; jack is no longer last in collection
	
	nest.set('bird', sparrow);
	jill.trigger("chirp"); // => does not alert; robin is no longer in the nest

As usual, `*` applies to all models in a collection.  E.g.

    nest.on("flap@bird.children[*].wings", function () { alert "a baby bird flapped its wings" });
    

#### Collections

If the object at the end of a chain is a collection, you can of course listen to the collection's events:

    nest.on("add@bird.children", function () { alert "the bird has a new baby" });

Because collections automatically pass along any trigger from a member, these are equivalent:

    nest.on("chirp@bird.children", function () { alert "a baby bird chirped" });
    nest.on("chirp@bird.children[*]", function () { alert "a baby bird chirped" });

If listening directly to a collection, the given chained event is likewise effectively passed through from any model in the collection. e.g.

    birds = new Backbone.Collection([robin, sparow]);
    birds.on("chirp@children[#]", ...); // listens for the youngest child of any bird in the collection

So in the case of a model with an attribute whose value is a collection, we have this equivalence:

    aviary = new Backbone.Model;
    aviary.set('birds', new Backbone.Collection);
    aviary.get('birds').on('event@path.to.object', ...);   // this is equivalent...
    aviary.on('event@birds[*].path.to.object', ...);       // ...to this


## Installation and Use

Backbone-chaining doesn't create any new classes to derive from, and doesn't need any explicit initialization; when the file is loaded it wraps extra behavior around `Backbone.Model` and `Backbone.Collection` prototype methods.  Just include the file and you're all set.

Backbone-chaining can be loaded using CommonJS or RequireJS, or by explicitly loading the file.  In the latter case, backbone-chaining.js should be included *after* backbone.js.  It will throw a friendly error message if Backbone isn't already defined. E.g. in Sprockets:

    //= require backbone
    //= require backbone-chaining

Backbone-chaining works with both Underscore and LoDash.


### Using with [Backbone-Relational](http://backbonerelational.org)

Backbone-Chaining works fine with Backbone-Relational.  Usage notes:

* Order of inclusion is (e.g. Sprockets):

        //= require backbone
        //= require backbone-chaining
        //= require backbone-Relational

* No need to enable `dotNotation` of Backbone-Relational

        Backbone.RelationalModel::dotNotation = false; // default is false anyway

* Backbone-Relational provides a few events that it propagates across a relation.  The corresponding Backbone-chaining events have the same effect:

        model.on("add:key", ...) // these are equivalent
        model.on("add@key", ...) //

        model.on("remove:key", ...) // these are equivalent
        model.on("remove@key", ...) //

        model.on("change:key", ...) // these are equivalent except for the callback arguments
        model.on("change@key", ...) //

### Using with [Backbone-Associations](http://dhruvaray.github.io/backbone-associations/):

Why would you want to use Backbone-Chaining, since Backbone-Associations supports similar behavior?  Maybe you prefer Backbone-Chaining's syntax (see discussion of @ vs : below), or philosophically you like SoC.  

Note though that Backbone-Associations provides a ["nested-chain" event](http://dhruvaray.github.io/backbone-associations/events.html#e-catalogue) that gets propogated through the object graph; Backbone-Chaining does not support this.  If you need "nested-chain", stick with Backbone-Associations' chaining.

Usage notes:

* Order of inclusion is (e.g. Sprockets):

        //= require backbone
        //= require backbone-chaining
        //= require backbone-Associations

* In some convenient configuration file, disable Backbone-Associations event bubbling if you don't want it:

        Backbone.Associations.EVENTS_BUBBLE = false; // this is optional, you *could* keep both

* Backbone-Associations provides chained `get()` and `set()` which can't be disabled; so its chaining mechanism will be applied and Backbone-Chaining's mechanism will not come into play.  One difference is that Backbone-Associations' `set()` always behaves like Backbone-Chaining's `set()` with the `ifExists: true` option set.


## On @ vs :

Given that Backbone, Backbone-Relational, and Backbone-Associations all use `:` in events of the form `"name:target"`, why doesn't Backbone-Chaining do the same?

The reason is that given the prevalence in common practice of using `:` as a way of subclassing or namespacing events, parsing an event string to identify the "name" vs the "target" is open to ambiguity unless you have special knowledge of event meanings.  I.e. `"relational:add"`, an event used internally in Backbone-Relational, should not be parsed as the event "relational" triggered by an object that's the value of the "add" attribute, while `"chirp:bird"` in the above example would need to be parsed that way.  Even `"change:attr"` as supported by Backbone, Backbone-Relational and Backbone-Associations has a different meaning--and different callback parameters--based on whether "attr" is an ordinary attribute vs. a relation key.

Backbone-Chaining avoids that ambiguity, by using `@` to separate the name of the event from the path to reach it.  Backbone-Chaining unambiguously allows `:` as part of the event name, e.g.

    model.on "change:key@path.to.other.model"

## Contributing

Suggestions welcome, especially PR's with tests :)

The test rig runs the full test suite for Underscore and LoDash, and does quick sanity checks that backbone-chaining properly loads under RequireJS and CommonJS.  To run the tests:

    $ npm install
    $ npm test     # => runs all 4 tests.  or you can run them individually...
    $ npm run test-underscore 
    $ npm run test-lodash
    $ npm run test-requirejs
    $ npm run test-commonjs
