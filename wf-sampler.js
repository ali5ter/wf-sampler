#!/usr/bin/env node

"use strict";

var fs = require('fs')
  , path = require('path')
  , finder = require('find-files')
  , sys = require('sys')
  , optparse = require('optparse')
  , jade = require('jade')
  , stylus = require('stylus')
  , fontFace = require('./lib/font_faces')
  , cwd = process.cwd();

var font = {
    directory: null
  , family: null
  , faces: []
  , data: []
    // @see http://en.wikipedia.org/wiki/List_of_pangrams
  , pangram: 'How razorback-jumping frogs can level six piqued gymnasts!'
    // @see http://fillerati.com/
  , sampleText: [
        'After the glimpse I had had of the Martians emerging from the cylinder in which they had come to the earth from their planet, a kind of fascination paralysed my actions. I remained standing knee-deep in the heather, staring at the mound that hid them. I was a battleground of fear and curiosity.'
      , 'I did not dare to go back towards the pit, but I felt a passionate longing to peer into it. I began walking, therefore, in a big curve, seeking some point of vantage and continually looking at the sand heaps that hid these new-comers to our earth. Once a leash of thin black whips, like the arms of an octopus, flashed across the sunset and was immediately withdrawn, and afterwards a thin rod rose up, joint by joint, bearing at its apex a circular disk that spun with a wobbling motion. What could be going on there?'
    ]
  , css: 'font-style: '+ fontFace.normal.style +'; font-weight: '+ fontFace.normal.weight +'; '
};

var styleTmpl = __dirname +'/templates/font.styl';
var styleFile = 'font.css';
var sampleTmpl = __dirname + '/templates/sample.jade';
var sampleFile = 'index.html';

var parser = new optparse.OptionParser([
    [ '-h', '--help', 'Shows this help' ]
]);

var renderStyle = function(font) {
    var tmpl = fs.readFileSync(styleTmpl, 'utf8');
    var _faces = new stylus.nodes.Expression();
    font.faces.forEach(function(face) {
        _faces.push(new stylus.nodes.String(face));
    });
    var _get = function(data, face) {
        stylus.utils.assertString(face, 'face');
        return new stylus.nodes.Literal(font.faces[face.val][data.val]);
    };
    var _comment = function(face) {
        stylus.utils.assertString(face, 'face');
        return new stylus.nodes.Literal('/* '+ font.faces[face.val].title +' */');
    };
    stylus(tmpl)
        .set('filename', styleTmpl)
        .define('family', font.family)
        .define('_faces', _faces)
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

var getFonts = function(font, callback) {
    finder(font.family, { root: font.directory, requireExts: ['.ttf'] }, function(files) {
        var pattern = new RegExp(font.family +'.*-(.*).ttf','i')
          , faceName = ''
          , face = {}
          , match = []
          , i = 0;
        files.forEach(function(file) {
            match = file.name.match(pattern);
            if (match) faceName = match[1].toLowerCase();
            else faceName = file.name.toLowerCase();
            if (faceName) {
                i++;
                console.log('Found '+ faceName +' face for font '+ font.family);
                if (!fontFace[faceName]) {
                    console.log('No definition found for font face named '+
                        faceName +'. Will default to using normal face');
                    faceName = 'normal';
                }
                font.faces.push(faceName);
                face = fontFace[faceName];
                font.faces[faceName] = {
                    title: '#'+ i +' '+ face.title,
                    style: face.style,
                    weight: face.weight,
                    css: 'font-style: '+ face.style +'; font-weight: '+ face.weight +'; ',
                    src: file.name
                };
                font.data.push(font.faces[faceName]);
            }
        });
        callback(font);
    });
};

var createSample = function(font) {
    console.log('Creating sample page and style for font: '+ font.family);
    getFonts(font, function(font) {
        if (font.faces.length > 0) {
            renderStyle(font);
            renderSample(font);
        }
    });
};

parser.banner = 'Usage: wf-sampler [options] font_directory';

parser.on('help', function() {
    console.log(parser.toString());
});

parser.on(2, function(value) {
    if (value === '.') font.directory = cwd
    else font.directory = path.resolve(cwd, value);
    font.family = path.basename(value);
    createSample(font);
});

// Parse the cli args
if (process.argv) parser.parse(process.argv);
else console.log(parser.toString());
