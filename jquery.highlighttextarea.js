/*!
 * jQuery highlightTextarea v3.0.0
 * Copyright 2014 Damien "Mistic" Sorel (http://www.strangeplanet.fr)
 * Licensed under MIT (http://opensource.org/licenses/MIT)
 */
/*
 * Dependencies:
 *    - jQuery
 *    - jQueryUI (optional)
 */

(function($){
    "use strict";

    // Highlighter CLASS DEFINITON
    // ===============================
    var Highlighter = function($el, options) {
        // global variables
        this.settings = $.extend({}, Highlighter.DEFAULTS);
        this.scrollbarWidth = Utilities.getScrollbarWidth();
        this.isInput = $el[0].tagName.toLowerCase()=='input';
        this.active = false;

        // build HTML
        this.$el = $el;

        this.$el.wrap('<div class=highlightTextarea></div>');
        this.$main = this.$el.parent();

        this.$main.prepend('<div class=container><div class=highlighter></div></div>');
        this.$container = this.$main.children().first();
        this.$highlighter = this.$container.children();

        this.setOptions(options);

        // set id
        if (this.settings.id) {
            this.$main[0].id = this.settings.id;
        }

        // resizable
        if (this.settings.resizable) {
            this.applyResizable();
        }

        // run
        this.updateCss();
        this.bindEvents();
        this.highlight();
    };

    Highlighter.DEFAULTS = {
        words: {},
        ranges: {},
        sentence: {},
        color: '#ffff00',
        caseSensitive: true,
        resizable: false,
        id: '',
        debug: false
    };

    // PUBLIC METHODS
    // ===============================
    /*
     * Refresh highlight
     */
    Highlighter.prototype.highlight = function() {
        var text = Utilities.htmlEntities(this.$el.val()),
            that = this;

        if(this.settings.sentence != "") {
        	var phrase = this.settings.sentence.text;
        	text = text.replace(/&amp;/g,"&");
          text = text.replace(phrase, '<span class="highlight" style="background-color:'+ this.settings.color +';">'+phrase+'</span>');
          
        } else {
          $.each(this.settings.words, function(color, words) {
              text = text.replace(
                  new RegExp('('+ words.join('|') +')', that.regParam),
                  '<span class="highlight" style="background-color:'+ color +';">$1</span>'
              );
          });
        }
        $.each(this.settings.ranges, function(i, range) {
            text = Utilities.strInsert(text, range.end, '</span>');
            text = Utilities.strInsert(text, range.start, '<span class="highlight" style="background-color:'+ range.color +';">');
        });

        this.$highlighter.html(text);
        this.updateSizePosition();
    };

    /*
     * Change highlighted words
     * @param words {mixed}
     */
    Highlighter.prototype.setWords = function(words) {
        this.setOptions({ words: words, ranges: {} });
    };

    Highlighter.prototype.setSentence = function(sentence) {
        this.setOptions({ sentence: sentence, ranges: {} });
    };

    /*
     * Change highlighted ranges
     * @param ranges {mixed}
     */
    Highlighter.prototype.setRanges = function(ranges) {
        this.setOptions({ words: {}, ranges: ranges });
    };

    /*
     * Enable highlight and events
     */
    Highlighter.prototype.enable = function() {
        this.bindEvents();
        this.highlight();
    };

    /*
     * Disable highlight and events
     */
    Highlighter.prototype.disable = function() {
        this.unbindEvents();
        this.$highlighter.empty();
    };

    /*
     * Remove the plugin
     */
    Highlighter.prototype.destroy = function() {
        this.disable();

        Utilities.cloneCss(this.$container, this.$el, [
            'background-image','background-color','background-position','background-repeat',
            'background-origin','background-clip','background-size','background-attachment'
        ]);

        this.$main.replaceWith(this.$el);

        this.$el.removeData('highlighter');
    };

    // PRIVATE METHODS
    // ===============================
    /*
     * Change options
     * @param options {object}
     */
    Highlighter.prototype.setOptions = function(options) {
        if (typeof options != 'object' || $.isEmptyObject(options)) {
            return;
        }

        $.extend(this.settings, options);
        this.regParam = this.settings.caseSensitive ? 'gm' : 'gim';

        if (!$.isEmptyObject(this.settings.words)) {
            this.settings.words = Utilities.cleanWords(this.settings.words, this.settings.color);
            this.settings.ranges = {};
        } else if (!$.isEmptyObject(this.settings.sentence)) {
            this.settings.ranges = {};
        } else if (!$.isEmptyObject(this.settings.ranges)) {
            this.settings.words = {};
            this.settings.ranges = Utilities.cleanRanges(this.settings.ranges, this.settings.color);
        }

        if (this.settings.debug) {
            this.$main.addClass('debug');
        }
        else {
            this.$main.removeClass('debug');
        }

        if (this.active) {
            this.highlight();
        }
    };

    /*
     * Attach event listeners
     */
    Highlighter.prototype.bindEvents = function() {
        if (this.active) {
            return;
        }
        this.active = true;

        var that = this;

        // prevent positioning errors by always focusing the textarea
        this.$highlighter.on({
            'this.highlighter': function() {
                that.$el.focus();
            }
        });

        // add triggers to textarea
        this.$el.on({
            'input.highlighter': Utilities.throttle(function() {
                this.highlight();
            }, 100, this),

            'resize.highlighter': Utilities.throttle(function() {
                this.updateSizePosition(true);
            }, 50, this),

            'scroll.highlighter select.highlighter': Utilities.throttle(function() {
                this.updateSizePosition();
            }, 50, this)
        });

        if (this.isInput) {
            this.$el.on({
                // Prevent Cmd-Left Arrow and Cmd-Right Arrow on Mac strange behavior
                'keydown.highlighter keypress.highlighter keyup.highlighter': function() {
                    setTimeout($.proxy(that.updateSizePosition, that), 1);
                },

                // Force Chrome behavior on all browsers: reset input position on blur
                'blur.highlighter': function() {
                    this.value = this.value;
                    this.scrollLeft = 0;
                    that.updateSizePosition.call(that);
                }
            });
        }
    };

    /*
     * Detach event listeners
     */
    Highlighter.prototype.unbindEvents = function() {
        if (!this.active) {
            return;
        }
        this.active = false;

        this.$highlighter.off('click.highlighter');
        this.$el.off('input.highlighter resize.highlighter scroll.highlighter'
            +' keydown.highlighter keypress.highlighter keyup.highlighter'
            +' select.highlighter blur.highlighter');
    };

    /*
     * Update CSS of wrapper and containers
     */
    Highlighter.prototype.updateCss = function() {
        // the main container has the same size and position than the original textarea
        Utilities.cloneCss(this.$el, this.$main, [
            'float','vertical-align'
        ]);
        this.$main.css({
            'width':    this.$el.outerWidth(true),
            'height': this.$el.outerHeight(true)
        });

        // the highlighter container is positionned at "real" top-left corner of the textarea and takes its background
        Utilities.cloneCss(this.$el, this.$container, [
            'background-image','background-color','background-position','background-repeat',
            'background-origin','background-clip','background-size','background-attachment',
            'padding-top','padding-right','padding-bottom','padding-left'
        ]);
        this.$container.css({
            'top':        Utilities.toPx(this.$el.css('margin-top')) + Utilities.toPx(this.$el.css('border-top-width')),
            'left':     Utilities.toPx(this.$el.css('margin-left')) + Utilities.toPx(this.$el.css('border-left-width')),
            'width':    this.$el.width(),
            'height': this.$el.height()
        });

        // the highlighter has the same size than the "inner" textarea and must have the same font properties
        Utilities.cloneCss(this.$el, this.$highlighter, [
            'font-size','font-family','font-style','font-weight','font-variant','font-stretch',
            'line-height','vertical-align','word-spacing','text-align','letter-spacing'
        ]);

        // now make the textarea transparent to see the highlighter through
        this.$el.css({
            'background': 'none'
        });
    };

    /*
     * Apply jQueryUi Resizable if available
     */
    Highlighter.prototype.applyResizable = function() {
        if (jQuery.ui) {
            this.$el.resizable({
                'handles': 'se',
                'resize': Utilities.throttle(function() {
                    this.updateSizePosition(true);
                }, 50, this)
            });
        }
    };

    /*
     * Update size and position of the highlighter
     * @param forced {boolean} true to resize containers
     */
    Highlighter.prototype.updateSizePosition = function(forced) {
        // resize containers
        if (forced) {
            this.$main.css({
                'width':    this.$el.outerWidth(true),
                'height': this.$el.outerHeight(true)
            });
            this.$container.css({
                'width':    this.$el.width(),
                'height': this.$el.height()
            });
        }

        var padding = 0, width;

        if (!this.isInput) {
            // account for vertical scrollbar width
            if ((
                    this.$el[0].clientHeight < this.$el[0].scrollHeight
                    && this.$el.css('overflow') != 'hidden'
                    && this.$el.css('overflow-y') != 'hidden'
                )
                || this.$el.css('overflow') == 'scroll'
                || this.$el.css('overflow-y') == 'scroll'
            ) {
                padding = this.scrollbarWidth;
            }

            width = this.$el.width()-padding;
        }
        else {
            // TODO: There's got to be a better way of going about this than just using 99999px...
            width = 99999;
        }

        this.$highlighter.css({
            'width': width,
            'height': this.$el.height() + this.$el.scrollTop(),
            'top': -this.$el.scrollTop(),
            'left': -this.$el.scrollLeft()
        });
    };


    // Utilities CLASS DEFINITON
    // ===============================
    var Utilities = function(){};

    /*
     * Get the scrollbar with on this browser
     */
    Utilities.getScrollbarWidth = function() {
        var parent = $('<div style="width:50px;height:50px;overflow:auto"><div>&nbsp;</div></div>').appendTo('body'),
            child = parent.children(),
            width = child.innerWidth() - child.height(100).innerWidth();

        parent.remove();

        return width;
    };

    /*
     * Copy a list of CSS properties from one object to another
     * @param from {jQuery}
     * @param to {jQuery}
     * @param what {string[]}
     */
    Utilities.cloneCss = function(from, to, what) {
        for (var i=0, l=what.length; i<l; i++) {
            to.css(what[i], from.css(what[i]));
        }
    };

    /*
     * Convert a size value to pixels value
     * @param value {mixed}
     * @return {int}
     */
    Utilities.toPx = function(value) {
        if (value != value.replace('em', '')) {
            var el = $('<div style="font-size:1em;margin:0;padding:0;height:auto;line-height:1;border:0;">&nbsp;</div>').appendTo('body');
            value = Math.round(parseFloat(value.replace('em', '')) * el.height());
            el.remove();
            return value;
        }
        else if (value != value.replace('px', '')) {
            return parseInt(value.replace('px', ''));
        }
        else {
            return parseInt(value);
        }
    };

    /*
     * Converts HTMl entities
     * @param str {string}
     * @return {string}
     */
    Utilities.htmlEntities = function(str) {
        if (str) {
            return $('<div></div>').text(str).html();
        }
        else {
            return '';
        }
    };

    /*
     * Inserts a string in another string at given position
     * @param string {string}
     * @param index {int}
     * @param value {string}
     * @return {string}
     */
    Utilities.strInsert = function(string, index, value) {
        return string.slice(0, index) + value + string.slice(index);
    };

    /*
     * Apply throttling to a callback
     * @param callback {function}
     * @param delay {int} milliseconds
     * @param context {object|null}
     * @return {function}
     */
    Utilities.throttle = function(callback, delay, context) {
        var state = {
            pid: null,
            last: 0
        };

        return function() {
            var elapsed = new Date().getTime() - state.last,
                    args = arguments,
                    that = this;

            function exec() {
                state.last = new Date().getTime();

                if (context) {
                    return callback.apply(context, Array.prototype.slice.call(args));
                }
                else {
                    return callback.apply(that, Array.prototype.slice.call(args));
                }
            }

            if (elapsed > delay) {
                return exec();
            }
            else {
                clearTimeout(state.pid);
                state.pid = setTimeout(exec, delay - elapsed);
            }
        };
    };

    /*
     * Formats a list of words into a hash of arrays (Color => Words list)
     * @param words {mixed}
     * @param color {string} default color
     * @return {object[]}
     */
    Utilities.cleanWords = function(words, color) {
        var out = {};

        if (!$.isArray(words)) {
            words = [words];
        }

        for (var i=0, l=words.length; i<l; i++) {
            var group = words[i];

            if ($.isPlainObject(group)) {

                if (!out[group.color]) {
                    out[group.color] = [];
                }
                if (!$.isArray(group.words)) {
                    group.words = [group.words];
                }

                for (var j=0, m=group.words.length; j<m; j++) {
                    out[group.color].push(Utilities.htmlEntities(group.words[j]));
                }
            }
            else {
                if (!out[color]) {
                    out[color] = [];
                }

                out[color].push(Utilities.htmlEntities(group));
            }
        }

        return out;
    };

    /*
     * Formats a list of ranges into a hash of arrays (Color => Ranges list)
     * @param ranges {mixed}
     * @param color {string} default color
     * @return {object[]}
     */
    Utilities.cleanRanges = function(ranges, color) {
        var out = [];

        if ($.isPlainObject(ranges) || $.isNumeric(ranges[0])) {
            ranges = [ranges];
        }

        for (var i=0, l=ranges.length; i<l; i++) {
            var range = ranges[i];

            if ($.isArray(range)) {
                out.push({
                    color: color,
                    start: range[0],
                    end: range[1]
                });
            }
            else {
                if (range.hasOwnProperty('ranges')) {
                    if ($.isPlainObject(range.ranges) || $.isNumeric(range.ranges[0])) {
                        range.ranges = [range.ranges];
                    }

                    for (var j=0, m=range.ranges.length; j<m; j++) {
                        if ($.isArray(range.ranges[j])) {
                            out.push({
                                color: range.color,
                                start: range.ranges[j][0],
                                end: range.ranges[j][1]
                            });
                        }
                        else {
                            if (range.ranges[j].length) {
                                range.ranges[j].end = range.ranges[j].start + range.ranges[j].length;
                            }
                            out.push(range.ranges[j]);
                        }
                    }
                }
                else {
                    if (range.length) {
                        range.end = range.start + range.length;
                    }
                    out.push(range);
                }
            }
        }

        out.sort(function(a, b) {
            if (a.start == b.start) {
                return a.end - b.end;
            }
            return a.start - b.start;
        });

        var current = -1;
        $.each(out, function(i, range) {
            if (range.start >= range.end) {
                $.error('Invalid range end/start');
            }
            if (range.start < current) {
                $.error('Ranges overlap');
            }
            current = range.end;
        });

        out.reverse();

        return out;
    };


    // JQUERY PLUGIN DEFINITION
    // ===============================
    $.fn.highlightTextarea = function(option) {
        var args = arguments;

        return this.each(function() {
            var $this = $(this),
                data = $this.data('highlighter'),
                options = typeof option == 'object' && option;

            if (!data && option == 'destroy') {
                return;
            }
            if (!data) {
                data = new Highlighter($this, options);
                $this.data('highlighter', data);
            }
            if (typeof option == 'string') {
                data[option].apply(data, Array.prototype.slice.call(args, 1));
            }
        });
    };
    
    
    $.fn.scrollToText = function(search) {
    	var log = false;
    	
    	/*
    	 * We don't do anything on new lines
    	 */
    	if (!search.match(/\S/)) { 
    		/*
    		 * Still find out the last position
    		 */
      	var oldpos = $(this).attr('carpos');
    	  if (oldpos == undefined) {oldpos = 0;}
    	  
    	  /*
    	   * And if we scrolled, correct it
    	   */
    	  var pdivTop = $(this).attr('pdivTop');
    	  if (pdivTop != undefined) {
    	    oldpos = parseInt(oldpos) + 30;
    	  }
    	  
				/*
				 * Remember new position, and scroll
				 */    	  
	     	$(this).attr('carpos', oldpos);
    		this.scrollTop(oldpos);
    		
    		return; 
    	}
    	
    	/*
    	 * Look for the phrase
    	 */
    	var text   = $(this).val();
    	var charNo = text.indexOf(search);
    	
    	/*
    	 * If we don't find it, return
    	 */
    	if(charNo < 0) return;
    	
    	/*
    	 * Add an anchor for finding the character later
    	 * and add it to the String between the first character
    	 * of the phrase and the rest of it. This gives us something
    	 * like
    	 *
    	 * bla bla p<span id="anch"></span>hrase bla bla
    	 *
    	 */
    	var anch = '<span id="anch"></span>';
    	text = text.substring(0, charNo) + anch + text.substring(charNo);
    	
    	/*
    	 * Create a div as a copy of the textarea
    	 */
	    var copyDiv = $('<div></div>')
	                    .append(text.replace(/\n/g, '<br />'))           // making newlines look the same
	                    .css('width', $(this).attr('clientWidth'))       // width without scrollbar
	                    .css('font-size', $(this).css('font-size'))
	                    .css('font-family', $(this).css('font-family'))
	                    .css('padding', $(this).css('padding'));
			    	
    	/*
    	 * Put the div behind the text area because .positio() does not work on
    	 * invisible elements
    	 */
    	copyDiv.insertAfter($(this));
    	
    	/*
    	 * Now with the copy of the textarea, we can try to find out the position
    	 * of the positional span - which we had entered before - relative to the
    	 * text area's parent div.
    	 */
    	var spanTop = copyDiv.find('SPAN#anch').offset().top;
    	var pdivTop = copyDiv.find('SPAN#anch').closest('DIV').offset().top;
    	$(this).attr('pdviTop', pdivTop);
    	
    	/*
    	 * If, for some reason, the top of the span is above the top of the div,
    	 * we have to reposition our span downwards. Otherwise, we have to pull
    	 * it up.
    	 */
    	var pos = spanTop - pdivTop;
    	var oldpos = $(this).attr('carpos');
    	if (oldpos == undefined) {oldpos = pos;}
    	
    	var oldTop = $(this).attr('oldtop');
    	if (oldTop == undefined) {oldTop = spanTop;}
    	if(spanTop <= oldTop) spanTop = oldTop;
    	$(this).attr('oldtop', spanTop);
    	
    	
    	if(pos == 0) pos = oldpos;
    	
    	/*
    	 * We also need the height of the textarea
    	 */
    	var cheight = this[0].clientHeight;
    	
    	if(log) {
    	  console.log("Looking for  : " + search);
    	  console.log("Client Height: " + cheight + ", spanTop: " + spanTop + ", pdivTop: " + pdivTop);
    	  console.log("Position     : " + pos);
    	}
    	
    	/*
    	 * Finally, we want to scroll to some position. We just need to findout,
    	 * to which position now.
    	 */
    	var scrollTo = pos - Math.round(cheight / 2);
    	this.scrollTop(scrollTo);
    	
    	$(this).attr('carpos', pos);
    	
    	/*
    	 * Remove the copyied div
    	 */
    	copyDiv.remove();
    };
    
}(jQuery));