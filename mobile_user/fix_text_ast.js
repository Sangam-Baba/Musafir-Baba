const fs = require('fs');
const babel = require('@babel/core');
const path = require('path');

function processFile(fullPath) {
  const code = fs.readFileSync(fullPath, 'utf8');

  // We need to parse JSX and TS
  const ast = babel.parse(code, {
    filename: fullPath,
    presets: ['@babel/preset-typescript', '@babel/preset-react'],
    plugins: ['@babel/plugin-syntax-jsx']
  });

  let changed = false;

  babel.traverse(ast, {
    JSXElement(path) {
      const openingElement = path.node.openingElement;
      const tagName = openingElement.name.name;

      // Only process View, TouchableOpacity, SafeAreaView, etc.
      // Do NOT process Text, TextInput, etc.
      if (typeof tagName === 'string' && !['Text', 'TextInput', 'Image', 'svg', 'path'].includes(tagName)) {
        
        let needsTextWrap = false;
        
        // Check children
        path.node.children.forEach(child => {
          if (child.type === 'JSXText') {
            if (child.value.trim() !== '') {
              needsTextWrap = true;
            }
          } else if (child.type === 'JSXExpressionContainer') {
            // String literal or template literal in expression
            if (child.expression.type === 'StringLiteral' || child.expression.type === 'TemplateLiteral') {
              needsTextWrap = true;
            }
          }
        });

        if (needsTextWrap) {
          changed = true;
          // We don't want to wrap EVERYTHING in one Text if there are Views inside.
          // We ONLY wrap the contiguous text nodes, or just replace individual text nodes.
          for (let i = 0; i < path.node.children.length; i++) {
            let child = path.node.children[i];
            let shouldWrap = false;
            
            if (child.type === 'JSXText' && child.value.trim() !== '') {
              shouldWrap = true;
            } else if (child.type === 'JSXExpressionContainer' && 
                      (child.expression.type === 'StringLiteral' || child.expression.type === 'TemplateLiteral' || child.expression.type === 'LogicalExpression' || child.expression.type === 'ConditionalExpression' || child.expression.type === 'Identifier' || child.expression.type === 'CallExpression' || child.expression.type === 'MemberExpression')) {
                // Basically ANY expression could return text. But we only want to wrap expressions that are directly inside View and likely text.
                // Wait, if it's `{someCondition && <View/>}`, it's an expression!
                // We should only wrap if we are absolutely sure it's a string, or if it was throwing text node error.
                if (child.expression.type === 'StringLiteral' || child.expression.type === 'TemplateLiteral') {
                    shouldWrap = true;
                }
            }

            if (shouldWrap) {
                // Create a <Text> element
                const t = babel.types;
                const textElement = t.jsxElement(
                    t.jsxOpeningElement(t.jsxIdentifier('Text'), []),
                    t.jsxClosingElement(t.jsxIdentifier('Text')),
                    [child]
                );
                path.node.children[i] = textElement;
            }
          }
        }
      }
    }
  });

  if (changed) {
    // Generate new code
    const output = babel.transformFromAstSync(ast, code, {
      filename: fullPath,
      presets: ['@babel/preset-typescript', '@babel/preset-react'],
      retainLines: true, // Try to retain formatting
    });
    
    // Babel might have removed type annotations if we used preset-typescript without care, 
    // wait, preset-typescript strips types during transform! 
    // We should NOT use Babel generator to overwrite the file because it strips TypeScript!
  }
}

// Since Babel transformFromAstSync strips TS types and completely mangles formatting,
// we should use a different approach for AST modifications that preserves TS (like jscodeshift or recast)
// BUT since we don't have those installed, we can just use the AST to *find* the locations and do string replacements!

function fixRawTextWithRegex(fullPath) {
    let content = fs.readFileSync(fullPath, 'utf8');
    let orig = content;
    
    // Instead of complex AST, let's just find <TouchableOpacity> ... </TouchableOpacity> 
    // and if it contains raw text, wrap it.
    
    console.log(`Need to fix ${fullPath}`);
}
