const axios = require('axios');

const test = () => {
    axios.defaults.baseURL = 'http://localhost:5000/api';
    console.log('Case 1: axios.get("/auth/me")');
    // We can't actually call it, but we can check the config if we could intercept it.
    // Or just look at how axios merges.
    // Actually, let's just use the merge logic if possible.
};

// Axios logic:
// if (url && baseURL && !isAbsoluteURL(url)) {
//   url = combineURLs(baseURL, url);
// }

function isAbsoluteURL(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z0-9+\-.]*:)?\/\//i.test(url);
}

function combineURLs(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
}

console.log('Result for /auth/me:', combineURLs('http://localhost:5000/api', '/auth/me'));
console.log('Result for auth/me:', combineURLs('http://localhost:5000/api', 'auth/me'));
