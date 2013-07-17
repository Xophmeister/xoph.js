(function() {
  // Predefined validators
  var validators = {
    numeric: function(data) {
      return !isNaN(parseFloat(data)) && isFinite(data);
    },

    integer: function(data) {
      return validators.numeric(data) && data == parseInt(data, 10);
    },

    datetime: function(data) {
      return data instanceof Date || validators.integer(Date.parse(data)) || false;
    }
  };

  // Lexemes
  var lexemes = {
    whitespace: { pattern: /^\s+/ },

    comment:    { pattern: /^#.*/ },

    group: {
      pattern:   /^[()]/,

      transform: function(match) {
                   return (match === '(');
                 }
    },

    quantifier: {
      pattern:   /^([?+*]|\{\s*\d+(\s*,\s*\d+)?\s*\})/,

      transform: function(match) {
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
                         return [1, Infinity];
                         break;
 
                       case '*':
                         return [0, Infinity];
                         break;
 
                       default:
                         return [1, 1];
                         break;
                     }
                   }
                 }
    },

    name: {
      pattern:   /^[a-zA-Z$_]\w*/,

      transform: function(match, symbols) {
                   if (!(match in symbols)) {
                     // Unknown symbol
                     throw new Error('Lexer found unknown validator symbol: ' + match);
                   }
                   return symbols[match];
                 }
    }
  };

  // RegArray constructor
  var init = function(expression /*, validators */) {
    // Expression must be a string
    if (typeof expression != 'string') {
      throw new TypeError('Expression must be a string');
    }

    var v   = Object.create(validators),  // "Copy" presets
        lex = [],
        ast = [];

    // Union custom validators, if any
    switch (typeof arguments[1]) {
      case 'undefined':
        // Nothing set
        break;

      case 'object':
        for (custom in arguments[1]) {
          if (typeof arguments[1][custom] != 'function') {
            throw new TypeError('Invalid validator function: ' + custom);
          } 
          
          v[custom] = arguments[1][custom];
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

        if (!match) {
          // Unknown token
          throw new Error('Lexer found unknown token at character ' + i + ': ' + code.substr(i, 5) + '...');
        }

        // Tokenise!
        if (lexemes[l].transform) {
          lex.push({
            type:  l,
            value: lexemes[l].transform(match[0], v)
          });
        }

        i += match[0].length;
      }
    })(expression);

    // Parse
    (function(tokens) {
      var i;

      // AST node factory
      var node = function(atom, quantity) {
        return { atom: atom, quantity: quantity };
      };

      // Quantify tokens
      // FIXME This should probably be part of the lexer... :P
      for (i = tokens.length - 1; i >= 0; --i) {
        if (tokens[i].type == 'quantifier') {
          if (!i) {
            // Can't quantify nothing
            throw new Error('Parser found quantifier at beginning of expression');

          } else if (tokens[i - 1].type == 'quantifier') {
            // Can't juxtapose quantifiers
            throw new Error('Parser found juxtaposed quantifiers');
          
          } else if (tokens[i - 1].type == 'group' && tokens[i - 1].value) {
            // Can't quantify group opening
            throw new Error('Parser found quantified group opening');
          }
          
          tokens[i - 1].quantity = tokens[i].value.slice(0);
          tokens.splice(i, 1);

        } else {
          // Regular token gets default quantifier
          if (!tokens[i].quantity) {
            tokens[i].quantity = [1, 1];
          }
        }
      }

      // Recursive descent parser
      ast = (function parse(subset) {
        var branch = [],
            i = 0, j;

        while (i < subset.length) {
          switch (subset[i].type) {
            case 'name':
              branch.push(node(subset[i].value, subset[i].quantity));
              ++i;
              break;

            case 'group':
              if (!subset[i].value) {
                // We should never see a group closing
                throw new Error('Parser found unmatched group closing');
              }

              // Determine width of group
              for (j = subset.length - 1; j > i; --j) {
                if (subset[j].type == 'group' && !subset[j].value) {
                  // Found group close at j
                  branch.push(node(parse(subset.slice(i, j)), subset[j].quantity));
                  break;
                }
              }

              /* FIXME
              if (!found) {
                // Unbalanced parentheses
                throw new Error('Parser found unmatched group opening');
              }
              */

              i = j + 1;
              break;

            default:
              throw new Error('Parser found unknown token type: ' + subset[i].type);
              break;
          }
        }
        return branch;
      })(tokens);
    })(lex);

    // FSM
    // TODO
   
    this.lex = lex;
    this.ast = ast;
    
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
