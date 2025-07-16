Handle local fonts or provide UI/easier way to set
instead of manually making changes in script

check for REMOVE THIS, INSTEAD, TO COMMENT

feature : get all texts inside plugin...update texts from inside plugin

ai2html doesn't care about layer ordering

ai2html container queries don't have importants

need to have required settings block un-deletable in plugin

replace ai2html-settings namespace (ai2html-) with ai2svelte

think of adding gif as lazy loading?

scaled and unscaled snippets?

artboards and layers can hold everything after colon as abSettings
ab:1200 -> 1200 gets set as minwidth
ab:fixed,prop,467,999 -> sets minwidth:999 and artboard fixed. rest of the things get ignored
ab:image_only -> discards text inside the artboard in the final output


layer:svg -> exports as svg
layer:div -> separate element that can scale, only rectangles
layer:symbol -> separate element that cannot scale, only rectangles
layer:png -> separate element comprising of just png image