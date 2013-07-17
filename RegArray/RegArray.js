(function() {
  // Predefined validators
  var validators = {
    numeric: function(data) {
      return !isNaN(parseFloat(data)) && isFinite(data);
    },

    integer: function(data) {
      return this.numeric(data) && data == parseInt(data, 10);
    },

    datetime: function(data) {
      return data instanceof Date || this.integer(Date.parse(data)) || false;
    }
  };

  // Lexemes
  var lexemes = {
    whitespace: {
      pattern:   /^\s+/,
      ignore:    true,
      translate: null
    },

    comment: {
      pattern:   /^#.*/,
      ignore:    true,
      translate: null
    },

    group: {
      pattern:   /^[()]/,
      ignore:    false,
      translate: function(match) {
        return (match === '(');
      }
    },

    quantifier: {
      pattern:   /^([?+*]|\{\s*\d+(\s*,\s*\d+)?\s*\})/,
      ignore:    false,
      translate: function(match) {
        var range = match.match(/\{\s*(\d+)(?:\s*,\s*(\d+))?\s*\}/);

        if (range) {
          range[2] = parseInt(range[2] || range[1], 10);
          range[1] = parseInt(range[1], 10);

          if (range[2] < range[1]) {
            throw new RangeError('Invalid quantifier: ' + match);
          }

          return range.slice(1, 3);

        } else {
          switch (match) {
            case '?':
              return [0, 1];
              break;

            case '+':
              return [1, null];
              break;

            case '*':
              return [0, null];
              break;

            default:
              return [0, 0];
              break;
          }
        }
      }
    },

    name: {
      pattern:   /^[a-zA-Z$_]\w*/,
      ignore:    false,
      translate: null
    }
  };

  // RegArray constructor
  var init = function(expression /*, validators */) {
    // Expression must be a string
    if (typeof expression != 'string') {
      throw new TypeError('Expression must be a string');
    }

    var v   = Object.create(validators), // "Copy" presets
        lex = [];

    // Union custom validators, if any
    switch (typeof arguments[1]) {
      case 'undefined':
        // Nothing set
        break;

      case 'object':
        for (custom in arguments[1]) {
          if (typeof arguments[1][custom] == 'function') {
            v[custom] = arguments[1][custom];
          } else {
            throw new TypeError('Invalid validator function: ' + custom);
          }
        }
        break;

      default:
        // Otherwise
        throw new TypeError('Validators must be an object of functions');
        break;
    }

    // Scan 'n' Lex
    (function(code) {
      var i = 0, match;

      while (i < code.length) {
        match = null;

        for (l in lexemes) {
          match = code.substr(i).match(lexemes[l].pattern);
          if (match) break;
        }

        if (match) {
          // Tokenise!
          if (!lexemes[l].ignore) {
            lex.push({
              type:  l,
              value: lexemes[l].translate ? lexemes[l].translate(match[0])
                                          : match[0]
            });
          }

          i += match[0].length;

        } else {
          // Unknown token
          throw new Error('Lexer found unknown token at character ' + i + ': ' + code.substr(i, 5) + '...');
        }
      }
    })(expression);

    // TODO
    // Parse
    // FSM
    
    this.lex = lex;
    
    // toString
    this.toString = function() {
      return expression;
    };
  };

  // Reference to presets as RegArray members (for external use)
  for (preset in validators) {
    init[preset] = validators[preset]
  }

  // Export, baby :)
  module.exports = Object.freeze(init);
})();
