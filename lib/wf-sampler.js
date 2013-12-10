#!/usr/bin/env node

"use strict";

var fs = require('fs')
  , path = require('path')
  , finder = require('find-files')
  , sys = require('sys')
  , optparse = require('optparse')
  , jade = require('jade')
  , stylus = require('stylus')
  , cwd = process.cwd();

var variants = {
    light: { style : 'normal', weight : '300', title: 'Light 300' }
  , lightitalic: { style : 'italic', weight : '300', title: 'Light 300 Italic' }
  , regular: { style : 'normal', weight : '400', title: 'Normal 400' }
  , normal: { style : 'normal', weight : '400', title: 'Normal 400' }
  , italic: { style : 'italic', weight : '400', title: 'Normal 400 Italic' }
  , semibold: { style : 'normal', weight : '600', title: 'Semi-Bold 600' }
  , semibolditalic: { style : 'italic', weight : '600', title: 'Semi-Bold 600 Italic' }
  , bold: { style : 'normal', weight : '700', title: 'Bold 700' }
  , bolditalic: { style : 'italic', weight : '700', title: 'Bold 700 Italic' }
  , extrabold: { style : 'normal', weight : '800', title: 'Extra-Bold 800' }
  , extrabolditalic: { style : 'italic', weight : '800', title: 'Extra-Bold 800 Italic' }
};

var font = {
    directory: null
  , family: null
  , variants: []
  , data: []
    // @see http://en.wikipedia.org/wiki/List_of_pangrams
  , panogram: 'How razorback-jumping frogs can level six piqued gymnasts!'
    // @see http://fillerati.com/
  , sampleText: [
        'After the glimpse I had had of the Martians emerging from the cylinder in which they had come to the earth from their planet, a kind of fascination paralysed my actions. I remained standing knee-deep in the heather, staring at the mound that hid them. I was a battleground of fear and curiosity.'
      , 'I did not dare to go back towards the pit, but I felt a passionate longing to peer into it. I began walking, therefore, in a big curve, seeking some point of vantage and continually looking at the sand heaps that hid these new-comers to our earth. Once a leash of thin black whips, like the arms of an octopus, flashed across the sunset and was immediately withdrawn, and afterwards a thin rod rose up, joint by joint, bearing at its apex a circular disk that spun with a wobbling motion. What could be going on there?'
    ]
  , css: 'font-style: '+ variants.normal.style +'; font-weight: '+ variants.normal.weight +'; '
};

var styleTmpl = __dirname +'/../templates/font.styl';
var styleFile = 'font.css';
var sampleTmpl = __dirname +'/../templates/sample.jade';
var sampleFile = 'index.html';

var parser = new optparse.OptionParser([
    [ '-h', '--help', 'Shows this help' ]
]);

var renderStyle = function(font) {
    var tmpl = fs.readFileSync(styleTmpl, 'utf8');
    var _variants = new stylus.nodes.Expression();
    font.variants.forEach(function(variantName) {
        _variants.push(new stylus.nodes.String(variantName));
    });
    var _get = function(data, variant) {
        stylus.utils.assertString(variant, 'variant');
        return new stylus.nodes.Literal(font.variants[variant.val][data.val]);
    };
    var _comment = function(variant) {
        stylus.utils.assertString(variant, 'variant');
        return new stylus.nodes.Literal('/* '+ font.variants[variant.val].title +' */');
    };
    stylus(tmpl)
        .set('filename', styleTmpl)
        .define('family', font.family)
        .define('_variants', _variants)
        .define('_get', _get)
        .define('_comment', _comment)
        .render(function(err, css){
            if (err) throw err;
            fs.writeFile(font.directory +'/'+ styleFile, css, 'utf8');
        });
};

var renderSample = function(font) {
    var tmpl = fs.readFileSync(sampleTmpl, 'utf8')
      , fn = jade.compile(tmpl, { filename: path, pretty: true });
    var html = fn(font);
    fs.writeFile(font.directory +'/'+ sampleFile, html, 'utf8');
};

var fetchFontVariants = function(font, callback) {
    finder(font.family, { root: font.directory, requireExts: ['.ttf'] }, function(files) {
        var pattern = new RegExp(font.family +'.*-(.*).ttf','i')
          , variantName = ''
          , variant = {}
          , i = 0;
        files.forEach(function(file) {
            variantName = file.name.match(pattern)[1].toLowerCase();
            if (variantName) {
                i++;
                console.log('Found variant: '+ variantName);
                if (variants[variantName]) {
                    variant = variants[variantName];
                    font.variants.push(variantName);
                    font.variants[variantName] = {
                        title: '#'+ i +' '+ variant.title,
                        style: variant.style,
                        weight: variant.weight,
                        css: 'font-style: '+ variant.style +'; font-weight: '+ variant.weight +'; ',
                        src: file.name
                    };
                    font.data.push(font.variants[variantName]);
                }
                else { console.log('No definition found for variant named '+ variantName); }
            }
        });
        callback(font);
    });
};

var createSample = function(font) {
    console.log('Creating sample page and style for font: '+ font.family);
    fetchFontVariants(font, function(font) {
        renderStyle(font);
        renderSample(font);
    });
};

parser.banner = 'Usage: wf-sampler [options] font_directory';

// Handle the --help switch
parser.on('help', function() {
    console.log(parser.toString());
});

// Handle the first argument which should be the font directory
parser.on(2, function(value) {
    font.directory = path.resolve(cwd, value);
    font.family = path.basename(value);
    createSample(font);
});

// Parse the cli args
if (process.argv) parser.parse(process.argv);
else console.log(parser.toString());
