import { helper } from '@ember/component/helper';

export default helper(function capitalize([str]) {
  if (typeof str !== 'string') return '';
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
});
