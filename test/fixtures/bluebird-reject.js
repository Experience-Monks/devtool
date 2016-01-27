var Promise = require('bluebird');

function rejection () {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('Rejecting promise!'));
    }, 100);
  });
}

rejection();
