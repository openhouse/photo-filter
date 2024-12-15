import { helper } from '@ember/component/helper';

export default helper(function contains([item, array]) {
  return array.includes(item);
});
