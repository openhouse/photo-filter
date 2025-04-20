import { helper } from '@ember/component/helper';

/**
 * A helper function that returns the JavaScript type
 * (as given by the built-in `typeof`) of the provided value.
 *
 * Usage in a template:
 *   {{#if (eq (type-of this.someValue) "object")}}
 *     <!-- do something if it's an object -->
 *   {{/if}}
 */
export default helper(function typeOf([value]) {
  return typeof value;
});
