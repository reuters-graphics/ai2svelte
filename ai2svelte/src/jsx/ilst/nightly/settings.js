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
  "create_settings_block": true, // Create a text block in the AI doc with common settings
  "png_transparent": false,
  "png_number_of_colors": 128, // Number of colors in 8-bit PNG image (1-256)
  "jpg_quality": 60,
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