const converter = require('number-to-words');
const request = require("request");

module.exports = {
  capsFirst: function (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  },

  ntwDirection: function (num) {
    var result = '';
    if (num < 10) {
      result += 'zero zero ';
      result += converter.toWords(num);
    } else if (num < 100) {
      result += 'zero ';
      result += converter.toWords(num / 10);
      result += ' ';
      result += converter.toWords(num % 10);
    } else {
      result += converter.toWords(num / 100);
      result += ' ';
      num = num % 100;
      result += converter.toWords(num / 10);
      result += ' ';
      result += converter.toWords(num % 10);
    }
    return result;
  },

  ntw: function (num) {
    var result = '';
    var arr = [];
    while (num > 0) {
      arr.push(num % 10);
      num = Math.floor(num / 10);
    }
    for (var i = arr.length - 1; i >= 0; i--) {
      result += converter.toWords(arr[i]);
      result += ' ';
    }
    return result;
  },

  logger: function (type, content) {
    request.post(process.env.webhook, {
      json: {
        content: `[${type.toUpperCase()}]\n${content}`
      }
    }, (error, res, body) => {
      if (error) {
        console.error(error)
        return
      }
    })
  }
}
