function isAbsoluteURL(url) {
  return /^([a-z][a-z0-9+\-.]*:)?\/\//i.test(url);
}

function combineURLs(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
}

function mergeURLs(baseURL, relativeURL) {
    if (relativeURL && baseURL && !isAbsoluteURL(relativeURL)) {
        return combineURLs(baseURL, relativeURL);
    }
    return relativeURL;
}

console.log('Result for /auth/me:', mergeURLs('http://localhost:5000/api', '/auth/me'));
console.log('Result for auth/me:', mergeURLs('http://localhost:5000/api', 'auth/me'));
