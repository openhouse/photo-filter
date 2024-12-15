import { helper } from '@ember/component/helper';

export default helper(function replace([str, find, replace]) {
  return str.replace(find, replace);
});
