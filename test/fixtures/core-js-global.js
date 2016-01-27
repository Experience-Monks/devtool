/*globals self*/
// Testing the core-js "global" check to ensure it
// returns a Node-like result with --no-browser-globals
// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
var hasWindow = typeof window !== 'undefined' && window.Math === Math;
if (hasWindow) {
  console.log('window');
  // global = window;
} else {
  if (typeof self !== 'undefined' && self.Math === Math) {
    console.log('self');
    // global = self;
  } else {
    console.log('function');
    // global = Function('return this')();
  }
}
