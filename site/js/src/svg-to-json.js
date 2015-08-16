//
// take string of svg and return json

function SVGToJSON($svg, opts) {

  //
  // //
  var $svg_json = new Object(),
      // get the regex library for matches
      _lib = new RegexLibrary();

  //
  // convert svg tags to objects
  $svg_json.json = getTagObjects();
  if(opts && opts.stats) $svg_json.stats = getTagStats();


  //
  // return the loveliness
  // an array for now.
  // maybe build out as an object model later.
  // not necessary.
  return $svg_json;


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
            name: getTagName(tag),
            type: getTagType(tag),
            pos: undefined,
            attrs: getTagAttributes(tag)
          };
      arr.push(obj);
    }

    //
    // for each object, set a tab position
    var position = 0;
    for(var o = 0; o < arr.length; o++) {
      var object = arr[o];
      // decrease if closing tag
      if(object.type === 'close') position--;
      // position determined by previous
      object.pos = position;
      // increase if open tag
      if(object.type === 'open') position++;
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
    return tag.match(_lib.__tagname)[0];
  }


  //
  // get a tag's attributes
  function getTagAttributes(tag) {
    var rawattrs = tag.match(_lib.__tagattrs) || new Array(),
        attrs = new Object();
    // for each attribute in tag
    for(var a = 0; a < rawattrs.length; a++) {
      var attr = rawattrs[a],
          key = attr.match(_lib.__attr_key)[0],
          key_exp = new RegExp(key,''),
          val = attr.replace(key_exp, '').replace(/[="']/g, ''),
          attr_obj = new Object();
      attrs[key] = val;
    }
    return attrs;
  }


  //
  // get stats for generated JSON
  function getTagStats() {
    var stats = {
      elements: new Object(),
      attributes: new Object()
    };
    for(var i = 0; i < $svg_json.json.length; i++) {
      var obj = $svg_json.json[i];
      if(obj.type != 'close') {
        // count tag name
        if(stats.elements[obj.name]) { stats.elements[obj.name]++; }
        else { stats.elements[obj.name] = 1; }

        // count attributes
        for(var k in obj.attrs) {
          if(stats.attributes[k]) { stats.attributes[k]++; }
          else { stats.attributes[k] = 1; }
        }
      }
    }
    return stats;
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
      __tagname: /[^< \/>]+/,
      // getting each attribute
      __tagattrs: /[a-zA-Z0-9-:_]+=["']?(([^"']+["'\/])|([^"' \/>]+))/g,
      // getting each attribute key
      __attr_key: /[^ =]+/
      // getting each attribute value by replacing key
    }
  }

}