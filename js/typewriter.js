var TIMEOUTS = new Array();
TIMEOUTS['data-timeout-letter'] =  15;
TIMEOUTS['data-timeout-word']   = 350;

/*
 * Returns the desired timeout for the given element (DOM object) and type
 * (timeout-letter or timeout-wait). These have default values that will be
 * returned if the given element doesn't have a valid data-timeout-XXX
 * attribute set.
 */
function get_timeout(element, type, default_value) {
  var timeout = parseInt(element.attr(type));
  if(isNaN(timeout) || timeout <= 0) { timeout = default_value }
  return timeout;
}

/**
 * Wraps an element that is to be filled with text.
 */
var Typebox = $.Class.create({
    /*
     * properties
     */
    _max_waiting : 10,
    _max_iterations: 5,
    _possible_chars : "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    
    /*
     * Wrap the passed element into a new Typebox.
     */
    initialize: function(element, should_cycle, timeout_letter, timeout_wait) {
      this._fixed = "";
      this._current = "";
      this._position = 0;
      this._iteration = 0;
      this._waited = 0;
      this._started = false;
      this._element = $(element);
      this._text = this._element.html();
      this._in_tag = false;
      this._element.html('');
      this._should_cycle = should_cycle;
      this.set_timeouts(timeout_letter, timeout_wait);
    },
    
    /*
     * Sets the timeouts to use.
     */
    set_timeouts: function(timeout_letter, timeout_wait) {
      this._timeout_letter = get_timeout(this._element,
          'data-timeout-letter', timeout_letter);
      this._timeout_wait = get_timeout(this._element,
          'data-timeout-wait', timeout_wait);
    },
    
    /*
     * Returns the current (real) character that is about to be written.
     */
    current_char: function() {
      return this._text[this._position];
    },
    
    /*
     * Returns a randomly generated character from the list of all possible
     * characters.
     */
    random_char: function() {
      var index = Math.floor(Math.random() * this._possible_chars.length);
      return this._possible_chars.charAt(index);
    },
    
    /*
     * Returns true if the current character should be printed with other
     * random characters, before actually printing the correct char itself.
     * This is never the case for special characters, such as whitespaces.
     */
    should_cycle: function() {
      var should_cycle = this._should_cycle &&
        (this._iteration < (this._max_iterations - 1)) &&
          !(this.current_char() == ' ' ||
            this.current_char() == "\n" ||
            this.current_char() == "\r");
      return should_cycle;
    },
    
    /*
     * What to do when we are waiting.
     */
    handle_waiting: function() {
      var value = '.';
      this._fixed = this._current;
      // if waiting is finished, reset the text field
      if(++this._waited == this._max_waiting) {
        this._fixed = "";
        value = '';
      }
      return value;
    },
    
    /*
     * What to do when we are writing actual text.
     */
    handle_writing: function() {
      var value = this.should_cycle()
        ? this.random_char()
        : this.current_char();
      this._iteration = (this._iteration + 1) % (this._max_iterations + 1);
      if(this._iteration == 0) {
        this._position++;
        this._fixed = this._current;
      }
      return value;
    },
    
    /*
     * Calculates and returns the next character to be displayed.
     */
    get_char: function() {
      if(this.is_waiting()) {
        // display dots if in "waiting" mode
        var value = this.handle_waiting();
      } else {
        // display random letter or real character when not waiting
        var value = this.handle_writing();
      }
      return value;
    },
    
    /*
     * Returns true, when currently an HTML tag needs to be written.
     * Needed to quickly jump over these, to avoid ugliness.
     */
    in_tag: function() {
      var current = this.current_char();
      this._in_tag = (this._in_tag || current == '<') && current != '>';
      return this._in_tag;
    },
    
    /*
     * Quickly writes a tag.
     */
    write_tag: function() {
      this._current = this._fixed + this.current_char();
      $(this._element).html(this._current);
      this._fixed = this._current;
      this._position++;
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
      return this._element.attr("data-prefill") == "true" &&
        this._waited < this._max_waiting;
    },
    
    /*
     * Update the Typebox's text with new content.
     */
    update: function() {
      if(!this.is_done()) {
        // skip any tags quickly
        if(this.in_tag()) do { this.write_tag(); } while(this.in_tag())
        // in case we skipped a tag, we need to verify we're not done again
        if(!this.is_done()) {
          this._current = this._fixed + this.get_char();
          $(this._element).html(this._current);
        }
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
        return this._timeout_wait;
      } else {
        return this._timeout_letter;
      }
    },
    
    /*
     *
     */
    toString: function() {
      return this._text;
    },
});


/**
 * Creates a couple of Typeboxes when initiated and manages their filling,
 * by calling their update methods repetitively.
 */
var Typewriter = $.Class.create({
    /*
     * Common initializer functions.
     */
    init: function() {
      this._parts = [];
      this._should_cycle = this._box.attr("data-cycling") != "false";
      this._max_iterations = parseInt(this._box.attr("data-iterations"));
      this.load_parts();
      this.autostart();
    },
    
     /*
      * Constructs a new typewriter for the given DOM Object ID.
      */
     initialize: function(element) {
       this._box_id = element.id;
       this._box = $(element);
       this.init();
     },
    
    /*
     * Constructs a new typewriter for the given DOM Object ID.
     */
    initialize: function(box_id, activator) {
      this._box_id = box_id;
      this._box = $(box_id);
      this.init();
      $('#'+activator).click(jQuery.proxy(this.register, this));
    },
    
    /*
     * Performs an automatic start unless configured otherwise.
     * By default this is enabled, but it can be disabled by adding
     * data-autostart="false" to the main typewriter DOM object
     * (the one with class 'typewriter').
     */
    autostart: function() {
      if(this._box.attr("data-autostart") != "false") { this.type(); }
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
      var timeout_letter = get_timeout(this._box, 'data-timeout-letter', TIMEOUTS['data-timeout-letter']);
      var timeout_wait = get_timeout(this._box, 'data-timeout-wait', TIMEOUTS['data-timeout-wait']);
      this._parts.push(new Typebox(
        part,
        this._should_cycle,
        timeout_letter,
        timeout_wait)
      );
    },
    
    /*
     * Loads all the Typebox instances that are available.
     */
    load_parts: function() {
      var boxes = this._box.find(".typewrite");
      var parent = this;
      $.each(boxes, function(index, element) { parent.load_part(element) });
    },
    
    /*
     * Returns the Typebox instance that is currently in update progress.
     */
    get_part: function() {
      if(this._current_part == null || (this._current_part.is_done() && 
          this._parts.length > 0))
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
      return this._box_id;
    }
});

$(document).ready(function() {
  var typewriters = [];
  $(".typewriter").each(function(index, element) {
    typewriters.push(new Typewriter(element));
  });
});