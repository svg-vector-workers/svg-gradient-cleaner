//
// take string of svg and return object

function svgToJson($svg) {

  //
  // //
  var $svg_json = new Object(),
      // get the regex library for matches
      _lib = new RegexLibrary();

  //
  // convert svg tags to objects
  $svg_json.tag_data = getTagObjects();


  //
  // return the loveliness
  // an array for now.
  // maybe build out as an object model later.
  // not necessary.
  return $svg_json.tag_data;


  //
  // convert svg tags to objects
  function getTagObjects() {
    // get array of all tags in svg
    var tags = $svg.match(_lib.__tag),
        arr = new Array();
    // for each tag, create object
    for(var t = 0; t < tags.length; t++) {
      var tag = tags[t],
          obj = {
            _name: getTagName(tag),
            _type: getTagType(tag),
            _pos: undefined,
            _attrs: getTagAttributes(tag)
          };
      arr.push(obj);
    }

    //
    // for each object, set a tab position
    var position = 0;
    for(var o = 0; o < arr.length; o++) {
      var object = arr[o];
      // decrease if closing tag
      if(object._type === 'close') position--;
      // position determined by previous
      object._pos = position;
      // increase if open tag
      if(object._type === 'open') position++;
    }

    //
    // return the array
    return arr;
  }


  //
  // get a tag's type (open, close, self-close)
  function getTagType(tag) {
    if(tag.match(_lib.__opening)) {
      return 'open';
    } else if(tag.match(_lib.__closing)) {
      return 'close';
    } else if(tag.match(_lib.__self_closing)) {
      return 'closeself';
    } else {
      return 'undefined';
    }
  }


  //
  // get a tag's name
  function getTagName(tag) {
    return tag.match(_lib.__tag_name)[0];
  }


  //
  // get a tag's attributes
  function getTagAttributes(tag) {
    var raw_attrs = tag.match(_lib.__tag_attrs) || new Array(),
        attrs = new Object();
    // for each attribute in tag
    for(var a = 0; a < raw_attrs.length; a++) {
      var attr = raw_attrs[a],
          key = attr.match(_lib.__attr_key)[0],
          key_exp = new RegExp(key,''),
          val = attr.replace(key_exp, '').replace(/[="']/g, ''),
          attr_obj = new Object();
      attrs[key] = val;
    }
    return attrs;
  }


  //
  // regex library
  function RegexLibrary() {
    return {
      // getting any tag
      __tag: /<.+?>/g,
      // opening tag
      __opening: /<[^\/]>|<[^\/]((?!\/>)[\s\S])+?[^\/]>/,
      // closing tag
      __closing: /<\/[^\/]+?>/,
      // self closing tag
      __self_closing: /<[^\/<]+?\/>/,
      // tag name
      __tag_name: /[^< \/>]+/,
      // getting each attribute
      __tag_attrs: /[a-zA-Z0-9-:_]+=["']?(([^"']+["'\/])|([^"' \/>]+))/g,
      // getting each attribute key
      __attr_key: /[^ =]+/
      // getting each attribute value by replacing key
    }
  }


  //
  // return our object
  return $svg_json;

}