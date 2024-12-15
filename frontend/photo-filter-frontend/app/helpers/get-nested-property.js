import { helper } from '@ember/component/helper';

export default helper(function getNestedProperty([obj, propertyPath]) {
  return propertyPath
    .split('.')
    .reduce(
      (acc, part) => (acc && acc[part] !== undefined ? acc[part] : null),
      obj,
    );
});
