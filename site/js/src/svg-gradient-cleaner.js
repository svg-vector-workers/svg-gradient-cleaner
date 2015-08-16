function Cleaner(params) {

  var cleaner = {
    svg_data: {}
  };


  //
  // set up DOM elements and bind events to DOM
  cleaner.setup = function() {

    //
    // codemirror options
    var $cm_opts = {
      theme: 'base16-dark',
      mode: 'xml',
      htmlMode: true,
      lineNumbers: true
    }

    //
    // input cleaner object
    var $ip = document.getElementById(params.input_id);
    cleaner.$input = CodeMirror(function(elt) {
      $ip.parentNode.replaceChild(elt, $ip);
    }, {
      value: $ip.value,
      mode: $cm_opts.mode,
      htmlMode: $cm_opts.htmlMode,
      theme: $cm_opts.theme,
      lineNumbers: $cm_opts.lineNumbers
    });

    //
    // output cleaner object
    var $op = document.getElementById(params.output_id);
    cleaner.$output = CodeMirror(function(elt) {
      $op.parentNode.replaceChild(elt, $op);
    }, {
      value: $op.value,
      mode: $cm_opts.mode,
      htmlMode: $cm_opts.htmlMode,
      theme: $cm_opts.theme,
      lineNumbers: $cm_opts.lineNumbers
    });

    //
    // triggering
    cleaner.$trigger = document.getElementById(params.trigger_id);

    // bind main cleaner method to trigger click
    cleaner.$trigger.addEventListener('click', cleaner.cleanHandler);

    //
    // switch to json toggle
    cleaner.$switch = document.getElementById(params.switch_id);

    // bind switch method to toggle click
    cleaner.$mode = 'svg';
    cleaner.$switch.addEventListener('click', function() {
      if(cleaner.$mode == 'svg') {
        cleaner.switchFormat('json');
      } else {
        cleaner.switchFormat('svg');
      }
    });

    //
    // temporarily converting on load
    cleaner.cleanHandler();
  }


  //
  // get cleaned code, store it, and output it
  cleaner.cleanHandler = function() {
    // set input
    cleaner.svg_data.input = cleaner.$input.getValue();
    // set cleaned code
    cleaner.svg_data.output = cleaner.cleanSVG();
    // set output value
    cleaner.$output.setValue(cleaner.svg_data.output.value);
    // make sure in svg mode
    cleaner.setMode('svg');
    // show switch if not shown
    if(!cleaner.$switch.className.match('active')) cleaner.$switch.className += " active";
    // format output
    cleaner.format(cleaner.$output);
  }


  //
  // run filters on SVG
  cleaner.cleanSVG = function() {
    //
    var res;

    //
    // turning svg into json object
    cleaner.svg_data.svg_source = new SVGToJSON(cleaner.svg_data.input).json;

    // finding all gradients
    cleaner.svg_data.gradients_source = cleaner.findGradients(cleaner.svg_data.svg_source);
    // will hold clean gradients
    cleaner.svg_data.gradients = new Array();

    // process found gradients
    return cleaner.processGradients();

  }


  //
  // find gradients in svg json
  cleaner.findGradients = function(svg_json) {
    var gradients = new Array();

    // for each tag
    for(var i = 0; i < svg_json.length; i++) {
      var el = svg_json[i];

      // if a gradient
      if(el.name.match(cleaner.lib.__gradient)) {

        // handle types of gradient tags
        switch(el.type) {

          // open tags find all containing stops to create gradient
          case 'open':
            var $gradient = {
              type: 'full',
              position: i,
              name: el.name,
              attrs: el.attrs,
              stops: new Array(),
              stops_str: "",
              stop_count: 0
            };

            var finding_stops = true;

            while(finding_stops) {
              i++;
              var stop = svg_json[i];
              if(stop.name != 'stop') {
                finding_stops = false;
              } else {
                $gradient.stop_count++;
                $gradient.stops.push(stop.attrs);
                $gradient.stops_str += JSON.stringify(stop.attrs).replace(/[{}\"\',:]/g,'');
              }
            }
            gradients.push($gradient);
            break;


          case 'closeself':
            var $gradient = {
              type: 'ref',
              position: i,
              stop_count: 0,
              name: el.name,
              attrs: el.attrs
            };
            gradients.push($gradient);
            break;
        }

      }

    }

    return gradients;
  }


  //
  // //
  cleaner.processGradients = function() {

    // if any gradients exist
    if(cleaner.svg_data.gradients_source) {

      // for each match
      for (var match = 0; match < cleaner.svg_data.gradients_source.length; match++) {

        // grab the regex library
        var _lib = cleaner.lib;

        // store the current gradient
        var gradient = cleaner.svg_data.gradients_source[match];

        //
        // if we're past the first match, we need to start looking for duplicate stops and xlink them
        if (match > 0 && gradient.stops && gradient.stops.length) {
          // checking flag
          var checking = true;

          // see if stops match a previous stops
          for (var s = match; s > 0; s--) {

            // if stops match previous stops
            if (gradient.stops_str == cleaner.svg_data.gradients[s - 1].stops_str && checking) {
              checking = false;

              // remove stops value
              gradient.stops = null;
              gradient.stops_str = '';

              // gradient type is now a ref
              gradient.type = 'ref';

              // ref id
              var ref_id = cleaner.svg_data.gradients[s - 1].attrs.id;

              // add xlink attribute
              gradient.attrs['xlink:href'] = '#' + ref_id;

              // sort by is ref id
              gradient.sort_by = ref_id  + "-lvl-2";

            } else {

              // sort by is id
              gradient.sort_by = gradient.attrs.id + "-lvl-1";

            }
          }
        } else {

          // first match or no stops
          if(gradient.attrs['xlink:href']) {
            // sort by is xlink
            gradient.sort_by = gradient.attrs['xlink:href'].replace(/#/,'') + "-lvl-2";
            // no stops
            gradient.stops = null;
            gradient.stops_str = '';
          } else {
            // sort by is id
            gradient.sort_by = gradient.attrs.id + "-lvl-1";
          }

        }

        //
        // add gradient to gradients
        cleaner.svg_data.gradients.push(gradient);

      }


      //
      // rewrite svg array
      cleaner.svg_data.svg = cleaner.buildSVG();

      //
      // turn array into new svg
      output = cleaner.writeSVG();

      // response is success with formatted gradients
      return { message: 'success', value: output }

    } else {

      // response is error
      return { message: 'error', value: 'No gradients found.' };

    }
  }


  //
  // //
  cleaner.buildSVG = function() {
    //
    // loop through gradients and clean up source
    var svg = new Array(),
        // tmp clone of source for manipulation
        svg_src_tmp = cleaner.svg_data.svg_source.slice(0);


    //
    // for each gradient, remove from svg source
    var relative_index = 0;
    for(var g = 0; g < cleaner.svg_data.gradients.length; g++) {
      // grabbing the gradient
      var gradient = cleaner.svg_data.gradients[g],
          // how many items we are going to remove from array (stops, closing tags included)
          remove_amount = (gradient.stop_count > 0) ? gradient.stop_count + 2 : 1;
      // remove items from array
      svg_src_tmp.splice(gradient.position - relative_index, remove_amount);
      // adjust the relative index since we just removed a bunch of shit
      relative_index += remove_amount;
    }




    //
    // sort gradients by sort_by property
    cleaner.svg_data.gradients.sort(function(a, b) {
        if (a.sort_by < b.sort_by)
          return -1;
        if (a.sort_by > b.sort_by)
          return 1;
        return 0;
    });


    //
    // detect defs. if exist, do nothing. else create.
    var defs_index = null,
        defs_inc = 0;

    // look for defs index
    while(!defs_index) {
      // if it is a def
      if(cleaner.svg_data.svg_source[defs_inc].name == 'defs') defs_index = defs_inc + 1;
      // if we havent hit the end
      if(defs_inc < cleaner.svg_data.svg_source.length - 1) {
        // go to next item
        defs_inc++;
      } else {
        // no defs found, we need to inject a defs element
        cleaner.svg_data.svg_source.splice(1, 0, {
          attrs: {}, name: 'defs', pos: 1, type: 'open',
        }, {
          attrs: {}, name: 'defs', pos: 1, type: 'close',
        });
        // and set the defs index
        defs_index = 2;
      }
    }

    //
    // reinject gradients into tmp src
    for(var g = 0; g < cleaner.svg_data.gradients.length; g++) {
      var gradient = cleaner.svg_data.gradients[g];

      // inject the gradient open tag
      inject({
        name: gradient.name,
        type: (gradient.type == 'ref') ? 'closeself' : 'open',
        pos: 2,
        attrs: gradient.attrs
      });

      // inject the gradient stops and close tag
      if(gradient.type != 'ref') {
        if(gradient.stops) {
          for(var i = 0; i < gradient.stops.length; i++) {
            var stop = gradient.stops[i];
            // inject the closing tag
            inject({
              name: 'stop',
              type: 'closeself',
              pos: 3,
              attrs: stop
            });
          }
        }

        // inject the closing tag
        inject({
          name: gradient.name,
          type: 'close',
          pos: 2,
          attrs: gradient.attrs
        });
      }
    }

    function inject(obj) {
      svg_src_tmp.splice(defs_index++, 0, obj);
    }


    return svg_src_tmp;

  }


  //
  // //
  cleaner.writeSVG = function() {
    var string = "";
    for(var i = 0; i < cleaner.svg_data.svg.length; i++) {
      string += writeTag(cleaner.svg_data.svg[i]);
    }

    return string;

    function writeTag(obj) {
      var str = '<';
      switch(obj.type) {
        case 'open':
          str += obj.name + attrsToString(obj.attrs) + '>';
          break;
        case 'closeself':
          str += obj.name + attrsToString(obj.attrs) + '/>';
          break;
        case 'close':
          str += '/' + obj.name + '>';
          break;
      }
      return str;
    }

    function attrsToString(attrs) {
      var attrs_str = '';
      for(var key in attrs) {
        attrs_str += ' ' + key + '="' + attrs[key] + '"';
      }
      return attrs_str;
    }

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
  // switch output to different value
  cleaner.switchFormat = function(which) {
    cleaner.setMode(which);
    if(which == 'svg') {
      cleaner.$output.setValue(cleaner.svg_data.output.value);
    } else if (which == 'json') {
      cleaner.$output.setValue(JSON.stringify(cleaner.svg_data.svg));
    }
    // format the text
    cleaner.format(cleaner.$output);
  }


  //
  // switch output to different value
  cleaner.setMode = function(which) {
    cleaner.$mode = which;
    switch(which) {
      case 'json':
        cleaner.$output.setOption('mode', 'application/ld+json');
        cleaner.$switch.innerHTML = 'Switch to SVG';
        break;
      case 'svg':
        cleaner.$output.setOption('mode', 'xml');
        cleaner.$switch.innerHTML = 'Switch to JSON';
    }
  }


  //
  // regular expressions
  cleaner.lib = {
    // if element name is a gradient
    __gradient: /Gradient/
  }



  //
  // //
  cleaner.setup();


  //
  // //
  return cleaner;


}