import postcssScss from "postcss-scss";

import animations from '../animations.scss?raw';

async function fetchAnimationData() {
  try {
    const response = await fetch('../animations.scss');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}

export function getAnimations() {

    // const data = fetchAnimationData();

    // console.log(animations);

    // Read SCSS file
    // const scssContent = fs.readFileSync('../animations.scss', 'utf8');

    // Parse SCSS into AST
    const root = postcssScss.parse(animations);

    console.log(root);

    // Convert to JavaScript object
    const cssObject = {};

    // root.walkRules(rule => {
    // const selector = rule.selector;
    // const declarations = {};
    
    // rule.walkDecls(decl => {
    //     declarations[decl.prop] = decl.value;
    // });
    
    // cssObject[selector] = declarations;
    // });

    root.walkAtRules('mixin', (mixin) => {
      console.log('Mixin found:', mixin.params);
      console.log('Mixin content:', mixin.toString());
    });

    // console.log(cssObject);
}