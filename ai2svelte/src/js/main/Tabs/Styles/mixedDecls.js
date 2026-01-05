/**
 * Ensure animation-related declarations are always the FIRST declarations
 * inside their rule (placed before any non-comment nodes).
 *
 * - Matches 'animation' and 'animation-*' (with optional vendor prefixes).
 * - Preserves leading comments that immediately precede each decl.
 * - Preserves relative order among the moved animation decls.
 * - Does NOT create a nested '& { ... }' block (avoids Sass mixed-decls).
 *
 * Usage:
 *   postcss([ ensureAnimationFirst({ debug: true }) ])
 *     .process(source, { parser: scss }) // optional for SCSS
 */
export default function ensureAnimationFirst({ debug = false } = {}) {
  return {
    postcssPlugin: "postcss-ensure-animation-first",
    Once(root) {
      root.walkRules((rule) => {
        // Skip nested "&" blocks entirely (defensive, avoids recursion and Sass warnings)
        if (rule.selector && rule.selector.trim() === "&") return;

        const nodes = rule.nodes || [];
        if (!nodes.length) return;

        // Snapshot to iterate stably while we remove/append
        const snapshot = nodes.slice();

        // Collect animation decls and contiguous leading comments
        const toMove = [];
        for (let i = 0; i < snapshot.length; i++) {
          const n = snapshot[i];

          // Only decls at this level; skip rules, at-rules, etc.
          if (!n || n.type !== "decl") continue;

          const isAnimationProp =
            /^(?:-webkit-|-moz-|-o-)?animation$/i.test(n.prop) ||
            /^(?:-webkit-|-moz-|-o-)?animation-.+/i.test(n.prop);

          if (!isAnimationProp) continue;

          // Collect contiguous leading comments (directly above this decl)
          const leading = [];
          for (let j = i - 1; j >= 0; j--) {
            const prev = snapshot[j];
            if (!prev || prev.type !== "comment") break;
            leading.unshift(prev);
          }

          toMove.push({ decl: n, leadingComments: leading });
        }

        if (!toMove.length) {
          if (debug) {
            console.log(
              `[ensure-animation-first] selector="${rule.selector}" no animation decls`
            );
          }
          return;
        }

        // Remove leading comments and decls from the rule (original positions)
        for (const { decl, leadingComments } of toMove) {
          for (const c of leadingComments) c.remove();
          decl.remove();
        }

        // Find insertion point: before the first non-comment node, if any; otherwise at end.
        // This keeps any rule-level header comments intact above everything.
        let insertionTarget = null;
        for (let i = 0; i < (rule.nodes || []).length; i++) {
          const n = rule.nodes[i];
          if (!n) continue;
          if (n.type !== "comment") {
            insertionTarget = n;
            break;
          }
        }

        // Insert all moved blocks at the computed insertion point
        for (const { decl, leadingComments } of toMove) {
          // Append comments + decl as a contiguous group
          const group = [];
          for (const c of leadingComments) group.push(c.clone());
          group.push(decl.clone());

          if (insertionTarget) {
            // Insert each node before the target, in order
            for (const node of group) {
              insertionTarget.before(node);
            }
          } else {
            // No non-comment nodes: just append to the rule
            for (const node of group) {
              rule.append(node);
            }
          }
        }

        if (debug) {
          const movedProps = toMove.map(({ decl }) => decl.prop).join(", ");
          console.log(
            `[ensure-animation-first] selector="${rule.selector}" moved to top: ${movedProps}`
          );
        }
      });
    },
  };
}
ensureAnimationFirst.postcss = true;
