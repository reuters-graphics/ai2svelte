import { slide } from "svelte/transition";
import type { SlideParams } from "svelte/transition";
import { EditorView } from "@codemirror/view";
import postcss from "postcss";
import scss from "postcss-scss";

export function fadeSlide(node: HTMLElement, options: SlideParams) {
		const slideTrans = slide(node, options)
		return {
			duration: options.duration,
			css: t => `
				${slideTrans.css ? slideTrans.css(t, 1 - t) : ""}
				opacity: ${t};
			`
		};
}

// for ai-settings
export function convertStringToObject(s: string) {
        const obj: { [key: string]: unknown } = {};
        s.trim()
            .split("\n")
            .forEach((line) => {
                const [key, ...rest] = line.split(":");
                if (key && rest.length) {
                    let value: unknown = rest.join(":").trim();
                    // Try to convert to number if possible
                    if (parseInt(value as string)) {
                        value = Number(value);
                    }
                    obj[key.trim()] = value;
                }
            });
        return obj;
}

function processCSS(s) {
    switch (s.type) {
        case "decl":
            return `${s.prop} : ${s.value}`;
            break;

        case "atrule":
            if(s.name == "mixin") {
                return null;
            } else {
                return `@${s.name} ${s.params}`;
            }
            break;

        case "rule":
            const styles = s.nodes.map((x) => processCSS(x)).join(";\n");
            const str = `${s.selector} {
${styles};
}`;
            return str;
            break;

        case "comment":
            return `/* ${s.text} */`;

        default:
            return "";
            break;
    }
}

// parses css into object
export function convertStyleStringToObject(string: string) {
    let obj;

    try {
        obj = postcss.parse(string, { parser: scss }).nodes.map((x) => {
            return {
                selector: x.selector,
                styles: x.nodes.map((s, i) => processCSS(s)),
            };
        });

        const newStyles = { };
        obj.forEach((x) => {
            console.log(x.selector);
            if(x.selector !== null && x.selector !== undefined) {
                newStyles[x.selector] = x.styles;
            }
        });

        return obj;
    } catch (error) {
        // ignore errors cause user might still be typing the style
    }
}

export function parseSnippetSettings(settingsText: string) {
    // Handle both Windows (\r\n) and Unix (\n) line endings\
    var text = settingsText.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
    var lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    var result: Record<string, string> = {};
    var currentKey: string | null = null;
    var currentValue: string[] = [];
    var i: number, line: string, keyMatch: RegExpMatchArray | null;
    
    for (i = 0; i < lines.length; i++) {
        line = lines[i];
        // Look for lines that start with word characters followed by colon
        keyMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)/);
        
        if (keyMatch) {
            // Save previous key-value pair
            if (currentKey) {
                result[currentKey] = currentValue.join('\n').replace(/^\s+|\s+$/g, '');
            }
            
            // Start new key-value pair
            currentKey = keyMatch[1];
            currentValue = [keyMatch[2]];
        } else if (currentKey) {
            // Add to current value
            currentValue.push(line);
        }
    }
    
    // Save last key-value pair
    if (currentKey) {
        result[currentKey] = currentValue.join('\n').replace(/^\s+|\s+$/g, '');
    }
    
    return result;
}

export const myTheme = EditorView.theme(
            {
                "&": {
                    backgroundColor: "transparent !important",
                    border: "unset !important",
                },
                "&.cm-focused": {
                    outline: "unset !important",
                },
                ".cm-scroller": {
                    fontFamily: "inherit",
                    overflow: "auto"
                },
                "&.cm-focused .cm-cursor": {
                    borderLeftColor: "var(--color-accent-primary) !important",
                    borderWidth: "2px !important",
                },
                ".cm-gutters": {
                    backgroundColor: "#ffffff00 !important",
                    color: "var(--color-text) !important"
                },
                ".cm-selectionBackground": {
                    backgroundColor: "color-mix(in srgb, var(--color-text) 10%, transparent) !important",
                },
                ".cm-content, .cm-gutter": { minHeight: "200px", height: "100%" },
                ".cm-line": {
                    fontSize: "clamp(0.89rem, -0.08vw + 0.91rem, 0.84rem) !important",
                    lineHeight: "150% !important"
                },
                ".cm-gutterElement": {
                    fontSize: "clamp(0.89rem, -0.08vw + 0.91rem, 0.84rem) !important",
                    lineHeight: "150% !important",
                    opacity: "0.25 !important"
                },
                ".cm-activeLineGutter": {
                    backgroundColor: "transparent !important",
                    color: "var(--color-text) !important",
                    opacity: "1 !important"
                },
                ".cm-activeLine": {
                    backgroundColor: "transparent !important",
                    boxShadow: "0 -0.5px 0 0 #80808055, 0 0.5px 0 0 #80808055"
                },
            },
            { dark: true },
        );