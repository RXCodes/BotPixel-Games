const serialize = function(dictionary) {
  let newDictionary = JSON.parse(JSON.stringify(dictionary));
  Object.keys(newDictionary).forEach(function(key) {
    if (typeof newDictionary[key] == 'number') {
      newDictionary[key] = JSON.stringify(newDictionary[key]);
    }
  });
  return newDictionary;
}

exports.serialize = serialize;