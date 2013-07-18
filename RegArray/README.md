# RegArray

A finite state machine that verifies that the elements of an array match
a regular pattern, defined in a DSL similar to regular expressions.

## API

### Constructor: `RegArray(expression [, validators])`

We use a syntax similar to JavaScript's native `RegExp` object, for the
sake of consistency. It expects one or two arguments:

#### `expression`

The `expression` is a string that defines how an array's elements must
be patterned. It consists of quantified 'atoms', delineated by
whitespace, which correspond to an array's index.

Briefly, the language is as follows (see the [Grammar](#grammar) section
for a technical description).

* **Names** refer to specific validations that are applied against a
  respective element. Their naming follows the same standard as
  JavaScript identifiers (excluding Unicode): case-sensitive; must start
  with a letter, `$` or `_`; followed by any number of word characters.

* **Groups** allow collections of atoms to be quantified and nested
  within parentheses.

* **Quantifiers** specify the number of times an atom should occur:

 Quantifier | The preceding atom...
 ---------- | ---------------------
 `{n}`      | ...must appear exactly `n` times. By default, if a quantifier is omitted, the engine assumes `{1}`.
 `{n,m}`    | ...must appear between `n` and `m` times (inclusive). Note that `m` must be greater than `n`.
 `?`        | ...is optional. This is the same as `{0,1}`.
 `+`        | ...must appear at least once.
 `*`        | ...may appear any number of times (including none at all).

For example `id string{2} (string numeric?)+` would validate an array
that has the following structure:

 Index | Data
 :---: | ----
 0     | `34`
 1     | `'foo'`
 2     | `'bar'`
 3     | `'a'`
 4     | `'b'`
 5     | `3.141`
 6     | `'c'`
 7     | `2.718`

Presuming the `id` validator function passes `34` (i.e., `id(34) ==
true`).

#### `validators`

The `validators` parameter is optional and is used to specify element
validator functions. It should be a plain object with members having
identifiers matching those referenced in `expression`.

If the parameter is omitted, then the engine will only have access to
its internal (i.e., [predefined](#internal-validators)) validators. You
*may* override these, but that would be bad practice. A better solution
would be to alias the internal validators to your own identifiers.

For example:

```js
{
  id:      RegArray.integer,
  period:  RegArray.datetime,
  truthy:  function(data) {
             return data ? true : false;
           }
}
```

It is not necessary to specify all validators if some of them are basic
enough to fall back to the internal set:

```js
var x = new RegArray('integer+ flag', {
                                        flag: function(data) {
                                                return (data === 'COMPLETE');
                                              }
                                      });
```

Note that validator functions needn't return a `Boolean`. The FSM will
pass an element if the validator function returns any truthy value.

### Internal Validators

The following validators are available. These may be named explicitly in
the `expression`, or can be aliased to other names by referencing.

#### `RegArray.numeric`

Checks whether the array element is numeric. Note that a numeric
datatype isn't required (e.g., `'12.3e10'` will evaluate to true).

#### `RegArray.integer`

Similar to the above, but stricter insofar as it will only validate
integers.

#### `RegArray.datetime`

Checks whether the array element is a date and/or time. `Date` values
are vacuously valid; other values will be parsed using `Date.parse`
(i.e., RFC2822 or ISO 8601 format).

### Object Methods

#### `test(array)`

Checks if `array` conforms to `expression`, using the appropriate
validator functions, returning a `Boolean`.

#### `toString()`

Returns `expression`, defined in the constructor.

## Grammar

The EBNF for the language is as follows:

```ebnf
expression      = {quantified atom};
quantified atom = (atom | group), [quantifier];
group           = '(', expression, ')';
atom            = 'list' | 'of' | 'symbols';
quantifier      = '*' | '+' | '?' | '{', natural, [',', natural], '}';
natural         = non-zero, {digit};
non-zero        = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
digit           = non-zero | '0';
```
