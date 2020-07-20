function getRandom(arr, n) {
  let users = [...new Set(arr)];
  if (users.length < n) throw new RangeError("getRandom: more elements taken than available");
  users.sort( function() { return 0.5 - Math.random() } );
  var users100 = users.slice(0, n);
  return users100;
}

exports.getRandom = getRandom;
