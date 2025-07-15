export let allSettings = [
  {
    label: "namespace",
    type: "variable",
    info: "Prefix for HTML elements. Defaults to 'g-'"
  },
  {
    label: "image_format",
    type: "variable",
    info: "Options: auto, png, png24, jpg, svg"
  },
  {
    label: "write_image_files",
    type: "variable",
    info: "Options: true, false"
  },
  {
    label: "responsiveness",
    type: "variable",
    info: "Options: fixed, dynamic"
  },
  {
    label: "text_responsiveness",
    type: "variable",
    info: "Options: fixed, dynamic"
  },
  {
    label: "max_width",
    type: "variable",
    info: "Max width to clip the final output by"
  },
  {
    label: "output",
    type: "variable",
    info: "Options: one-file, multiple-files"
  },
  {
    label: "project_name",
    type: "variable",
    info: "Defaults to the name of the AI file"
  },
  {
    label: "html_output_path",
    type: "variable",
    info: "Location to export output files"
  },
  {
    label: "html_output_extension",
    type: "variable",
    info: "Output file extension"
  },
  {
    label: "image_output_path",
    type: "variable",
    info: "Location to export image files"
  },
  {
    label: "image_source_path",
    type: "variable",
    info: "Specify from where to load the images"
  },
  {
    label: "image_alt_text",
    type: "variable",
    info: "Generally, use alt_text instead"
  },
  {
    label: "png_transparent",
    type: "variable",
    info: "Options: true, false"
  },
  {
    label: "png_number_of_colors",
    type: "variable",
    info: "Number of colors in 8-bit PNG image (1-256)"
  },
  {
    label: "jpg_quality",
    type: "variable",
    info: "JPG image quality in range 0-100"
  },
  {
    label: "center_html_output",
    type: "variable",
    info: "Options: true, false"
  },
  {
    label: "use_2x_images_if_possible",
    type: "variable",
    info: "Options: true, false"
  },
  {
    label: "use_lazy_loader",
    type: "variable",
    info: "Options: true, false"
  },
  {
    label: "include_resizer_widths",
    type: "variable",
    info: "Options: true, false"
  },
  {
    label: "include_resizer_css",
    type: "variable",
    info: "Container-query resizing"
  },
  {
    label: "inline_svg",
    type: "variable",
    info: "Embed background image SVG in HTML instead of loading a file"
  },
  {
    label: "svg_id_prefix",
    type: "variable",
    info: "Prefix SVG ids with a string to disambiguate from other ids on the page"
  },
  {
    label: "svg_embed_images",
    type: "variable",
    info: "Options: true, false"
  },
  {
    label: "render_text_as",
    type: "variable",
    info: "Options: html, image"
  },
  {
    label: "render_rotated_skewed_text_as",
    type: "variable",
    info: "Options: html, image"
  },
  {
    label: "testing_mode",
    type: "variable",
    info: "Render text in both bg image and HTML to test HTML text placement"
  },
  {
    label: "show_completion_dialog_box",
    type: "variable",
    info: "Options: true, false"
  },
  {
    label: "clickable_link",
    type: "variable",
    info: "Add a URL to make the entire graphic a clickable link"
  }
];