
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
    cleaner.gradients = {}


    // finding all gradients
    cleaner.gradients.found = input_value.match(cleaner.lib.__gradients);
    cleaner.gradients.clean = [];

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
            stops_str = "  " + stops.join("\n ");

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
        // add gradient to gradients
        cleaner.gradients.clean.push({
          type: type, id: id, attrs: attrs, stops: stops, stops_str: stops_str
        });

        //
        // remove gradient from original location
        input_value = input_value.replace(gradient, "");
      }

      // console.log(gradients);

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
      res = {
        message: "success",
        value: input_value
      }

    }

    return res || { message: "error", value: "No gradients found." };
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
    __gradients: /(<[a-zA-Z]+Gradient[\S\s]+?<\/[a-zA-Z]+Gradient>)/g,
    __gradientTag: /<[a-zA-Z]+Gradient[\S\s]+?>/,
    __gradientType: /[a-z]+Gradient/,
    __id: /id=".*?"/,
    __id_val: /id="(.*)?"/,
    __attrs: /[a-zA-Z0-9-_]+=".+?"/g,
    __stops: /<stop.*(\/>|<\/stop>)/g
  }


  //
  // //
  cleaner.setup();


  //
  // //
  return cleaner;


}