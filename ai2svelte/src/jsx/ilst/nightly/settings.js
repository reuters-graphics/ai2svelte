export let defaultSettings = {
  "namespace": "g-",
  "image_format": ["auto"],  // Options: auto, png, png24, jpg, svg
  "write_image_files": true,
  "responsiveness": "fixed", // Options: fixed, dynamic
  "text_responsiveness": "dynamic", // Options: fixed, dynamic
  "max_width": "",
  "output": "one-file",      // Options: one-file, multiple-files
  "project_name": "",        // Defaults to the name of the AI file
  "html_output_path": "ai2html-output/",
  "html_output_extension": ".html",
  "image_output_path": "ai2html-output/",
  "image_source_path": "",
  "image_alt_text": "", // Generally, use alt_text instead
  "png_transparent": true,
  "png_number_of_colors": 256, // Number of colors in 8-bit PNG image (1-256)
  "jpg_quality": 90,
  "center_html_output": true,
  "use_2x_images_if_possible": true,
  "use_lazy_loader": true,
  "include_resizer_widths": true,
  "include_resizer_css": true, // container-query resizing
  "inline_svg": false, // Embed background image SVG in HTML instead of loading a file
  "svg_id_prefix": "", // Prefix SVG ids with a string to disambiguate from other ids on the page
  "svg_embed_images": false,
  "render_text_as": "html", // Options: html, image
  "render_rotated_skewed_text_as": "html", // Options: html, image
  "testing_mode": false,  // Render text in both bg image and HTML to test HTML text placement
  "show_completion_dialog_box": true,
  "clickable_link": "",  // Add a URL to make the entire graphic a clickable link
};

export let placeholderSettings = {
    "image_format": ["jpg"],
    "responsiveness": "dynamic",
    "output": "one-file",
    "html_output_path": "../src/lib/ai2svelte/",
    "html_output_extension": ".svelte",
    "image_output_path": "../../statics/images/graphics/",
    "image_source_path": "images/graphics/",
    "png_transparent": "yes",
    "png_number_of_colors": 256,
    "jpg_quality": 90,
    "inline_svg": "true",
    "max_width": null
};