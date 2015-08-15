function Cleaner(params) {
  var cleaner = {};


  // set up DOM and bind events to DOM
  cleaner.setup = function() {

    //
    // input cleaner object
    var $ip = document.getElementById(params.input_id);
    cleaner.$input = CodeMirror(function(elt) {
      $ip.parentNode.replaceChild(elt, $ip);
    }, {
      value: $ip.value,
      mode: 'xml',
      htmlMode: true,
      theme: 'base16-dark',
      lineNumbers: true
    });

    //
    // output cleaner object
    var $op = document.getElementById(params.output_id);
    cleaner.$output = CodeMirror(function(elt) {
      $op.parentNode.replaceChild(elt, $op);
    }, {
      value: $op.value,
      mode: 'xml',
      htmlMode: true,
      theme: 'base16-dark',
      lineNumbers: true
    });

    //
    // triggering
    cleaner.$trigger = document.getElementById(params.trigger_id);

    // bind main cleaner method to trigger click
    cleaner.$trigger.addEventListener('click', cleaner.cleanHandler);
  }


  //
  // get cleaned code and output it
  cleaner.cleanHandler = function() {
    var cleaned_code = cleaner.cleanSVG();
    cleaner.$output.setValue(cleaned_code.value);
    cleaner.format(cleaner.$output);
    // console.log(cleaned_code, cleaner.gradients);
  }


  //
  // run filters on SVG
  cleaner.cleanSVG = function() {
    //
    var res;

    //
    var input_value = cleaner.$input.getValue();

    //
    cleaner.gradients = {
      // finding all gradients
      found: input_value.match(cleaner.lib.__gradients),
      // will hold clean gradients
      clean: new Array()
    }

    // process found gradients
    return cleaner.processFoundGradients(input_value);

  }


  //
  // //
  cleaner.processFoundGradients = function(input_value) {

    // if any gradients exist
    if(cleaner.gradients.found) {

      // for each match
      for (var match = 0; match < cleaner.gradients.found.length;) {

        // grab the regex library
        var _lib = cleaner.lib;

        // store the current gradient
        var gradient  = cleaner.gradients.found[match++],
            tag       = gradient.match(_lib.__gradientTag)[0],
            type      = tag.match(_lib.__gradientType)[0],
            id        = tag.match(_lib.__id)[0].replace(_lib.__id_val, "$1"),
            attrs     = tag.match(_lib.__attrs),
            stops     = gradient.match(_lib.__stops),
            stops_str = (stops) ? "  " + stops.join("\n ") : "";

        //
        // if we're past the first match, we need to start looking for duplicate stops and xlink them
        if (match > 1) {
          // checking flag
          var checking = true;
          // see if stops match a previous stops
          for (var s = match - 1; s > 0; s--) {
            // if stops match previous stops
            if (stops_str == cleaner.gradients.clean[s - 1].stops_str && checking) {
              checking = false;
              // remove stops value
              stops_str = "";
              // add xlink attribute
              attrs.splice(1, 0, "xlink:href=\"#" + cleaner.gradients.clean[s - 1].id + "\"");
            };
          }
        }


        //
        // clean attributes
        attrs = cleaner.cleanAttributes(attrs);


        //
        // add gradient to gradients
        cleaner.gradients.clean.push({
          type: type, id: id, attrs: attrs, stops: stops, stops_str: stops_str
        });


        //
        // remove gradient from original location
        input_value = input_value.replace(gradient, "");
      }

      console.log(cleaner.gradients.clean);


      //
      // writing defs
      var defs = "";
      // for each gradient
      for(var g = 0; g < cleaner.gradients.clean.length; g++) {
        var gradient = cleaner.gradients.clean[g];
        defs += "\n<" + gradient.type + " " + gradient.attrs.join(" ");
        if (gradient.stops_str) {
          defs += ">\n" + gradient.stops_str + "\n</" + gradient.type + ">";
        } else {
          defs += " />";
        }
        defs += "\n";
      }

      // if defs already exists, we append after opening def tag
      if(input_value.indexOf("<defs>") > -1) {
        input_value = input_value.replace("<defs>", "<defs>\n"+defs);
      // if defs doesn't exist, we wrap gradients with it
      } else {
        input_value = input_value.replace(/(<svg.*?>)/g, "$1\n<defs>\n"+defs+"</defs>\n");
      }

      // response is success with formatted gradients
      return { message: "success", value: input_value }

    } else {

      // response is error
      return { message: "error", value: "No gradients found." };

    }
  }


  //
  // //
  cleaner.cleanAttributes = function(attrs) {
    var res = [];
    for (var a = 0; a < attrs.length; a++) {
      var attr = attrs[a];
      attr = (attr.match(" ")) ? attr : attr.replace(/'/g, "").replace(/"/g,"");
      res.push(attr);
    }
    console.log(res);
    return res;
  }


  //
  // format a codemirror editor
  cleaner.format = function($editor) {
    // remove all the shitty whitespace
    $editor.autoFormatRange(
      { line: 0, ch: 0 },
      { line: $editor.lineCount() }
    );
    // format indentation
    $editor.autoIndentRange(
      { line: 0, ch: 0 },
      { line: $editor.lineCount() }
    );
  }


  //
  // regular expressions
  cleaner.lib = {
    // selecting an entire gradient element
    __gradients: /(<[a-zA-Z]+Gradient([^>]|[\s])+?\/>|<[a-zA-Z]+Gradient[\S\s]+?<\/[a-zA-Z]+Gradient>)/g,
    // grabbing a gradient name
    __gradientTag: /<[a-zA-Z]+Gradient[\S\s]+?>/,
    // getting the type of gradient
    __gradientType: /[a-z]+Gradient/,
    // parsing an id out of a tag
    __id: /id=["']?([^ "']*)["' ]/,
    // get id value out of an id
    __id_val: /id=["']?([^ "']*)["' ]/,
    // getting each attribute
    __attrs: /[a-zA-Z0-9-:_]+=["']?(([^"']+["'\/])|([^"' \/>]+))/g,
    // getting an entire gradient stop
    __stops: /<stop.*(\/>|<\/stop>)/g
  }


  //
  // //
  cleaner.setup();


  //
  // //
  return cleaner;


}