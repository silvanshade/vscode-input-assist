# vscode-input-assist

Tree-based input assistance for unicode and more in Visual Studio Code

## Description

This package provides a flexible input assistance framework built on top of
Visual Studio Code's completion provider functionality. It works by loading JSON
tree-based mappings from textual patterns to strings.

For example, by loading a suitable mapping, a user could use the text \lambda
for inserting the glyph λ.

The "tree" behavior comes into play when there are choices between completions.
For example, a mapping might replace \rightarrow with → and \rightarrowtail with
↣. This package will provide a choice between inserting → and completing to ↣,
allowing the user to complete in a stepwise fashion.

## Status

Eventually this extension will allow the user to load various "input method"
files or configure existing ones. However, for the moment it comes
pre-configured with a port of the [Agda input
method](http://agda.readthedocs.io/en/latest/tools/emacs-mode.html#unicode-input)
which maps LaTeX style commands to unicode glyphs.
