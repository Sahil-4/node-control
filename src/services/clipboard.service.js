let _text = '';

function get() {
  return _text;
}

function set(text) {
  _text = String(text || '');
}

module.exports = { get, set };
