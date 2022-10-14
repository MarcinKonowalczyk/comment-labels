var vscode = require('vscode');
const fs = require('fs');

// Load letters form a file.
var letters = JSON.parse(fs.readFileSync(__dirname + '/letters.json', 'utf8'));
sequence = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";

// Preprocess letters
for (var i = 0; i < sequence.length; i++) {
    var letter = sequence[i];
    if (letters[letter] === undefined) {
        throw new Error("Missing letter: " + letter);
    }
    // Make sure the letter has 5 lines
    if (letters[letter].length != 5) {
        throw new Error('Letter ' + letter + ' does not have 5 lines');
    }

    // Trim each line by 2 spaces
    var trimmed_lines = letters[letter].map((line) => line.slice(2, -2))
    
    // Calculate kerning information
    var spaces_before;
    var spaces_after;

    if (letter != " ") {
        spaces_before = trimmed_lines.map((line) => line.match(/^ */)[0].length);
        spaces_after = trimmed_lines.map((line) => line.match(/ *$/)[0].length);
    } else {
        spaces_before = [0, 0, 0, 0, 0];
        spaces_after = [0, 0, 0, 0, 0];
    }

    letters[letter] = { lines: trimmed_lines, spaces_before: spaces_before, spaces_after: spaces_after };
}

// Comments in languages where the comment character is at the beginning of the line and is not '//'
// TODO: I'm sure this could be gotten from the language configuration, but i'm not sure how,
//       so here are a few more popular languages which use non-'//' comments.
comments = [];
comments["python"] = "##";
comments["ruby"] = "##";
comments["perl"] = "##";
comments["powershell"] = "##";
comments["lua"] = "--";
comments["haskell"] = "--";
comments["clojure"] = ";;";
comments["coffeescript"] = "##";
comments["r"] = "##";
comments["shellscript"] = "##";
comments["tex"] = "%%";

default_comment = "//";

function activate(context) {
    console.log('loaded "comment-labels"');

    var disposable = vscode.commands.registerCommand('extension.commentLabel', function () {
        var editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        // Get the language comment
        var language = editor.document.languageId;
        var comment = comments[language] || default_comment;

        var selection = editor.selection;
        var str = editor.document.getText(selection).trim();
        if (str == "") {
            return;
        }

        editor.edit(function (builder) {
            var lines = new Array(5).fill(comment);
            var spaces_after = new Array(5).fill(0);

            for (var c in str) {
                var ch = str[c];
                letter = letters[ch] == undefined ? letters[" "] : letters[ch];
                
                // Calculate line-by-line spacing between this and previous character
                var kern = new Array(5).fill(0);
                for (var i = 0; i < 5; i++) {
                    kern[i] = spaces_after[i] + letter.spaces_before[i];
                }
                
                // TODO: Could kern more, but would require more complicated logic
                //       since the letter overhangs the previous one.
                space = " ".repeat(Math.max(0, 2 - Math.min(...kern)));

                // Add the letter to the lines
                for(var i = 0; i < lines.length; i++) {
                    lines[i] += space + letter.lines[i];
                }
                spaces_after = letter.spaces_after;
            }

            var border_line = comment + "=".repeat(lines[0].length);
            var padding_line = comment + " ".repeat(lines[0].length);
            var output = [border_line, padding_line, lines.join("\n"), padding_line, border_line].join("\n");
            
            builder.replace(selection, output);
        });
        // Display a message box to the user
        //vscode.window.showInformationMessage('Selected characters: ' + text.length);
    });

    context.subscriptions.push(disposable);
}
exports.activate = activate;

function deactivate() {}
exports.deactivate = deactivate;