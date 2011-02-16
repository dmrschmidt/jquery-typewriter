/**
 * Wraps an element that is to be filled with text.
 */
var Typebox = $.Class.create({
    /*
     * properties
     */
    _max_waiting : 10,
    _max_iterations: 3,    
    /*
     * Wrap the passed element into a new Typebox.
     */
    initialize: function(element) {
      this._fixed = "";
      this._current = "";
      this._position = 0;
      this._iteration = 0;
      this._waited = 0;
      this._started = false;
      this._element = $(element);
      this._text = this._element.attr("data-text");
    },
    
    /*
     * Return the inner <var> tag, that will be replaced by the new text.
     */
    get_inner: function() {
      return $(this._element.find("var").first());
    },
    
    /*
     * Calculates and returns the next character to be displayed.
     */
    get_char: function() {
      // display dots if in "waiting" mode
      if(this.is_waiting()) {
        var value = '.';
        this._fixed = this._current;
        // if waiting is finished, reset the text field
        if(++this._waited == this._max_waiting) {
          this._fixed = "";
          value = '';
        }
      // display random letter or real character when not waiting
      } else {
        var value = (this._iteration < (this._max_iterations - 1))
          ? Math.floor(Math.random() * 10)
          : this._text[this._position];
        this._iteration = (this._iteration + 1) % (this._max_iterations + 1);
        if(this._iteration == 0) {
          this._position++;
          this._fixed = this._current;
        }
      }
      return value;
    },
    
    /*
     * Returns true if this Typebox is finished printing it's text.
     */
    is_done: function() {
      return this._position >= this._text.length;
    },
    
    /*
     * Returns true if this Typebox is currently in waiting mode.
     */
    is_waiting: function() {
      return this._element.attr("data-prefill") == "true" && this._waited < this._max_waiting;
    },
    
    /*
     * Update the Typebox's text with new content.
     */
    update: function() {
      if(!this.is_done()) {
        this._current = this._fixed + this.get_char();
        this.get_inner().replaceWith('<var>' + this._current + '</var>');
      }
      this._started = true;
      return this.is_done();
    },
    
    /*
     * Returns true on the first run.
     */
    is_firstrun: function() {
      return !this._started;
    },
    
    /*
     * Returns true if the output should be performed after a pause.
     */
    should_pause: function() {
      return this._element.attr("data-prepause") && this.is_firstrun();
    },
    
    /*
     * Returns the desired interval until the next update should occur.
     */
    get_interval: function() {
      if(this.should_pause()) {
        return parseInt(this._element.attr("data-prepause"));
      } else if(this.is_waiting()) {
        return 350;
      } else {
        return 10;
      }
    },
    
    /*
     *
     */
    toString: function() {
      return this._element.attr("data-text");
    },
    
  }, {
    /*
     * properties
     */
    getset: [['BoxId', '_box_id']]
});


/**
 * Creates a couple of Typeboxes when initiated and manages their filling,
 * by calling their update methods repetitively.
 */
var Typewriter = $.Class.create({
    /*
     * properties
     */
    
    /*
     * Constructs a new typewriter for the given DOM Object ID.
     */
    initialize: function(box_id, activator) {
      this._parts = [];
      this._box_id = box_id;
      this._box = $(box_id);
      this._max_iterations = parseInt(this._box.attr("data-iterations"));
      this.load_parts();
      $('#'+activator).click(jQuery.proxy(this.register, this));
    },
    
    /*
     * Registers the document's click functionality.
     */
    register: function() {
      if(this._box.is(":hidden")) {
        this._box.show("fast", jQuery.proxy(this.type, this));
      }
    },
    
    /*
     * Creates a Typebox instance from the given DOM object.
     */
    load_part: function(part) {
      this._parts.push(new Typebox(part));
    },
    
    /*
     * Loads all the Typebox instances that are available.
     */
    load_parts: function() {
      var boxes = this._box.find(".fill_text");
      var parent = this;
      $.each(boxes, function(index, element) { parent.load_part(element) });
    },
    
    /*
     * Returns the Typebox instance that is currently in update progress.
     */
    get_part: function() {
      if(this._current_part == null || (this._current_part.is_done() && this._parts.length > 0))
        this._current_part = this._parts.shift();
      return this._current_part;
    },
    
    /*
     * Delegates the filling of the Typeboxes to it's respective child
     * Typebox instances.
     */
    type: function() {
      this.get_part().update();
      var timeout = this.get_part().get_interval();
      window.setTimeout(jQuery.proxy(this.type, this), timeout);
    },
    
    /*
     * 
     */
    toString: function() {
      return this.property('BoxId');
    }
  }, {
    /*
     * properties
     */
    getset: [['BoxId', '_box_id']]
});